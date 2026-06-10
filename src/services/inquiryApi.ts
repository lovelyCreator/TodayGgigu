import { getStoredToken, refreshAccessToken } from './authApi';
import { SocketMessage, GeneralInquiry } from './socketService';

import { API_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';

// Helper: make an authenticated fetch, auto-refresh token on 401
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let token = await getStoredToken();
  if (!token) throw new Error('No authentication token found. Please log in again.');

  const signatureHeaders = await buildSignatureHeaders(
    options.method || 'GET',
    url,
    options.body && typeof options.body === 'string' ? JSON.parse(options.body) : undefined,
  );

  let response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...signatureHeaders,
      ...(options.headers || {}),
    },
  });

  // If 401, try refreshing the token and retry once
  if (response.status === 401) {
    console.log('[authFetch] Got 401, attempting token refresh...');
    const newToken = await refreshAccessToken();
    if (newToken) {
      const newSignatureHeaders = await buildSignatureHeaders(
        options.method || 'GET',
        url,
        options.body && typeof options.body === 'string' ? JSON.parse(options.body) : undefined,
      );
      response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...newSignatureHeaders,
          ...(options.headers || {}),
        },
      });
    }
  }

  return response;
};

// Helper: make an authenticated fetch with FormData (multipart/form-data)
const authFetchFormData = async (url: string, formData: FormData, method: string = 'POST'): Promise<Response> => {
  let token = await getStoredToken();
  if (!token) throw new Error('No authentication token found. Please log in again.');

  const signatureHeaders = await buildSignatureHeaders(method, url);

  let response = await fetch(url, {
    method,
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
      ...signatureHeaders,
      // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
    },
  });

  // If 401, try refreshing the token and retry once
  if (response.status === 401) {
    console.log('[authFetchFormData] Got 401, attempting token refresh...');
    const newToken = await refreshAccessToken();
    if (newToken) {
      const newSignatureHeaders = await buildSignatureHeaders(method, url);
      response = await fetch(url, {
        method,
        body: formData,
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'ngrok-skip-browser-warning': 'true',
          ...newSignatureHeaders,
        },
      });
    }
  }

  return response;
};

// Helper: parse response and return ApiResponse
const parseResponse = async <T>(response: Response, label: string): Promise<ApiResponse<T>> => {
  console.log(`[REST] ${label} response status:`, response.status);
  const responseText = await response.text();
  console.log(`[REST] ${label} response body:`, responseText.substring(0, 300));

  let responseData: any;
  try { responseData = JSON.parse(responseText); } catch {
    return { success: false, error: 'Invalid response from server.' };
  }

  if (!response.ok) {
    return { success: false, error: responseData?.message || `Request failed with status ${response.status}` };
  }
  if (responseData.status !== 'success') {
    return { success: false, error: responseData?.message || 'Request failed' };
  }

  return { success: true, message: responseData.message, data: responseData.data };
};

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface GetInquiryResponse {
  inquiry: GeneralInquiry;
}

export interface GetInquiriesByOrderResponse {
  [x: string]: GeneralInquiry[];
  inquiries: GeneralInquiry[];
}

export interface UnreadCountsResponse {
  totalUnread: number;
  inquiries: Array<{
    inquiryId: string;
    unreadCount: number;
  }>;
}

/**
 * Response of `GET /v1/inquiries/unread-count` (singular).
 * Returns just the aggregate count — used for the nav-bar / 메시지 탭 배지.
 */
export interface UnreadCountResponse {
  count: number;
}

/**
 * Response of `GET /v1/inquiries/orders` — list of orders that have inquiries.
 * The server returns these fields per row (per the user's API sample).
 * `orderNumber` and `orderProgressStatus` are optional because some orphan
 * inquiries don't carry an attached order yet.
 */
export interface OrderInquiryRow {
  orderId: string;
  orderNumber?: string;
  inquiryId: string;
  status: string;
  orderProgressStatus?: string;
  createdAt: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface CreateInquiryRequest {
  orderId: string;
  message: string;
  attachments?: File[];
}

export interface CreateInquiryResponse {
  inquiry: GeneralInquiry;
}

export interface SendMessageRequest {
  message: string;
  attachments?: File[];
}

export interface SendMessageResponse {
  message: SocketMessage;
  inquiry: GeneralInquiry;
}

export const inquiryApi = {
  /**
   * Create a new inquiry for an order
   */
  createInquiry: async (orderId: string, message: string, attachments: Array<{ uri: string; type: string; name: string }> = []): Promise<ApiResponse<CreateInquiryResponse>> => {
    try {
      const url = `${API_BASE_URL}/inquiries`;
      console.log('[REST][OrderInquiry] createInquiry POST', url, { orderId, message: message.substring(0, 50), attachments: attachments.length });

      // 백엔드는 web 클라이언트와 동일하게 multipart/form-data 로 받는다.
      // 첨부가 없어도 항상 FormData 로 보낸다 — JSON 본문은 backend 가 메시지
      // 본문을 읽지 못해 안드로이드에서만 동작하지 않던 문제를 차단.
      const formData = new FormData();
      formData.append('orderId', orderId);
      formData.append('message', message);
      attachments.forEach((file) => {
        formData.append('attachments', { uri: file.uri, type: file.type, name: file.name } as any);
      });
      const response = await authFetchFormData(url, formData);

      console.log('[REST][OrderInquiry] createInquiry response status:', response.status);
      const responseText = await response.text();
      console.log('[REST][OrderInquiry] createInquiry response body:', responseText.substring(0, 300));
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[REST][OrderInquiry] Failed to parse response JSON:', parseError);
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      if (!response.ok) {
        console.error('[REST][OrderInquiry] createInquiry HTTP error:', response.status, responseData?.message);
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status !== 'success') {
        console.error('[REST][OrderInquiry] createInquiry API error:', responseData?.message);
        return {
          success: false,
          error: responseData?.message || 'Failed to create inquiry',
        };
      }

      console.log('[REST][OrderInquiry] createInquiry success, inquiryId:', responseData.data?.inquiry?._id);
      return {
        success: true,
        message: responseData.message || 'Inquiry created successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      console.error('[REST][OrderInquiry] createInquiry exception:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred. Please try again.',
      };
    }
  },

  deleteMessage: async (inquiryId: string, messageId: string): Promise<ApiResponse<any>> => {
    try {
      console.log('[REST][OrderInquiry] deleteMessage:', inquiryId, messageId);
      const url = `${API_BASE_URL}/inquiries/${inquiryId}/messages/${messageId}`;
      const response = await authFetch(url, { method: 'DELETE' });
      return parseResponse(response, 'OrderInquiry.deleteMessage');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  deleteGeneralInquiryMessage: async (inquiryId: string, messageId: string): Promise<ApiResponse<any>> => {
    try {
      console.log('[REST][GeneralInquiry] deleteMessage:', inquiryId, messageId);
      const url = `${API_BASE_URL}/general-inquiries/${inquiryId}/messages/${messageId}`;
      const response = await authFetch(url, { method: 'DELETE' });
      return parseResponse(response, 'GeneralInquiry.deleteMessage');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  /**
   * Send a message in an inquiry
   */
  sendMessage: async (inquiryId: string, message: string, attachments: Array<{ uri: string; type: string; name: string }> = []): Promise<ApiResponse<SendMessageResponse>> => {
    try {
      console.log('[REST][OrderInquiry] sendMessage:', inquiryId, message.substring(0, 50), 'attachments:', attachments.length);
      const url = `${API_BASE_URL}/inquiries/${inquiryId}/messages`;
      // ★ 첨부 없으면 JSON, 있으면 FormData.
      //
      // 정상 동작하는 레퍼런스 앱(todaymall.kr)의 로그를 분석한 결과 bodyHash
      // 가 계산되어 있었음 — 이는 JSON 본문을 의미한다 (FormData 는 hash 안 됨).
      // 그리고 backend 의 admin sync 로직이 Content-Type 별로 분기할 가능성이
      // 있음 (JSON 만 orderNoteLines 로 server-side sync).
      let response: Response;
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('message', message);
        attachments.forEach((file) => {
          formData.append('attachments', { uri: file.uri, type: file.type, name: file.name } as any);
        });
        response = await authFetchFormData(url, formData);
      } else {
        response = await authFetch(url, {
          method: 'POST',
          body: JSON.stringify({ message }),
        });
      }
      return parseResponse(response, 'OrderInquiry.sendMessage');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  /**
   * Inquiry 의 모든 메시지를 현재 사용자가 읽음 처리.
   * 백엔드 엔드포인트: `POST /v1/inquiries/{inquiryId}/mark-read?lang={ko|en|zh}`
   *   Body: `{}` (사용자 식별은 auth token 에서 추출)
   *   응답: 갱신된 inquiry 문서 (messages[].readBy 가 갱신됨)
   *
   * `lang` 쿼리 파라미터는 admin 측에 보낼 시스템 메시지(예: '관리자가 메시지를
   * 읽음으로 표시했습니다') 의 로케일을 결정. 빈 값이면 백엔드 default(en).
   */
  markAsRead: async (
    inquiryId: string,
    lang?: string,
  ): Promise<ApiResponse<{ inquiry: GeneralInquiry }>> => {
    try {
      const langParam = lang ? `?lang=${encodeURIComponent(lang)}` : '';
      const url = `${API_BASE_URL}/inquiries/${inquiryId}/mark-read${langParam}`;
      const response = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return parseResponse(response, 'OrderInquiry.markAsRead');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  closeInquiry: async (inquiryId: string): Promise<ApiResponse<{ inquiry: GeneralInquiry }>> => {
    try {
      const url = `${API_BASE_URL}/inquiries/${inquiryId}/close`;
      const response = await authFetch(url, { method: 'POST' });
      return parseResponse(response, 'OrderInquiry.closeInquiry');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  getInquiry: async (inquiryId: string): Promise<ApiResponse<GetInquiryResponse>> => {
    try {
      console.log('[REST] getInquiry:', inquiryId);
      const url = `${API_BASE_URL}/inquiries/${inquiryId}`;
      const response = await authFetch(url);
      return parseResponse(response, 'OrderInquiry.getInquiry');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  getGeneralInquiry: async (inquiryId: string): Promise<ApiResponse<GetInquiryResponse>> => {
    try {
      console.log('[REST] getGeneralInquiry:', inquiryId);
      const url = `${API_BASE_URL}/general-inquiries/${inquiryId}`;
      const response = await authFetch(url);
      return parseResponse(response, 'GeneralInquiry.getGeneralInquiry');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  createGeneralInquiry: async (data: { subject?: string; category?: string; message: string }, attachments: Array<{ uri: string; type: string; name: string }> = []): Promise<ApiResponse<{ inquiry: GeneralInquiry }>> => {
    try {
      console.log('[REST] createGeneralInquiry:', { subject: data.subject, category: data.category, attachments: attachments.length });
      const url = `${API_BASE_URL}/general-inquiries`;
      // 백엔드는 web 클라이언트와 동일하게 multipart/form-data 로 받는다.
      // 첨부가 없어도 항상 FormData 로 보낸다 — JSON 본문은 backend 가 본문을
      // 읽지 못해 안드로이드에서만 동작하지 않던 문제를 차단.
      const formData = new FormData();
      formData.append('message', data.message);
      if (data.subject) formData.append('subject', data.subject);
      if (data.category) formData.append('category', data.category);
      attachments.forEach((file) => {
        formData.append('attachments', { uri: file.uri, type: file.type, name: file.name } as any);
      });
      const response = await authFetchFormData(url, formData);
      return parseResponse(response, 'GeneralInquiry.createGeneralInquiry');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  sendGeneralInquiryMessage: async (inquiryId: string, message: string, attachments: Array<{ uri: string; type: string; name: string }> = []): Promise<ApiResponse<SendMessageResponse>> => {
    try {
      console.log('[REST] sendGeneralInquiryMessage:', inquiryId, 'attachments:', attachments.length);
      const url = `${API_BASE_URL}/general-inquiries/${inquiryId}/messages`;
      // 항상 multipart/form-data 로 보낸다 (위와 같은 이유).
      const formData = new FormData();
      formData.append('message', message);
      attachments.forEach((file) => {
        formData.append('attachments', { uri: file.uri, type: file.type, name: file.name } as any);
      });
      const response = await authFetchFormData(url, formData);
      return parseResponse(response, 'GeneralInquiry.sendMessage');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  getGeneralInquiries: async (status?: 'open' | 'closed' | 'resolved'): Promise<ApiResponse<GetInquiriesByOrderResponse>> => {
    try {
      const url = status
        ? `${API_BASE_URL}/general-inquiries?status=${status}`
        : `${API_BASE_URL}/general-inquiries`;
      console.log('[REST] getGeneralInquiries:', url);
      const response = await authFetch(url);
      return parseResponse(response, 'GeneralInquiry.getGeneralInquiries');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  /**
   * Get inquiries by order ID
   */
  getInquiriesByOrderId: async (orderId: string): Promise<ApiResponse<GetInquiriesByOrderResponse>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/inquiries/order/${orderId}`;
      // console.log('Sending get inquiries by order ID request to:', url);
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });

      // console.log('Get inquiries by order ID response status:', response.status);

      const responseText = await response.text();
      // console.log('Get inquiries by order ID response text:', responseText.substring(0, 500));

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        // console.error('Failed to parse response as JSON:', parseError);
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to get inquiries',
        };
      }

      return {
        success: true,
        message: responseData.message || 'Inquiries retrieved successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      // console.error('Get inquiries by order ID error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Get inquiries by order number (fallback)
   */
  getInquiriesByOrderNumber: async (orderNumber: string): Promise<ApiResponse<GetInquiriesByOrderResponse>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/inquiries/order/${orderNumber}`;
      // console.log('Sending get inquiries by order number request to:', url);
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });

      // console.log('Get inquiries by order number response status:', response.status);

      const responseText = await response.text();
      // console.log('Get inquiries by order number response text:', responseText.substring(0, 500));

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        // console.error('Failed to parse response as JSON:', parseError);
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to get inquiries',
        };
      }

      return {
        success: true,
        message: responseData.message || 'Inquiries retrieved successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      // console.error('Get inquiries by order number error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  getInquiries: async (status?: 'open' | 'closed' | 'resolved'): Promise<ApiResponse<GetInquiriesByOrderResponse>> => {
    try {
      const url = status
        ? `${API_BASE_URL}/inquiries?status=${status}`
        : `${API_BASE_URL}/inquiries`;
      console.log('[REST] getInquiries:', url);
      const response = await authFetch(url);
      return parseResponse(response, 'OrderInquiry.getInquiries');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  /**
   * Get unread counts for all inquiries
   */
  getUnreadCounts: async (): Promise<ApiResponse<UnreadCountsResponse>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/inquiries/unread-counts`;
      // console.log('Sending get unread counts request to:', url);
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });

      // console.log('Get unread counts response status:', response.status);

      const responseText = await response.text();
      // console.log('Get unread counts response text:', responseText.substring(0, 500));

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        // console.error('Failed to parse response as JSON:', parseError);
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to get unread counts',
        };
      }

      return {
        success: true,
        message: responseData.message || 'Unread counts retrieved successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      // console.error('Get unread counts error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * 단일 합계 미확인 메시지 수 조회 — admin/web 의 nav-bar 배지에 사용.
   *
   * 백엔드 엔드포인트: `GET /v1/inquiries/unread-count` (singular)
   *   응답: `{ data: { count: number } }`
   *
   * 기존 `getUnreadCounts` (plural) 는 inquiry 별 unread 를 반환하므로,
   * 단순 배지 숫자만 필요한 곳에서는 이 함수가 더 가볍다.
   */
  getUnreadCount: async (): Promise<ApiResponse<UnreadCountResponse>> => {
    try {
      const token = await getStoredToken();
      if (!token) {
        return { success: false, error: 'No authentication token found. Please log in again.' };
      }
      const url = `${API_BASE_URL}/inquiries/unread-count`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });
      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        return { success: false, error: 'Invalid response from server. Please try again.' };
      }
      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }
      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to get unread count',
        };
      }
      return {
        success: true,
        message: responseData.message || 'Unread count retrieved successfully',
        data: { count: Number(responseData?.data?.count ?? 0) },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred. Please try again.' };
    }
  },

  /**
   * Get list of orders that have inquiries (aggregated for user).
   * 백엔드 엔드포인트: `GET /v1/inquiries/orders`
   *   응답: `{ data: { orders: OrderInquiryRow[] } }`
   * 각 행에는 `orderId, inquiryId, status, createdAt, unreadCount` 가 필수이고
   * `orderNumber, orderProgressStatus, lastMessage` 는 inquiry-only orphan
   * 케이스를 제외하면 채워진다.
   */
  getOrderInquiries: async (): Promise<ApiResponse<{ orders: OrderInquiryRow[] }>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/inquiries/orders`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to fetch order inquiries',
        };
      }

      return {
        success: true,
        message: responseData.message || 'Order inquiries retrieved successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An unexpected error occurred. Please try again.',
      };
    }
  },

  /**
   * Get detailed inquiry by order id
   */
  getInquiryDetailByOrderId: async (orderId: string): Promise<ApiResponse<{ inquiry: any; order: any }>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/v1/inquiries/order/${orderId}/detail`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to fetch inquiry detail',
        };
      }

      return {
        success: true,
        message: responseData.message || 'Inquiry retrieved successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An unexpected error occurred. Please try again.',
      };
    }
  },
};


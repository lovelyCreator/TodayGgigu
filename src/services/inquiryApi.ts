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

      let response: Response;
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('message', message);
        attachments.forEach((file) => {
          formData.append('attachments', { uri: file.uri, type: file.type, name: file.name } as any);
        });
        response = await authFetchFormData(url, formData);
      } else {
        response = await authFetch(url, {
          method: 'POST',
          body: JSON.stringify({ orderId, message }),
        });
      }

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
      let response: Response;
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('message', message);
        attachments.forEach((file) => {
          formData.append('attachments', { uri: file.uri, type: file.type, name: file.name } as any);
        });
        response = await authFetchFormData(url, formData);
      } else {
        response = await authFetch(url, { method: 'POST', body: JSON.stringify({ message }) });
      }
      return parseResponse(response, 'OrderInquiry.sendMessage');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  markAsRead: async (inquiryId: string): Promise<ApiResponse<{ inquiry: GeneralInquiry }>> => {
    try {
      const url = `${API_BASE_URL}/inquiries/${inquiryId}/mark-read`;
      const response = await authFetch(url, { method: 'POST' });
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
      let response: Response;
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('message', data.message);
        if (data.subject) formData.append('subject', data.subject);
        if (data.category) formData.append('category', data.category);
        attachments.forEach((file) => {
          formData.append('attachments', { uri: file.uri, type: file.type, name: file.name } as any);
        });
        response = await authFetchFormData(url, formData);
      } else {
        response = await authFetch(url, { method: 'POST', body: JSON.stringify(data) });
      }
      return parseResponse(response, 'GeneralInquiry.createGeneralInquiry');
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  sendGeneralInquiryMessage: async (inquiryId: string, message: string, attachments: Array<{ uri: string; type: string; name: string }> = []): Promise<ApiResponse<SendMessageResponse>> => {
    try {
      console.log('[REST] sendGeneralInquiryMessage:', inquiryId, 'attachments:', attachments.length);
      const url = `${API_BASE_URL}/general-inquiries/${inquiryId}/messages`;
      let response: Response;
      if (attachments.length > 0) {
        const formData = new FormData();
        formData.append('message', message);
        attachments.forEach((file) => {
          formData.append('attachments', { uri: file.uri, type: file.type, name: file.name } as any);
        });
        response = await authFetchFormData(url, formData);
      } else {
        response = await authFetch(url, { method: 'POST', body: JSON.stringify({ message }) });
      }
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
   * Get list of orders that have inquiries (aggregated for user)
   */
  getOrderInquiries: async (): Promise<ApiResponse<{ orders: Array<{ orderId: string; orderNumber: string; inquiryId: string; status: string; lastMessageAt: string; createdAt: string; unreadCount: number }> }>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/v1/inquiries/orders`;
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


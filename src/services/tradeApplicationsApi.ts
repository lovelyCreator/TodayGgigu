import { getStoredToken, refreshAccessToken } from './authApi';
import { API_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';
import {
  GetMyTradeApplicationsParams,
  GetMyTradeApplicationsResponse,
  GetTradeApplicationDetailResponse,
  PickedLocalFile,
  SubmitTradeApplicationInput,
  SubmitTradeApplicationPayload,
  SubmitTradeApplicationResponse,
  TradeApplicationAttachment,
} from '../types/tradeApplication';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

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
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
      ...signatureHeaders,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
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
          Authorization: `Bearer ${newToken}`,
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
          ...(options.headers || {}),
        },
      });
    }
  }

  return response;
};

const authFetchFormData = async (
  url: string,
  formData: FormData,
  method: string = 'POST',
): Promise<Response> => {
  let token = await getStoredToken();
  if (!token) throw new Error('No authentication token found. Please log in again.');

  const signatureHeaders = await buildSignatureHeaders(method, url);

  let response = await fetch(url, {
    method,
    body: formData,
    headers: {
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
      ...signatureHeaders,
    },
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const newSignatureHeaders = await buildSignatureHeaders(method, url);
      response = await fetch(url, {
        method,
        body: formData,
        headers: {
          Authorization: `Bearer ${newToken}`,
          'ngrok-skip-browser-warning': 'true',
          ...newSignatureHeaders,
        },
      });
    }
  }

  return response;
};

const formatApiErrorMessage = (message: unknown): string => {
  if (message == null) return 'Request failed';
  if (typeof message === 'string') {
    const trimmed = message.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return formatApiErrorMessage(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (Array.isArray(message)) {
    const parts = message.flatMap((entry) => {
      if (typeof entry === 'string') return [entry];
      if (entry && typeof entry === 'object') {
        return Object.values(entry).filter((v): v is string => typeof v === 'string');
      }
      return [];
    });
    return parts.length > 0 ? parts.join('\n') : 'Request failed';
  }
  if (typeof message === 'object') {
    const values = Object.values(message as Record<string, unknown>).filter(
      (v): v is string => typeof v === 'string',
    );
    return values.length > 0 ? values.join('\n') : 'Request failed';
  }
  return String(message);
};

const parseResponse = async <T>(response: Response, label: string): Promise<ApiResponse<T>> => {
  const responseText = await response.text();

  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    return { success: false, error: 'Invalid response from server.' };
  }

  if (!response.ok) {
    const errorMessage = formatApiErrorMessage(
      responseData?.message ?? responseData?.error ?? `Request failed with status ${response.status}`,
    );
    if (__DEV__) {
      console.warn(`[tradeApplicationsApi] ${label} error:`, errorMessage);
    }
    return {
      success: false,
      error: errorMessage,
    };
  }

  if (responseData?.status === 'success' && responseData?.data) {
    return { success: true, data: responseData.data as T, message: responseData?.message };
  }

  return {
    success: false,
    error: responseData?.message || 'No data received',
  };
};

const getLocalFileUri = (file: PickedLocalFile): string => file.uri?.trim() || '';

const resolveProductImage = (input: SubmitTradeApplicationInput): PickedLocalFile | null => {
  if (input.productImage && getLocalFileUri(input.productImage)) {
    return input.productImage;
  }
  const legacyUri = input.productImageUri?.trim();
  if (legacyUri) {
    return { uri: legacyUri };
  }
  return null;
};

const resolveAttachmentFiles = (input: SubmitTradeApplicationInput): PickedLocalFile[] => {
  const fromObjects =
    input.attachmentFiles?.filter((file) => getLocalFileUri(file)) ?? [];
  if (fromObjects.length > 0) {
    return fromObjects;
  }
  return (input.attachmentUris ?? [])
    .map((uri) => uri.trim())
    .filter(Boolean)
    .map((uri) => ({ uri }));
};

const toUploadFile = (file: PickedLocalFile, fallbackName: string) => {
  const localUri = getLocalFileUri(file);
  const rawName =
    file.fileName?.trim() ||
    decodeURIComponent(localUri.split('/').pop() || fallbackName);
  const match = /\.(\w+)$/.exec(rawName);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type =
    file.type?.trim() ||
    (ext === 'png'
      ? 'image/png'
      : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'webp'
          ? 'image/webp'
          : `image/${ext}`);

  return {
    uri: localUri,
    name: rawName.includes('.') ? rawName : `${rawName}.jpg`,
    type,
  } as unknown as Blob;
};

const extractImageUrl = (data: any): string | undefined => {
  if (!data) return undefined;
  if (typeof data === 'string') return data;

  const firstImage = data.images?.[0];
  if (typeof firstImage === 'string') return firstImage;
  if (firstImage && typeof firstImage === 'object') {
    const nested =
      firstImage.imageUrl ?? firstImage.url ?? firstImage.path ?? firstImage.fileUrl;
    if (typeof nested === 'string') return nested;
  }

  return (
    data.imageUrl ??
    data.url ??
    data.urls?.[0] ??
    data.files?.[0]?.url ??
    data.file?.url
  );
};

const uploadTradeApplicationFile = async (
  file: PickedLocalFile,
  kind: 'image' | 'attachment',
  fallbackName: string,
  label: string,
): Promise<ApiResponse<TradeApplicationAttachment>> => {
  const url = `${API_BASE_URL}/trade-applications/upload`;
  const formData = new FormData();
  formData.append('file', toUploadFile(file, fallbackName));
  formData.append('kind', kind);

  const response = await authFetchFormData(url, formData, 'POST');
  const parsed = await parseResponse<any>(response, label);
  if (!parsed.success) return { success: false, error: parsed.error };

  const uploadedUrl = extractImageUrl(parsed.data);
  if (!uploadedUrl) {
    return { success: false, error: `${label} returned no URL` };
  }

  return {
    success: true,
    data: {
      url: uploadedUrl,
      originalName: parsed.data?.originalName,
      mimeType: parsed.data?.mimeType,
      size: parsed.data?.size,
    },
  };
};

const uploadProductImage = async (
  imageFile: PickedLocalFile,
): Promise<ApiResponse<{ imageUrl: string }>> => {
  const result = await uploadTradeApplicationFile(
    imageFile,
    'image',
    `product_${Date.now()}.jpg`,
    'uploadProductImage',
  );
  if (!result.success || !result.data?.url) {
    return { success: false, error: result.error || 'Failed to upload product image' };
  }
  return { success: true, data: { imageUrl: result.data.url } };
};

const uploadAttachments = async (
  attachmentFiles: PickedLocalFile[],
): Promise<ApiResponse<{ attachments: TradeApplicationAttachment[] }>> => {
  if (attachmentFiles.length === 0) {
    return { success: true, data: { attachments: [] } };
  }

  const attachments: TradeApplicationAttachment[] = [];
  for (let index = 0; index < attachmentFiles.length; index++) {
    const result = await uploadTradeApplicationFile(
      attachmentFiles[index],
      'attachment',
      `attachment_${Date.now()}_${index}.jpg`,
      'uploadAttachment',
    );
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to upload attachments',
      };
    }
    attachments.push(result.data);
  }

  return { success: true, data: { attachments } };
};

const buildSubmitPayload = (
  input: SubmitTradeApplicationInput,
  imageUrl: string,
  attachments: TradeApplicationAttachment[],
): SubmitTradeApplicationPayload => {
  const referenceLink = input.referenceLinks.map((v) => v.trim()).filter(Boolean).join('\n');

  return {
    type: input.type,
    productInfo: {
      imageUrl,
      referenceLink,
      name: input.productName.trim(),
      option: input.productOption.trim(),
      quantity: input.quantity,
      expectedUnitPriceCNY: input.expectedUnitPriceCNY,
    },
    extraRequest: {
      logoRequired: input.logoRequired,
      barcodeRequired: input.barcodeRequired,
      packagingMethod: input.packagingMethod?.trim() || '',
      memo: input.memo?.trim() || '',
    },
    contact: {
      phone: input.phone?.trim() || '',
      email: input.email?.trim() || '',
    },
    attachments,
  };
};

export const tradeApplicationsApi = {
  getMyApplications: async (
    params: GetMyTradeApplicationsParams,
  ): Promise<ApiResponse<GetMyTradeApplicationsResponse>> => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(params.page ?? 1));
      searchParams.set('pageSize', String(params.pageSize ?? 100));
      searchParams.set('type', params.type);
      if (params.search?.trim()) searchParams.set('search', params.search.trim());
      if (params.periodFrom) searchParams.set('periodFrom', params.periodFrom);
      if (params.periodTo) searchParams.set('periodTo', params.periodTo);

      const url = `${API_BASE_URL}/trade-applications/me?${searchParams.toString()}`;
      const response = await authFetch(url, { method: 'GET' });
      return parseResponse<GetMyTradeApplicationsResponse>(response, 'getMyApplications');
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('[tradeApplicationsApi.getMyApplications]', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load applications',
      };
    }
  },

  getMyApplicationById: async (
    applicationId: string,
  ): Promise<ApiResponse<GetTradeApplicationDetailResponse>> => {
    try {
      const url = `${API_BASE_URL}/trade-applications/me/${applicationId}`;
      const response = await authFetch(url, { method: 'GET' });
      return parseResponse<GetTradeApplicationDetailResponse>(response, 'getMyApplicationById');
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('[tradeApplicationsApi.getMyApplicationById]', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load application detail',
      };
    }
  },

  payApplication: async (
    applicationId: string,
    payload: {
      paymentMethod: 'bank' | 'credit_card' | 'deposit';
      amountKRW: number;
      memberName?: string;
    },
  ): Promise<ApiResponse<{ application?: unknown }>> => {
    try {
      const paymentMethodMap = {
        bank: 'bank',
        credit_card: 'card',
        deposit: 'deposit',
      } as const;

      const body: Record<string, unknown> = {
        paymentMethod: paymentMethodMap[payload.paymentMethod],
        amountKRW: payload.amountKRW,
      };
      if (payload.memberName) {
        body.memberName = payload.memberName;
      }

      const url = `${API_BASE_URL}/trade-applications/me/${applicationId}/payment`;
      const response = await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return parseResponse<{ application?: unknown }>(response, 'payApplication');
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('[tradeApplicationsApi.payApplication]', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      };
    }
  },

  submitApplication: async (
    input: SubmitTradeApplicationInput,
  ): Promise<ApiResponse<SubmitTradeApplicationResponse>> => {
    try {
      const productImage = resolveProductImage(input);
      if (!productImage) {
        return {
          success: false,
          error: 'Product image is required',
        };
      }

      const imageUpload = await uploadProductImage(productImage);
      if (!imageUpload.success || !imageUpload.data?.imageUrl) {
        return {
          success: false,
          error: imageUpload.error || 'Failed to upload product image',
        };
      }

      const attachmentUpload = await uploadAttachments(resolveAttachmentFiles(input));
      if (!attachmentUpload.success) {
        return {
          success: false,
          error: attachmentUpload.error || 'Failed to upload attachments',
        };
      }

      const body = buildSubmitPayload(
        input,
        imageUpload.data.imageUrl,
        attachmentUpload.data?.attachments ?? [],
      );

      const url = `${API_BASE_URL}/trade-applications`;
      const response = await authFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      return parseResponse<SubmitTradeApplicationResponse>(response, 'submitApplication');
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('[tradeApplicationsApi.submitApplication]', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit application',
      };
    }
  },
};

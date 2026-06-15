import { getStoredToken } from './authApi';

import { API_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface AddAddressRequest {
  customerClearanceType: string; // "individual" or "business"
  /** Required by API — "individual" or "business" (legacy key `custommethod` uses same values). */
  customMethod: string;
  recipient: string;
  contact: string;
  personalCustomsCode: string;
  detailedAddress: string;
  zipCode: string;
  defaultAddress: boolean;
  note?: string;
  mainAddress?: string;
}

export type AddressTabType = 'personal' | 'business';

/** Maps UI tab to API `customerClearanceType` + `customMethod`. */
export const buildAddressClearanceFields = (
  addressType: AddressTabType,
): Pick<AddAddressRequest, 'customerClearanceType' | 'customMethod'> => ({
  customerClearanceType: addressType === 'business' ? 'business' : 'individual',
  customMethod: addressType === 'business' ? 'business' : 'individual',
});

export interface AddressFormInput {
  addressType: AddressTabType;
  recipient: string;
  contact: string;
  mainAddress: string;
  detailedAddress: string;
  zipCode: string;
  personalCustomsCode: string;
  defaultAddress: boolean;
  note?: string;
}

/** Body sent to POST/PUT — includes legacy `custommethod` key required by some API builds. */
export type AddressSubmitBody = AddAddressRequest & { custommethod: string };

export type AddressFormValidationKey =
  | 'regionRequired'
  | 'detailRequired'
  | 'postalRequired'
  | 'recipientRequired'
  | 'contactRequired'
  | 'customsRequired';

/**
 * First missing/invalid field for address modal save (i18n key under
 * `profile.addressModal.*`).
 *
 * Only the detailed address is strictly required — other fields fall back to
 * sane defaults inside `buildAddressSubmitBody` (recipient → '-',
 * contact → '01000000000', etc.), so the user can save with just the detail
 * line filled in.
 */
export const getAddressFormValidationErrorKey = (
  form: Pick<
    AddressFormInput,
    'mainAddress' | 'detailedAddress' | 'zipCode' | 'recipient' | 'contact' | 'personalCustomsCode'
  >,
): AddressFormValidationKey | null => {
  const detail = form.detailedAddress.trim();
  if (!detail || detail.length < 2) return 'detailRequired';
  return null;
};

export const buildAddressSubmitBody = (form: AddressFormInput): AddressSubmitBody => {
  const detail = form.detailedAddress.trim();
  const { customMethod, customerClearanceType } = buildAddressClearanceFields(form.addressType);
  return {
    customerClearanceType,
    customMethod,
    custommethod: customMethod,
    recipient: form.recipient.trim() || '-',
    contact: form.contact.trim() || '01000000000',
    personalCustomsCode: form.personalCustomsCode.trim() || '-',
    mainAddress: form.mainAddress.trim() || detail,
    detailedAddress: detail,
    zipCode: form.zipCode.trim() || '-',
    defaultAddress: form.defaultAddress,
    note: form.note?.trim() || undefined,
  };
};

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  custommethod: 'Customs method',
  customMethod: 'Customs method',
  customerClearanceType: 'Clearance type',
  recipient: 'Recipient name',
  contact: 'Phone number',
  personalCustomsCode: 'Customs code',
  detailedAddress: 'Detailed address',
  mainAddress: 'Address',
  zipCode: 'Postal code',
};

const humanizeValidationLine = (line: string): string => {
  const trimmed = line.trim();
  if (!trimmed) return trimmed;
  for (const [field, label] of Object.entries(VALIDATION_FIELD_LABELS)) {
    if (trimmed.toLowerCase().startsWith(field.toLowerCase())) {
      return trimmed.replace(new RegExp(field, 'i'), label);
    }
  }
  return trimmed;
};

const collectValidationLines = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return collectValidationLines(JSON.parse(trimmed));
      } catch {
        return [humanizeValidationLine(trimmed)];
      }
    }
    return [humanizeValidationLine(trimmed)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectValidationLines(entry));
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' || Array.isArray(obj.message)) {
      return collectValidationLines(obj.message);
    }
    return Object.entries(obj)
      .filter(([field]) => !['status', 'statusCode', 'errorCode', 'timestamp', 'data'].includes(field))
      .map(([field, msg]) => {
        const label = VALIDATION_FIELD_LABELS[field] || field;
        const text = String(msg ?? '').trim();
        if (!text) return `${label} is required`;
        return humanizeValidationLine(text.includes(field) ? text : `${label}: ${text}`);
      });
  }
  return [String(value)];
};

/** Extract user-facing text from API error payloads (never status/timestamp blobs). */
export const extractReadableAddressApiMessage = (responseData: unknown): string => {
  if (responseData == null) return '';
  if (typeof responseData === 'string') {
    const trimmed = responseData.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return extractReadableAddressApiMessage(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (typeof responseData === 'object') {
    const obj = responseData as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message.trim();
    }
    if (Array.isArray(obj.message)) {
      return collectValidationLines(obj.message).join('\n');
    }
    if (typeof obj.error === 'string' && obj.error.trim()) {
      return obj.error.trim();
    }
  }
  return '';
};

const isTechnicalApiNoise = (message: string): boolean =>
  /^(status|statuscode|errorcode|timestamp)\s*:/i.test(message) ||
  message.includes('statusCode:') ||
  message.includes('VALIDATION_ERROR');

const isCustomsCodeMismatchMessage = (message: string): boolean => {
  const lower = message.toLowerCase();
  return (
    lower.includes('personalcustomscode') ||
    lower.includes('personal customs code') ||
    (lower.includes('customs code') &&
      (lower.includes('match') ||
        lower.includes('does not') ||
        lower.includes('mismatch') ||
        lower.includes('recipient'))) ||
    message.includes('통관') ||
    message.includes('통관고유') ||
    message.includes('通关')
  );
};

export type AddressApiErrorI18nKey = 'customsCodeInvalid';

/** i18n key suffix under `profile.addressModal.*` for known API errors. */
export const getAddressApiErrorI18nKey = (responseData: unknown): AddressApiErrorI18nKey | null => {
  const message = extractReadableAddressApiMessage(responseData);
  if (!message || isTechnicalApiNoise(message)) return null;
  if (isCustomsCodeMismatchMessage(message)) return 'customsCodeInvalid';
  return null;
};

/** User-facing save error with i18n for address modals. */
export const isAddressApiSuccessMessage = (message?: string | null): boolean => {
  if (!message?.trim()) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('address') &&
    (lower.includes('update') || lower.includes('add') || lower.includes('delete')) &&
    (lower.includes('success') || lower.includes('sucessful'))
  );
};

/** Toast text after address save — always localized, never raw API English. */
export const getAddressSaveSuccessMessage = (
  isUpdate: boolean,
  t: (key: string) => string,
): string =>
  t(
    isUpdate
      ? 'profile.addressModal.updateSuccess'
      : 'profile.addressModal.saveSuccess',
  );

export const resolveAddressSaveError = (
  error: unknown,
  t: (key: string) => string,
  fallbackKey = 'profile.addressModal.saveFailed',
): string => {
  if (typeof error === 'string' && error.startsWith(ADDRESS_ERROR_I18N_PREFIX)) {
    const key = error.slice(ADDRESS_ERROR_I18N_PREFIX.length) as AddressApiErrorI18nKey;
    return t(`profile.addressModal.${key}`);
  }

  const i18nKey = getAddressApiErrorI18nKey(error);
  if (i18nKey) return t(`profile.addressModal.${i18nKey}`);

  const message = extractReadableAddressApiMessage(error);
  if (!message || isTechnicalApiNoise(message)) {
    return t(fallbackKey);
  }

  const lines = collectValidationLines(message).filter((line) => !isTechnicalApiNoise(line));
  if (lines.length === 1 && isCustomsCodeMismatchMessage(lines[0])) {
    return t('profile.addressModal.customsCodeInvalid');
  }
  if (lines.length > 0) {
    const joined = lines.join('\n');
    if (isCustomsCodeMismatchMessage(joined)) {
      return t('profile.addressModal.customsCodeInvalid');
    }
    return joined;
  }

  if (isCustomsCodeMismatchMessage(message)) {
    return t('profile.addressModal.customsCodeInvalid');
  }

  if (message.length > 160) {
    return t(fallbackKey);
  }
  return message;
};

export const formatAddressApiErrorMessage = (responseData: unknown, fallback: string): string => {
  const i18nKey = getAddressApiErrorI18nKey(responseData);
  if (i18nKey) return '';

  const message = extractReadableAddressApiMessage(responseData);
  if (!message || isTechnicalApiNoise(message)) {
    return fallback;
  }

  const lines = collectValidationLines(message).filter((line) => !isTechnicalApiNoise(line));
  if (lines.length > 0) {
    const joined = lines.join('\n');
    if (isCustomsCodeMismatchMessage(joined)) return '';
    return joined;
  }

  if (isCustomsCodeMismatchMessage(message)) return '';
  if (message.length > 160) return fallback;
  return message;
};

/** Marker returned from API layer; UI maps via `resolveAddressSaveError`. */
export const ADDRESS_ERROR_I18N_PREFIX = '@addressError:';

const parseAddressApiError = (responseData: unknown, fallback: string): string => {
  const i18nKey = getAddressApiErrorI18nKey(responseData);
  if (i18nKey) return `${ADDRESS_ERROR_I18N_PREFIX}${i18nKey}`;
  const formatted = formatAddressApiErrorMessage(responseData, '');
  return formatted || fallback;
};

export interface AddressItem {
  _id: string;
  customerClearanceType?: string;
  recipient?: string;
  contact?: string;
  personalCustomsCode?: string;
  defaultAddress?: boolean;
  detailedAddress?: string;
  zipCode?: string;
  note?: string;
  mainAddress?: string;
  // Legacy fields (from old API structure)
  label?: string;
  fullName?: string;
  phone?: string;
  country?: string;
  province?: string;
  city?: string;
  addressLine1?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface AddressesResponse {
  addresses: AddressItem[];
}

export const addressApi = {
  // Add new address
  addAddress: async (request: AddAddressRequest): Promise<ApiResponse<AddressesResponse>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/users/addresses`;
      // console.log('Sending add address request to:', url);
      // console.log('Add address request body:', JSON.stringify(request, null, 2));
      const body: AddressSubmitBody = {
        ...request,
        custommethod: request.customMethod,
      };
      const signatureHeaders = await buildSignatureHeaders('POST', url, body);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
        body: JSON.stringify(body),
      });

      // console.log('Add address response status:', response.status);

      const responseText = await response.text();
      // console.log('Add address response text:', responseText.substring(0, 500));

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
          error: parseAddressApiError(
            responseData,
            `Request failed with status ${response.status}`,
          ),
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: parseAddressApiError(responseData, 'Failed to add address'),
        };
      }

      return {
        success: true,
        message: responseData.message || 'Address added successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      // console.error('Add address error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Get all addresses
  getAddresses: async (): Promise<ApiResponse<AddressesResponse>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/users/addresses`;
      // console.log('Sending get addresses request to:', url);
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

      // console.log('Get addresses response status:', response.status);

      const responseText = await response.text();
      // console.log('Get addresses response text:', responseText.substring(0, 500));

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
          error: responseData?.message || 'Failed to get addresses',
        };
      }

      return {
        success: true,
        message: responseData.message || 'Addresses retrieved successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      // console.error('Get addresses error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Update address
  updateAddress: async (
    addressId: string,
    request: Partial<AddAddressRequest>
  ): Promise<ApiResponse<AddressesResponse>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/users/addresses/${addressId}`;
      // console.log('Sending update address request to:', url);
      // console.log('Update address request body:', JSON.stringify(request, null, 2));
      const body: Record<string, unknown> = { ...request };
      if (request.customMethod != null) {
        body.custommethod = request.customMethod;
      } else if (request.customerClearanceType != null) {
        body.custommethod =
          request.customerClearanceType === 'business' ? 'business' : 'individual';
      }
      const signatureHeaders = await buildSignatureHeaders('PUT', url, body);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
        body: JSON.stringify(body),
      });

      // console.log('Update address response status:', response.status);

      const responseText = await response.text();
      // console.log('Update address response text:', responseText.substring(0, 500));

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
          error: parseAddressApiError(
            responseData,
            `Request failed with status ${response.status}`,
          ),
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: parseAddressApiError(responseData, 'Failed to update address'),
        };
      }

      return {
        success: true,
        message: responseData.message || 'Address updated successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      // console.error('Update address error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Delete address
  deleteAddress: async (addressId: string): Promise<ApiResponse<AddressesResponse>> => {
    try {
      const token = await getStoredToken();

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const url = `${API_BASE_URL}/users/addresses/${addressId}`;
      // console.log('Sending delete address request to:', url);
        const signatureHeaders = await buildSignatureHeaders('DELETE', url);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });

      // console.log('Delete address response status:', response.status);

      const responseText = await response.text();
      // console.log('Delete address response text:', responseText.substring(0, 500));

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
          error: responseData?.message || 'Failed to delete address',
        };
      }

      return {
        success: true,
        message: responseData.message || 'Address deleted successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      // console.error('Delete address error:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};


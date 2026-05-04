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
  recipient: string;
  contact: string;
  personalCustomsCode: string;
  detailedAddress: string;
  zipCode: string;
  defaultAddress: boolean;
  note?: string;
  mainAddress?: string;
}

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
      const signatureHeaders = await buildSignatureHeaders('POST', url, request);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
        body: JSON.stringify(request),
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
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to add address',
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
      const signatureHeaders = await buildSignatureHeaders('PUT', url, request);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
        body: JSON.stringify(request),
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
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to update address',
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


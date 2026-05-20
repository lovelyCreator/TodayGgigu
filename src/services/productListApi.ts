import axios from 'axios';
import { getStoredToken } from './authApi';

import { API_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ProductThumbnail {
  url: string;
  dpi?: number;
  width?: number;
  height?: number;
  isThumbnail?: boolean;
}

export interface SellerProduct {
  _id: string;
  ownerUserId: string;
  productName: string;
  categoryId: string;
  productStatus: string;
  thumbnails: ProductThumbnail[];
  company?: string;
  sku?: string;
  labelName?: string;
  productUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetSellerProductsParams {
  categoryKey?: string;
  status?: string;
}

export const productListApi = {
  // Get the seller's own product list.
  getProducts: async (
    params: GetSellerProductsParams = {},
  ): Promise<ApiResponse<{ products: SellerProduct[] }>> => {
    try {
      const token = await getStoredToken();

      const query = new URLSearchParams();
      if (params.categoryKey) query.append('categoryKey', params.categoryKey);
      if (params.status) query.append('status', params.status);
      const qs = query.toString();

      const url = `${API_BASE_URL}/users/product-list/products${qs ? `?${qs}` : ''}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Products retrieved successfully',
        };
      }

      return {
        success: false,
        message: 'No products data received',
        data: undefined,
      };
    } catch (error: any) {
      if (__DEV__) console.warn('[productListApi.getProducts]', error?.message, error.response?.data);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to get products';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },
};

import axios from 'axios';
import { getStoredToken } from './authApi';

import { API_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AddToWishlistRequest {
  offerId: string;
  platform: string;
}

export interface MultiLang {
  en?: string;
  ko?: string;
  zh?: string;
}

export interface WishlistItem {
  _id: string;
  userId?: string;
  imageUrl: string;
  externalId: string;
  source?: string;
  price: number;
  title?: string;
  subjectMultiLang?: MultiLang;
  purchased?: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  isDiscounted?: boolean;
  isExpired?: boolean;
  isLowStock?: boolean;
  productDetailFetchedAt?: string;
  storeId?: string;
  storeName?: string;
  storeNameMultiLang?: MultiLang;
}

export interface WishlistByStore {
  storeId: string;
  storeName: string;
  storeNameMultiLang?: MultiLang;
  items: WishlistItem[];
}

export interface WishlistResponse {
  wishlist: WishlistItem[];
  wishlistByStore?: WishlistByStore[];
  total?: number;
}

/** Values accepted by GET /wishlist `timeFilter` query param. */
export const WISHLIST_API_TIME_FILTERS = ['7d', '30d', '90d', '6m', '1y'] as const;
export type WishlistApiTimeFilter = (typeof WISHLIST_API_TIME_FILTERS)[number];

const LEGACY_WISHLIST_TIME_FILTER_MAP: Record<string, WishlistApiTimeFilter> = {
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  '180d': '6m',
  '365d': '1y',
  '6m': '6m',
  '1y': '1y',
};

export function normalizeWishlistTimeFilter(
  value?: string | null,
): WishlistApiTimeFilter {
  if (!value) return '1y';
  const mapped = LEGACY_WISHLIST_TIME_FILTER_MAP[value];
  if (mapped) return mapped;
  if ((WISHLIST_API_TIME_FILTERS as readonly string[]).includes(value)) {
    return value as WishlistApiTimeFilter;
  }
  return '1y';
}

export interface GetWishlistParams {
  discounted?: boolean;
  options?: string;
  sort?: string;
  timeFilter?: WishlistApiTimeFilter | string;
  groupByStore?: boolean;
  /** Max items to return (backend may cap; omit for server default). */
  limit?: number;
}

export const wishlistApi = {
  // Add product to wishlist (POST /wishlist)
  addToWishlist: async (request: AddToWishlistRequest): Promise<ApiResponse<{ wishlistItem: WishlistItem }>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/wishlist`;
      const body = { offerId: request.offerId, platform: request.platform };
      const signatureHeaders = await buildSignatureHeaders('POST', url, body);

      const response = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (!response.data || !response.data.data) {
        return {
          success: false,
          message: 'No wishlist data received',
          data: undefined,
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Product added to wishlist',
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add product to wishlist';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Get wishlist (GET /wishlist with query params)
  getWishlist: async (params?: GetWishlistParams): Promise<ApiResponse<WishlistResponse>> => {
    try {
      let token = await getStoredToken();
      if (!token) {
        await new Promise(resolve => setTimeout(resolve, 500));
        token = await getStoredToken();
        if (!token) {
          return { success: false, message: 'Authentication required', data: undefined };
        }
      }

      const discounted = params?.discounted ?? false;
      const options = params?.options ?? '';
      const sort = params?.sort ?? 'recently_saved';
      const timeFilter = normalizeWishlistTimeFilter(params?.timeFilter);
      const queryParams: Record<string, string> = {
        discounted: String(discounted),
        options,
        sort,
        timeFilter,
      };
      if (params?.groupByStore) queryParams.groupByStore = 'true';
      if (params?.limit != null && params.limit > 0) {
        queryParams.limit = String(params.limit);
      }
      const query = new URLSearchParams(queryParams).toString();
      const url = `${API_BASE_URL}/wishlist?${query}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (__DEV__) {
        const payload = response.data?.data;
        const flatItems = Array.isArray(payload?.wishlist)
          ? payload.wishlist
          : Array.isArray(payload?.wishlistByStore)
            ? payload.wishlistByStore.flatMap(
                (g: WishlistByStore) => g.items || [],
              )
            : [];
        console.log('[wishlistApi.getWishlist]', {
          requestUrl: url,
          total: payload?.total ?? flatItems.length,
          itemCount: flatItems.length,
          sample: flatItems[0]
            ? {
                externalId: flatItems[0].externalId,
                source: flatItems[0].source,
                title: flatItems[0].title,
                price: flatItems[0].price,
                storeName: flatItems[0].storeName,
                createdAt: flatItems[0].createdAt,
                productDetailFetchedAt: flatItems[0].productDetailFetchedAt,
              }
            : null,
        });
      }

      const payload = response.data;
      if (
        !payload ||
        (payload.status != null && payload.status !== 'success') ||
        payload.data == null
      ) {
        return {
          success: false,
          message:
            payload?.message ||
            (typeof payload === 'string' ? payload : 'No wishlist data received'),
          data: undefined,
        };
      }

      return {
        success: true,
        data: payload.data,
        message: payload.message || 'Wishlist retrieved successfully',
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[wishlistApi.getWishlist] error', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get wishlist';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Delete product from wishlist (DELETE /wishlist/:wishlistId)
  // wishlistId can be MongoDB _id or externalId
  deleteFromWishlist: async (wishlistId: string): Promise<ApiResponse<{ wishlist?: WishlistItem[] }>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/wishlist/${encodeURIComponent(wishlistId)}`;
      const signatureHeaders = await buildSignatureHeaders('DELETE', url);

      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (response.data?.status === 'success' || response.status === 200) {
        return {
          success: true,
          data: response.data?.data,
          message: response.data?.message || 'Product removed from wishlist successfully',
        };
      }

      return {
        success: false,
        message: response.data?.message || 'No wishlist data received from delete response',
        data: undefined,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          success: true,
          message: 'Product removed from wishlist successfully',
          data: undefined,
        };
      }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove product from wishlist';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Batch delete from wishlist (DELETE /wishlist/batch)
  deleteFromWishlistBatch: async (wishlistIds: string[]): Promise<ApiResponse<{ wishlist?: WishlistItem[] }>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/wishlist/batch`;
      const body = { wishlistIds };
      const signatureHeaders = await buildSignatureHeaders('DELETE', url, body);

      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
        data: body,
      });

      if (response.data?.status === 'success' || response.status === 200) {
        return {
          success: true,
          data: response.data?.data,
          message: response.data?.message || 'Items removed from wishlist successfully',
        };
      }

      return {
        success: false,
        message: response.data?.message || 'No data received from batch delete',
        data: undefined,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove items from wishlist';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },
};


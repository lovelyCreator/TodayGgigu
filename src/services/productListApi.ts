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

/** 다국어 텍스트 — 백엔드가 {en, ko, zh} 객체로 보내준다. */
export interface ProductNameMultiLang {
  en?: string;
  ko?: string;
  zh?: string;
}

/**
 * 상품관리 페지에서 받는 한 건의 상품. 새 GET /customer/product-list/products
 * 응답을 그대로 반영한 모양 — 이전 `users/product-list/products` 응답에 비해
 * 다음 필드들이 추가/유지된다:
 *   • productNameMultiLang  — 다국어 상품명
 *   • orderId / offerId / skuId / specId — 주문·상품 키
 *   • detailImgUrl          — 상품 상세 페이지 URL (1688 등 원본)
 *   • option1 / option2     — 옵션 텍스트 (색상·사이즈 등 — 백엔드가 사람이 읽는 형태로 정리해서 내려옴)
 *   • unitPrice / userPrice / previousUserPrice — 단가 관련 (모두 number)
 *   • level                 — 'G' / 'R' / 'P' / 'S' 같은 단일 문자 등급
 *   • categoryName / categoryKey — 카테고리 식별자
 *   • Tnumber               — 일부 항목에만 있는 거래 번호
 */
export interface SellerProduct {
  _id: string;
  ownerUserId: string;
  productName: string;
  productNameMultiLang?: ProductNameMultiLang;
  orderId?: string;
  offerId?: string;
  skuId?: string;
  specId?: string;
  detailImgUrl?: string;
  categoryId: string;
  productStatus: string;
  thumbnails: ProductThumbnail[];
  company?: string;
  sku?: string;
  labelName?: string;
  productUrl?: string;
  option1?: string;
  option2?: string;
  unitPrice?: number;
  userPrice?: number;
  previousUserPrice?: number;
  level?: string;
  categoryName?: string;
  categoryKey?: string;
  Tnumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type SellerProductLabelPayload = {
  labelType?: 'product' | 'foodInspect';
  labelFormat?: '50x80' | '40x60';
  labelProductName?: string;
  labelContent?: string;
  labelBarcode?: string;
  labelFileUri?: string | null;
};

export type UpdateSellerProductSkuPayload = {
  skuId: string;
  specId?: string;
  unitPrice?: number;
  userPrice?: number;
  remark?: string;
  labelName?: string;
  label?: SellerProductLabelPayload;
};

export interface UpdateSellerProductPayload {
  productName?: string;
  categoryName?: string;
  productUrl?: string;
  thumbnails?: ProductThumbnail[];
  skus?: UpdateSellerProductSkuPayload[];
}

export interface GetSellerProductsParams {
  /** Locale to request product names in. 'ko' / 'en' / 'zh'. Defaults to 'ko'. */
  lang?: string;
  /** 향후 백엔드가 확장할 때를 대비 — 현재는 사용하지 않지만 호출자가 같이 보내도 무시된다. */
  categoryKey?: string;
  status?: string;
  /** ISO 8601 (예: '2026-06-17T00:00:00.000Z') — createdAt 기준 시작 시각. */
  periodFrom?: string;
  /** ISO 8601 — createdAt 기준 종료 시각. */
  periodTo?: string;
}

export const productListApi = {
  /**
   * GET /customer/product-list/products
   * 응답 예시는 응답 JSON 참조. data.products[] 는 SellerProduct[] 형태.
   */
  getProducts: async (
    params: GetSellerProductsParams = {},
  ): Promise<ApiResponse<{ products: SellerProduct[] }>> => {
    try {
      const token = await getStoredToken();

      const query = new URLSearchParams();
      // lang 은 백엔드가 다국어 텍스트(productName 등)를 어느 언어로 정렬해
      // 보낼지 결정하는 핵심 파라미터. 기본값은 'ko'.
      query.append('lang', params.lang || 'ko');
      if (params.categoryKey) query.append('categoryKey', params.categoryKey);
      if (params.status) query.append('status', params.status);
      // 날짜 구간 — 백엔드가 도입하면 자동으로 서버 사이드 필터링에 쓰인다.
      // 도입 전이라도 같이 보내 두면 backwards-compatible.
      if (params.periodFrom) query.append('periodFrom', params.periodFrom);
      if (params.periodTo) query.append('periodTo', params.periodTo);
      const qs = query.toString();

      const url = `${API_BASE_URL}/customer/product-list/products${qs ? `?${qs}` : ''}`;
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

  /**
   * PUT /customer/product-list/products/:productId
   * 웹 온라인상품편집 저장 — SKU 단가·비고·라벨 설정 포함.
   */
  updateProduct: async (
    productId: string,
    payload: UpdateSellerProductPayload,
    lang = 'ko',
  ): Promise<ApiResponse<{ product?: SellerProduct }>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/customer/product-list/products/${encodeURIComponent(productId)}?lang=${lang}`;
      const signatureHeaders = await buildSignatureHeaders('PUT', url);

      const response = await axios.put(url, payload, {
        timeout: 20000,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (response.data?.status === 'success') {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Product updated',
        };
      }

      return {
        success: false,
        message: response.data?.message || 'Failed to update product',
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[productListApi.updateProduct]', error?.message, error.response?.data);
      }
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to update product',
      };
    }
  },
};

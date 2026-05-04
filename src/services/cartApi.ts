import axios from 'axios';
import { getStoredToken } from './authApi';

import { API_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AddToCartRequest {
  offerId: number;
  categoryId: number;
  source?: string;
  subject: string;
  subjectTrans: string;
  imageUrl: string;
  promotionUrl?: string;
  skuInfo: {
    skuId: number;
    specId: string;
    price: string;
    amountOnSale: number;
    consignPrice: string;
    cargoNumber?: string;
    skuAttributes: Array<{
      attributeId: number;
      attributeName: string;
      attributeNameTrans: string;
      value: string;
      valueTrans: string;
      skuImageUrl?: string;
    }>;
    fenxiaoPriceInfo?: {
      offerPrice: string;
    };
  };
  companyName: string;
  sellerOpenId: string;
  quantity: number;
  minOrderQuantity: number;
}

export interface MultiLang {
  en?: string;
  ko?: string;
  zh?: string;
}

export interface CartItemSkuAttribute {
  attributeId: number;
  attributeName: string;
  attributeNameTrans?: string;
  attributeNameMultiLang?: MultiLang;
  value: string;
  valueTrans?: string;
  valueMultiLang?: MultiLang;
  skuImageUrl?: string;
}

export interface CartItem {
  offerId: number;
  categoryId?: number;
  subject: string;
  subjectTrans?: string;
  subjectMultiLang?: MultiLang;
  imageUrl: string;
  promotionUrl?: string;
  skuInfo: {
    skuId: number;
    specId: string;
    price: string;
    amountOnSale?: number;
    consignPrice: string;
    cargoNumber?: string;
    skuAttributes: CartItemSkuAttribute[];
    fenxiaoPriceInfo?: {
      offerPrice: string;
      offerPriceCNY?: string;
    };
  };
  companyName: string | MultiLang;
  sellerOpenId: string;
  quantity: number;
  minOrderQuantity?: number;
  addedAt?: string;
  _id?: string;
  categoryName?: MultiLang;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  estimatedShippingCost?: number;
  estimatedShippingCostBySeller?: { [sellerId: string]: number };
  estimatedShippingCostBySellerCNY?: { [sellerId: string]: number };
  lastCheckoutCartItemIdsBySeller?: { [sellerId: string]: string[] };
}

export interface CheckoutResponse {
  selectedItems: any[];
  updatedItems: string[];
  notFoundItems: string[];
  estimatedShippingCostBySeller: { [sellerId: string]: number };
  estimatedShippingCost: number;
  productTotalKRW?: number;
  shippingTotalKRW?: number;
  availableCoupons?: Array<{
    usageId: string;
    couponId: string;
    name: string;
    type: string;
    amount: number;
    minPurchaseAmount?: number;
    validUntil?: string;
    applicableDiscount?: number;
  }>;
  availablePoints?: number;
  transportationMethods?: Array<{
    deliveryName: string;
    defaultWeight?: number;
    defaultPrice?: number;
    additionalWeight?: number;
    additionalWeightPrice?: number;
    shippingTimeRequired?: string;
  }>;
  additionalServicePrices?: Array<{
    type: string;
    price: number;
    nameEn: string;
    nameKo: string;
    nameZh: string;
  }>;
  serviceFeePercentage?: number;
  estimatedRuralCost?: {
    postalCode?: string;
    ferryFee?: number;
    additionalShippingFee?: number;
    total?: number;
  };
}

export interface DirectPurchaseRequest {
  productId: number;
  source: string;
  quantity: string;
  price: number;
  sellerOpenId: string;
  imageUrl: string;
  promotionUrl?: string;
  companyName: string;
  subject: string;
  subjectTrans?: string;
  categoryid?: string;
  categoryname?: string;
  skuInfo: {
    skuId: number;
    specId: string;
    price: string;
    amountOnSale?: number;
    consignPrice: string;
    cargoNumber?: string;
    skuAttributes: Array<{
      attributeId?: number;
      attributeName?: string;
      attributeNameTrans?: string;
      value?: string;
      valueTrans?: string;
      skuImageUrl?: string;
    }>;
    fenxiaoPriceInfo?: { offerPrice?: string };
  };
}

export const cartApi = {
  // Get cart
  getCart: async (): Promise<ApiResponse<{ cart: Cart }>> => {
    try {
      const token = await getStoredToken();
      // console.log('🛒 GET CART - ACCESS TOKEN:', token);

      const url = `${API_BASE_URL}/cart`;
      console.log('🛒 GET CART REQUEST URL:', url);

      const signatureHeaders = await buildSignatureHeaders('GET', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      console.log('🛒 GET CART RESPONSE STATUS:', response.status);
      console.log('🛒 GET CART RESPONSE DATA:', JSON.stringify(response.data, null, 2));

      if (!response.data || !response.data.data) {
        return {
          success: false,
          message: 'No cart data received',
          data: undefined,
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: 'Cart retrieved successfully',
      };
    } catch (error: any) {
      console.error('🛒 GET CART ERROR:', error);
      console.error('🛒 GET CART ERROR RESPONSE:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get cart';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Add product to cart
  addToCart: async (request: AddToCartRequest): Promise<ApiResponse<{ cart: Cart }>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/cart`;
      const signatureHeaders = await buildSignatureHeaders('POST', url, request);

      const response = await axios.post(url, request, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      console.log('Add to cart response:', response.data);

      if (!response.data || !response.data.data) {
        return {
          success: false,
          message: 'No cart data received',
          data: undefined,
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Product added to cart successfully',
      };
    } catch (error: any) {
      console.error('Add to cart error:', error, error.response?.data?.message || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add product to cart';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Update cart item quantity
  updateCartItem: async (cartItemId: string, quantity: number): Promise<ApiResponse<{ cart: Cart }>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/cart/${cartItemId}`;
      // console.log('Sending update cart item request to:', url);
      // console.log('Update cart item body:', JSON.stringify({ quantity }, null, 2));
      const signatureHeaders = await buildSignatureHeaders('PUT', url);
      const response = await axios.put(url, { quantity }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      // console.log('Update cart item response:', response.data);

      if (!response.data || !response.data.data) {
        return {
          success: false,
          message: 'No cart data received',
          data: undefined,
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Cart item updated successfully',
      };
    } catch (error: any) {
      // console.error('Update cart item error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update cart item';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Delete cart item
  deleteCartItem: async (cartItemId: string): Promise<ApiResponse<{ cart: Cart }>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/cart/${cartItemId}`;
      // console.log('Sending delete cart item request to:', url);
      const signatureHeaders = await buildSignatureHeaders('DELETE', url);
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      // console.log('Delete cart item response:', response.data);

      if (!response.data || !response.data.data) {
        return {
          success: false,
          message: 'No cart data received',
          data: undefined,
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Cart item deleted successfully',
      };
    } catch (error: any) {
      // console.error('Delete cart item error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete cart item';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Clear cart (delete all items)
  clearCart: async (): Promise<ApiResponse<{ cart: Cart }>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/cart`;
      // console.log('Sending clear cart request to:', url);

      const signatureHeaders = await buildSignatureHeaders('DELETE', url);

      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,

        },
      });

      // console.log('Clear cart response:', response.data);

      if (!response.data || !response.data.data) {
        return {
          success: false,
          message: 'No cart data received',
          data: undefined,
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Cart cleared successfully',
      };
    } catch (error: any) {
      // console.error('Clear cart error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to clear cart';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Delete batch cart items
  deleteCartBatch: async (cartItemIds: string[]): Promise<ApiResponse<{ cart: Cart }>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/cart`;
      // console.log('Sending delete batch cart items request to:', url);
      // console.log('Delete batch body:', JSON.stringify({ itemIds: cartItemIds }, null, 2));

      const signatureHeaders = await buildSignatureHeaders('DELETE', url);

      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
        data: { itemIds: cartItemIds },
      });

      // console.log('Delete batch cart items response:', response.data);

      if (!response.data || !response.data.data) {
        return {
          success: false,
          message: 'No cart data received',
          data: undefined,
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Cart items deleted successfully',
      };
    } catch (error: any) {
      // console.error('Delete batch cart items error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete cart items';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Checkout - update quantities for selected items (POST /cart/checkout)
  checkout: async (quantities: { [cartItemId: string]: number }): Promise<ApiResponse<CheckoutResponse>> => {
    try {
      const token = await getStoredToken();

      const url = `${API_BASE_URL}/cart/checkout`;
      const body = { quantities };
      const signatureHeaders = await buildSignatureHeaders('POST', url, body);

      const response = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      // console.log('Checkout response:', response.data);

      if (!response.data || !response.data.data) {
        return {
          success: false,
          message: 'No cart data received',
          data: undefined,
        };
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Cart quantities updated successfully',
      };
    } catch (error: any) {
      // console.error('Checkout error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to checkout';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },

  // Direct purchase checkout (POST /cart/checkout/direct-purchase) - from ProductDetail Buy Now
  checkoutDirectPurchase: async (body: DirectPurchaseRequest): Promise<ApiResponse<CheckoutResponse>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/cart/checkout/direct-purchase`;
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
          message: response.data?.message || 'No checkout data received',
          data: undefined,
        };
      }
      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Checkout ready',
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to checkout';
      return {
        success: false,
        message: errorMessage,
        data: undefined,
      };
    }
  },
};


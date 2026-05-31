import { API_BASE_URL } from '../constants';
import { axiosWithAuth } from './authenticatedHttp';

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
  source?: string;
  productId?: number | string;
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
  getCart: async (lang: string = 'en'): Promise<ApiResponse<{ cart: Cart }>> => {
    try {
      const url = `${API_BASE_URL}/cart?lang=${lang}`;
      const response = await axiosWithAuth('GET', url);

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
      if (__DEV__) console.warn('🛒 GET CART ERROR:', error?.message, error.response?.data);
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
      const url = `${API_BASE_URL}/cart`;
      const response = await axiosWithAuth('POST', url, { data: request });

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
      const url = `${API_BASE_URL}/cart/${cartItemId}`;
      const response = await axiosWithAuth('PUT', url, { data: { quantity } });

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
      const url = `${API_BASE_URL}/cart/${cartItemId}`;
      const response = await axiosWithAuth('DELETE', url);

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
      const url = `${API_BASE_URL}/cart`;
      const response = await axiosWithAuth('DELETE', url);

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
      const url = `${API_BASE_URL}/cart`;
      const response = await axiosWithAuth('DELETE', url, {
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
      const url = `${API_BASE_URL}/cart/checkout`;
      const body = { quantities };
      const response = await axiosWithAuth('POST', url, { data: body });

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
      const url = `${API_BASE_URL}/cart/checkout/direct-purchase`;
      const response = await axiosWithAuth('POST', url, { data: body });
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


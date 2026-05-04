import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { getStoredToken } from './authApi';
import { buildSignatureHeaders } from './signature';

export interface Coupon {
  id: string;
  usageId: string;
  couponId: string;
  name: string;
  type: string;
  amount: number;
  minPurchaseAmount: number;
  validFrom: string;
  validUntil: string;
  receivedAt: string;
  status: 'received' | 'used' | 'expired';
}

export interface PointTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  description: string;
  date: string;
  orderId?: string;
}

export interface VoucherWalletData {
  availableCoupons: Coupon[];
  usedCoupons: Coupon[];
  expiredCoupons: Coupon[];
  points: {
    balance: number;
    recentTransactions: PointTransaction[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export const voucherApi = {
  // Get voucher wallet data (coupons and points)
  getVoucherWallet: async (): Promise<ApiResponse<VoucherWalletData>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/voucher-wallet`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      console.log('🎟️ [Voucher Wallet API] Response:', response.data);
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return {
        success: false,
        message: 'Failed to fetch voucher wallet data',
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch voucher wallet';
      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // Apply coupon code (receive coupon)
  applyCouponCode: async (couponCode: string): Promise<ApiResponse<Coupon>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/coupons/receive`;
      const signatureHeaders = await buildSignatureHeaders('POST', url, {
        code: couponCode,
      });
      const response = await axios.post(url, {
        code: couponCode,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (response.data && response.data.status === 'success') {
        // Map the response to our Coupon interface
        const usage = response.data.data.usage;
        const coupon = response.data.data.coupon;
        
        const mappedCoupon: Coupon = {
          id: usage._id,
          usageId: usage._id,
          couponId: coupon._id,
          name: coupon.name,
          type: coupon.type,
          amount: coupon.amount,
          minPurchaseAmount: coupon.minPurchaseAmount,
          validFrom: usage.validFrom,
          validUntil: usage.validUntil,
          receivedAt: usage.receivedAt,
          status: usage.status,
        };
        
        return {
          success: true,
          data: mappedCoupon,
          message: response.data.message || 'Coupon received successfully',
        };
      }

      return {
        success: false,
        message: 'Failed to receive coupon',
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to receive coupon';
      return {
        success: false,
        message: errorMessage,
      };
    }
  },
};

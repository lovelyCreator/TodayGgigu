import axios from 'axios';
import { getStoredToken } from './authApi';
import { API_BASE_URL } from '../constants';
import { ApiResponse } from '../types';

export interface SellerDashboardItem {
  firstTierPaidAt: string;
  orderNumber: string;
  orderId: string;
  productNumber: string;
  quantity: number;
  recipient: string;
  paidAmountKrw: number;
  rebateKrw: number;
  trackingNumber: string | null;
  liveCodeSnapshot: string;
}

export interface SellerDashboardResponseData {
  items: SellerDashboardItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SellerDashboardSummary {
  range: {
    from: string;
    to: string;
  };
  salesAmountKrw: number;
  salesQuantity: number;
  refundAmountKrw: number;
  refundQuantity: number;
  rebatePersonalAccruedKrw: number;
  rebatePersonalDeductedKrw: number;
  rebateTeamAccruedKrw: number;
  rebateTeamDeductedKrw: number;
  averageOrderValueKrw: number;
  refundRate: number;
}

export interface SellerDashboardSummaryResponseData {
  summary: SellerDashboardSummary;
  directTeam: SellerDirectTeamMember[];
}

export type SellerDashboardParams = {
  search?: string;
  from?: string;
  to?: string;
  mode?: 'profit' | 'refund';
  page?: number;
  pageSize?: number;
};

export type SellerDirectTeamParams = {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export interface SellerDirectTeamMember {
  sellerId: string;
  name: string;
  amount: number;
  count: number;
  rebate: number;
}

export interface SellerDirectTeamResponse {
  team?: SellerDirectTeamMember[];
  members?: SellerDirectTeamMember[];
  totalSales?: number;
  totalOrders?: number;
  totalRebate?: number;
}

const getAuthHeaders = async () => {
  const token = await getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const sellerApi = {
  getSellerDashboard: async (
    params?: SellerDashboardParams
  ): Promise<ApiResponse<SellerDashboardResponseData | null>> => {
    try {
      const url = `${API_BASE_URL}/users/seller/dashboard`;
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      const response = await axios.get(url, { headers, params });
      const raw = response.data as any;

      if (raw?.status === 'success') {
        return {
          success: true,
          data: raw.data || null,
          message: raw?.message || undefined,
        };
      }

      return {
        success: false,
        message:
          raw?.message || raw?.error || raw?.status || 'Failed to load seller dashboard.',
        data: null,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to load seller dashboard.';
      return {
        success: false,
        message,
        data: null,
      };
    }
  },

  getSellerDashboardSummary: async (
    params?: SellerDashboardParams
  ): Promise<ApiResponse<SellerDashboardSummaryResponseData | null>> => {
    try {
      const url = `${API_BASE_URL}/users/seller/dashboard`;
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      const response = await axios.get(url, { headers, params });
      const raw = response.data as any;

      if (raw?.status === 'success') {
        return {
          success: true,
          data: raw.data || null,
          message: raw?.message || undefined,
        };
      }

      return {
        success: false,
        message:
          raw?.message || raw?.error || raw?.status || 'Failed to load seller dashboard summary.',
        data: null,
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to load seller dashboard summary.';
      return {
        success: false,
        message,
        data: null,
      };
    }
  },

  getSellerDirectTeam: async (params?: SellerDirectTeamParams): Promise<ApiResponse<SellerDirectTeamResponse | null>> => {
    try {
      const url = `${API_BASE_URL}/users/seller/direct-team`;
      const headers = {
        'Content-Type': 'application/json',
        ...(await getAuthHeaders()),
      };
      const response = await axios.get(url, { headers, params });
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to load seller direct team.';
      return {
        success: false,
        message,
        data: null,
      };
    }
  },
};

import { getStoredToken, refreshAccessToken } from './authApi';
import { API_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface DepositBalance {
  totalDeposit: number;
  availableDeposit: number;
  withdrawalDeposit: number;
  currency?: string;
}

export interface RechargeRequest {
  transferMethod: string;
  remitterName: string;
  rechargeCurrency: string;
  amount: number;
  depositCurrencyAmount?: number;
  serviceFee?: number;
  receivingBankInformation?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  description?: string;
  proofImageUrl?: string;
}

export interface RechargeResponse {
  rechargeRequest: any;
}

export interface WithdrawRequest {
  transferMethod: string;
  amount: number;
  currency: string;
  receivingBankInformation: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  description?: string;
}

export interface DepositTransaction {
  _id: string;
  type: 'recharge' | 'withdraw' | 'payment' | 'refund';
  amount: number;
  currency?: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: any;
}

// Helper: authenticated fetch with auto token refresh on 401
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
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...signatureHeaders,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    console.log('[depositApi] Got 401, attempting token refresh...');
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
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...newSignatureHeaders,
          ...(options.headers || {}),
        },
      });
    }
  }

  return response;
};

const parseResponse = async <T>(response: Response, label: string): Promise<ApiResponse<T>> => {
  console.log(`[depositApi] ${label} response status:`, response.status);
  const responseText = await response.text();
  console.log(`[depositApi] ${label} response body:`, responseText.substring(0, 300));

  let responseData: any;
  try { responseData = JSON.parse(responseText); } catch {
    return { success: false, error: 'Invalid response from server.' };
  }

  if (!response.ok) {
    return { success: false, error: responseData?.message || `Request failed with status ${response.status}` };
  }
  if (responseData.status !== 'success') {
    return { success: false, error: responseData?.message || 'Request failed' };
  }

  return { success: true, message: responseData.message, data: responseData.data };
};

export const depositApi = {
  /**
   * Get deposit balance
   * GET /deposits/balance
   */
  getBalance: async (): Promise<ApiResponse<DepositBalance>> => {
    try {
      console.log('[depositApi] getBalance');
      const url = `${API_BASE_URL}/deposits/balance`;
      const response = await authFetch(url);
      return parseResponse(response, 'getBalance');
    } catch (error: any) {
      console.error('[depositApi] getBalance error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  /**
   * Create a recharge request
   * POST /deposits/recharge-request
   */
  createRechargeRequest: async (data: RechargeRequest): Promise<ApiResponse<RechargeResponse>> => {
    try {
      console.log('[depositApi] createRechargeRequest:', { amount: data.amount, method: data.transferMethod });
      const url = `${API_BASE_URL}/deposits/recharge-request`;
      const response = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return parseResponse(response, 'createRechargeRequest');
    } catch (error: any) {
      console.error('[depositApi] createRechargeRequest error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  /**
   * Get deposit transactions
   * GET /deposits/transactions
   */
  getTransactions: async (): Promise<ApiResponse<{ transactions: DepositTransaction[] }>> => {
    try {
      console.log('[depositApi] getTransactions');
      const url = `${API_BASE_URL}/deposits/transactions`;
      const response = await authFetch(url);
      return parseResponse(response, 'getTransactions');
    } catch (error: any) {
      console.error('[depositApi] getTransactions error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  /**
   * Create a withdraw request
   * POST /deposits/withdraw-request
   */
  createWithdrawRequest: async (data: WithdrawRequest): Promise<ApiResponse<any>> => {
    try {
      console.log('[depositApi] createWithdrawRequest:', { amount: data.amount, currency: data.currency });
      const url = `${API_BASE_URL}/deposits/withdraw-request`;
      const response = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return parseResponse(response, 'createWithdrawRequest');
    } catch (error: any) {
      console.error('[depositApi] createWithdrawRequest error:', error);
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },
};

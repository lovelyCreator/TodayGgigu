import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { getStoredToken } from './authApi';
import { buildSignatureHeaders } from './signature';

export interface AdditionalServiceDescriptionMultiLang {
  ko?: string;
  zh?: string;
  en?: string;
}

export interface AdditionalServiceDto {
  id: string;
  serviceType: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  quantity?: number;
  price: number;
  feeCurrency?: string;
  description?: string;
  descriptionMultiLang?: AdditionalServiceDescriptionMultiLang;
  imageUrl?: string;
  icon?: string;
}

interface AdditionalServicesResponse {
  status?: string;
  data?: {
    addServices?: AdditionalServiceDto[];
  };
}

export async function fetchAdditionalServices(): Promise<{
  success: boolean;
  data?: AdditionalServiceDto[];
  message?: string;
}> {
  try {
    const token = await getStoredToken();
    const url = `${API_BASE_URL}/customer/additional-services`;
    const signatureHeaders = await buildSignatureHeaders('GET', url);
    const response = await axios.get<AdditionalServicesResponse>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...signatureHeaders,
      },
    });

    const payload = response.data;
    const list = payload?.data?.addServices;
    if (payload?.status === 'success' && Array.isArray(list)) {
      return { success: true, data: list };
    }

    return {
      success: false,
      message: 'No additional services data received',
    };
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    const message =
      err.response?.data?.message || err.message || 'Failed to load additional services';
    return { success: false, message };
  }
}

import { API_BASE_URL } from '../constants';
import { normalizeCenterManageMeta } from '../utils/centerManageMeta';
import { axiosWithAuth } from './authenticatedHttp';

export interface CenterManageApplicationCategory {
  name: string;
  parentParameter: string;
}

/** Nested: businessType → logisticsCenter → shippingMethod → applicationCategory → customs[] */
export type CenterManageCategoryTree = Record<
  string,
  Record<string, Record<string, Record<string, string[]>>>
>;

export interface CenterManageMeta {
  businessType: string[];
  logisticsCenter: string[];
  shippingMethod: string[];
  applicationCategory: CenterManageApplicationCategory[];
  customsClearanceMethod: string[];
  category: CenterManageCategoryTree;
}

interface CenterManageMetaResponse {
  status?: string;
  data?: CenterManageMeta;
  message?: string;
}

export async function fetchCenterManageMeta(): Promise<{
  success: boolean;
  data?: CenterManageMeta;
  message?: string;
}> {
  try {
    const url = `${API_BASE_URL}/center-manage/meta`;
    const response = await axiosWithAuth('GET', url);
    const payload = response.data as CenterManageMetaResponse;
    if (payload?.status === 'success' && payload.data) {
      return { success: true, data: normalizeCenterManageMeta(payload.data) };
    }
    return {
      success: false,
      message: payload?.message || 'Failed to load center manage meta',
    };
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return {
      success: false,
      message: err.response?.data?.message || err.message || 'Failed to load center manage meta',
    };
  }
}

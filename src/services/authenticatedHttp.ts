import axios, { AxiosResponse, Method } from 'axios';
import { getStoredToken, refreshAccessToken } from './authApi';
import { buildSignatureHeaders } from './signature';

type AuthAxiosOptions = {
  data?: unknown;
};

/** Throws an axios-like error with status 401 when no access token is stored. */
function throwAuthRequired(): never {
  const err: Error & { response?: { status: number; data: { message: string } } } = new Error(
    'Authentication required',
  );
  err.response = { status: 401, data: { message: 'Authentication required' } };
  throw err;
}

/**
 * Authenticated axios request with one retry after refreshing the access token on 401.
 */
export async function axiosWithAuth(
  method: Method,
  url: string,
  options?: AuthAxiosOptions,
): Promise<AxiosResponse> {
  let token = await getStoredToken();
  if (!token) {
    throwAuthRequired();
  }

  const run = async (accessToken: string): Promise<AxiosResponse> => {
    const signatureHeaders = await buildSignatureHeaders(method, url, options?.data);
    return axios.request({
      method,
      url,
      data: options?.data,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...signatureHeaders,
      },
    });
  };

  try {
    return await run(token);
  } catch (error: unknown) {
    const axErr = error as { response?: { status?: number } };
    if (axErr.response?.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return await run(newToken);
      }
    }
    throw error;
  }
}

import { useState, useCallback } from 'react';
import { productsApi } from '../services/productsApi';

interface UseRecommendationsMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface UseRecommendationsMutationResult {
  mutate: (country: string, outMemberId?: string, beginPage?: number, pageSize?: number, platform?: string) => Promise<void>;
  data: any;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useRecommendationsMutation = (
  options?: UseRecommendationsMutationOptions
): UseRecommendationsMutationResult => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (
    country: string,
    outMemberId?: string,
    beginPage: number = 1,
    pageSize: number = 20,
    platform: string = '1688'
  ) => {
    // Clear previous error state when retrying
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);
    setData(null); // Clear previous data on new request

    try {
      const response = await productsApi.getRecommendations(country, outMemberId, beginPage, pageSize, platform);
      
      if (response.success && response.data) {
        if (__DEV__) {
          // console.log('More to Love Recommendations API Response:', "Success");
        }
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to fetch recommendations';
        // Only log non-network errors or log network errors at debug level
        const isNetworkError = errorMessage.includes('Network error') || errorMessage.includes('connection');
        if (__DEV__) {
          if (isNetworkError) {
            // Network errors are common and expected - log at debug level
            console.debug('[Recommendations] Network error (expected when offline):', errorMessage);
          } else {
            // Other errors are more important - log as warning
            console.warn('[Recommendations] API returned error:', errorMessage);
          }
        }
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An unexpected error occurred. Please try again.';
      // Only log unexpected errors (not network errors which are handled above)
      if (__DEV__ && !errorMessage.includes('Network error') && !errorMessage.includes('connection')) {
        console.error('[Recommendations] API call failed:', err);
      }
      setError(errorMessage);
      setIsError(true);
      options?.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return {
    mutate,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
  };
};


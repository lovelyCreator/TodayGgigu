import { useState, useCallback } from 'react';
import { cartApi, AddToCartRequest } from '../services/cartApi';

interface UseAddToCartMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface UseAddToCartMutationResult {
  /**
   * `lang` is optional and forwarded to `cartApi.addToCart` as the
   * `?lang=` query parameter, mirroring the web client's URL shape.
   * Pass the active i18n locale ('en' | 'ko' | 'zh') when available.
   */
  mutate: (request: AddToCartRequest, lang?: string) => Promise<void>;
  data: any;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useAddToCartMutation = (
  options?: UseAddToCartMutationOptions
): UseAddToCartMutationResult => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (request: AddToCartRequest, lang?: string) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await cartApi.addToCart(request, lang);

      // console.log('useAddToCartMutation: API response:', response);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to add product to cart';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
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


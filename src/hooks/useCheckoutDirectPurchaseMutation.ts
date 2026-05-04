import { useState, useCallback } from 'react';
import { cartApi, DirectPurchaseRequest } from '../services/cartApi';
import { CheckoutResponse } from '../services/cartApi';

interface UseCheckoutDirectPurchaseMutationOptions {
  onSuccess?: (data: CheckoutResponse) => void;
  onError?: (error: string) => void;
}

interface UseCheckoutDirectPurchaseMutationResult {
  mutate: (request: DirectPurchaseRequest) => Promise<void>;
  data: CheckoutResponse | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useCheckoutDirectPurchaseMutation = (
  options?: UseCheckoutDirectPurchaseMutationOptions
): UseCheckoutDirectPurchaseMutationResult => {
  const [data, setData] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (request: DirectPurchaseRequest) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await cartApi.checkoutDirectPurchase(request);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to checkout';
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

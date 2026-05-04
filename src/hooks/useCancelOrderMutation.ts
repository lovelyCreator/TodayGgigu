import { useState, useCallback } from 'react';
import { orderApi } from '../services/orderApi';

interface UseCancelOrderMutationOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useCancelOrderMutation = (options?: UseCancelOrderMutationOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await orderApi.cancelOrder(orderId);

      if (response.success) {
        options?.onSuccess?.();
        return;
      } else {
        const errorMessage = response.error || 'Failed to cancel order';
        setIsError(true);
        setError(errorMessage);
        options?.onError?.(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setIsError(true);
      setError(errorMessage);
      options?.onError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return {
    mutate,
    isLoading,
    isError,
    error,
  };
};

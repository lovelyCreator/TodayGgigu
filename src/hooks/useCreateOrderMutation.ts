import { useState, useCallback } from 'react';
import { orderApi, CreateOrderRequest, OrderResponse } from '../services/orderApi';

interface UseCreateOrderMutationOptions {
  onSuccess?: (data: OrderResponse) => void;
  onError?: (error: string) => void;
}

export const useCreateOrderMutation = (options?: UseCreateOrderMutationOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (request: CreateOrderRequest) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await orderApi.createOrder(request);

      if (response.success && response.data) {
        options?.onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage = response.error || 'Failed to create order';
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


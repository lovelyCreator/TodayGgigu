import { useState, useCallback } from 'react';
import { orderApi, GetOrdersResponse, GetOrdersParams } from '../services/orderApi';

interface UseGetOrdersMutationOptions {
  onSuccess?: (data: GetOrdersResponse) => void;
  onError?: (error: string) => void;
}

export const useGetOrdersMutation = (options?: UseGetOrdersMutationOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (params?: GetOrdersParams | number, pageSize?: number) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await orderApi.getOrders(
        typeof params === 'number' ? params : params,
        typeof params === 'number' ? pageSize : undefined
      );

      if (response.success && response.data) {
        options?.onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage = response.error || 'Failed to get orders';
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


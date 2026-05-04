import { useState, useCallback } from 'react';
import { orderApi, OrderPreviewResponse } from '../services/orderApi';

interface UseOrderPreviewMutationOptions {
  onSuccess?: (data: OrderPreviewResponse) => void;
  onError?: (error: string) => void;
}

export const useOrderPreviewMutation = (options?: UseOrderPreviewMutationOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (body?: Record<string, any>) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await orderApi.getOrderPreview(body);

      if (response.success && response.data) {
        options?.onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage = response.error || 'Failed to get order preview';
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

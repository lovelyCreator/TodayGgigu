import { useState, useCallback } from 'react';
import { productsApi } from '../services/productsApi';

interface UseChildCategoriesMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface UseChildCategoriesMutationResult {
  mutate: (platform: string, parentId: string) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useChildCategoriesMutation = (
  options?: UseChildCategoriesMutationOptions
): UseChildCategoriesMutationResult => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(
    async (platform: string, parentId: string) => {
      setIsLoading(true);
      setIsSuccess(false);
      setIsError(false);
      setError(null);

      try {
        
        const response = await productsApi.getChildCategories(platform, parentId);
        

        if (response.success && response.data) {
          setData(response.data);
          setIsSuccess(true);
          options?.onSuccess?.(response.data);
        } else {
          const errorMessage = response.message || 'Failed to fetch child categories';
          setError(errorMessage);
          setIsError(true);
          options?.onError?.(errorMessage);
        }
      } catch (err: any) {
        const errorMessage =
          'An unexpected error occurred. Please try again.';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return {
    mutate,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
  };
};

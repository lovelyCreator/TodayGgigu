import { useState, useCallback } from 'react';
import { productsApi } from '../services/productsApi';
import { CategoriesTreeResponse } from '../types';

interface UseCategoryTreeMutationOptions {
  onSuccess?: (data: CategoriesTreeResponse) => void;
  onError?: (error: string) => void;
}

interface UseCategoryTreeMutationResult {
  mutate: (platform: string) => Promise<void>;
  data: CategoriesTreeResponse | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useCategoryTreeMutation = (
  options?: UseCategoryTreeMutationOptions
): UseCategoryTreeMutationResult => {
  const [data, setData] = useState<CategoriesTreeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (platform: string) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await productsApi.getCategoryTree(platform);
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to fetch category tree';
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


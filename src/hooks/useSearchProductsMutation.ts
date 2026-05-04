import { useState, useCallback } from 'react';
import { productsApi } from '../services/productsApi';

interface UseSearchProductsMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface UseSearchProductsMutationResult {
  mutate: (
    keyword: string,
    source?: string,
    country?: string,
    page?: number,
    pageSize?: number,
    sort?: string,
    priceStart?: number,
    priceEnd?: number,
    filter?: string,
    requireAuth?: boolean,
    sellerOpenId?: string,
  ) => Promise<void>;
  data: any;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useSearchProductsMutation = (
  options?: UseSearchProductsMutationOptions
): UseSearchProductsMutationResult => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (
    keyword: string,
    source: string = '1688',
    country: string = 'en',
    page: number = 1,
    pageSize: number = 20,
    sort?: string,
    priceStart?: number,
    priceEnd?: number,
    filter?: string,
    requireAuth: boolean = true,
    sellerOpenId?: string,
  ) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await productsApi.searchProductsByKeyword(
        keyword,
        source,
        country,
        page,
        pageSize,
        sort,
        priceStart,
        priceEnd,
        filter,
        requireAuth,
        sellerOpenId,
      );
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to search products';
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


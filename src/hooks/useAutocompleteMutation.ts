import { useState, useCallback } from 'react';
import { productsApi } from '../services/productsApi';

interface AutocompleteData {
  suggestions: string[];
  query: string;
  count: number;
}

interface UseAutocompleteMutationOptions {
  onSuccess?: (data: AutocompleteData) => void;
  onError?: (error: string) => void;
}

interface UseAutocompleteMutationResult {
  mutate: (query: string, limit?: number) => Promise<void>;
  data: AutocompleteData | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useAutocompleteMutation = (
  options?: UseAutocompleteMutationOptions
): UseAutocompleteMutationResult => {
  const [data, setData] = useState<AutocompleteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (query: string, limit: number = 20) => {
    // Don't fetch if query is empty
    if (!query || query.trim().length === 0) {
      setData(null);
      setIsSuccess(false);
      setIsError(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await productsApi.getAutocompleteSuggestions(query, limit);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to fetch autocomplete suggestions';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An unexpected error occurred. Please try again.';
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


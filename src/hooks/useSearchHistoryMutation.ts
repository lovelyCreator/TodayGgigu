import { useState, useCallback } from 'react';
import { getSearchHistory, deleteSearchKeyword, clearSearchHistory, getSearchSuggestions } from '../services/authApi';

interface UseGetSearchHistoryOptions {
  onSuccess?: (data: string[]) => void;
  onError?: (error: string) => void;
}

interface UseGetSearchHistoryResult {
  mutate: () => Promise<void>;
  data: string[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useGetSearchHistory = (
  options?: UseGetSearchHistoryOptions
): UseGetSearchHistoryResult => {
  const [data, setData] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await getSearchHistory();

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to fetch search history';
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

interface UseDeleteSearchKeywordOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseDeleteSearchKeywordResult {
  mutate: (keyword: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useDeleteSearchKeyword = (
  options?: UseDeleteSearchKeywordOptions
): UseDeleteSearchKeywordResult => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (keyword: string) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await deleteSearchKeyword(keyword);

      if (response.success) {
        setIsSuccess(true);
        options?.onSuccess?.();
      } else {
        const errorMessage = response.error || 'Failed to delete search keyword';
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
    error,
    isLoading,
    isSuccess,
    isError,
  };
};

interface UseClearSearchHistoryOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseClearSearchHistoryResult {
  mutate: () => Promise<void>;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useClearSearchHistory = (
  options?: UseClearSearchHistoryOptions
): UseClearSearchHistoryResult => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async () => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await clearSearchHistory();

      if (response.success) {
        setIsSuccess(true);
        options?.onSuccess?.();
      } else {
        const errorMessage = response.error || 'Failed to clear search history';
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
    error,
    isLoading,
    isSuccess,
    isError,
  };
};

interface UseGetSearchSuggestionsOptions {
  onSuccess?: (data: { searchHistory: string[]; keepShoppingFor: { title: string; products: any[] } }) => void;
  onError?: (error: string) => void;
}

interface UseGetSearchSuggestionsResult {
  mutate: (rankType?: string) => Promise<void>;
  data: { searchHistory: string[]; keepShoppingFor: { title: string; products: any[] } } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useGetSearchSuggestions = (
  options?: UseGetSearchSuggestionsOptions
): UseGetSearchSuggestionsResult => {
  const [data, setData] = useState<{ searchHistory: string[]; keepShoppingFor: { title: string; products: any[] } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (rankType: string = 'hot') => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await getSearchSuggestions(rankType);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to fetch search suggestions';
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

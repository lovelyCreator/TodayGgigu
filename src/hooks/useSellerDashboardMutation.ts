import { useCallback, useState } from 'react';
import { sellerApi, SellerDashboardItem, SellerDashboardParams } from '../services/sellerApi';

interface UseSellerDashboardMutationOptions {
  onSuccess?: (data: {
    items: SellerDashboardItem[];
    total: number;
    page: number;
    pageSize: number;
  }) => void;
  onError?: (error: string) => void;
}

interface UseSellerDashboardMutationResult {
  mutate: (params: SellerDashboardParams) => Promise<void>;
  items: SellerDashboardItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
}

export const useSellerDashboardMutation = (
  options?: UseSellerDashboardMutationOptions
): UseSellerDashboardMutationResult => {
  const [items, setItems] = useState<SellerDashboardItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (params: SellerDashboardParams) => {
      const currentPage = params.page ?? 1;
      const currentPageSize = params.pageSize ?? 20;

      if (currentPage === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setIsError(false);
      setIsSuccess(false);
      setError(null);

      try {
        const response = await sellerApi.getSellerDashboard({
          ...params,
          page: currentPage,
          pageSize: currentPageSize,
        });

        if (response.success && response.data) {
          const responseItems = response.data.items || [];
          setItems((prevItems) =>
            currentPage === 1 ? responseItems : [...prevItems, ...responseItems]
          );
          setTotal(response.data.total ?? 0);
          setPage(response.data.page ?? currentPage);
          setPageSize(response.data.pageSize ?? currentPageSize);
          setIsSuccess(true);

          options?.onSuccess?.({
            items: responseItems,
            total: response.data.total ?? 0,
            page: response.data.page ?? currentPage,
            pageSize: response.data.pageSize ?? currentPageSize,
          });
        } else {
          const errorMessage =
            response.message || response.error || 'Failed to fetch seller dashboard.';
          setError(errorMessage);
          setIsError(true);
          options?.onError?.(errorMessage);
        }
      } catch (err: any) {
        const errorMessage = err?.message || 'An unexpected error occurred.';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [options]
  );

  return {
    mutate,
    items,
    total,
    page,
    pageSize,
    isLoading,
    isLoadingMore,
    isSuccess,
    isError,
    error,
  };
};
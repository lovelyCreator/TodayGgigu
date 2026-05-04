import { useState, useCallback } from 'react';
import { productsApi } from '../services/productsApi';

interface UseSellerDetailMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface UseSellerDetailMutationResult {
  mutate: (sellerId: string, options?: { page?: number; pageSize?: number; country?: string; source?: string }) => Promise<void>;
  data: any;
  products: any[];
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isLoadingMore: boolean;
}

export const useSellerDetailMutation = (
  options?: UseSellerDetailMutationOptions
): UseSellerDetailMutationResult => {
  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (
    sellerId: string,
    mutateOptions?: { page?: number; pageSize?: number; country?: string; source?: string }
  ) => {
    const page = mutateOptions?.page || 1;
    const pageSize = mutateOptions?.pageSize || 20;
    const country = mutateOptions?.country || 'en';
    const source = mutateOptions?.source || '1688';

    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      let response;

      if (source === 'taobao') {
        response = await productsApi.getTaobaoSellerProducts(sellerId, {
          page_no: page,
          page_size: pageSize,
          language: country === 'zh' ? 'en' : country,
        });

        if (response.success && response.data) {
          const mappedProducts = response.data.data.map((item: any) => ({
            id: item.item_id?.toString() || '',
            externalId: item.item_id?.toString() || '',
            title: item.multi_language_info?.title || item.title || '',
            image: item.main_image_url || '',
            price: parseFloat(item.price || '0'),
            source: 'taobao',
            mainImageUrl: item.main_image_url || '',
            shopName: item.shop_name || '',
          }));

          if (page > 1) {
            setProducts(prev => [...prev, ...mappedProducts]);
          } else {
            setProducts(mappedProducts);
          }

          setData({
            sellerId,
            source: 'taobao',
            productCount: mappedProducts.length,
            pageSize,
            currentPage: page,
          });

          setIsSuccess(true);
          options?.onSuccess?.({
            products: mappedProducts,
            sellerId,
            source: 'taobao',
          });
        } else {
          const errorMessage = response.message || 'Failed to fetch Taobao seller products';
          setError(errorMessage);
          setIsError(true);
          options?.onError?.(errorMessage);
        }
      } else {
        // Default 1688
        response = await productsApi.get1688SellerProducts(sellerId, {
          beginPage: page,
          pageSize,
          country,
        });

        if (response.success && response.data) {
          const mappedProducts = response.data.products.map((item: any) => ({
            id: item.externalId?.toString() || item.id?.toString() || '',
            externalId: item.externalId?.toString() || item.id?.toString() || '',
            title: item.title || '',
            image: item.image || '',
            price: parseFloat(item.price || '0'),
            originalPrice: parseFloat(item.originalPrice || '0'),
            source: '1688',
            rating: item.rating || 0,
            sales: item.sales || 0,
          }));

          if (page > 1) {
            setProducts(prev => [...prev, ...mappedProducts]);
          } else {
            setProducts(mappedProducts);
          }

          setData({
            sellerId,
            source: '1688',
            pagination: response.data.pagination,
            productCount: mappedProducts.length,
          });

          setIsSuccess(true);
          options?.onSuccess?.({
            products: mappedProducts,
            sellerId,
            source: '1688',
            pagination: response.data.pagination,
          });
        } else {
          const errorMessage = response.message || 'Failed to fetch 1688 seller products';
          setError(errorMessage);
          setIsError(true);
          options?.onError?.(errorMessage);
        }
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
  }, [options]);

  return {
    mutate,
    data,
    products,
    error,
    isLoading,
    isSuccess,
    isError,
    isLoadingMore,
  };
};

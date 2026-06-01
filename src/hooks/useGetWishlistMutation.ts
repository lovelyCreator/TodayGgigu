import { useState, useCallback, useRef, useEffect } from 'react';
import { wishlistApi, WishlistResponse, GetWishlistParams } from '../services/wishlistApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface UseGetWishlistMutationOptions {
  onSuccess?: (data: WishlistResponse) => void;
  onError?: (error: string) => void;
}

interface UseGetWishlistMutationResult {
  mutate: (params?: GetWishlistParams) => Promise<void>;
  data: WishlistResponse | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useGetWishlistMutation = (
  options?: UseGetWishlistMutationOptions
): UseGetWishlistMutationResult => {
  const [data, setData] = useState<WishlistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const onSuccessRef = useRef(options?.onSuccess);
  const onErrorRef = useRef(options?.onError);
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
    onErrorRef.current = options?.onError;
  });

  const mutate = useCallback(async (params?: GetWishlistParams) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await wishlistApi.getWishlist(params);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        
        const wishlistItems = Array.isArray(response.data.wishlist)
          ? response.data.wishlist
          : Array.isArray(response.data.wishlistByStore)
            ? response.data.wishlistByStore.flatMap((group) => group.items || [])
            : [];
        if (wishlistItems.length > 0) {
          const externalIds = wishlistItems
            .map((item: any) => item.externalId?.toString() || '')
            .filter(Boolean);
          await AsyncStorage.setItem(
            STORAGE_KEYS.WISHLIST_EXTERNAL_IDS,
            JSON.stringify(externalIds),
          );
        }
        
        onSuccessRef.current?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to fetch wishlist';
        setError(errorMessage);
        setIsError(true);
        onErrorRef.current?.(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setIsError(true);
      onErrorRef.current?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
  };
};


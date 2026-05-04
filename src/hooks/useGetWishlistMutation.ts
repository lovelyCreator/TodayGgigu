import { useState, useCallback } from 'react';
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
        
        // Update external IDs in AsyncStorage
        if (response.data.wishlist && Array.isArray(response.data.wishlist)) {
          const externalIds = response.data.wishlist.map((item: any) => item.externalId?.toString() || '').filter(Boolean);
          await AsyncStorage.setItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS, JSON.stringify(externalIds));
        }
        
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to fetch wishlist';
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


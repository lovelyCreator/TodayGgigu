import { useState, useCallback } from 'react';
import { wishlistApi } from '../services/wishlistApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface UseDeleteFromWishlistMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface UseDeleteFromWishlistMutationResult {
  mutate: (wishlistId: string) => Promise<void>;
  data: any;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useDeleteFromWishlistMutation = (
  options?: UseDeleteFromWishlistMutationOptions
): UseDeleteFromWishlistMutationResult => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (wishlistId: string) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await wishlistApi.deleteFromWishlist(wishlistId);

      if (response.success) {
        setData(response.data);
        setIsSuccess(true);

        // Update AsyncStorage if response includes updated wishlist; otherwise caller should refetch
        if (response.data?.wishlist && Array.isArray(response.data.wishlist)) {
          const externalIds = response.data.wishlist.map((item: any) => item.externalId?.toString() || '').filter(Boolean);
          await AsyncStorage.setItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS, JSON.stringify(externalIds));
        }

        options?.onSuccess?.(response.data);
      } else {
        // If response is not successful, treat as error
        const errorMessage = response.message || 'Failed to remove product from wishlist';
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


import { useState, useCallback } from 'react';
import { wishlistApi, AddToWishlistRequest } from '../services/wishlistApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface UseAddToWishlistMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface UseAddToWishlistMutationResult {
  mutate: (request: AddToWishlistRequest) => Promise<void>;
  data: any;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useAddToWishlistMutation = (
  options?: UseAddToWishlistMutationOptions
): UseAddToWishlistMutationResult => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (request: AddToWishlistRequest) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await wishlistApi.addToWishlist(request);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);

        // Add the new item's externalId to AsyncStorage so wishlist heart state stays in sync
        const wishlistItem = response.data.wishlistItem;
        if (wishlistItem?.externalId) {
          const currentIds = await AsyncStorage.getItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS);
          let existingIds: string[] = [];
          if (currentIds) {
            const parsed = JSON.parse(currentIds);
            existingIds = Array.isArray(parsed) ? parsed.map((id: any) => id?.toString() || '').filter(Boolean) : [];
          }
          const newId = wishlistItem.externalId.toString();
          if (!existingIds.includes(newId)) {
            existingIds.push(newId);
            await AsyncStorage.setItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS, JSON.stringify(existingIds));
          }
        }

        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to add product to wishlist';
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


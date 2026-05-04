import { useState, useCallback } from 'react';
import { addressApi, AddressesResponse } from '../services/addressApi';
import { useGetProfileMutation } from './useGetProfileMutation';

interface UseDeleteAddressMutationOptions {
  onSuccess?: (data: AddressesResponse) => void;
  onError?: (error: string) => void;
}

interface UseDeleteAddressMutationResult {
  mutate: (addressId: string) => Promise<void>;
  data: AddressesResponse | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useDeleteAddressMutation = (
  options?: UseDeleteAddressMutationOptions
): UseDeleteAddressMutationResult => {
  const [data, setData] = useState<AddressesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const { mutate: fetchProfile } = useGetProfileMutation();

  const mutate = useCallback(async (addressId: string) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await addressApi.deleteAddress(addressId);

      // console.log('useDeleteAddressMutation: API response:', response);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        
        // Refresh user profile to get updated addresses
        fetchProfile();
        
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to delete address';
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
  }, [options, fetchProfile]);

  return {
    mutate,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
  };
};


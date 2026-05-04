import { useState, useCallback } from 'react';
import { addressApi, AddressesResponse } from '../services/addressApi';

interface UseGetAddressesMutationOptions {
  onSuccess?: (data: AddressesResponse) => void;
  onError?: (error: string) => void;
}

interface UseGetAddressesMutationResult {
  mutate: () => Promise<void>;
  data: AddressesResponse | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useGetAddressesMutation = (
  options?: UseGetAddressesMutationOptions
): UseGetAddressesMutationResult => {
  const [data, setData] = useState<AddressesResponse | null>(null);
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
      const response = await addressApi.getAddresses();

      // console.log('useGetAddressesMutation: API response:', response);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to get addresses';
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


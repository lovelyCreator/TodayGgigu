import { useCallback, useState } from 'react';
import { sellerApi, SellerDirectTeamResponse } from '../services/sellerApi';

interface UseSellerDirectTeamMutationOptions {
  onSuccess?: (data: SellerDirectTeamResponse) => void;
  onError?: (error: string) => void;
}

interface UseSellerDirectTeamMutationResult {
  mutate: () => Promise<void>;
  data: SellerDirectTeamResponse | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useSellerDirectTeamMutation = (
  options?: UseSellerDirectTeamMutationOptions
): UseSellerDirectTeamMutationResult => {
  const [data, setData] = useState<SellerDirectTeamResponse | null>(null);
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
      const response = await sellerApi.getSellerDirectTeam();

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.message || 'Failed to load seller direct team.';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'An unexpected error occurred while loading the seller direct team.';
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

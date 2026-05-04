import { useCallback, useState } from 'react';
import {
  sellerApi,
  SellerDashboardSummary,
  SellerDashboardSummaryResponseData,
  SellerDashboardParams,
  SellerDirectTeamMember,
} from '../services/sellerApi';

interface UseSellerDashboardSummaryMutationOptions {
  onSuccess?: (data: {
    summary: SellerDashboardSummary;
    directTeam: SellerDirectTeamMember[];
  }) => void;
  onError?: (error: string) => void;
}

interface UseSellerDashboardSummaryMutationResult {
  mutate: (params?: SellerDashboardParams) => Promise<void>;
  summary: SellerDashboardSummary | null;
  directTeam: SellerDirectTeamMember[];
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
}

export const useSellerDashboardSummaryMutation = (
  options?: UseSellerDashboardSummaryMutationOptions
): UseSellerDashboardSummaryMutationResult => {
  const [summary, setSummary] = useState<SellerDashboardSummary | null>(null);
  const [directTeam, setDirectTeam] = useState<SellerDirectTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (params?: SellerDashboardParams) => {
      setIsLoading(true);
      setIsError(false);
      setIsSuccess(false);
      setError(null);

      try {
        const response = await sellerApi.getSellerDashboardSummary(params);

        if (response.success && response.data) {
          setSummary(response.data.summary);
          setDirectTeam(response.data.directTeam || []);
          setIsSuccess(true);

          options?.onSuccess?.({
            summary: response.data.summary,
            directTeam: response.data.directTeam || [],
          });
        } else {
          const errorMessage = response.message || response.error || 'Failed to load seller dashboard summary.';
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
      }
    },
    [options]
  );

  return {
    mutate,
    summary,
    directTeam,
    isLoading,
    isSuccess,
    isError,
    error,
  };
};

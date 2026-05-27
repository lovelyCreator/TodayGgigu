import { useState, useCallback } from 'react';
import { getProfile, GetProfileResponse, mapProfileApiUserToUser, storeAuthData, getStoredToken } from '../services/authApi';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface UseGetProfileMutationOptions {
  onSuccess?: (data: GetProfileResponse['data']) => void;
  onError?: (error: string) => void;
}

interface UseGetProfileMutationResult {
  mutate: () => Promise<void>;
  data: GetProfileResponse['data'] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useGetProfileMutation = (
  options?: UseGetProfileMutationOptions
): UseGetProfileMutationResult => {
  const [data, setData] = useState<GetProfileResponse['data'] | null>(null);
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
      const response = await getProfile();

      if (__DEV__) {
        console.log('useGetProfileMutation: profile loaded');
      }

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        
        if (response.data.user) {
          const existingUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
          let existingUser: Partial<User> = {};
          if (existingUserData) {
            existingUser = JSON.parse(existingUserData);
          }

          const updatedUser = mapProfileApiUserToUser(response.data.user, existingUser);
          const token = response.data.token || (await getStoredToken()) || '';
          if (token) {
            await storeAuthData(token, updatedUser);
          } else {
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
          }
        }
        
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to get profile';
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


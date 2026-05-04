import { useState, useCallback } from 'react';
import { updateProfile, UpdateProfileRequest, UpdateProfileResponse } from '../services/authApi';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { storeAuthData } from '../services/authApi';
import { useAuth } from '../context/AuthContext';

interface UseUpdateProfileMutationOptions {
  onSuccess?: (data: UpdateProfileResponse['data']) => void;
  onError?: (error: string) => void;
}

interface UseUpdateProfileMutationResult {
  mutate: (request: UpdateProfileRequest) => Promise<void>;
  data: UpdateProfileResponse['data'] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useUpdateProfileMutation = (
  options?: UseUpdateProfileMutationOptions
): UseUpdateProfileMutationResult => {
  const [data, setData] = useState<UpdateProfileResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const { updateUser: updateUserContext } = useAuth();

  const mutate = useCallback(async (request: UpdateProfileRequest) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await updateProfile(request);

      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        
        // Update user data in AsyncStorage
        if (response.data.user) {
          const user = response.data.user;
          
          // Get existing user data to preserve fields not in response
          const existingUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
          let existingUser: Partial<User> = {};
          if (existingUserData) {
            existingUser = JSON.parse(existingUserData);
          }
          
          // Map response to User type
          const updatedUser: Partial<User> = {
            ...existingUser,
            id: user._id || user.user_id || existingUser.id || '',
            memberId: user.userUniqueId || user.user_id || existingUser.memberId,
            email: user.email || existingUser.email || '',
            name: user.userName || user.user_id || existingUser.name || '',
            phone: user.phone || existingUser.phone || '',
            birthday: user.birthday || existingUser.birthday,
            gender: user.gender || existingUser.gender,
            avatar: user.pictureUrl || existingUser.avatar,
            addresses: user.addresses || existingUser.addresses || [],
            wishlist: user.wishlist || existingUser.wishlist || [],
            userName: user.userName || existingUser.userName,
            userUniqueId: user.userUniqueId || existingUser.userUniqueId,
            updatedAt: new Date(),
          };
          
          // Store updated user data
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
          
          // Update user context to reflect changes immediately
          await updateUserContext(updatedUser);
          
          // Also update external IDs if wishlist changed
          if (user.wishlist && Array.isArray(user.wishlist)) {
            // Note: wishlist in response is array of _id strings, not externalIds
            // We need to get externalIds from the actual wishlist items if needed
            // For now, we'll keep the existing externalIds in AsyncStorage
          }
        }
        
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to update profile';
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


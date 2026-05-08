import { useState, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, changePassword as apiChangePassword } from '../services/authApi';
import { User, AuthUseMutationOptions, LoginVariables, RegisterVariables, GuestLoginVariables, UseLoginMutationResult, UseRegisterMutationResult, useGuestLoginMutationResult } from '../types';

// Frontend-only and guest login APIs removed - stub functions
const loginFrontendOnly = async (_users_id: string, _password: string) => {
  return { success: false, data: null, error: 'Frontend-only login API removed', errorCode: undefined };
};
const registerFrontendOnly = async (_data: any) => {
  return { success: false, data: null, error: 'Frontend-only register API removed', errorCode: undefined };
};
const apiGuestLogin = async (_fcm_token: string) => {
  return { success: false, data: null, error: 'Guest login API removed', errorCode: undefined };
};

// Flag to switch between frontend-only and backend modes
const USE_FRONTEND_ONLY = false; // Set to false when backend is ready

// Add the change password mutation result type
interface UseChangePasswordMutationResult {
  mutate: (variables: { currentPassword: string; newPassword: string }) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useLoginMutation = (options?: AuthUseMutationOptions): UseLoginMutationResult => {
  const [data, setData] = useState<{ token: string; user: Partial<User> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: LoginVariables) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      // Use frontend-only or backend API based on flag
      const response = USE_FRONTEND_ONLY
        ? await loginFrontendOnly(variables.users_id, variables.password)
        : await apiLogin(variables.users_id, variables.password, variables.email);
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Login failed';
        const errorCode = response.errorCode;
        console.log('🔴 LOGIN ERROR in useLoginMutation:', { errorMessage, errorCode });
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage, errorCode);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      console.log('🔴 LOGIN ERROR in useLoginMutation catch:', { errorMessage });
      setError(errorMessage);
      setIsError(true);
      options?.onError?.(errorMessage, undefined);
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

export const useRegisterMutation = (options?: AuthUseMutationOptions): UseRegisterMutationResult => {
  const [data, setData] = useState<{ token: string; user: Partial<User> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: RegisterVariables) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      // Use frontend-only or backend API based on flag
      // const response = USE_FRONTEND_ONLY
      //   ? await registerFrontendOnly(
      //       variables.email,
      //       variables.password,
      //       variables.name,
      //       variables.gender
      //     )
      //   : await apiRegister(
      //       variables.email,
      //       variables.password,
      //       variables.name,
      //       variables.gender
      //     );
      const response = await apiRegister(
        variables.email,
        variables.password,
        variables.name,
        variables.phone,
        variables.isBusiness,
        variables.referralCode,
        variables.user_id,
        variables.isSeller,
        variables.businessRegistrationImage
      );
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Registration failed';
        const errorCode = response.errorCode;
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage, errorCode);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setIsError(true);
      options?.onError?.(errorMessage, undefined);
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

export const useGustLoginMutation = (options?: AuthUseMutationOptions): useGuestLoginMutationResult => {
  const [data, setData] = useState<{ guest_id: number; } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: GuestLoginVariables) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      // Use frontend-only or backend API based on flag
      const response = await apiGuestLogin(
        variables.fcm_token
      );
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Guest login failed';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err) {
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

// Add the change password mutation hook
export const useChangePasswordMutation = (options?: AuthUseMutationOptions): UseChangePasswordMutationResult => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: { currentPassword: string; newPassword: string }) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const response = await apiChangePassword(
        variables.currentPassword,
        variables.newPassword
      );
      
      if (response.success) {
        setData({ message: response.message || 'Password changed successfully' });
        setIsSuccess(true);
        options?.onSuccess?.({ message: response.message || 'Password changed successfully' });
      } else {
        const errorMessage = response.error || 'Failed to change password';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err) {
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


// Verify Email Mutation
export const useVerifyEmailMutation = (options?: AuthUseMutationOptions & { useSignupCode?: boolean }) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: { email: string; code: string; verified?: boolean }) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const { verifyEmail, verifySignupCode, verifySigninCode } = require('../services/authApi');
      // Use verify-signup-code if verified is false, verify-signin-code if verified is true, otherwise use verify-email
      let response;
      if (variables.verified === false || options?.useSignupCode) {
        response = await verifySignupCode(variables.email, variables.code);
      } else if (variables.verified === true) {
        response = await verifySigninCode(variables.email, variables.code);
      } else {
        response = await verifyEmail(variables.email, variables.code);
      }
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Verification failed';
        const errorCode = response.errorCode;
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage, errorCode);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      setIsError(true);
      options?.onError?.(errorMessage, undefined);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return { mutate, data, error, isLoading, isSuccess, isError };
};

// Resend Verification Code Mutation
export const useResendVerificationMutation = (options?: AuthUseMutationOptions) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: { email: string }) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const { resendVerificationCode } = require('../services/authApi');
      const response = await resendVerificationCode(variables.email);
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to resend code';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      setIsError(true);
      options?.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return { mutate, data, error, isLoading, isSuccess, isError };
};

// Forgot Password Mutation
export const useForgotPasswordMutation = (options?: AuthUseMutationOptions) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: { email: string }) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const { forgotPassword } = require('../services/authApi');
      const response = await forgotPassword(variables.email);
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to send reset link';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      setIsError(true);
      options?.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return { mutate, data, error, isLoading, isSuccess, isError };
};

// Reset Password Mutation
export const useResetPasswordMutation = (options?: AuthUseMutationOptions) => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: { email: string; code: string; password: string }) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const { resetPassword } = require('../services/authApi');
      const response = await resetPassword(variables.email, variables.code, variables.password);
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Failed to reset password';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      setIsError(true);
      options?.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return { mutate, data, error, isLoading, isSuccess, isError };
};

// Social Login Mutation
export const useSocialLoginMutation = (options?: AuthUseMutationOptions) => {
  const [data, setData] = useState<{ token: string; refreshToken: string; user: Partial<User> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (provider: 'google' | 'facebook' | 'apple' | 'twitter' | 'kakao') => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const { signInWithGoogle, signInWithFacebook, signInWithApple, signInWithTwitter, signInWithKakao } = require('../services/socialAuth');
      
      let response;
      switch (provider) {
        case 'google':
          response = await signInWithGoogle();
          break;
        case 'facebook':
          response = await signInWithFacebook();
          break;
        case 'apple':
          response = await signInWithApple();
          break;
        case 'twitter':
          response = await signInWithTwitter();
          break;
        case 'kakao':
          response = await signInWithKakao();
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      if (response.success && response.data) {
        setData(response.data);
        setIsSuccess(true);
        options?.onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || 'Social login failed';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setIsError(true);
      options?.onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  return { mutate, data, error, isLoading, isSuccess, isError };
};

// Email Update Mutations
interface UseRequestEmailUpdateMutationResult {
  mutate: (variables: { newEmail: string }) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useRequestEmailUpdateMutation = (options?: AuthUseMutationOptions): UseRequestEmailUpdateMutationResult => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: { newEmail: string }) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const { requestEmailUpdate } = require('../services/authApi');
      const response = await requestEmailUpdate(variables.newEmail);
      
      if (response.success) {
        setData({ message: response.message || 'Verification code sent to email', data: response.data });
        setIsSuccess(true);
        options?.onSuccess?.({ message: response.message || 'Verification code sent to email', data: response.data });
      } else {
        const errorMessage = response.error || 'Failed to request email update';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err) {
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

interface UseConfirmEmailUpdateMutationResult {
  mutate: (variables: { code: string }) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export const useConfirmEmailUpdateMutation = (options?: AuthUseMutationOptions): UseConfirmEmailUpdateMutationResult => {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const mutate = useCallback(async (variables: { code: string }) => {
    setIsLoading(true);
    setIsSuccess(false);
    setIsError(false);
    setError(null);

    try {
      const { confirmEmailUpdate } = require('../services/authApi');
      const response = await confirmEmailUpdate(variables.code);
      
      if (response.success) {
        setData({ message: response.message || 'Email updated successfully', data: response.data });
        setIsSuccess(true);
        options?.onSuccess?.({ message: response.message || 'Email updated successfully', data: response.data });
      } else {
        const errorMessage = response.error || 'Failed to confirm email update';
        setError(errorMessage);
        setIsError(true);
        options?.onError?.(errorMessage);
      }
    } catch (err) {
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

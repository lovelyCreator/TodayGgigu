import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { STORAGE_KEYS } from '../constants';
import { getStoredToken, getStoredUserData, clearAuthData, getProfile } from '../services/authApi';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginError: string | null;
  signupError: string | null;
  isGuest: boolean;
  shouldNavigateToProfile: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: { email: string; password: string; name: string; gender: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  clearError: () => void;
  clearLoginError: () => void;
  clearSignupError: () => void;
  socialLogin: (provider: string, token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  clearNavigateToProfile: () => void;
  setAuthenticatedUser: (user: User) => void; // New function to set authenticated user directly
  setNavigateToProfile: () => void; // Add the new function
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGIN_FAILURE'; payload: string }
  | { type: 'AUTH_SIGNUP_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_CLEAR_LOGIN_ERROR' }
  | { type: 'AUTH_CLEAR_SIGNUP_ERROR' }
  | { type: 'AUTH_UPDATE_USER'; payload: Partial<User> }
  | { type: 'AUTH_LOGIN_SUCCESS'; payload: User }
  | { type: 'CLEAR_NAVIGATE_TO_PROFILE' }
  | { type: 'SET_NAVIGATE_TO_PROFILE' }; // Add the new action type

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to show splash screen
  error: null,
  loginError: null,
  signupError: null,
  isGuest: true, // Start in guest mode
  shouldNavigateToProfile: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  // console.log('AuthContext: Reducer called with action:', action.type, 'current state:', state);
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        loginError: null,
        signupError: null,
      };
    case 'AUTH_LOGIN_SUCCESS':
      // console.log('AuthContext: AUTH_LOGIN_SUCCESS dispatched with user:', action.payload);
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
        error: null,
        loginError: null,
        signupError: null,
        shouldNavigateToProfile: false, // Don't automatically navigate to profile
      };
    case 'AUTH_SUCCESS':
      // console.log('AuthContext: AUTH_SUCCESS dispatched with user:', action.payload);
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isGuest: false,
        isLoading: false,
        error: null,
        loginError: null,
        signupError: null,
        shouldNavigateToProfile: false, // Don't automatically navigate to profile
      };
    case 'CLEAR_NAVIGATE_TO_PROFILE':
      return {
        ...state,
        shouldNavigateToProfile: false,
      };
    case 'SET_NAVIGATE_TO_PROFILE': // Add the new case
      return {
        ...state,
        shouldNavigateToProfile: true,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isGuest: true,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGIN_FAILURE':
      // console.log('AuthContext: AUTH_LOGIN_FAILURE dispatched with:', action.payload);
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isGuest: true,
        isLoading: false,
        loginError: action.payload,
      };
    case 'AUTH_SIGNUP_FAILURE':
      // console.log('AuthContext: AUTH_SIGNUP_FAILURE dispatched with:', action.payload);
      // console.log('AuthContext: AUTH_SIGNUP_FAILURE call stack:', new Error().stack);
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isGuest: true,
        isLoading: false,
        signupError: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isGuest: true,
        isLoading: false,
        error: null,
        loginError: null,
        signupError: null,
        shouldNavigateToProfile: false,
      };
    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'AUTH_CLEAR_LOGIN_ERROR':
      return {
        ...state,
        loginError: null,
      };
    case 'AUTH_CLEAR_SIGNUP_ERROR':
      return {
        ...state,
        signupError: null,
      };
    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    // This is a more specific check - only return default context if context is explicitly null
    // This helps distinguish between "not wrapped in provider" and "provider value is undefined"
    // console.warn('useAuth must be used within an AuthProvider. Returning default context.');
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading true to show splash screen
      error: null,
      loginError: null,
      signupError: null,
      isGuest: true,
      shouldNavigateToProfile: false,
      login: async () => {},
      signup: async () => {},
      logout: async () => {},
      updateUser: async () => {},
      clearError: () => {},
      clearLoginError: () => {},
      clearSignupError: () => {},
      socialLogin: async () => {},
      forgotPassword: async () => {},
      resetPassword: async () => {},
      clearNavigateToProfile: () => {},
      setNavigateToProfile: () => {}, // Add the new function
      setAuthenticatedUser: () => {},
    };
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Log state changes - but only when specific properties change to avoid infinite loops
  // useEffect(() => {
  //   console.log('AuthContext: State changed to:', {
  //     isAuthenticated: state.isAuthenticated,
  //     isLoading: state.isLoading,
  //     isGuest: state.isGuest,
  //     user: state.user ? 'user exists' : 'no user'
  //   });
  // }, [state.isAuthenticated, state.isLoading, state.isGuest, state.user]);
  
  // console.log('AuthProvider: Rendering with state:', {
  //   isAuthenticated: state.isAuthenticated,
  //   isLoading: state.isLoading,
  //   isGuest: state.isGuest
  // });

  // Load user data on app start
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        const userData = await getStoredUserData();
        if (userData) {
          // Validate the token against the server before trusting it
          const profileResult = await getProfile();
          if (profileResult.success) {
            dispatch({ type: 'AUTH_SUCCESS', payload: userData });
            return;
          } else if (profileResult.statusCode === 401 || profileResult.statusCode === 403) {
            // Token is expired or invalid — clear stored data and go to guest mode
            await clearAuthData();
            dispatch({ type: 'AUTH_LOGOUT' });
            return;
          } else {
            // Network error or other server issue — trust the cached data so offline users stay logged in
            dispatch({ type: 'AUTH_SUCCESS', payload: userData });
            return;
          }
        }
      }

      // No token or user data — start in guest mode
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const login = async (email: string, password: string) => {
    // This function is now primarily for backward compatibility
    // The actual API call is handled by the useLoginMutation hook
    // But we still need to update the context state when login succeeds
    dispatch({ type: 'AUTH_START' });
    // In a real implementation, this would be replaced by the hook calling the API
    // For now, we'll simulate the success with proper defaults
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock user data with defaults
      const user: User = {
        id: email, // Use email as ID
        email: email,
        name: email.split('@')[0] || 'User', // Use email prefix as name
        avatar: require('../assets/images/avatar.png'), // Default avatar from assets
        phone: '',
        birthday: '',
        addresses: [],
        paymentMethods: [],
        wishlist: [],
        followersCount: 0, // Default followers count
        followingsCount: 0, // Default followings count
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: true,
          },
          language: 'en',
          currency: 'USD',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'AUTH_LOGIN_FAILURE', payload: 'Login failed. Please try again.' });
    }
  };

  const signup = async (userData: { email: string; password: string; name: string; gender: string }) => {
    // This function is now primarily for backward compatibility
    // The actual API call is handled by the useRegisterMutation hook
    // But we still need to update the context state when signup succeeds
    dispatch({ type: 'AUTH_START' });
    // In a real implementation, this would be replaced by the hook calling the API
    // For now, we'll simulate the success with proper defaults
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock user data with defaults
      const user: User = {
        id: userData.email, // Use email as ID
        email: userData.email,
        name: userData.name || userData.email.split('@')[0] || 'User', // Use provided name or email prefix
        avatar: require('../assets/images/avatar.png'), // Default avatar from assets
        phone: '',
        birthday: '',
        addresses: [],
        paymentMethods: [],
        wishlist: [],
        followersCount: 0, // Default followers count
        followingsCount: 0, // Default followings count
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: true,
          },
          language: 'en',
          currency: 'USD',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'AUTH_SIGNUP_FAILURE', payload: 'Registration failed. Please try again.' });
    }
  };

  const logout = async () => {
    try {
      await clearAuthData();
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      // console.error('Error during logout:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      if (state.user) {
        const updatedUser = { ...state.user, ...userData, updatedAt: new Date() };
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
        dispatch({ type: 'AUTH_UPDATE_USER', payload: userData });
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to update profile.' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  };

  const clearLoginError = () => {
    dispatch({ type: 'AUTH_CLEAR_LOGIN_ERROR' });
  };

  const clearSignupError = () => {
    dispatch({ type: 'AUTH_CLEAR_SIGNUP_ERROR' });
  };

  const clearNavigateToProfile = () => {
    dispatch({ type: 'CLEAR_NAVIGATE_TO_PROFILE' });
  };

  const setNavigateToProfile = () => {
    dispatch({ type: 'SET_NAVIGATE_TO_PROFILE' });
  };

  // New function to set authenticated user directly
  const setAuthenticatedUser = (user: User) => {
    // console.log('AuthContext: Setting authenticated user:', user);
    
    // Ensure default values for user properties
    const userWithDefaults: User & { depositBalance?: number; points?: number } = {
      id: user.id || user.email || Date.now().toString(), // Use email or timestamp as ID if not provided
      email: user.email || '',
      name: user.name || user.email?.split('@')[0] || 'User', // Use email prefix or 'User' as name
      avatar: user.avatar || require('../assets/images/avatar.png'), // Default avatar from assets
      phone: user.phone || '',
      birthday: user.birthday || '',
      gender: (user as any).gender || undefined,
      addresses: user.addresses || [],
      paymentMethods: user.paymentMethods || [],
      wishlist: user.wishlist || [],
      followersCount: user.followersCount || 0, // Default followers count is 0
      followingsCount: user.followingsCount || 0, // Default followings count is 0
      depositBalance: (user as any).depositBalance ?? 0, // Preserve depositBalance
      points: (user as any).points ?? 0, // Preserve points
      level: (user as any).level || undefined,
      referredCount: (user as any).referredCount ?? 0,
      userUniqueId: (user as any).userUniqueId || undefined,
      userUniqueNo: (user as any).userUniqueNo || undefined,
      userName: (user as any).userName || undefined,
      notes: (user as any).notes || undefined,
      searchKeywords: (user as any).searchKeywords || [],
      googleId: (user as any).googleId || undefined,
      isBusiness: (user as any).isBusiness || false,
      isEmailVerified: (user as any).isEmailVerified || false,
      authProvider: (user as any).authProvider || 'local',
      referralCode: (user as any).referralCode || undefined,
      lastLogin: (user as any).lastLogin || undefined,
      referredBy: (user as any).referredBy || undefined,
      preferences: user.preferences || {
        notifications: {
          email: true,
          push: true,
          sms: true,
        },
        language: 'en',
        currency: 'USD',
      },
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    };
    
    // Store user data in AsyncStorage
    AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userWithDefaults))
      .then(() => {
        // console.log('AuthContext: User data stored successfully');
      })
      .catch((error) => {
        // console.error('AuthContext: Error storing user data:', error);
      });
    
    dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: userWithDefaults });
  };

  const socialLogin = async (provider: string, token: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data with defaults
      const userEmail = 'user@example.com';
      const user: User = {
        id: userEmail, // Use email as ID
        email: userEmail,
        name: 'User', // Default username
        avatar: require('../assets/images/avatar.png'), // Default avatar from assets
        phone: '',
        birthday: '',
        addresses: [],
        paymentMethods: [],
        wishlist: [],
        followersCount: 0, // Default followers count
        followingsCount: 0, // Default followings count
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: true,
          },
          language: 'en',
          currency: 'USD',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Store user data and token
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
      
      dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Social login failed. Please try again.' });
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      dispatch({ type: 'AUTH_CLEAR_ERROR' });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to send reset email.' });
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      dispatch({ type: 'AUTH_CLEAR_ERROR' });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to reset password.' });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    updateUser,
    clearError,
    clearLoginError,
    clearSignupError,
    socialLogin,
    forgotPassword,
    resetPassword,
    clearNavigateToProfile,
    setNavigateToProfile, // Add the new function
    setAuthenticatedUser,
  };

  // console.log('AuthProvider: Providing context value:', {
  //   isAuthenticated: value.isAuthenticated,
  //   isGuest: value.isGuest,
  //   user: value.user ? 'user exists' : 'no user',
  //   isLoading: value.isLoading
  // });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { User, Address, AuthResponse, GuestResponse, LoginRequest, RegisterRequest, GustLoginRequest } from '../types';
import axios, { AxiosError } from 'axios';

import { API_BASE_URL, SERVER_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';
import { head } from 'lodash';

// console.log('🌐 API Base URL:', API_BASE_URL);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
  },
  timeout: 10000, // 10 second timeout
})

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    // console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    // console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    // console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      // console.error('⏱️ Request Timeout:', error.config?.url);
    } else if (error.code === 'ERR_NETWORK') {
      // console.error('🔌 Network Error - Cannot reach server:', error.config?.url);
      // console.error('   Make sure backend is running and accessible from emulator');
    } else {
      // console.error('❌ API Error:', error.response?.status, error.message);
    }
    return Promise.reject(error);
  }
);

// In-memory storage for frontend-only mode with pre-configured test users
let frontendUsers: { [key: string]: { password: string; user: Partial<User> } } = {
  'test@example.com': {
    password: 'password123',
    user: {
      id: 'user_test_1',
      email: 'test@example.com',
      name: 'Test User',
      avatar: 'https://via.placeholder.com/150',
      phone: '+1234567890',
      addresses: [],
      paymentMethods: [],
      wishlist: [],
      followersCount: 150,
      followingsCount: 89,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: true,
        },
        language: 'en',
        currency: 'USD',
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    },
  },
  'demo@example.com': {
    password: 'Demo123!',
    user: {
      id: 'user_demo_1',
      email: 'demo@example.com',
      name: 'Demo User',
      avatar: 'https://via.placeholder.com/150',
      phone: '+1234567891',
      addresses: [],
      paymentMethods: [],
      wishlist: [],
      followersCount: 250,
      followingsCount: 120,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: true,
        },
        language: 'en',
        currency: 'USD',
      },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date(),
    },
  },
};

// Helper function to store user data and token
export const storeAuthData = async (token: string, userData: Partial<User>) => {
  try {
    // console.log('Storing token:', token ? 'Token provided' : 'No token provided');
    // console.log('Storing user data:', userData);
    
    // Store the token
    await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
    
    // Store user data
    const userString = JSON.stringify(userData);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, userString);
    // console.log("Store Datas Success!");
    return true;
  } catch (error) {
    // console.error('Error storing auth data:', error);
    return false;
  }
};

// Helper function to clear auth data
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.WISHLIST_EXTERNAL_IDS, // Clear wishlist external IDs on logout
    ]);
    // console.log('Cleared auth data including wishlist external IDs');
    return true;
  } catch (error) {
    // console.error('Error clearing auth data:', error);
    return false;
  }
};

// Login API (backend)
export const login = async (users_id: string, password: string, email?: string): Promise<{ success: boolean; data?: any; error?: string; errorCode?: string }> => {
  try {
    const trimmedUsersId = users_id.trim();
    const trimmedEmailArg = email?.trim() ?? '';
    // Register stores `users_id` as optional handle or display name — not the email (see register()).
    // If we send the same string as `users_id`, the API resolves the user by handle first and returns
    // USER_NOT_REGISTERED. For email login, send only `email` + `password`.
    const emailForLogin =
      trimmedEmailArg || (trimmedUsersId.includes('@') ? trimmedUsersId : '');
    const useEmailLogin = emailForLogin.length > 0;

    const requestBody: { password: string; users_id?: string; email?: string } = {
      password,
    };
    if (useEmailLogin) {
      requestBody.email = emailForLogin;
    } else {
      requestBody.users_id = trimmedUsersId;
    }
    console.log("Login Request Body", requestBody);
    
    const url = `${API_BASE_URL}/auth/login`;
    console.log("Login Request URL", url);
    const signatureHeaders = await buildSignatureHeaders('POST', url, requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...signatureHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Login Response Status:", response);
    
    // Get response text first to check if it's JSON
    const responseText = await response.text();
    console.log("Login Response Text:", responseText.substring(0, 200));
    
    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Login Response", responseData);
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
      return {
        success: false,
        error: 'Invalid response from server. Please check your network connection.',
      };
    }

    // Handle error responses (401, 422, etc.)
    if (!response.ok) {
      const errorCode = responseData?.errorCode;
      let errorMessage = responseData?.message || responseData?.error || `Request failed with status ${response.status}`;
      
      // Map errorCode to user-friendly messages
      switch (errorCode) {
        case 'EMAIL_NOT_VERIFIED':
          errorMessage = 'Please verify your email before logging in. Check your inbox for the verification link.';
          break;
        case 'INVALID_CREDENTIALS':
          errorMessage = 'Invalid email or password. Please try again.';
          break;
        case 'VALIDATION_ERROR':
          // Try to parse validation errors
          try {
            // Check if message is already a string that looks like JSON
            let validationErrors;
            if (typeof responseData.message === 'string') {
              // Try to parse the string as JSON
              validationErrors = JSON.parse(responseData.message);
            } else {
              validationErrors = responseData.message;
            }
            
            // Handle array of validation errors
            if (Array.isArray(validationErrors) && validationErrors.length > 0) {
              const firstError = validationErrors[0];
              
              // Extract the error message from the first error object
              if (typeof firstError === 'object') {
                const errorKey = Object.keys(firstError)[0];
                errorMessage = firstError[errorKey];
              } else if (typeof firstError === 'string') {
                errorMessage = firstError;
              }
            } else if (typeof validationErrors === 'string') {
              errorMessage = validationErrors;
            }
          } catch (e) {
            // If parsing fails, try to extract a clean message
            // console.error('Failed to parse validation error:', e);
            
            // Check if the message contains common validation patterns
            const msg = responseData.message || '';
            if (msg.includes('email')) {
              errorMessage = 'Please enter a valid email address.';
            } else if (msg.includes('password')) {
              errorMessage = 'Please enter a valid password.';
            } else {
              errorMessage = 'Please check your input and try again.';
            }
          }
          break;
        default:
          errorMessage = responseData?.message || errorMessage;
      }
      console.log('🔴 LOGIN ERROR in login:', { errorMessage, errorCode });
      
      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode,
      };
    }

    // Validate response data
    if (!responseData || responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Invalid response from server',
        errorCode: responseData?.errorCode,
      };
    }

    // Extract data from new response structure
    const { user, token, refreshToken, cartCount, wishlist, searchKeywords } = responseData.data || {};

    // Console log login response
    console.log('🔵 LOGIN RESPONSE:', JSON.stringify(responseData, null, 2));
    console.log('🔵 LOGIN USER DATA:', JSON.stringify(user, null, 2));

    // Extract externalIds from wishlist (top-level in data)
    let externalIds: string[] = [];
    if (wishlist && Array.isArray(wishlist)) {
      // Extract externalIds from wishlist items (new structure)
      externalIds = wishlist.map((item: any) => {
        const externalId = item.externalId?.toString() || '';
        return externalId;
      }).filter(Boolean);
    }

    if (!user || !token) {
      return {
        success: false,
        error: 'Invalid response data from server',
      };
    }
    
    // Map addresses from new structure
    const mappedAddresses = (user.addresses || []).map((addr: any) => ({
      id: addr._id || addr.id || '',
      type: (addr.customerClearanceType === 'business' ? 'work' : 'home') as 'home' | 'work' | 'other',
      name: addr.recipient || '',
      street: addr.detailedAddress || '',
      city: addr.mainAddress || '', // Use mainAddress if available
      state: '', // Not provided in new structure
      zipCode: addr.zipCode || '',
      country: '', // Not provided in new structure
      phone: addr.contact || '',
      isDefault: addr.defaultAddress || false,
      // Store additional fields as part of the address object (will be preserved in JSON)
      personalCustomsCode: addr.personalCustomsCode || '',
      note: addr.note || '',
      customerClearanceType: addr.customerClearanceType || 'individual',
    } as Address & { personalCustomsCode?: string; note?: string; customerClearanceType?: string }));
    
    // Map wishlist - extract externalIds from wishlist items for userData
    const wishlistExternalIds = externalIds;
    
    // Create user object from response
    const userData: Partial<User> & {
      depositBalance?: number;
      points?: number;
      level?: string;
      referredCount?: number;
      userUniqueId?: string;
      userUniqueNo?: string;
      userName?: string;
      notes?: string;
      gender?: string;
      searchKeywords?: string[];
      googleId?: string;
      isBusiness?: boolean;
      isEmailVerified?: boolean;
      authProvider?: string;
      referralCode?: string;
      lastLogin?: string;
      referredBy?: string;
      users_id?: string;
      tjMemberId?: string;
      frozenDepositAmount?: number;
    } = {
      id: user._id || user.users_id || user.user_id || user.id || '',
      email: user.email || '',
      name: user.userName || user.users_id || user.user_id || user.email?.split('@')[0] || 'User',
      memberId: user.tjMemberId || undefined,
      phone: user.phone || '',
      birthday: user.birthday || undefined,
      gender: user.gender || undefined,
      addresses: mappedAddresses,
      paymentMethods: [], // Not provided in response
      wishlist: wishlistExternalIds, // Store externalIds as wishlist array
      followersCount: 0, // Not provided in response
      followingsCount: 0, // Not provided in response
      avatar: user.pictureUrl || undefined, // Use pictureUrl from API if available
      depositBalance: user.depositBalance ?? 0, // Store depositBalance from API
      frozenDepositAmount: user.frozenDepositAmount ?? 0, // Store frozen deposit amount
      points: user.points ?? 0, // Store points from API
      level: user.level || undefined, // Store user level/tier
      referredCount: user.referredCount ?? 0, // Store number of referrals
      userUniqueId: user.userUniqueId || undefined, // Store unique user identifier
      userUniqueNo: user.userUniqueNo || undefined, // Store unique user number
      userName: user.userName || undefined, // Store user name
      notes: user.notes || undefined, // Store user notes
      googleId: user.googleId || undefined, // Store Google ID
      isBusiness: user.isBusinesser ?? user.isBusiness ?? false, // API returns isBusinesser
      isEmailVerified: user.isEmailVerified || false, // Store email verification status
      authProvider: user.authProvider || 'local', // Store auth provider
      referralCode: user.referralCode || undefined, // Store referral code
      lastLogin: user.lastLogin || undefined, // Store last login time
      referredBy: user.referredBy || undefined, // Store referred by
      users_id: user.users_id || undefined, // Login identifier
      tjMemberId: user.tjMemberId || undefined, // TJ member id from API
      searchKeywords: Array.isArray(searchKeywords) ? searchKeywords : [], // Store search keywords from top-level
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: true,
        },
        language: 'en',
        currency: 'USD',
      },
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
    };
    
    // console.log("LOGIN USER TOKEN", token);
    // console.log("LOGIN EXTERNAL IDS", externalIds);
    // console.log("LOGIN CART COUNT", cartCount);
    // console.log("LOGIN USER DATA", userData);
    
    // Console log the userData being stored
    console.log('💾 STORING USER DATA TO ASYNCSTORAGE:', JSON.stringify(userData, null, 2));
    
    // Store token and user data
    await storeAuthData(token, userData);
    
    // Store refresh token
    if (refreshToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    
    // Store externalIds (wishlist IDs) to AsyncStorage
    if (externalIds && Array.isArray(externalIds)) {
      await AsyncStorage.setItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS, JSON.stringify(externalIds));
      // console.log("Saved externalIds to AsyncStorage:", externalIds);
    } else {
      // If no externalIds, store empty array
      await AsyncStorage.setItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS, JSON.stringify([]));
    }
    
    // Store cartCount if provided
    if (cartCount !== undefined) {
      await AsyncStorage.setItem(STORAGE_KEYS.CART_COUNT, JSON.stringify(cartCount));
      // console.log("Saved cartCount to AsyncStorage:", cartCount);
    }
    
    // Store search keywords if provided (from top-level data)
    if (searchKeywords && Array.isArray(searchKeywords) && searchKeywords.length > 0) {
      await AsyncStorage.setItem('search_keywords', JSON.stringify(searchKeywords));
      // console.log("Saved searchKeywords to AsyncStorage:", searchKeywords);
    } else {
      // If no searchKeywords, store empty array
      await AsyncStorage.setItem('search_keywords', JSON.stringify([]));
    }
    
    // Log all stored data for verification
    console.log('✅ ALL USER DATA STORED - Token: ' + (token ? 'Yes' : 'No') + 
                ', RefreshToken: ' + (refreshToken ? 'Yes' : 'No') + 
                ', Addresses: ' + (mappedAddresses?.length || 0) + 
                ', Wishlist Items: ' + (externalIds?.length || 0) + 
                ', Search Keywords: ' + (userData.searchKeywords?.length || 0));

    return {
      success: true,
      data: {
        token,
        refreshToken,
        user: userData,
        cartCount,
      },
    };
  } catch (error) {
    // console.error('Login error:', error);
    
    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
    
    // Handle other errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
    };
  }
};

// Register API (backend) — multipart/form-data
export const register = async (
  email: string,
  password: string,
  name: string,
  phone: string,
  isBusiness: boolean = false,
  referralCode?: string,
  user_id?: string,
  isSeller?: boolean,
  businessRegistrationImage?: string
): Promise<{ success: boolean; data?: any; error?: string; errorCode?: string }> => {
  try {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('userName', name);
    formData.append('users_id', user_id || name);
    formData.append('phone', phone);
    formData.append('isBusinesser', String(isSeller || isBusiness || false));

    if (referralCode && referralCode.trim() !== '') {
      formData.append('referalCode', referralCode.trim());
    }

    if (businessRegistrationImage) {
      const fileUri = businessRegistrationImage;
      const filename = fileUri.split('/').pop() || 'businessRegistration.png';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'png';
      const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      formData.append('businessRegistration', {
        uri: fileUri,
        name: filename,
        type,
      } as any);
    }

    const url = `${API_BASE_URL}/auth/register`;
    // Multipart bodies are not stable to canonicalize; sign without body hash.
    const signatureHeaders = await buildSignatureHeaders('POST', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
        // Do NOT set Content-Type - RN sets the multipart boundary automatically.
      },
      body: formData,
    });

    console.log("Signup Response Status:", response.status);

    const responseText = await response.text();
    console.log("Signup Response Text:", responseText.substring(0, 500));

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Signup Response:", responseData);
    } catch (parseError) {
      // console.error("Failed to parse response as JSON:", parseError);
      return {
        success: false,
        error: 'Invalid response from server. Please check your network connection.',
      };
    }
    
    // Check if request was successful
    if (!response.ok) {
      // Handle error by errorCode
      const errorCode = responseData?.errorCode;
      let errorMessage = responseData?.message || responseData?.error || `Request failed with status ${response.status}`;
      
      // Map errorCode to user-friendly messages
      switch (errorCode) {
        case 'EMAIL_ALREADY_REGISTERED':
          errorMessage = 'This email is already registered. Please login instead.';
          break;
        case 'INVALID_REFERRAL_CODE':
          errorMessage = 'Invalid referral code. Please check and try again.';
          break;
        case 'VALIDATION_ERROR':
          // Try to parse validation errors
          try {
            // Check if message is already a string that looks like JSON
            let validationErrors;
            if (typeof responseData.message === 'string') {
              // Try to parse the string as JSON
              validationErrors = JSON.parse(responseData.message);
            } else {
              validationErrors = responseData.message;
            }
            
            // Handle array of validation errors
            if (Array.isArray(validationErrors) && validationErrors.length > 0) {
              const firstError = validationErrors[0];
              
              // Extract the error message from the first error object
              if (typeof firstError === 'object') {
                const errorKey = Object.keys(firstError)[0];
                errorMessage = firstError[errorKey];
              } else if (typeof firstError === 'string') {
                errorMessage = firstError;
              }
            } else if (typeof validationErrors === 'string') {
              errorMessage = validationErrors;
            }
          } catch (e) {
            // If parsing fails, try to extract a clean message
            // console.error('Failed to parse validation error:', e);
            
            // Check if the message contains common validation patterns
            const msg = responseData.message || '';
            if (msg.includes('email')) {
              errorMessage = 'Please enter a valid email address.';
            } else if (msg.includes('password')) {
              errorMessage = 'Password does not meet requirements.';
            } else if (msg.includes('name')) {
              errorMessage = 'Please enter a valid name.';
            } else {
              errorMessage = 'Please check your input and try again.';
            }
          }
          break;
        default:
          // Use the message from the API
          errorMessage = responseData?.message || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode, // Include errorCode for programmatic handling
      };
    }
    
    // Validate response data
    if (!responseData || responseData.status !== 'success') {
      // This handles cases where response.ok is true but status is not 'success'
      const errorCode = responseData?.errorCode;
      return {
        success: false,
        error: responseData?.message || 'Invalid response from server',
        errorCode: errorCode,
      };
    }
    
    // Check if response has data (with user and token) or just a message
    if (responseData.data && responseData.data.user && responseData.data.token) {
      // Full registration response with user data and token
      const { user, token, refreshToken } = responseData.data;
      
      // Create user object from response
      const userData: Partial<User> = {
        id: user.id,
        email: user.email,
        name: user.user_id,
        avatar: user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '' 
          ? user.avatar 
          : 'https://via.placeholder.com/150',
        phone: user.phone || '',
        addresses: [],
        paymentMethods: [],
        wishlist: [],
        followersCount: 0,
        followingsCount: 0,
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

      // Store token and user data
      await storeAuthData(token, userData);
      
      // Store refresh token
      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      return {
        success: true,
        data: {
          token,
          refreshToken,
          user: userData,
          message: responseData.message,
        },
      };
    } else {
      // Registration successful but requires email verification
      // No user data or token yet - user needs to verify email first
      return {
        success: true,
        data: {
          email: email, // Pass the email for verification screen
          message: responseData.message,
          requiresVerification: true,
        },
      };
    }
  } catch (error) {
    // console.error('Registration error:', error);
    
    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
    
    // Handle other errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
    };
  }
};

// Get stored token
export const getStoredToken = async (): Promise<string | null> => {
  try {
    // console.log('getStoredToken: Attempting to retrieve token');
    const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
    // console.log('🔑 ACCESS TOKEN:', token);
    // console.log('getStoredToken: Retrieved token from storage:', token ? 'Token exists' : 'No token found');
    return token;
  } catch (error) {
    // console.error('Error getting stored token:', error);
    return null;
  }
};

// Refresh access token using refresh token
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      console.warn('[Auth] No refresh token available');
      return null;
    }

    console.log('[Auth] Refreshing access token...');
    const url = `${API_BASE_URL}/auth/refresh-token`;
    const bodyData = { refreshToken };
    const signatureHeaders = await buildSignatureHeaders('POST', url, bodyData);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
      },
      body: JSON.stringify(bodyData),
    });

    const responseText = await response.text();
    let data;
    try { data = JSON.parse(responseText); } catch { return null; }

    if (response.ok && data.status === 'success' && data.data?.token) {
      console.log('[Auth] Token refreshed successfully');
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, data.data.token);
      if (data.data.refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.refreshToken);
      }
      return data.data.token;
    }

    console.warn('[Auth] Token refresh failed:', data.message);
    return null;
  } catch (error) {
    console.error('[Auth] Token refresh error:', error);
    return null;
  }
};

// Get stored user data
export const getStoredUserData = async (): Promise<User | null> => {
  try {
    const userDataString = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userDataString) {
      return JSON.parse(userDataString);
    }
    return null;
  } catch (error) {
    // console.error('Error getting stored user data:', error);
    return null;
  }
};

/** Map GET /v1/users/me `user` object into app User shape */
export const mapProfileApiUserToUser = (
  user: Record<string, any>,
  existingUser?: Partial<User>,
): Partial<User> => {
  const mappedAddresses: Address[] = (user.addresses || []).map((addr: any) => ({
    id: addr._id || addr.id || '',
    type: (addr.customerClearanceType === 'business' || addr.customMethod === 'business'
      ? 'work'
      : 'home') as Address['type'],
    name: addr.recipient || '',
    street: addr.detailedAddress || '',
    city: addr.mainAddress || '',
    state: '',
    zipCode: addr.zipCode || '',
    country: '',
    phone: addr.contact || '',
    isDefault: addr.defaultAddress || false,
  }));

  return {
    ...existingUser,
    id: user._id || user.user_id || existingUser?.id || '',
    memberId: user.userUniqueId || user.tjMemberId || user.users_id || existingUser?.memberId,
    email: user.email || existingUser?.email || '',
    name: user.userName || user.users_id || existingUser?.name || '',
    phone: user.phone || existingUser?.phone,
    birthday: user.birthday || existingUser?.birthday,
    gender: user.gender || existingUser?.gender,
    avatar: user.pictureUrl || existingUser?.avatar,
    addresses: mappedAddresses.length > 0 ? mappedAddresses : existingUser?.addresses || [],
    wishlist: user.wishlist || existingUser?.wishlist || [],
    depositBalance: user.depositBalance ?? existingUser?.depositBalance ?? 0,
    points: user.points ?? existingUser?.points ?? 0,
    level: user.level || existingUser?.level,
    referredCount: user.referredCount ?? existingUser?.referredCount ?? 0,
    userUniqueId: user.userUniqueId || user.tjMemberId || existingUser?.userUniqueId,
    userName: user.userName || existingUser?.userName,
    notes: user.notes || existingUser?.notes,
    searchKeywords: user.searchKeywords || existingUser?.searchKeywords || [],
    googleId: user.googleId || existingUser?.googleId,
    isBusiness: user.isBusinesser ?? user.isBusiness ?? existingUser?.isBusiness ?? false,
    isEmailVerified: user.isEmailVerified ?? existingUser?.isEmailVerified ?? false,
    authProvider: user.authProvider || existingUser?.authProvider || 'local',
    referralCode: user.referralCode || existingUser?.referralCode,
    lastLogin: user.lastLogin || existingUser?.lastLogin,
    referredBy: user.referredBy || existingUser?.referredBy,
    updatedAt: new Date(),
  };
};

export const formatProfileAddressLabel = (addr: Record<string, any>): string => {
  const parts = [addr.recipient, addr.mainAddress, addr.detailedAddress].filter(Boolean);
  return parts.join(' · ') || addr.zipCode || '';
};

// Get profile API — GET /v1/users/me
export interface GetProfileResponse {
  success: boolean;
  message?: string;
  statusCode?: number;
  data?: {
    user: Record<string, any>;
    token?: string;
    refreshToken?: string;
    expiresAt?: string;
    wishlist?: string[];
    cartCount?: number;
    searchKeywords?: string[];
  };
  error?: string;
}

export const getProfile = async (): Promise<GetProfileResponse> => {
  try {
    const token = await getStoredToken();
    
    if (!token) {
      return {
        success: false,
        error: 'No authentication token found. Please log in again.',
      };
    }
    
    const apiBase = API_BASE_URL.replace(/\/+$/, '');
    const usersMeUrl = apiBase.endsWith('/v1')
      ? `${apiBase}/users/me`
      : `${apiBase}/v1/users/me`;
    const profileUrls = [usersMeUrl, `${apiBase}/users/profile`];
    let response: Response | null = null;
    let responseText = '';
    let responseData: any;
    let responseUrl = profileUrls[0];

    for (const candidateUrl of profileUrls) {
      responseUrl = candidateUrl;
      const signatureHeaders = await buildSignatureHeaders('GET', candidateUrl);
      response = await fetch(candidateUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });

      responseText = await response.text();

      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = undefined;
      }

      if (response.ok || ![404, 405].includes(response.status)) {
        break;
      }
    }

    if (!response) {
      return {
        success: false,
        error: 'Failed to get profile',
      };
    }

    // console.log('Get profile response status:', response.status, 'url:', responseUrl);

    if (responseData === undefined) {
      // console.error('Failed to parse response as JSON:', parseError);
      return {
        success: false,
        error: 'Invalid response from server. Please try again.',
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: responseData?.message || `Request failed with status ${response.status}`,
      };
    }

    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Failed to get profile',
      };
    }
    
    return {
      success: true,
      message: responseData.message || 'Profile retrieved successfully',
      data: responseData.data,
    };
  } catch (error: any) {
    // console.error('Get profile error:', error);
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
    
    return {
      success: false,
      error: error.message || 'An unexpected error occurred. Please try again.',
    };
  }
};

// Update profile API
export interface UpdateProfileRequest {
  user_id?: string;
  userName?: string;
  phone?: string;
  isBusiness?: boolean;
  gender?: string;
  birthday?: string;
  picture?: string; // File URI for the picture
}

export interface UpdateProfileResponse {
  success: boolean;
  message?: string;
  data?: {
    user: {
      _id: string;
      email: string;
      user_id: string;
      userName?: string;
      userUniqueId?: string;
      phone?: string;
      isBusiness?: boolean;
      gender?: string;
      birthday?: string;
      pictureUrl?: string;
      wishlist?: string[];
      addresses?: any[];
      [key: string]: any;
    };
  };
  error?: string;
}

export const updateProfile = async (
  request: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  try {
    const token = await getStoredToken();
    
    if (!token) {
      return {
        success: false,
        error: 'No authentication token found. Please log in again.',
      };
    }
    
    const url = `${API_BASE_URL}/users/profile`;
    // console.log('Sending update profile request to:', url);
    
    // Create FormData
    const formData = new FormData();
    
    // Add text fields if provided
    if (request.user_id) {
      formData.append('user_id', request.user_id);
    }
    if (request.userName) {
      formData.append('userName', request.userName);
    }
    if (request.phone) {
      formData.append('phone', request.phone);
    }
    if (request.gender) {
      formData.append('gender', request.gender);
    }
    if (request.birthday) {
      formData.append('birthday', request.birthday);
    }
    if (request.isBusiness !== undefined) {
      // FormData in React Native accepts boolean, but we'll convert to string for consistency
      formData.append('isBusiness', String(request.isBusiness));
    }
    
    // Add picture file if provided
    if (request.picture) {
      // In React Native, we need to create a file object from the URI
      const fileUri = request.picture;
      const filename = fileUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // React Native FormData format for file upload
      formData.append('picture', {
        uri: fileUri,
        name: filename,
        type: type,
      } as any);
    }
    
    // console.log('Update profile request fields:', {
    //   user_id: request.user_id,
    //   phone: request.phone,
    //   gender: request.gender,
    //   birthday: request.birthday,
    //   isBusiness: request.isBusiness,
    //   hasPicture: !!request.picture,
    // });
    // Multipart/form-data bodies are not stable to canonicalize in React Native.
    // Sign this request without a body hash so the backend receives a consistent signature.
    const signatureHeaders = await buildSignatureHeaders('PUT', url);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
        // Don't set Content-Type - browser/React Native will set it automatically with boundary
      },
      body: formData,
    });
    
    // console.log('Update profile response status:', response.status);
    
    const responseText = await response.text();
    // console.log('Update profile response text:', responseText.substring(0, 500));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      // console.error('Failed to parse response as JSON:', parseError);
      return {
        success: false,
        error: 'Invalid response from server. Please try again.',
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        error: responseData?.message || `Request failed with status ${response.status}`,
      };
    }
    
    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Profile update failed',
      };
    }
    
    return {
      success: true,
      message: responseData.message || 'Profile updated successfully',
      data: responseData.data,
    };
  } catch (error: any) {
    // console.error('Update profile error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred. Please try again.',
    };
  }
};

// Change password API
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> => {
  try {
    const token = await getStoredToken();
    
    if (!token) {
      return {
        success: false,
        error: 'No authentication token found. Please log in again.',
      };
    }
    
    const requestBody: ChangePasswordRequest = {
      currentPassword,
      newPassword,
    };
    
    const url = `${API_BASE_URL}/users/change-password`;
    // console.log('Sending change password request to:', url);
    // console.log('Change password request body:', JSON.stringify({ currentPassword: '***', newPassword: '***' }, null, 2));
    const signatureHeaders = await buildSignatureHeaders('PUT', url, requestBody);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
      },
      body: JSON.stringify(requestBody),
    });
    
    // console.log('Change password response status:', response.status);
    
    const responseText = await response.text();
    // console.log('Change password response text:', responseText.substring(0, 500));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      // console.error('Failed to parse response as JSON:', parseError);
      return {
        success: false,
        error: 'Invalid response from server. Please try again.',
      };
    }
    
    if (!response.ok) {
      return {
        success: false,
        error: responseData?.message || `Request failed with status ${response.status}`,
      };
    }
    
    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Password change failed',
      };
    }
    
    return {
      success: true,
      message: responseData.message || 'Password changed successfully',
    };
  } catch (error: any) {
    // console.error('Change password error:', error);
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
    
    return {
      success: false,
      error: error.message || 'An unexpected error occurred. Please try again.',
    };
  }
};

// Verify Email API
// Check email API
export const checkEmail = async (email: string): Promise<{
  success: boolean;
  data?: { exists: boolean; verified: boolean };
  error?: string;
  }> => {
  try {
    console.log('🌐 API Base URL:', API_BASE_URL);
    const requestBody = { email };
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/check-email`, requestBody);
    const response = await apiClient.post('/auth/check-email', requestBody, {
      headers: {
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
        ...signatureHeaders,
      },

    });

    if (response.data && response.data.status === 'success' && response.data.data) {
      return {
        success: true,
        data: {
          exists: response.data.data.exists || false,
          verified: response.data.data.verified || false,
        },
      };
    }

    return {
      success: false,
      error: response.data?.message || 'Invalid response from server',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to check email',
    };
  }
};

// Sign in with email code API
export const signinWithEmail = async (
  email: string
): Promise<{ success: boolean; data?: { codeSent: boolean }; error?: string }> => {
  try {
    const requestBody = { email };
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/signin/email`, requestBody);
    const response = await apiClient.post('/auth/signin/email', requestBody, {
      headers: {
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
        ...signatureHeaders,
      },

    });

    if (response.data && response.data.status === 'success' && response.data.data) {
      return {
        success: true,
        data: {
          codeSent: response.data.data.codeSent || false,
        },
      };
    }
    console.log('Signin with email response:', response.data);
    return {
      success: false,
      error: response.data?.message || 'Invalid response from server',
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to send signin code';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Verify Signin Code API (for verified users signing in with email code)
export const verifySigninCode = async (
  email: string,
  code: string
): Promise<{ success: boolean; data?: any; error?: string; errorCode?: string }> => {
  try {
    const requestBody = { email, code };
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/signin/code`, requestBody);
    const response = await apiClient.post('/auth/signin/code', requestBody, {
      headers: {
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
        ...signatureHeaders,
      },

    });

    if (response.data && response.data.status === 'success') {
      // If response has user data and token, store them
      if (response.data.data && response.data.data.user && response.data.data.token) {
        const { user, token, refreshToken } = response.data.data;
        
        // Create user object from response
        const userData: Partial<User> & { depositBalance?: number; points?: number } = {
          id: user.id,
          email: user.email,
          name: user.user_id || user.name || 'User',
          avatar: user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '' 
            ? user.avatar 
            : 'https://via.placeholder.com/150',
          phone: user.phone || '',
          addresses: [],
          paymentMethods: [],
          wishlist: [],
          followersCount: 0,
          followingsCount: 0,
          depositBalance: user.depositBalance ?? 0, // Store depositBalance from API
          points: user.points ?? 0, // Store points from API
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

        // Store token and user data
        await storeAuthData(token, userData);
        
        // Store refresh token if provided
        if (refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }

        return {
          success: true,
          data: {
            token,
            refreshToken,
            user: userData,
            message: response.data.message,
          },
        };
      }
      
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: response.data?.message || 'Invalid response from server',
    };
  } catch (error: any) {
    const errorCode = error.response?.data?.errorCode;
    const errorMessage = error.response?.data?.message || error.message || 'Failed to verify signin code';
    return {
      success: false,
      error: errorMessage,
      errorCode: errorCode,
    };
  }
};

// Verify Signup Code API (for unverified users)
export const verifySignupCode = async (
  email: string,
  code: string
): Promise<{ success: boolean; data?: { signup_code_verified: boolean }; error?: string; errorCode?: string }> => {
  try {
    const requestBody = { email, code };
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/verify-signup-code`, requestBody);
    const response = await apiClient.post('/auth/verify-signup-code', requestBody, {
      headers: {
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
        ...signatureHeaders,
      },

    });

    if (response.data && response.data.status === 'success' && response.data.data) {
      return {
        success: true,
        data: {
          signup_code_verified: response.data.data.signup_code_verified || false,
        },
      };
    }

    return {
      success: false,
      error: response.data?.message || 'Invalid response from server',
    };
  } catch (error: any) {
    const errorCode = error.response?.data?.errorCode;
    const errorMessage = error.response?.data?.message || error.message || 'Failed to verify signup code';
    return {
      success: false,
      error: errorMessage,
      errorCode: errorCode,
    };
  }
};

export const verifyEmail = async (
  email: string,
  code: string
): Promise<{ success: boolean; data?: any; error?: string; errorCode?: string }> => {
  try {
    const requestBody = { email, code };
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/verify-email`, requestBody);
    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    // console.log('Verify Email Response Status:', response.status);
    
    const responseText = await response.text();
    // console.log('Verify Email Response Text:', responseText.substring(0, 200));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      // console.log('Verify Email Response:', responseData);
    } catch (parseError) {
      // console.error('Failed to parse response as JSON:', parseError);
      return {
        success: false,
        error: 'Invalid response from server',
      };
    }

    // Handle error responses (400, 404, 422)
    if (!response.ok) {
      const errorCode = responseData?.errorCode;
      let errorMessage = responseData?.message || responseData?.error || `Request failed with status ${response.status}`;
      
      // Map errorCode to user-friendly messages
      switch (errorCode) {
        case 'INVALID_VERIFICATION_CODE':
          errorMessage = 'Invalid verification code. Please check and try again.';
          break;
        case 'USER_NOT_FOUND':
          errorMessage = 'User not found. Please register again.';
          break;
        case 'VERIFICATION_CODE_EXPIRED':
          errorMessage = 'Verification code has expired. Please request a new code.';
          break;
        case 'VALIDATION_ERROR':
          errorMessage = 'Invalid verification code format.';
          break;
        default:
          errorMessage = responseData?.message || errorMessage;
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode,
      };
    }

    // Check if response status is success
    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Email verification failed',
        errorCode: responseData?.errorCode,
      };
    }

    // Success case (200) - Extract user data and token
    if (responseData.data && responseData.data.user && responseData.data.token) {
      const { user, token, refreshToken } = responseData.data;
      
      // Create user object from response
      const userData: Partial<User> = {
        id: user.id,
        email: user.email,
        name: user.user_id || user.name || 'User',
        avatar: user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '' 
          ? user.avatar 
          : 'https://via.placeholder.com/150',
        phone: user.phone || '',
        addresses: [],
        paymentMethods: [],
        wishlist: [],
        followersCount: 0,
        followingsCount: 0,
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

      // Store token and user data
      await storeAuthData(token, userData);
      
      // Store refresh token if provided
      if (refreshToken) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      return {
        success: true,
        data: {
          token,
          refreshToken,
          user: userData,
          message: responseData.message,
        },
      };
    }

    // Fallback if data structure is unexpected
    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    // console.error('Verify Email Error:', error);
    
    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
};

// Resend Verification Code API
export const resendVerificationCode = async (
  email: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const requestBody = { email };
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/resend-verification-code`, requestBody);
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    // console.log('Resend Code Response Status:', response.status);
    
    const responseText = await response.text();
    // console.log('Resend Code Response Text:', responseText.substring(0, 200));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      // console.log('Resend Code Response:', responseData);
    } catch (parseError) {
      // console.error('Failed to parse response as JSON:', parseError);
      return {
        success: false,
        error: 'Invalid response from server',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.message || responseData?.error || `Request failed with status ${response.status}`,
      };
    }

    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Failed to resend code',
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    // console.error('Resend Code Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
};

// Forgot Password API
export const forgotPassword = async (
  email: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const requestBody = { email };
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/forgot-password`, requestBody);
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    // console.log('Forgot Password Response Status:', response.status);
    
    const responseText = await response.text();
    // console.log('Forgot Password Response Text:', responseText.substring(0, 200));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      // console.log('Forgot Password Response:', responseData);
    } catch (parseError) {
      // console.error('Failed to parse response as JSON:', parseError);
      return {
        success: false,
        error: 'Invalid response from server',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.message || responseData?.error || `Request failed with status ${response.status}`,
      };
    }

    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Failed to send reset link',
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    // console.error('Forgot Password Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
};

// Set Password API (for new users after signup verification)
export const setPassword = async (
  email: string,
  password: string,
  code: string,
  users_id?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const requestBody: any = { email, password, code };
    if (users_id && users_id.trim() !== '') {
      requestBody.users_id = users_id.trim();
    }
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/set-password`, requestBody);
    const response = await apiClient.post('/auth/set-password', requestBody, {
      headers: {
        'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning
        ...signatureHeaders,
      },

    });

    if (response.data && response.data.status === 'success') {
      // If response has user data and token, store them
      if (response.data.data && response.data.data.user && response.data.data.token) {
        const { user, token, refreshToken } = response.data.data;
        
        // Create user object from response
        const userData: Partial<User> & { depositBalance?: number; points?: number } = {
          id: user._id || user.id,
          email: user.email,
          name: user.user_id || user.name || user.email?.split('@')[0] || 'User',
          avatar: user.avatar || 'https://via.placeholder.com/150',
          phone: user.phone || '',
          addresses: user.addresses || [],
          paymentMethods: [],
          wishlist: user.wishlist || [],
          followersCount: 0,
          followingsCount: 0,
          depositBalance: user.depositBalance ?? 0, // Store depositBalance from API
          points: user.points ?? 0, // Store points from API
          preferences: {
            notifications: {
              email: true,
              push: true,
              sms: true,
            },
            language: 'en',
            currency: 'USD',
          },
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
        };

        // Store token and user data
        await storeAuthData(token, userData);
        
        // Store refresh token if provided
        if (refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }

        return {
          success: true,
          data: {
            token,
            refreshToken,
            user: userData,
            message: response.data.message,
          },
        };
      }
      
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: response.data?.message || 'Invalid response from server',
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to set password';
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Reset Password API
export const resetPassword = async (
  email: string,
  code: string,
  password: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const requestBody = { email, code, password };
    const signatureHeaders = await buildSignatureHeaders('POST', `${API_BASE_URL}/auth/reset-password`, requestBody);
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    // console.log('Reset Password Response Status:', response.status);
    
    const responseText = await response.text();
    // console.log('Reset Password Response Text:', responseText.substring(0, 200));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      // console.log('Reset Password Response:', responseData);
    } catch (parseError) {
      // console.error('Failed to parse response as JSON:', parseError);
      return {
        success: false,
        error: 'Invalid response from server',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.message || responseData?.error || `Request failed with status ${response.status}`,
      };
    }

    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Failed to reset password',
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error) {
    // console.error('Reset Password Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
};

// Search Suggestions API
export const getSearchSuggestions = async (rankType: string = 'hot'): Promise<{ 
  success: boolean; 
  data?: {
    searchHistory: string[];
    keepShoppingFor: {
      title: string;
      products: any[];
    };
  }; 
  error?: string 
}> => {
  try {
    const token = await getStoredToken();
    if (!token) {
      return {
        success: false,
        error: 'No authentication token found',
      };
    }
    const signatureHeaders = await buildSignatureHeaders('GET', `${API_BASE_URL}/users/search-suggestions`);
    const response = await apiClient.get('/users/search-suggestions', {
      params: { rankType },
      headers: {
        ...signatureHeaders,
      },
    });

    if (response.data && response.data.status === 'success' && response.data.data) {
      console.log('Search Suggestions Response:', response.data.data);
      return {
        success: true,
        data: {
          searchHistory: response.data.data.searchHistory || [],
          keepShoppingFor: response.data.data.keepShoppingFor || { title: '', products: [] },
        },
      };
    }

    return {
      success: false,
      error: 'No search suggestions data received',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch search suggestions',
    };
  }
};

// Search History APIs
export const getSearchHistory = async (): Promise<{ success: boolean; data?: string[]; error?: string }> => {
  try {
    const token = await getStoredToken();
    if (!token) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }
    const signatureHeaders = await buildSignatureHeaders('GET', `${API_BASE_URL}/users/search-history`);
    const response = await apiClient.get('/users/search-history', {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...signatureHeaders,
      },
    });

    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: 'Invalid response from server',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch search history',
    };
  }
};

export const deleteSearchKeyword = async (keyword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const token = await getStoredToken();
    if (!token) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }
    const signatureHeaders = await buildSignatureHeaders('DELETE', `${API_BASE_URL}/users/search-history/${encodeURIComponent(keyword)}`);
    const response = await apiClient.delete(`/users/search-history/${encodeURIComponent(keyword)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...signatureHeaders,
      },
    });

    if (response.data && response.data.status === 'success') {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error: 'Invalid response from server',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to delete search keyword',
    };
  }
};

export const clearSearchHistory = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const token = await getStoredToken();
    if (!token) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }
    const signatureHeaders = await buildSignatureHeaders('DELETE', `${API_BASE_URL}/users/search-history`);
    const response = await apiClient.delete('/users/search-history', {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...signatureHeaders,
      },
    });

    if (response.data && response.data.status === 'success') {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error: 'Invalid response from server',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to clear search history',
    };
  }
};

// Email Update APIs
export interface RequestEmailUpdateRequest {
  newEmail: string;
}

export interface RequestEmailUpdateResponse {
  success: boolean;
  message?: string;
  data?: {
    codeSent: boolean;
  };
  error?: string;
}

export const requestEmailUpdate = async (
  newEmail: string
): Promise<RequestEmailUpdateResponse> => {
  try {
    const token = await getStoredToken();

    if (!token) {
      return {
        success: false,
        error: 'No authentication token found. Please log in again.',
      };
    }

    const requestBody: RequestEmailUpdateRequest = {
      newEmail,
    };

    const url = `${API_BASE_URL}/users/email/request-update`;
    const signatureHeaders = await buildSignatureHeaders('POST', url, requestBody);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      return {
        success: false,
        error: 'Invalid response from server. Please try again.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.message || `Request failed with status ${response.status}`,
      };
    }

    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Email update request failed',
      };
    }

    return {
      success: true,
      message: responseData.message || 'Verification code sent to email',
      data: responseData.data,
    };
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }

    return {
      success: false,
      error: error.message || 'An unexpected error occurred. Please try again.',
    };
  }
};

export interface ConfirmEmailUpdateRequest {
  code: string;
}

export interface ConfirmEmailUpdateResponse {
  success: boolean;
  message?: string;
  data?: {
    user: any;
  };
  error?: string;
}

export const confirmEmailUpdate = async (
  code: string
): Promise<ConfirmEmailUpdateResponse> => {
  try {
    const token = await getStoredToken();

    if (!token) {
      return {
        success: false,
        error: 'No authentication token found. Please log in again.',
      };
    }

    const requestBody: ConfirmEmailUpdateRequest = {
      code,
    };

    const url = `${API_BASE_URL}/users/email/confirm-update`;
    const signatureHeaders = await buildSignatureHeaders('POST', url, requestBody);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...signatureHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      return {
        success: false,
        error: 'Invalid response from server. Please try again.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: responseData?.message || `Request failed with status ${response.status}`,
      };
    }

    if (responseData.status !== 'success') {
      return {
        success: false,
        error: responseData?.message || 'Email update confirmation failed',
      };
    }

    return {
      success: true,
      message: responseData.message || 'Email updated successfully',
      data: responseData.data,
    };
  } catch (error: any) {
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }

    return {
      success: false,
      error: error.message || 'An unexpected error occurred. Please try again.',
    };
  }
};

import { 
  Product, 
  Category, 
  Seller, 
  Review, 
  Story, 
  Notification, 
  User, 
  Order, 
  CartItem,
  SearchFilters, 
  ApiResponse, 
  PaginatedResponse,
  VariationData,
  ShippingService,
  ProductCreateData,
  ProductUpdateData,
  CustomerOrderDetails,
  CustomerOrderResponse
} from '../types';
import { getStoredToken } from './authApi';
import axios, { AxiosRequestConfig } from 'axios';
import { uploadToCloudinary, uploadVideoToCloudinary } from './cloudinary';
import { productsApi } from './productsApi';

// Export all the separated APIs
export { 
  productsApi,
};

import { API_BASE_URL } from '../constants';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const token = await getStoredToken();
  return {
    'Authorization': `Bearer ${token}`,
  };
};

// Helper function to convert string to number safely
const toNumber = (value: string | number | undefined, defaultValue: number = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

// Helper function to convert string to integer safely
const toInteger = (value: string | number | undefined, defaultValue: number = 0): number => {
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

// Export utility functions that might be used by other modules
export {
  getAuthHeaders,
  toNumber,
  toInteger,
  API_BASE_URL
};

// Export types that might be used by other modules
export type {
  ProductCreateData,
  ProductUpdateData,
  CustomerOrderDetails,
  CustomerOrderResponse
};
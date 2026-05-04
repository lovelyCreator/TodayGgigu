import { 
  Product, 
  SearchFilters, 
  ApiResponse, 
  PaginatedResponse,
  VariationData,
  ProductCreateData,
  ProductUpdateData,
  CategoriesTreeResponse
} from '../types';
import { getStoredToken } from './authApi';
import axios, { AxiosRequestConfig } from 'axios';
import { uploadToCloudinary, uploadVideoToCloudinary } from './cloudinary';

import { API_BASE_URL } from '../constants';
import { buildSignatureHeaders } from './signature';

// In-memory cache for category tree (clears on app restart)
const categoryTreeCache: Record<string, CategoriesTreeResponse> = {};

// Products API
export const productsApi = {

  // Image search for 1688
  imageSearch1688: async (
    imageBase64: string,
    language?: string,
    page: number = 1,
    pageSize: number = 40,
  ): Promise<ApiResponse<any>> => {
    try {
      if (!imageBase64 || imageBase64.trim().length === 0) {
        return {
          success: false,
          message: 'Image base64 data is required',
          data: null,
        };
      }

      const token = await getStoredToken();
      const url = `${API_BASE_URL}/products/image-search`;

      let cleanBase64 = imageBase64;
      if (imageBase64.includes(',')) {
        cleanBase64 = imageBase64.split(',')[1];
      }

      const requestBody: any = {
        imageBase64: cleanBase64,
        page,
        pageSize,
      };
      
      if (language) {
        requestBody.language = language;
      }
      const signatureHeaders = await buildSignatureHeaders('POST', url, requestBody);
      const response = await axios.post(url, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      const responseData = response.data;

      console.log('🔍 [1688 ImageSearch API] Response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });

      // Check for success response structure
      if (!responseData) {
        return {
          success: false,
          message: 'No response data received from image search API',
          data: null,
        };
      }

      // Handle different response structures
      let products: any[] = [];
      if (responseData.status === 'success' && responseData.data) {
        if (Array.isArray(responseData.data)) {
          products = responseData.data;
        } else if (Array.isArray(responseData.data.products)) {
          products = responseData.data.products;
        } else if (responseData.data.data && Array.isArray(responseData.data.data)) {
          products = responseData.data.data;
        }
      } else if (Array.isArray(responseData.data)) {
        products = responseData.data;
      } else if (Array.isArray(responseData)) {
        products = responseData;
      }

      if (products.length === 0) {
        return {
          success: true,
          data: { products: [] },
          message: 'No products found for this image',
        };
      }

      // Normalize 1688 response to match Product structure
      const normalizedProducts = products.map((item: any) => {
        
        // Extract price from priceInfo object if available (1688 API structure)
        let price = 0;
        let originalPrice = 0;
        
        if (item.priceInfo) {
          // priceInfo structure: { price: '22.00', consignPrice: '22', promotionPrice: '19.01' }
          // promotionPrice is the discounted price, price is the original price
          const priceInfo = item.priceInfo;
          originalPrice = parseFloat(priceInfo.price || priceInfo.consignPrice || '0');
          price = parseFloat(priceInfo.promotionPrice || priceInfo.price || priceInfo.consignPrice || '0');
          
          // If promotionPrice exists and is different from price, use it as the discounted price
          if (priceInfo.promotionPrice && parseFloat(priceInfo.promotionPrice) < originalPrice) {
            price = parseFloat(priceInfo.promotionPrice);
          } else if (priceInfo.price) {
            price = parseFloat(priceInfo.price);
          }
        } else {
          // Fallback to other price fields if priceInfo is not available
          price = parseFloat(
            item.price || 
            item.wholesalePrice || 
            item.dropshipPrice || 
            item.minPrice ||
            item.maxPrice ||
            item.unitPrice ||
            item.productPrice ||
            (item.priceRange && item.priceRange.min) ||
            '0'
          );
          originalPrice = parseFloat(
            item.originalPrice || 
            item.listPrice || 
            item.retailPrice ||
            item.price || 
            '0'
          );
        }
        
        const discount = originalPrice > price && originalPrice > 0
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0;

        // Extract wholesale/dropship price from priceInfo.consignPrice if available
        const wholesalePrice = item.priceInfo?.consignPrice 
          ? parseFloat(item.priceInfo.consignPrice) 
          : (item.wholesalePrice ? parseFloat(item.wholesalePrice) : price);
        const dropshipPrice = item.priceInfo?.consignPrice 
          ? parseFloat(item.priceInfo.consignPrice) 
          : (item.dropshipPrice ? parseFloat(item.dropshipPrice) : price);

        return {
          id: item.id?.toString() || item.externalId?.toString() || '',
          externalId: item.externalId?.toString() || item.id?.toString() || '',
          offerId: item.offerId?.toString() || item.externalId?.toString() || item.id?.toString() || '',
          title: item.title || item.name || item.subject || '',
          titleOriginal: item.titleOriginal || item.title || item.name || '',
          image: item.image || item.mainImage || item.imageUrl || '',
          price: price,
          originalPrice: originalPrice,
          wholesalePrice: wholesalePrice,
          dropshipPrice: dropshipPrice,
          sales: item.sales || item.orderCount || 0,
          rating: item.rating || 0,
          repurchaseRate: item.repurchaseRate || '',
          createDate: item.createDate || new Date().toISOString(),
          modifyDate: item.modifyDate || new Date().toISOString(),
        };
      });

      return {
        success: true,
        data: { products: normalizedProducts, page, pageSize },
        message: '1688 image search products retrieved successfully',
      };
    } catch (error: any) {
      // Extract error message from various possible response formats
      const errorMessage =
        error.response?.data?.biz_error_msg ||
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        (typeof error.response?.data === 'string' ? error.response.data : null) ||
        error.message ||
        'Failed to perform 1688 image search';

      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Image search for Taobao
  imageSearchTaobao: async (
    language: string,
    imageBase64: string,
    page: number = 1,
    pageSize: number = 40,
  ): Promise<ApiResponse<any>> => {
    try {
      if (!imageBase64 || imageBase64.trim().length === 0) {
        return {
          success: false,
          message: 'Image base64 data is required',
          data: null,
        };
      }

      const token = await getStoredToken();
      const url = `${API_BASE_URL}/products/taobao-global/image-search`;
      const requestBody = { language, image_base64: imageBase64, page, page_size: pageSize };
      const signatureHeaders = await buildSignatureHeaders('POST', url, requestBody);

      const response = await axios.post(url, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      const taobaoData = response.data;

      // Log Taobao API request and response
      console.log('🔍 [Taobao ImageSearch API] Request:', {
        url,
        language,
        base64Length: imageBase64.length,
        hasToken: !!token,
      });
      
      // console.log('🔍 [Taobao ImageSearch API] Response:', JSON.stringify(taobaoData, null, 2));

      // Based on backend spec: code === '0' indicates success
      if (!taobaoData) {
        return {
          success: false,
          message: 'No response data received from image search API',
          data: null,
        };
      }

      if (taobaoData.code !== '0') {
        const errorMsg = taobaoData.biz_error_msg || taobaoData.message || `API returned code: ${taobaoData.code}`;
        return {
          success: false,
          message: errorMsg,
          data: null,
        };
      }

      if (!taobaoData.data) {
        return {
          success: false,
          message: 'No data array in response',
          data: null,
        };
      }

      if (!Array.isArray(taobaoData.data)) {
        return {
          success: false,
          message: 'Response data is not an array',
          data: null,
        };
      }

      const items = taobaoData.data;

      if (items.length === 0) {
        return {
          success: true,
          data: { products: [] },
          message: 'No products found for this image',
        };
      }

      // Normalize Taobao response to match a simple product structure
      const normalizedProducts = items.map((item: any) => {
        // Taobao API returns price as string (e.g., "119.93")
        // Also check for coupon_price which is the discounted price
        const priceStr = item.price || item.coupon_price || '0';
        const price = parseFloat(priceStr);
        
        // Use coupon_price if available (discounted price), otherwise use regular price
        const finalPrice = item.coupon_price ? parseFloat(item.coupon_price) : price;
        const originalPrice = item.coupon_price ? price : price; // If coupon exists, original is the regular price


        // For title: use multi_language_info.title if available (translated title)
        // This will be in the requested language (ko, en, etc.)
        // Fallback to original title if multi_language_info is not available
        const translatedTitle = item.multi_language_info?.title || '';
        const originalTitle = item.title || '';
        
        // Use translated title if available, otherwise use original title
        // When language is 'en' (Chinese locale case), multi_language_info.title will be in English
        const title = translatedTitle || originalTitle;

        return {
          id: item.item_id?.toString() || '',
          title: title,
          titleOriginal: originalTitle,
          image: item.main_image_url || item.image || '',
          price: finalPrice,
          originalPrice: originalPrice,
          wholesalePrice: finalPrice,
          dropshipPrice: finalPrice,
          sales: item.sales || item.order_count || item.inventory || 0,
          rating: item.rating || item.star_rating || 0,
          repurchaseRate: '',
          createDate: new Date().toISOString(),
          modifyDate: new Date().toISOString(),
        };
      });

      // console.log('🔍 [Taobao ImageSearch API] Success:', {
      //   productsCount: normalizedProducts.length,
      //   sampleProduct: normalizedProducts[0] ? {
      //     id: normalizedProducts[0].id,
      //     title: normalizedProducts[0].title,
      //     price: normalizedProducts[0].price,
      //     originalPrice: normalizedProducts[0].originalPrice,
      //   } : null,
      // });

      return {
        success: true,
        data: { products: normalizedProducts, page, pageSize },
        message: 'Taobao image search products retrieved successfully',
      };
    } catch (error: any) {
      // console.error('🔍 [Taobao ImageSearch API] Error:', {
      //   message: error.message,
      //   responseStatus: error.response?.status,
      //   responseData: error.response?.data,
      //   bizErrorMsg: error.response?.data?.biz_error_msg,
      // });

      const errorMessage =
        error.response?.data?.biz_error_msg ||
        error.response?.data?.message ||
        error.message ||
        'Failed to perform Taobao image search';

      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Search products by keyword
  searchProductsByKeyword: async (
    keyword: string,
    source: string = '1688',
    country: string = 'en',
    page: number = 1,
    pageSize: number = 20,
    sort?: string,
    priceStart?: number,
    priceEnd?: number,
    filter?: string,
    requireAuth: boolean = true, // Only send token for search page query search
    sellerOpenId?: string,
  ): Promise<ApiResponse<any>> => {
    try {
      const token = requireAuth ? await getStoredToken() : null;

      // Special handling for Taobao search - use dedicated Taobao Global endpoint
      if (source === 'taobao') {
        const language =
          country === 'ko' ? 'ko' :
          country === 'zh' ? 'zh' :
          'en';

        // Build filter parameter in the correct format for Taobao API
        // Format: "min_price:300&max_price:5000" or single filter like "min_price:300"
        const filterParts: string[] = [];
        
        if (priceStart !== undefined) {
          filterParts.push(`min_price:${priceStart}`);
        }
        if (priceEnd !== undefined) {
          filterParts.push(`max_price:${priceEnd}`);
        }
        
        // Add any additional filter
        if (filter) {
          filterParts.push(filter);
        }
        
        const filterString = filterParts.length > 0 ? filterParts.join('&') : undefined;

        const taobaoParams = new URLSearchParams({
          keyword,
          page_no: page.toString(),
          page_size: pageSize.toString(),
          language,
        });

        // Add sort parameter if provided
        if (sort) {
          taobaoParams.append('sorce', sort); // Note: API uses 'sorce' parameter name
        }
        
        // Add seller ID if provided
        if (sellerOpenId) {
          taobaoParams.append('shop_id', sellerOpenId);
        }
        
        // Add filter parameter if there are filters
        if (filterString) {
          taobaoParams.append('filter', filterString);
        }

        const taobaoUrl = `${API_BASE_URL}/products/taobao-global/search?${taobaoParams.toString()}`;
        const signatureHeaders = await buildSignatureHeaders('GET', taobaoUrl);
        // console.log('🔍 [Taobao Search API] Request:', {
        //   url: taobaoUrl,
        //   keyword,
        //   page,
        //   pageSize,
        //   language,
        //   source,
        //   country,
        // });

        const taobaoHeaders: any = {
            'Content-Type': 'application/json',
            ...signatureHeaders,
        };
        if (token) {
          taobaoHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        const taobaoResponse = await axios.get(taobaoUrl, {
          headers: taobaoHeaders,
        });

        const taobaoData = taobaoResponse.data;

        // console.log('🔍 [Taobao Search API] Response:', {
        //   status: taobaoResponse.status,
        //   statusText: taobaoResponse.statusText,
        //   dataStructure: {
        //     hasData: !!taobaoData?.data,
        //     isArray: Array.isArray(taobaoData?.data),
        //     hasNestedData: !!taobaoData?.data?.data,
        //     isNestedArray: Array.isArray(taobaoData?.data?.data),
        //     hasStatus: !!taobaoData?.status,
        //     status: taobaoData?.status,
        //   },
        //   firstItem: taobaoData?.data?.[0] || taobaoData?.data?.data?.[0] || null,
        //   itemCount: taobaoData?.data?.length || taobaoData?.data?.data?.length || 0,
        // });

        // Handle different possible response structures
        // Structure 1: { status: 'success', data: { data: [...] } }
        // Structure 2: { data: [...] } (direct array)
        // Structure 3: { data: { data: [...] } } (nested)
        let items: any[] = [];
        
        if (taobaoData?.status === 'success' && taobaoData?.data?.data && Array.isArray(taobaoData.data.data)) {
          items = taobaoData.data.data;
        } else if (Array.isArray(taobaoData?.data)) {
          items = taobaoData.data;
        } else if (Array.isArray(taobaoData)) {
          items = taobaoData;
        } else if (taobaoData?.data?.data && Array.isArray(taobaoData.data.data)) {
          items = taobaoData.data.data;
        } else {
          // console.error('Taobao search API - Unexpected response structure:', taobaoData);
          return {
            success: false,
            message: 'No Taobao search data received or invalid response structure',
            data: null,
          };
        }

        // Normalize Taobao response to match existing search structure:
        // data.data.products + data.data.pagination so Search screens keep working.
        const normalizedProducts = items.map((item: any) => {
          const price = parseFloat(item.price || '0');

          return {
            id: item.item_id?.toString() || '',
            // Use localized title if available, otherwise fallback to original title
            title: item.multi_language_info?.title || item.title || '',
            titleOriginal: item.title || '',
            image: item.main_image_url || '',
            price: price,
            originalPrice: price,
            wholesalePrice: price,
            dropshipPrice: price,
            sales: 0,
            rating: 0,
            repurchaseRate: '',
            createDate: new Date().toISOString(),
            modifyDate: new Date().toISOString(),
          };
        });

        // Extract pagination info from response (handle different structures)
        const pageNo = taobaoData?.data?.page_no || taobaoData?.page_no || page;
        const pageSizeResp = taobaoData?.data?.page_size || taobaoData?.page_size || pageSize;

        const normalizedData = {
          data: {
            products: normalizedProducts,
            pagination: {
              page: pageNo,
              pageSize: pageSizeResp,
              totalPage: null, // Taobao API doesn't provide total pages
            },
          },
        };

        return {
          success: true,
          data: normalizedData,
          message: 'Taobao products retrieved successfully',
        };
      }
      
      // Default 1688 (and other platforms) search
      // Map locale codes to country codes for API
      // 'zh' (language code) should map to 'en' (country code) for Chinese
      const countryCode = country === 'zh' ? 'en' : country;
      
      const params = new URLSearchParams({
        keyword,
        source,
        country: countryCode,
        page: page.toString(),
        pageSize: pageSize.toString(),
        // sellerOpenId,
      });
      
      // Add optional parameters
      // if (sort) params.append('sort', sort);
      if (priceStart !== undefined) params.append('priceStart', priceStart.toString());
      if (priceEnd !== undefined) params.append('priceEnd', priceEnd.toString());
      if (filter) params.append('filter', filter);
      // console.log('🔍 [SearchProducts API] Request:', {
      //   url: `${API_BASE_URL}/products/search?${params.toString()}`,
      //   params: {
      //     keyword,
      //     source,
      //     country: countryCode,
      //     page: page.toString(),
      //     pageSize: pageSize.toString(),
      //     sellerOpenId,
      //     sort,
      //     priceStart,
      //     priceEnd,
      //     filter
      //   }
      // });
      const url = `${API_BASE_URL}/products/search?${params.toString()}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const headers: any = {
          'Content-Type': 'application/json',
          ...signatureHeaders,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await axios.get(url, {
        headers,
      });
      // console.log('🔍 [SearchProducts API] Response:', response.data);
      // Check if response data exists
      if (!response.data || !response.data.data || !response.data.data.products) {
        return {
          success: false,
          message: 'No products data received',
          data: null,
        };
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Products retrieved successfully',
      };
    } catch (error: any) {
      // console.error('🔍 [SearchProducts API] Error:', {
      //   // url: `${API_BASE_URL}/products/search?${params.toString()}`,
      //   error: error.message || 'Unknown error occurred'
      // });
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          message: error.response.data.message || `Failed to search products. Status: ${error.response.status}`,
          data: null,
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          message: 'Network error. Please check your connection and try again.',
          data: null,
        };
      } else {
        // Something else happened
        return {
          success: false,
          message: `Unexpected error: ${error.message || 'Unknown error occurred'}`,
          data: null,
        };
      }
    }
  },

  // Get new in products
  getNewInProducts: async (
    platform: string = '1688',
    country: string = 'en'
  ): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      
      const url = `${API_BASE_URL}/products/newin?platform=${platform}&country=${country}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      // console.log('🔍 [New In Products API] Request:', {
      //   url,
      //   platform,
      //   country,
      //   token,
      //   signatureHeaders,
      // });
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      // console.log('🔍 [New In Products API] Response:', response.data.products);
      if (!response.data || response.data.status !== 'success' || !response.data.data) {
        return {
          success: false,
          message: 'No products data received',
          data: null,
        };
      }
      
      return {
        success: true,
        data: response.data.data,
        message: 'New in products retrieved successfully',
      };
    } catch (error: any) {
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || `Failed to get new in products. Status: ${error.response.status}`,
          data: null,
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection and try again.',
          data: null,
        };
      } else {
        return {
          success: false,
          message: `Unexpected error: ${error.message || 'Unknown error occurred'}`,
          data: null,
        };
      }
    }
  },

  // Get product recommendations
  getRecommendations: async (
    country: string = 'en',
    outMemberId: string = 'dferg0001',
    beginPage: number = 1,
    pageSize: number = 20,
    platform: string = '1688'
  ): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      
      // Map locale codes to country codes for API
      // 'zh' (language code) should map to 'en' (country code) for Chinese
      const countryCode = country === 'zh' ? 'en' : country;
      
      // Build query parameters (outMemberId is required)
      const params = new URLSearchParams({
        country: countryCode,
        outMemberId: outMemberId || 'dferg0001', // Default to 'dferg0001' if not provided
        beginPage: beginPage.toString(),
        pageSize: pageSize.toString(),
      });
      
      // Updated API endpoint: /products/{platform}/recommendations
      const url = `${API_BASE_URL}/products/${platform}/recommendations?${params.toString()}`;
      // console.log('🔍 [Recommendations API] Request:', {
      //   url,
      //   params,
      //   token,
      // });

      const signatureHeaders = await buildSignatureHeaders('GET', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (!response.data || response.data.status !== 'success' || !response.data.data) {
        return {
          success: false,
          message: 'No recommendations data received',
          data: null,
        };
      }
      
      return {
        success: true,
        data: response.data.data,
        message: 'Recommendations retrieved successfully',
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        // Handle different error status codes
        let errorMessage = 'Failed to load recommendations';
        
        if (status === 500) {
          errorMessage = errorData?.message || 'Internal server error. Please try again later.';
        } else if (status === 401) {
          errorMessage = 'Authentication required. Please login again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (status === 404) {
          errorMessage = 'Recommendations not found.';
        } else if (status >= 400 && status < 500) {
          errorMessage = errorData?.message || `Request error (${status}). Please try again.`;
        } else if (status >= 500) {
          errorMessage = errorData?.message || 'Server error. Please try again later.';
        } else {
          errorMessage = errorData?.message || `Failed to get recommendations. Status: ${status}`;
        }
        
        return {
          success: false,
          message: errorMessage,
          data: null,
        };
      } else if (error.request) {
        console.log("[Recommendations] API returned: ", error.request)
        return {
          success: false,
          message: 'Network error. Please check your connection and try again.',
          data: null,
        };
      } else {
        return {
          success: false,
          message: `Unexpected error: ${error.message || 'Unknown error occurred'}`,
          data: null,
        };
      }
    }
  },

  // Get category tree (with caching)
  getCategoryTree: async (
    platform: string = '1688'
  ): Promise<ApiResponse<CategoriesTreeResponse | null>> => {
    try {
      // Check cache first
      const cacheKey = platform;
      if (categoryTreeCache[cacheKey]) {
        // console.log(`[CategoryCache] Using cached data for platform: ${platform}`);
        return {
          success: true,
          data: categoryTreeCache[cacheKey],
          message: 'Category tree retrieved from cache',
        };
      }

      // Cache miss - fetch from API
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/categories/tree?platform=${platform}`;
      
      const signatureHeaders = await buildSignatureHeaders('GET', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        // Save to cache
        categoryTreeCache[cacheKey] = response.data.data;
        // console.log(`[CategoryCache] Cached data for platform: ${platform}`);
        
        return {
          success: true,
          data: response.data.data,
          message: 'Category tree retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'No category tree data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get category tree';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get default categories
  getDefaultCategories: async (
    platform: string = '1688',
    skipCache: boolean = true
  ): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/categories/default?platform=${platform}&skipCache=${skipCache}`;
      
      const signatureHeaders = await buildSignatureHeaders('GET', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Default categories retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'No default categories data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get default categories';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get banners (for home/categories)
  getBanners: async (): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/banners`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      const payload = response.data;
      if (payload && (payload.status === 'success' || response.status === 200)) {
        // Backend may send: .data (array), .banners (array), .data.data, .data.banners
        const raw = payload.data ?? payload;
        const list =
          Array.isArray(payload.data) ? payload.data
          : Array.isArray(payload.banners) ? payload.banners
          : Array.isArray(raw?.data) ? raw.data
          : Array.isArray(raw?.banners) ? raw.banners
          : null;
        // console.log('🔍 [Banners API] Retrieved banners:', list);
        if (list && list.length > 0) {
          return {
            success: true,
            data: list,
            message: 'Banners retrieved successfully',
          };
        }
        // Empty array is still success
        if (list && list.length === 0) {
          return {
            success: true,
            data: [],
            message: 'Banners retrieved successfully',
          };
        }
      }

      return {
        success: false,
        message: 'No banner data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get banners';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get carousels for brand carousel section
  getCarousels: async (): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/carousels`;

      const signatureHeaders = await buildSignatureHeaders('GET', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (response.data && response.data.status === 'success' && response.data.data) {
        // API returns data as array directly, wrap it for consistency
        const carouselArray = Array.isArray(response.data.data) ? response.data.data : [];
        return {
          success: true,
          data: { carousels: carouselArray },
          message: 'Carousels retrieved successfully',
        };
      }

      return {
        success: false,
        message: 'No carousel data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get carousels';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get live commerce (hot items for Today's Deals)
  getLiveCommerce: async (): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/live-commerce`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      const payload = response.data;
      console.log('🔍 [Live Commerce API] Response:', payload.data.popularItems);
      if (payload && payload.status === 'success' && payload.data) {
        return {
          success: true,
          data: payload.data,
          message: 'Live commerce data retrieved successfully',
        };
      }

      return {
        success: false,
        message: payload?.message || 'No live commerce data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get live commerce';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get live-commerce seller detail
  getLiveCommerceSellerDetail: async (
    sellerId: string,
    params?: {
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<{
    liveSeller: any;
    items: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }>> => {
    try {
      const token = await getStoredToken();
      const queryParams = new URLSearchParams({
        page: (params?.page || 1).toString(),
        pageSize: (params?.pageSize || 20).toString(),
      });

      const url = `${API_BASE_URL}/live-commerce/sellers/${sellerId}?${queryParams.toString()}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      console.log('🔍 [Live Commerce Seller Detail API] Response:', url, response.data);
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Live-commerce seller detail retrieved successfully',
        };
      }

      return {
        success: false,
        message: response.data?.message || 'Failed to get live-commerce seller detail',
        data: null,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to get live-commerce seller detail';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Search live-commerce sellers
  searchLiveCommerceSellers: async (
    query: string,
    params?: {
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<{
    results: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  }>> => {
    try {
      const token = await getStoredToken();
      const queryParams = new URLSearchParams({
        q: query,
        page: (params?.page || 1).toString(),
        pageSize: (params?.pageSize || 20).toString(),
      });

      const url = `${API_BASE_URL}/live-commerce/search?${queryParams.toString()}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Live-commerce search completed successfully',
        };
      }

      return {
        success: false,
        message: response.data?.message || 'Failed to search live-commerce sellers',
        data: null,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to search live-commerce sellers';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get top level categories
  getTopCategories: async (
    platform: string = '1688'
  ): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      
      // Always use 'platform' parameter for both 1688 and taobao
      const url = `${API_BASE_URL}/categories/top?platform=${platform}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Top categories retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'No top categories data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get top categories';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get child categories by parent ID
  getChildCategories: async (
    platform: string = '1688',
    parentId: string
  ): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      const signatureHeaders = await buildSignatureHeaders('GET', `${API_BASE_URL}/categories/children?platform=${platform}&parentId=${parentId}`);
      // Always use 'platform' parameter for both 1688 and taobao
      const url = `${API_BASE_URL}/categories/children?platform=${platform}&parentId=${parentId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Child categories retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'No child categories data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get child categories';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Dedicated Taobao search method
  searchTaobao: async (
    keyword: string,
    pageNo: number = 1,
    pageSize: number = 20,
    language: string = 'en',
    sortBy?: string,
    minPrice?: number,
    maxPrice?: number,
    filter?: string
  ): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      
      // Build filter parameter in the correct format for Taobao API
      // Format: "min_price:300&max_price:5000" or single filter like "min_price:300"
      const filterParts: string[] = [];
      
      if (minPrice !== undefined) {
        filterParts.push(`min_price:${minPrice}`);
      }
      if (maxPrice !== undefined) {
        filterParts.push(`max_price:${maxPrice}`);
      }
      if (filter) {
        filterParts.push(filter);
      }
      
      const filterString = filterParts.length > 0 ? filterParts.join('&') : undefined;

      const taobaoParams = new URLSearchParams({
        keyword,
        page_no: pageNo.toString(),
        page_size: pageSize.toString(),
        language,
      });

      // Add sort parameter if provided (using 'sorce' as per API specification)
      if (sortBy) {
        taobaoParams.append('sorce', sortBy);
      }
      
      // Add filter parameter if there are filters
      if (filterString) {
        taobaoParams.append('filter', filterString);
      }

      const url = `${API_BASE_URL}/products/taobao-global/search?${taobaoParams.toString()}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const headers: any = {
        'Content-Type': 'application/json',
        ...signatureHeaders,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(url, { headers });
      const taobaoData = response.data;

      // Handle different possible response structures
      let items: any[] = [];
      
      if (taobaoData?.status === 'success' && taobaoData?.data?.data && Array.isArray(taobaoData.data.data)) {
        items = taobaoData.data.data;
      } else if (Array.isArray(taobaoData?.data)) {
        items = taobaoData.data;
      } else if (Array.isArray(taobaoData)) {
        items = taobaoData;
      } else if (taobaoData?.data?.data && Array.isArray(taobaoData.data.data)) {
        items = taobaoData.data.data;
      } else {
        return {
          success: false,
          message: 'No Taobao search data received or invalid response structure',
          data: null,
        };
      }

      // Normalize Taobao response to match existing search structure
      const normalizedProducts = items.map((item: any) => {
        const price = parseFloat(item.price || '0');

        return {
          id: item.item_id?.toString() || '',
          title: item.multi_language_info?.title || item.title || '',
          titleOriginal: item.title || '',
          image: item.main_image_url || '',
          price: price,
          originalPrice: price,
          wholesalePrice: price,
          dropshipPrice: price,
          sales: item.inventory || 0,
          rating: 0,
          repurchaseRate: '',
          createDate: new Date().toISOString(),
          modifyDate: new Date().toISOString(),
          shop_name: item.shop_name || '',
        };
      });

      // Extract pagination info from response
      const pageNoResp = taobaoData?.data?.page_no || pageNo;
      const pageSizeResp = taobaoData?.data?.page_size || pageSize;

      const normalizedData = {
        data: {
          products: normalizedProducts,
          pagination: {
            page: pageNoResp,
            pageSize: pageSizeResp,
            totalPage: null,
          },
        },
      };

      return {
        success: true,
        data: normalizedData,
        message: 'Taobao products retrieved successfully',
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to search Taobao products';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get product detail
  getProductDetail: async (
    productId: string,
    source: string = '1688',
    country: string = 'en'
  ): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();

      // Special handling for Taobao product detail - use dedicated Taobao Global endpoint
      if (source === 'taobao') {
        const language =
          country === 'ko' ? 'ko' :
          country === 'zh' ? 'zh' :
          'en';

        const taobaoUrl = `${API_BASE_URL}/products/taobao-global/${productId}/detail?item_resource=Taobao&language=${language}`;

        // console.log('📦 [Taobao Product Detail API] Request:', {
        //   url: taobaoUrl,
        //   productId,
        //   productIdType: typeof productId,
        //   source,
        //   country,
        //   language,
        // });
        const signatureHeaders = await buildSignatureHeaders('GET', taobaoUrl);
        const taobaoResponse = await axios.get(taobaoUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...signatureHeaders,
          },
        }).catch((error) => {
          // console.error('📦 [Taobao Product Detail API] Error:', {
          //   message: error.message,
          //   response: error.response?.data,
          //   status: error.response?.status,
          //   statusText: error.response?.statusText,
          //   url: error.config?.url,
          //   productId,
          // });
          throw error;
        });

        const taobaoData = taobaoResponse.data;

        // console.log('📦 [Taobao Product Detail API] Response:', {
        //   status: taobaoResponse.status,
        //   statusText: taobaoResponse.statusText,
        //   hasData: !!taobaoData,
        //   biz_error_code: taobaoData?.biz_error_code,
        //   biz_error_msg: taobaoData?.biz_error_msg,
        //   hasDataField: !!taobaoData?.data,
        //   dataKeys: taobaoData?.data ? Object.keys(taobaoData.data) : [],
        // });

        if (!taobaoData || taobaoData.biz_error_code !== null || !taobaoData.data) {
          // console.error('📦 [Taobao Product Detail API] Validation failed:', {
          //   hasData: !!taobaoData,
          //   biz_error_code: taobaoData?.biz_error_code,
          //   biz_error_msg: taobaoData?.biz_error_msg,
          //   hasDataField: !!taobaoData?.data,
          // });
          return {
            success: false,
            message: taobaoData?.biz_error_msg || 'Failed to get Taobao product detail',
            data: null,
          };
        }

        // Return raw Taobao detail data; normalization is handled in ProductDetailScreen
        return {
          success: true,
          data: taobaoData.data,
          message: 'Taobao product detail retrieved successfully',
        };
      }

      // OwnMall product detail - uses dedicated endpoint
      const isOwnMall = source === 'ownmall' || source === 'companymall' || source === 'myCompany' || source === 'live-commerce' || source?.toLowerCase() === 'mycompany';
      if (isOwnMall) {
        const ownMallUrl = `${API_BASE_URL}/own-mall/products/${productId}`;
        const signatureHeaders = await buildSignatureHeaders('GET', ownMallUrl);
        const ownMallResponse = await axios.get(ownMallUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...signatureHeaders,
          },
        });
        console.log('📦 [OwnMall Product Detail API] Response:', ownMallUrl, ownMallResponse.data);
        if (ownMallResponse.data?.status === 'success' && ownMallResponse.data?.data?.product) {
          const ownProduct = ownMallResponse.data.data.product;
          // Ensure offerId is numeric — fall back to productId route param
          const rawOfferId = ownProduct.offerId ?? ownProduct.productData?.offerId;
          const numericOfferId = typeof rawOfferId === 'number' ? rawOfferId : parseInt(String(rawOfferId), 10);
          const safeOfferId = !isNaN(numericOfferId) && numericOfferId > 0 ? numericOfferId : parseInt(String(productId), 10) || 0;

          // Normalize ownmall SKU pricing into standard fields
          const normalizedSkuInfos = (ownProduct.productData?.productSkuInfos || []).map((sku: any) => {
            const salePrice = sku.salePriceKrw ?? sku.salePrice ?? (parseFloat(sku.consignPrice) || 0);
            const tagPrice = sku.tagPriceKrw ?? sku.tagPrice ?? salePrice;
            return {
              ...sku,
              consignPrice: String(salePrice),
              price: String(salePrice),
              fenxiaoPriceInfo: { offerPrice: String(tagPrice) },
            };
          });

          // Normalize priceRangeList to use ownmall prices
          const firstSkuPrice = normalizedSkuInfos[0]?.consignPrice || '0';
          const normalizedSaleInfo = {
            ...ownProduct.productData?.productSaleInfo,
            priceRangeList: [{ price: firstSkuPrice, startQuantity: 1 }],
          };

          // Use localized title if available
          const localizedTitle = country === 'zh' ? (ownProduct.titleZh || ownProduct.productData?.subject)
            : country === 'ko' ? (ownProduct.titleKo || ownProduct.productData?.subjectTrans)
            : (ownProduct.titleEn || ownProduct.productData?.subjectTrans);

          // Normalize to same structure as 1688 response
          return {
            success: true,
            data: {
              product: {
                ...ownProduct.productData,
                offerId: safeOfferId,
                source: ownProduct.source || 'ownmall',
                _id: ownProduct._id,
                // Root-level fields not in productData
                companyName: ownProduct.companyName || '',
                sellerOpenId: ownProduct.sellerOpenId || '',
                promotionUrl: ownProduct.promotionUrl || '',
                tradeScore: ownProduct.sellerRating || 0,
                soldOut: String(ownProduct.soldAmount || 0),
                // Localized titles
                subject: ownProduct.productData?.subject || localizedTitle || '',
                subjectTrans: localizedTitle || ownProduct.productData?.subjectTrans || '',
                // Normalized pricing
                productSkuInfos: normalizedSkuInfos,
                productSaleInfo: normalizedSaleInfo,
                // Status fields
                displayStatus: ownProduct.displayStatus,
                isBestSeller: ownProduct.isBestSeller,
                isFeatured: ownProduct.isFeatured,
                isNewArrival: ownProduct.isNewArrival,
                ownMallCategoryId: ownProduct.ownMallCategoryId,
                salesStatus: ownProduct.salesStatus,
              },
            },
            message: 'OwnMall product detail retrieved successfully',
          };
        }

        return {
          success: false,
          message: ownMallResponse.data?.message || 'Failed to get OwnMall product detail',
          data: null,
        };
      }

      // Default 1688 (and other platforms) product detail
      const params = new URLSearchParams({
        productId,
        source,
        country,
      });

      const url = `${API_BASE_URL}/products/detail?${params.toString()}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      console.log('📦 [Product Detail API] Request:', {
        url,
        productId,
        source,
        country,
      });
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      // Check if response data exists
      if (!response.data || !response.data.data || !response.data.data.product) {
        return {
          success: false,
          message: 'No product detail data received',
          data: null,
        };
      }
      
      return {
        success: true,
        data: response.data.data,
        message: 'Product detail retrieved successfully',
      };
    } catch (error: any) {
      console.error('Get product detail error:', error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : error.request ? {
        status: error.request.status,
        statusText: error.request.statusText,
        data: error.request.data
      } : error);

      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || `Failed to get product detail. Status: ${error.response.status}`,
          data: null,
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection and try again.',
          data: null,
        };
      } else {
        return {
          success: false,
          message: `Unexpected error: ${error.message || 'Unknown error occurred'}`,
          data: null,
        };
      }
    }
  },

  // Get related recommendations
  getRelatedRecommendations: async (
    productId: string,
    pageNo: number = 1,
    pageSize: number = 10,
    language: string = 'en',
    source: string = '1688'
  ): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();

      let url: string;
      let response;

      if (source === 'taobao') {
        // Taobao related recommend API:
        // GET /products/taobao-global/recommend-similar?itemId=xxx&language=ko
        const params = new URLSearchParams({
          itemId: productId,
          language,
        });
        url = `${API_BASE_URL}/products/taobao-global/recommend-similar?${params.toString()}`;
        const signatureHeaders = await buildSignatureHeaders('GET', url);
        response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...signatureHeaders,
          },
        });

        const taobaoData = response.data;

        if (!Array.isArray(taobaoData)) {
          return {
            success: false,
            message: 'No related recommendations data received',
            data: null,
          };
        }

        // Normalize Taobao response to a common shape
        return {
          success: true,
          data: {
            recommendations: taobaoData,
            pagination: {
              pageNo: 1,
              pageSize: taobaoData.length,
              totalRecords: taobaoData.length,
            },
          },
          message: 'Related recommendations retrieved successfully',
        };
      }

      // Default 1688 / other platforms
      const params = new URLSearchParams({
        pageNo: pageNo.toString(),
        pageSize: pageSize.toString(),
        language,
      });

      url = `${API_BASE_URL}/products/${productId}/related-recommendations?${params.toString()}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      // Check if response data exists
      if (!response.data || !response.data.data || !response.data.data.recommendations) {
        return {
          success: false,
          message: 'No related recommendations data received',
          data: null,
        };
      }
      
      return {
        success: true,
        data: response.data.data,
        message: 'Related recommendations retrieved successfully',
      };
    } catch (error: any) {
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || `Failed to get related recommendations. Status: ${error.response.status}`,
          data: null,
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'Network error. Please check your connection and try again.',
          data: null,
        };
      } else {
        return {
          success: false,
          message: `Unexpected error: ${error.message || 'Unknown error occurred'}`,
          data: null,
        };
      }
    }
  },

  // Get wishlist count for a product
  getWishlistCount: async (
    externalId: string,
    source: string = '1688'
  ): Promise<ApiResponse<{ externalId: string; source: string; count: number } | null>> => {
    try {
      const token = await getStoredToken();
      const params = new URLSearchParams({
        externalId,
        source,
      });
      
      const url = `${API_BASE_URL}/products/wishlist/count?${params.toString()}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Wishlist count retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'No wishlist count data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get wishlist count';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Autocomplete categories
  getAutocompleteSuggestions: async (
    query: string,
    limit: number = 20
  ): Promise<ApiResponse<{
    suggestions: string[];
    query: string;
    count: number;
  }>> => {
    try {
      if (!query || query.trim().length === 0) {
        return {
          success: false,
          message: 'Query is required',
          data: null,
        };
      }

      const url = `${API_BASE_URL}/products/autocomplete/categories`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        params: {
          q: query.trim(),
          limit: limit,
        },
        headers: {
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });

      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: {
            suggestions: response.data.data.suggestions || [],
            query: response.data.data.query || query,
            count: response.data.data.count || 0,
          },
        };
      }

      return {
        success: false,
        message: 'No autocomplete suggestions received',
        data: null,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch autocomplete suggestions',
        data: null,
      };
    }
  },

  // Get recently viewed products
  getRecentlyViewedProducts: async (
    limit: number = 20
  ): Promise<ApiResponse<{
    items: Array<{
      productId: string;
      source: string;
      viewedAt: string;
      photoUrl: string;
      title: string;
      price: number;
      platform: string;
    }>;
  }>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/products/recently-viewed?limit=${limit}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Recently viewed products retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'No recently viewed products data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get recently viewed products';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Delete recently viewed product
  deleteRecentlyViewedProduct: async (
    productId: string,
    source: string
  ): Promise<ApiResponse<{ removed: boolean }>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/products/recently-viewed?productId=${productId}&source=${source}`;
      const signatureHeaders = await buildSignatureHeaders('DELETE', url);
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Product removed from recently viewed successfully',
        };
      }
      
      return {
        success: false,
        message: 'Failed to remove product from recently viewed',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete recently viewed product';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get followed stores
  getFollowedStores: async (
    filter?: 'followed' | 'frequently_visited' | 'shoped_store'
  ): Promise<ApiResponse<{
    items: Array<{
      storeId: string;
      storeName: string;
      platform: string;
      defaultItems: Array<{
        offerId: string;
        title: string;
        photoUrl: string;
        price: number;
      }>;
      visitedCount: number;
      followedAt: string;
      hasShoped: boolean;
    }>;
  }>> => {
    try {
      const token = await getStoredToken();
      let url = `${API_BASE_URL}/follow-stores`;
      
      if (filter) {
        url += `?filter=${filter}`;
      }
      
      const signatureHeaders = await buildSignatureHeaders('GET', url);

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Followed stores retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'No followed stores data received',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get followed stores';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Follow/Unfollow store
  toggleFollowStore: async (
    storeId: string,
    platform: string,
    action: 'follow' | 'unfollow'
  ): Promise<ApiResponse<{ followed: boolean }>> => {
    try {
      const token = await getStoredToken();
      
      let response;
      
      if (action === 'unfollow') {
        // Use POST method with request body for unfollow
        const url = `${API_BASE_URL}/follow-stores/unfollow`;
        const signatureHeaders = await buildSignatureHeaders('POST', url, {
          storeId,
          platform,});
        response = await axios.post(url, {
          storeId,
          platform,
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...signatureHeaders,
          },
        });
      } else {
        // Use POST method for follow
        const url = `${API_BASE_URL}/follow-stores/follow`;
        const signatureHeaders = await buildSignatureHeaders('POST', url, {
          storeId,
          platform,
        });
        response = await axios.post(url, {
          storeId,
          platform,
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...signatureHeaders,
          },
        });
      }
      
      if (response.data && response.data.status === 'success') {
        return {
          success: true,
          data: { followed: action === 'follow' },
          message: `Store ${action === 'follow' ? 'followed' : 'unfollowed'} successfully`,
        };
      }
      
      return {
        success: false,
        message: `Failed to ${action} store`,
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || `Failed to ${action} store`;
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Follow store with product details (from product detail page)
  followStoreWithProducts: async (
    shopId: string,
    shopName: string,
    products: Array<{
      offerId: string;
      title: string;
      imageUrl: string;
      price: string | number;
    }>,
    platform?: string
  ): Promise<ApiResponse<{
    followed: boolean;
    storeId: string;
    storeName: string;
    platform: string;
    defaultItems: Array<{
      offerId: string;
      title: string;
      photoUrl: string;
      price: number;
    }>;
    visitedCount: number;
  }>> => {
    try {
      const token = await getStoredToken();
      const url = `${API_BASE_URL}/follow-stores`;
      
      const requestBody: any = {
        shopId,
        shopName,
        products,
      };
      
      // Add platform if provided
      if (platform) {
        requestBody.platform = platform;
      }
      const signatureHeaders = await buildSignatureHeaders('POST', url, requestBody);
      const response = await axios.post(url, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Store followed successfully',
        };
      }
      
      return {
        success: false,
        message: 'Failed to follow store',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to follow store';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get seller products for 1688
  get1688SellerProducts: async (
    sellerOpenId: string,
    params?: {
      beginPage?: number;
      pageSize?: number;
      country?: string;
      sort?: string;
      keyword?: string;
      priceStart?: number;
      priceEnd?: number;
    }
  ): Promise<ApiResponse<{
    products: any[];
    pagination: {
      totalRecords: number;
      totalPage: number;
      pageSize: number;
      currentPage: number;
    };
  }>> => {
    try {
      const token = await getStoredToken();
      const queryParams = new URLSearchParams({
        sellerOpenId,
        beginPage: (params?.beginPage || 1).toString(),
        pageSize: (params?.pageSize || 20).toString(),
        country: params?.country || 'en',
        ...(params?.sort && { sort: params.sort }),
        ...(params?.keyword && { keyword: params.keyword }),
        ...(params?.priceStart && { priceStart: params.priceStart.toString() }),
        ...(params?.priceEnd && { priceEnd: params.priceEnd.toString() }),
      });

      const url = `${API_BASE_URL}/products/1688/seller-offers?${queryParams}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Seller products retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'Failed to get seller products',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get seller products';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },

  // Get seller products for Taobao
  getTaobaoSellerProducts: async (
    shopId: string,
    params?: {
      page_no?: number;
      page_size?: number;
      language?: string;
      keyword?: string;
      sort?: string;
      filters?: string[];
    }
  ): Promise<ApiResponse<{
    data: any[];
    page_no: number;
    page_size: number;
  }>> => {
    try {
      const token = await getStoredToken();
      const queryParams = new URLSearchParams({
        shop_id: shopId,
        page_no: (params?.page_no || 1).toString(),
        page_size: (params?.page_size || 20).toString(),
        language: params?.language || 'en',
        ...(params?.keyword && { keyword: params.keyword }),
        ...(params?.sort && { sort: params.sort }),
      });

      // Add filters if provided
      if (params?.filters && params.filters.length > 0) {
        queryParams.append('filters', JSON.stringify(params.filters));
      }

      const url = `${API_BASE_URL}/products/taobao-global/search?${queryParams}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...signatureHeaders,
        },
      });
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          message: 'Seller products retrieved successfully',
        };
      }
      
      return {
        success: false,
        message: 'Failed to get seller products',
        data: null,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get seller products';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  },
};

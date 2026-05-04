import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
  TextInput,
  Animated,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList, Product } from '../../../types';
import { ProductCard, Button, SortDropdown, PriceFilterModal } from '../../../components';
import { usePlatformStore } from '../../../store/platformStore';
import { useAppSelector } from '../../../store/hooks';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSearchProductsMutation } from '../../../hooks/useSearchProductsMutation';
import { useToast } from '../../../context/ToastContext';
import { convertFromKRW } from '../../../utils/i18nHelpers';
import { sortProducts } from '../../../utils/productSort';
import { useWishlistStatus } from '../../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../../hooks/useDeleteFromWishlistMutation';
import { useAuth } from '../../../context/AuthContext';
import ArrowBackIcon from '../../../assets/icons/ArrowBackIcon';
import ViewListIcon from '../../../assets/icons/ViewListIcon';
import TuneIcon from '../../../assets/icons/TuneIcon';
import Icon from '../../../components/Icon';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 2 - SPACING.sm) / 2;

type ProductDiscoveryScreenRouteProp = RouteProp<RootStackParamList, 'ProductDiscovery'>;
type ProductDiscoveryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductDiscovery'>;

const ProductDiscoveryScreen: React.FC = () => {
  const route = useRoute<ProductDiscoveryScreenRouteProp>();
  const navigation = useNavigation<ProductDiscoveryScreenNavigationProp>();
  // Use wishlist status hook to check if products are liked based on external IDs
  const { isProductLiked, refreshExternalIds, addExternalId, removeExternalId } = useWishlistStatus();
  const { user, isGuest } = useAuth();
  const { showToast } = useToast();
  
  const { subCategoryName, categoryId, categoryName, subcategoryId, subsubcategories: passedSubSubCategories, source: routeSource } = route.params;
  
  // Search context removed - using local state
  const [searchQuery, setSearchQuery] = useState<string>(subCategoryName || categoryName || '');
  const [selectedSort, setSelectedSort] = useState<string>('best_match'); // Default to 'best_match' (best match)
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState<string | null>(null);
  const [displaySubSubCategories, setDisplaySubSubCategories] = useState<any[]>([]);
  
  // Get Zustand store
  const { getCompanyCategories, getSubSubcategoriesFromTree, selectedPlatform, setSelectedPlatform, setCategoriesTree } = usePlatformStore();
  
  // Get locale from Redux store
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { t } = useTranslation();
  
  // Sort options for dropdown (defined after t function)
  const sortOptions = useMemo(() => [
    { label: t('search.sortOptions.bestMatch'), value: 'best_match' },
    { label: t('search.sortOptions.priceHigh'), value: 'price_high' },
    { label: t('search.sortOptions.priceLow'), value: 'price_low' },
    { label: t('search.sortOptions.highSales'), value: 'high_sales' },
    { label: t('search.sortOptions.lowSales'), value: 'low_sales' },
  ], [t]);
  
  // Update selectedPlatform when routeSource is provided (from navigation params)
  useEffect(() => {
    if (routeSource) {
      setSelectedPlatform(routeSource);
      // console.log('[ProductDiscoveryScreen] Platform set from route params:', routeSource);
    }
  }, [routeSource, setSelectedPlatform]);
  
  // Map company name to platform/source parameter
  const getPlatformFromCompany = useCallback((company: string): string => {
    if (company === t('home.all')) {
      return '1688';
    }
    // Convert company name to lowercase for API (e.g., "Taobao" -> "taobao")
    return company.toLowerCase();
  }, [t]);
  
  // Company selection state - hidden on ProductDiscoveryScreen, but keep for internal use
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>(t('home.all'));
  
  // Add to wishlist mutation
  const { mutate: addToWishlist } = useAddToWishlistMutation({
    onSuccess: async (data) => {
      // console.log('Product added to wishlist successfully:', data);
      showToast(t('search.messages.productAddedToWishlist'), 'success');
      // Immediately refresh external IDs to update heart icon color
      await refreshExternalIds();
    },
    onError: (error) => {
      // console.error('Failed to add product to wishlist:', error);
      showToast(error || t('search.messages.failedToAddToWishlist'), 'error');
    },
  });

  // Delete from wishlist mutation
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation({
    onSuccess: async (data) => {
      // console.log('Product removed from wishlist successfully:', data);
      showToast(t('search.messages.productRemovedFromWishlist'), 'success');
      // Immediately refresh external IDs to update heart icon color
      await refreshExternalIds();
    },
    onError: (error) => {
      // console.error('Failed to remove product from wishlist:', error);
      showToast(error || t('search.messages.failedToRemoveFromWishlist'), 'error');
    },
  });
  
  // Toggle wishlist function
  const toggleWishlist = async (product: any) => {
    if (!user || isGuest) {
      showToast(t('search.messages.pleaseLogin'), 'warning');
      return;
    }

    // Get product external ID - prioritize externalId, never use MongoDB _id
    const externalId = 
      (product as any).externalId?.toString() ||
      (product as any).offerId?.toString() ||
      '';

    if (!externalId) {
      showToast(t('search.messages.invalidProductId'), 'error');
      return;
    }

    const isLiked = isProductLiked(product);
    const source = (product as any).source || selectedPlatform || '1688';
    const country = locale || 'en';

    if (isLiked) {
      // Remove from wishlist - optimistic update (removes from state and AsyncStorage immediately)
      await removeExternalId(externalId);
      deleteFromWishlist(externalId);
    } else {
      // Add to wishlist - extract required fields from product
      const imageUrl = product.image || product.images?.[0] || '';
      const price = product.price || 0;
      const title = product.name || product.title || '';

      if (!imageUrl || !title || price <= 0) {
        showToast(t('search.messages.invalidProductData'), 'error');
        return;
      }

      // Optimistic update - add to state and AsyncStorage immediately
      await addExternalId(externalId);
      addToWishlist({ offerId: externalId, platform: source });
    }
  };

  // Helper function to navigate to product detail
  const navigateToProductDetail = async (
    productId: string | number,
    source: string = selectedPlatform,
    country: string = locale
  ) => {
    navigation.navigate('ProductDetail', {
      productId: productId.toString(),
      source: source,
      country: country,
    });
  };

  // Load subsubcategories based on navigation params
  useEffect(() => {
    if (passedSubSubCategories && passedSubSubCategories.length > 0) {
      // Coming from a specific subcategory with subsubcategories
      // Ensure names are in the correct locale
      const localizedSubSubCategories = passedSubSubCategories.map((subSubCat: any) => {
        // If name is an object with zh, en, ko, extract the correct locale
        if (subSubCat.name && typeof subSubCat.name === 'object') {
          return {
            ...subSubCat,
            name: subSubCat.name[locale] || subSubCat.name.en || subSubCat.name
          };
        }
        // If it's already a string, use it as is
        return subSubCat;
      });
      setDisplaySubSubCategories(localizedSubSubCategories);
    } else if (categoryId && subcategoryId) {
      // Coming from a specific subcategory - get subsubcategories from tree
      try {
        const subSubCategories = getSubSubcategoriesFromTree(categoryId, subcategoryId, locale);
        if (subSubCategories && subSubCategories.length > 0) {
          setDisplaySubSubCategories(subSubCategories);
        } else {
          // No subsubcategories found, show "All" item
          setDisplaySubSubCategories([{
            id: 'all',
            name: t('home.all'),
          }]);
        }
      } catch (error) {
        // console.error('Error getting subsubcategories:', error);
        // On error, show "All" item
        setDisplaySubSubCategories([{
          id: 'all',
          name: t('home.all'),
        }]);
      }
    } else if (categoryId) {
      // Coming from "All categories" - get all subsubcategories from the category
      try {
        const companyCategories = getCompanyCategories(locale);
        const category = companyCategories.find((cat: any) => cat.id === categoryId);
        
        if (category && category.children) {
          // Collect all subsubcategories from all subcategories using tree structure
          const allSubSubCategories: any[] = [];
          category.children.forEach((subcat: any) => {
            if (subcat.children && subcat.children.length > 0) {
              allSubSubCategories.push(...subcat.children.map((item: any) => ({
                id: item._id || item.id,
                name: item.name?.[locale] || item.name?.en || item.name,
              })));
            }
          });
          if (allSubSubCategories.length > 0) {
            setDisplaySubSubCategories(allSubSubCategories);
          } else {
            // No subsubcategories found, show "All" item
            setDisplaySubSubCategories([{
              id: 'all',
              name: t('home.all'),
            }]);
          }
        } else {
          // No category found, show "All" item
          setDisplaySubSubCategories([{
            id: 'all',
            name: t('home.all'),
          }]);
        }
      } catch (error) {
        // console.error('Error getting subsubcategories from category:', error);
        // On error, show "All" item
        setDisplaySubSubCategories([{
          id: 'all',
          name: t('home.all'),
        }]);
      }
    } else {
      // No category or subcategory provided, show "All" item
      setDisplaySubSubCategories([{
        id: 'all',
        name: t('home.all'),
      }]);
    }
  }, [categoryId, subcategoryId, passedSubSubCategories, locale]);
  
  // Initialize searchQuery with subcategory name on mount
  useEffect(() => {
    const categoryNameToUse = subCategoryName || categoryName || '';
    if (categoryNameToUse && !searchQuery) {
      setSearchQuery(categoryNameToUse);
    }
  }, [subCategoryName, categoryName]);

  // Auto-select "All" when it's the only option
  useEffect(() => {
    if (displaySubSubCategories.length === 1 && displaySubSubCategories[0]?.id === 'all') {
      setSelectedSubSubCategory(null); // null means "All" is selected
    }
  }, [displaySubSubCategories]);
  
  // States
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unsortedProducts, setUnsortedProducts] = useState<Product[]>([]); // Store original unsorted products
  const [stores, setStores] = useState<any[]>([]); // Store stores data
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(1); // Use offset instead of page
  const [activeCategoryTab, setActiveCategoryTab] = useState<string | null>(subCategoryName === t('home.viewAll') ? null : subCategoryName);
  const [refreshing, setRefreshing] = useState(false); // Add refreshing state
  const [categoryLoading, setCategoryLoading] = useState(false); // Add category loading state
  
  // Refs
  const isLoadingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null); // Add FlatList ref
  const isRefreshingRef = useRef(false); // Add refreshing ref
  const dataLoadedRef = useRef(false); // Track if data has been loaded to prevent re-initialization
  const lastParamsKeyRef = useRef<string>(''); // Track route params to detect changes
  const scrollY = useRef(new Animated.Value(0)).current;
  const SCROLL_THRESHOLD = 5;
  
  // Modal states
  const [priceFilterModalVisible, setPriceFilterModalVisible] = useState(false);
  
  // Filter states (for price filter modal)
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  
  // Category state
  const categoryScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  // Add useEffect to refresh wishlist when component mounts
  // On mount, just ensure externalIds are loaded (handled inside useWishlistStatus)
  useEffect(() => {
    // No explicit refreshWishlist here; useWishlistStatus loads from storage on mount/auth change
  }, []);

  // Memoize categories for performance
  const memoizedCategories = useMemo(() => categories, [categories]);
  const memoizedCategoryIds = useMemo(() => categoryIds, [categoryIds]);

  
  // Load products when subcategory is available and there are no subsubcategories
  useEffect(() => {
    // If we have a subcategoryId, no subsubcategories, and no products yet, load products for the subcategory
    if (subcategoryId && displaySubSubCategories.length === 0 && products.length === 0 && !categoryLoading && !isLoadingRef.current) {
      // console.log('Loading products for subcategory (no subsubcategories):', subcategoryId);
      loadProducts(selectedSort || 'popularity', 1);
    }
  }, [subcategoryId, displaySubSubCategories.length, products.length, categoryLoading]);

  // Load products when selectedSubSubCategory changes or on initial load
  useEffect(() => {
    // Create a key from route params to detect if they changed
    const currentKey = `${subCategoryName}-${categoryId}-${subcategoryId}-${selectedSubSubCategory}-${selectedPlatform}-${locale}`;
    
    // Reset ref if route params changed (new category/subcategory selected)
    if (lastParamsKeyRef.current !== currentKey) {
      dataLoadedRef.current = false;
      lastParamsKeyRef.current = currentKey;
    }
    
    // Don't reload if data is already loaded and params haven't changed (preserves state when navigating back)
    if (dataLoadedRef.current && products.length > 0) {
      return;
    }
    
    if (subCategoryName) {
      // Reset to first page and reload products when subsubcategory selection changes
      setOffset(1);
      setHasMore(true);
      setProducts([]);
      setUnsortedProducts([]);
      loadProducts(selectedSort || 'popularity', 1);
    }
  }, [selectedSubSubCategory, subCategoryName, displaySubSubCategories, categoryId, subcategoryId, selectedPlatform, locale]);

  // Update indicator position when active category changes
  useEffect(() => {
    if (activeCategoryTab && memoizedCategories.length > 0) {
      const index = memoizedCategories.indexOf(activeCategoryTab);
      if (index !== -1 && tabLayouts.current[index]) {
        const layout = tabLayouts.current[index];
        Animated.parallel([
          Animated.timing(indicatorX, { 
            toValue: layout.x, 
            duration: 150, 
            useNativeDriver: false 
          }),
          Animated.timing(indicatorW, { 
            toValue: layout.width, 
            duration: 150, 
            useNativeDriver: false 
          }),
        ]).start();
      }
    }
  }, [activeCategoryTab, memoizedCategories]);


  // Debounce search queries to avoid excessive API calls
  useEffect(() => {
    // Skip debounce when category changes
    if (activeCategoryTab && !searchQuery) {
      // Reset to first page when category changes
      setOffset(1);
      setHasMore(true);
      // Don't call loadProducts here as it's called in the category change effect
      return;
    }
    
    // Prevent loading when refreshing
    if (isRefreshingRef.current) {
      // console.log('Skipping search query effect during refresh');
      return;
    }
    
    const handler = setTimeout(() => {
      if (activeCategoryTab) {
        // Reset to first page when category changes
        setOffset(1);
        setHasMore(true);
        // Don't show loading spinner
        loadProducts(selectedSort, offset); // Use the sort from context
      } else {
        // Load all products when no category is selected
        setOffset(1);
        setHasMore(true);
        // Don't show loading spinner
        loadProducts(selectedSort, offset); // Load all products
      }
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, activeCategoryTab]);

  // Apply sorting when selectedSort changes
  useEffect(() => {
    if (unsortedProducts.length > 0) {
      const sorted = sortProducts(unsortedProducts, selectedSort);
      setProducts(sorted);
    }
  }, [selectedSort, unsortedProducts]);

  // Load more products when offset changes (infinite scroll)
  useEffect(() => {
    // console.log('Offset changed to:', offset);
    // Prevent loading more data when refreshing
    if (isRefreshingRef.current) {
      // console.log('Skipping offset effect during refresh');
      return;
    }
    
    if (offset > 1) {
      // console.log('Loading more products for offset:', offset);
      loadProducts(selectedSort, offset); // Use the sort from context
    }
  }, [offset, selectedSort]);

  // Memoize stores for performance
  const memoizedStores = useMemo(() => stores, [stores]);

  // Memoize products for performance
  const memoizedProducts = useMemo(() => products, [products]);

  // Ref to store current page offset for use in callbacks
  const currentPageOffsetRef = useRef<number>(1);

  // Search products mutation
  const { mutate: searchProducts, isLoading: isSearching } = useSearchProductsMutation({
    onSuccess: (data) => {
      // console.log('Products fetched successfully:', data);
      isLoadingRef.current = false;
      
      const currentPage = currentPageOffsetRef.current;
      // Only clear loading spinner for first page
      if (currentPage === 1) {
        setCategoryLoading(false);
      }
      
      if (data && data.data && data.data.products && Array.isArray(data.data.products)) {
        // Map API response to Product format
        const mappedProducts: Product[] = data.data.products.map((item: any) => {
          const price = parseFloat(item.price || item.wholesalePrice || item.dropshipPrice || 0);
          const originalPrice = parseFloat(item.originalPrice || price);
          const discount = originalPrice > price && originalPrice > 0
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;
          
          const productData: Product = {
            id: item.id?.toString() || item.externalId?.toString() || '',
            externalId: item.externalId?.toString() || item.id?.toString() || '',
            offerId: item.externalId?.toString() || item.id?.toString() || '',
            name: item.title || item.titleOriginal || '',
            image: item.image || '',
            price: price,
            originalPrice: originalPrice,
            discount: discount,
            description: '',
            category: { id: '', name: '', icon: '', image: '', subcategories: [] },
            subcategory: '',
            brand: '',
            seller: { 
              id: '', 
              name: '', 
              avatar: '', 
              rating: 0, 
              reviewCount: 0, 
              isVerified: false, 
              followersCount: 0, 
              description: '', 
              location: '', 
              joinedDate: new Date() 
            },
            rating: item.rating || 0,
            reviewCount: item.sales || 0,
            rating_count: item.sales || 0,
            inStock: true,
            stockCount: 0,
            tags: [],
            isNew: false,
            isFeatured: false,
            isOnSale: discount > 0,
            createdAt: new Date(item.createDate || new Date()),
            updatedAt: new Date(item.modifyDate || new Date()),
            orderCount: item.sales || 0,
            repurchaseRate: item.repurchaseRate || '',
          };

          // Preserve non-typed fields like source for downstream usage
          (productData as any).source = selectedPlatform;

          return productData;
        });
        
        // Check pagination: prefer server-provided totalPage, otherwise infer from returned count
        const pagination = data.data.pagination;
        const pageSize = 20;
        let hasMoreFlag = false;
        if (pagination && typeof pagination.totalPage === 'number') {
          hasMoreFlag = currentPage < pagination.totalPage;
        } else {
          // Fallback: if we received a full page of items, assume there may be more
          hasMoreFlag = Array.isArray(mappedProducts) && mappedProducts.length >= pageSize;
        }
        setHasMore(hasMoreFlag);
        
        // If it's the first page, replace products, otherwise append
        if (currentPage === 1) {
          setUnsortedProducts(mappedProducts);
          // Apply current sort to the products
          const sorted = sortProducts(mappedProducts, selectedSort);
          setProducts(sorted);
          dataLoadedRef.current = true;
        } else {
          const updatedUnsorted = [...unsortedProducts, ...mappedProducts];
          setUnsortedProducts(updatedUnsorted);
          // Apply current sort to the updated products
          const sorted = sortProducts(updatedUnsorted, selectedSort);
          setProducts(sorted);
        }
      } else {
        // No products found
        if (currentPage === 1) {
          setProducts([]);
          setUnsortedProducts([]);
        }
        setHasMore(false);
      }
    },
    onError: (error) => {
      // console.error('Failed to fetch products:', error);
      isLoadingRef.current = false;
      
      const currentPage = currentPageOffsetRef.current;
      // Only clear loading spinner for first page
      if (currentPage === 1) {
        setCategoryLoading(false);
      }
      // Clear products on error when on first page
      if (currentPage === 1) {
        setProducts([]);
        setUnsortedProducts([]);
      }
      setHasMore(false);
      showToast(error || t('search.messages.failedToLoadProducts'), 'error');
    },
  });

  // Load products using search API
  // sortType: The sort parameter to pass to API (popularity, price_high, price_low, newest, rating)
  // pageOffset: The page number (1-based) - API will return sorted results for this page
  // Each page request includes the sort parameter, so sorting is applied per page by the API
  const loadProducts = async (sortType: string = selectedSort || 'popularity', pageOffset: number = offset || 1 ) => {
    // Prevent multiple simultaneous API calls
    if (isLoadingRef.current || isSearching) {
      // console.log('Skipping loadProducts call - already loading', pageOffset);
      return;
    }
    
    // Determine search keyword based on selected subsubcategory or searchQuery
    let searchKeyword = '';
    
    // Priority 1: Use searchQuery if user has typed something
    if (searchQuery && searchQuery.trim()) {
      searchKeyword = searchQuery.trim();
    } else {
      // Priority 2: If a subsubcategory is selected (not "All"), use its name
      if (selectedSubSubCategory && selectedSubSubCategory !== 'all' && selectedSubSubCategory !== null) {
        // Find the selected subsubcategory by ID or name
        const selectedSubSubCat = displaySubSubCategories.find((cat: any) => {
          if (!cat || !cat.id) return false;
          const catId = String(cat.id).trim();
          const catName = String(cat.name || '').trim();
          const selectedId = String(selectedSubSubCategory).trim();
          const selectedName = String(selectedSubSubCategory).trim();
          // Match by ID or name
          return catId === selectedId || catName === selectedName;
        });
        if (selectedSubSubCat && selectedSubSubCat.name) {
          searchKeyword = selectedSubSubCat.name;
        } else if (selectedSubSubCategory && typeof selectedSubSubCategory === 'string') {
          // If selectedSubSubCategory is already a name, use it directly
          searchKeyword = selectedSubSubCategory;
        }
      } else {
        // Priority 3: If "All" is selected (null or 'all'), use the subcategory name
        searchKeyword = subCategoryName || categoryName || '';
      }
    }
    
    if (!searchKeyword) {
      // console.warn('No search keyword available, skipping product load');
      isLoadingRef.current = false;
      return;
      }
      
    // console.log('loadProducts called:', { 
    //   offset: pageOffset, 
    //   searchKeyword, 
    //   searchQuery,
    //   selectedSubSubCategory,
    //   subCategoryName,
    //   minPrice,
    //   maxPrice,
    //   sortType
    // });
    isLoadingRef.current = true;
    // Only show loading spinner for first page, not during pagination
    if (pageOffset === 1) {
      setCategoryLoading(true);
    }
    
    // Map sort type to API sort parameter
    // The API expects: popularity (best match), price_high, price_low, newest, rating
    // This mapping handles all sort types including best_match, high_sales, low_sales, price_high, price_low
    let sortParam = '';
    if (sortType === 'best_match' || sortType === 'popularity') {
      sortParam = 'popularity';
    } else if (sortType === 'price_high') {
      sortParam = 'price_high';
    } else if (sortType === 'price_low') {
      sortParam = 'price_low';
    } else if (sortType === 'low_sales' || sortType === 'newest') {
      sortParam = 'newest';
    } else if (sortType === 'high_sales' || sortType === 'rating') {
      sortParam = 'rating';
    } else {
      // Default to 'popularity' (best match from API)
      sortParam = 'popularity';
    }
    
    // console.log('Sort mapping:', { sortType, sortParam, pageOffset });
    
    // Convert price strings to numbers and convert from KRW to CNY for API
    // User enters prices in KRW (what they see), but API expects CNY
    const priceStart = minPrice ? convertFromKRW(parseFloat(minPrice)) : undefined;
    const priceEnd = maxPrice ? convertFromKRW(parseFloat(maxPrice)) : undefined;
    
    // For Taobao, we'll pass price filters via the filter parameter in the API
    // For 1688, we use priceStart and priceEnd directly
    // The API will handle the conversion
    const filterParam = undefined; // Price filters are handled in API based on source
    
    // Store current page offset for use in callbacks
    currentPageOffsetRef.current = pageOffset;
    
    // Get platform from route params or selectedPlatform (default to '1688')
    // Since company line is hidden, use routeSource or selectedPlatform
    const platformSource = routeSource || selectedPlatform || '1688';
    
    // console.log('🔍 [ProductDiscovery] Loading products:', {
    //   keyword: searchKeyword,
    //   source: platformSource,
    //   page: pageOffset,
    //   sort: sortParam,
    //   priceStart,
    //   priceEnd,
    //   routeSource,
    //   selectedPlatform,
    // });
    
    // Call search API without auth token (category page search)
    searchProducts(
      searchKeyword,
      platformSource,
      locale,
      pageOffset,
      20, // pageSize
      sortParam,
      priceStart,
      priceEnd,
      filterParam,
      false // requireAuth = false for category page
    );
  };

  // Handle end reached for infinite scroll
  const handleEndReached = () => {
    // console.log('handleEndReached called:', { hasMore, searchQuery, offset });
    // Prevent loading more data when refreshing
    if (isRefreshingRef.current) {
      // console.log('Skipping handleEndReached during refresh');
      return;
    }
    
    if (hasMore) {
      // console.log('Incrementing offset to:', offset + 1);
      setOffset(prev => prev + 1);
    } else {
      // console.log('Not loading more because:', { 
      //   hasMore, 
      //   reason: 'no more products'
      // });
    }
  };

  // Scroll handler for parent ScrollView to trigger loading more (matches HomeScreen behavior)
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        if (!event || !event.nativeEvent) return;
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        if (!layoutMeasurement || !contentOffset || !contentSize) return;

        const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
        if (distanceFromBottom < 200 && hasMore && !isLoadingRef.current) {
          setOffset(prev => prev + 1);
        }
      }
    }
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    // Set the refreshing ref to true to prevent end reached during refresh
    isRefreshingRef.current = true;
    setOffset(1);
    setRefreshing(true);
    setHasMore(true);
    // Clear products immediately
    setProducts([]);
    
    setUnsortedProducts([]);
    try {
      await loadProducts(selectedSort || 'Popularity', 1);
    } finally {
      setRefreshing(false);
      // Reset the refreshing ref after refresh is complete
      isRefreshingRef.current = false;
    }
  }, [selectedSort]);

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowBackIcon width={20} height={20} color={COLORS.black} />
        </TouchableOpacity>
        <View style={styles.searchButtonContainer}>
          <View style={styles.searchBar}>
            {!isSearchFocused && !searchQuery && (
              <View style={styles.trendingTextContainer} pointerEvents="none">
                <Text style={styles.trendingText}>{t('search.trending')}</Text>
                <Text style={styles.keywordText}>{t('search.keyword')}</Text>
              </View>
            )}
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.gray[400]}
              returnKeyType="search"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Icon name="close-outline" size={20} color={COLORS.black} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.searchIconContainer}>


















              
              <Icon name="search" size={16} color={COLORS.white} style={styles.searchIcon} />
            </View>
          </View>
        </View>
      </View>
    </View>
  )



  // Render company filter tabs - HIDDEN on ProductDiscoveryScreen
  const renderCompanyTabs = () => {
    // Company line is hidden on ProductDiscoveryScreen
    return null;
  };

  // Render sort and filter bar
  const renderSortAndFilter = () => (
    <View style={styles.sortFilterBar}>
      <View style={styles.sortButton}>
        <SortDropdown
          options={sortOptions}
          selectedValue={selectedSort}
          onSelect={(value) => {
            setSelectedSort(value);
            // Sort existing products locally (no API call needed)
            if (unsortedProducts.length > 0) {
              const sorted = sortProducts(unsortedProducts, value);
              setProducts(sorted);
            }
          }}
          textColor={COLORS.black}
          iconColor={COLORS.black}
        />
      </View>
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setPriceFilterModalVisible(true)}
      >
        <ViewListIcon width={20} height={20} color={COLORS.black} />
      </TouchableOpacity>
    </View>
  );

  // Render subsubcategories horizontal scroll
  const renderSubSubCategories = () => {
    if (!displaySubSubCategories || displaySubSubCategories.length === 0) return null;

    const isTuneIconSelected = selectedSubSubCategory === null;

    return (
      <View style={styles.subSubCategoriesContainer}>
        <TouchableOpacity
          style={[styles.tuneIconButton, isTuneIconSelected && styles.tuneIconButtonSelected]}
          onPress={() => {
            // Reset to subcategory name when tune icon is pressed
            const categoryNameToUse = subCategoryName || categoryName || '';
            setSearchQuery(categoryNameToUse);
            setSelectedSubSubCategory(null);
            // Reload products
            setOffset(1);
            setHasMore(true);
            setProducts([]);
            setUnsortedProducts([]);
            loadProducts(selectedSort || 'best_match', 1);
          }}
        >
          <TuneIcon width={20} height={20} color={COLORS.black} />
        </TouchableOpacity>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.subSubCategoriesScrollView}
          contentContainerStyle={styles.subSubCategoriesContent}
        >
          {displaySubSubCategories.map((subSubCat: any, index: number) => {
            const isAllItem = subSubCat.id === 'all';
            const isSelected = selectedSubSubCategory === (subSubCat.id || subSubCat.name) || (isAllItem && selectedSubSubCategory === null);
            return (
              <TouchableOpacity
                key={subSubCat.id || index}
                style={[
                  styles.subSubCategoryItem,
                  isSelected && styles.subSubCategoryItemSelected,
                  index === displaySubSubCategories.length - 1 && { marginRight: SPACING.md },
                  index === 0 && { marginLeft: SPACING.md }
                ]}
                onPress={() => {
                  if (isAllItem) {
                    // For "All" item, clear the selection to show all products
                    setSelectedSubSubCategory(null);
                    // Reset searchQuery to subcategory name
                    const categoryNameToUse = subCategoryName || categoryName || '';
                    setSearchQuery(categoryNameToUse);
                    // console.log('Selected "All" - will search by subcategory name:', categoryNameToUse);
                  } else {
                    // For specific subsubcategory, set the selection (use ID if available, otherwise name)
                    const subSubCatId = subSubCat.id || subSubCat.name;
                    setSelectedSubSubCategory(subSubCatId);
                    // Update searchQuery to subsubcategory name
                    setSearchQuery(subSubCat.name);
                    // console.log('Selected subsubcategory - will search by:', subSubCat.name);
                  }
                  // Reload products for this subsubcategory
                  setOffset(1);
                  setHasMore(true);
                  setProducts([]);
                  setUnsortedProducts([]);
                  loadProducts(selectedSort || 'best_match', 1);
                }}
              >
                <Text style={[
                  styles.subSubCategoryName,
                  isSelected && styles.subSubCategoryNameSelected
                ]} numberOfLines={1}>
                  {subSubCat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Product press handlers
  const handleProductPress = useCallback(async (product: Product) => {
    // Get source from product data, fallback to selectedPlatform
    const source = (product as any).source || selectedPlatform ;
    await navigateToProductDetail(product.id, source, locale);
  }, [locale, selectedPlatform]);

  const handleLikePress = useCallback(async (product: Product) => {
    await toggleWishlist(product);
  }, []);

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      variant="moreToLove"
      onPress={() => handleProductPress(item)}
      onLikePress={() => handleLikePress(item)}
      isLiked={isProductLiked(item)}
    />
  ), [handleLikePress, handleProductPress, isProductLiked]);

  const productKeyExtractor = useCallback(
    (item: Product, index: number) => `product-${item.id?.toString() || index}-${index}`,
    [],
  );

  const renderProductsFooter = useCallback(() => (
    isSearching && memoizedProducts.length > 0 ? (
      <View style={{ padding: SPACING.md }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    ) : null
  ), [isSearching, memoizedProducts.length]);
  
  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setMinPrice('');
    setMaxPrice('');
    
    // Reset categoryIds (API removed - categoriesData no longer available)
    setCategoryIds([]);
    
    // Reset to first page when filters are cleared
    setOffset(1);
    setHasMore(true);
    setProducts([]); // Clear existing products
    setUnsortedProducts([]);
    setCategoryLoading(true); // Show loading indicator
    
    loadProducts(selectedSort || 'popularity', 1);
  }, [selectedSort]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contentContainer}>
          {renderHeader()}
          {renderCompanyTabs()}
          {renderSortAndFilter()}
          {renderSubSubCategories()}
          
          {/* Category loading overlay */}
          {categoryLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
          
          {/* Show products list using ProductCard like SearchScreen.
              Use parent Animated.ScrollView for scroll handling (same as HomeScreen)
              so infinite scroll triggers reliably. FlatList is nested and not
              scrollable itself. */}
          <Animated.ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <FlatList
              ref={flatListRef}
              data={memoizedProducts}
              renderItem={renderProductItem}
              keyExtractor={productKeyExtractor}
              numColumns={2}
              columnWrapperStyle={styles.productGrid}
              contentContainerStyle={styles.productListContent}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={10}
              ListFooterComponent={renderProductsFooter}
            />
          </Animated.ScrollView>
        </View>
      </SafeAreaView>
      
      {/* Price Filter Modal */}
      <PriceFilterModal
        visible={priceFilterModalVisible}
        onClose={() => setPriceFilterModalVisible(false)}
        onApply={(min, max) => {
          setMinPrice(min);
          setMaxPrice(max);
          // Reset to first page and reload products with new price filter
          setOffset(1);
          setHasMore(true);
          setProducts([]);
          setUnsortedProducts([]);
          loadProducts(selectedSort || 'best_match', 1);
        }}
        initialMinPrice={minPrice}
        initialMaxPrice={maxPrice}
      />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  safeArea: {
    backgroundColor: COLORS.white,
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchBar: {
    // flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2.5,
    paddingHorizontal: SPACING.sm,
    paddingRight: SPACING.xs,
    minHeight: 35,
  },
  searchIconContainer: {
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
    borderRadius: BORDER_RADIUS.full,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    margin: 0,
  },
  trendingTextContainer: {
    position: 'absolute',
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },
  trendingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.red,
    fontWeight: '600',
  },
  keywordText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  clearButton: {
    marginLeft: SPACING.xs,
  },
  sortFilterBar: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    justifyContent: 'space-between',
  },
  sortButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginLeft: SPACING.md,
  },
  filterButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  subSubCategoriesContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subSubCategoriesScrollView: {
    flex: 1,
  },
  tuneIconButton: {
    paddingHorizontal: SPACING.sm,
    marginLeft: SPACING.md,
    paddingVertical: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.full,
    width: 35,
    height: 35,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  tuneIconButtonSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.text.red,
  },
  subSubCategoriesContent: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  subSubCategoryItem: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.full,
    height: 35,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  subSubCategoryItemSelected: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.text.red,
  },
  subSubCategoryName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.black,
    fontWeight: '700',
  },
  subSubCategoryNameSelected: {
    color: COLORS.text.red,
    fontWeight: '600',
  },
  productGrid: {
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  productListContent: {
    paddingBottom: 120,
  },
  productList: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  filterSection: {
    backgroundColor: COLORS.white,
    flex: 1,
  },
  filterMainContent: {
    flexDirection: 'row',
    flex: 1,
  },
  filterLeftColumn: {
    width: 120,
    backgroundColor: COLORS.gray[100],
    borderRightWidth: 1,
    borderRightColor: COLORS.gray[200],
  },
  filterCategoryItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.gray[100],
  },
  filterCategoryItemActive: {
    backgroundColor: COLORS.white,
  },
  filterCategoryText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  filterCategoryTextActive: {
    fontWeight: '600',
    color: COLORS.red,
  },
  filterRightColumn: {
    flex: 1,
    padding: SPACING.md,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterOptionsList: {
    gap: SPACING.sm,
  },
  filterOptionWide: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray[100],
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: '45%',
    alignItems: 'center',
  },
  filterOptionFull: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray[100],
    borderWidth: 2,
    borderColor: 'transparent',
    width: '100%',
  },
  filterOptionSelected: {
    backgroundColor: COLORS.white,
    borderColor: '#3B82F6',
  },
  filterOptionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: FONTS.sizes.md,
  },
  priceInputContainer: {
    padding: SPACING.sm,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONTS.sizes.md,
    backgroundColor: COLORS.white,
  },
  priceSeparator: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.secondary,
    marginTop: 20,
  },
  confirmButtonContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  confirmButton: {
    backgroundColor: COLORS.transparent,
    borderRadius: 50,
    paddingVertical: SPACING.md + 2,
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  companyTabsContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: SPACING.md,
  },
  companyTabs: {
    alignItems: 'center',
  },
  companyTab: {
    paddingHorizontal: SPACING.smmd,
    paddingVertical: SPACING.xs,
  },
  companyTabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.black,
    fontWeight: '700',
  },
  companyTabTextSelected: {
    color: COLORS.text.red,
    fontWeight: '600',
  },
});

export default ProductDiscoveryScreen;

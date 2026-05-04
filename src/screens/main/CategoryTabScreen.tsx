import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import LinearGradient from 'react-native-linear-gradient';
import { launchCamera, launchImageLibrary, MediaType, ImagePickerResponse, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { useNavigation } from '@react-navigation/native';
import { requestCameraPermission, requestPhotoLibraryPermission } from '../../utils/permissions';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants';
import { RootStackParamList, Product } from '../../types';
import { SearchButton, NotificationBadge, ProductCard, ImagePickerModal } from '../../components';
import NotificationIcon from '../../assets/icons/NotificationIcon';
import { useAuth } from '../../context/AuthContext';

import { useToast } from '../../context/ToastContext';
import { usePlatformStore } from '../../store/platformStore';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import { useTopCategoriesMutation } from '../../hooks/useTopCategoriesMutation';
import { useChildCategoriesMutation } from '../../hooks/useChildCategoriesMutation';
import { useSearchProductsMutation } from '../../hooks/useSearchProductsMutation';
import { useWishlistStatus } from '../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../hooks/useDeleteFromWishlistMutation';

const { width } = Dimensions.get('window');

type CategoryTabScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Category'>;

// Calculate card width for right column (accounting for left column width of 90)
const LEFT_COLUMN_WIDTH = 90;
const RIGHT_COLUMN_WIDTH = width - LEFT_COLUMN_WIDTH - SPACING.md * 3; // 3 spacings: left, middle, right
const FOR_YOU_CARD_WIDTH = (RIGHT_COLUMN_WIDTH - SPACING.sm * 3) / 2; // 2 cards per row with spacing

const CategoryTabScreen: React.FC = () => {
  const navigation = useNavigation<CategoryTabScreenNavigationProp>();
  const { user, isGuest } = useAuth();
  // Use wishlist status hook to check if products are liked based on external IDs
  const { isProductLiked, refreshExternalIds, addExternalId, removeExternalId } = useWishlistStatus();
  
  // Add to wishlist mutation
  const { mutate: addToWishlist } = useAddToWishlistMutation({
    onSuccess: async (data) => {
      // console.log('Product added to wishlist successfully:', data);
      showToast(t('home.productAddedToWishlist'), 'success');
      // Immediately refresh external IDs to update heart icon color
      await refreshExternalIds();
    },
    onError: (error) => {
      // console.error('Failed to add product to wishlist:', error);
      showToast(error || t('home.failedToAddToWishlist'), 'error');
    },
  });

  // Delete from wishlist mutation
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation({
    onSuccess: async (data) => {
      // console.log('Product removed from wishlist successfully:', data);
      showToast(t('home.productRemovedFromWishlist'), 'success');
      // Immediately refresh external IDs to update heart icon color
      await refreshExternalIds();
    },
    onError: (error) => {
      // console.error('Failed to remove product from wishlist:', error);
      showToast(error || t('home.failedToRemoveFromWishlist'), 'error');
    },
  });
  
  // Toggle wishlist function
  const toggleWishlist = async (product: any) => {
    if (!user || isGuest) {
      showToast(t('home.pleaseLogin'), 'warning');
      return;
    }

    // Get product external ID - prioritize externalId, never use MongoDB _id
    const externalId = 
      (product as any).externalId?.toString() ||
      (product as any).offerId?.toString() ||
      '';

    if (!externalId) {
      showToast(t('home.invalidProductId'), 'error');
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
        showToast(t('home.invalidProductData'), 'error');
        return;
      }

      // Optimistic update - add to state and AsyncStorage immediately
      await addExternalId(externalId);
      addToWishlist({ offerId: externalId, platform: source });
    }
  };
  
  // Zustand store
  const { 
    selectedPlatform, 
    selectedCategory,
    setSelectedPlatform, 
    setSelectedCategory,
  } = usePlatformStore();
  
  // i18n
  const locale = useAppSelector((s) => s.i18n.locale);
  const { showToast } = useToast();

  // Helper function to navigate to product detail
  const navigateToProductDetail = async (
    productId: string | number,
    source: string = selectedPlatform,
    country: string = locale as string
  ) => {
    navigation.navigate('ProductDetail', {
      productId: productId.toString(),
      source: source,
      country: country,
    });
  };
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
  
  // Map company name to platform/source parameter
  const getPlatformFromCompany = (company: string): string => {
    if (company === 'All') {
      return '1688';
    }
    // Convert company name to lowercase for API (e.g., "Taobao" -> "taobao")
    return company.toLowerCase();
  };
  
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(25);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [showRecommended, setShowRecommended] = useState(true);
  const [forYouProducts, setForYouProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<string[]>(['All', '1688', 'Taobao']);
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [childCategories, setChildCategories] = useState<any[]>([]);

  const platforms = ['1688', 'taobao', 'myCompany'];

  // Get categories tree from store to check if already loaded
  const { categoriesTree } = usePlatformStore();
  const hasFetchedRef = useRef<string | null>(null); // Track which platform we've fetched
  const hasFetchedForYouRef = useRef<string | null>(null); // Track which category we've fetched for "For You"
  const lastPlatformForCategoryRef = useRef<string | null>(null); // Track which platform we last set category for

  // Top categories mutation
  const { mutate: fetchTopCategories, isLoading: isLoadingTopCategories } = useTopCategoriesMutation({
    onSuccess: (data) => {
      // console.log('Top categories fetched successfully:', data);
      const categories = data.categories || [];
      setTopCategories(categories);
      // Auto-select first category
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0]._id);
      }
      // Mark this platform as fetched
      hasFetchedRef.current = data.platform;
    },
    onError: (error) => {
      // console.error('Failed to fetch top categories:', error);
      setTopCategories([]);
      // Reset ref on error so we can retry
      hasFetchedRef.current = null;
      showToast(error || t('category.failedToLoadCategories'), 'error');
    },
  });

  // Child categories mutation
  const { mutate: fetchChildCategories, isLoading: isLoadingChildCategories } = useChildCategoriesMutation({
    onSuccess: (data) => {
      // console.log('Child categories fetched successfully:', data);
      const childCatsTree = data.tree || [];
      setChildCategories(childCatsTree);
    },
    onError: (error) => {
      // console.error('Failed to fetch child categories:', error);
      setChildCategories([]);
      showToast(error || t('category.failedToLoadSubcategories'), 'error');
    },
  });

  // Fetch top categories when selected company changes
  // Platform parameter is determined by selected company (All = 1688)
  useEffect(() => {
    if (selectedCompany) {
      // Get platform from selected company
      const platformForCompany = getPlatformFromCompany(selectedCompany);
      
      // Check if we already have top categories for this platform
      const alreadyFetched = hasFetchedRef.current === platformForCompany;
      
      // Only fetch if we haven't fetched yet and not currently loading
      if (!alreadyFetched && !isLoadingTopCategories) {
        hasFetchedRef.current = platformForCompany; // Mark as fetching
        fetchTopCategories(platformForCompany);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany]); // Depend on selectedCompany

  // Fetch child categories when top category is selected
  useEffect(() => {
    if (selectedCategory && selectedCompany) {
      const platformForCompany = getPlatformFromCompany(selectedCompany);
      fetchChildCategories(platformForCompany, selectedCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedCompany]);

  // Search products mutation for "For You" section
  const { mutate: searchForYouProducts, isLoading: isLoadingForYou } = useSearchProductsMutation({
    onSuccess: (data) => {
      // console.log('For You products fetched successfully:', data);
      if (data && data.data && data.data.products && Array.isArray(data.data.products)) {
        // Map API response to Product format
        const mappedProducts = data.data.products.map((item: any) => {
          const price = parseFloat(item.price || item.wholesalePrice || item.dropshipPrice || 0);
          const originalPrice = parseFloat(item.originalPrice || price);
          const discount = originalPrice > price && originalPrice > 0
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;
          
          return {
            id: item.id?.toString() || item.externalId?.toString() || '',
            externalId: item.externalId?.toString() || item.id?.toString() || '',
            offerId: item.offerId?.toString() || item.externalId?.toString() || item.id?.toString() || '',
            name: locale === 'zh' 
              ? (item.subject || item.title || item.titleOriginal || '')
              : (item.title || item.titleOriginal || item.subject || ''),
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
          } as Product;
        });
        setForYouProducts(mappedProducts);
        
        // Extract unique company names from mapped products
        const uniqueCompanies = new Set<string>(['All']);
        mappedProducts.forEach((product: any) => {
          const companyName = product.companyName || product.seller?.name || '';
          if (companyName && companyName.trim()) {
            uniqueCompanies.add(companyName);
          }
        });
        // Sort companies with "All" always first
        const sortedCompanies = Array.from(uniqueCompanies).sort((a, b) => {
          if (a === 'All') return -1;
          if (b === 'All') return 1;
          return a.localeCompare(b);
        });
        // setCompanies(sortedCompanies);
        
        // Mark this category as fetched
        if (selectedCategory) {
          hasFetchedForYouRef.current = selectedCategory;
        }
      }
    },
    onError: (error) => {
      // console.error('Failed to fetch For You products:', error);
      setForYouProducts([]);
      // Reset ref on error so we can retry
      hasFetchedForYouRef.current = null;
      showToast(error || t('category.failedToLoadProducts'), 'error');
    },
  });

  // Fetch "For You" products when category or company is selected
  useEffect(() => {
    if (locale && selectedCategory) {
      // Create a unique key for this combination of category and company
      const fetchKey = `${selectedCategory}-${selectedCompany}`;
      const alreadyFetched = hasFetchedForYouRef.current === fetchKey;
      
      // Only fetch if we haven't fetched for this combination yet and not currently loading
      if (!alreadyFetched && !isLoadingForYou) {
        // Find the selected category to get its name
        const selectedCategoryData = categoriesToDisplay.find((cat: any) => cat.id === selectedCategory);
        
        if (selectedCategoryData) {
          // Mark as fetching with the combination key
          hasFetchedForYouRef.current = fetchKey;
          
          // Get category name
          const categoryName = selectedCategoryData.name;
          
          // Get platform from selected company (default to '1688' for 'All')
          const platformSource = getPlatformFromCompany(selectedCompany);
          // For Chinese case, use 'en' country code but show subject not subjectTrans
          const countryCode = locale === 'zh' ? 'en' : locale;
          
          // Different filter for Taobao vs 1688
          const searchFilter = platformSource === 'taobao' ? undefined : 'isQqyx';
          
          searchForYouProducts(
            categoryName,
            platformSource,
            countryCode,
            1,
            20,
            '', // sort
            undefined, // priceStart
            undefined, // priceEnd
            searchFilter, // filter - 'isQqyx' for 1688, undefined for Taobao
            false // requireAuth = false for category page
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedCompany, locale]); // Depend on selectedCategory, selectedCompany, and locale

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh For You products
    if (selectedPlatform && locale && selectedCategory) {
      const selectedCategoryData = categoriesToDisplay.find((cat: any) => cat.id === selectedCategory);
      
      if (selectedCategoryData) {
        const categoryName = selectedCategoryData.name;
        
        // Get platform from selected company (default to '1688' for 'All')
        const platformSource = getPlatformFromCompany(selectedCompany);
        // For Chinese case, use 'en' country code but show subject not subjectTrans
        const countryCode = locale === 'zh' ? 'en' : locale;
        
        // Different filter for Taobao vs 1688
        const searchFilter = platformSource === 'taobao' ? undefined : 'isQqyx';
        
        searchForYouProducts(
          categoryName,
          platformSource,
          countryCode,
          1,
          20,
          '',
          undefined,
          undefined,
          searchFilter // 'isQqyx' for 1688, undefined for Taobao
        );
      }
    }
    setRefreshing(false);
  };

  const handleCategoryPress = (categoryId: string) => {
    // Just select the category - recommended subcategories will show automatically
    setSelectedCategory(categoryId);
  };

  // Helper function to convert image URI to base64
  const convertUriToBase64 = async (uri: string): Promise<string | null> => {
    try {
      // Remove file:// prefix if present
      const fileUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      const base64 = await RNFS.readFile(fileUri, 'base64');
      return base64;
    } catch (error) {
      // console.error('Error converting URI to base64:', error);
      return null;
    }
  };

  const handleImageSearch = async () => {
    // Navigate to camera screen
    navigation.navigate('ImageSearchCamera' as never);
  };

  const handleTakePhoto = async () => {
    // Request camera permission
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert(t('home.permissionRequired'), t('home.grantCameraPermission'));
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.1, // Very low quality to ensure <1.2MB for large images
      saveToPhotos: false,
      includeBase64: true,
    };

    launchCamera(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(t('common.error'), response.errorMessage || t('home.failedToTakePhoto'));
        return;
      }
      if (response.assets && response.assets[0]) {
        setImagePickerModalVisible(false);
        let base64Data = response.assets[0].base64;
        
        // Image is already compressed with quality: 0.5 in camera options
        // Only compress if base64 is not available (fallback case)
        if (!base64Data && response.assets[0].uri) {
          const { compressImageForSearch } = require('../../utils/imageCompression');
          const compressedBase64 = await compressImageForSearch(response.assets[0].uri);
          if (compressedBase64) {
            base64Data = compressedBase64;
          } else {
            const convertedBase64 = await convertUriToBase64(response.assets[0].uri);
            base64Data = convertedBase64 || undefined;
          }
        }
        
        if (!base64Data) {
          showToast(t('home.imageDataUnavailable'), 'error');
          return;
        }
        
        navigation.navigate('ImageSearch', { 
          imageUri: response.assets[0].uri || '',
          imageBase64: base64Data,
        });
      }
    });
  };

  const handleChooseFromGallery = async () => {
    // Request media library permission
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      Alert.alert(t('home.permissionRequired'), t('home.grantPhotoLibraryPermission'));
      return;
    }

    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.1, // Very low quality to ensure <1.2MB for large images
      selectionLimit: 1,
      includeBase64: true,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(t('common.error'), response.errorMessage || t('home.failedToPickImage'));
        return;
      }
      if (response.assets && response.assets[0]) {
        setImagePickerModalVisible(false);
        let base64Data = response.assets[0].base64;
        
        // Image is already compressed with quality: 0.5 in camera options
        // Only compress if base64 is not available (fallback case)
        if (!base64Data && response.assets[0].uri) {
          const { compressImageForSearch } = require('../../utils/imageCompression');
          const compressedBase64 = await compressImageForSearch(response.assets[0].uri);
          if (compressedBase64) {
            base64Data = compressedBase64;
          } else {
            const convertedBase64 = await convertUriToBase64(response.assets[0].uri);
            base64Data = convertedBase64 || undefined;
          }
        }
        
        if (!base64Data) {
          showToast(t('home.imageDataUnavailable'), 'error');
          return;
        }
        
        navigation.navigate('ImageSearch', { 
          imageUri: response.assets[0].uri || '',
          imageBase64: base64Data,
        });
      }
    });
  };

  const handleProductPress = async (product: Product) => {
    // Get source from product data, fallback to selectedPlatform (which is now updated when company is selected)
    const source = (product as any).source || selectedPlatform || '1688';
    await navigateToProductDetail(product.id, source, locale as string);
  };

  // Render company filter tabs
  const renderCompanyTabs = () => {
    // Always show company tabs if there are any companies (at least "All")
    if (companies.length === 0) return null;
    
    return (
      <View style={styles.companyTabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.companyTabs}
        >
          {companies.map((company, index) => {
            const isSelected = selectedCompany === company;
            
            return (
              <TouchableOpacity
                key={`company-${company}-${index}`}
                style={[
                  styles.companyTab,
                  index === companies.length - 1 && { marginRight: SPACING.md },
                  index === 0 && { marginLeft: SPACING.md }
                ]}
                onPress={() => {
                  setSelectedCompany(company);
                  // Update selectedPlatform in store based on selected company
                  const platform = getPlatformFromCompany(company);
                  setSelectedPlatform(platform);
                  // console.log('[CategoryTabScreen] Company selected:', company, 'Platform updated to:', platform);
                  // Reset fetch refs to allow refetch with new company
                  hasFetchedRef.current = null; // Reset category tree fetch ref
                  hasFetchedForYouRef.current = null; // Reset products fetch ref
                  lastPlatformForCategoryRef.current = null; // Reset platform ref so category gets set for new company
                  setForYouProducts([]);
                  // The useEffect will automatically set first category and refetch category tree and products when selectedCompany changes
                }}
              >
                <Text style={[
                  styles.companyTabText,
                  isSelected && styles.companyTabTextSelected
                ]}>
                  {company}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.headerRow}>
        <SearchButton
          placeholder={t('category.searchPlaceholder')}
          onPress={() => navigation.navigate('Search' as never)}
          onCameraPress={handleImageSearch}
          style={styles.searchButton}
          isHomepage={false}
        />
        
        <NotificationBadge
          customIcon={<NotificationIcon width={28} height={28} color={COLORS.text.primary} />}
          count={unreadCount}
          onPress={() => {
            // Navigate to notifications or customer service
            // navigation.navigate('CustomerService' as never);
          }}
        />
      </View>
      {renderCompanyTabs()}
    </View>
  );

  const renderCategoryItem = ({ item }: { item: any }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemActive
        ]}
        onPress={() => handleCategoryPress(item.id)}
      >
        <Text style={[
          styles.categoryName,
          isSelected && styles.categoryNameActive
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRecommendedItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.recommendedItem}
        onPress={() => {
          // Get the selected category to pass along
          const selectedCategoryData = categoriesToDisplay.find(cat => cat.id === selectedCategory);
          
          // Convert subsubcategories to correct locale if they exist
          let localizedSubSubCategories: any[] = [];
          if (item.subsubcategories && item.subsubcategories.length > 0) {
            localizedSubSubCategories = item.subsubcategories.map((subSubCat: any) => {
              // If subSubCat.name is an object with zh, en, ko, extract the correct locale
              if (subSubCat.name && typeof subSubCat.name === 'object') {
                return {
                  ...subSubCat,
                  name: subSubCat.name[locale] || subSubCat.name.en || subSubCat.name
                };
              }
              // If it's already a string, use it as is
              return subSubCat;
            });
          }
          
          // Get platform from selected company
          const platform = getPlatformFromCompany(selectedCompany);
          
          // Always go directly to ProductDiscovery
          navigation.navigate('ProductDiscovery', { 
            subCategoryName: item.name,
            categoryId: selectedCategory,
            categoryName: selectedCategoryData?.name,
            subcategoryId: item.id,
            subsubcategories: localizedSubSubCategories,
            source: platform, // Pass the current platform/company selection
          });
        }}
      >
        <View style={styles.recommendedImageContainer}>
          {item.image ? (
            <Image 
              source={{ uri: item.image }} 
              style={styles.recommendedImage}
              resizeMode="cover"
            />
          ) : (
            <Image 
              source={require('../../assets/icons/logo.png')} 
              style={styles.recommendedLogo}
              resizeMode="contain"
            />
          )}
        </View>
        <Text style={styles.recommendedName} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderForYouProducts = () => {
    // Show loading state
    if (isLoadingForYou) {
      return (
        <View style={styles.forYouSection}>
          <View style={styles.forYouHeader}>
            <Text style={styles.forYouTitle}>{t('home.forYou')}</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('category.loadingProducts')}</Text>
          </View>
        </View>
      );
    }

    // Show empty state
    if (!Array.isArray(forYouProducts) || forYouProducts.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.forYouSection}>
        <View style={styles.forYouHeader}>
          <Text style={styles.forYouTitle}>{t('home.forYou')}</Text>
        </View>
        <View style={styles.forYouGrid}>
          {forYouProducts.map((product: Product, index: number) => {
            const handleLike = async () => {
              if (!user || isGuest) {
                Alert.alert('', t('home.pleaseLogin'));
                return;
              }
              try {
                await toggleWishlist(product);
              } catch (error) {
                // console.error('Error toggling wishlist:', error);
              }
            };

            return (
              <ProductCard
                key={`foryou-${product.id || index}`}
                product={product}
                variant="moreToLove"
                onPress={() => handleProductPress(product)}
                onLikePress={handleLike}
                isLiked={isProductLiked(product)}
                showLikeButton={true}
                showDiscountBadge={true}
                showRating={true}
                cardWidth={FOR_YOU_CARD_WIDTH}
              />
            );
          })}
        </View>
      </View>
    );
  };

  // Use top categories for left column (from API)
  const categoriesToDisplay = topCategories.map((cat: any) => ({
    id: cat._id,
    name: typeof cat.name === 'object' 
      ? (cat.name[locale] || cat.name.en || cat.name.zh || 'Category')
      : cat.name,
    image: cat.imageUrl || '',
  }));

  // Transform child categories to recommended items format (from API)
  const allRecommendedItems = childCategories.flatMap((level2: any) => {
    const items: any[] = [];
    
    // Add level 2 category as an item
    items.push({
      id: level2._id,
      name: typeof level2.name === 'object'
        ? (level2.name[locale] || level2.name.en || level2.name.zh || 'Category')
        : level2.name,
      image: level2.imageUrl || '',
      subsubcategories: (level2.children || []).map((level3: any) => ({
        id: level3._id,
        name: typeof level3.name === 'object'
          ? (level3.name[locale] || level3.name.en || level3.name.zh || 'Category')
          : level3.name,
        externalId: level3.externalId,
      })),
    });

    // Add level 3 categories as separate items
    if (level2.children && Array.isArray(level2.children)) {
      level2.children.forEach((level3: any) => {
        items.push({
          id: level3._id,
          name: typeof level3.name === 'object'
            ? (level3.name[locale] || level3.name.en || level3.name.zh || 'Category')
            : level3.name,
          image: level3.imageUrl || '',
          isLevel3: true,
          parentId: level2._id,
        });
      });
    }

    return items;
  });
  
  // Show only first 9 subcategories as recommended
  const recommendedItems = allRecommendedItems.slice(0, 9);
  
  // Check if there are more than 9 subcategories to show the "Show more" button
  const hasMoreSubcategories = allRecommendedItems.length > 9;

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <View style={styles.mainContent}>
        <View style={styles.leftColumn}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {isLoadingTopCategories && categoriesToDisplay.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={categoriesToDisplay}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => `category-${item.id || item.name}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={{minHeight: '100%'}}
              />
            )}
          </ScrollView>
        </View>
        
        <View style={styles.rightColumn}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Recommended Section */}
            <View style={styles.recommendedSection}>
              <TouchableOpacity 
                style={styles.recommendedHeader}
                onPress={() => setShowRecommended(!showRecommended)}
              >
                <Text style={styles.recommendedTitle}>{t('home.recommended')}</Text>
                <Icon 
                  name={showRecommended ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={COLORS.text.primary} 
                />
              </TouchableOpacity>
              {showRecommended && (
                <>
                  <View style={styles.recommendedGrid}>
                    {recommendedItems.map((item, index) => (
                      <View key={`rec-${item.id || index}`}>
                        {renderRecommendedItem({ item })}
                      </View>
                    ))}
                  </View>
                  {hasMoreSubcategories && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => {
                        // Get the selected category to pass along
                        const selectedCategoryData = categoriesToDisplay.find(cat => cat.id === selectedCategory);
                        
                        // Get all subcategories for the selected category
                        const allSubcategories = allRecommendedItems;
                        
                        // Navigate to SubCategory screen to show all subcategories
                        // Convert categoryId to number if it's a valid number string, otherwise keep as string or pass as is
                        let categoryIdToPass: number | undefined;
                        if (selectedCategory) {
                          if (typeof selectedCategory === 'string') {
                            const numValue = Number(selectedCategory);
                            categoryIdToPass = isNaN(numValue) ? undefined : numValue;
                          } else if (typeof selectedCategory === 'number') {
                            categoryIdToPass = selectedCategory;
                          }
                        }
                        
                        navigation.navigate('SubCategory', { 
                          categoryName: selectedCategoryData?.name || 'All Subcategories',
                          categoryId: categoryIdToPass,
                          subcategories: allSubcategories,
                        });
                      }}
                    >
                      <Text style={styles.showMoreText}>{t('category.showMore')}</Text>
                      <Icon 
                        name="chevron-forward" 
                        size={16} 
                        color={COLORS.primary} 
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
            
            {/* For You Section */}
            {renderForYouProducts()}
          </ScrollView>
        </View>
      </View>
      
      <ImagePickerModal
        visible={imagePickerModalVisible}
        onClose={() => setImagePickerModalVisible(false)}
        onTakePhoto={handleTakePhoto}
        onChooseFromGallery={handleChooseFromGallery}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: SPACING.xl,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gray[200],
    ...SHADOWS.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  searchButton: {
    borderRadius: BORDER_RADIUS.full,
    width: '90%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    flexDirection: 'row',
    minHeight: '100%',
    paddingBottom: 100
  },
  leftColumn: {
    width: 120,
    backgroundColor: COLORS.gray[100],
  },
  rightColumn: {
    flex: 1,
  },
  categoryItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  categoryItemActive: {
    backgroundColor: COLORS.white,
  },
  categoryName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    textAlign: 'left',
    fontWeight: '500',
  },
  categoryNameActive: {
    fontWeight: '600',
    color: COLORS.red,
  },
  recommendedSection: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
    borderBottomWidth: 5,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.lg,
    borderBottomColor: COLORS.gray[200],
  },
  recommendedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  recommendedTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  recommendedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  recommendedItem: {
    width: (width - 120 - SPACING.sm * 5) / 3,
    alignItems: 'center',
    padding: SPACING.sm,
  },
  recommendedImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  recommendedImage: {
    width: '100%',
    height: '100%',
  },
  recommendedLogo: {
    width: '60%',
    height: '60%',
  },
  recommendedName: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  forYouSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  forYouHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  forYouTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  forYouGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingBottom: SPACING.lg * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  showMoreText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  companyTabsContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
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

export default CategoryTabScreen;
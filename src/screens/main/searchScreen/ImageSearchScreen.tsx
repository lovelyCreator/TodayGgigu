import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../store/hooks';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants';
import { RootStackParamList, Product } from '../../../types';
import { ProductCard, SortDropdown, PriceFilterModal } from '../../../components';
import { useAuth } from '../../../context/AuthContext';
import { translations } from '../../../i18n/translations';
import { productsApi } from '../../../services/productsApi';
import ArrowBackIcon from '../../../assets/icons/ArrowBackIcon';
import ViewListIcon from '../../../assets/icons/ViewListIcon';
import { useToast } from '../../../context/ToastContext';
import { sortProducts } from '../../../utils/productSort';
import { convertFromKRW } from '../../../utils/i18nHelpers';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.sm * 3) / 2;

type ImageSearchScreenRouteProp = RouteProp<RootStackParamList, 'ImageSearch'>;
type ImageSearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ImageSearch'>;

const ImageSearchScreen: React.FC = () => {
  const navigation = useNavigation<ImageSearchScreenNavigationProp>();
  const route = useRoute<ImageSearchScreenRouteProp>();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
  
  // Wishlist context removed - using local state
  const [likedProductIds, setLikedProductIds] = useState<string[]>([]);
  const toggleWishlist = async (product: Product) => {
    // Wishlist API removed
    const productId = product.id?.toString() || '';
    setLikedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };
  const { user, isGuest } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products for sorting/filtering
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [priceFilterModalVisible, setPriceFilterModalVisible] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('best_match');
  const [companies, setCompanies] = useState<string[]>(['All', '1688', 'Taobao', 'Company Mall']);
  const [selectedCompany, setSelectedCompany] = useState<string>('1688'); // Start with 1688 instead of 'All'
  
  // Sort options
  const sortOptions = [
    { label: 'Best Match', value: 'best_match' },
    { label: 'Price High', value: 'price_high' },
    { label: 'Price Low', value: 'price_low' },
    { label: 'High Sales', value: 'high_sales' },
    { label: 'Low Sales', value: 'low_sales' },
  ];
  
  const { showToast } = useToast();
  
  const isFetchingRef = useRef(false);
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const [imageBase64, setImageBase64] = useState<string | null>(route.params?.imageBase64 || null);
  const [imageUri, setImageUri] = useState<string | null>(route.params?.imageUri || null);
  
  // Map company name to platform/source parameter
  const getPlatformFromCompany = (company: string): string => {
    if (company === 'All' || company === '1688') {
      return '1688';
    }
    if (company.toLowerCase() === 'taobao') {
      return 'taobao';
    }
    return company.toLowerCase();
  };

  // Helper function to navigate to product detail after checking API
  const navigateToProductDetail = async (
    productId: string | number,
    source: string = getPlatformFromCompany(selectedCompany),
    country: string = locale
  ) => {
    navigation.navigate('ProductDetail', {
      productId: productId.toString(),
      source: source,
      country: country,
    } as any);
  };

  const loadProducts = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (isFetchingRef.current) return;
      // Check if we have any image data (either URI or base64)
      if (!route.params?.imageUri && !imageBase64 && !route.params?.imageBase64) {
        return;
      }

      // Image search API returns all results at once, so we only fetch once
      // Client-side pagination will handle displaying products in chunks
      if (page > 1 && !append) {
        return;
      }

      try {
        isFetchingRef.current = true;
        setIsLoading(true);

        // Check image size and compress if needed
        let base64: string | null = null;
        let imageUriForCompression = route.params?.imageUri || imageUri;
        
        // Use base64 from params
        if (route.params?.imageBase64) {
          const base64Size = route.params.imageBase64.length;
          const sizeMB = base64Size / 1024 / 1024;
          
          
          // If image is over 6.5MB, show error
          if (base64Size > 6500000) { // 6.5MB base64
            setIsLoading(false);
            isFetchingRef.current = false;
            showToast('Image size is too big.', 'error');
            return;
          }
          
          // If image is around 6MB (between 1.2MB and 6.5MB), compress it to <1.2MB
          if (base64Size > 1200000 && base64Size <= 6500000) {
            if (!imageUriForCompression) {
              setIsLoading(false);
              isFetchingRef.current = false;
              showToast('Image size is too big.', 'error');
              return;
            }
            
            try {
              const { compressImageForSearch } = require('../../../utils/imageCompression');
              
              // Automatically calculate and apply compression based on image size
              // The function will automatically determine target dimensions (e.g., 2000x1500 for 6MB images)
              let compressedBase64: string | null = null;
              
              // Try with automatic dimension calculation based on file size
              compressedBase64 = await compressImageForSearch(
                imageUriForCompression,
                sizeMB, // Pass file size in MB for automatic dimension calculation
                0.3      // Start with quality 0.3
              );
              
              // If still >1.2MB, reduce quality further
              if (compressedBase64 && compressedBase64.length > 1200000) {
                compressedBase64 = await compressImageForSearch(
                  imageUriForCompression,
                  sizeMB,
                  0.25  // Lower quality
                );
              }
              
              // If still >1.2MB, reduce quality even more
              if (compressedBase64 && compressedBase64.length > 1200000) {
                compressedBase64 = await compressImageForSearch(
                  imageUriForCompression,
                  sizeMB,
                  0.2   // Lower quality
                );
              }
              
              // If still >1.2MB, reduce quality more
              if (compressedBase64 && compressedBase64.length > 1200000) {
                compressedBase64 = await compressImageForSearch(
                  imageUriForCompression,
                  sizeMB,
                  0.15  // Very low quality
                );
              }
              
              // If still >1.2MB, try minimum quality
              if (compressedBase64 && compressedBase64.length > 1200000) {
                compressedBase64 = await compressImageForSearch(
                  imageUriForCompression,
                  sizeMB,
                  0.1   // Minimum quality
                );
              }
              
              if (compressedBase64 && compressedBase64.length <= 1200000) {
                base64 = compressedBase64;
                setImageBase64(base64);
              } else if (compressedBase64) {
                // Compression succeeded but still >1.2MB - try one more aggressive compression
                compressedBase64 = await compressImageForSearch(
                  imageUriForCompression,
                  sizeMB,
                  0.08  // Minimum quality
                );
                
                if (compressedBase64 && compressedBase64.length <= 1200000) {
                  base64 = compressedBase64;
                  setImageBase64(base64);
                } else {
                  // Still too large after all attempts
                  setIsLoading(false);
                  isFetchingRef.current = false;
                  showToast('Image size is too big.', 'error');
                  return;
                }
              } else {
                // Compression failed - show error
                setIsLoading(false);
                isFetchingRef.current = false;
                showToast('Image size is too big.', 'error');
                return;
              }
            } catch (error) {
              setIsLoading(false);
              isFetchingRef.current = false;
              showToast('Image size is too big.', 'error');
              return;
            }
          } else {
            // If already <1.2MB, use as-is
            base64 = route.params.imageBase64;
            setImageBase64(base64);
          }
        }
        
        if (!base64) {
          // If no base64 data, navigate back with error message
          setIsLoading(false);
          isFetchingRef.current = false;
          Alert.alert('', t('imageSearch.noImageData') || 'Image data not available. Please try again.');
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
          return;
        }
        
        // Final size check before sending to API
        const base64Size = base64.length;
        const base64SizeMB = (base64Size / 1024 / 1024).toFixed(2);
        
        // If still too large, show error (1.2MB base64 limit)
        if (base64Size > 1200000) { // 1.2MB base64 limit
          setIsLoading(false);
          isFetchingRef.current = false;
          showToast('Image is too large. Please try a smaller image.', 'error');
          return;
        }
        
        // Get platform from selected company
        const platform = getPlatformFromCompany(selectedCompany);
        
        // Call appropriate image search API based on selected platform
        let response;
        if (platform === '1688') {
          // For Chinese locale, use 'en' language code for API (same as Taobao)
          // For other locales, use the locale as language code
          const language =
            locale === 'zh' ? 'en' :
            locale === 'ko' ? 'ko' :
            'en';
          
          response = await productsApi.imageSearch1688(base64, language);
          
          // console.log('🔍 [ImageSearchScreen] 1688 API Response:', {
          //   success: response.success,
          //   message: response.message,
          //   hasData: !!response.data,
          //   hasProducts: !!response.data?.products,
          //   productsCount: Array.isArray(response.data?.products) ? response.data.products.length : 0,
          //   firstProduct: response.data?.products?.[0] ? {
          //     id: response.data.products[0].id,
          //     title: response.data.products[0].title || response.data.products[0].name,
          //     price: response.data.products[0].price,
          //     wholesalePrice: response.data.products[0].wholesalePrice,
          //     dropshipPrice: response.data.products[0].dropshipPrice,
          //     originalPrice: response.data.products[0].originalPrice,
          //   } : null,
          //   fullResponse: JSON.stringify(response).substring(0, 500),
          // });
        } else if (platform === 'taobao') {
          // For Chinese locale, use 'en' language code for API
          // For other locales, use the locale as language code
          const language =
            locale === 'zh' ? 'en' :
            locale === 'ko' ? 'ko' :
            'en';

          response = await productsApi.imageSearchTaobao(language, base64);
        } else {
          // Other platforms not yet supported
          setIsLoading(false);
          isFetchingRef.current = false;
          showToast(`Image search is not yet supported for ${platform}`, 'warning');
          return;
        }


        if (!response.success || !response.data || !Array.isArray(response.data.products)) {
          setProducts([]);
          setAllProducts([]);
          setIsLoading(false);
          isFetchingRef.current = false;
          if (response.message) {
            showToast(response.message, 'error');
          } else {
            showToast(t('imageSearch.searchError') || 'Failed to search by image. Please try again.', 'error');
          }
          return;
        }

        if (response.data.products.length === 0) {
          setProducts([]);
          setAllProducts([]);
          setIsLoading(false);
          isFetchingRef.current = false;
          showToast(t('imageSearch.noResults') || 'No products found', 'info');
          return;
        }


        const mappedProducts: Product[] = response.data.products.map((item: any): Product => {
          // The API already normalizes products, so use the normalized fields
          // For Taobao, price is already parsed in the API normalization
          // Ensure price is a number, not string
          const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
          const originalPrice = typeof item.originalPrice === 'string' 
            ? parseFloat(item.originalPrice) 
            : (item.originalPrice || price);
          const wholesalePrice = typeof item.wholesalePrice === 'string'
            ? parseFloat(item.wholesalePrice)
            : (item.wholesalePrice || price);
          const dropshipPrice = typeof item.dropshipPrice === 'string'
            ? parseFloat(item.dropshipPrice)
            : (item.dropshipPrice || price);
          
          
          const discount =
            originalPrice > price && originalPrice > 0
              ? Math.round(((originalPrice - price) / originalPrice) * 100)
              : 0;

          // Map product data based on platform response structure
          // The API already normalizes products with title, price, wholesalePrice, dropshipPrice
          // Use the normalized fields directly, fallback to wholesale/dropship if price is 0
          const finalPrice = price > 0 ? price : (wholesalePrice || dropshipPrice || 0);
          const finalOriginalPrice = originalPrice > 0 ? originalPrice : finalPrice;
          
          const mappedProduct: Product = {
            id: item.id?.toString() || '',
            externalId: item.externalId?.toString() || item.id?.toString() || '',
            offerId: item.offerId?.toString() || item.externalId?.toString() || item.id?.toString() || '',
            name: item.title || item.name || item.titleOriginal || '',
            image: item.image || item.mainImage || item.imageUrl || '',
            price: finalPrice,
            originalPrice: finalOriginalPrice,
            discount,
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
              joinedDate: new Date(),
            },
            rating: Number(item.rating) || 0,
            reviewCount: Number(item.reviewCount || item.sales || 0),
            rating_count: Number(item.rating_count || item.sales || 0),
            inStock: true,
            stockCount: 0,
            tags: [],
            isNew: false,
            isFeatured: false,
            isOnSale: discount > 0,
            createdAt: new Date(item.createDate || new Date()),
            updatedAt: new Date(item.modifyDate || new Date()),
            orderCount: Number(item.orderCount || item.sales || 0),
            repurchaseRate: item.repurchaseRate ? String(item.repurchaseRate) : '',
          };
          
          // Add source to product for navigation
          (mappedProduct as any).source = platform;
          
          return mappedProduct;
        });

        // Store all products and apply sorting/filtering
        setAllProducts(mappedProducts);
        
        // Apply current sort and filter
        let filteredProducts = mappedProducts;
        
        // Apply price filter if set
        if (minPrice || maxPrice) {
          const priceStart = minPrice ? convertFromKRW(parseFloat(minPrice)) : undefined;
          const priceEnd = maxPrice ? convertFromKRW(parseFloat(maxPrice)) : undefined;
          
          filteredProducts = filteredProducts.filter((product) => {
            const productPrice = product.price || 0;
            if (priceStart !== undefined && productPrice < priceStart) return false;
            if (priceEnd !== undefined && productPrice > priceEnd) return false;
            return true;
          });
        }
        
        // Apply sorting
        const sortedProducts = sortProducts(filteredProducts, selectedSort);
        setProducts(sortedProducts);
        
      } catch (error: any) {
        setProducts([]);
        setAllProducts([]);
        setIsLoading(false);
        isFetchingRef.current = false;
        showToast(error?.message || t('imageSearch.searchError') || 'Failed to search products', 'error');
      } finally {
        if (isFetchingRef.current) {
          setIsLoading(false);
          isFetchingRef.current = false;
        }
      }
    },
    [route.params?.imageUri, locale, selectedCompany, imageBase64, selectedSort, minPrice, maxPrice]
  );

  // Set imageUri from route params
  useEffect(() => {
    if (route.params?.imageUri) {
      setImageUri(route.params.imageUri);
      setImageError(false); // Reset error state when new image is set
    }
  }, [route.params?.imageUri]);

  // Auto-load products when screen loads or company changes
  useEffect(() => {
    // Check if we have image data (either from params or state)
    const hasImageData = route.params?.imageUri || route.params?.imageBase64 || imageBase64;
    
    if (hasImageData) {
      setProducts([]);
      setAllProducts([]);
      loadedPagesRef.current.clear();
      loadProducts(1, false);
    }
  }, [route.params?.imageUri, route.params?.imageBase64, selectedCompany, loadProducts, imageBase64]);

  const handleProductPress = async (product: Product) => {
    // Try to get product ID from multiple fields (offerId, externalId, or id)
    const offerId = (product as any).offerId;
    const externalId = (product as any).externalId;
    const productIdToUse = offerId || externalId || product.id;
    
    // Check if product ID is valid
    if (!productIdToUse || productIdToUse === '') {
      // console.error('ImageSearchScreen: Product ID is missing or empty', {
      //   productId: product.id,
      //   offerId: offerId,
      //   externalId: externalId,
      //   product: product,
      // });
      showToast('Product ID is missing', 'error');
      return;
    }
    
    // Get source from product data, fallback to selectedCompany
    const platform = getPlatformFromCompany(selectedCompany);
    const source = (product as any).source || platform || '1688';
    
    // console.log('ImageSearchScreen: Navigating to product detail', {
    //   productId: productIdToUse,
    //   source: source,
    //   country: locale,
    //   offerId: offerId,
    //   externalId: externalId,
    // });
    
    await navigateToProductDetail(productIdToUse, source, locale);
  };


  const handleLikePress = async (product: Product) => {
    if (!user || isGuest) {
      Alert.alert('', t('imageSearch.pleaseLogin'));
      return;
    }
    await toggleWishlist(product);
  };

  const handleGoBack = () => {
    // console.log('Back button pressed - attempting to go back');
    try {
      navigation.goBack();
      // console.log('Navigation goBack called successfully');
    } catch (error) {
      // console.error('Error going back:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >          
          <ArrowBackIcon width={12} height={20} color={COLORS.black} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{t('imageSearch.title')}</Text>
        </View>
      </View>
    </View>
  );
  
  // Render company filter tabs (same as SearchScreen)
  const renderCompanyTabs = () => {
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
            const companyKey = `company-tab-${index}-${String(company).replace(/\s+/g, '-')}`;
            const companyName = String(company || '');
            
            return (
              <TouchableOpacity
                key={companyKey}
                style={[
                  styles.companyTab,
                  index === companies.length - 1 && { marginRight: SPACING.md },
                  index === 0 && { marginLeft: SPACING.md }
                ]}
                onPress={() => {
                  setSelectedCompany(company);
                  // Products will be reloaded automatically by useEffect when selectedCompany changes
                  // No need to call loadProducts() manually here
                }}
              >
                <Text style={[
                  styles.companyTabText,
                  isSelected && styles.activeCompanyTabText
                ]}>
                  {companyName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };
  

  // Render sort and filter bar with image on the left
  const renderSortAndFilter = () => {
    // Use original image URI for display
    const displayUri = imageUri || route.params?.imageUri;
    
    return (
      <View style={styles.sortFilterBar}>
        {displayUri && typeof displayUri === 'string' && !imageError ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: String(displayUri) }} 
              style={styles.uploadedImage}
              resizeMode="cover"
              onError={(error) => {
                try {
                  // React Native Image onError provides error in nativeEvent
                  const errorData = error?.nativeEvent as any;
                  const errorMessage = errorData?.error || 
                                     (typeof errorData === 'string' ? errorData : JSON.stringify(errorData || error)) || 
                                     'Unknown error';
                } catch (e) {
                }
                setImageError(true);
              }}
            />
          </View>
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        <View style={styles.sortButtonContainer}>
          <View style={styles.sortButton}>
            <SortDropdown
              options={sortOptions}
              selectedValue={selectedSort}
              onSelect={(value) => {
                setSelectedSort(value);
                // Sorting is applied client-side via useEffect
              }}
              textColor={COLORS.black}
              iconColor={COLORS.black}
            />
          </View>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setPriceFilterModalVisible(true)}
        >
          <ViewListIcon width={20} height={20} color={COLORS.black} />
        </TouchableOpacity>
      </View>
    );
  };


  const renderProductItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      variant="moreToLove"
      onPress={() => handleProductPress(item)}
      onLikePress={() => handleLikePress(item)}
      isLiked={likedProductIds.includes(item.id)}
      cardWidth={CARD_WIDTH}
    />
  );



  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderCompanyTabs()}
      {renderSortAndFilter()}
      
      <PriceFilterModal
        visible={priceFilterModalVisible}
        onClose={() => setPriceFilterModalVisible(false)}
        onApply={(min, max) => {
          setMinPrice(min);
          setMaxPrice(max);
          // Note: Image search API may not support price filtering, but we keep the UI consistent
          showToast('Price filter applied', 'success');
        }}
        initialMinPrice={minPrice}
        initialMaxPrice={maxPrice}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('imageSearch.searching')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductItem}
          keyExtractor={(item, index) => `product-${item.id?.toString() || index}-${index}`}
          numColumns={2}
          columnWrapperStyle={styles.productGrid}
          contentContainerStyle={styles.productListContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
        />
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
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
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.primary,
    fontWeight: '600',
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
  activeCompanyTabText: {
    color: COLORS.text.red,
    fontWeight: '600',
  },
  sortFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    gap: SPACING.sm,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
  },
  uploadedImage: {
    width: 100,
    height: 100,
  },
  sortButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  filterButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingMoreText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  endOfListText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
  productGrid: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  productListContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
});

export default ImageSearchScreen;

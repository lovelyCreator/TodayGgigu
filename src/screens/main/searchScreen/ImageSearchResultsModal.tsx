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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../../../store/hooks';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList, Product } from '../../../types';
import { ProductCard, SortDropdown, PriceFilterModal } from '../../../components';
import { useAuth } from '../../../context/AuthContext';
import { translations } from '../../../i18n/translations';
import { productsApi } from '../../../services/productsApi';
import Icon from '../../../components/Icon';
import { useToast } from '../../../context/ToastContext';
import { sortProducts } from '../../../utils/productSort';
import { convertFromKRW } from '../../../utils/i18nHelpers';
import { compressImageForSearch } from '../../../utils/imageCompression';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.md * 3) / 2;

type ImageSearchResultsModalNavigationProp = StackNavigationProp<RootStackParamList>;

interface ImageSearchResultsModalProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string;
  imageBase64: string;
}

const ImageSearchResultsModal: React.FC<ImageSearchResultsModalProps> = ({
  visible,
  onClose,
  imageUri,
  imageBase64,
}) => {
  const navigation = useNavigation<ImageSearchResultsModalNavigationProp>();
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
    const productId = product.id?.toString() || '';
    setLikedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };
  const { user, isGuest } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [priceFilterModalVisible, setPriceFilterModalVisible] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('best_match');
  const PAGE_SIZE = 40; // per platform per page

  // Sort options - Best Match and Price only (no Popular)
  const sortOptions = [
    { label: 'Best Match', value: 'best_match' },
    { label: 'Price: Low to High', value: 'price_low' },
    { label: 'Price: High to Low', value: 'price_high' },
  ];
  
  const { showToast } = useToast();
  
  const isFetchingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const currentPageRef = useRef<number>(1);
  const hasMoreRef = useRef<boolean>(true);
  
  // Helper function to navigate to product detail
  const navigateToProductDetail = async (
    productId: string | number,
    source: string = '1688',
    country: string = locale
  ) => {
    navigation.navigate('ProductDetail', {
      productId: productId.toString(),
      source: source,
      country: country,
    } as any);
  };

  const loadProducts = useCallback(
    async (page: number = 1) => {
      if (page === 1 && isFetchingRef.current) return;
      if (page > 1 && isLoadingMoreRef.current) return;
      if (!imageBase64) return;

      try {
        if (page === 1) {
          isFetchingRef.current = true;
          setIsLoading(true);
        } else {
          isLoadingMoreRef.current = true;
          setIsLoadingMore(true);
        }

        // Compress image if needed — try progressively smaller until under limit
        let base64: string | null = imageBase64;
        const base64Size = imageBase64.length;
        const sizeMB = base64Size / 1024 / 1024;

        if (base64Size > 1200000) {
          const qualities = [0.3, 0.25, 0.2, 0.15, 0.1, 0.08, 0.05];
          let compressed: string | null = null;
          for (const q of qualities) {
            compressed = await compressImageForSearch(imageUri, sizeMB, q);
            if (compressed && compressed.length <= 1200000) break;
            compressed = null; // reset if still too large
          }
          if (compressed) {
            base64 = compressed;
          } else {
            showToast('Image is too large to process. Please use a smaller image.', 'error');
            return;
          }
        }

        if (!base64) {
          showToast('Image data not available. Please try again.', 'error');
          return;
        }

        const language = locale === 'ko' ? 'ko' : 'en';

        // Call both APIs in parallel with page + pageSize
        const [response1688, responseTaobao] = await Promise.allSettled([
          productsApi.imageSearch1688(base64, language, page, PAGE_SIZE),
          productsApi.imageSearchTaobao(language, base64, page, PAGE_SIZE),
        ]);

        const raw1688 =
          response1688.status === 'fulfilled' && response1688.value?.success && Array.isArray(response1688.value?.data?.products)
            ? response1688.value.data.products.map((item: any) => ({ ...item, source: '1688' }))
            : [];

        const rawTaobao =
          responseTaobao.status === 'fulfilled' && responseTaobao.value?.success && Array.isArray(responseTaobao.value?.data?.products)
            ? responseTaobao.value.data.products.map((item: any) => ({ ...item, source: 'taobao' }))
            : [];

        // No more data if both return empty on subsequent pages
        if (raw1688.length === 0 && rawTaobao.length === 0) {
          hasMoreRef.current = false;
          return;
        }

        // hasMore if either platform returned a full page
        hasMoreRef.current = raw1688.length >= PAGE_SIZE || rawTaobao.length >= PAGE_SIZE;

        const combined = [...raw1688, ...rawTaobao];

        // Fisher-Yates shuffle
        for (let i = combined.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combined[i], combined[j]] = [combined[j], combined[i]];
        }

        const mappedProducts: Product[] = combined.map((item: any): Product => {
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

          const discount = originalPrice > price && originalPrice > 0
            ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
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
            seller: { id: '', name: '', avatar: '', rating: 0, reviewCount: 0, isVerified: false, followersCount: 0, description: '', location: '', joinedDate: new Date() },
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
          (mappedProduct as any).source = item.source || '1688';
          return mappedProduct;
        });

        // Apply price filter
        let filtered = mappedProducts;
        if (minPrice || maxPrice) {
          const priceStart = minPrice ? convertFromKRW(parseFloat(minPrice)) : undefined;
          const priceEnd = maxPrice ? convertFromKRW(parseFloat(maxPrice)) : undefined;
          filtered = filtered.filter((p) => {
            const pp = p.price || 0;
            if (priceStart !== undefined && pp < priceStart) return false;
            if (priceEnd !== undefined && pp > priceEnd) return false;
            return true;
          });
        }

        const sorted = sortProducts(filtered, selectedSort);

        if (page === 1) {
          setAllProducts(mappedProducts);
          setProducts(sorted);
          if (sorted.length === 0) showToast(t('imageSearch.noResults') || 'No products found', 'info');
        } else {
          setAllProducts(prev => [...prev, ...mappedProducts]);
          setProducts(prev => [...prev, ...sorted]);
        }

        currentPageRef.current = page;

      } catch (error: any) {
        if (page === 1) { setProducts([]); setAllProducts([]); }
        showToast(error?.message || t('imageSearch.searchError') || 'Failed to search products', 'error');
      } finally {
        isFetchingRef.current = false;
        isLoadingMoreRef.current = false;
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [imageBase64, imageUri, locale, selectedSort, minPrice, maxPrice]
  );

  // Auto-load on open
  useEffect(() => {
    if (visible && imageBase64) {
      setProducts([]);
      setAllProducts([]);
      currentPageRef.current = 1;
      hasMoreRef.current = true;
      isFetchingRef.current = false;
      isLoadingMoreRef.current = false;
      loadProducts(1);
    }
  }, [visible, imageBase64, loadProducts]);

  // Re-apply sort/filter client-side on already-fetched data
  useEffect(() => {
    if (allProducts.length > 0) {
      let filtered = allProducts;
      if (minPrice || maxPrice) {
        const priceStart = minPrice ? convertFromKRW(parseFloat(minPrice)) : undefined;
        const priceEnd = maxPrice ? convertFromKRW(parseFloat(maxPrice)) : undefined;
        filtered = filtered.filter((p) => {
          const pp = p.price || 0;
          if (priceStart !== undefined && pp < priceStart) return false;
          if (priceEnd !== undefined && pp > priceEnd) return false;
          return true;
        });
      }
      setProducts(sortProducts(filtered, selectedSort));
    }
  }, [selectedSort, minPrice, maxPrice, allProducts]);

  const handleEndReached = useCallback(() => {
    if (isLoadingMoreRef.current || isFetchingRef.current || !hasMoreRef.current) return;
    loadProducts(currentPageRef.current + 1);
  }, [loadProducts]);

  const handleProductPress = useCallback(async (product: Product) => {
    const offerId = (product as any).offerId;
    const externalId = (product as any).externalId;
    const productIdToUse = offerId || externalId || product.id;
    
    if (!productIdToUse || productIdToUse === '') {
      showToast('Product ID is missing', 'error');
      return;
    }
    
    const source = (product as any).source || '1688';
    await navigateToProductDetail(productIdToUse, source, locale);
  }, [navigateToProductDetail, locale, showToast]);

  const handleLikePress = useCallback(async (product: Product) => {
    if (!user || isGuest) {
      Alert.alert('', t('imageSearch.pleaseLogin'));
      return;
    }
    await toggleWishlist(product);
  }, [user, isGuest, toggleWishlist]);

  const renderHeader = () => (
    <View style={styles.header}>
      
      {/* Captured Image and Close Button */}
      <View style={styles.headerTop}>
        {imageUri && typeof imageUri === 'string' && !imageError && (
          <View style={styles.imageHeaderContainer}>
            <View style={styles.imageHeaderWrapper}>
              <Image 
                source={{ uri: String(imageUri) }} 
                style={styles.imageHeaderImage}
                resizeMode="cover"
                onError={() => {
                  setImageError(true);
                }}
              />
              {/* Orange triangle pointing down */}
              <View style={styles.imageHeaderTriangle} />
            </View>
          </View>
        )}
        <View style={styles.headerSpacer} />
        <TouchableOpacity 
          style={styles.headerCloseButton}
          onPress={onClose}
        >
          <Icon name="close" size={20} color={COLORS.black} />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderSortAndFilter = () => {
    return (
      <View style={styles.sortFilterBarContainer}>
        <View style={styles.dragHandle} />
        <View style={styles.sortFilterBar}>
          <SortDropdown
            options={sortOptions}
            selectedValue={selectedSort}
            onSelect={setSelectedSort}
          />
          {/* <TouchableOpacity
            style={styles.priceFilterButton}
            onPress={() => setPriceFilterModalVisible(true)}
          >
            <Icon name="filter" size={14} color={(minPrice || maxPrice) ? '#FF6B35' : COLORS.text.primary} />
            <Text style={[styles.priceFilterText, (minPrice || maxPrice) && { color: '#FF6B35' }]}>
              {t('search.filter')}
            </Text>
          </TouchableOpacity> */}
        </View>
      </View>
    );
  };

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      variant="moreToLove"
      onPress={() => handleProductPress(item)}
      onLikePress={() => handleLikePress(item)}
      isLiked={likedProductIds.includes(item.id)}
      cardWidth={CARD_WIDTH}
    />
  ), [likedProductIds, handleProductPress, handleLikePress]);

  const keyExtractor = useCallback((item: Product, index: number) => {
    const id = (item as any)?.offerId?.toString() || (item as any)?.externalId?.toString() || item?.id?.toString() || `index-${index}`;
    return `product-${id}-${index}`;
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderSortAndFilter()}
        
        {/* Price Filter Modal */}
        <PriceFilterModal
          visible={priceFilterModalVisible}
          onClose={() => setPriceFilterModalVisible(false)}
          onApply={(min, max) => {
            setMinPrice(min);
            setMaxPrice(max);
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
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.productGrid}
            contentContainerStyle={styles.productListContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            extraData={products.length}
            style={{ backgroundColor: COLORS.background }}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingMoreText}>{t('home.loadingMore')}</Text>
                </View>
              ) : null
            }
          />
        )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  imageOverlay: {
    position: 'absolute',
    top: SPACING.xl * 2,
    left: SPACING.md,
    zIndex: 1000,
    elevation: 10,
  },
  imageOverlayWrapper: {
    width: 60,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: '#FF6B35',
    overflow: 'visible',
    backgroundColor: COLORS.gray[100],
    position: 'relative',
    paddingBottom: 6, // Space for triangle
  },
  imageOverlayImage: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.sm,
  },
  imageOverlayTriangle: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF6B35',
  },
  container: {
    flex: 1,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
  },
  header: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.sm,
    backgroundColor: 'transparent',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  imageHeaderContainer: {
    alignItems: 'flex-start',
  },
  imageHeaderWrapper: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: '#FF6B35',
    overflow: 'visible',
    backgroundColor: COLORS.gray[100],
    position: 'relative',
    paddingBottom: 6, // Space for triangle
  },
  imageHeaderImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  imageHeaderTriangle: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF6B35',
  },
  headerSpacer: {
    flex: 1,
  },
  headerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: '#FF6B35', // Orange border
    overflow: 'hidden',
    backgroundColor: COLORS.gray[100],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailCloseButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gray[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
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
  sortFilterBarContainer: {
    backgroundColor: COLORS.background,
    paddingBottom: SPACING.md,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  sortFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  priceFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
  },
  priceFilterText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  sortOptionButtonActive: {
    backgroundColor: 'transparent',
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
  productGrid: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
  },
  productListContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
});

export default ImageSearchResultsModal;


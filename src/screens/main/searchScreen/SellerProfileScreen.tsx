import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  TextInput,
  Animated,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, SHADOWS } from '../../../constants';
import { ProductCard } from '../../../components';
import { productsApi } from '../../../services/productsApi';
import { useToast } from '../../../context/ToastContext';
import { useAppSelector } from '../../../store/hooks';
import { useWishlistStatus } from '../../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../../hooks/useDeleteFromWishlistMutation';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import StarIcon from '../../../assets/icons/StarIcon';
import StarHalfIcon from '../../../assets/icons/StarHalfIcon';

const { width } = Dimensions.get('window');

const SellerProfileScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sellerId, sellerName, source = '1688', country = 'en' } = route.params || {};
  const { showToast } = useToast();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  
  const { isProductLiked, refreshExternalIds, addExternalId, removeExternalId } = useWishlistStatus();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true); // Assume following initially
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  
  // State for scroll to top button
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const storeData = {
    id: sellerId,
    name: sellerName || 'Store',
    image: 'https://via.placeholder.com/100',
    rating: 5.0,
    reviewCount: '1.3K+',
    soldCount: '1.3K+',
  };

  // Add to wishlist mutation
  const { mutate: addToWishlist } = useAddToWishlistMutation({
    onSuccess: async () => {
      showToast(t('product.productAddedToWishlist'), 'success');
      await refreshExternalIds();
    },
    onError: (error) => {
      showToast(error || t('product.failedToAddToWishlist'), 'error');
    },
  });

  // Delete from wishlist mutation
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation({
    onSuccess: async () => {
      showToast(t('product.productRemovedFromWishlist'), 'success');
      await refreshExternalIds();
    },
    onError: (error) => {
      showToast(error || t('product.failedToRemoveFromWishlist'), 'error');
    },
  });

  const toggleWishlist = async (product: any) => {
    if (!user || !isAuthenticated) {
      showToast(t('home.pleaseLogin') || 'Please login first', 'warning');
      return;
    }

    const externalId = product.externalId?.toString() || product.id?.toString() || '';
    if (!externalId) {
      showToast(t('product.invalidProductId'), 'error');
      return;
    }

    const isLiked = isProductLiked(product);
    const productSource = product.source || source || '1688';
    const productCountry = locale === 'zh' ? 'en' : locale;

    if (isLiked) {
      await removeExternalId(externalId);
      deleteFromWishlist(externalId);
    } else {
      const imageUrl = product.image || product.main_image_url || '';
      const price = parseFloat(product.price || 0);
      const title = product.name || product.title || '';

      if (!imageUrl || !title || price <= 0) {
        showToast(t('product.invalidProductData'), 'error');
        return;
      }

      await addExternalId(externalId);
      addToWishlist({ offerId: externalId, platform: productSource });
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !isAuthenticated) {
      showToast(t('home.pleaseLogin') || 'Please login first', 'warning');
      return;
    }

    if (isFollowing) {
      // Show unfollow confirmation modal
      setShowUnfollowModal(true);
    } else {
      // Follow directly
      await performToggleFollow('follow');
    }
  };

  const performToggleFollow = async (action: 'follow' | 'unfollow') => {
    setIsTogglingFollow(true);
    try {
      const platform = source === 'taobao' ? 'taobao' : '1688';
      
      if (action === 'follow') {
        // Use followStoreWithProducts API for following
        // Get up to 2 products from the current products list
        const productsToSend = allProducts.slice(0, 2).map((product: any) => ({
          offerId: product.externalId || product.id || '',
          title: product.name || product.title || '',
          imageUrl: product.image || '',
          price: product.price?.toString() || '0',
        }));
        
        const response = await productsApi.followStoreWithProducts(
          sellerId,
          sellerName || 'Store',
          productsToSend,
          platform
        );
        
        if (response.success) {
          setIsFollowing(true);
          showToast('Store followed successfully', 'success');
        } else {
          showToast(response.message || 'Failed to follow store', 'error');
        }
      } else {
        // Use toggleFollowStore API for unfollowing
        const response = await productsApi.toggleFollowStore(sellerId, platform, 'unfollow');
        
        if (response.success) {
          setIsFollowing(false);
          showToast('Store unfollowed successfully', 'success');
        } else {
          showToast(response.message || 'Failed to unfollow store', 'error');
        }
      }
    } catch (error) {
      showToast(`Failed to ${action} store`, 'error');
    } finally {
      setIsTogglingFollow(false);
      setShowUnfollowModal(false);
    }
  };

  const fetchProducts = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let response;
      
      if (source === 'taobao') {
        // Fetch Taobao seller products
        response = await productsApi.getTaobaoSellerProducts(sellerId, {
          page_no: page,
          page_size: 20,
          language: locale === 'zh' ? 'en' : locale,
          keyword: searchQuery || undefined,
        });

        if (response.success && response.data) {
          const mappedProducts = response.data.data.map((item: any) => ({
            id: item.item_id?.toString() || '',
            externalId: item.item_id?.toString() || '',
            name: item.multi_language_info?.title || item.title || '',
            title: item.multi_language_info?.title || item.title || '',
            image: item.main_image_url || '',
            price: parseFloat(item.price || 0),
            source: 'taobao',
          }));

          if (append) {
            setAllProducts(prev => [...prev, ...mappedProducts]);
          } else {
            setAllProducts(mappedProducts);
          }

          setHasMore(mappedProducts.length === 20);
        }
      } else {
        // Fetch 1688 seller products
        response = await productsApi.get1688SellerProducts(sellerId, {
          beginPage: page,
          pageSize: 20,
          country: country,
          keyword: searchQuery || undefined,
        });

        if (response.success && response.data) {
          const mappedProducts = response.data.products.map((item: any) => ({
            id: item.externalId?.toString() || item.id?.toString() || '',
            externalId: item.externalId?.toString() || item.id?.toString() || '',
            name: item.title || '',
            title: item.title || '',
            image: item.image || '',
            price: parseFloat(item.price || 0),
            source: '1688',
          }));

          if (append) {
            setAllProducts(prev => [...prev, ...mappedProducts]);
          } else {
            setAllProducts(mappedProducts);
          }

          const pagination = response.data.pagination;
          setHasMore(pagination.currentPage < pagination.totalPage);
        }
      }
    } catch (error) {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchProducts(1, false);
    }
  }, [sellerId, source]);

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return allProducts;
    }

    return allProducts.filter((product: any) =>
      String(product.name || '').toLowerCase().includes(keyword),
    );
  }, [allProducts, searchQuery]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && searchQuery.trim() === '') {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchProducts(nextPage, true);
    }
  }, [currentPage, hasMore, loadingMore, searchQuery]);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const scrollPosition = contentOffset.y;
    
    if (scrollPosition > 300 && !showScrollToTop) {
      setShowScrollToTop(true);
      Animated.timing(scrollToTopOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else if (scrollPosition <= 300 && showScrollToTop) {
      Animated.timing(scrollToTopOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowScrollToTop(false));
    }
  };

  const renderHeader = () => (
    <>
      <View style={styles.storeInfoContainer}>
        <View style={styles.storeRow}>
          <View style={styles.storeDetailsColumn}>
            <Text style={styles.storeName} numberOfLines={1}>{storeData.name}</Text>
            <View style={styles.storeStatsRow}>
              {(() => {
                const rating = storeData.rating || 0;
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;
                const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                
                const stars = [];
                // Full stars
                for (let i = 0; i < fullStars; i++) {
                  stars.push(
                    <StarIcon key={`full-${i}`} width={16} height={16} color="#FF5500" />
                  );
                }
                // Half star
                if (hasHalfStar) {
                  stars.push(
                    <StarHalfIcon key="half" width={16} height={16} color="#FF5500" />
                  );
                }
                // Empty stars
                for (let i = 0; i < emptyStars; i++) {
                  stars.push(
                    <StarIcon key={`empty-${i}`} width={16} height={16} color="#E0E0E0" />
                  );
                }
                return stars;
              })()}
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleToggleFollow}
            disabled={isTogglingFollow}
          >
            {isTogglingFollow ? (
              <ActivityIndicator size="small" color={isFollowing ? COLORS.text.red : COLORS.background} />
            ) : (
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderProduct = useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={styles.productItem}>
      <ProductCard
        product={item}
        variant="moreToLove"
        onPress={() => navigation.navigate('ProductDetail', { 
          productId: item.id,
          offerId: item.externalId,
          source: item.source,
          country: country,
        })}
        onLikePress={() => toggleWishlist(item)}
        isLiked={isProductLiked(item)}
      />
    </View>
  ), [country, isProductLiked, navigation]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No products found</Text>
      </View>
    );
  }, [loading]);

  const productKeyExtractor = useCallback((item: any, index: number) => `${item.id}-${index}`, []);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color={COLORS.black} />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Keywords"
              placeholderTextColor={COLORS.gray[400]}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchButton}>
              <Icon name="search" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="ellipsis-horizontal" size={24} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={productKeyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.productsRow}
          // ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={7}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
        />
      )}
      
      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <Animated.View
          style={[
            styles.scrollToTopButton,
            { opacity: scrollToTopOpacity }
          ]}
        >
          <TouchableOpacity
            onPress={scrollToTop}
            style={styles.scrollToTopTouchable}
            activeOpacity={0.8}
          >
            <Icon name="chevron-up" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Unfollow Confirmation Modal */}
      <Modal
        visible={showUnfollowModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnfollowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unfollow</Text>
            <Text style={styles.modalMessage}>Are you sure you want to unfollow?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowUnfollowModal(false)}
                disabled={isTogglingFollow}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => performToggleFollow('unfollow')}
                disabled={isTogglingFollow}
              >
                {isTogglingFollow ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: 25,
    paddingLeft: SPACING.md,
    height: 32,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    paddingVertical: 0,
  },
  searchButton: {
    width: 28,
    height: 24,
    borderRadius: 18,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  storeInfoContainer: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  storeImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  storeDetailsColumn: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  storeName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  storeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  followersText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginLeft: SPACING.xs,
    fontWeight: '400',
  },
  followButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: 6,
    minWidth: 90,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  followingButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#0000000D',
  },
  followingButtonText: {
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  storeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.gray[300],
    marginHorizontal: SPACING.md,
  },
  statText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  productsRow: {
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  productItem: {
    width: (width - SPACING.sm - SPACING.sm* 2) / 2,
  },
  loadingMore: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    width: '100%',
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    fontWeight: '400',
  },
  scrollToTopButton: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 100,
    zIndex: 999,
  },
  scrollToTopTouchable: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.xl,
    paddingVertical: SPACING.md,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    // marginBottom: SPACING.md,
  },
  modalMessage: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontWeight: '400',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default SellerProfileScreen;

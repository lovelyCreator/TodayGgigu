import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  FlatList,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Text from '../../../components/Text';
import Icon from '../../../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, SCREEN_WIDTH } from '../../../constants';
import { productsApi } from '../../../services/productsApi';
import { useToast } from '../../../context/ToastContext';
import { useAppSelector } from '../../../store/hooks';
import { useWishlistStatus } from '../../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../../hooks/useDeleteFromWishlistMutation';
import { useAuth } from '../../../context/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import SearchIcon from '../../../assets/icons/SearchIcon';
import SensorsIcon from '../../../assets/icons/SensorsIcon';
import ArrowDropDownIcon from '../../../assets/icons/ArrowDropDownIcon';
import { formatPriceKRW } from '../../../utils/i18nHelpers';

const { width } = Dimensions.get('window');
const PRODUCT_GAP = 6;
const PRODUCT_COLUMN_COUNT = 3;
const PRODUCT_CARD_WIDTH = (width - SPACING.md * 2 - PRODUCT_GAP * (PRODUCT_COLUMN_COUNT - 1)) / PRODUCT_COLUMN_COUNT;

type FilterTab = 'bestMatch' | 'sales' | 'newArrivals';

const getLiveCommerceItemTitle = (item: any, locale: 'en' | 'ko' | 'zh') => {
  const product = item?.product || {};
  if (locale === 'ko') return product.titleKo || product.titleEn || product.titleZh || item?.liveTitle || '';
  if (locale === 'zh') return product.titleZh || product.titleEn || product.titleKo || item?.liveTitle || '';
  return product.titleEn || product.titleKo || product.titleZh || item?.liveTitle || '';
};

const LiveSellerDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sellerId, sellerName, source = 'ownmall', country = 'en' } = route.params || {};
  const { showToast } = useToast();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  const { isProductLiked, refreshExternalIds, addExternalId, removeExternalId } = useWishlistStatus();

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('bestMatch');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [sellerProfile, setSellerProfile] = useState<any>({
    id: sellerId,
    name: sellerName || 'TM SUNSHINE',
    avatar: 'https://via.placeholder.com/80.png?text=S',
    onlineViewers: 0,
    isLive: false,
    totalViews: 0,
    totalItemsSold: 0,
  });

  // Scroll to top
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // ─── Wishlist mutations ───────────────────────────────────
  const { mutate: addToWishlist } = useAddToWishlistMutation({
    onSuccess: async () => {
      showToast(t('product.productAddedToWishlist'), 'success');
      await refreshExternalIds();
    },
    onError: (error) => {
      showToast(error || t('product.failedToAddToWishlist'), 'error');
    },
  });

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
    const productSource = product.source || source || 'ownmall';

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

  // ─── Follow / Unfollow ────────────────────────────────────
  const handleToggleFollow = async () => {
    if (!user || !isAuthenticated) {
      showToast(t('home.pleaseLogin') || 'Please login first', 'warning');
      return;
    }

    if (isFollowing) {
      setShowUnfollowModal(true);
    } else {
      await performToggleFollow('follow');
    }
  };

  const performToggleFollow = async (action: 'follow' | 'unfollow') => {
    setIsTogglingFollow(true);
    try {
      const platform = '1688';

      if (action === 'follow') {
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
          showToast(t('live.storeFollowedSuccessfully'), 'success');
        } else {
          showToast(response.message || t('live.failedToFollowStore'), 'error');
        }
      } else {
        const response = await productsApi.toggleFollowStore(sellerId, platform, 'unfollow');

        if (response.success) {
          setIsFollowing(false);
          showToast(t('live.storeUnfollowedSuccessfully'), 'success');
        } else {
          showToast(response.message || t('live.failedToUnfollowStore'), 'error');
        }
      }
    } catch (error) {
      showToast(`Failed to ${action} store`, 'error');
    } finally {
      setIsTogglingFollow(false);
      setShowUnfollowModal(false);
    }
  };

  // ─── Fetch products ───────────────────────────────────────
  const fetchProducts = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await productsApi.getLiveCommerceSellerDetail(sellerId, {
        page,
        pageSize: 20,
      });

      if (response.success && response.data) {
        const liveSeller = response.data.liveSeller || {};
        const items = response.data.items || [];
        const mappedProducts = items.map((item: any) => ({
          id: item.productId || item.product?.id || item.id || '',
          externalId: item.productId || item.product?.id || item.id || '',
          name: getLiveCommerceItemTitle(item, locale),
          title: getLiveCommerceItemTitle(item, locale),
          image: item.product?.imageUrl || item.imageUrl || item.mediaUrl || '',
          price: parseFloat(String(item.product?.price ?? 0)),
          originalPrice: parseFloat(String(item.product?.price ?? item.product?.promotionPrice ?? 0)),
          source: 'ownmall',
          label: item.isHotProduct ? t('live.hotProduct') : (item.status || t('live.live')),
          soldCount: item.itemsSold || 0,
          reviewCount: item.reviewNumbers || 0,
          rating: item.reviewScore || 0,
          category: item.product?.categoryName?.[locale] || item.product?.categoryName?.en || '',
          liveTitle: item.liveTitle || '',
          status: item.status || '',
          raw: item,
        }));

        if (append) {
          setAllProducts(prev => [...prev, ...mappedProducts]);
        } else {
          setAllProducts(mappedProducts);
        }

        const totalOnlineViewers = items.reduce(
          (sum: number, item: any) => sum + (item.onlineViews || 0),
          0,
        );

        const liveItem = items.find((item: any) => (item.status || '').toLowerCase() === 'live');
        setSellerProfile({
          id: liveSeller._id || sellerId,
          name: liveSeller.nickname || liveSeller.userName || sellerName || 'Seller',
          avatar: liveSeller.picUrl || 'https://via.placeholder.com/80.png?text=S',
          onlineViewers: totalOnlineViewers,
          isLive: !!liveItem,
          liveLink: liveItem?.liveLink || null,
          totalViews: liveSeller.totalViews || 0,
          totalItemsSold: liveSeller.totalItemsSold || 0,
          tao10Rank: liveSeller.tao10Rank || 0,
          isPopular: !!liveSeller.isPopular,
          isPoint: !!liveSeller.isPoint,
        });

        const pagination = response.data.pagination;
        setHasMore((pagination.page * pagination.pageSize) < pagination.total);
      }
    } catch (error) {
      showToast(t('live.failedToLoadProducts'), 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchProducts(1, false);
    }
  }, [sellerId, locale]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats)];
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Sort
    switch (activeFilter) {
      case 'sales':
        result.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      case 'newArrivals':
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      default:
        break;
    }
    return result;
  }, [allProducts, activeFilter, selectedCategory]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchProducts(nextPage, true);
    }
  }, [currentPage, hasMore, loadingMore]);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;

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

  // ─── List Header (Seller profile + filters) ──────────────
  const renderListHeader = () => (
    <View>
      {/* Seller Profile Section */}
      <View style={styles.sellerProfileSection}>
        <View style={styles.sellerProfileRow}>
          {/* Seller name on left */}
          <Text style={styles.sellerName} numberOfLines={1}>{sellerProfile.name}</Text>

          {/* Avatar center */}
          <View style={styles.sellerAvatarContainer}>
            <View style={styles.sellerAvatarRing}>
              <Image
                source={{ uri: sellerProfile.avatar }}
                style={styles.sellerAvatar}
              />
            </View>
            {sellerProfile.isLive && (
              <TouchableOpacity
                style={styles.sellerLiveBadge}
                onPress={() => {
                  if (sellerProfile.liveLink) {
                    Linking.openURL(sellerProfile.liveLink).catch(() => {});
                  } else {
                    navigation.navigate('Live' as never);
                  }
                }}
              >
                <Text style={styles.sellerLiveBadgeText}>{t('live.live')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Viewers + Watch on right */}
          <View style={styles.sellerRightInfo}>
            <Text style={styles.sellerViewersText}>{t('live.onlineViewers')} {sellerProfile.onlineViewers}</Text>
            <TouchableOpacity
              style={styles.watchLink}
              onPress={() => {
                if (sellerProfile.liveLink) {
                  Linking.openURL(sellerProfile.liveLink).catch(() => {});
                } else {
                  navigation.navigate('Live' as never);
                }
              }}
            >
              <Text style={styles.watchLinkDot}>{'👉 '}</Text>
              <Text style={styles.watchLinkText}>{`${t('live.watch')} >`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Category Dropdown */}
      <View style={styles.categoryDropdownContainer}>
        <TouchableOpacity
          style={styles.categoryDropdown}
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
        >
          <Text style={styles.categoryDropdownText}>
            {selectedCategory === 'all' ? t('live.allItems') : selectedCategory}
          </Text>
          <ArrowDropDownIcon width={18} height={18} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'bestMatch' && styles.filterTabActive]}
          onPress={() => setActiveFilter('bestMatch')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'bestMatch' && styles.filterTabTextActive]}>
            {t('live.bestMatch')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'sales' && styles.filterTabActive]}
          onPress={() => setActiveFilter('sales')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'sales' && styles.filterTabTextActive]}>
            {t('live.sales')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'newArrivals' && styles.filterTabActive]}
          onPress={() => setActiveFilter('newArrivals')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'newArrivals' && styles.filterTabTextActive]}>
            {t('live.newArrivals')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Product Card ─────────────────────────────────────────
  const renderProduct = useCallback(({ item }: { item: any }) => {
    const imageUri = item.image || '';
    const price = item.price || 0;
    const originalPrice = item.originalPrice || 0;
    const title = item.title || item.name || '';
    const reviewCount = item.reviewCount || 0;
    const soldCount = item.soldCount || 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProductDetail', {
          productId: item.id,
          offerId: item.externalId,
          source: item.source,
          country: country,
        })}
      >
        <Image
          source={{ uri: imageUri || 'https://via.placeholder.com/150.png?text=Product' }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfoContainer}>
          <Text style={styles.productPrice}>
            {formatPriceKRW(price)}
          </Text>
          {originalPrice > 0 && originalPrice > price && (
            <Text style={styles.productOriginalPrice}>
              {formatPriceKRW(originalPrice)}
            </Text>
          )}
          <Text style={styles.productTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.productMeta}>
            {reviewCount > 0 ? t('product.reviewsCount').replace('{count}', reviewCount.toString()) : ''}
            {reviewCount > 0 && soldCount > 0 ? ' · ' : ''}
            {soldCount > 0 ? t('product.soldCount').replace('{count}', soldCount.toLocaleString()) : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [country, navigation]);

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
        <Text style={styles.emptyText}>{t('live.noProductsFound')}</Text>
      </View>
    );
  }, [loading]);

  const productKeyExtractor = useCallback((item: any, index: number) => `${item.id}-${index}`, []);

  return (
    <View style={styles.container}>
      {/* Gradient background - same as homepage */}
      <LinearGradient
        colors={['#FF0000', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
        pointerEvents="none"
      />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header - same as LiveScreen */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => navigation.navigate('Main', { screen: 'Live' })}
          >
            <View style={styles.broadcastIconContainer}>
              <SensorsIcon width={24} height={24} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('live.live')}</Text>
              <Text style={styles.headerSubtitle}>{t('live.channel')}</Text>
            </View>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.headerSearchBtn}>
            <SearchIcon width={24} height={24} color={COLORS.white} />
          </TouchableOpacity> */}
        </View>
      </SafeAreaView>

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
          numColumns={3}
          columnWrapperStyle={styles.productsRow}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={12}
          windowSize={7}
          initialNumToRender={12}
          updateCellsBatchingPeriod={50}
        />
      )}

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <Animated.View style={[styles.scrollToTopButton, { opacity: scrollToTopOpacity }]}>
          <TouchableOpacity
            onPress={scrollToTop}
            style={styles.scrollToTopTouchable}
            activeOpacity={0.8}
          >
            <Icon name="chevron-up" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Category Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.dropdownModalContent}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryDropdownItem,
                  selectedCategory === cat && styles.categoryDropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryDropdownItemText,
                    selectedCategory === cat && styles.categoryDropdownItemTextActive,
                  ]}
                >
                  {cat === 'all' ? t('live.allItems') : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Unfollow Confirmation Modal */}
      <Modal
        visible={showUnfollowModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnfollowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('live.unfollow')}</Text>
            <Text style={styles.modalMessage}>{t('live.unfollowConfirmation')}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowUnfollowModal(false)}
                disabled={isTogglingFollow}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => performToggleFollow('unfollow')}
                disabled={isTogglingFollow}
              >
                {isTogglingFollow ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
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
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    zIndex: 0,
  },
  safeArea: {
    zIndex: 1,
  },

  // ─── Header ─────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.smmd,
    zIndex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  broadcastIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
    color: COLORS.white,
    fontFamily: FONTS.families.black,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: FONTS.families.bold,
  },
  headerSearchBtn: {
    padding: SPACING.xs,
  },

  // ─── Seller Profile ─────────────────────────────────────
  sellerProfileSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  sellerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    width: 120,
    textAlign: 'right',
  },
  sellerAvatarContainer: {
    alignItems: 'center',
    marginHorizontal: SPACING.smmd,
    backgroundColor: 'COLORS.white',
    overflow: 'hidden',
  },
  sellerAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 8,
    borderColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sellerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  sellerLiveBadge: {
    position: 'absolute',
    top: 1,
    alignSelf: 'center',
    backgroundColor: '#FF0000',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 1,
  },
  sellerLiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
  },
  sellerRightInfo: {
    alignItems: 'flex-start',
    width: 120,
  },
  sellerViewersText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  watchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 2,
  },
  watchLinkDot: {
    fontSize: FONTS.sizes.md,
  },
  watchLinkText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.black,
  },

  // ─── Category Dropdown ──────────────────────────────────
  categoryDropdownContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.smmd,
    position: 'relative',
    zIndex: 10,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    paddingHorizontal: SPACING.smmd,
    paddingVertical: SPACING.smmd,
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  dropdownModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  categoryDropdownText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  categoryDropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 20,
  },
  categoryDropdownItem: {
    paddingHorizontal: SPACING.smmd,
    paddingVertical: SPACING.smmd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  categoryDropdownItemActive: {
    backgroundColor: COLORS.gray[50],
  },
  categoryDropdownItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  categoryDropdownItemTextActive: {
    fontWeight: '700',
    color: COLORS.red,
  },

  // ─── Filter Tabs ────────────────────────────────────────
  filterTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.smmd,
    gap: SPACING.md,
  },
  filterTab: {
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: COLORS.red,
  },
  filterTabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  filterTabTextActive: {
    fontWeight: '700',
    color: COLORS.red,
  },

  // ─── Product Grid ───────────────────────────────────────
  productsRow: {
    paddingHorizontal: SPACING.md,
    gap: PRODUCT_GAP,
    marginBottom: PRODUCT_GAP,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: PRODUCT_CARD_WIDTH * 1.2,
    backgroundColor: COLORS.gray[200],
  },
  productInfoContainer: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  productPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.red,
  },
  productOriginalPrice: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textDecorationLine: 'line-through' as const,
  },
  productTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginTop: 2,
  },
  productMeta: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: 2,
  },

  // ─── Footer / Empty / Loading ───────────────────────────
  listContent: {
    paddingBottom: 100,
    backgroundColor: '#FFFFFFA1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // ─── Scroll to Top ─────────────────────────────────────
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

  // ─── Modal ──────────────────────────────────────────────
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

export default LiveSellerDetailScreen;

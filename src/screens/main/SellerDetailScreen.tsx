import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Text from '../../components/Text';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SCREEN_WIDTH } from '../../constants';
import { useSellerDetailMutation } from '../../hooks/useSellerDetailMutation';
import { useAppSelector } from '../../store/hooks';
import { useToast } from '../../context/ToastContext';
import { productsApi } from '../../services/productsApi';
import { useAuth } from '../../context/AuthContext';
import { translations } from '../../i18n/translations';
import StarIcon from '../../assets/icons/StarIcon';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';

const { width, height } = Dimensions.get('window');
const PRODUCT_COLUMN_COUNT = 2;
const PRODUCT_GAP = SPACING.md;
const PRODUCT_CARD_WIDTH = (width - SPACING.md * 2 - PRODUCT_GAP) / PRODUCT_COLUMN_COUNT;

const SellerDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sellerId = '', sellerName = 'Seller', source = '1688' } = route.params || {};
  const { showToast } = useToast();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const t = useCallback((key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }, [locale]);
  const { user, isAuthenticated } = useAuth();

  const [currentPage, setCurrentPage] = useState(1);
  const [isFollowing, setIsFollowing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { mutate: fetchSellerProducts, products, isLoading, isLoadingMore, isError, error } = useSellerDetailMutation({
    onSuccess: (data) => {
      console.log('✅ Seller products fetched:', data);
    },
    onError: (error) => {
      showToast(error, 'error');
    },
  });

  useEffect(() => {
    if (sellerId) {
      fetchSellerProducts(sellerId, {
        page: 1,
        pageSize: 20,
        country: locale === 'zh' ? 'en' : locale,
        source,
      });
    }
  }, [sellerId, source, locale]);

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && products.length > 0) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchSellerProducts(sellerId, {
        page: nextPage,
        pageSize: 20,
        country: locale === 'zh' ? 'en' : locale,
        source,
      });
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !isAuthenticated) {
      showToast(t('home.pleaseLogin'), 'warning');
      return;
    }

    try {
      const platform = source === 'taobao' ? 'taobao' : '1688';
      const action = isFollowing ? 'unfollow' : 'follow';

      if (action === 'follow' && products.length > 0) {
        const productsToSend = products.slice(0, 2).map((product: any) => ({
          offerId: product.externalId || product.id || '',
          title: product.title || '',
          imageUrl: product.image || product.mainImageUrl || '',
          price: product.price?.toString() || '0',
        }));

        const response = await productsApi.followStoreWithProducts(
          sellerId,
          sellerName,
          productsToSend,
          platform
        );

        if (response.success) {
          setIsFollowing(true);
          showToast(t('live.storeFollowedSuccessfully'), 'success');
        } else {
          showToast(response.message || 'Failed to follow store', 'error');
        }
      } else if (action === 'unfollow') {
        const response = await productsApi.toggleFollowStore(sellerId, platform, 'unfollow');
        if (response.success) {
          setIsFollowing(false);
          showToast(t('live.storeUnfollowedSuccessfully'), 'success');
        } else {
          showToast(response.message || 'Failed to unfollow store', 'error');
        }
      }
    } catch (error) {
      showToast(t('live.failedToUpdateFollowStatus'), 'error');
    }
  };

  const renderProductCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => {
        navigation.navigate('ProductDetail', {
          productId: item.externalId || item.id,
          source: item.source || source,
          country: locale === 'zh' ? 'en' : locale,
        });
      }}
    >
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: item.image || item.mainImageUrl }}
          style={styles.productImage}
          resizeMode="cover"
        />
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.productPriceRow}>
          <Text style={styles.productPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
          {item.originalPrice && item.originalPrice > item.price && (
            <Text style={styles.productOriginalPrice}>
              ${item.originalPrice?.toFixed(2)}
            </Text>
          )}
        </View>

        {item.sales > 0 && (
          <Text style={styles.productSales}>{item.sales.toLocaleString()} sold</Text>
        )}

        {item.rating > 0 && (
          <View style={styles.productRating}>
            <StarIcon width={12} height={12} color="#FFB800" />
            <Text style={styles.productRatingText}>{item.rating}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#FF0000', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowBackIcon width={24} height={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('live.seller')}</Text>
            <Text style={styles.headerSubtitle}>{t('live.profile')}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <View style={styles.sellerInfo}>
        <Image
          source={{ uri: `https://via.placeholder.com/80.png?text=${sellerName.charAt(0)}` }}
          style={styles.sellerAvatar}
        />
        <View style={styles.sellerDetails}>
          <Text style={styles.sellerName} numberOfLines={1}>
            {sellerName}
          </Text>
          <Text style={styles.sellerId}>{t('live.sellerId')}{sellerId}</Text>
          <View style={styles.sellerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('live.products')}</Text>
              <Text style={styles.statValue}>{products.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t('live.source')}</Text>
              <Text style={styles.statValue}>{source.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.followButton, isFollowing && styles.followButtonActive]}
        onPress={handleToggleFollow}
      >
        <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
          {isFollowing ? t('live.following') : t('live.follow')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {isError ? 'Failed to load products' : 'No products found'}
      </Text>
      {isError && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setCurrentPage(1);
            fetchSellerProducts(sellerId, {
              page: 1,
              pageSize: 20,
              country: locale === 'zh' ? 'en' : locale,
              source,
            });
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading seller products...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item, index) => `${item.id || item.externalId}-${index}`}
          numColumns={PRODUCT_COLUMN_COUNT}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          scrollIndicatorInsets={{ right: 1 }}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    marginBottom: SPACING.md,
  },
  headerGradient: {
    paddingBottom: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.smmd,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.white,
    marginTop: -2,
  },
  sellerInfo: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
    gap: SPACING.md,
  },
  sellerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.gray[200],
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  sellerDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  sellerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.white,
  },
  sellerId: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.xs,
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  followButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.smmd,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: COLORS.white,
    alignItems: 'center',
  },
  followButtonActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  followButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  followButtonTextActive: {
    color: COLORS.primary,
  },
  flatListContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  columnWrapper: {
    gap: PRODUCT_GAP,
    marginBottom: PRODUCT_GAP,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    width: '100%',
    height: PRODUCT_CARD_WIDTH,
    backgroundColor: COLORS.gray[100],
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  productTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text.primary,
    lineHeight: 16,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  productPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  productOriginalPrice: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    textDecorationLine: 'line-through',
  },
  productSales: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  productRatingText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  loadingMoreContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default SellerDetailScreen;

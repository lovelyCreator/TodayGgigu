import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import Text from '../../../components/Text';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SCREEN_WIDTH } from '../../../constants';
import { useAppSelector } from '../../../store/hooks';
import { productsApi } from '../../../services/productsApi';
import { useLiveCommerceMutation } from '../../../hooks/useLiveCommerceMutation';
import { useTranslation } from '../../../hooks/useTranslation';
import SearchIcon from '../../../assets/icons/SearchIcon';
import SensorsIcon from '../../../assets/icons/SensorsIcon';
import ArrowDropDownIcon from '../../../assets/icons/ArrowDropDownIcon';

const CARD_GAP = SPACING.smmd;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 2 - CARD_GAP) / 2;

type SortOption = 'bestMatch' | 'viewers' | 'newest';

// ─── Seller Card ──────────────────────────────────────────
const SellerCard: React.FC<{
  seller: any;
  isLive?: boolean;
  onPress?: () => void;
  locale?: 'en' | 'ko' | 'zh';
}> = ({ seller, isLive, onPress, locale = 'en' }) => {
  const { t } = useTranslation();
  const name = seller.userName || seller.nickname || seller.sellerName || 'TM SUNSHINE';
  const avatar = seller.picUrl || seller.sellerAvatar || 'https://via.placeholder.com/80.png?text=S';
  const viewers = seller.onlineViewers ?? seller.viewerCount ?? seller.watchingCount ?? 90;

  // Map currentLiveStatuses from search API to product rows
  const liveStatuses = seller.currentLiveStatuses || [];
  const products = liveStatuses.length > 0
    ? liveStatuses.map((s: any) => ({
        imageUrl: s.productImageUrl || '',
        title: s.productTitle?.[locale] || s.productTitle?.en || '',
        status: s.status || '',
      }))
    : seller.products || [];

  return (
    <TouchableOpacity style={styles.sellerCard} activeOpacity={0.8} onPress={onPress}>
      {/* Avatar with LIVE ring */}
      <View style={styles.sellerAvatarWrapper}>
        <View style={[styles.sellerAvatarRing, isLive && styles.sellerAvatarRingLive]}>
          <Image source={{ uri: avatar }} style={styles.sellerAvatar} />
        </View>
        {isLive && (
          <View style={styles.sellerLiveBadge}>
            <Text style={styles.sellerLiveBadgeText}>{t('live.live')}</Text>
          </View>
        )}
      </View>

      {/* Name and viewers */}
      <Text style={styles.sellerName} numberOfLines={1}>{name}</Text>
      <Text style={styles.sellerViewers}>{t('live.onlineViewers')} {viewers}</Text>

      {/* Products list */}
      {products.slice(0, 2).map((prod: any, idx: number) => (
        <View key={idx} style={styles.sellerProductRow}>
          <Image
            source={{ uri: prod.imageUrl || prod.productImageUrl || prod.image || 'https://via.placeholder.com/30x30.png?text=P' }}
            style={styles.sellerProductImage}
          />
          <View style={styles.sellerProductInfo}>
            <Text style={styles.sellerProductTitle} numberOfLines={1}>
              {prod.title || prod.name || `Product ${idx + 1}`}
            </Text>
            <Text style={styles.sellerProductShopNow}>{t('live.shopNow').replace('{arrow}', '>')}</Text>
          </View>
        </View>
      ))}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────
const LiveSellerSearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialQuery = route.params?.query || '';
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { t } = useTranslation();

  const [searchText, setSearchText] = useState(initialQuery);
  const [sortOption, setSortOption] = useState<SortOption>('bestMatch');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fallback: load from live commerce main data when no search query
  const {
    mutate: fetchLiveCommerce,
    data: liveCommerceData,
    isLoading: isLoadingFallback,
  } = useLiveCommerceMutation();

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    } else {
      fetchLiveCommerce();
    }
  }, []);

  const performSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setHasSearched(false);
      fetchLiveCommerce();
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await productsApi.searchLiveCommerceSellers(q, { page: 1, pageSize: 20 });
      if (response.success && response.data) {
        const mapped = response.data.results.map((seller: any) => {
          const statuses = seller.currentLiveStatuses || [];
          const hasLive = statuses.some((s: any) => s.status === 'live');
          return {
            ...seller,
            isLive: hasLive,
            onlineViewers: seller.totalViews || 0,
          };
        });
        setSearchResults(mapped);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Build fallback seller list from live commerce data
  const fallbackSellers = useMemo(() => {
    if (!liveCommerceData) return [];

    const sellers: any[] = [];
    const seenIds = new Set<string>();

    const partnerSellers = liveCommerceData.pointPartnerSellers || [];
    partnerSellers.forEach((s: any) => {
      const id = s._id || s.id || s.userName;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        sellers.push({ ...s, isLive: !!s.isLive });
      }
    });

    const topSellers = liveCommerceData.top10Sellers || [];
    topSellers.forEach((s: any) => {
      const id = s._id || s.id || s.userName;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        sellers.push({ ...s, isLive: false });
      }
    });

    const schedule = liveCommerceData.schedule || [];
    schedule.forEach((item: any) => {
      const s = item.seller || item;
      const id = s._id || s.id || s.userName || item.sellerId;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        sellers.push({
          ...s,
          isLive: (item.status || item.currentLiveStatus || '').toLowerCase() === 'live',
          onlineViewers: item.viewerCount || item.watchingCount || 0,
        });
      }
    });

    return sellers;
  }, [liveCommerceData]);

  // Use search results when searched, fallback otherwise
  const displaySellers = useMemo(() => {
    const source = hasSearched ? searchResults : fallbackSellers;
    let result = [...source];

    switch (sortOption) {
      case 'viewers':
        result.sort((a, b) => (b.onlineViewers || 0) - (a.onlineViewers || 0));
        break;
      case 'newest':
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      default:
        result.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          return (b.onlineViewers || 0) - (a.onlineViewers || 0);
        });
        break;
    }

    return result;
  }, [searchResults, fallbackSellers, hasSearched, sortOption]);

  const isLoading = isSearching || isLoadingFallback;

  const handleSellerPress = useCallback((seller: any) => {
    const sellerId = seller._id || seller.id || seller.sellerId || '';
    const sellerName = seller.userName || seller.nickname || seller.sellerName || '';
    navigation.navigate('LiveSellerDetail', {
      sellerId,
      sellerName,
      source: 'ownmall',
    });
  }, [navigation]);

  const handleSearch = useCallback(() => {
    performSearch(searchText);
  }, [searchText, performSearch]);

  const sortLabels: Record<SortOption, string> = {
    bestMatch: t('live.bestMatch'),
    viewers: t('live.mostViewers'),
    newest: t('live.newest'),
  };

  const renderSellerItem = useCallback(({ item }: { item: any }) => (
    <SellerCard
      seller={item}
      isLive={item.isLive}
      locale={locale}
      onPress={() => handleSellerPress(item)}
    />
  ), [handleSellerPress]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('live.noSellersFound')}</Text>
      </View>
    );
  }, [isLoading]);

  const keyExtractor = useCallback((item: any, index: number) =>
    item._id || item.id || `seller-${index}`, []);

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
            activeOpacity={0.7}
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
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <TouchableOpacity style={styles.sellerDropdown}>
            <Text style={styles.sellerDropdownText}>{t('live.allSeller')}</Text>
            <ArrowDropDownIcon width={8} height={8} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('live.searchNow')}
              placeholderTextColor={COLORS.white}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>{t('common.search')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Sort bar - outside FlatList so dropdown renders on top */}
      <View style={{backgroundColor: '#FFFFFFA1', paddingBottom: SPACING.sm}}>
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>{t('live.sortBy')}</Text>
          <TouchableOpacity
            style={styles.sortDropdown}
            onPress={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Text style={styles.sortDropdownText}>{sortLabels[sortOption]}</Text>
            <ArrowDropDownIcon width={12} height={12} color={COLORS.text.primary} />
          </TouchableOpacity>

          {showSortDropdown && (
            <View style={styles.sortDropdownMenu}>
              {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.sortDropdownItem,
                    sortOption === key && styles.sortDropdownItemActive,
                  ]}
                  onPress={() => {
                    setSortOption(key);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortDropdownItemText,
                      sortOption === key && styles.sortDropdownItemTextActive,
                    ]}
                  >
                    {sortLabels[key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {/* Seller grid */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={displaySellers}
            renderItem={renderSellerItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => fetchLiveCommerce()} />
            }
          />
        )}
      </View>
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
    alignItems: 'flex-end',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  broadcastIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.black,
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

  // ─── Search Bar (matches LiveScreen) ─────────────────────
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.smmd,
  },
  sellerDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00000044',
    borderTopLeftRadius: BORDER_RADIUS.full,
    borderBottomLeftRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    height: 40,
    gap: SPACING.xs,
  },
  sellerDropdownText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: 2,
  },
  searchInputWrapper: {
    flex: 1,
    height: 40,
    backgroundColor: '#00000033',
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    paddingHorizontal: SPACING.sm,
    fontWeight: '400',
    height: 40,
    padding: 0,
  },
  searchButton: {
    backgroundColor: '#00000033',
    borderTopRightRadius: BORDER_RADIUS.full,
    borderBottomRightRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },

  // ─── Sort ───────────────────────────────────────────────
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
    position: 'relative',
    zIndex: 10,
  },
  sortLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingHorizontal: SPACING.smmd,
    paddingVertical: SPACING.xs,
  },
  sortDropdownText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: SPACING.xs,
  },
  sortDropdownMenu: {
    position: 'absolute',
    top: 48,
    left: SPACING.md + 60,
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
    minWidth: 140,
  },
  sortDropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  sortDropdownItemActive: {
    backgroundColor: COLORS.gray[50],
  },
  sortDropdownItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  sortDropdownItemTextActive: {
    fontWeight: '700',
    color: COLORS.red,
  },

  // ─── Grid ───────────────────────────────────────────────
  listContent: {
    paddingBottom: 100,
  },
  gridRow: {
    paddingHorizontal: SPACING.md,
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // ─── Seller Card ────────────────────────────────────────
  sellerCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.smmd,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sellerAvatarWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sellerAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sellerAvatarRingLive: {
    borderColor: '#FF0000',
  },
  sellerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  sellerLiveBadge: {
    position: 'absolute',
    top: 0,
    right: -2,
    backgroundColor: '#FF0000',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sellerLiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
  },
  sellerName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  sellerViewers: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  sellerProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: SPACING.xssm,
  },
  sellerProductImage: {
    width: 30,
    height: 30,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.gray[200],
  },
  sellerProductInfo: {
    flex: 1,
  },
  sellerProductTitle: {
    fontSize: 11,
    color: COLORS.text.primary,
  },
  sellerProductShopNow: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF0000',
  },

  // ─── Empty / Loading ────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
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
  },
});

export default LiveSellerSearchScreen;

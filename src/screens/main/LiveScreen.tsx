import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Text from '../../components/Text';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SCREEN_WIDTH } from '../../constants';
import { useAppSelector } from '../../store/hooks';
import { useLiveCommerceMutation } from '../../hooks/useLiveCommerceMutation';
import { useTranslation } from '../../hooks/useTranslation';
import SearchIcon from '../../assets/icons/SearchIcon';
import StarIcon from '../../assets/icons/StarIcon';
import ArrowDropDownIcon from '../../assets/icons/ArrowDropDownIcon';
import BrandIcon from '../../assets/icons/BrandIcon';
import LiveIcon from '../../assets/icons/LiveIcon';
import SensorsIcon from '../../assets/icons/SensorsIcon';
import SellerMarkIcon from '../../assets/icons/SellerMarkIcon';
import { formatPriceKRW } from '../../utils/i18nHelpers';

const CAROUSEL_WIDTH = SCREEN_WIDTH - SPACING.sm * 2;
const CAROUSEL_HEIGHT = 420;

const getLocalizedTitle = (item: any, locale: 'en' | 'ko' | 'zh') => {
  if (!item) return '';
  if (locale === 'ko') return item.titleKo || item.title || item.liveTitle || item.product?.titleKo || item.product?.titleEn || item.product?.titleZh || item.productTitle?.ko || item.productTitle?.en || item.productTitle?.zh || '';
  if (locale === 'zh') return item.titleZh || item.title || item.liveTitle || item.product?.titleZh || item.product?.titleEn || item.product?.titleKo || item.productTitle?.zh || item.productTitle?.en || item.productTitle?.ko || '';
  return item.titleEn || item.title || item.liveTitle || item.product?.titleEn || item.product?.titleKo || item.product?.titleZh || item.productTitle?.en || item.productTitle?.ko || item.productTitle?.zh || '';
};

const getSellerData = (item: any) => {
  const seller = item?.seller || item;
  return {
    name: seller?.nickname || seller?.userName || seller?.name || item?.sellerName || 'Live Seller',
    avatar: seller?.picUrl || seller?.avatar || item?.sellerAvatar || 'https://via.placeholder.com/48.png?text=S',
  };
};

const getViewerCount = (item: any) => {
  return item?.onlineViews ?? item?.viewerCount ?? item?.watchingCount ?? item?.viewers ?? 0;
};

// ─── Header ───────────────────────────────────────────────
const LiveHeader: React.FC<{ onSearchPress?: () => void; t: (key: string) => string }> = ({ onSearchPress, t }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <View style={styles.broadcastIconContainer}>
        {/* <Text style={styles.broadcastIcon}>(( ))</Text> */}
        <SensorsIcon width={24} height={24} />
      </View>
      <View>
        <Text style={styles.headerTitle}>{t('live.live')}</Text>
        <Text style={styles.headerSubtitle}>{t('live.channel')}</Text>
      </View>
    </View>
    {/* <TouchableOpacity onPress={onSearchPress} style={styles.headerSearchBtn}>
      <SearchIcon width={24} height={24} color={COLORS.white} />
    </TouchableOpacity> */}
  </View>
);

// ─── Search Bar ───────────────────────────────────────────
const SearchBar: React.FC<{
  searchText: string;
  onChangeText: (t: string) => void;
  onSearch: () => void;
  t: (key: string) => string;
}> = ({ searchText, onChangeText, onSearch, t }) => (
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
        onChangeText={onChangeText}
      />
    </View>
    <TouchableOpacity style={styles.searchButton} onPress={onSearch}>
      <Text style={styles.searchButtonText}>{t('common.search')}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Live Seller Chips ────────────────────────────────────
const LiveSellerChip: React.FC<{ seller: any; onPress?: () => void; t: (key: string) => string }> = ({ seller, onPress, t }) => {
  const sellerData = seller?.seller || seller;
  const name = sellerData?.nickname || sellerData?.userName || sellerData?.name || 'Seller';
  const avatar = sellerData?.picUrl || sellerData?.avatar || 'https://via.placeholder.com/36.png?text=S';
  return (
    <TouchableOpacity style={styles.liveChip} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: avatar }} style={styles.liveChipAvatar} />
      <Text style={styles.liveChipName} numberOfLines={1}>{name}</Text>
      <Text style={styles.liveChipLabel}>{t('live.liveOn').replace('{arrow}', '>')}</Text>
    </TouchableOpacity>
  );
};

// ─── Notice Banner (same style as homepage) ──────────────
const NoticeBanner: React.FC<{ text?: string }> = ({ text }) => (
  <View style={styles.noticeBanner}>
    <BrandIcon width={16} height={16} style={styles.noticeBrandIcon} />
    <View style={styles.noticeBannerContent}>
      <Text style={styles.noticeText} numberOfLines={1}>
        {text || '[Important Notice] Regarding the issue of modifying the time'}
      </Text>
    </View>
    <TouchableOpacity style={styles.noticeNextButton} activeOpacity={0.7}>
      <Text style={styles.noticeNextButtonText}>→</Text>
    </TouchableOpacity>
  </View>
);

// ─── Featured Live Carousel ──────────────────────────────
const FeaturedLiveCarousel: React.FC<{ items: any[]; locale: 'en' | 'ko' | 'zh'; t: (key: string) => string }> = ({ items, locale, t }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<FlatList>(null);
  console.log('🎬 [FeaturedLiveCarousel] Items:', items);
  const onScroll = useCallback((event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / CAROUSEL_WIDTH);
    setActiveIndex(index);
  }, []);

  const displayItems = items.length > 0 ? items : [null]; // Show placeholder if empty

  const renderItem = ({ item }: { item: any }) => {
    const sellerData = getSellerData(item);
    const viewers = getViewerCount(item);
    const title = item ? getLocalizedTitle(item, locale) : 'Celebrate LIVE Fest 2025 winners LIVE Fest 2025 winners';
    const imageUrl = item?.imageUrl || item?.product?.imageUrl || item?.thumbnailUrl || 'https://via.placeholder.com/400x300.png?text=LIVE';
    const startAt = item?.startAt ? new Date(item.startAt) : new Date();
    const dateStr = startAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = `${startAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${new Date(startAt.getTime() + 110 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    const status = item?.status || item?.currentLiveStatus || 'live';

    return (
      <View style={styles.carouselItem}>
        {/* Seller info bar */}
        <View style={styles.carouselSellerBar}>
          <Image source={{ uri: sellerData.avatar }} style={styles.carouselSellerAvatar} />
          <View style={styles.carouselSellerInfo}>
            <Text style={styles.carouselSellerName}>{sellerData.name}</Text>
            <Text style={styles.carouselViewers}>{t('live.watchingNow').replace('{count}', viewers.toLocaleString())}</Text>
          </View>
        </View>

        {/* Live image */}
        <Image source={{ uri: imageUrl }} style={styles.carouselImage} resizeMode="cover" />

        {/* LIVE NOW badge */}
        {status?.toLowerCase() === 'live' && (
          <View style={styles.liveNowBadge}>
            <View style={styles.liveNowDot} />
            <Text style={styles.liveNowText}>{t('live.liveNow')}</Text>
          </View>
        )}

        {/* Event info */}
        <View style={styles.carouselEventInfo}>
          <Text style={styles.carouselEventTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.carouselEventDate}>{dateStr}</Text>
          <Text style={styles.carouselEventTime}>{timeStr}</Text>
        </View>

        {/* Watch button */}
        <View style={styles.carouselWatchButtonContainer}>
          <TouchableOpacity style={styles.watchButton} activeOpacity={0.8}>
            <Text style={styles.watchButtonEmoji}>👉</Text>
            <Text style={styles.watchButtonText}>{t('live.watchLiveStream')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={scrollRef}
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={(_, i) => `carousel-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={CAROUSEL_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 0 }}
      />
      {/* Pagination dots - same style as homepage */}
      {displayItems.length > 1 && (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationPill}>
            {displayItems.map((_, i) => (
              <View
                key={i}
                style={[styles.paginationDot, i === activeIndex && styles.paginationDotActive]}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ─── Schedule Item ────────────────────────────────────────
const ScheduleItem: React.FC<{ item: any; locale: 'en' | 'ko' | 'zh' }> = ({ item, locale }) => {
  const sellerData = getSellerData(item);
  const title = getLocalizedTitle(item, locale) || 'Live title here';
  const viewers = getViewerCount(item);
  const status = item.status || item.currentLiveStatus || 'scheduled';

  return (
    <View style={styles.scheduleItemRow}>
      <View style={[styles.scheduleAvatarWrapper, status?.toLowerCase() === 'live' && { borderWidth: 2, borderColor: '#FF0000', borderRadius: BORDER_RADIUS.full }]}>
        <Image source={{ uri: sellerData.avatar }} style={styles.scheduleAvatar} />
        {status?.toLowerCase() === 'live' && (
          <View style={styles.scheduleLiveDot}>
            <Text style={styles.scheduleLiveDotText}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={styles.scheduleItemInfo}>
        <Text style={styles.scheduleItemName} numberOfLines={1}>{sellerData.name}</Text>
        <Text style={styles.scheduleItemTitle} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.scheduleItemRight}>
        <Text style={styles.scheduleItemViewers}>{viewers}</Text>
        <Text style={styles.scheduleItemViewersLabel}>watching</Text>
      </View>
    </View>
  );
};

// ─── Top Seller Item ──────────────────────────────────────
const TopSellerItem: React.FC<{ seller: any; onPress?: () => void }> = ({ seller, onPress }) => {
  const { t } = useTranslation();
  const sellerObj = seller?.seller || seller;
  const name = sellerObj?.nickname || sellerObj?.userName || sellerObj?.name || seller?.sellerName || 'Seller';
  const avatar = sellerObj?.picUrl || sellerObj?.avatar || seller?.sellerAvatar || 'https://via.placeholder.com/60.png?text=S';
  const totalSold = seller?.totalItemsSold ?? sellerObj?.totalItemsSold ?? seller?.totalSold ?? 0;
  const viewers = seller?.onlineViews ?? sellerObj?.onlineViews ?? seller?.viewerCount ?? sellerObj?.viewerCount ?? 0;

  return (
    <TouchableOpacity style={styles.topSellerItem} activeOpacity={0.7} onPress={onPress}>
      <Image source={{ uri: avatar }} style={styles.topSellerAvatar} />
      <View style={styles.topSellerInfo}>
        <Text style={styles.topSellerName} numberOfLines={1}>{name}</Text>
        <Text style={styles.topSellerSold}>{t('live.soldLabel')}: <Text style={styles.topSellerSoldBold}>{totalSold.toLocaleString()}</Text></Text>
        <Text style={styles.topSellerSold}>{t('live.liveLabel')}: <Text style={styles.topSellerSoldBold}>{viewers.toLocaleString()}</Text></Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Popular Item Card ────────────────────────────────────
const PopularItemCard: React.FC<{ item: any; locale: 'en' | 'ko' | 'zh'; rank?: number; onPress?: () => void; t: (key: string) => string }> = ({ item, locale, rank, onPress, t }) => {
  const product = item.product || {};
  const seller = getSellerData(item);
  const title = getLocalizedTitle(item, locale);
  const image = item.imageUrl || product.imageUrl || 'https://via.placeholder.com/280x350.png?text=ITEM';
  const price = product.promotionPrice ?? product.price ?? 0;
  const reviewScore = item.reviewScore ?? 0;
  const reviews = item.reviewNumbers ?? 0;
  const soldCount = item.itemsSold ?? 0;
  const totalViews = item.onlineViews ?? 0;

  return (
    <TouchableOpacity style={styles.popularCard} activeOpacity={0.8} onPress={onPress}>
      {/* Product image with rank badge */}
      <View style={styles.popularImageContainer}>
        <Image source={{ uri: image }} style={styles.popularImage} resizeMode="cover" />
        {rank != null && (
          <View style={styles.rankBadge}>
            <SellerMarkIcon width={77} height={72} />
            <View style={styles.rankTextContainer}>
              <View style={styles.rankBadgeTop}>
                <Text style={styles.rankBadgeLabel}>BEST</Text>
                <Text style={styles.rankBadgeLabelSub}>SELLERS</Text>
              </View>
              <Text style={styles.rankBadgeNumber}>{rank}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Rating */}
      <View style={styles.popularRatingRow}>
        {[1, 2, 3, 4, 5].map((s) => (
          <StarIcon key={s} width={14} height={14} color={s <= Math.round(reviewScore) ? '#FFDD00' : '#E0E0E0'} />
        ))}
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={styles.popularRatingText}>{reviewScore > 0 ? reviewScore.toFixed(1) : '0'}</Text>
          {reviews > 0 && <Text style={styles.popularReviewCount}>{t('product.reviewsCount').replace('{count}', reviews.toLocaleString())}</Text>}
          {soldCount > 0 && <Text style={styles.popularSoldCount}> | {t('product.soldCount').replace('{count}', `${soldCount.toLocaleString()}+`)}</Text>}
        </View>
      </View>

      {/* Title */}
      <Text style={styles.popularTitle} numberOfLines={1}>{title}</Text>

      {/* Seller info */}
      <View style={styles.popularSellerRow}>
        <View style={{flexDirection: 'row', gap: SPACING.xs, alignItems: 'center'}}>
          <Image source={{ uri: seller.avatar }} style={styles.popularSellerAvatar} />
          <Text style={styles.popularSellerName} numberOfLines={1}>{seller.name}</Text>
          <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end'}}>
            <Text style={styles.popularTotalViews}>{totalViews.toLocaleString()}</Text>
            <Text style={styles.popularTotalViewsLabel}>Total Views</Text>
          </View>
        </View>
      </View>

      {/* Bottom product strip */}
      <View style={styles.popularBottomStrip}>
        <Image source={{ uri: product.imageUrl || image }} style={styles.popularStripAvatar} />
        <View style={{flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', width: '72%'}}>
          <Text style={styles.popularStripTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.popularBottomStripPriceRow}>
            <Text style={styles.popularStripPrice}>{formatPriceKRW(price)}</Text>
            <Text style={styles.popularStripShopNow}>{t('live.shopNow').replace('{arrow}', '>')}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Point Partner Seller Card ────────────────────────────
const PointPartnerSellerCard: React.FC<{ seller: any; locale: 'en' | 'ko' | 'zh'; onPress?: () => void; t: (key: string) => string }> = ({ seller, locale, onPress, t }) => {
  const name = seller.userName || seller.nickname || 'Seller';
  const avatar = seller.picUrl || 'https://via.placeholder.com/80.png?text=S';
  const viewers = seller.totalViews ?? 0;
  const isLive = seller.currentLiveStatus === 'live';
  const liveStatuses = seller.currentLiveStatuses || [];

  return (
    <TouchableOpacity style={styles.partnerCard} activeOpacity={0.8} onPress={onPress}>
      {/* Avatar with LIVE ring */}
      <View style={styles.partnerAvatarWrapper}>
        <View style={[styles.partnerAvatarRing, isLive && styles.partnerAvatarRingLive]}>
          <Image source={{ uri: avatar }} style={styles.partnerAvatar} />
        </View>
        {isLive && (
          <View style={styles.partnerLiveBadge}>
            <Text style={styles.partnerLiveBadgeText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Name and viewers */}
      <Text style={styles.partnerName} numberOfLines={1}>{name}</Text>
      <Text style={styles.partnerViewers}>{t('live.onlineViewers')} {viewers}</Text>

      {/* Products list — only show if currentLiveStatuses has items */}
      {liveStatuses.length > 0 && liveStatuses.slice(0, 2).map((prod: any, idx: number) => {
        const prodTitle = prod.productTitle
          ? (locale === 'ko' ? (prod.productTitle.ko || prod.productTitle.en || prod.productTitle.zh)
            : locale === 'zh' ? (prod.productTitle.zh || prod.productTitle.en || prod.productTitle.ko)
            : (prod.productTitle.en || prod.productTitle.ko || prod.productTitle.zh)) || ''
          : prod.liveTitle || prod.title || '';
        const prodImage = prod.productImageUrl || prod.imageUrl || prod.image || '';
        return (
          <View key={prod.id || prod._id || idx} style={styles.partnerProductRow}>
            <Image
              source={{ uri: prodImage || 'https://via.placeholder.com/30x30.png?text=P' }}
              style={styles.partnerProductImage}
            />
            <View style={styles.partnerProductInfo}>
              <Text style={styles.partnerProductTitle} numberOfLines={1}>
                {prodTitle || `Product ${idx + 1}`}
              </Text>
              <Text style={styles.partnerProductShopNow}>{t('live.shopNow').replace('{arrow}', '>')}</Text>
            </View>
          </View>
        );
      })}
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────
const LiveScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');

  const {
    mutate: fetchLiveCommerce,
    data: liveCommerceData,
    isLoading,
    isError,
    error,
  } = useLiveCommerceMutation();

  useEffect(() => {
    fetchLiveCommerce();
  }, [fetchLiveCommerce]);

  const schedule = useMemo(() => liveCommerceData?.schedule || [], [liveCommerceData]);
  const topSellers = useMemo(() => liveCommerceData?.top10Sellers || [], [liveCommerceData]);
  const pointPartnerSellers = useMemo(() => liveCommerceData?.pointPartnerSellers || [], [liveCommerceData]);
  const popularItems = useMemo(() => liveCommerceData?.popularItems || [], [liveCommerceData]);

  // Derive live sellers for chips (sellers that are currently live)
  const liveSellers = useMemo(() => {
    const live = schedule.filter((s: any) =>
      (s.status || s.currentLiveStatus || '').toLowerCase() === 'live'
    );
    if (live.length > 0) return live;
    return topSellers.slice(0, 4);
  }, [schedule, topSellers]);

  const liveNowCount = useMemo(() => {
    return schedule.filter((s: any) =>
      (s.status || s.currentLiveStatus || '').toLowerCase() === 'live'
    ).length;
  }, [schedule]);

  const onRefresh = () => fetchLiveCommerce();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient background - same as homepage */}
      <LinearGradient
        colors={['#FF0000', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackgroundFixed}
        pointerEvents="none"
      />

      {/* Red Header */}
      <LiveHeader t={t} onSearchPress={() => navigation.navigate('LiveSellerSearch')} />

      {/* Fixed sub-header (search + notice), not scrolled */}
      <View style={styles.fixedHeaderSubSection}>
        <SearchBar
          searchText={searchText}
          onChangeText={setSearchText}
          onSearch={() => navigation.navigate('LiveSellerSearch', { query: searchText })}
          t={t}
        />
        <NoticeBanner />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Seller Chips */}
        {/* {liveSellers.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {liveSellers.map((s: any, i: number) => {
              const sellerObj = s.seller || s;
              return (
                <LiveSellerChip
                  key={s._id || s.id || i}
                  seller={sellerObj}
                  onPress={() => navigation.navigate('LiveSellerDetail', {
                    sellerId: sellerObj._id || sellerObj.id || '',
                    sellerName: sellerObj.nickname || sellerObj.userName || '',
                    source: 'ownmall',
                  })}
                  t={t}
                />
              );
            })}
          </ScrollView>
        )} */}

        {/* Featured Live Carousel */}
        {schedule.length > 0 && (
          <FeaturedLiveCarousel items={schedule.slice(0, 5)} locale={locale} t={t} />
        )}

        {/* Error */}
        {isError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || t('live.failedToLoadLiveCommerceData')}</Text>
          </View>
        )}

        {/* Live Stream Schedule */}
        {schedule.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('live.liveStreamSchedule')}</Text>
              {liveNowCount > 0 && (
                <Text style={styles.liveNowCountText}>{liveNowCount} <Text style={{color: COLORS.text.primary}}>{t('live.liveNowStatus')}</Text></Text>
              )}
            </View>
            {schedule.slice(0, 6).map((item: any, i: number) => (
              <ScheduleItem key={item.id || i} item={item} locale={locale} />
            ))}
          </View>
        )}

        {/* Top Seller */}
        {topSellers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.topSellerHeader}>
              <Text style={styles.sectionTitle}>{t('live.topSeller')}</Text>
            </View>
            <View style={styles.topSellerRowsContainer}>
              {([0, 1] as number[]).map((rowIndex) => {
                const half = Math.ceil(topSellers.slice(0, 8).length / 2);
                const rowSellers = topSellers.slice(0, 8).slice(rowIndex * half, rowIndex * half + half);
                if (rowSellers.length === 0) return null;
                return (
                  <ScrollView
                    key={`top-seller-row-${rowIndex}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.topSellerRowContent}
                  >
                    {rowSellers.map((seller: any, i: number) => (
                      <TopSellerItem
                        key={seller._id || i}
                        seller={seller}
                        onPress={() => navigation.navigate('LiveSellerDetail', {
                          sellerId: seller._id || seller.id || '',
                          sellerName: seller.nickname || seller.userName || '',
                          source: 'ownmall',
                        })}
                      />
                    ))}
                  </ScrollView>
                );
              })}
            </View>
          </View>
        )}

        {/* Popular Items */}
        {popularItems.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { marginVertical: SPACING.sm }]}>{t('live.popularItems')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularScroll}
            >
              {popularItems.map((item: any, i: number) => (
                <PopularItemCard
                  key={item.id || i}
                  item={item}
                  locale={locale}
                  rank={i + 1}
                  onPress={() => {
                    const productId = item.productId || item.product?.id || item.id || '';
                    if (productId) navigation.navigate('ProductDetail', { productId, source: 'ownmall' });
                  }}
                  t={t}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Point Partner Seller */}
        {pointPartnerSellers.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { marginVertical: SPACING.sm }]}>{t('live.pointPartnerSeller')}</Text>
            <View style={styles.partnerGrid}>
              {pointPartnerSellers.map((seller: any, i: number) => (
                <PointPartnerSellerCard
                  key={seller._id || i}
                  seller={seller}
                  locale={locale}
                  onPress={() => navigation.navigate('LiveSellerDetail', {
                    sellerId: seller._id || seller.id || '',
                    sellerName: seller.userName || seller.nickname || '',
                    source: 'ownmall',
                  })}
                  t={t}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Gradient background
  gradientBackgroundFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 650,
    zIndex: 0,
  },

  // Header
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
  broadcastIcon: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
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

  fixedHeaderSubSection: {
    backgroundColor: 'transparent',
    zIndex: 2,
  },

  scrollContent: {
    paddingBottom: SPACING.xl,
  },

  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
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
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Live Seller Chips
  chipsScroll: {
    marginTop: SPACING.sm,
  },
  chipsContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.xssm,
    paddingHorizontal: SPACING.smmd,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  liveChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: SPACING.xssm,
  },
  liveChipName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.text.primary,
    maxWidth: 80,
  },
  liveChipLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: '#FF0000',
  },

  // Notice Banner
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.black,
    height: 24,
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.smmd,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  noticeBrandIcon: {
    position: 'absolute',
    left: SPACING.sm,
    zIndex: 5,
  },
  noticeBannerContent: {
    flex: 1,
    paddingLeft: 30,
    justifyContent: 'center',
    maxHeight: 24,
  },
  noticeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: COLORS.white,
    lineHeight: 24,
    paddingRight: 24,
  },
  noticeNextButton: {
    paddingHorizontal: SPACING.sm,
  },
  noticeNextButtonText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 24,
  },

  // Carousel
  carouselContainer: {
    marginTop: SPACING.smmd,
    marginHorizontal: SPACING.sm,
  },
  carouselItem: {
    width: CAROUSEL_WIDTH,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.transparent,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  carouselSellerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.smmd,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderTopLeftRadius: BORDER_RADIUS.xl - 2,
    borderTopRightRadius: BORDER_RADIUS.xl - 2,
  },
  carouselSellerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.white,
    marginRight: SPACING.sm,
  },
  carouselSellerInfo: {
    flex: 1,
  },
  carouselSellerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  carouselViewers: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    opacity: 0.9,
  },
  carouselImage: {
    width: '100%',
    height: 470,
  },
  liveNowBadge: {
    position: 'absolute',
    top: 65,
    left: SPACING.smmd,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.85)',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    zIndex: 10,
  },
  liveNowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: 6,
  },
  liveNowText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    color: COLORS.white,
  },
  carouselEventInfo: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.smmd,
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  carouselEventTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    color: COLORS.white,
    lineHeight: 26,
  },
  carouselEventDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  carouselEventTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
  },
  carouselWatchButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: CAROUSEL_WIDTH,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#FFFFFF40',
  },
  watchButtonEmoji: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  watchButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.white,
  },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationPill: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.black,
    borderBottomLeftRadius: 6.5,
    borderBottomRightRadius: 6.5,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF80',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: COLORS.white,
  },

  // Section
  section: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.smmd,
    paddingHorizontal: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.smmd,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
    color: COLORS.text.primary,
    marginHorizontal: SPACING.sm,
    fontFamily: FONTS.families.black,
  },
  liveNowCountText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: '#FF0000',
  },

  // Schedule list
  scheduleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
  },
  scheduleAvatarWrapper: {
    position: 'relative',
    marginRight: SPACING.smmd,
    overflow: 'hidden',
  },
  scheduleAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray[200],
  },
  scheduleLiveDot: {
    position: 'absolute',
    top: -1,
    left: 6,
    right: 6,
    backgroundColor: '#FF0000',
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    paddingVertical: 1,
  },
  scheduleLiveDotText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.white,
  },
  scheduleItemInfo: {
    flex: 1,
  },
  scheduleItemName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scheduleItemTitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  scheduleItemRight: {
    alignItems: 'flex-end',
  },
  scheduleItemViewers: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scheduleItemViewersLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },

  // Top Seller
  topSellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.smmd,
  },
  topSellerRowsContainer: {
    gap: SPACING.smmd,
  },
  topSellerRowContent: {
    paddingHorizontal: SPACING.md,
  },
  topSellerItem: {
    alignItems: 'center',
    marginRight: SPACING.lg,
    flexDirection: 'row',
    maxWidth: 200,
    gap: SPACING.sm,
  },
  topSellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.gray[200],
    marginBottom: SPACING.xs,
  },
  topSellerInfo: {
    alignItems: 'flex-start',
  },
  topSellerName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  topSellerSold: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  topSellerSoldBold: {
    fontWeight: '700',
    color: COLORS.text.primary,
  },

  // Popular Items
  popularScroll: {
    paddingHorizontal: SPACING.sm,
  },
  popularCard: {
    width: 280,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.transparent,
    marginRight: SPACING.smmd,
  },
  popularImageContainer: {
    position: 'relative',
  },
  popularImage: {
    marginTop: 8,
    width: '100%',
    height: 506,
    backgroundColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
  },
  rankBadge: {
    position: 'absolute',
    top: 0,
    right: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  rankTextContainer: {
    position: 'absolute',
    top: 0,
  },
  rankBadgeTop: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xs,
    paddingBottom: 2,
    borderTopLeftRadius: BORDER_RADIUS.sm,
    borderTopRightRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
  },
  rankBadgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFDD00',
  },
  rankBadgeLabelSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFDD00',
  },
  rankBadgeNumber: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '900',
    color: COLORS.white,
    paddingHorizontal: SPACING.smmd,
    paddingBottom: SPACING.xs,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
    borderBottomRightRadius: BORDER_RADIUS.sm,
    textAlign: 'center',
    overflow: 'hidden',
  },
  popularRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.smmd,
    paddingTop: SPACING.sm,
    flexWrap: 'wrap',
    position: 'absolute',
    bottom: 170,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  popularRatingText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
    marginLeft: 4,
  },
  popularReviewCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    marginLeft: 4,
  },
  popularSoldCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
  },
  popularTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
    paddingHorizontal: SPACING.smmd,
    marginTop: SPACING.xs,
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  popularSellerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: SPACING.smmd,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  popularSellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.gray[200],
  },
  popularSellerName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
  },
  popularTotalViews: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'right',
  },
  popularTotalViewsLabel: {
    fontSize: 10,
    color: COLORS.white,
    textAlign: 'right',
  },
  popularBottomStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: SPACING.smmd,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  popularStripAvatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.gray[200],
  },
  popularStripTitle: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
  },
  popularBottomStripPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  popularStripPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
    color: COLORS.white,
  },
  popularStripShopNow: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.red,
  },

  // Point Partner Seller
  partnerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.smmd,
  },
  partnerCard: {
    width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.smmd) / 2,
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
  partnerAvatarWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  partnerAvatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partnerAvatarRingLive: {
    borderColor: '#FF0000',
  },
  partnerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  partnerLiveBadge: {
    position: 'absolute',
    top: 0,
    right: -2,
    backgroundColor: '#FF0000',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  partnerLiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.white,
  },
  partnerName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  partnerViewers: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  partnerProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: SPACING.xssm,
  },
  partnerProductImage: {
    width: 30,
    height: 30,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.gray[200],
  },
  partnerProductInfo: {
    flex: 1,
  },
  partnerProductTitle: {
    fontSize: 11,
    color: COLORS.text.primary,
  },
  partnerProductShopNow: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF0000',
  },

  // Empty & Error states
  emptyState: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    padding: SPACING.md,
    backgroundColor: '#FFE5E5',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  errorText: {
    color: '#D00000',
    fontWeight: '700',
  },
});

export default LiveScreen;

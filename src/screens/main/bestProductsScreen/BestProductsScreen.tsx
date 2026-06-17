/**
 * 베스트 상품 페지 — 홈페지의 "베스트상품" 인사이트 카드에서 진입.
 *
 * 상단 구성 (스크린샷 기준):
 *   • 헤더 ←뒤로 + "베스트 상품"
 *   • 탭 — 인기업체 베스트 / 가격 베스트 / 종합 베스트 (활성 탭은 붉은 pill)
 *   • 마스코트 + "카테고리별 선택 차트보기" 토글
 *   • 카테고리 dropdown + 검색 / 리셋 단추
 *   • 본문 — 2-열 그리드, 각 카드 좌상단에 TOP1/TOP2 배지
 *
 * API: GET /v1/products/search?keyword=...&source=1688&country=ko&page=N&pageSize=10&lang=ko
 * 기존 productsApi.searchProductsByKeyword 재사용.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../components/Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { productsApi } from '../../../services/productsApi';
import { openProductDetail } from '../../../utils/openProductDetail';

type Nav = StackNavigationProp<RootStackParamList, 'BestProducts'>;
const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

type TabKey = 'popularSeller' | 'price' | 'overall';

interface SearchProduct {
  id: string;
  externalId?: string;
  source?: string;
  title?: string;
  titleOriginal?: string;
  image?: string;
  price?: string;
  promotionPrice?: string;
  minOrderQuantity?: number;
  sales?: number;
  rating?: number;
  repurchaseRate?: string;
  isDropshipping?: boolean;
}

const BestProductsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t, locale } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabKey>('overall');
  // 카테고리 dropdown — placeholder. 백엔드 카테고리 트리 연결 전이라
  // 라벨만 표시한다. 추후 dropdown 모달을 띄워 categoryId 를 keyword 대체로
  // 보낼 수 있도록 확장 가능.
  const [category, setCategory] = useState<string>(t('home.bestProducts.categoryDefault'));
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기본 검색어 — 응답 자료처럼 "玩具" (중국어 "장난감"). 사용자가 카테고리를
  // 선택하면 그 카테고리에 매핑되는 키워드로 교체할 수 있다.
  const defaultKeyword = '玩具';
  const pageSize = 10;

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (replace) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        // productsApi.searchProductsByKeyword(keyword, source, country, page, pageSize)
        // — 응답 모양: { data: { products: [...], pagination: { totalPage } } }
        const res = await productsApi.searchProductsByKeyword(
          defaultKeyword,
          '1688',
          locale,
          targetPage,
          pageSize,
        );
        if (res.success && res.data?.data?.products) {
          const list: SearchProduct[] = res.data.data.products;
          const totalPage: number = res.data.data.pagination?.totalPage ?? 0;
          setProducts((prev) => (replace ? list : [...prev, ...list]));
          setHasMore(targetPage < totalPage);
          setPage(targetPage);
        } else {
          if (replace) setProducts([]);
          setError(res.message || 'Failed to fetch best products');
          setHasMore(false);
        }
      } catch (e: any) {
        if (replace) setProducts([]);
        setError(e?.message || 'Failed to fetch best products');
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage, activeTab]);

  const onSearch = () => fetchPage(1, true);
  const onReset = () => {
    setCategory(t('home.bestProducts.categoryDefault'));
    fetchPage(1, true);
  };
  const onEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchPage(page + 1, false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        hitSlop={BACK_HIT_SLOP}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('home.bestProducts.title')}</Text>
      <View style={styles.backButton} />
    </View>
  );

  const renderTabs = () => {
    const tabs: { key: TabKey; labelKey: string }[] = [
      { key: 'popularSeller', labelKey: 'home.bestProducts.tabPopularSeller' },
      { key: 'price', labelKey: 'home.bestProducts.tabPrice' },
      { key: 'overall', labelKey: 'home.bestProducts.tabOverall' },
    ];
    return (
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, active && styles.tabChipActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabChipText, active && styles.tabChipTextActive]} numberOfLines={1}>
                {t(tab.labelKey)}
              </Text>
              <Icon
                name="help-circle-outline"
                size={12}
                color={active ? COLORS.white : COLORS.gray[500]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderCategoryRow = () => (
    <View style={styles.categoryRow}>
      <Image
        source={require('../../../assets/icons/mascot.png')}
        style={styles.mascotSmall}
        resizeMode="contain"
      />
      <Icon name="notifications-outline" size={14} color={COLORS.text.primary} />
      <Text style={styles.categoryRowText}>{t('home.bestProducts.categoryChart')}</Text>
    </View>
  );

  const renderControls = () => (
    <View style={styles.controlsRow}>
      <View style={styles.categoryDropdown}>
        <Text style={styles.categoryDropdownText} numberOfLines={1}>
          {category}
        </Text>
        <Icon name="chevron-down" size={14} color={COLORS.gray[500]} />
      </View>
      <TouchableOpacity style={styles.searchButton} activeOpacity={0.85} onPress={onSearch}>
        <Text style={styles.searchButtonText}>{t('home.bestProducts.search')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.resetButton} activeOpacity={0.7} onPress={onReset}>
        <Text style={styles.resetButtonText}>{t('home.bestProducts.reset')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProduct = ({ item, index }: { item: SearchProduct; index: number }) => {
    const rank = index + 1;
    // TOP1 / TOP2 만 컬러 배지로 강조. 그 이하는 일반 카드.
    const badgeColor =
      rank === 1 ? COLORS.red : rank === 2 ? '#3B82F6' : null;
    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.85}
        onPress={() =>
          openProductDetail(navigation as any, {
            productId: String(item.id),
            source: item.source || '1688',
            thumbnailUrl: item.image || '',
          })
        }
      >
        <View style={styles.productImageWrap}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <Icon name="image-outline" size={28} color={COLORS.gray[400]} />
            </View>
          )}
          {badgeColor && (
            <View style={[styles.topBadge, { backgroundColor: badgeColor }]}>
              <Icon name="flame-outline" size={10} color={COLORS.white} />
              <Text style={styles.topBadgeText}>TOP{rank}</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <View style={styles.productSubRow}>
            <Text style={styles.productSource}>1688</Text>
            <Text style={styles.productTitle} numberOfLines={2}>
              {item.title || item.titleOriginal || ''}
            </Text>
          </View>
          {typeof item.sales === 'number' && (
            <View style={styles.productMetaRow}>
              <Text style={styles.productMetaText}>
                {t('home.bestProducts.salesLabel')} {item.sales}
              </Text>
              <Text style={styles.productMetaText}>
                {t('home.bestProducts.orderLabel')}{' '}
                {Math.max(1, Math.floor((item.sales ?? 0) * 0.2))}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderBody = () => {
    if (loading && products.length === 0) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      );
    }
    if (error && products.length === 0) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPage(1, true)}>
            <Text style={styles.retryBtnText}>{t('home.bestProducts.search')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (products.length === 0) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>{t('home.bestProducts.empty')}</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={products}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        renderItem={renderProduct}
        scrollEnabled={false}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: SPACING.md }}>
              <ActivityIndicator size="small" color={COLORS.red} />
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        {renderHeader()}
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            const distanceFromBottom =
              contentSize.height - contentOffset.y - layoutMeasurement.height;
            if (distanceFromBottom < 200) onEndReached();
          }}
          scrollEventThrottle={400}
        >
          <View style={styles.topPanel}>
            {renderTabs()}
            {renderCategoryRow()}
            {renderControls()}
          </View>
          {renderBody()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text.primary },
  topPanel: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.gray[100],
  },
  // Tabs (인기업체 / 가격 / 종합 베스트)
  tabBar: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gray[100],
  },
  tabChipActive: { backgroundColor: COLORS.red },
  tabChipText: { fontSize: FONTS.sizes.xs, color: COLORS.gray[700], fontWeight: '600' },
  tabChipTextActive: { color: COLORS.white },
  // 카테고리별 선택 차트보기 hint pill
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: SPACING.md,
  },
  mascotSmall: { width: 22, height: 22 },
  categoryRowText: { fontSize: FONTS.sizes.xs, color: COLORS.text.primary, fontWeight: '500' },
  // Controls row (카테고리 dropdown + 검색 + 리셋)
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  categoryDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 38,
  },
  categoryDropdownText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.text.primary },
  searchButton: {
    paddingHorizontal: SPACING.lg,
    height: 38,
    backgroundColor: COLORS.red,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  resetButton: {
    paddingHorizontal: SPACING.lg,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: { color: COLORS.gray[700], fontSize: FONTS.sizes.sm, fontWeight: '600' },
  // Grid
  listContent: { padding: SPACING.sm },
  gridRow: { gap: SPACING.sm, marginBottom: SPACING.sm },
  productCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  productImageWrap: { width: '100%', aspectRatio: 1, position: 'relative' },
  productImage: { width: '100%', height: '100%', backgroundColor: COLORS.gray[100] },
  productImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  topBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  topBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  productInfo: { padding: SPACING.sm },
  productSubRow: { flexDirection: 'row', gap: 4 },
  productSource: {
    fontSize: 10,
    color: COLORS.red,
    backgroundColor: 'rgba(255, 85, 0, 0.08)',
    paddingHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  productTitle: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.text.primary, lineHeight: Math.round(FONTS.sizes.xs * 16 / 12) },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  productMetaText: { fontSize: 10, color: COLORS.gray[500] },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.gray[500] },
  retryBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: BORDER_RADIUS.md,
  },
  retryBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});

export default BestProductsScreen;

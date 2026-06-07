/**
 * 인기업체 페지 — 홈페지의 "인기업체" 인사이트 카드에서 진입.
 *
 * 인기 순위로 정렬된 업체 카드 리스트를 보여 준다. 백엔드의 sellers
 * popularity-ranked endpoint 가 도입되기 전까지는 placeholder 데이터 +
 * 빈 상태 UI 로 화면 구조를 마련해 둔다. 추후 popularMerchantsApi.list
 * (가칭) 같은 함수가 추가되면 fetchMerchants() 내부만 교체하면 된다.
 *
 * NewStoresScreen 과 디자인 톤은 같지만 상단 좌측에 TOP1/TOP2 강조 배지가
 * 붙고, '신규' 대신 '인기' 표시를 한다.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../components/Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList } from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';

type Nav = StackNavigationProp<RootStackParamList, 'PopularMerchants'>;
const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

interface MerchantItem {
  id: string;
  name: string;
  category?: string;
  productsCount?: number;
  orderCount?: number;
  rating?: number;
  thumbnail?: string;
}

const PopularMerchantsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const [merchants, setMerchants] = useState<MerchantItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      // 백엔드 endpoint 도입 전 placeholder. 실 데이터는 인기도 순으로 정렬된
      // 상태가 백엔드에서 보장된다고 가정하고, 인덱스를 그대로 순위로 사용.
      const placeholder: MerchantItem[] = Array.from({ length: 20 }).map((_, i) => ({
        id: `merchant-${i + 1}`,
        name: `${t('home.popularMerchants.merchantNamePrefix') || 'Merchant'} ${i + 1}`,
        category: t('home.popularMerchants.categoryGeneric') || 'General',
        productsCount: 50 + (i * 7) % 80,
        orderCount: 200 + (i * 13) % 500,
        rating: 4.2 + ((i % 8) / 10),
      }));
      setMerchants(placeholder);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        hitSlop={BACK_HIT_SLOP}
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {t('home.popularMerchants.title') || '인기업체'}
      </Text>
      <View style={styles.backButton} />
    </View>
  );

  const renderItem = ({ item, index }: { item: MerchantItem; index: number }) => {
    const rank = index + 1;
    // TOP1 / TOP2 / TOP3 만 색깔 배지로 강조.
    const badgeColor =
      rank === 1
        ? COLORS.red
        : rank === 2
          ? '#3B82F6'
          : rank === 3
            ? '#10B981'
            : null;
    return (
      <TouchableOpacity style={styles.merchantCard} activeOpacity={0.85}>
        <View style={styles.merchantThumbWrap}>
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.merchantThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.merchantThumb, styles.merchantThumbPlaceholder]}>
              <Icon name="storefront-outline" size={28} color={COLORS.gray[400]} />
            </View>
          )}
          {badgeColor ? (
            <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.rankBadgeText}>TOP{rank}</Text>
            </View>
          ) : (
            <View style={styles.rankBadgePlain}>
              <Text style={styles.rankBadgePlainText}>#{rank}</Text>
            </View>
          )}
        </View>
        <View style={styles.merchantInfo}>
          <Text style={styles.merchantName} numberOfLines={1}>
            {item.name}
          </Text>
          {!!item.category && (
            <Text style={styles.merchantMeta} numberOfLines={1}>
              {item.category}
            </Text>
          )}
          {item.rating != null && (
            <View style={styles.metricRow}>
              <Icon name="star" size={10} color="#F59E0B" />
              <Text style={styles.metricText}>{item.rating.toFixed(1)}</Text>
              {item.orderCount != null && (
                <Text style={styles.metricMuted}>
                  {' · '}
                  {t('home.popularMerchants.orderLabel') || '주문'}{' '}
                  {item.orderCount}
                </Text>
              )}
            </View>
          )}
          {item.productsCount != null && (
            <Text style={styles.merchantMetaAccent}>
              {t('home.popularMerchants.productsCountLabel') || '상품수'}{' '}
              <Text style={styles.merchantMetaAccentNum}>{item.productsCount}</Text>
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () =>
    loading ? null : (
      <View style={styles.emptyBox}>
        <Icon name="storefront-outline" size={36} color={COLORS.gray[400]} />
        <Text style={styles.emptyText}>
          {t('home.popularMerchants.empty') || '인기업체가 없습니다'}
        </Text>
      </View>
    );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        {renderHeader()}
      </SafeAreaView>
      <View style={styles.body}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.red} />
          </View>
        ) : (
          <FlatList
            data={merchants}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safeTop: { backgroundColor: COLORS.white },
  body: { flex: 1, backgroundColor: COLORS.background },
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
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  row: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  merchantCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  merchantThumbWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.gray[100],
  },
  merchantThumb: {
    width: '100%',
    height: '100%',
  },
  merchantThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rankBadgePlain: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankBadgePlainText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
  merchantInfo: {
    padding: SPACING.sm,
  },
  merchantName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  merchantMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  metricText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  metricMuted: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  merchantMetaAccent: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  merchantMetaAccentNum: {
    color: COLORS.red,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
});

export default PopularMerchantsScreen;

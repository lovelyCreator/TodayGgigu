/**
 * 신규등록상점 페지 — 홈페지의 "신규등록상점" 인사이트 카드에서 진입.
 *
 * 최근 등록된 상점(업체) 들의 카드 리스트를 보여 준다. 백엔드의 sellers
 * list endpoint 가 도입되기 전까지는 placeholder 데이터 + 빈 상태 UI 로
 * 화면 구조를 마련해 둔다. 추후 productsApi.getSellers (가칭) 같은 함수가
 * 추가되면 fetchStores() 의 내부만 교체하면 된다.
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

type Nav = StackNavigationProp<RootStackParamList, 'NewStores'>;
const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

interface StoreItem {
  id: string;
  name: string;
  category?: string;
  productsCount?: number;
  registeredAt?: string; // ISO date
  thumbnail?: string;
}

const NewStoresScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      // 백엔드 endpoint 도입 전 placeholder. 응답으로 받은 데이터를 그대로
      // map 해 setStores 호출하면 된다. 라벨/카테고리/등록일은 그대로 i18n
      // 키를 통해 표시.
      const placeholder: StoreItem[] = Array.from({ length: 24 }).map((_, i) => ({
        id: `store-${i + 1}`,
        name: `${t('home.newStores.storeNamePrefix') || 'Store'} ${i + 1}`,
        category: t('home.newStores.categoryGeneric') || 'General',
        productsCount: 10 + (i % 7) * 4,
        registeredAt: '',
      }));
      setStores(placeholder);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

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
        {t('home.newStores.title') || '신규등록상점'}
      </Text>
      <View style={styles.backButton} />
    </View>
  );

  const renderItem = ({ item }: { item: StoreItem }) => (
    <TouchableOpacity style={styles.storeCard} activeOpacity={0.85}>
      <View style={styles.storeThumbWrap}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.storeThumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.storeThumb, styles.storeThumbPlaceholder]}>
            <Icon name="storefront-outline" size={28} color={COLORS.gray[400]} />
          </View>
        )}
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      </View>
      <View style={styles.storeInfo}>
        <Text style={styles.storeName} numberOfLines={1}>
          {item.name}
        </Text>
        {!!item.category && (
          <Text style={styles.storeMeta} numberOfLines={1}>
            {item.category}
          </Text>
        )}
        {item.productsCount != null && (
          <Text style={styles.storeMetaAccent}>
            {t('home.newStores.productsCountLabel') || '상품수'}{' '}
            <Text style={styles.storeMetaAccentNum}>{item.productsCount}</Text>
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () =>
    loading ? null : (
      <View style={styles.emptyBox}>
        <Icon name="storefront-outline" size={36} color={COLORS.gray[400]} />
        <Text style={styles.emptyText}>
          {t('home.newStores.empty') || '등록된 상점이 없습니다'}
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
            data={stores}
            keyExtractor={(s) => s.id}
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
  storeCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  storeThumbWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.gray[100],
  },
  storeThumb: {
    width: '100%',
    height: '100%',
  },
  storeThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.red,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  storeInfo: {
    padding: SPACING.sm,
  },
  storeName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  storeMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  storeMetaAccent: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  storeMetaAccentNum: {
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

export default NewStoresScreen;

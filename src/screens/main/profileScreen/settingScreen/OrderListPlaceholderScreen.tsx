/**
 * 내주문 카드의 비-구매대행 탭(로켓/3PL, VVIC하이패스, 배송대행)을 눌러
 * 들어오는 도메인별 주문 리스트 페지의 공용 본체.
 *
 * 구성은 BuyListScreen 과 동일한 골격을 따른다:
 *   • 상단 헤더 — 뒤로가기 / 주문 검색 입력 / 필터(아이콘) / 그리드 / 더보기
 *   • 필터 row1 — '전체' + 도메인별 상태 그룹 칩들
 *   • 필터 row2 — 전체선택 / 통관방식 / 운송방식 / 기간선택
 *   • 본문 — 주문 카드 리스트 (현재 백엔드 미연결이라 빈 상태로 렌더)
 *
 * 도메인은 props 로만 갈아끼우면 되도록 라벨/탭/페지 제목만 외부에서 주입.
 * 검색·필터·그리드·더보기 동작은 UI placeholder 로 동작은 더미.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../../../components/Icon';
import TuneIcon from '../../../../assets/icons/TuneIcon';
import GridViewIcon from '../../../../assets/icons/GridViewIcon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../../constants';
import { useTranslation } from '../../../../hooks/useTranslation';

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export interface OrderListPlaceholderTab<TKey extends string = string> {
  key: TKey;
  labelKey: string;
}

export interface OrderListPlaceholderProps<TKey extends string = string> {
  titleKey: string;
  tabs: OrderListPlaceholderTab<TKey>[];
  initialTab?: TKey | 'all';
  embedded?: boolean;
}

export default function OrderListPlaceholderScreen<TKey extends string>(
  props: OrderListPlaceholderProps<TKey>,
) {
  const { titleKey, tabs, initialTab, embedded = false } = props;
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  // 'all' 또는 도메인 탭 키 중 활성값. 'all' 일 때는 전체 칩이 붉은색.
  const resolveInitial = (): TKey | 'all' => {
    if (initialTab && initialTab !== 'all') {
      const found = tabs.find((tab) => tab.key === initialTab);
      if (found) return found.key;
      return 'all';
    }
    return 'all';
  };

  const [activeTab, setActiveTab] = useState<TKey | 'all'>(resolveInitial());
  const [orderSearchText, setOrderSearchText] = useState('');
  const [selectedCustoms, setSelectedCustoms] = useState<string | null>(null);
  const [selectedTransport, setSelectedTransport] = useState<string | null>(null);
  // 날짜는 추후 캘린더 모달 연결 시 사용 — 지금은 표시만.
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  void setSelectedStartDate;
  void setSelectedEndDate;
  const [selectAll, setSelectAll] = useState(false);
  const [showCustomsDropdown, setShowCustomsDropdown] = useState(false);
  const [showTransportDropdown, setShowTransportDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  // 라우트 파라미터가 바뀔 때 활성 탭 동기화
  useEffect(() => {
    const next = resolveInitial();
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  const activeLabel = useMemo(() => {
    if (activeTab === 'all') return t('profile.viewAll') || 'All';
    const tab = tabs.find((entry) => entry.key === activeTab);
    return tab ? t(tab.labelKey) : '';
  }, [activeTab, tabs, t]);

  // 통관/운송 dropdown 옵션 — BuyListScreen 과 동일한 라벨.
  const customsOptions = useMemo(
    () => [
      { label: t('profile.viewAll') || 'All', value: '' },
      { label: t('pages.orders.filters.generalClearance') || '일반통관', value: '일반통관' },
      { label: t('pages.orders.filters.simplifiedClearance') || '간이통관', value: '간이통관' },
    ],
    [t],
  );

  const transportOptions = useMemo(
    () => [
      { label: t('profile.viewAll') || 'All', value: '' },
      { label: t('pages.orders.filters.airTransport') || '항공', value: '항공' },
      { label: t('pages.orders.filters.seaTransport') || '해상', value: '해상' },
    ],
    [t],
  );

  const body = (
    <>
      <View
        style={[styles.header, embedded && styles.embeddedHeader]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        {!embedded && (
          <TouchableOpacity
            hitSlop={BACK_HIT_SLOP}
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('Main');
            }}
          >
            <Icon name="chevron-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        )}

        <View style={[styles.headerCenter, embedded && styles.embeddedHeaderCenter]}>
          <View style={styles.orderSearchBar}>
            <TextInput
              style={styles.orderSearchInput}
              placeholder={t('profile.searchOrders') || '주문 검색'}
              placeholderTextColor={COLORS.text.secondary}
              value={orderSearchText}
              onChangeText={setOrderSearchText}
              returnKeyType="search"
            />
            {!!orderSearchText ? (
              <TouchableOpacity onPress={() => setOrderSearchText('')}>
                <Icon name="close-circle" size={18} color={COLORS.text.primary} />
              </TouchableOpacity>
            ) : (
              <Icon name="search" size={18} color={COLORS.text.primary} />
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton}>
            <TuneIcon width={24} height={24} color={COLORS.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton}>
            <GridViewIcon width={24} height={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => setShowMoreMenu((prev) => !prev)}
          >
            <Icon name="ellipsis-horizontal" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 더보기 메뉴 — 헤더 아래 오버레이 */}
      {showMoreMenu && (
        <>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: headerHeight,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
            activeOpacity={1}
            onPress={() => setShowMoreMenu(false)}
          />
          <View style={[styles.moreMenuRow, { top: headerHeight }]}>
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => setShowMoreMenu(false)}
            >
              <Icon name="download-outline" size={20} color={COLORS.black} />
              <Text style={styles.moreMenuItemText}>{t('home.exportOrders')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => setShowMoreMenu(false)}
            >
              <Icon name="print-outline" size={20} color={COLORS.black} />
              <Text style={styles.moreMenuItemText}>{t('home.print')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* 필터 Row 1 — 전체 + 도메인별 상태 칩 */}
      <View style={styles.filterRow1}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow1Content}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                activeTab === 'all' && styles.filterChipTextActive,
              ]}
            >
              {t('profile.viewAll') || 'All'}
            </Text>
          </TouchableOpacity>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t(tab.labelKey)}
                  {' '}
                  <Text
                    style={[
                      styles.filterChipCountBadge,
                      active && styles.filterChipCountBadgeActive,
                    ]}
                  >
                    (0)
                  </Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 필터 Row 2 — 전체선택 / 통관 / 운송 / 기간 */}
      <View style={styles.filterRow2}>
        <TouchableOpacity
          style={styles.selectAllChip}
          onPress={() => setSelectAll((prev) => !prev)}
        >
          <View
            style={[
              styles.selectAllCircle,
              selectAll && styles.selectAllCircleActive,
            ]}
          >
            {selectAll && <Icon name="checkmark" size={12} color={COLORS.white} />}
          </View>
          <Text style={styles.selectAllText}>
            {t('pages.orders.filters.selectAll') || '전체 선택'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, !!selectedCustoms && styles.filterChipActive]}
          onPress={() => setShowCustomsDropdown((prev) => !prev)}
        >
          <Text
            style={[
              styles.filterChipText,
              !!selectedCustoms && styles.filterChipTextActive,
            ]}
          >
            {selectedCustoms ||
              (t('pages.orders.filters.customsMethod') || '통관방식')}
          </Text>
          <Icon
            name="chevron-down"
            size={14}
            color={selectedCustoms ? COLORS.red : COLORS.text.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, !!selectedTransport && styles.filterChipActive]}
          onPress={() => setShowTransportDropdown((prev) => !prev)}
        >
          <Text
            style={[
              styles.filterChipText,
              !!selectedTransport && styles.filterChipTextActive,
            ]}
          >
            {selectedTransport ||
              (t('pages.orders.filters.transportMethod') || '운송방식')}
          </Text>
          <Icon
            name="chevron-down"
            size={14}
            color={selectedTransport ? COLORS.red : COLORS.text.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            (selectedStartDate || selectedEndDate) && styles.filterChipActive,
          ]}
        >
          <Text
            style={[
              styles.filterChipText,
              (selectedStartDate || selectedEndDate) && styles.filterChipTextActive,
            ]}
          >
            {selectedStartDate
              ? `${selectedStartDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}${selectedEndDate ? ` ~ ${selectedEndDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}` : ''}`
              : t('pages.orders.filters.periodSelect') || '기간선택'}
          </Text>
          <Icon
            name="calendar-outline"
            size={14}
            color={selectedStartDate || selectedEndDate ? COLORS.red : COLORS.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* 본문 — 빈 상태 (백엔드 연결 전) */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* 현재 활성 탭/페지 이름을 표시하는 작은 부제 */}
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitleText}>{t(titleKey)}</Text>
            <Text style={styles.pageTabText}>· {activeLabel}</Text>
          </View>

          <View style={styles.emptyState}>
            <Icon name="basket-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>{t('profile.placeholderEmpty')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('profile.placeholderEmptyHint') || ''}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 통관 dropdown */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={showCustomsDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomsDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCustomsDropdown(false)}
        >
          <View
            style={styles.dropdownModalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.dropdownModalTitle}>
              {t('pages.orders.filters.customsMethod') || '통관방식'}
            </Text>
            {customsOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value || 'all'}
                style={[
                  styles.groupDropdownItem,
                  selectedCustoms === opt.value && styles.groupDropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedCustoms(opt.value || null);
                  setShowCustomsDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.groupDropdownText,
                    selectedCustoms === opt.value && styles.groupDropdownTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 운송 dropdown */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={showTransportDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransportDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTransportDropdown(false)}
        >
          <View
            style={styles.dropdownModalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.dropdownModalTitle}>
              {t('pages.orders.filters.transportMethod') || '운송방식'}
            </Text>
            {transportOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value || 'all'}
                style={[
                  styles.groupDropdownItem,
                  selectedTransport === opt.value && styles.groupDropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedTransport(opt.value || null);
                  setShowTransportDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.groupDropdownText,
                    selectedTransport === opt.value && styles.groupDropdownTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  if (embedded) {
    return <View style={[styles.container, styles.embeddedContainer]}>{body}</View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {body}
    </SafeAreaView>
  );
}

// 스타일은 BuyListScreen 의 시각 토큰(여백·색·테두리 반경)을 그대로 따른다.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  embeddedContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  embeddedHeader: {
    paddingTop: SPACING.sm,
  },
  embeddedHeaderCenter: {
    marginLeft: 0,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm * 2,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  orderSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0000000D',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  orderSearchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMenuRow: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 100,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    flexDirection: 'column',
    paddingVertical: SPACING.xs,
    minWidth: 160,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  moreMenuItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  // Filter rows
  filterRow1: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  filterRow1Content: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  filterRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.lightRed,
  },
  filterChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  filterChipTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  filterChipCountBadge: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
    fontWeight: '400',
  },
  filterChipCountBadgeActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  selectAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  selectAllCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.gray[400],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllCircleActive: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  selectAllText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  // Dropdown modals
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dropdownModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
  },
  dropdownModalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  groupDropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[100],
  },
  groupDropdownItemActive: {
    backgroundColor: COLORS.lightRed,
  },
  groupDropdownText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  groupDropdownTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  // Body
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  pageTitleText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  pageTabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

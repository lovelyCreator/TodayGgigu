import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { RootStackParamList } from '../../../../types';
import { useTranslation } from '../../../../hooks/useTranslation';

type Nav = StackNavigationProp<RootStackParamList, 'ProgressNotification'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

type TabKey = 'order' | 'notice' | 'update';
type FilterKey = 'all' | 'unread';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
}

// Seed data per tab, mirroring the design screenshots.
const ORDER_SEED: NotificationItem[] = [
  {
    id: 'o1',
    title: '정보알림 : CN확인성공',
    body: '고객확인 : Y-UMZC260413 CN 확인 성공했습니다, 주문 확인 해주세요!',
    date: '2026-04-13 09:49:33',
    read: false,
  },
  {
    id: 'o2',
    title: '정보알림 : 취소성공',
    body: '주문번호 ORD-20260412-001 취소 처리가 완료되었습니다.',
    date: '2026-04-12 14:22:10',
    read: false,
  },
  {
    id: 'o3',
    title: '정보알림 : 입고완료',
    body: '창고 입고가 완료되었습니다. 배송 요청을 진행해 주세요.',
    date: '2026-04-11 11:05:00',
    read: true,
  },
  {
    id: 'o4',
    title: '정보알림 : 결제대기',
    body: '새 주문이 결제 대기 중입니다. 기한 내 결제를 완료해 주세요.',
    date: '2026-04-10 08:30:15',
    read: false,
  },
  {
    id: 'o5',
    title: '정보알림 : 배송출발',
    body: '택배가 출발했습니다. 운송장 번호는 마이페이지에서 확인 가능합니다.',
    date: '2026-04-09 16:40:22',
    read: true,
  },
  {
    id: 'o6',
    title: '정보알림 : 반품접수',
    body: '반품 요청이 접수되었습니다. 검수 후 안내드리겠습니다.',
    date: '2026-04-08 10:12:44',
    read: false,
  },
  {
    id: 'o7',
    title: '정보알림 : 서류보완',
    body: '통관 서류 보완이 필요합니다. 마감일 전에 업로드해 주세요.',
    date: '2026-04-07 09:00:00',
    read: false,
  },
  {
    id: 'o8',
    title: '정보알림 : CN확인성공',
    body: '고객확인 : Y-ABCD260406 CN 확인 성공했습니다.',
    date: '2026-04-06 13:25:18',
    read: true,
  },
];

const NOTICE_SEED: NotificationItem[] = [
  {
    id: 'n1',
    title: '공지 : 서비스 이용약관 개정',
    body: '2026년 5월 1일부터 개정된 약관이 적용됩니다. 자세한 내용은 공지사항을 확인해 주세요.',
    date: '2026-04-10 10:00:00',
    read: false,
  },
  {
    id: 'n2',
    title: '공지 : 설 연휴 배송 안내',
    body: '연휴 기간 중 출고 및 택배가 지연될 수 있습니다.',
    date: '2026-04-05 09:00:00',
    read: true,
  },
  {
    id: 'n3',
    title: '공지 : 보안 강화 안내',
    body: '로그인 2단계 인증 도입 예정입니다.',
    date: '2026-04-01 14:00:00',
    read: false,
  },
];

const UPDATE_SEED: NotificationItem[] = [
  {
    id: 'u1',
    title: '업데이트 : 마이페이지 UI 개선',
    body: '발주관리 화면이 새롭게 개편되었습니다.',
    date: '2026-04-12 11:00:00',
    read: false,
  },
  {
    id: 'u2',
    title: '업데이트 : 엑셀 업로드 기능',
    body: '카테고리 일괄 등록이 가능해졌습니다.',
    date: '2026-04-08 16:30:00',
    read: true,
  },
];

type ProgressNotificationScreenProps = {
  embedded?: boolean;
};

/** 진행알림 - Progress Notification screen. */
const ProgressNotificationScreen: React.FC<ProgressNotificationScreenProps> = ({
  embedded = false,
}) => {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabKey>('order');
  const [filter, setFilter] = useState<FilterKey>('all');

  const [orderItems, setOrderItems] = useState<NotificationItem[]>(ORDER_SEED);
  const [noticeItems, setNoticeItems] = useState<NotificationItem[]>(NOTICE_SEED);
  const [updateItems, setUpdateItems] = useState<NotificationItem[]>(UPDATE_SEED);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'order', label: t('profile.progressNotificationScreen.tabOrder') },
    { key: 'notice', label: t('profile.progressNotificationScreen.tabNotice') },
    { key: 'update', label: t('profile.progressNotificationScreen.tabUpdate') },
  ];

  const itemsByTab: Record<TabKey, NotificationItem[]> = {
    order: orderItems,
    notice: noticeItems,
    update: updateItems,
  };
  const settersByTab: Record<
    TabKey,
    React.Dispatch<React.SetStateAction<NotificationItem[]>>
  > = {
    order: setOrderItems,
    notice: setNoticeItems,
    update: setUpdateItems,
  };

  const currentItems = itemsByTab[activeTab];
  const setCurrentItems = settersByTab[activeTab];

  const visibleItems = useMemo(
    () =>
      filter === 'unread'
        ? currentItems.filter((item) => !item.read)
        : currentItems,
    [currentItems, filter],
  );

  const markAllRead = () => {
    setCurrentItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const markOneRead = (id: string) => {
    setCurrentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  };

  const renderFilterChip = (key: FilterKey, label: string) => {
    const active = filter === key;
    return (
      <TouchableOpacity
        style={[styles.chip, active && styles.chipActive]}
        activeOpacity={0.7}
        onPress={() => setFilter(key)}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = (item: NotificationItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => markOneRead(item.id)}
    >
      <View style={styles.iconBadge}>
        <Icon name="document-text" size={20} color={COLORS.white} />
        {!item.read && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTopLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.detailLink}>
            {t('profile.progressNotificationScreen.viewDetails')}
          </Text>
        </View>
        <View style={styles.rowBottomLine}>
          <Text style={styles.rowText} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.rowDate}>{item.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const body = (
    <View style={[styles.body, embedded && styles.embeddedBody]}>
      {!embedded && (
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={BACK_HIT_SLOP}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('profile.progressNotificationScreen.title')}
          </Text>
          <View style={styles.backButton} />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.chipGroup}>
          {renderFilterChip('all', t('profile.progressNotificationScreen.filterAll'))}
          {renderFilterChip(
            'unread',
            t('profile.progressNotificationScreen.filterUnread'),
          )}
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={markAllRead}>
          <Text style={styles.markAllText}>
            {t('profile.progressNotificationScreen.markAllRead')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {visibleItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {t('profile.progressNotificationScreen.empty')}
            </Text>
          </View>
        ) : (
          visibleItems.map(renderItem)
        )}
      </ScrollView>
    </View>
  );

  if (embedded) {
    return body;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {body}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  embeddedBody: {
    backgroundColor: COLORS.background,
  },
  // Header
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
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.smmd,
  },
  tabText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  tabTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 48,
    borderRadius: 2,
    backgroundColor: COLORS.red,
  },
  // Filter bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  chipGroup: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  chipTextActive: {
    color: COLORS.white,
  },
  markAllText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.red,
  },
  // List
  listContent: {
    paddingBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  rowBody: {
    flex: 1,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },
  detailLink: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.red,
  },
  rowBottomLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rowText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginRight: SPACING.sm,
    lineHeight: Math.round(FONTS.sizes.xs * 18 / 12),
  },
  rowDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
  },
  // Empty
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
});

export default ProgressNotificationScreen;

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../../components/Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../../../constants';
import { RootStackParamList } from '../../../../../types';
import { useTranslation } from '../../../../../hooks/useTranslation';
import UnitSurveyRequestModal from './UnitSurveyRequestModal';
import UnitSurveyPaymentModal from './UnitSurveyPaymentModal';
import { tradeApplicationsApi } from '../../../../../services/tradeApplicationsApi';
import { TradeApplication } from '../../../../../types/tradeApplication';
import { getTradeApplicationStatusLabelKey } from '../../../../../utils/tradeApplicationStatusLabel';
import { formatPriceKRW } from '../../../../../utils/i18nHelpers';

type Nav = StackNavigationProp<RootStackParamList, 'OEMSurvey'>;

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const formatOrderDateTime = (iso: string | undefined, locale: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  if (locale === 'ko') {
    const hours = d.getHours();
    const ampm = hours < 12 ? '오전' : '오후';
    const hour12 = hours % 12 || 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${ampm} ${hour12}:${minutes}`;
  }

  return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** OEM - 진행단계 (OEM survey progress screen). */
type OEMSurveyScreenProps = {
  embedded?: boolean;
};

const OEMSurveyScreen: React.FC<OEMSurveyScreenProps> = ({ embedded = false }) => {
  const navigation = useNavigation<Nav>();
  const { t, locale } = useTranslation();

  const [searchText, setSearchText] = useState('');
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentApplication, setPaymentApplication] = useState<TradeApplication | null>(null);
  const [applications, setApplications] = useState<TradeApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadApplications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);

    try {
      const res = await tradeApplicationsApi.getMyApplications({
        page: 1,
        pageSize: 100,
        type: 'OEM',
      });

      if (res.success && res.data?.applications) {
        setApplications(res.data.applications);
      } else {
        setApplications([]);
        setLoadError(res.error || t('profile.unitSurvey.loadFailed'));
      }
    } catch {
      setApplications([]);
      setLoadError(t('profile.unitSurvey.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [loadApplications]),
  );

  const filteredApplications = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return applications.filter((app) => {
      const created = app.createdAt ? new Date(app.createdAt) : null;
      if (created && !Number.isNaN(created.getTime())) {
        if (startDate && created < startOfDay(startDate)) return false;
        if (endDate && created > endOfDay(endDate)) return false;
      }

      if (!query) return true;

      const haystack = [
        app.applicationNumber,
        app.productInfo?.name,
        app.productInfo?.option,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [applications, searchText, startDate, endDate]);

  const openDateModal = () => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setCalendarMonth(startDate ?? new Date());
    setDateModalOpen(true);
  };

  const onPickDate = (d: Date) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(d);
      setDraftEnd(null);
    } else if (d < draftStart) {
      setDraftEnd(draftStart);
      setDraftStart(d);
    } else {
      setDraftEnd(d);
    }
  };

  const confirmDateRange = () => {
    setStartDate(draftStart);
    setEndDate(draftEnd);
    setDateModalOpen(false);
  };

  const resetDateRange = () => {
    setDraftStart(null);
    setDraftEnd(null);
  };

  const openDetail = (app: TradeApplication) => {
    navigation.navigate('UnitSurveyDetail', {
      applicationId: app._id,
      preview: app,
    });
  };

  const handlePay = (app: TradeApplication) => {
    setPaymentApplication(app);
    setPaymentModalVisible(true);
  };

  const renderApplicationCard = (app: TradeApplication, index: number) => {
    const statusKey = getTradeApplicationStatusLabelKey(app.status);
    const statusLabel = t(statusKey);
    const imageUrl = app.productInfo?.imageUrl;
    const costKRW = app.costEstimate?.amountKRW ?? 0;
    const showPayButton = app.status === 'PAYMENT_PENDING' && costKRW > 0;

    return (
      <View key={app._id} style={styles.applicationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTop}>
            <Text style={styles.statusText}>{statusLabel}</Text>
            <Text style={styles.orderDateText} numberOfLines={1}>
              {t('profile.unitSurvey.orderDate')}: {formatOrderDateTime(app.createdAt, locale)}
            </Text>
          </View>
          <View style={styles.cardHeaderBottom}>
            <Text style={styles.applicationNo}>{app.applicationNumber || '-'}</Text>
            <TouchableOpacity
              style={styles.orderDetailLinkBtn}
              activeOpacity={0.7}
              onPress={() => openDetail(app)}
            >
              <Text style={styles.orderDetailLinkText}>
                {t('profile.unitSurvey.orderDetails')} {'>'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.imageWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
            ) : (
              <View style={[styles.productImage, styles.productImagePlaceholder]}>
                <Icon name="image-outline" size={28} color={COLORS.gray[400]} />
              </View>
            )}
            <View style={styles.noBadge}>
              <Text style={styles.noBadgeText}>NO.{index + 1}</Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {app.productInfo?.name || '-'}
            </Text>
            {!!app.productInfo?.option && (
              <Text style={styles.productMeta} numberOfLines={1}>
                {app.productInfo.option}
              </Text>
            )}
          </View>

          <View style={styles.paymentCol}>
            <Text style={styles.paymentLabel}>{t('profile.unitSurvey.paymentAmount')}</Text>
            <Text style={styles.paymentValue}>{formatPriceKRW(costKRW)}</Text>
            {showPayButton ? (
              <TouchableOpacity
                style={styles.payButton}
                activeOpacity={0.85}
                onPress={() => handlePay(app)}
              >
                <Text style={styles.payButtonText}>{t('profile.unitSurvey.pay')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.payButtonSpacer} />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderListContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      );
    }

    if (loadError && applications.length === 0) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadApplications()}>
            <Text style={styles.retryButtonText}>{t('profile.unitSurvey.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredApplications.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Image
            source={require('../../../../../assets/icons/cart_empty.png')}
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>{t('profile.unitSurvey.empty')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {filteredApplications.map((app, index) => renderApplicationCard(app, index))}
      </View>
    );
  };

  const body = (
    <>
      <View style={[styles.header, embedded && styles.embeddedHeader]}>
        {!embedded && (
          <TouchableOpacity
            hitSlop={BACK_HIT_SLOP}
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, embedded && styles.embeddedHeaderTitle]}>
          {t('profile.OEM')}
        </Text>
        <TouchableOpacity
          style={styles.requestButton}
          activeOpacity={0.85}
          onPress={() => setRequestModalVisible(true)}
        >
          <Text style={styles.requestButtonText}>
            {t('profile.oemSurvey.requestForm')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadApplications(true)}
            colors={[COLORS.red]}
            tintColor={COLORS.red}
          />
        }
      >
        <View style={styles.filterPanel}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('profile.unitSurvey.searchPlaceholder')}
              placeholderTextColor={COLORS.gray[400]}
              value={searchText}
              onChangeText={setSearchText}
            />
            <Icon name="search" size={18} color={COLORS.gray[500]} />
          </View>

          <TouchableOpacity
            style={styles.dateBox}
            activeOpacity={0.7}
            onPress={openDateModal}
          >
            <Text
              style={[
                styles.datePlaceholder,
                (startDate || endDate) && styles.dateValueText,
              ]}
            >
              {startDate || endDate
                ? `${startDate ? formatDate(startDate) : ''}${endDate ? ` ~ ${formatDate(endDate)}` : ''}`
                : t('profile.unitSurvey.datePlaceholder')}
            </Text>
            <Icon
              name="calendar-outline"
              size={18}
              color={(startDate || endDate) ? COLORS.red : COLORS.gray[500]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />
        {renderListContent()}
      </ScrollView>

      <UnitSurveyRequestModal
        visible={requestModalVisible}
        title={t('profile.oemSurvey.requestForm')}
        applicationType="OEM"
        onClose={() => setRequestModalVisible(false)}
        onSubmit={() => loadApplications(true)}
      />

      <UnitSurveyPaymentModal
        visible={paymentModalVisible}
        application={paymentApplication}
        onClose={() => {
          setPaymentModalVisible(false);
          setPaymentApplication(null);
        }}
        onSuccess={() => loadApplications(true)}
      />

      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
        visible={dateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.dateModalBackdrop}
          activeOpacity={1}
          onPress={() => setDateModalOpen(false)}
        >
          <View
            style={styles.dateModalCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.dateModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(calendarMonth);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarMonth(d);
                }}
              >
                <Icon name="chevron-back" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={styles.dateModalHeaderText}>
                {calendarMonth.getFullYear()}{t('profile.unitSurvey.calendarYearSuffix') || '년 '}
                {calendarMonth.getMonth() + 1}{t('profile.unitSurvey.calendarMonthSuffix') || '월'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(calendarMonth);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarMonth(d);
                }}
              >
                <Icon name="chevron-forward" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateModalWeekRow}>
              {[
                t('profile.unitSurvey.weekdayShort0') || '일',
                t('profile.unitSurvey.weekdayShort1') || '월',
                t('profile.unitSurvey.weekdayShort2') || '화',
                t('profile.unitSurvey.weekdayShort3') || '수',
                t('profile.unitSurvey.weekdayShort4') || '목',
                t('profile.unitSurvey.weekdayShort5') || '금',
                t('profile.unitSurvey.weekdayShort6') || '토',
              ].map((d, i) => (
                <Text key={i} style={styles.dateModalWeekday}>{d}</Text>
              ))}
            </View>

            {(() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells: (number | null)[] = Array(firstDay).fill(null);
              for (let i = 1; i <= daysInMonth; i++) cells.push(i);
              while (cells.length % 7 !== 0) cells.push(null);
              const weeks: (number | null)[][] = [];
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
              return weeks.map((week, wi) => (
                <View key={wi} style={styles.dateModalWeekRow}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={styles.dateModalCell} />;
                    const date = new Date(year, month, day);
                    const isStart = draftStart && date.toDateString() === draftStart.toDateString();
                    const isEnd = draftEnd && date.toDateString() === draftEnd.toDateString();
                    const inRange = draftStart && draftEnd && date > draftStart && date < draftEnd;
                    return (
                      <TouchableOpacity
                        key={di}
                        style={[
                          styles.dateModalCell,
                          (isStart || isEnd) && styles.dateModalCellSelected,
                          inRange && styles.dateModalCellInRange,
                        ]}
                        onPress={() => onPickDate(date)}
                      >
                        <Text
                          style={[
                            styles.dateModalCellText,
                            (isStart || isEnd) && styles.dateModalCellTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()}

            <Text style={styles.dateModalHint}>
              {!draftStart
                ? (t('profile.unitSurvey.selectStartDate') || '시작일을 선택하세요')
                : !draftEnd
                  ? (t('profile.unitSurvey.selectEndDate') || '종료일을 선택하세요')
                  : `${formatDate(draftStart)} ~ ${formatDate(draftEnd)}`}
            </Text>

            <View style={styles.dateModalFooter}>
              <TouchableOpacity
                style={[styles.dateModalFooterBtn, styles.dateModalResetBtn]}
                activeOpacity={0.7}
                onPress={resetDateRange}
              >
                <Text style={styles.dateModalResetText}>
                  {t('profile.unitSurvey.reset') || '초기화'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateModalFooterBtn, styles.dateModalConfirmBtn]}
                activeOpacity={0.7}
                onPress={confirmDateRange}
              >
                <Text style={styles.dateModalConfirmText}>
                  {t('profile.unitSurvey.confirm') || '확인'}
                </Text>
              </TouchableOpacity>
            </View>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  embeddedContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  embeddedHeader: {
    paddingTop: SPACING.sm,
  },
  embeddedHeaderTitle: {
    flex: 1,
    textAlign: 'left',
    marginLeft: 0,
  },
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
  requestButton: {
    paddingHorizontal: SPACING.smmd,
    height: 36,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  filterPanel: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 44,
  },
  datePlaceholder: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  dateValueText: {
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  dateModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  dateModalHeaderText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  dateModalWeekRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  dateModalWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
    paddingVertical: 6,
  },
  dateModalCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateModalCellText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  dateModalCellSelected: {
    backgroundColor: COLORS.red,
    borderRadius: 999,
  },
  dateModalCellTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  dateModalCellInRange: {
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
  },
  dateModalHint: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  dateModalFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  dateModalFooterBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateModalResetBtn: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  dateModalResetText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  dateModalConfirmBtn: {
    backgroundColor: COLORS.red,
  },
  dateModalConfirmText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  applicationCard: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  cardHeader: {
    paddingHorizontal: SPACING.smmd,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: SPACING.xs,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  cardHeaderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.red,
  },
  orderDateText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    textAlign: 'right',
  },
  applicationNo: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  orderDetailLinkBtn: {
    paddingVertical: 2,
    paddingLeft: SPACING.sm,
  },
  orderDetailLinkText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.smmd,
    gap: SPACING.sm,
  },
  imageWrap: {
    position: 'relative',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: COLORS.black,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  noBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  productName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  productMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  paymentCol: {
    alignItems: 'flex-end',
    minWidth: 88,
    gap: 4,
  },
  paymentLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  paymentValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  payButton: {
    marginTop: SPACING.xs,
    minWidth: 72,
    height: 34,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.red,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  payButtonSpacer: {
    height: 34,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyImage: {
    width: 160,
    height: 100,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
});

export default OEMSurveyScreen;

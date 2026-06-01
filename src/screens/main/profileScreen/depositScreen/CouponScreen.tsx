import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { voucherApi, Coupon, PointTransaction } from '../../../../services/voucherApi';
import { useToast } from '../../../../context/ToastContext';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { AppLocale } from '../../../../i18n/translate';
import { RootStackParamList } from '../../../../types';

type MainSection = 'coupon' | 'point';

const CouponScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Coupon'>>();
  const { showToast } = useToast();
  const { t, locale } = useTranslation();

  const [mainSection, setMainSection] = useState<MainSection>(
    route.params?.initialSection ?? 'coupon',
  );
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coupons, setCoupons] = useState<{
    available: Coupon[];
    used: Coupon[];
    expired: Coupon[];
  }>({
    available: [],
    used: [],
    expired: [],
  });
  const [pointBalance, setPointBalance] = useState(0);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);

  const formatDate = useCallback(
    (dateString: string) => {
      const date = new Date(dateString);
      const tag: Record<AppLocale, string> = {
        en: 'en-US',
        ko: 'ko-KR',
        zh: 'zh-CN',
      };
      return date.toLocaleDateString(tag[locale], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    },
    [locale],
  );

  const fetchVoucherWallet = useCallback(async () => {
    try {
      setLoading(true);
      const response = await voucherApi.getVoucherWallet();

      if (response.success && response.data) {
        setCoupons({
          available: response.data.availableCoupons,
          used: response.data.usedCoupons,
          expired: response.data.expiredCoupons,
        });
        setPointBalance(response.data.points.balance);
        setPointTransactions(response.data.points.recentTransactions);
      } else {
        showToast(t('couponPage.failedToLoadCoupons'), 'error');
      }
    } catch {
      showToast(t('couponPage.failedToLoadCoupons'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    fetchVoucherWallet();
  }, [fetchVoucherWallet]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      showToast(t('couponPage.enterCouponCodeRequired'), 'warning');
      return;
    }

    try {
      setApplying(true);
      const response = await voucherApi.applyCouponCode(couponCode.trim());

      if (response.success) {
        showToast(t('couponPage.couponReceived'), 'success');
        setCouponCode('');
        await fetchVoucherWallet();
      } else {
        const msg = response.message || '';
        if (msg.toLowerCase().includes('already received') || msg.includes('FIELD_ALREADY_EXISTS')) {
          showToast(t('couponPage.couponAlreadyReceived'), 'warning');
        } else {
          showToast(t('couponPage.couponFailed'), 'error');
        }
      }
    } catch {
      showToast(t('couponPage.couponFailed'), 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleUseCoupon = () => {
    showToast(t('couponPage.couponReadyToUse'), 'success');
  };

  const handleUsePoint = () => {
    showToast(t('couponPage.pointReadyToUse'), 'success');
  };

  const filteredCoupons = coupons[activeTab];

  const statusTabLabel = (tab: 'available' | 'used' | 'expired', count: number) => {
    const key =
      tab === 'available'
        ? 'couponPage.statusUnused'
        : tab === 'used'
          ? 'couponPage.statusUsed'
          : 'couponPage.statusExpired';
    return t(key, { count: String(count) });
  };

  const renderMainTabs = () => (
    <View style={styles.mainTabContainer}>
      <TouchableOpacity style={styles.mainTab} onPress={() => setMainSection('coupon')}>
        {mainSection === 'coupon' ? (
          <>
            <Text style={styles.mainTabTextActive}>{t('couponPage.tabCoupon')}</Text>
            <View style={styles.mainTabIndicator} />
          </>
        ) : (
          <Text style={styles.mainTabText}>{t('couponPage.tabCoupon')}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.mainTab} onPress={() => setMainSection('point')}>
        {mainSection === 'point' ? (
          <>
            <Text style={styles.mainTabTextActive}>{t('couponPage.tabPoint')}</Text>
            <View style={styles.mainTabIndicator} />
          </>
        ) : (
          <Text style={styles.mainTabText}>{t('couponPage.tabPoint')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStatusTabs = () => (
    <View style={styles.statusTabContainer}>
      <TouchableOpacity
        style={[styles.statusTab, activeTab === 'available' && styles.statusTabActive]}
        onPress={() => setActiveTab('available')}
      >
        <Text style={[styles.statusTabText, activeTab === 'available' && styles.statusTabTextActive]}>
          {statusTabLabel('available', mainSection === 'coupon' ? coupons.available.length : 0)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.statusTab, activeTab === 'used' && styles.statusTabActive]}
        onPress={() => setActiveTab('used')}
      >
        <Text style={[styles.statusTabText, activeTab === 'used' && styles.statusTabTextActive]}>
          {statusTabLabel('used', mainSection === 'coupon' ? coupons.used.length : 0)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.statusTab, activeTab === 'expired' && styles.statusTabActive]}
        onPress={() => setActiveTab('expired')}
      >
        <Text style={[styles.statusTabText, activeTab === 'expired' && styles.statusTabTextActive]}>
          {statusTabLabel('expired', mainSection === 'coupon' ? coupons.expired.length : 0)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCouponBody = () => (
    <>
      {renderStatusTabs()}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t('couponPage.enterCouponCode')}
          placeholderTextColor={COLORS.gray[400]}
          value={couponCode}
          onChangeText={setCouponCode}
          editable={!applying}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.applyButton, applying && styles.applyButtonDisabled]}
          onPress={handleApplyCoupon}
          disabled={applying}
        >
          {applying ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.applyButtonText}>{t('couponPage.receive')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      ) : filteredCoupons.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('couponPage.noCouponsAvailable')}</Text>
        </View>
      ) : (
        <View style={styles.couponList}>
          {filteredCoupons.map((coupon) => (
            <View key={coupon.id} style={styles.couponCard}>
              <Text style={styles.couponType}>{t('couponPage.platformWideCoupon')}</Text>
              <View style={styles.couponBodyWrap}>
                <View style={styles.couponBody}>
                  <View style={styles.couponLeft}>
                    <Text style={styles.discountAmount}>¥{coupon.amount}</Text>
                    <Text style={styles.minAmount}>
                      {t('couponPage.spendAtLeast', {
                        minAmount: coupon.minPurchaseAmount.toString(),
                      })}
                    </Text>
                    <Text style={styles.expiryText}>
                      {t('couponPage.expiresAt', { date: formatDate(coupon.validUntil) })}
                    </Text>
                    <Text style={styles.validityText}>{t('couponPage.validOnlyTodayGgigu')}</Text>
                  </View>
                  {coupon.status === 'received' && (
                    <TouchableOpacity style={styles.useButton} onPress={handleUseCoupon}>
                      <Text style={styles.useButtonText}>{t('couponPage.useNow')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  const renderPointBody = () => (
    <>
      {renderStatusTabs()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      ) : pointBalance > 0 ? (
        <View style={styles.pointVoucherCard}>
          <View style={styles.pointVoucherTop}>
            <Text style={styles.pointVoucherAmount}>¥{pointBalance}</Text>
            <Text style={styles.pointVoucherCondition}>
              {t('couponPage.validOnOrdersOver', { amount: pointBalance.toString() })}
            </Text>
            <Text style={styles.pointVoucherTitle}>{t('couponPage.curatedNewYearVouchers')}</Text>
          </View>
          <View style={styles.pointVoucherBottom}>
            <Text style={styles.pointVoucherValidity}>{t('couponPage.validForEligibleGoods')}</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.pointViewRulesLink}>
                {t('couponPage.viewRules', { arrow: '>' })}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.pointUseNowButton} onPress={handleUsePoint}>
            <Text style={styles.pointUseNowButtonText}>{t('couponPage.useNow')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('couponPage.noPointsAvailable')}</Text>
        </View>
      )}

      {pointTransactions.length > 0 && (
        <View style={styles.pointTransactionsSection}>
          <Text style={styles.pointSectionTitle}>{t('couponPage.recentTransactions')}</Text>
          {pointTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.pointTransactionCard}>
              <View style={styles.pointTransactionInfo}>
                <Text style={styles.pointTransactionDescription}>{transaction.description}</Text>
                <Text style={styles.pointTransactionDate}>{formatDate(transaction.date)}</Text>
              </View>
              <Text
                style={[
                  styles.pointTransactionAmount,
                  transaction.type === 'earn' ? styles.earnAmount : styles.spendAmount,
                ]}
              >
                {transaction.type === 'earn' ? '+' : '-'}
                {transaction.amount}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('couponPage.title')}</Text>
        </View>
      </View>

      {renderMainTabs()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {mainSection === 'coupon' ? renderCouponBody() : renderPointBody()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.md * 2,
    paddingBottom: SPACING.md * 2 - 15,
    backgroundColor: COLORS.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  headerTitle: {
    fontSize: FONTS.sizes.md * 1.2,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
    marginTop: 25,
  },
  mainTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[300],
  },
  mainTab: {
    paddingVertical: SPACING.sm,
    marginRight: SPACING.xl,
    position: 'relative',
  },
  mainTabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.text.secondary,
  },
  mainTabTextActive: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.red,
  },
  mainTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.red,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  statusTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statusTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0000000D',
    backgroundColor: COLORS.white,
  },
  statusTabActive: {
    borderColor: COLORS.red,
  },
  statusTabText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  statusTabTextActive: {
    color: COLORS.red,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  applyButton: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    justifyContent: 'center',
    minWidth: 80,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: SPACING.xxl * 2,
    alignItems: 'center',
  },
  couponList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  couponCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    overflow: 'hidden',
  },
  couponType: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: COLORS.red,
    backgroundColor: '#FFFBF8',
    width: '100%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderColor: '#0000000D',
    borderBottomWidth: 1,
  },
  couponBodyWrap: {
    backgroundColor: COLORS.lightRed,
    padding: SPACING.md,
  },
  couponBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.lightRed,
  },
  couponLeft: {
    flex: 1,
  },
  discountAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.red,
    marginBottom: SPACING.xs,
  },
  minAmount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  useButton: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0000001A',
  },
  useButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  expiryText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs / 2,
    marginTop: SPACING.sm,
  },
  validityText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 3,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  pointVoucherCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  pointVoucherTop: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  pointVoucherAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.red,
    marginBottom: SPACING.xs,
  },
  pointVoucherCondition: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  pointVoucherTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.red,
    textAlign: 'center',
  },
  pointVoucherBottom: {
    backgroundColor: COLORS.red,
    paddingTop: SPACING.sm,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  pointVoucherValidity: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  pointViewRulesLink: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    marginBottom: SPACING.lg,
    textDecorationLine: 'underline',
  },
  pointUseNowButton: {
    backgroundColor: COLORS.red,
    paddingVertical: SPACING.sm,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  pointUseNowButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  pointTransactionsSection: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  pointSectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  pointTransactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  pointTransactionInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  pointTransactionDescription: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs / 2,
  },
  pointTransactionDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  pointTransactionAmount: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  earnAmount: {
    color: '#22C55E',
  },
  spendAmount: {
    color: COLORS.red,
  },
});

export default CouponScreen;

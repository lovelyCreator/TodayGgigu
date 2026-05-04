import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../../../constants';
import { useAppSelector } from '../../../../store/hooks';
import { translations } from '../../../../i18n/translations';
import { voucherApi, Coupon } from '../../../../services/voucherApi';
import { useToast } from '../../../../context/ToastContext';

const CouponScreen = () => {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
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
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  useEffect(() => {
    fetchVoucherWallet();
  }, []);

  const fetchVoucherWallet = async () => {
    try {
      setLoading(true);
      const response = await voucherApi.getVoucherWallet();
      
      if (response.success && response.data) {
        setCoupons({
          available: response.data.availableCoupons,
          used: response.data.usedCoupons,
          expired: response.data.expiredCoupons,
        });
      } else {
        showToast(response.message || 'Failed to load coupons', 'error');
      }
    } catch (error) {
      showToast(t('home.failedToLoadCoupons'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      showToast(t('profile.enterCouponCode') || 'Please enter a coupon code', 'warning');
      return;
    }

    try {
      setApplying(true);
      const response = await voucherApi.applyCouponCode(couponCode.trim());

      if (response.success) {
        showToast(response.message || t('profile.couponReceived') || 'Coupon received successfully', 'success');
        setCouponCode('');
        await fetchVoucherWallet();
      } else {
        // Handle specific error codes
        const msg = response.message || '';
        if (msg.toLowerCase().includes('already received') || msg.includes('FIELD_ALREADY_EXISTS')) {
          showToast(t('profile.couponAlreadyReceived') || 'You have already received this coupon', 'warning');
        } else {
          showToast(msg || t('profile.couponFailed') || 'Failed to receive coupon', 'error');
        }
      }
    } catch (error) {
      showToast(t('profile.couponFailed') || 'Failed to receive coupon', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleUseCoupon = (coupon: Coupon) => {
    // Navigate to products or cart to use the coupon
    showToast(t('home.couponReadyToUse'), 'success');
  };

  const filteredCoupons = coupons[activeTab];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('home.voucherWallet')}</Text>
        </View>
        {/* <TouchableOpacity style={styles.menuButton}>
          <Icon name="ellipsis-horizontal" size={24} color={COLORS.text.primary} />
        </TouchableOpacity> */}
      </View>

      {/* Tab Navigation - Coupon/Point */}
      <View style={styles.mainTabContainer}>
        <TouchableOpacity style={styles.mainTab}>
          <Text style={styles.mainTabTextActive}>{t('home.coupon')}</Text>
          <View style={styles.mainTabIndicator} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.mainTab}
          onPress={() => (navigation as any).navigate('PointDetail')}
        >
          <Text style={styles.mainTabText}>{t('home.point')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Status Tabs */}
          <View style={styles.statusTabContainer}>
            <TouchableOpacity
              style={[styles.statusTab, activeTab === 'available' && styles.statusTabActive]}
              onPress={() => setActiveTab('available')}
            >
              <Text style={[styles.statusTabText, activeTab === 'available' && styles.statusTabTextActive]}>
                {t('home.unused')} ({coupons.available.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusTab, activeTab === 'used' && styles.statusTabActive]}
              onPress={() => setActiveTab('used')}
            >
              <Text style={[styles.statusTabText, activeTab === 'used' && styles.statusTabTextActive]}>
                {t('home.used')} ({coupons.used.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusTab, activeTab === 'expired' && styles.statusTabActive]}
              onPress={() => setActiveTab('expired')}
            >
              <Text style={[styles.statusTabText, activeTab === 'expired' && styles.statusTabTextActive]}>
                {t('home.expired')} ({coupons.expired.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Coupon Code Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('home.enterCouponCode')}
              placeholderTextColor="#999"
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
                <Text style={styles.applyButtonText}>{t('home.receive')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          ) : filteredCoupons.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="ticket-outline" size={80} color="#CCC" />
              <Text style={styles.emptyText}>{t('home.noCouponsAvailable')}</Text>
            </View>
          ) : (
            <View style={styles.couponList}>
              {filteredCoupons.map((coupon) => (
                <View key={coupon.id} style={styles.couponCard}>
                  <Text style={styles.couponType}>{t('home.platformWideCoupon')}</Text>
                  
                  <View style={{backgroundColor: '#FFF5F0', padding: SPACING.md}}>
                  <View style={styles.couponBody}>
                    <View style={styles.couponLeft}>
                      <Text style={styles.discountAmount}>¥{coupon.amount}</Text>
                      <Text style={styles.minAmount}>{t('home.spendAtLeast').replace('{minAmount}', coupon.minPurchaseAmount.toString())}</Text>
                      <Text style={styles.expiryText}>
                        {t('home.expiresAt').replace('{date}', formatDate(coupon.validUntil))}
                      </Text>
                      <Text style={styles.validityText}>{t('home.validOnlyTodaymall')}</Text>
                    </View>
                    
                    {coupon.status === 'received' && (
                      <TouchableOpacity 
                        style={styles.useButton}
                        onPress={() => handleUseCoupon(coupon)}
                      >
                        <Text style={styles.useButtonText}>{t('home.useNow')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  </View>
                </View>
              ))}
            </View>
          )}
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
    paddingVertical: SPACING.md * 2,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    color: '#FF5500',
  },
  mainTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FF5500',
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
    borderColor: '#FF5500',
  },
  statusTabText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  statusTabTextActive: {
    color: '#FF5500',
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
    borderColor: '#E0E0E0',
  },
  applyButton: {
    backgroundColor: '#FF5500',
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
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  couponType: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: '#FF5500',
    // marginBottom: SPACING.md,
    backgroundColor: '#FFFBF8',
    width: '100%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderColor: '#0000000D',
    borderBottomWidth: 1,
  },
  couponBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: '#FFF5F0',
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
    backgroundColor: '#FF5500',
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
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.secondary,
    marginTop: SPACING.lg,
    fontWeight: '500',
  },
});

export default CouponScreen;

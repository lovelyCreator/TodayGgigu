import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  ScrollView,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { useAppSelector } from '../store/hooks';
import { translations } from '../i18n/translations';

const { width, height } = Dimensions.get('window');

interface Coupon {
  id: string;
  name: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  minAmount?: number;
  expiryDate: string;
}

interface CouponModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedCoupon: Coupon | null) => void;
  selectedCouponId?: string | null;
}

const CouponModal: React.FC<CouponModalProps> = ({
  visible,
  onClose,
  onConfirm,
  selectedCouponId,
}) => {
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  const slideAnim = useRef(new Animated.Value(height)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);
  
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(selectedCouponId || null);
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const coupons: Coupon[] = [
    {
      id: 'welcome10',
      name: 'Welcome Discount',
      description: 'Get 10% off on your first order',
      discount: 10,
      discountType: 'percentage',
      minAmount: 50,
      expiryDate: '2024-12-31',
    },
    {
      id: 'save15',
      name: 'Save $15',
      description: 'Save $15 on orders over $100',
      discount: 15,
      discountType: 'fixed',
      minAmount: 100,
      expiryDate: '2024-11-30',
    },
    {
      id: 'free5',
      name: 'Free $5',
      description: 'Get $5 off on any order',
      discount: 5,
      discountType: 'fixed',
      expiryDate: '2024-12-15',
    },
    {
      id: 'vip20',
      name: 'VIP Member',
      description: '20% off for VIP members',
      discount: 20,
      discountType: 'percentage',
      minAmount: 200,
      expiryDate: '2024-12-31',
    },
  ];

  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      panY.setValue(0);
      slideAnim.setValue(height);
      setSelectedCoupon(selectedCouponId || null);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      setTimeout(() => {
        panY.setValue(0);
      }, 300);
    }
  }, [visible, selectedCouponId]);

  const dismissModal = () => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      panY.setValue(0);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          if (isDismissing.current) return;
          isDismissing.current = true;
          onClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  const handleCouponSelect = (couponId: string | null) => {
    setSelectedCoupon(couponId);
  };

  const handleConfirm = () => {
    const coupon = selectedCoupon ? coupons.find(c => c.id === selectedCoupon) : null;
    onConfirm(coupon || null);
    dismissModal();
  };

  const handleClose = () => {
    dismissModal();
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discount}% ${t('profile.off')}`;
    } else {
      return `$${coupon.discount} ${t('profile.off')}`;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [
                    { translateY: Animated.add(slideAnim, panY) }
                  ],
                },
              ]}
            >
              <View {...panResponder.panHandlers} style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
              
              <View style={styles.contentContainer}>
                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={styles.title}>{t('profile.selectCoupon')}</Text>
                    <Text style={styles.subtitle}>
                      {t('profile.chooseCouponDescription')}
                    </Text>
                  </View>

                  {/* No Coupon Option */}
                  <View style={styles.couponsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.couponOption,
                        selectedCoupon === null && styles.selectedCouponOption
                      ]}
                      onPress={() => handleCouponSelect(null)}
                    >
                      <View style={styles.couponContent}>
                        <View style={styles.couponLeft}>
                          <View style={[styles.couponIcon, { backgroundColor: COLORS.gray[400] }]}>
                            <Icon name="close" size={20} color={COLORS.white} />
                          </View>
                          <View style={styles.couponInfo}>
                            <Text style={styles.couponName}>{t('profile.noCoupon')}</Text>
                            <Text style={styles.couponDescription}>{t('profile.dontUseCoupon')}</Text>
                          </View>
                        </View>
                        <View style={styles.couponRight}>
                          <View style={[
                            styles.radioButton,
                            selectedCoupon === null && styles.radioButtonSelected
                          ]}>
                            {selectedCoupon === null && (
                              <View style={styles.radioButtonInner} />
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Available Coupons */}
                    {coupons.map((coupon) => (
                      <TouchableOpacity
                        key={coupon.id}
                        style={[
                          styles.couponOption,
                          selectedCoupon === coupon.id && styles.selectedCouponOption
                        ]}
                        onPress={() => handleCouponSelect(coupon.id)}
                      >
                        <View style={styles.couponContent}>
                          <View style={styles.couponLeft}>
                            <View style={[styles.couponIcon, { backgroundColor: COLORS.red }]}>
                              <Icon name="ticket" size={20} color={COLORS.white} />
                            </View>
                            <View style={styles.couponInfo}>
                              <Text style={styles.couponName}>{coupon.name}</Text>
                              <Text style={styles.couponDescription}>{coupon.description}</Text>
                              {coupon.minAmount && (
                                <Text style={styles.couponCondition}>
                                  {t('profile.minOrder')}: ${coupon.minAmount}
                                </Text>
                              )}
                              <Text style={styles.couponExpiry}>
                                {t('profile.expires')}: {coupon.expiryDate}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.couponRight}>
                            <View style={styles.discountBadge}>
                              <Text style={styles.discountText}>{formatDiscount(coupon)}</Text>
                            </View>
                            <View style={[
                              styles.radioButton,
                              selectedCoupon === coupon.id && styles.radioButtonSelected
                            ]}>
                              {selectedCoupon === coupon.id && (
                                <View style={styles.radioButtonInner} />
                              )}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>{t('profile.cancel')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>{t('profile.applyCoupon')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.8,
    ...SHADOWS.lg,
  },
  handleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray[300],
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  couponsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  couponOption: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  selectedCouponOption: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  couponContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  couponIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  couponInfo: {
    flex: 1,
  },
  couponName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  couponDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  couponCondition: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  couponExpiry: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
  },
  couponRight: {
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  discountText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.black,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});

export default CouponModal;
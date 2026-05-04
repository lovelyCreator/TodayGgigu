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

interface OrderServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedServices: string[]) => void;
}

const OrderServiceModal: React.FC<OrderServiceModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);
  
  const [selectedServices, setSelectedServices] = useState<string[]>(['commission']);
  const [isExpanded, setIsExpanded] = useState(false);

  // i18n
  const locale = useAppSelector((s) => s.i18n.locale);
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      panY.setValue(0);
      slideAnim.setValue(height);
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
  }, [visible]);

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

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  const handleConfirm = () => {
    onConfirm(selectedServices);
    dismissModal();
  };

  const handleClose = () => {
    dismissModal();
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
                    <Text style={styles.title}>{t('OrderService')}</Text>
                  </View>

                  {/* Service Option */}
                  <View style={styles.servicesContainer}>
                    <TouchableOpacity
                      style={styles.serviceOption}
                      onPress={toggleExpanded}
                    >
                      <View style={styles.serviceLeft}>
                        <View style={styles.serviceInfo}>
                          <View style={styles.serviceNameContainer}>
                            <View style={styles.commissionBadge}>
                              <Text style={styles.commissionBadgeText}>{t('Commission')}</Text>
                            </View>
                            <Text style={styles.serviceName}>{t('Commission Fee')}</Text>
                            <Icon 
                              name={isExpanded ? "chevron-up" : "chevron-down"} 
                              size={16} 
                              color={COLORS.gray[400]} 
                              style={styles.chevronIcon}
                            />
                          </View>
                        </View>
                      </View>
                      <Text style={styles.servicePrice}>1,070원</Text>
                    </TouchableOpacity>
                    
                    {/* Service Description - Collapsible */}
                    {isExpanded && (
                      <View style={styles.serviceDescription}>
                        <Text style={styles.descriptionText}>
                          {t('orderService.description')}
                        </Text>
                        <Text style={styles.servicePriceText}>
                          {t('orderService.servicePriceLabel')}: 1,070원
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Action Button */}
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>{t('Confirm')}</Text>
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
    height: height * 0.7,
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
  },
  servicesContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  commissionBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  serviceName: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  servicePrice: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  serviceDescription: {
    paddingLeft: 40,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    paddingRight: SPACING.md,
  },
  descriptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  servicePriceText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  actionContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  confirmButton: {
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

export default OrderServiceModal;
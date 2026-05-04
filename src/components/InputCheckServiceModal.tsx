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
import CheckIcon from '../assets/icons/CheckIcon';
import { formatKRWDirect } from '../utils/i18nHelpers';

const { width, height } = Dimensions.get('window');

interface ServiceDetail {
  id: string;
  name: string;
  price: number; // Price in KRW
  priceKRW?: number;
}

interface InputCheckServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedServices: ServiceDetail[]) => void;
}

const InputCheckServiceModal: React.FC<InputCheckServiceModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);
  
  const [selectedServices, setSelectedServices] = useState<string[]>(['realtime']);
  const [expandedServices, setExpandedServices] = useState<string[]>([]);

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

  const services = [
    { 
      id: 'designated', 
      name: t('Designated Photo'), 
      price: 2000, // Price in KRW
      priceKRW: 2000,
      description: 'Service Description: Up to 6 photos \nService Price: 2,000 won'
    },
    { 
      id: 'realtime', 
      name: t('RealtimePhoto'), 
      price: 0, // Free
      priceKRW: 0,
      description: 'Service Description: One photo per package. \nService Price: 0 won'
    },
  ];

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

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const toggleExpanded = (serviceId: string) => {
    setExpandedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleConfirm = () => {
    const selectedServiceDetails = services.filter(service => selectedServices.includes(service.id));
    onConfirm(selectedServiceDetails);
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
                    <Text style={styles.title}>{t('Input Check Service')}</Text>
                  </View>

                  {/* Service Options */}
                  <View style={styles.servicesContainer}>
                    {services.map((service) => (
                      <View key={service.id} style={styles.serviceContainer}>
                        <View style={styles.serviceOption}>
                          <View style={styles.serviceLeft}>
                            <TouchableOpacity
                              style={[
                                styles.radioButton,
                                selectedServices.includes(service.id) && styles.radioButtonSelected
                              ]}
                              onPress={() => toggleService(service.id)}
                            >
                              {selectedServices.includes(service.id) && (
                                <CheckIcon size={16} color={COLORS.white} isSelected={true} circleColor={COLORS.red} />
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.serviceInfo}
                              onPress={() => toggleExpanded(service.id)}
                            >
                              <View style={styles.serviceNameContainer}>
                                {service.price === 0 && (
                                  <View style={styles.freeBadge}>
                                    <Text style={styles.freeBadgeText}>{t('Free')}</Text>
                                  </View>
                                )}
                                <Text style={styles.serviceName}>{service.name}</Text>
                                <Icon 
                                  name={expandedServices.includes(service.id) ? "chevron-up" : "chevron-down"} 
                                  size={16} 
                                  color={COLORS.gray[400]} 
                                  style={styles.chevronIcon}
                                />
                              </View>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.servicePrice}>{formatKRWDirect(service.price)}</Text>
                        </View>
                        
                        {/* Expandable Description */}
                        {expandedServices.includes(service.id) && (
                          <View style={styles.serviceDescription}>
                            <Text style={styles.descriptionText}>{service.description}</Text>
                          </View>
                        )}
                      </View>
                    ))}
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
  serviceContainer: {
    marginBottom: SPACING.sm,
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
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  serviceInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  serviceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  freeBadgeText: {
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
    paddingRight: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
  },
  descriptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: 20,
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

export default InputCheckServiceModal;
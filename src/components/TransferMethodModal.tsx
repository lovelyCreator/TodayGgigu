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

const { width, height } = Dimensions.get('window');

interface TransferMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedMethod: string) => void;
}

const TransferMethodModal: React.FC<TransferMethodModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);
  
  const [selectedMethod, setSelectedMethod] = useState<string>('ship');

  const transferMethods = [
    {
      id: 'airplane',
      name: 'Air Shipping',
      description: 'Fast delivery via airplane',
      price: '$25.00',
      duration: '3-5 days',
      icon: 'airplane',
      color: '#3B82F6',
    },
    {
      id: 'ship',
      name: 'Sea Shipping',
      description: 'Economical delivery via ship',
      price: '$8.00',
      duration: '15-30 days',
      icon: 'boat',
      color: '#06B6D4',
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

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handleConfirm = () => {
    onConfirm(selectedMethod);
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
                    <Text style={styles.title}>Choose Transfer Method</Text>
                    <Text style={styles.subtitle}>
                      Select your preferred shipping method
                    </Text>
                  </View>

                  {/* Transfer Methods */}
                  <View style={styles.methodsContainer}>
                    {transferMethods.map((method) => (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.methodOption,
                          selectedMethod === method.id && styles.selectedMethodOption
                        ]}
                        onPress={() => handleMethodSelect(method.id)}
                      >
                        <View style={styles.methodContent}>
                          <View style={styles.methodLeft}>
                            <View style={[styles.iconContainer, { backgroundColor: method.color }]}>
                              <Icon 
                                name={method.icon as any} 
                                size={24} 
                                color={COLORS.white} 
                              />
                            </View>
                            <View style={styles.methodInfo}>
                              <Text style={styles.methodName}>{method.name}</Text>
                              <Text style={styles.methodDescription}>{method.description}</Text>
                              <Text style={styles.methodDuration}>{method.duration}</Text>
                            </View>
                          </View>
                          <View style={styles.methodRight}>
                            <Text style={styles.methodPrice}>{method.price}</Text>
                            <View style={[
                              styles.radioButton,
                              selectedMethod === method.id && styles.radioButtonSelected
                            ]}>
                              {selectedMethod === method.id && (
                                <View style={styles.radioButtonInner} />
                              )}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Additional Info */}
                  <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                      <Icon name="information-circle-outline" size={16} color={COLORS.gray[400]} />
                      <Text style={styles.infoText}>
                        Shipping times may vary based on destination and customs processing
                      </Text>
                    </View>
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
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
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
    height: height * 0.75,
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
  methodsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  methodOption: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  selectedMethodOption: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  methodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  methodDuration: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  methodRight: {
    alignItems: 'flex-end',
  },
  methodPrice: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
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
  infoContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    lineHeight: 16,
    marginLeft: SPACING.xs,
    flex: 1,
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

export default TransferMethodModal;
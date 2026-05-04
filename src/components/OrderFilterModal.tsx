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
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import DatePickerModal from './DatePickerModal';

const { width, height } = Dimensions.get('window');

export type OrderType = 'General' | 'VVIC' | 'Rocket' | '';

interface OrderFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: { 
    orderType: OrderType;
    orderNumber: string; 
    startDate: Date | null; 
    endDate: Date | null;
  }) => void;
}

const OrderFilterModal: React.FC<OrderFilterModalProps> = ({
  visible,
  onClose,
  onApply,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);

  const [orderType, setOrderType] = useState<OrderType>('');
  const [orderNumber, setOrderNumber] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showOrderTypeMenu, setShowOrderTypeMenu] = useState(false);

  const orderTypeOptions: { label: string; value: OrderType }[] = [
    { label: 'Please select', value: '' },
    { label: 'General', value: 'General' },
    { label: 'VVIC', value: 'VVIC' },
    { label: 'Rocket', value: 'Rocket' },
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

  const handleApply = () => {
    dismissModal();
    setTimeout(() => onApply({ orderType, orderNumber, startDate, endDate }), 300);
  };

  const handleClear = () => {
    setOrderType('');
    setOrderNumber('');
    setStartDate(null);
    setEndDate(null);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={dismissModal}>
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
                
                <View style={styles.header}>
                  <Text style={styles.title}>Filter Orders</Text>
                  <Text style={styles.subtitle}>Filter by order number or date range</Text>
                </View>

                <View style={styles.content}>
                  {/* Order Number Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.label}>Order Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter order number"
                      placeholderTextColor="#999"
                      value={orderNumber}
                      onChangeText={setOrderNumber}
                    />
                  </View>

                  {/* Date Range Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.label}>Date Range</Text>
                    <View style={styles.dateRow}>
                      <TouchableOpacity 
                        style={styles.dateInput}
                        onPress={() => setShowStartPicker(true)}
                      >
                        <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
                          {startDate ? formatDate(startDate) : 'Start date'}
                        </Text>
                        <Icon name="calendar-outline" size={20} color="#4A90E2" />
                      </TouchableOpacity>
                      
                      <Text style={styles.dateSeparator}>-</Text>
                      
                      <TouchableOpacity 
                        style={styles.dateInput}
                        onPress={() => setShowEndPicker(true)}
                      >
                        <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                          {endDate ? formatDate(endDate) : 'End date'}
                        </Text>
                        <Icon name="calendar-outline" size={20} color="#4A90E2" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClear}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={handleApply}
                    activeOpacity={0.7}
                  >
                    <Icon name="checkmark-circle" size={24} color={COLORS.white} />
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Picker Modals */}
      <DatePickerModal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        onConfirm={(date) => setStartDate(date)}
        initialDate={startDate || undefined}
        title="Select Start Date"
      />

      <DatePickerModal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(date) => setEndDate(date)}
        initialDate={endDate || undefined}
        title="Select End Date"
      />
    </>
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
    paddingBottom: 40,
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
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    marginTop: SPACING.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  filterSection: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  dateText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  placeholderText: {
    color: '#999',
  },
  dateSeparator: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  applyButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  applyButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  clearButton: {
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});

export default OrderFilterModal;

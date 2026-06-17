import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../../components/Icon';
import { ScreenSkeleton } from '../../../../components/Skeleton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'react-native-linear-gradient';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { RootStackParamList, Order } from '../../../../types';
import { formatPriceKRW } from '../../../../utils/i18nHelpers';

const { width } = Dimensions.get('window');

type OrderConfirmationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderConfirmation'>;
type OrderConfirmationScreenRouteProp = RouteProp<RootStackParamList, 'OrderConfirmation'>;

const OrderConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<OrderConfirmationScreenNavigationProp>();
  const route = useRoute<OrderConfirmationScreenRouteProp>();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [route.params.orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      // API call removed
      const response = { success: false, data: null };
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error) {
      // console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueShopping = () => {
    navigation.navigate('Main');
  };

  const handleTrackOrder = () => {
    // In a real app, this would navigate to order tracking
    // console.log('Track order:', order?.id);
  };

  const handleViewOrder = () => {
    navigation.navigate('OrderHistory');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'confirmed':
        return COLORS.info;
      case 'processing':
        return COLORS.primary;
      case 'shipped':
        return COLORS.secondary;
      case 'delivered':
        return COLORS.success;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'processing':
        return 'refresh-outline';
      case 'shipped':
        return 'car-outline';
      case 'delivered':
        return 'checkmark-done-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.successIcon}>
        <Icon name="checkmark-circle" size={80} color={COLORS.success} />
      </View>
      <Text style={styles.title}>Order Confirmed!</Text>
      <Text style={styles.subtitle}>
        Thank you for your purchase. We've received your order and will process it shortly.
      </Text>
    </View>
  );

  const renderOrderDetails = () => {
    if (!order) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        
        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Number</Text>
            <Text style={styles.infoValue}>#{order.id}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>
              {new Date(order.createdAt).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusContainer}>
              <Icon
                name={getStatusIcon(order.status) as any}
                size={16}
                color={getStatusColor(order.status)}
              />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(order.status) }
              ]}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>
          
          {order.trackingNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tracking Number</Text>
              <Text style={styles.infoValue}>{order.trackingNumber}</Text>
            </View>
          )}
          
          {order.estimatedDelivery && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estimated Delivery</Text>
              <Text style={styles.infoValue}>
                {new Date(order.estimatedDelivery).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderOrderItems = () => {
    if (!order) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <Image
              source={{ uri: item.product.image }}
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product.name}
              </Text>
              <Text style={styles.itemDetails}>
                Qty: {item.quantity}
                {item.selectedSize && ` • Size: ${item.selectedSize}`}
                {item.selectedColor && ` • Color: ${item.selectedColor.name}`}
              </Text>
              <Text style={styles.itemPrice}>
                {formatPriceKRW(item.price * item.quantity)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderOrderSummary = () => {
    if (!order) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPriceKRW(order.subtotal)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>
              {order.shipping === 0 ? 'Free' : formatPriceKRW(order.shipping)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{formatPriceKRW(order.tax)}</Text>
          </View>
          
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Discount</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                -{formatPriceKRW(order.discount)}
              </Text>
            </View>
          )}
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPriceKRW(order.total)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDeliveryInfo = () => {
    if (!order) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Information</Text>
        
        <View style={styles.deliveryInfo}>
          <View style={styles.deliveryRow}>
            <Icon name="location-outline" size={20} color={COLORS.primary} />
            <View style={styles.deliveryDetails}>
              <Text style={styles.deliveryName}>{order.shippingAddress.name}</Text>
              <Text style={styles.deliveryAddress}>
                {order.shippingAddress.street}, {order.shippingAddress.city}
              </Text>
              <Text style={styles.deliveryCity}>
                {order.shippingAddress.state} {order.shippingAddress.zipCode}, {order.shippingAddress.country}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleViewOrder}
      >
        <Text style={styles.secondaryButtonText}>View Order</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleTrackOrder}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.primaryButtonGradient}
        >
          <Text style={styles.primaryButtonText}>Track Order</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderContinueButton = () => (
    <View style={styles.continueContainer}>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinueShopping}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.continueButtonGradient}
        >
          <Text style={styles.continueButtonText}>Continue Shopping</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <ScreenSkeleton variant="list" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderOrderDetails()}
        {renderOrderItems()}
        {renderOrderSummary()}
        {renderDeliveryInfo()}
        {renderActionButtons()}
      </ScrollView>
      {renderContinueButton()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: SPACING.xl * 2,
    backgroundColor: COLORS.white,
  },
  successIcon: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: Math.round(FONTS.sizes.base * 24 / 16),
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.sm,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  orderInfo: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    marginLeft: 4,
  },
  orderItem: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.sm,
    marginRight: SPACING.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  summaryContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  summaryValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  totalValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  deliveryInfo: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deliveryDetails: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  deliveryName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  deliveryAddress: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  deliveryCity: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  secondaryButtonText: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  primaryButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
    color: COLORS.white,
  },
  continueContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  continueButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default OrderConfirmationScreen;

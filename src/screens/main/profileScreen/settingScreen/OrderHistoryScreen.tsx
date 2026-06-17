import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../../components/Icon';
import { ScreenSkeleton } from '../../../../components/Skeleton';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { RootStackParamList, CustomerOrderDetails } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';

type OrderHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderHistory'>;

const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation<OrderHistoryScreenNavigationProp>();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState<CustomerOrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'sent', 'cancelled', 'confirmed'

  // Customer orders API removed - stub functions
  const data: { orders: CustomerOrderDetails[] } | null = null;
  const error: any = null;
  const isLoading = false;
  const isSuccess = false;
  const isError = false;
  const getCustomerOrders = async (_limit?: number, _offset?: number, _status?: string) => {
    // Customer orders API removed
  };

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await getCustomerOrders(13, 1, activeTab);
    } catch (error) {
      // console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle data updates from the mutation
  useEffect(() => {
    if (isSuccess && data) {
      // console.log('Received customer orders data:', data);
      const ordersData = data as { orders: CustomerOrderDetails[] };
      setOrders(ordersData.orders);
    }
    
    if (isError && error) {
      // console.error('Error fetching customer orders:', error);
    }
  }, [isSuccess, data, isError, error]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleOrderPress = (order: CustomerOrderDetails) => {
    // In a real app, this would navigate to order details
    // console.log('Order details:', order.id);
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
      case 'sent':
        return COLORS.success;
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
      case 'sent':
        return 'checkmark-done-outline';
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
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Order History</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        onPress={() => setActiveTab('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
        onPress={() => setActiveTab('sent')}
      >
        <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>Sent</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'cancelled' && styles.activeTab]}
        onPress={() => setActiveTab('cancelled')}
      >
        <Text style={[styles.tabText, activeTab === 'cancelled' && styles.activeTabText]}>Cancelled</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'confirmed' && styles.activeTab]}
        onPress={() => setActiveTab('confirmed')}
      >
        <Text style={[styles.tabText, activeTab === 'confirmed' && styles.activeTabText]}>Confirmed</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOrderItem = ({ item }: { item: CustomerOrderDetails }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleOrderPress(item)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>Order #{item.id}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Icon
            name={getStatusIcon(item.order_status) as any}
            size={16}
            color={getStatusColor(item.order_status)}
          />
          <Text style={[
            styles.statusText,
            { color: getStatusColor(item.order_status) }
          ]}>
            {item.order_status.charAt(0).toUpperCase() + item.order_status.slice(1)}
          </Text>
        </View>
      </View>

      {/* For now, we'll show a simple representation of order items */}
      <View style={styles.orderItems}>
        <Text style={styles.itemName}>Order Amount: ${item.order_amount}</Text>
        <Text style={styles.itemQuantity}>Payment Status: {item.payment_status}</Text>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total: ${item.order_amount}</Text>
        <View style={styles.orderActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>Reorder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="receipt-outline" size={80} color={COLORS.text.secondary} />
      <Text style={styles.emptyTitle}>No orders yet</Text>
      <Text style={styles.emptySubtitle}>
        Your order history will appear here once you start shopping
      </Text>
      <TouchableOpacity
        style={styles.shopNowButton}
        onPress={() => navigation.navigate('Main' as never)}
      >
        <Text style={styles.shopNowButtonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <ScreenSkeleton variant="list" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      
      {orders.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.ordersList}
          contentContainerStyle={styles.ordersListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm * 2,
    paddingTop: SPACING['2xl'] * 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  ordersList: {
    flex: 1,
  },
  ordersListContent: {
    padding: SPACING.md,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
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
  orderItems: {
    marginBottom: SPACING.md,
  },
  itemName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  itemPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  moreItems: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  totalLabel: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  orderActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  actionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
    marginBottom: SPACING.xl,
  },
  shopNowButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  shopNowButtonText: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default OrderHistoryScreen;
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../../../../constants';

type DeliveryStatus = 'awaiting_pickup' | 'out_for_delivery' | 'in_transit' | 'awaiting_shipment' | 'delivered';

interface Delivery {
  id: string;
  status: DeliveryStatus;
  date: string;
  courierCompany: string;
  trackingNumber: string;
  productImage: string;
  productTitle: string;
}

const MyDeliveriesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState<DeliveryStatus>('delivered');

  // Sample delivery data
  const deliveries: Delivery[] = [
    {
      id: '1',
      status: 'delivered',
      date: '02-02',
      courierCompany: 'Delivery confirmation',
      trackingNumber: '9928383938383847',
      productImage: 'https://via.placeholder.com/100',
      productTitle: '商品名称展示',
    },
  ];

  const getStatusCount = (status: DeliveryStatus) => {
    return deliveries.filter(d => d.status === status).length;
  };

  const filteredDeliveries = deliveries.filter(d => d.status === selectedTab);

  const renderTabButton = (status: DeliveryStatus, label: string) => {
    const count = getStatusCount(status);
    const isActive = selectedTab === status;
    
    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive
        ]}
        onPress={() => setSelectedTab(status)}
      >
        <Text style={[
          styles.tabButtonText,
          isActive && styles.tabButtonTextActive
        ]}>
          {label}({count})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDeliveryItem = ({ item }: { item: Delivery }) => (
    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => (navigation as any).navigate('DeliveryDetail', { deliveryId: item.id })}
    >
      <Image source={{ uri: item.productImage }} style={styles.productImage} />
      <View style={styles.deliveryInfo}>
        <View style={styles.deliveryHeader}>
          <Text style={styles.statusText}>Delivered</Text>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <Text style={styles.courierText}>Courier company: {item.courierCompany}</Text>
        <Text style={styles.productTitle}>{item.productTitle}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color={COLORS.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Deliveries ({deliveries.length})</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="ellipsis-horizontal" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        {renderTabButton('awaiting_pickup', 'Awaiting Pickup')}
        {renderTabButton('out_for_delivery', 'Out for Delivery')}
      </View>
      <View style={styles.tabsContainer}>
        {renderTabButton('in_transit', 'In Transit')}
        {renderTabButton('awaiting_shipment', 'Awaiting Shipment')}
        {renderTabButton('delivered', 'Delivered')}
      </View>

      {/* Deliveries List */}
      <FlatList
        data={filteredDeliveries}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No deliveries found</Text>
          </View>
        }
      />
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md * 2,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  tabButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  tabButtonActive: {
    backgroundColor: '#FF6B35',
  },
  tabButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.text.secondary,
  },
  tabButtonTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  listContent: {
    padding: SPACING.md,
  },
  deliveryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.gray[200],
    marginRight: SPACING.md,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statusText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },
  dateText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  courierText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs / 2,
  },
  productTitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
});

export default MyDeliveriesScreen;

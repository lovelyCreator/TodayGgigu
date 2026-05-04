import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../../constants';
import { RootStackParamList } from '../../../../types';
import ProductCard from '../../../../components/ProductCard';

type ProblemProductScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProblemProduct'
>;

interface ProblemProduct {
  id: string;
  productName: string;
  productImage: string;
  orderNumber: string;
  issueType: string;
  status: 'pending' | 'processing' | 'resolved';
  date: string;
  price: string;
}

const ProblemProductScreen: React.FC = () => {
  const navigation = useNavigation<ProblemProductScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<
    'category' | 'order' | 'exchange' | 'payment' | 'return' | 'partial' | 'refund'
  >('category');

  // Sample problem products data
  const problemProducts: ProblemProduct[] = [
    {
      id: '1',
      productName: 'Wireless Bluetooth Headphones',
      productImage: 'https://picsum.photos/200/200?random=1',
      orderNumber: 'ORD-2024-001',
      issueType: 'Defective Item',
      status: 'processing',
      date: '2024-01-15',
      price: '$89.99',
    },
    {
      id: '2',
      productName: 'Smart Watch Series 5',
      productImage: 'https://picsum.photos/200/200?random=2',
      orderNumber: 'ORD-2024-002',
      issueType: 'Wrong Item Received',
      status: 'pending',
      date: '2024-01-14',
      price: '$299.99',
    },
    {
      id: '3',
      productName: 'USB-C Charging Cable',
      productImage: 'https://picsum.photos/200/200?random=3',
      orderNumber: 'ORD-2024-003',
      issueType: 'Item Not Received',
      status: 'resolved',
      date: '2024-01-10',
      price: '$15.99',
    },
  ];

  // Sample recommended products
  const recommendedProducts = [
    {
      id: '1',
      name: 'Premium Wireless Earbuds',
      price: 79.99,
      originalPrice: 129.99,
      discount: 39,
      rating: 4.8,
      ratingCount: 234,
      image: 'https://picsum.photos/seed/earbuds/400/500',
      images: ['https://picsum.photos/seed/earbuds/400/500'],
      company: '1688',
      category: '1688_electronics',
      subcategory: '1688_electronics_audio',
      orderCount: 456,
    },
    {
      id: '2',
      name: 'Smart Fitness Tracker',
      price: 49.99,
      originalPrice: 89.99,
      discount: 44,
      rating: 4.6,
      ratingCount: 189,
      image: 'https://picsum.photos/seed/tracker/400/500',
      images: ['https://picsum.photos/seed/tracker/400/500'],
      company: '1688',
      category: '1688_electronics',
      subcategory: '1688_electronics_wearables',
      orderCount: 345,
    },
    {
      id: '3',
      name: 'Portable Power Bank 20000mAh',
      price: 34.99,
      originalPrice: 59.99,
      discount: 42,
      rating: 4.7,
      ratingCount: 456,
      image: 'https://picsum.photos/seed/powerbank/400/500',
      images: ['https://picsum.photos/seed/powerbank/400/500'],
      company: '1688',
      category: '1688_electronics',
      subcategory: '1688_electronics_accessories',
      orderCount: 789,
    },
    {
      id: '4',
      name: 'Wireless Charging Pad',
      price: 24.99,
      originalPrice: 39.99,
      discount: 38,
      rating: 4.5,
      ratingCount: 321,
      image: 'https://picsum.photos/seed/charger/400/500',
      images: ['https://picsum.photos/seed/charger/400/500'],
      company: '1688',
      category: '1688_electronics',
      subcategory: '1688_electronics_accessories',
      orderCount: 234,
    },
    {
      id: '5',
      name: 'Bluetooth Speaker',
      price: 59.99,
      originalPrice: 89.99,
      discount: 33,
      rating: 4.9,
      ratingCount: 567,
      image: 'https://picsum.photos/seed/speaker/400/500',
      images: ['https://picsum.photos/seed/speaker/400/500'],
      company: '1688',
      category: '1688_electronics',
      subcategory: '1688_electronics_audio',
      orderCount: 1234,
    },
    {
      id: '6',
      name: 'Phone Stand Holder',
      price: 12.99,
      originalPrice: 19.99,
      discount: 35,
      rating: 4.4,
      ratingCount: 234,
      image: 'https://picsum.photos/seed/phonestand/400/500',
      images: ['https://picsum.photos/seed/phonestand/400/500'],
      company: '1688',
      category: '1688_accessories',
      subcategory: '1688_accessories_phone',
      orderCount: 567,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'processing':
        return '#4A90E2';
      case 'resolved':
        return '#4CAF50';
      default:
        return COLORS.gray[400];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Problem Product</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'category' && styles.activeTab]}
          onPress={() => setActiveTab('category')}
        >
          <Text style={[styles.tabText, activeTab === 'category' && styles.activeTabText]}>
            Category Classification
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'order' && styles.activeTab]}
          onPress={() => setActiveTab('order')}
        >
          <Text style={[styles.tabText, activeTab === 'order' && styles.activeTabText]}>
            Order Cancellation
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'exchange' && styles.activeTab]}
          onPress={() => setActiveTab('exchange')}
        >
          <Text style={[styles.tabText, activeTab === 'exchange' && styles.activeTabText]}>
            Order Exchange
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
          onPress={() => setActiveTab('payment')}
        >
          <Text style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>
            Additional Payment
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'return' && styles.activeTab]}
          onPress={() => setActiveTab('return')}
        >
          <Text style={[styles.tabText, activeTab === 'return' && styles.activeTabText]}>
            Return & Refund
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'partial' && styles.activeTab]}
          onPress={() => setActiveTab('partial')}
        >
          <Text style={[styles.tabText, activeTab === 'partial' && styles.activeTabText]}>
            Partial Refund
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'refund' && styles.activeTab]}
          onPress={() => setActiveTab('refund')}
        >
          <Text style={[styles.tabText, activeTab === 'refund' && styles.activeTabText]}>
            Refund Request
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
        <Text style={styles.actionButtonText}>Processing</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionButton, styles.actionButtonOutline]} activeOpacity={0.7}>
        <Text style={styles.actionButtonOutlineText}>Completed</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProblemProductItem = (item: ProblemProduct) => (
    <TouchableOpacity key={item.id} style={styles.problemCard} activeOpacity={0.7}>
      <View style={styles.problemCardHeader}>
        <View style={styles.problemCardLeft}>
          <Image source={{ uri: item.productImage }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.productName}
            </Text>
            <Text style={styles.orderNumber}>Order: {item.orderNumber}</Text>
            <Text style={styles.issueType}>{item.issueType}</Text>
          </View>
        </View>
        <View style={styles.problemCardRight}>
          <View
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          <Text style={styles.price}>{item.price}</Text>
        </View>
      </View>
      <View style={styles.problemCardFooter}>
        <Text style={styles.date}>{item.date}</Text>
        <TouchableOpacity style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Icon name="chevron-forward" size={16} color={COLORS.red} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Icon name="basket-outline" size={80} color={COLORS.gray[300]} />
      </View>
      <Text style={styles.emptyTitle}>Your cart is empty.</Text>
      <Text style={styles.emptySubtitle}>Add products you want</Text>
    </View>
  );

  const renderMoreToLove = () => (
    <View style={styles.moreToLoveSection}>
      <Text style={styles.sectionTitle}>More to love</Text>
      
      <FlatList
        data={recommendedProducts}
        renderItem={({ item }) => (
          <ProductCard
            product={item as any}
            variant="grid"
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productGrid}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderTabs()}
        {renderActionButtons()}

        <View style={styles.contentContainer}>
          {problemProducts.length > 0 ? (
            <>
              {problemProducts.map((item) => renderProblemProductItem(item))}
            </>
          ) : (
            renderEmptyState()
          )}
        </View>

        {renderMoreToLove()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm * 2,
    paddingTop: SPACING['2xl'] * 2,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  tabsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  tab: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[50],
  },
  activeTab: {
    backgroundColor: COLORS.red,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  actionButtonOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  actionButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionButtonOutlineText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  problemCard: {
    backgroundColor: COLORS.white,
    borderRadius: SPACING.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  problemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  problemCardLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
    marginRight: SPACING.md,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  orderNumber: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginBottom: SPACING.xs,
  },
  issueType: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    fontWeight: '500',
  },
  problemCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  price: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  problemCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  date: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    fontWeight: '600',
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING['3xl'],
  },
  emptyIconContainer: {
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  moreToLoveSection: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  productGrid: {
    paddingBottom: SPACING.lg,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
});

export default ProblemProductScreen;

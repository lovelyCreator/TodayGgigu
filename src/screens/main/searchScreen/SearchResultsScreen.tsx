import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants';
import { RootStackParamList, Product, SearchFilters } from '../../../types';

type SearchResultsScreenRouteProp = RouteProp<RootStackParamList, 'Search'>;
type SearchResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Search'>;

const categories = ['Woman', 'Man', 'Sports', 'Kids', 'Luxury', 'Beauty'];

const SearchResultsScreen: React.FC = () => {
  const route = useRoute<SearchResultsScreenRouteProp>();
  const navigation = useNavigation<SearchResultsScreenNavigationProp>();
  const { query = '', filters = {} } = route.params || {};

  const [searchQuery, setSearchQuery] = useState(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState('Popularity');

  const [activeCategoryTab, setActiveCategoryTab] = useState('Woman');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const categoryScrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;
  const categoryContainerWidthRef = useRef(0);
  const categoryContentWidthRef = useRef(0);

  const stores = [
    { id: 'rolland', name: 'Rolland Official Store', avatar: require('../../../assets/images/sneakers.png') },
    { id: 'stylehub', name: 'Style Hub', avatar: require('../../../assets/images/sports_shoes.png') },
    { id: 'luxuryhouse', name: 'Luxury House', avatar: require('../../../assets/images/hand_bags.png') },
  ];

  useEffect(() => {
    performSearch(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSort]);

  useEffect(() => {
    const t = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, route.params]);

  const buildFilters = (): SearchFilters => {
    const f: SearchFilters = { ...filters };
    if (selectedSort === 'Price High to Low') f.sortBy = 'price_high';
    else if (selectedSort === 'Price Low to High') f.sortBy = 'price_low';
    else if (selectedSort === 'Newest') f.sortBy = 'newest';
    else if (selectedSort === 'Top') f.sortBy = 'rating';
    else f.sortBy = 'popularity';
    return f;
  };

  // Local database API removed - stub functions
  const searchProducts = async (_query: string, _page: number, _limit: number, _filters?: SearchFilters) => {
    return { data: [] as Product[] };
  };
  const getProducts = async (_page: number, _limit: number, _filters?: SearchFilters) => {
    return { data: [] as Product[] };
  };

  const performSearch = async (q?: string) => {
    try {
      setLoading(true);
      const effectiveQuery = typeof q === 'string' ? q : searchQuery;
      const searchFilters = buildFilters();
      if (effectiveQuery && effectiveQuery.trim().length > 0) {
        const response = await searchProducts(effectiveQuery.trim(), 1, 20, searchFilters);
        setProducts(response.data);
      } else {
        const response = await getProducts(1, 20, searchFilters);
        setProducts(response.data);
      }
    } catch (error) {
      // console.error('Error searching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => {
        const productId = (item as any).offerId || (item as any).externalId || item.id;
        const source = (item as any).source || '1688';
        const country = 'en';
        // Fetch product detail first, then navigate
        // Note: This screen would need useProductDetailMutation hook added
        // For now, navigate with productId and let ProductDetailScreen handle it as fallback
        navigation.navigate('ProductDetail', { 
          productId: productId?.toString() || item.id?.toString() || '',
          source: source,
          country: country,
        });
      }}
    >
      <View style={styles.productImageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {item.discountPercentage && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{item.discountPercentage}% Off</Text>
          </View>
        )}
        <TouchableOpacity style={styles.likeButton}>
          <Icon name="heart-outline" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <TouchableOpacity 
          style={styles.sellerInfo}
          onPress={() => navigation.navigate('SellerProfile', { sellerId: item.seller.id })}
        >
          <Text style={styles.sellerName}>{item.seller.name}</Text>
        </TouchableOpacity>
        <View style={styles.priceContainer}>
          {item.discountPercentage && (
            <Text style={styles.originalPrice}>${(item.originalPrice || item.price * 1.1).toFixed(2)}</Text>
          )}
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
        </View>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={12} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating} ({item.reviewCount})</Text>
          <Text style={styles.soldText}>{item.orderCount || 0} sold</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSortModal = () => (
    <Modal visible={sortModalVisible} transparent animationType="slide" onRequestClose={() => setSortModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort By</Text>
            <TouchableOpacity onPress={() => setSortModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: SPACING.lg }}>
            {['Popularity', 'Top', 'Price High to Low', 'Price Low to High', 'Newest'].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.sortOption}
                onPress={() => {
                  setSelectedSort(option);
                  setSortModalVisible(false);
                }}
              >
                <Text style={styles.sortOptionText}>{option}</Text>
                {selectedSort === option && (
                  <Icon name="checkmark" size={20} color={COLORS.red} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray[400]} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={query || 'Search'}
              placeholderTextColor={COLORS.gray[400]}
              returnKeyType="search"
              onSubmitEditing={() => performSearch(searchQuery.trim())}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={20} color={COLORS.gray[400]} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications' as never)}>
            <Icon name="notifications-outline" size={24} color={COLORS.text.primary} />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>20</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.categoryTabsContainer}>
          <View
            style={styles.categoryTabsWrapper}
            onLayout={(e) => { categoryContainerWidthRef.current = e.nativeEvent.layout.width; }}
          >
            <Animated.ScrollView
              ref={categoryScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
              scrollEventThrottle={16}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
              onContentSizeChange={(contentWidth) => { categoryContentWidthRef.current = contentWidth; }}
            >
              {categories.map((cat, index) => (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoryTab}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayouts.current[index] = { x, width };
                    if (index === activeCategoryIndex) {
                      indicatorX.setValue(x);
                      indicatorW.setValue(width);
                    }
                  }}
                  onPress={() => {
                    setActiveCategoryTab(cat);
                    setActiveCategoryIndex(index);
                    const layout = tabLayouts.current[index];
                    if (layout) {
                      Animated.parallel([
                        Animated.timing(indicatorX, { toValue: layout.x, duration: 180, useNativeDriver: false }),
                        Animated.timing(indicatorW, { toValue: layout.width, duration: 180, useNativeDriver: false }),
                      ]).start();
                      const containerW = categoryContainerWidthRef.current || 0;
                      const contentW = categoryContentWidthRef.current || 0;
                      const halfGap = Math.max(0, (containerW - layout.width) / 2);
                      let targetX = layout.x - halfGap;
                      const maxX = Math.max(0, contentW - containerW);
                      if (targetX < 0) targetX = 0;
                      if (targetX > maxX) targetX = maxX;
                      categoryScrollRef.current?.scrollTo({ x: targetX, animated: true });
                    }
                  }}
                >
                  <Text style={[styles.categoryTabText, activeCategoryTab === cat && styles.activeCategoryTabText]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.ScrollView>
            <View style={styles.categoryBaseline} />
            <Animated.View style={[styles.categoryIndicator, { left: Animated.subtract(indicatorX, scrollX), width: indicatorW }]} />
          </View>
        </View>

        <View style={styles.sortFilterBar}>
          <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)}>
            <Text style={styles.sortButtonText}>Sort by</Text>
            <Icon name="chevron-down" size={16} color={COLORS.gray[500]} />
          </TouchableOpacity>
          <Text style={styles.itemCount}>{products.length} items found</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
            <Text style={styles.filterButtonText}>Filter</Text>
            <Icon name="chevron-down" size={16} color={COLORS.gray[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeCarousel} contentContainerStyle={styles.storeCarouselContent}>
          {stores.map((store) => (
            <TouchableOpacity key={store.id} style={styles.storeCard}>
              <Image source={store.avatar} style={styles.storeAvatar} />
              <Text style={styles.storeName}>{store.name}</Text>
              <Icon name="chevron-forward" size={16} color={COLORS.gray[400]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productGrid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await performSearch(searchQuery); setRefreshing(false); }} />}
        showsVerticalScrollIndicator={false}
      />

      {renderSortModal()}
      {/* Placeholder for filter bottom-sheet trigger; integrate with existing FilterModal later */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  safeArea: {
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  categoryTabsContainer: {
    backgroundColor: COLORS.white,
    paddingTop: SPACING.sm,
    zIndex: 9,
  },
  categoryTabsWrapper: {
    position: 'relative',
  },
  categoryTabs: {
  },
  categoryTab: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    marginRight: SPACING.lg,
  },
  categoryTabText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    fontWeight: '400',
  },
  activeCategoryTabText: {
    color: COLORS.text.primary,
    fontWeight: '600',
    paddingBottom: SPACING.xs,
  },
  categoryBaseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: COLORS.gray[200],
  },
  categoryIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: COLORS.text.primary,
    borderRadius: 2,
  },
  sortFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  sortButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginRight: SPACING.xs,
  },
  itemCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  filterButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginRight: SPACING.xs,
  },
  storeCarousel: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
  },
  storeCarouselContent: {
    paddingHorizontal: SPACING.lg,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    ...SHADOWS.sm,
  },
  storeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SPACING.sm,
  },
  storeName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },
  productGrid: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  productCard: {
    width: (undefined as any),
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.md,
    marginRight: SPACING.sm,
    ...SHADOWS.sm,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  discountBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
  },
  discountText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  likeButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: SPACING.sm,
  },
  productName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sellerInfo: {
    marginBottom: SPACING.xs,
  },
  sellerName: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  originalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
    marginRight: SPACING.xs,
  },
  productPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.red,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
    marginLeft: 2,
    marginRight: SPACING.xs,
  },
  soldText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  sortOptionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
});

export default SearchResultsScreen;

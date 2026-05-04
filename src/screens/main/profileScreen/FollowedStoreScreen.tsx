import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../../components/Icon';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../constants';
import { useToast } from '../../../context/ToastContext';
import { useTranslation } from '../../../hooks/useTranslation';

interface Store {
  storeId: string;
  storeName: string;
  platform: string;
  defaultItems: Product[];
  visitedCount: number;
  followedAt: string;
  hasShoped: boolean;
}

interface Product {
  offerId: string;
  title: string;
  photoUrl: string;
  price: number;
}

const FollowedStoreScreen: React.FC = () => {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<'follow' | 'visited' | 'shopped'>('follow');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Live Now (0)');
  const [selectedSort, setSelectedSort] = useState(t('profile.oldestFirst'));
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  useEffect(() => {
    fetchStores();
  }, [selectedTab]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      let filter: 'followed' | 'frequently_visited' | 'shoped_store' | undefined;
      
      if (selectedTab === 'follow') {
        filter = undefined; // or 'followed'
      } else if (selectedTab === 'visited') {
        filter = 'frequently_visited';
      } else if (selectedTab === 'shopped') {
        filter = 'shoped_store';
      }
      
      console.log('Fetching stores with filter:', filter, 'for tab:', selectedTab);
      
      const response = await productsApi.getFollowedStores(filter);
      
      if (response.success && response.data) {
        setStores(response.data.items);
      } else {
        showToast(response.message || t('profile.failedToLoadStores'), 'error');
      }
    } catch (error) {
      showToast(t('profile.failedToLoadStores'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStores();
    setRefreshing(false);
  };

  const handleToggleFollow = (store: Store, currentlyFollowed: boolean) => {
    if (currentlyFollowed) {
      // Show unfollow confirmation modal
      setSelectedStore(store);
      setShowUnfollowModal(true);
    } else {
      // Follow directly
      performToggleFollow(store, 'follow');
    }
  };

  const performToggleFollow = async (store: Store, action: 'follow' | 'unfollow') => {
    setIsTogglingFollow(true);
    try {
      const response = await productsApi.toggleFollowStore(store.storeId, store.platform, action);
      
      if (response.success) {
      showToast(t('profile.storeFollowedSuccessfully'), 'success');
        await fetchStores();
      } else {
        showToast(t('profile.failedToFollowStore'), 'error');
      }
    } catch (error) {
      showToast(t('profile.failedToUpdateStore'), 'error');
    } finally {
      setIsTogglingFollow(false);
      setShowUnfollowModal(false);
      setSelectedStore(null);
    }
  };

  const handleStorePress = (store: Store) => {
    (navigation as any).navigate('SellerProfile', {
      sellerId: store.storeId,
      sellerName: store.storeName,
      source: store.platform,
      country: 'en',
    });
  };

  const sortedStores = [...stores].sort((a, b) => {
    const dateA = new Date(a.followedAt).getTime();
    const dateB = new Date(b.followedAt).getTime();
    return selectedSort === t('profile.newestFirst') ? dateB - dateA : dateA - dateB;
  });

  const statusOptions = ['Live Now (0)', 'New Arrivals (36)'];
  const sortOptions = [t('profile.oldestFirst'), t('profile.newestFirst')];

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.followStore')}</Text>
      </View>
      {/* <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIconButton}>
          <Icon name="search" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.managementText}>Management</Text>
        <TouchableOpacity style={styles.headerIconButton}>
          <Icon name="ellipsis-horizontal" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View> */}
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'follow' && styles.tabActive]}
        onPress={() => setSelectedTab('follow')}
      >
        <Text style={[styles.tabText, selectedTab === 'follow' && styles.tabTextActive]}>
          {t('profile.followTab')} (73)
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'visited' && styles.tabActive]}
        onPress={() => setSelectedTab('visited')}
      >
        <Text style={[styles.tabText, selectedTab === 'visited' && styles.tabTextActive]}>
          {t('profile.frequentlyVisited')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'shopped' && styles.tabActive]}
        onPress={() => setSelectedTab('shopped')}
      >
        <Text style={[styles.tabText, selectedTab === 'shopped' && styles.tabTextActive]}>
          {t('profile.shoppedStores')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          setShowStatusDropdown(!showStatusDropdown);
          setShowSortDropdown(false);
        }}
      >
        <Text style={styles.filterButtonText}>Status</Text>
        <Icon name="chevron-down" size={16} color={COLORS.text.primary} />
      </TouchableOpacity> */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          setShowSortDropdown(!showSortDropdown);
          setShowStatusDropdown(false);
        }}
      >
        <Text style={styles.filterButtonText}>{selectedSort === 'oldest first' ? t('profile.oldestFirst') : t('profile.newestFirst')}</Text>
        <Icon name="chevron-down" size={16} color={COLORS.text.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderStoreItem = ({ item }: { item: Store }) => (
    <View style={styles.storeCard}>
      <TouchableOpacity 
        style={styles.storeHeader}
        onPress={() => handleStorePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.storeInfo}>
          <Image 
            source={{ uri: item.defaultItems[0]?.photoUrl || 'https://via.placeholder.com/100' }} 
            style={styles.storeAvatar} 
          />
          <View style={styles.storeDetails}>
            <Text style={styles.storeName} numberOfLines={1}>{item.storeName}</Text>
            <Text style={styles.storeVisitTime}>
              {new Date(item.followedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.unfollowButton}
          onPress={() => handleToggleFollow(item, true)}
        >
          <Text style={styles.unfollowButtonText}>{t('profile.unfollow')}</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.productsGrid}>
        {item.defaultItems.slice(0, 4).map((product) => (
          <View key={product.offerId} style={styles.productItem}>
            <Image 
              source={{ uri: product.photoUrl || 'https://via.placeholder.com/200' }} 
              style={styles.productImage} 
            />
            <Text style={styles.productPrice}>¥{product.price}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSimpleStoreItem = ({ item }: { item: Store }) => {
    const isFollowed = selectedTab === 'follow' || item.followedAt !== null;
    
    return (
      <View style={styles.simpleStoreCard}>
        <TouchableOpacity 
          style={styles.storeInfo}
          onPress={() => handleStorePress(item)}
          activeOpacity={0.7}
        >
          <Image 
            source={{ uri: item.defaultItems[0]?.photoUrl || 'https://via.placeholder.com/100' }} 
            style={styles.storeAvatar} 
          />
          <View style={styles.storeDetails}>
            <Text style={styles.storeName} numberOfLines={1}>{item.storeName}</Text>
            <Text style={styles.storeVisitTime}>
              {t('profile.visitedTimes').replace('{count}', item.visitedCount.toString())}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.followButton,
            isFollowed && styles.unfollowButton
          ]}
          onPress={() => handleToggleFollow(item, isFollowed)}
        >
          <Text style={[
            styles.followButtonText,
            isFollowed && styles.unfollowButtonText
          ]}>
            {isFollowed ? t('profile.unfollow') : t('profile.follow')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      {renderFilters()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('profile.noStoresFound')}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedStores}
          renderItem={selectedTab === 'follow' ? renderStoreItem : renderSimpleStoreItem}
          keyExtractor={(item) => item.storeId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Status Dropdown */}
      {/* {showStatusDropdown && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusDropdown(false)}
        >
          <View
            style={[
              styles.dropdownContent,
              {
                top: 150,
                left: 16,
                width: 200,
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.dropdownTriangle} />
            {statusOptions.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownOption,
                  selectedStatus === option && styles.dropdownOptionSelected
                ]}
                onPress={() => {
                  setSelectedStatus(option);
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )} */}

      {/* Sort Dropdown */}
      {showSortDropdown && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowSortDropdown(false)}
        >
          <View
            style={[
              styles.dropdownContent,
              {
                top: 150,
                left: 16,
                width: 200,
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.dropdownTriangle} />
            {sortOptions.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownOption,
                  selectedSort === option && styles.dropdownOptionSelected
                ]}
                onPress={() => {
                  setSelectedSort(option);
                  setShowSortDropdown(false);
                }}
              >
                <Text style={styles.dropdownOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}

      {/* Unfollow Confirmation Modal */}
      <Modal
        visible={showUnfollowModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnfollowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('profile.unfollowTitle')}</Text>
            <Text style={styles.modalMessage}>{t('profile.unfollowConfirmation')}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowUnfollowModal(false);
                  setSelectedStore(null);
                }}
                disabled={isTogglingFollow}
              >
                <Text style={styles.cancelButtonText}>{t('profile.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => selectedStore && performToggleFollow(selectedStore, 'unfollow')}
                disabled={isTogglingFollow}
              >
                {isTogglingFollow ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>{t('profile.confirm')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.lg,
    backgroundColor: COLORS.white,
    // borderBottomWidth: 1,
    // borderBottomColor: COLORS.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIconButton: {
    padding: SPACING.xs,
  },
  managementText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    // borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
    // borderBottomColor: COLORS.gray[200],
  },
  tab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingBottom: SPACING.sm,
  },
  tabActive: {
    borderBottomColor: COLORS.red,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  tabTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#0000000D',
  },
  filterButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  storeCard: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.md,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#0000000D',
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  storeAvatar: {
    width: 35,
    height: 35,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[200],
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs / 2,
  },
  storeVisitTime: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  unfollowButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: '#0000000D',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background
  },
  unfollowButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  simpleStoreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  followButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: BORDER_RADIUS.md,
  },
  followButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  productsGrid: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  productItem: {
    width: '23.5%', // 4 items per row with gaps
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
    marginBottom: SPACING.xs,
  },
  productPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  dropdownContent: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.lg,
    zIndex: 1001,
  },
  dropdownTriangle: {
    position: 'absolute',
    top: -8,
    left: SPACING.md,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.white,
  },
  dropdownOption: {
    paddingHorizontal: SPACING.smmd,
    paddingVertical: SPACING.xs,
    marginHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm
  },
  dropdownOptionSelected: {
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#0000000D'
  },
  dropdownOptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['2xl'],
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.xl,
    paddingVertical: SPACING.md,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    // marginBottom: SPACING.md,
  },
  modalMessage: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontWeight: '400',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default FollowedStoreScreen;

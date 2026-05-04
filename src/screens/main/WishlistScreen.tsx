import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from '../../components/Icon';
import { useNavigation } from '@react-navigation/native';
import TuneIcon from '../../assets/icons/TuneIcon';
import ImageSearchResultsModal from './searchScreen/ImageSearchResultsModal';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePlatformStore } from '../../store/platformStore';
import { useAppSelector } from '../../store/hooks';
import { useGetWishlistMutation } from '../../hooks/useGetWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../hooks/useDeleteFromWishlistMutation';
import { useDeleteFromWishlistBatchMutation } from '../../hooks/useDeleteFromWishlistBatchMutation';
import { useAddToCartMutation } from '../../hooks/useAddToCartMutation';
import { useWishlistStatus } from '../../hooks/useWishlistStatus';
import { useToast } from '../../context/ToastContext';
import { translations } from '../../i18n/translations';
import { getLocalizedText } from '../../utils/i18nHelpers';

const { width } = Dimensions.get('window');

const WishlistScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Wishlist state and API
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [storeGroups, setStoreGroups] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasProcessedProductDetail, setHasProcessedProductDetail] = useState(false);
  const hasFetchedRef = useRef(false);
  const [selectedPlatformTab, setSelectedPlatformTab] = useState('All');
  const [showItemStatusModal, setShowItemStatusModal] = useState(false);
  const itemStatusButtonRef = useRef<View>(null);
  const [itemStatusPosition, setItemStatusPosition] = useState({ top: 0, left: 0 });
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const collectionButtonRef = useRef<View>(null);
  const [collectionPosition, setCollectionPosition] = useState({ top: 0, left: 0 });
  const [showAllFiltersModal, setShowAllFiltersModal] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    discoverDeals: [] as string[],
    itemStatus: [] as string[],
    collectionTime: [] as string[],
  });
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const sortButtonRef = useRef<View>(null);
  const [sortPosition, setSortPosition] = useState({ top: 0, left: 0 });
  const [groupByStore, setGroupByStore] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [similarSearchVisible, setSimilarSearchVisible] = useState(false);
  const [similarSearchBase64, setSimilarSearchBase64] = useState('');
  const [similarSearchUri, setSimilarSearchUri] = useState('');
  
  const { refreshExternalIds } = useWishlistStatus();
  const { showToast } = useToast();
  
  // Get platform and locale (defined early so they can be used in callbacks)
  const { selectedPlatform } = usePlatformStore();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  
  // Translation function (defined early so it can be used in callbacks)
  const t = useCallback((key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  }, [locale]);

  // Resolve multilingual object or string to string for current locale (subjectMultiLang, storeNameMultiLang, etc.)
  const resolveText = useCallback((value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && ('en' in value || 'ko' in value || 'zh' in value)) {
      const o = value as Record<string, string>;
      return getLocalizedText(
        { en: o.en ?? '', ko: o.ko ?? '', zh: o.zh ?? '' },
        locale
      );
    }
    return String(value);
  }, [locale]);

  const mapWishlistItem = useCallback((item: any) => {
    const nameStr = resolveText(item.subjectMultiLang ?? item.title) || '';
    const storeNameStr = resolveText(item.storeNameMultiLang ?? item.storeName) || '';
    return {
      id: item.externalId?.toString() || item._id?.toString() || '',
      _id: item._id ?? '',
      externalId: item.externalId?.toString() || '',
      offerId: item.externalId?.toString() || '',
      name: nameStr,
      title: nameStr,
      image: item.imageUrl || '',
      images: item.imageUrl ? [item.imageUrl] : [],
      price: item.price ?? 0,
      originalPrice: item.price ?? 0,
      description: '',
      category: { id: '', name: '', icon: '', image: '', subcategories: [] },
      subcategory: '',
      brand: '',
      seller: { id: item.storeId ?? '', name: storeNameStr, avatar: '', rating: 0, reviewCount: 0, isVerified: false, followersCount: 0, description: '', location: '', joinedDate: new Date() },
      rating: 0, reviewCount: 0, rating_count: 0,
      inStock: !item.isLowStock, stockCount: 0, tags: [],
      isNew: false, isFeatured: false, isOnSale: item.isDiscounted ?? false,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      orderCount: 0,
      source: item.source || '1688',
      purchased: item.purchased, isDiscounted: item.isDiscounted,
      isExpired: item.isExpired, isLowStock: item.isLowStock,
      productDetailFetchedAt: item.productDetailFetchedAt,
      storeId: item.storeId, storeName: storeNameStr,
      originalData: item,
    };
  }, [resolveText]);
  
  // Add to cart mutation (calls cart API)
  const { mutate: addToCartApi, isLoading: isAddToCartLoading } = useAddToCartMutation({
    onSuccess: () => {
      showToast(t('product.addedToCart') || 'Added to cart', 'success');
    },
    onError: (error) => {
      showToast(error || t('product.failedToAdd') || 'Failed to add to cart', 'error');
    },
  });

  // Build AddToCartRequest from wishlist item and call API (uses originalData.skuInfo when available)
  const addToCart = async (product: any, quantity: number = 1) => {
    const offerIdNum = parseInt(product.externalId || product.offerId || product.id || '0', 10);
    if (!offerIdNum) {
      showToast(t('product.invalidProductId') || 'Invalid product', 'error');
      return;
    }
    const raw = product.originalData;
    const price = product.price ?? raw?.price ?? 0;
    const priceStr = String(price);
    const skuInfoFromApi = raw?.skuInfo;
    const skuInfo = skuInfoFromApi
      ? {
          skuId: skuInfoFromApi.skuId ?? offerIdNum,
          specId: skuInfoFromApi.specId ?? String(offerIdNum),
          price: skuInfoFromApi.price ?? priceStr,
          amountOnSale: skuInfoFromApi.amountOnSale ?? 999999,
          consignPrice: skuInfoFromApi.consignPrice ?? skuInfoFromApi.price ?? priceStr,
          cargoNumber: skuInfoFromApi.cargoNumber,
          skuAttributes: (skuInfoFromApi.skuAttributes || []).map((attr: any) => ({
            attributeId: attr.attributeId ?? 0,
            attributeName: attr.attributeName ?? '',
            attributeNameTrans: attr.attributeNameTrans ?? attr.attributeName ?? '',
            value: attr.value ?? '',
            valueTrans: attr.valueTrans ?? attr.value ?? '',
            skuImageUrl: attr.skuImageUrl,
          })),
          fenxiaoPriceInfo: skuInfoFromApi.fenxiaoPriceInfo || { offerPrice: priceStr },
        }
      : {
          skuId: offerIdNum,
          specId: String(offerIdNum),
          price: priceStr,
          amountOnSale: 999999,
          consignPrice: priceStr,
          skuAttributes: [] as Array<{ attributeId: number; attributeName: string; attributeNameTrans: string; value: string; valueTrans: string; skuImageUrl?: string }>,
          fenxiaoPriceInfo: { offerPrice: priceStr },
        };
    const request = {
      offerId: offerIdNum,
      categoryId: parseInt(raw?.categoryId || product.category?.id || '0', 10) || 0,
      subject: product.name || product.title || raw?.subject || '',
      subjectTrans: product.name || product.title || raw?.subjectTrans || raw?.subject || '',
      imageUrl: product.image || product.images?.[0] || raw?.imageUrl || '',
      promotionUrl: raw?.promotionUrl,
      skuInfo,
      companyName: product.seller?.name || product.storeName || raw?.storeName || (typeof raw?.companyName === 'string' ? raw.companyName : ''),
      sellerOpenId: product.seller?.id || product.storeId || raw?.storeId || raw?.sellerOpenId || '',
      quantity,
      minOrderQuantity: raw?.minOrderQuantity ?? product.minOrderQuantity ?? 1,
    };
    return addToCartApi(request);
  };
  
  // Get wishlist mutation
  const { mutate: fetchWishlist, isLoading: wishlistLoading } = useGetWishlistMutation({
    onSuccess: (data) => {
      // Handle grouped response
      if (data?.wishlistByStore && Array.isArray(data.wishlistByStore)) {
        const mappedGroups = data.wishlistByStore.map((group: any) => ({
          storeId: group.storeId,
          storeName: resolveText(group.storeNameMultiLang ?? group.storeName) || group.storeName,
          items: group.items.map((item: any) => mapWishlistItem(item)),
        }));
        setStoreGroups(mappedGroups);
        return;
      }
      // Handle flat response
      if (data?.wishlist) {
        setWishlistItems(data.wishlist.map((item: any) => mapWishlistItem(item)));
      } else {
        setWishlistItems([]);
      }
    },
    onError: (error) => {
      showToast(error || t('profile.wishlistFailedToFetch'), 'error');
    },
  });

  // Delete from wishlist mutation
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation({
    onSuccess: () => {
      showToast(t('product.productRemovedFromWishlist'), 'success');
      refreshExternalIds();
      fetchWishlist();
    },
    onError: (error) => {
      showToast(error || t('product.failedToRemoveFromWishlist'), 'error');
    },
  });

  // Batch delete from wishlist
  const { mutate: deleteFromWishlistBatch } = useDeleteFromWishlistBatchMutation({
    onSuccess: () => {
      showToast(t('product.productRemovedFromWishlist'), 'success');
      refreshExternalIds();
      fetchWishlist();
      setSelectedItems([]);
    },
    onError: (error) => {
      showToast(error || t('product.failedToRemoveFromWishlist'), 'error');
    },
  });

  const refreshWishlist = () => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  };

  const toggleWishlist = async (product: any) => {
    if (!isAuthenticated) {
      return;
    }
    
    // Backend accepts either MongoDB _id or externalId as wishlistId
    const wishlistId =
      (product as any)._id?.toString() ||
      (product as any).externalId?.toString() ||
      (product as any).offerId?.toString() ||
      (product as any).id?.toString() ||
      '';

    if (!wishlistId) {
      showToast(t('product.invalidProductId'), 'error');
      return;
    }

    deleteFromWishlist(wishlistId);
  };
  
  // Product detail mutation removed - stub functions
  const productDetailData = null;
  const productDetailLoading = false;
  const productDetailError = false;
  const productDetailErrorData = null;
  const fetchProductDetail = (_productId: string) => {
    // Product detail API removed
  };
  const fetchProductDetailForNavigation = (productId: string, _source?: string, _country?: string) => {
    // Product detail API removed - navigate directly
    (navigation as any).navigate('ProductDetail', {
      productId: productId,
      source: _source || selectedPlatform,
      country: _country || (locale === 'zh' ? 'zh' : locale === 'ko' ? 'ko' : 'en'),
    });
  };

  // Fetch wishlist only once when component mounts
  useEffect(() => {
    if (isAuthenticated && !hasFetchedRef.current) {
      fetchWishlist();
      hasFetchedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Re-fetch with groupByStore param when toggle changes — handled by the combined effect above

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.wishlistTitle')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          {/* <View style={styles.iconContainer}> */}
            <Image 
              source={require('../../assets/icons/wishlist.png')} 
              style={styles.wishlistImage}
              resizeMode="contain"
            />
          {/* </View> */}
          <Text style={styles.welcomeText}>{t('profile.wishlistWelcome')}</Text>
          <Text style={styles.loginPrompt}>
            {t('profile.wishlistLoginPrompt')}
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => (navigation as any).navigate('Auth')}
          >
            <Icon name="log-in-outline" size={20} color={COLORS.white} />
            <Text style={styles.loginButtonText}>{t('profile.wishlistLogin')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWishlist(buildWishlistParams(groupByStore));
    setRefreshing(false);
  };

  const handleProductPress = (product: Product) => {
    // Fetch product detail first, then navigate
    const productId = (product as any).offerId || (product as any).externalId || product.id;
    const source = (product as any).source || selectedPlatform || '1688';
    const country = locale === 'zh' ? 'zh' : locale === 'ko' ? 'ko' : 'en';
    fetchProductDetailForNavigation(productId, source, country);
  };

  const handleAddToCartClick = async (product: Product) => {
    // Reset processed flag for new product
    // setHasProcessedProductDetail(false);
    
    // Get product ID (offerId or externalId or id)
    const productId = (product as any).offerId || (product as any).externalId || product.id;
    // const source = (product as any).source || selectedPlatform || '1688';
    // const country = locale === 'zh' ? 'zh' : locale === 'ko' ? 'ko' : 'en';
    
    // if (!productId) {
    //   showToast('This product isn\'t available to add cart now', 'error');
    //   return;
    // }
    
    // Fetch product detail to get variation data
    // fetchProductDetail(productId, source, country);
  };
  
  // Handle product detail data when it's fetched (only process once per fetch)
  // Just add to cart directly without showing modal
  useEffect(() => {
    // Only proceed if product detail is fully loaded (not loading and has data)
    if (!productDetailLoading && productDetailData && !hasProcessedProductDetail) {
      // console.log('Wishlist: Product detail fetched', productDetailData);
      
      // Mark as processed to prevent infinite loop
      setHasProcessedProductDetail(true);
      
      // Add directly to cart without showing variation modal
      // console.log('Wishlist: Adding product to cart directly');
      handleAddToCart(productDetailData, 1);
    }
  }, [productDetailData, productDetailLoading, hasProcessedProductDetail]);
  
  // Handle error state (only show toast once per error)
  // Note: Error toast is already shown in onError callback, this is just a safety check
  useEffect(() => {
    if (productDetailError && !productDetailLoading && !hasProcessedProductDetail) {
      // console.error('Wishlist: Product detail fetch failed (useEffect)', productDetailError);
      // Toast already shown in onError callback, just mark as processed
      setHasProcessedProductDetail(true); // Mark as processed to prevent infinite loop
    }
  }, [productDetailError, productDetailLoading, hasProcessedProductDetail]);

  const handleAddToCart = async (product: Product, quantity: number = 1, selectedColor?: string, selectedSize?: string) => {
    try {
      await addToCart(product, quantity);
      // showToast('Product added to bag!', 'success');
      // Reset processed flag so next product can be added
      setHasProcessedProductDetail(false);
    } catch (error) {
      // showToast('Failed to add product to bag', 'error');
      // Reset processed flag on error so user can retry
      setHasProcessedProductDetail(false);
    }
  };



  const handleRemoveFromWishlist = async (product: any) => {
    if (!isAuthenticated) {
      // showToast('Please login to manage wishlist', 'warning');
      return;
    }
    
    try {
      toggleWishlist(product);
      // showToast('Item removed from wishlist', 'success');
    } catch (error) {
      // showToast('Failed to remove item from wishlist', 'error');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('profile.wishlistTitle')}({wishlistItems.length})
        </Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerIcon}>
          <Icon name="search" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => {
            if (isManagementMode) {
              setIsManagementMode(false);
              setSelectedItems([]);
            } else {
              setIsManagementMode(true);
            }
          }}
        >
          <Text style={styles.managementText}>
            {isManagementMode ? 'Exit' : 'Management'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon}>
          <Icon name="ellipsis-horizontal" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInfoBar = () => (
    <View style={styles.infoBar}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          setSelectedPlatformTab('All');
          setTempFilters({ discoverDeals: [], itemStatus: [], collectionTime: [] });
          setSortBy('newest');
          setGroupByStore(false);
        }}
      >
        <Text style={styles.filterButtonText}>Total items {`(${wishlistItems.length})`}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, groupByStore && styles.filterButtonActive]}
        onPress={() => setGroupByStore(prev => !prev)}
      >
        {/* <Icon name="storefront-outline" size={14} color={groupByStore ? COLORS.red : COLORS.text.primary} /> */}
        <Text style={[styles.filterButtonText, groupByStore && styles.filterButtonTextActive]}>
          {t('profile.wishlistItemsInSameStore')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilterBar = () => {
    return (
      <View style={styles.filterBarContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          {/* <TouchableOpacity 
            style={[styles.filterButton, tempFilters.discoverDeals.includes('Discounted') && styles.filterButtonActive]}
            onPress={() => {
              const newDeals = tempFilters.discoverDeals.includes('Discounted')
                ? tempFilters.discoverDeals.filter(d => d !== 'Discounted')
                : [...tempFilters.discoverDeals, 'Discounted'];
              setTempFilters({ ...tempFilters, discoverDeals: newDeals });
            }}
          >
            <Text style={[
              styles.filterButtonText, 
              tempFilters.discoverDeals.includes('Discounted') && styles.filterButtonTextActive
            ]}>
              Discounted
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            ref={itemStatusButtonRef}
            style={[styles.filterButton, tempFilters.itemStatus.length > 0 && styles.filterButtonActive]}
            onPress={() => {
              itemStatusButtonRef.current?.measureInWindow((x, y, width, height) => {
                setItemStatusPosition({ top: y + height, left: x });
                setShowItemStatusModal(true);
              });
            }}
          >
            <Text style={[
              styles.filterButtonText,
              tempFilters.itemStatus.length > 0 && styles.filterButtonTextActive
            ]}>
              {tempFilters.itemStatus.length > 0 ? tempFilters.itemStatus[0] : 'Item Status'}
            </Text>
            <Icon name="chevron-down" size={16} color={tempFilters.itemStatus.length > 0 ? COLORS.primary : COLORS.text.secondary} />
          </TouchableOpacity> */}
          
          <TouchableOpacity 
            ref={collectionButtonRef}
            style={[styles.filterButton, tempFilters.collectionTime.length > 0 && styles.filterButtonActive]}
            onPress={() => {
              collectionButtonRef.current?.measureInWindow((x, y, width, height) => {
                setCollectionPosition({ top: y + height, left: x });
                setShowCollectionModal(true);
              });
            }}
          >
            <Text style={[
              styles.filterButtonText,
              tempFilters.collectionTime.length > 0 && styles.filterButtonTextActive
            ]}>
              {tempFilters.collectionTime.length > 0 ? tempFilters.collectionTime[0] : t('profile.wishlistCollectionTime')}
            </Text>
            <Icon name="chevron-down" size={16} color={tempFilters.collectionTime.length > 0 ? COLORS.primary : COLORS.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            ref={sortButtonRef as any}
            style={[styles.filterButton, sortBy !== 'newest' && styles.filterButtonActive]}
            onPress={() => {
              (sortButtonRef.current as any)?.measureInWindow((x: number, y: number, w: number, h: number) => {
                setSortPosition({ top: y + h, left: x });
                setShowSortModal(true);
              });
            }}
          >
            <Text style={[styles.filterButtonText, sortBy !== 'newest' && styles.filterButtonTextActive]}>
              {sortBy === 'newest' ? t('profile.wishlistSortMostRecent') : t('profile.wishlistSortOldest')}
            </Text>
            <Icon name="chevron-down" size={16} color={sortBy !== 'newest' ? COLORS.red : COLORS.text.secondary} />
          </TouchableOpacity>
        </ScrollView>
        
        {/* Filter icon button positioned over the filter bar */}
        {/* <View style={styles.filterIconOverlay}>
          <TouchableOpacity 
            style={styles.filterIconButton}
            onPress={() => setShowAllFiltersModal(true)}
          >
            <TuneIcon width={20} height={20} color={COLORS.black} />
          </TouchableOpacity>
        </View> */}
      </View>
    );
  };

  // Map collection time label → API timeFilter value
  const collectionTimeToFilter = (label: string): string => {
    switch (label) {
      case 'Within 7 days':  return '7d';
      case 'Within 30 days': return '30d';
      case 'Within 90 days': return '90d';
      case 'Six months ago': return '180d';
      case 'One year ago':   return '365d';
      default:               return '90d';
    }
  };

  // Build API params from current filter state
  const buildWishlistParams = (grouped = false) => ({
    discounted: false,
    sort: sortBy === 'newest' ? 'recently_saved' : 'earliest',
    timeFilter: tempFilters.collectionTime.length > 0
      ? collectionTimeToFilter(tempFilters.collectionTime[0])
      : '90d',
    ...(grouped ? { groupByStore: true } : {}),
  });

  // Re-fetch when sort or collection time filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist(buildWishlistParams(groupByStore));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, tempFilters.collectionTime, groupByStore]);

  // Filter wishlist items by platform (client-side only — API handles sort/time)
  const filteredItems = wishlistItems
    .filter((item: any) => {
      if (selectedPlatformTab === 'All') return true;
      const itemSource = item.source || '1688';
      if (selectedPlatformTab === 'Company Mall') {
        return itemSource.toLowerCase() === 'companymall' ||
               itemSource.toLowerCase() === 'company mall' ||
               itemSource.toLowerCase() === 'company';
      }
      return itemSource.toLowerCase() === selectedPlatformTab.toLowerCase();
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const renderProductItem = ({ item, index }: { item: any; index: number }) => {
    const isSelected = selectedItems.includes(item.id);
    
    return (
      <View style={styles.productItemContainer}>
        <View style={styles.productCard}>
          {isManagementMode && (
            <TouchableOpacity 
              style={styles.productCheckboxContainer}
              onPress={() => {
                if (isSelected) {
                  setSelectedItems(selectedItems.filter(id => id !== item.id));
                } else {
                  setSelectedItems([...selectedItems, item.id]);
                }
              }}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Icon name="checkmark" size={16} color={COLORS.white} />}
              </View>
            </TouchableOpacity>
          )}
          
          <View style={styles.productImageContainer}>
            <TouchableOpacity onPress={() => !isManagementMode && handleProductPress(item)}>
              <Image 
                source={{ uri: item.image || item.imageUrl }} 
                style={styles.productImage}
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.productInfo}>
            <TouchableOpacity onPress={() => !isManagementMode && handleProductPress(item)}>
              <Text style={styles.productName} numberOfLines={2}>
                {item.name || item.title}
              </Text>
            </TouchableOpacity>
            <Text style={styles.productPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.similarItemsButton}
          onPress={async () => {
            const imageUrl = item.image || item.imageUrl || '';
            if (!imageUrl) {
              showToast('No image available for this product', 'error');
              return;
            }
            try {
              const RNFS = require('react-native-fs');
              const tempPath = `${RNFS.CachesDirectoryPath}/wishlist_similar_${Date.now()}.jpg`;
              await RNFS.downloadFile({ fromUrl: imageUrl, toFile: tempPath }).promise;
              const base64 = await RNFS.readFile(tempPath, 'base64');
              setSimilarSearchUri(imageUrl);
              setSimilarSearchBase64(base64);
              setSimilarSearchVisible(true);
            } catch {
              showToast('Failed to load product image', 'error');
            }
          }}
        >
          <Text style={styles.similarItemsText}>{t('profile.wishlistSimilarItems')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <View style={styles.calendarIcon}>
          <Image source={require('../../assets/icons/wishlist.png')} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{t('profile.wishlistNothingInWishlist')}</Text>
      <Text style={styles.emptySubtitle}>
        {t('profile.wishlistEmptySubtitle')}
      </Text>
      <TouchableOpacity
        style={styles.startExploringButton}
        onPress={() => navigation.navigate('Main' as never)}
      >
        <Text style={styles.startExploringButtonText}>{t('profile.wishlistStartExploring')}</Text>
      </TouchableOpacity>
    </View>
  );

  // Only show full-screen loading when wishlist data is loading, not when adding to cart
  if (wishlistLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderInfoBar()}
      {renderFilterBar()}
      
      {wishlistItems.length === 0 ? (
        renderEmptyState()
      ) : groupByStore ? (
        // Group by store — use API response
        <ScrollView
          style={styles.productsList}
          contentContainerStyle={styles.productsListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {storeGroups.map((group) => (
            <View key={group.storeId} style={styles.storeGroup}>
              <View style={styles.storeGroupHeader}>
                {/* <Icon name="storefront-outline" size={16} color={COLORS.text.primary} /> */}
                <Text style={styles.storeGroupName} numberOfLines={1}>{group.storeName}</Text>
                <Text style={styles.storeGroupCount}>({group.items.length})</Text>
              </View>
              {group.items.map((item: any, index: number) => (
                <View key={`store-item-${item.id || item._id || index}`}>
                  {renderProductItem({ item, index })}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderProductItem}
          keyExtractor={(item, index) => `product-${item.id}-${index}`}
          style={styles.productsList}
          contentContainerStyle={styles.productsListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      {/* Management Mode Footer */}
      {isManagementMode && wishlistItems.length > 0 && (
        <View style={styles.managementFooter}>
          <TouchableOpacity 
            style={styles.selectAllButton}
            onPress={() => {
              if (selectedItems.length === filteredItems.length) {
                setSelectedItems([]);
              } else {
                setSelectedItems(filteredItems.map(item => item.id));
              }
            }}
          >
            <View style={[styles.checkbox, selectedItems.length === filteredItems.length && filteredItems.length > 0 && styles.checkboxChecked]}>
              {selectedItems.length === filteredItems.length && filteredItems.length > 0 && (
                <Icon name="checkmark" size={16} color={COLORS.white} />
              )}
            </View>
            <Text style={styles.selectAllText}>All</Text>
          </TouchableOpacity>
          
          <View style={styles.footerActions}>
            <TouchableOpacity 
              style={[styles.footerButton, isAddToCartLoading && styles.footerButtonDisabled]}
              disabled={isAddToCartLoading || selectedItems.length === 0}
              onPress={() => {
                if (selectedItems.length === 0) {
                  showToast('Please select items to add to cart', 'warning');
                  return;
                }
                const itemsToAdd = selectedItems
                  .map((id) => filteredItems.find((i) => i.id === id || i._id === id))
                  .filter(Boolean);
                itemsToAdd.forEach((item) => addToCart(item, 1));
              }}
            >
              {isAddToCartLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.footerButtonText}>Add to cart</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.footerButton}
              onPress={() => {
                // Share functionality
                if (selectedItems.length === 0) {
                  showToast('Please select items to share', 'warning');
                } else {
                  showToast(`Sharing ${selectedItems.length} items`, 'success');
                }
              }}
            >
              <Text style={styles.footerButtonText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deleteFooterButton}
              onPress={() => {
                if (selectedItems.length === 0) {
                  showToast('Please select items to delete', 'warning');
                } else {
                  setShowDeleteConfirmModal(true);
                }
              }}
            >
              <Text style={styles.deleteFooterButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Variation Selection Modal removed - adding to cart directly without modal */}
      
      {/* Loading indicator when fetching product detail */}
      {productDetailLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
      
      {/* Item Status Dropdown Modal */}
      <Modal
        visible={showItemStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowItemStatusModal(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowItemStatusModal(false)}
        >
          <View 
            style={[
              styles.dropdownMenu,
              {
                top: itemStatusPosition.top + 5,
                left: itemStatusPosition.left,
                minWidth: 150,
              }
            ]}
          >
            {/* Triangle pointer */}
            <View style={[styles.dropdownTriangle, { left: 20 }]} />
            
            {['Purchased', 'Low stock', 'Expired'].map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.dropdownOption}
                onPress={() => {
                  setTempFilters({ ...tempFilters, itemStatus: [status] });
                  setShowItemStatusModal(false);
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  tempFilters.itemStatus.includes(status) && styles.dropdownOptionTextActive
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Collection Time Dropdown Modal */}
      <Modal
        visible={showCollectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCollectionModal(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowCollectionModal(false)}
        >
          <View 
            style={[
              styles.dropdownMenu,
              {
                top: collectionPosition.top + 5,
                left: collectionPosition.left,
                minWidth: 180,
              }
            ]}
          >
            {/* Triangle pointer */}
            <View style={[styles.dropdownTriangle, { left: 20 }]} />
            
            {['Within 7 days', 'Within 30 days', 'Within 90 days', 'Six months ago', 'One year ago'].map((time) => (
              <TouchableOpacity
                key={time}
                style={styles.dropdownOption}
                onPress={() => {
                  setTempFilters({ ...tempFilters, collectionTime: [time] });
                  setShowCollectionModal(false);
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  tempFilters.collectionTime.includes(time) && styles.dropdownOptionTextActive
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Similar product image search modal */}
      {similarSearchVisible && (
        <ImageSearchResultsModal
          visible={similarSearchVisible}
          onClose={() => setSimilarSearchVisible(false)}
          imageUri={similarSearchUri}
          imageBase64={similarSearchBase64}
        />
      )}

      {/* Delete Confirm Modal */}
      <Modal
        visible={showDeleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Items</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete {selectedItems.length} selected item{selectedItems.length !== 1 ? 's' : ''} from your wishlist?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={() => setShowDeleteConfirmModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={() => {
                  setShowDeleteConfirmModal(false);
                  const idsToDelete = selectedItems.map(id => {
                    const item = filteredItems.find(i => i.id === id || i._id === id);
                    return (item?._id || item?.externalId || item?.id || id) as string;
                  }).filter(Boolean);
                  deleteFromWishlistBatch(idsToDelete);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Dropdown Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={[styles.dropdownMenu, { top: sortPosition.top + 5, left: sortPosition.left, minWidth: 150 }]}>
            <View style={[styles.dropdownTriangle, { left: 20 }]} />
            {(['newest', 'oldest'] as const).map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.dropdownOption}
                onPress={() => { setSortBy(val); setShowSortModal(false); }}
              >
                <Text style={[styles.dropdownOptionText, sortBy === val && styles.dropdownOptionTextActive]}>
                  {val === 'newest' ? t('profile.wishlistSortMostRecent') : t('profile.wishlistSortOldest')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* All Filters Modal */}
      <Modal
        visible={showAllFiltersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllFiltersModal(false)}
      >
        <View style={styles.allFiltersModalOverlay}>
          <View style={styles.allFiltersModal}>
            {/* Header */}
            <View style={styles.allFiltersHeader}>
              <TouchableOpacity onPress={() => setShowAllFiltersModal(false)}>
                {/* <Icon name="close" size={24} color={COLORS.black} /> */}
              </TouchableOpacity>
              <Text style={styles.allFiltersTitle}>All filters</Text>
              <TouchableOpacity onPress={() => setShowAllFiltersModal(false)}>
                <Icon name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.allFiltersContent} showsVerticalScrollIndicator={false}>
              {/* Discover deals */}
              {/* <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Discover deals</Text>
                <View style={styles.filterOptionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      tempFilters.discoverDeals.includes('Discounted') && styles.filterChipActive
                    ]}
                    onPress={() => {
                      const newDeals = tempFilters.discoverDeals.includes('Discounted')
                        ? tempFilters.discoverDeals.filter(d => d !== 'Discounted')
                        : [...tempFilters.discoverDeals, 'Discounted'];
                      setTempFilters({ ...tempFilters, discoverDeals: newDeals });
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      tempFilters.discoverDeals.includes('Discounted') && styles.filterChipTextActive
                    ]}>
                      Discounted
                    </Text>
                  </TouchableOpacity>
                </View>
              </View> */}
              
              {/* Item Status */}
              {/* <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Item Status</Text>
                <View style={styles.filterOptionsRow}>
                  {['Purchased', 'Low stock', 'Expired'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterChip,
                        tempFilters.itemStatus.includes(status) && styles.filterChipActive
                      ]}
                      onPress={() => {
                        const newStatus = tempFilters.itemStatus.includes(status)
                          ? tempFilters.itemStatus.filter(s => s !== status)
                          : [...tempFilters.itemStatus, status];
                        setTempFilters({ ...tempFilters, itemStatus: newStatus });
                      }}
                    >
                      <Text style={[
                        styles.filterChipText,
                        tempFilters.itemStatus.includes(status) && styles.filterChipTextActive
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View> */}
              
              {/* Collection time */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Collection time</Text>
                <View style={styles.filterOptionsRow}>
                  {['Within 7 days', 'Within 30 days', 'Within 90 days', 'Six months ago', 'One year ago'].map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.filterChip,
                        tempFilters.collectionTime.includes(time) && styles.filterChipActive
                      ]}
                      onPress={() => {
                        const newTime = tempFilters.collectionTime.includes(time)
                          ? tempFilters.collectionTime.filter(t => t !== time)
                          : [...tempFilters.collectionTime, time];
                        setTempFilters({ ...tempFilters, collectionTime: newTime });
                      }}
                    >
                      <Text style={[
                        styles.filterChipText,
                        tempFilters.collectionTime.includes(time) && styles.filterChipTextActive
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            {/* Footer Buttons */}
            <View style={styles.allFiltersFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setTempFilters({
                    discoverDeals: [],
                    itemStatus: [],
                    collectionTime: [],
                  });
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  // Apply filters here
                  setShowAllFiltersModal(false);
                }}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerIcon: {
    padding: SPACING.xs,
  },
  managementText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  platformTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  platformTabsContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: SPACING.lg,
  },
  platformTab: {
    paddingVertical: SPACING.xs,
    marginHorizontal: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  platformTabActive: {
    borderBottomColor: COLORS.red,
  },
  platformTabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  platformTabTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: COLORS.background,
  },
  infoBarCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '400',
  },
  infoBarStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#0000000D',
    backgroundColor: COLORS.white,
  },
  infoBarStoreButtonActive: {
    backgroundColor: COLORS.lightRed,
    borderColor: COLORS.red,
  },
  infoBarStoreText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  infoBarStoreTextActive: {
    color: COLORS.red,
  },
  storeGroup: {
    marginBottom: SPACING.md,
  },
  storeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray[50],
    gap: SPACING.xs,
  },
  storeGroupName: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  storeGroupCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  filterBarContainer: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
  },
  filterBarContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    paddingRight: 60, // Space for the filter icon button
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    borderColor: '#0000000D',
    borderWidth: 1,    
    borderRadius: BORDER_RADIUS.md,
  },
  filterButtonActive: {
    backgroundColor: COLORS.lightRed,
  },
  filterButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  filterButtonTextActive: {
    color: COLORS.red,
  },
  filterIconOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingRight: SPACING.md,
    backgroundColor: COLORS.background,
    paddingLeft: SPACING.sm,
  },
  filterIconButton: {
    padding: SPACING.xs,
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  productItemContainer: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  storeName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  productCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
    position: 'relative',
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[200],
  },
  logoOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  logoText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  productSpecs: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  productPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  originalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textDecorationLine: 'line-through',
  },
  quantity: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  similarItemsButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
  },
  similarItemsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    padding: SPACING.xs,
  },
  addToCartButton: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
  },
  cartIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
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
  emptyIconContainer: {
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  calendarIcon: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  startExploringButton: {
    backgroundColor: COLORS.black,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  startExploringButtonText: {
    fontSize: FONTS.sizes.base,
    fontWeight: '400',
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  wishlistImage: {
    width: 160,
    height: 200,
  },
  welcomeText: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  loginPrompt: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#FF0055',
    borderRadius: 9999,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    width: '100%',
  },
  loginButtonText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    ...SHADOWS.md,
    elevation: 5,
    zIndex: 1001,
    marginTop: 8,
  },
  dropdownTriangle: {
    position: 'absolute',
    top: -8,
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
    zIndex: 1002,
  },
  dropdownOption: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minWidth: 150,
  },
  dropdownOptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  dropdownOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  allFiltersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  allFiltersModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
  },
  allFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    // borderBottomWidth: 1,
    // borderBottomColor: COLORS.gray[200],
  },
  allFiltersTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center'
  },
  allFiltersContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  filterSection: {
    marginBottom: SPACING.md,
  },
  filterSectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: '#0000000D',
  },
  filterChipActive: {
    backgroundColor: COLORS.lightRed,
  },
  filterChipText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  filterChipTextActive: {
    color: COLORS.red,
  },
  allFiltersFooter: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
    // borderTopWidth: 1,
    // borderTopColor: COLORS.gray[200],
  },
  resetButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '400',
    color: COLORS.text.primary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.red,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  checkboxContainer: {
    marginRight: SPACING.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray[400],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  productCheckboxContainer: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    zIndex: 10,
  },
  managementFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING['2xl'],
    paddingTop: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  selectAllText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.text.primary,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  footerButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  footerButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.text.primary,
  },
  deleteFooterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FFE1D4',
  },
  deleteFooterButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.red,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  deleteModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING['2xl'],
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  deleteModalConfirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.red,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default WishlistScreen;
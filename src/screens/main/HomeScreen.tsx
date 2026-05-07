import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Animated,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  Clipboard,
} from 'react-native';
import { launchCamera, launchImageLibrary, MediaType, ImagePickerResponse, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import RNFS from 'react-native-fs';
import { requestCameraPermission, requestPhotoLibraryPermission } from '../../utils/permissions';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { RootStackParamList, Product, Story } from '../../types';

import { SearchButton, NotificationBadge, ImagePickerModal } from '../../components';
import { usePlatformStore } from '../../store/platformStore';
import { useAppSelector } from '../../store/hooks';
import { translations } from '../../i18n/translations';
import HeadsetMicIcon from '../../assets/icons/HeadsetMicIcon';
import MenuIcon from '../../assets/icons/MenuIcon';
import TodayGgiguWordmarkIcon from '../../assets/icons/TodayGgiguWordmarkIcon';
import { useWishlistStatus } from '../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../hooks/useDeleteFromWishlistMutation';
import { useSocket } from '../../context/SocketContext';
import { inquiryApi } from '../../services/inquiryApi';
import { orderApi, Order, OrderItem } from '../../services/orderApi';
import Svg, { Path } from 'react-native-svg';
const LogoImage = require('../../assets/images/logo.png');

/** Figma TG_Main_S393: 393×3140, gutter 16 → content 361. Group 76728: H 472, left 16 */
const HOME_GUTTER = 16;
const HOME_CONTENT_WIDTH = Dimensions.get('window').width - HOME_GUTTER * 2;
const GUEST_PROMO_MIN_HEIGHT = 472;
const FIGMA_OVERLAY_05 = 'rgba(0,0,0,0.05)';
const FIGMA_OVERLAY_20 = 'rgba(0,0,0,0.2)';
/** Marketing / logistics accent from design reference */
const LOGISTICS_ORANGE = '#FF6600';

const { width: screenWidth } = Dimensions.get('window');
const width = screenWidth - SPACING.sm * 2; // Full width minus horizontal padding
// New In card sizing: 3 items per line, image should be less than 1/3 of mobile width
// Calculate: (width - left padding - right padding - 2 gaps) / 3
// Using smaller padding and gaps to ensure 3 items fit
const pagePadding = SPACING.sm * 2; // Left + right padding
const gaps = SPACING.xs * 2; // 2 gaps between 3 items
const NEW_IN_CARD_WIDTH = Math.floor((width - pagePadding - gaps) / 3);
const NEW_IN_CARD_HEIGHT = Math.floor(NEW_IN_CARD_WIDTH * 1.55);
const GRID_CARD_WIDTH = (width - SPACING.md * 2 - SPACING.md) / 2;

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const { user, isGuest, isAuthenticated } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || isGuest) {
      setRecentOrders([]);
      return;
    }
    (async () => {
      const res = await orderApi.getOrders({ page: 1, pageSize: 3 });
      if (cancelled) return;
      if (res.success && res.data?.orders) {
        setRecentOrders(res.data.orders);
      } else {
        setRecentOrders([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, isGuest, user?.id]);
  
  // import icon locally to avoid circular deps

  const { showToast } = useToast();
  
  // Use wishlist status hook to check if products are liked based on external IDs
  const { isProductLiked, refreshExternalIds, addExternalId, removeExternalId } = useWishlistStatus();
  
  // Get locale and platform
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { selectedPlatform, setSelectedPlatform } = usePlatformStore();
  
  // Add to wishlist mutation
  const { mutate: addToWishlist } = useAddToWishlistMutation({
    onSuccess: async (data) => {
      showToast(t('home.productAddedToWishlist'), 'success');
      // Immediately refresh external IDs to update heart icon color
      await refreshExternalIds();
    },
    onError: (error) => {
      showToast(error || t('home.failedToAddToWishlist'), 'error');
    },
  });

  // Delete from wishlist mutation
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation({
    onSuccess: async (data) => {
      showToast(t('home.productRemovedFromWishlist'), 'success');
      // Immediately update external IDs to update heart icon color
      await refreshExternalIds();
    },
    onError: (error) => {
      showToast(error || t('home.failedToRemoveFromWishlist'), 'error');
    },
  });
  
  // Toggle wishlist function
  const toggleWishlist = async (product: any) => {
    if (!user || isGuest) {
      showToast(t('home.pleaseLogin') || 'Please login first', 'warning');
      return;
    }

    // Get product external ID - prioritize externalId, never use MongoDB _id
    const externalId = 
      (product as any).externalId?.toString() ||
      (product as any).offerId?.toString() ||
      '';

    if (!externalId) {
      showToast(t('home.invalidProductId'), 'error');
      return;
    }

    const isLiked = isProductLiked(product);
    const source = (product as any).source || selectedPlatform || '1688';
    const country = locale || 'en';

    if (isLiked) {
      // Remove from wishlist - optimistic update (removes from state and AsyncStorage immediately)
      await removeExternalId(externalId);
      deleteFromWishlist(externalId);
    } else {
      // Add to wishlist - extract required fields from product
      const imageUrl = product.image || product.images?.[0] || '';
      const price = product.price || 0;
      const title = product.name || product.title || '';

      if (!imageUrl || !title || price <= 0) {
        showToast(t('home.invalidProductData'), 'error');
        return;
      }

      // Optimistic update - add to state and AsyncStorage immediately
      await addExternalId(externalId);
      addToWishlist({ offerId: externalId, platform: source });
    }
  };
  
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [newInGridProducts, setNewInGridProducts] = useState<any[]>([]);
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // New state for initial loading
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { unreadCount: socketUnreadCount, onUnreadCountUpdated } = useSocket(); // Get total unread count from socket context
  const [unreadCount, setUnreadCount] = useState(0); // Local state for unread count (from REST API)
  const platforms = ['1688', 'taobao', 'myCompany'];
  
  // Fetch unread counts from REST API when screen comes into focus (throttled)
  const unreadCountRef = useRef(0);
  const lastFetchTimeRef = useRef(0);
  const FETCH_THROTTLE_MS = 30000; // Only fetch every 30 seconds

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current < FETCH_THROTTLE_MS) {
        // Use cached value if recently fetched
        setUnreadCount(unreadCountRef.current);
        return;
      }

      const fetchUnreadCounts = async () => {
        try {
          lastFetchTimeRef.current = now;
          const response = await inquiryApi.getUnreadCounts();
          if (response.success && response.data) {
            unreadCountRef.current = response.data.totalUnread;
            setUnreadCount(response.data.totalUnread);
          }
        } catch (error) {
          // Failed to fetch unread counts - use cached value
          setUnreadCount(unreadCountRef.current);
        }
      };
      fetchUnreadCounts();
    }, []) // Remove onUnreadCountUpdated dependency to prevent frequent calls
  );
  
  // Update unread count from socket events (real-time updates)
  useEffect(() => {
    setUnreadCount(socketUnreadCount);
  }, [socketUnreadCount]);
  
  // Get categories for selected platform (using store instead)
  const getCompanyCategories = () => {
    // Mock data removed - using store instead
    return [];
  };
  
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false); // Track if scrolled past threshold

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const SCROLL_THRESHOLD = 5; // Very fast animated color change
  
  // State for scroll to top button
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  // Map language codes to flag emojis
  const getLanguageFlag = (locale: string) => {
    const flags: { [key: string]: string } = {
      'en': '🇺🇸',
      'ko': '🇰🇷',
      'zh': '🇨🇳',
    };
    return flags[locale] || '🇺🇸';
  };

  const isFetchingProductDetail = false;

  // Helper function to navigate to product detail
  const navigateToProductDetail = async (
    productId: string | number,
    source: string = selectedPlatform,
    country: string = locale
  ) => {
    // Navigate directly without fetching product detail
    navigation.navigate('ProductDetail', {
      productId: productId.toString(),
      source: source,
      country: country,
    });
  };
  useEffect(() => {
    loadData();
  }, []);

  // Never block the home UI if startup hooks stall (e.g. slow device / network)
  useEffect(() => {
    const id = setTimeout(() => setInitialLoading(false), 4000);
    return () => clearTimeout(id);
  }, []);

  const loadData = async () => {
    try {
      // Set initial loading state
      if (initialLoading) {
        setLoading(true);
      }
      
      // Set empty stories for now
      setStories([]);
    } catch (error) {
      // Error loading home data
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Helper function to convert image URI to base64
  const convertUriToBase64 = async (uri: string): Promise<string | null> => {
    try {
      // Remove file:// prefix if present
      const fileUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
      const base64 = await RNFS.readFile(fileUri, 'base64');
      return base64;
    } catch (error) {
      // console.error('Error converting URI to base64:', error);
      return null;
    }
  };

  const handleTakePhoto = async () => {
    // Request camera permission
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert(t('home.permissionRequired'), t('home.grantCameraPermission'));
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.1, // Very low quality to ensure <1.2MB for large images
      saveToPhotos: false,
      includeBase64: true,
    };

    launchCamera(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(t('home.error'), response.errorMessage || t('home.failedToTakePhoto'));
        return;
      }
      if (response.assets && response.assets[0]) {
        setImagePickerModalVisible(false);
        let base64Data = response.assets[0].base64;

        // Image is already compressed with quality: 0.5 in camera/gallery options
        // Only compress if base64 is not available (fallback case)
        if (!base64Data && response.assets[0].uri) {
          const { compressImageForSearch } = require('../../utils/imageCompression');
          const compressedBase64 = await compressImageForSearch(response.assets[0].uri);
          if (compressedBase64) {
            base64Data = compressedBase64;
          } else {
            base64Data = await convertUriToBase64(response.assets[0].uri);
          }
        }

        if (!base64Data) {
          showToast(t('home.imageDataUnavailable'), 'error');
          return;
        }

        navigation.navigate('ImageSearch', {
          imageUri: response.assets[0].uri || '',
          imageBase64: base64Data,
        });
      }
    });
  };

  const handleChooseFromGallery = async () => {
    // Request media library permission
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      Alert.alert(t('home.permissionRequired'), t('home.grantPhotoLibraryPermission'));
      return;
    }

    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.1, // Very low quality to ensure <1.2MB for large images
      selectionLimit: 1,
      includeBase64: true,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }
      if (response.errorCode) {
        Alert.alert(t('home.error'), response.errorMessage || t('home.failedToPickImage'));
        return;
      }
      if (response.assets && response.assets[0]) {
        setImagePickerModalVisible(false);
        let base64Data = response.assets[0].base64;

        // Image is already compressed with quality: 0.5 in camera/gallery options
        // Only compress if base64 is not available (fallback case)
        if (!base64Data && response.assets[0].uri) {
          const { compressImageForSearch } = require('../../utils/imageCompression');
          const compressedBase64 = await compressImageForSearch(response.assets[0].uri);
          if (compressedBase64) {
            base64Data = compressedBase64;
          } else {
            base64Data = await convertUriToBase64(response.assets[0].uri);
          }
        }

        if (!base64Data) {
          showToast(t('home.imageDataUnavailable'), 'error');
          return;
        }

        navigation.navigate('ImageSearch', {
          imageUri: response.assets[0].uri || '',
          imageBase64: base64Data,
        });
      }
    });
  };

  // const handleAddToCart = (product: Product) => {
  //   // For home screen items, variation ID is 0
  //   // addToCart(product, 1, undefined, undefined, 0);
  // };

  const handleImageSearch = async () => {
    // Navigate to camera screen
    navigation.navigate('ImageSearchCamera' as never);
  };

  const goGuestAuth = useCallback(() => {
    (navigation as any).navigate('Auth', { screen: 'Login', params: { fromProfile: true } });
  }, [navigation]);

  const renderGuestInsightGrid = () => (
    <View style={styles.guestInsightGrid}>
      <View style={styles.guestInsightRow}>
        <TouchableOpacity
          style={styles.guestInsightCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Search' as never)}
        >
          <Text style={styles.guestInsightTitle}>{t('home.guestInsightPopularTitle')}</Text>
          <View style={styles.guestInsightLine}>
            <Text style={styles.guestInsightRank}>1</Text>
            <Text style={styles.guestInsightItem} numberOfLines={1}>
              {t('home.guestInsightPopularItem1')}
            </Text>
            <Text style={styles.guestInsightUp}>{t('home.guestInsightPopularUp1')}</Text>
          </View>
          <View style={styles.guestInsightLine}>
            <Text style={styles.guestInsightRank}>2</Text>
            <Text style={styles.guestInsightItem} numberOfLines={1}>
              {t('home.guestInsightPopularItem2')}
            </Text>
            <Text style={styles.guestInsightUp}>{t('home.guestInsightPopularUp2')}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.guestInsightCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Search' as never)}
        >
          <Text style={styles.guestInsightTitle}>{t('home.guestInsightNewStoresTitle')}</Text>
          <Text style={styles.guestInsightMeta}>{t('home.guestInsightNewStoresMeta')}</Text>
          <View style={styles.guestInsightThumb} />
        </TouchableOpacity>
      </View>
      <View style={styles.guestInsightRow}>
        <TouchableOpacity
          style={styles.guestInsightCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Search' as never)}
        >
          <Text style={styles.guestInsightTitle}>{t('home.guestInsightMerchantsTitle')}</Text>
          <Text style={styles.guestInsightMeta}>{t('home.guestInsightMerchantsMeta')}</Text>
          <View style={styles.guestInsightThumb} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.guestInsightCard}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Search' as never)}
        >
          <Text style={styles.guestInsightTitle}>{t('home.guestInsightBestProductsTitle')}</Text>
          <Text style={styles.guestInsightMeta}>{t('home.guestInsightBestProductsMeta')}</Text>
          <View style={styles.guestInsightThumb} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGuestWelcomePanel = () => (
    <View style={styles.guestWelcomePanel}>
      <View style={styles.guestWelcomeHeadRow}>
        <Text style={styles.guestMascot} accessibilityLabel="mascot">
          🐵
        </Text>
        <Text style={styles.guestWelcomeHeadline}>{t('home.guestWelcomeHeadline')}</Text>
      </View>
      <View style={styles.guestQuickStrip}>
        {[
          { icon: 'receipt-outline', label: t('home.guestQuickOrders') },
          { icon: 'cart-outline', label: t('home.guestQuickCart') },
          { icon: 'heart-outline', label: t('home.guestQuickPick') },
          { icon: 'followedstore', label: t('home.guestQuickLikedStores') },
          { icon: 'history', label: t('home.guestQuickHistory') },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.guestQuickItem} onPress={goGuestAuth} activeOpacity={0.85}>
            <Icon name={item.icon} size={22} color={COLORS.text.primary} />
            <Text style={styles.guestQuickLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {[t('home.guestBullet1'), t('home.guestBullet2'), t('home.guestBullet3'), t('home.guestBullet4')].map((line) => (
        <View key={line} style={styles.guestBulletRow}>
          <Icon name="checkmark-circle" size={18} color={COLORS.red} />
          <Text style={styles.guestBulletText}>{line}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.guestPrimaryLoginBtn} activeOpacity={0.9} onPress={goGuestAuth}>
        <Text style={styles.guestPrimaryLoginText}>
          {String(t('home.guestPrimaryLogin')).replace('{brand}', t('home.logo'))}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGuestOrbGrid = () => {
    const keys = [
      'guestOrb1',
      'guestOrb2',
      'guestOrb3',
      'guestOrb4',
      'guestOrb5',
      'guestOrb6',
      'guestOrb7',
      'guestOrb8',
      'guestOrb9',
      'guestOrb10',
    ] as const;
    const icons: string[] = [
      'calendar-outline',
      'flash',
      'star-outline',
      'gift-outline',
      'basket-outline',
      'cube',
      'shield-checkmark-outline',
      'rocket',
      'airplane',
      'cart-outline',
    ];
    const cellW = HOME_CONTENT_WIDTH / 5;
    return (
      <View style={styles.guestOrbSection}>
        <View style={styles.guestOrbGrid}>
          {keys.map((k, i) => (
            <TouchableOpacity
              key={k}
              style={[styles.guestOrbCell, { width: cellW }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Category' as never)}
            >
              <View style={styles.guestOrbCircle}>
                <Icon name={icons[i]} size={22} color={COLORS.text.primary} />
              </View>
              <Text style={styles.guestOrbLabel} numberOfLines={2}>
                {t(`home.${k}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const openDial = useCallback((raw: string) => {
    const tel = `tel:${raw.replace(/[^0-9+]/g, '')}`;
    Linking.openURL(tel).catch(() => {});
  }, []);

  const formatTrackingDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  const formatPriceKRW = (n?: number) => {
    if (typeof n !== 'number' || !isFinite(n)) return '$00.00';
    return `₩${n.toLocaleString('ko-KR')}`;
  };

  const getOrderItemName = (item: OrderItem) => {
    return (
      (item.subjectMultiLang && (item.subjectMultiLang as any)[locale]) ||
      item.subjectTrans ||
      item.subject ||
      ''
    );
  };

  const getOrderCompanyName = (item: OrderItem) => {
    if (!item.companyName) return '';
    if (typeof item.companyName === 'string') return item.companyName;
    return (item.companyName as any)[locale] || (item.companyName as any).zh || (item.companyName as any).en || '';
  };

  const getStatusText = (order: Order) => {
    const map: Record<string, { en: string; ko: string; zh: string }> = {
      delivered: { en: 'Delivered', ko: '배송 완료', zh: '已签收' },
      shipped: { en: 'Shipped', ko: '발송됨', zh: '已发货' },
      processing: { en: 'Processing', ko: '처리중', zh: '处理中' },
      pending: { en: 'Pending', ko: '대기중', zh: '待处理' },
      paid: { en: 'Paid', ko: '결제완료', zh: '已支付' },
      cancelled: { en: 'Cancelled', ko: '취소됨', zh: '已取消' },
    };
    const key = (order.shippingStatus || order.orderStatus || '').toLowerCase();
    return map[key]?.[locale] || order.shippingStatus || order.orderStatus || '';
  };

  const handleCopyTracking = (tracking?: string) => {
    if (!tracking) return;
    Clipboard.setString(tracking);
    showToast(t('home.trackingCopied') || 'Tracking number copied', 'success');
  };

  const renderUserOrderSummaryCard = () => {
    if (!isAuthenticated || isGuest || !user) return null;

    const displayName = (user as any).userName || (user as any).users_id || user.name || user.email || 'User';
    const memberLabel =
      locale === 'ko' ? '회원'
      : locale === 'zh' ? '会员'
      : 'Member';
    const avatarUri =
      user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== ''
        ? user.avatar
        : 'https://via.placeholder.com/150';

    const primaryAddress: any =
      (user.addresses || []).find((a: any) => a.isDefault) ||
      (user.addresses || [])[0] ||
      null;

    const firstOrder = recentOrders[0];
    const secondOrder = recentOrders[1];

    const renderOrderBlock = (order: Order, isFirst: boolean) => {
      const item = order.items?.[0];
      const itemCount = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0;
      const total = order.totalAmount ?? order.firstTierCost?.totalKRW;
      const original = order.firstTierCost?.productTotalKRW;
      const status = getStatusText(order);
      const lastHistory =
        order.statusHistory && order.statusHistory.length > 0
          ? order.statusHistory[order.statusHistory.length - 1]
          : null;
      const trackingNumber = order.trackingNumber || '';
      const courierName = (order as any).courier || (order as any).carrier || 'XX택배';
      const itemsCountLabel =
        locale === 'ko' ? `총 : ${itemCount}건 상품`
        : locale === 'zh' ? `共：${itemCount}件商品`
        : `Total: ${itemCount} item(s)`;

      return (
        <View key={order.id} style={[styles.uosOrderBlock, !isFirst && styles.uosOrderBlockSpacer]}>
          <TouchableOpacity
            style={styles.uosProductRow}
            activeOpacity={0.85}
            onPress={() =>
              (navigation as any).navigate('OrderDetail', { orderId: order.id, order })
            }
          >
            <Image
              source={{ uri: item?.imageUrl || 'https://via.placeholder.com/72' }}
              style={styles.uosProductImage}
            />
            <View style={styles.uosProductTextCol}>
              <Text style={styles.uosProductTitle} numberOfLines={2}>
                {getOrderCompanyName(item) || getOrderItemName(item)}
              </Text>
              <View style={styles.uosProductMetaRow}>
                <Text style={styles.uosProductMetaLeft}>{itemsCountLabel}</Text>
                <View style={styles.uosProductPriceCol}>
                  <Text style={styles.uosProductPrice}>{formatPriceKRW(total)}</Text>
                  {original != null && original !== total && (
                    <Text style={styles.uosProductPriceStrike}>{formatPriceKRW(original)}</Text>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {isFirst && (trackingNumber || lastHistory) && (
            <>
              <View style={styles.uosTrackingRow}>
                <Text style={styles.uosTrackingCarrier}>
                  {courierName}: <Text style={styles.uosTrackingNumber}>{trackingNumber || '-'}</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => handleCopyTracking(trackingNumber)}
                  style={styles.uosCopyButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.uosCopyButtonText}>
                    {locale === 'ko' ? '복사' : locale === 'zh' ? '复制' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              {lastHistory && (
                <View style={styles.uosStatusBlock}>
                  <View style={styles.uosStatusHeaderRow}>
                    <View style={styles.uosStatusDot} />
                    <Text style={styles.uosStatusText}>{status}</Text>
                    <Text style={styles.uosStatusTime}>
                      {formatTrackingDate(lastHistory.timestamp || order.updatedAt)}
                    </Text>
                  </View>
                  {(lastHistory.content || lastHistory.detail || lastHistory.note) && (
                    <Text style={styles.uosStatusDetail} numberOfLines={3}>
                      {lastHistory.content || lastHistory.detail || lastHistory.note}
                    </Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.uosLogisticsMoreRow}
                activeOpacity={0.7}
                onPress={() =>
                  (navigation as any).navigate('OrderDetail', { orderId: order.id, order })
                }
              >
                <View style={styles.uosLogisticsMoreCircle} />
                <Text style={styles.uosLogisticsMoreText}>
                  {t('home.viewLogisticsDetails') || (
                    locale === 'ko' ? '查看更多物流明细' : locale === 'zh' ? '查看更多物流明细' : 'View more logistics details'
                  )}
                </Text>
              </TouchableOpacity>

              {primaryAddress && (
                <View style={styles.uosAddressBlock}>
                  <View style={styles.uosAddressRow}>
                    <Icon name="location-outline" size={16} color={LOGISTICS_ORANGE} />
                    <Text style={styles.uosAddressText} numberOfLines={2}>
                      {locale === 'ko' ? '배송지: ' : locale === 'zh' ? '送至 ' : 'Ship to: '}
                      {[primaryAddress.country, primaryAddress.city, primaryAddress.street]
                        .filter(Boolean)
                        .join(' ')}
                    </Text>
                  </View>
                  {(primaryAddress.name || primaryAddress.phone) && (
                    <Text style={styles.uosAddressContact}>
                      {locale === 'ko' ? '연락처: ' : locale === 'zh' ? '联系人：' : 'Contact: '}
                      {primaryAddress.name}
                      {primaryAddress.phone ? ` ${primaryAddress.phone}` : ''}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.uosViewAllRow}
            activeOpacity={0.7}
            onPress={() =>
              (navigation as any).navigate('OrderDetail', { orderId: order.id, order })
            }
          >
            <Text style={styles.uosViewAllText}>
              {t('home.viewAllOrderInfo') || (
                locale === 'ko' ? '전체 주문 정보 보기' : locale === 'zh' ? '查看全部订单信息' : 'View all order info'
              )}
            </Text>
            <Icon name="chevron-forward" size={14} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>
      );
    };

    const shortcuts: { key: string; label: string; icon: string; route?: string }[] = [
      { key: 'daily',     label: locale === 'ko' ? '일일특가' : locale === 'zh' ? '天天特卖' : 'Daily Deals',     icon: 'pricetag-outline' },
      { key: 'flash',     label: locale === 'ko' ? '번개주문' : locale === 'zh' ? '闪购直供' : 'Flash Order',      icon: 'flash-outline' },
      { key: 'mustpick',  label: locale === 'ko' ? '필수픽숍' : locale === 'zh' ? '必采好店' : 'Must Picks',       icon: 'storefront-outline' },
      { key: 'member',    label: locale === 'ko' ? '회원상점' : locale === 'zh' ? '会员店铺' : 'Member Shops',     icon: 'ribbon-outline' },
      { key: 'select',    label: locale === 'ko' ? '엄선상점' : locale === 'zh' ? '严选店铺' : 'Selected Shops',   icon: 'star-outline' },
      { key: 'factory',   label: locale === 'ko' ? '슈퍼팩토리' : locale === 'zh' ? '超级工厂' : 'Super Factory',  icon: 'construct-outline' },
      { key: 'official',  label: locale === 'ko' ? '공식직영' : locale === 'zh' ? '官方自营' : 'Official Store',   icon: 'business-outline' },
      { key: 'newin',     label: locale === 'ko' ? '신상품' : locale === 'zh' ? '新品订货' : 'New Arrivals',       icon: 'gift-outline' },
      { key: 'sports',    label: locale === 'ko' ? '스포츠' : locale === 'zh' ? '运动户外' : 'Sports',             icon: 'football-outline' },
      { key: 'digital',   label: locale === 'ko' ? '디지털' : locale === 'zh' ? '数码电脑' : 'Digital',            icon: 'game-controller-outline' },
    ];

    return (
      <View style={styles.uosOuter}>
        {/* User header */}
        <View style={styles.uosUserHeader}>
          <Image source={{ uri: avatarUri }} style={styles.uosAvatar} />
          <View style={styles.uosUserNameCol}>
            <Text style={styles.uosUserName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.uosUserMember}>{memberLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.uosInquiryBtn}
            onPress={() => (navigation as any).navigate('CustomerService')}
            activeOpacity={0.85}
          >
            <Icon name="chatbubble-ellipses-outline" size={14} color={COLORS.text.primary} />
            <Text style={styles.uosInquiryText}>
              {locale === 'ko' ? '상담문의' : locale === 'zh' ? '咨询问题' : 'Inquiry'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Order blocks (up to 2) */}
        {firstOrder
          ? renderOrderBlock(firstOrder, true)
          : (
            <View style={styles.uosEmptyState}>
              <Text style={styles.uosEmptyText}>
                {locale === 'ko' ? '진행 중인 주문이 없습니다.'
                  : locale === 'zh' ? '暂无进行中的订单。'
                  : 'No orders yet.'}
              </Text>
            </View>
          )}
        {secondOrder ? renderOrderBlock(secondOrder, false) : null}

        {/* Category shortcut grid */}
        <View style={styles.uosShortcutsGrid}>
          {shortcuts.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={styles.uosShortcutItem}
              activeOpacity={0.75}
              onPress={() => (navigation as any).navigate('Category')}
            >
              <View style={styles.uosShortcutCircle}>
                <Icon name={s.icon} size={20} color={COLORS.black} />
              </View>
              <Text style={styles.uosShortcutLabel} numberOfLines={1}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderGlobalLogisticsSection = () => {
    const steps: { icon: string; labelKey: string }[] = [
      { icon: 'checkmark-circle', labelKey: 'home.logisticsStep1' },
      { icon: 'payments', labelKey: 'home.logisticsStep2' },
      { icon: 'groups', labelKey: 'home.logisticsStep3' },
      { icon: 'cube', labelKey: 'home.logisticsStep4' },
      { icon: 'checkmark-done', labelKey: 'home.logisticsStep5' },
      { icon: 'document-text-outline', labelKey: 'home.logisticsStep6' },
      { icon: 'calendar-outline', labelKey: 'home.logisticsStep7' },
      { icon: 'boat', labelKey: 'home.logisticsStep8' },
    ];
    const row1 = steps.slice(0, 4);
    const row2 = [steps[7], steps[6], steps[5], steps[4]];

    const renderStep = (icon: string, label: string, key: string) => (
      <View key={key} style={styles.logisticsStepCol}>
        <View style={[styles.logisticsStepCircle, { backgroundColor: LOGISTICS_ORANGE }]}>
          <Icon name={icon} size={22} color={COLORS.white} />
        </View>
        <Text style={styles.logisticsStepLabel} numberOfLines={2}>
          {label}
        </Text>
      </View>
    );

    const renderRow = (rowSteps: typeof row1, arrow: 'forward' | 'back') => (
      <View style={styles.logisticsRow}>
        {rowSteps.map((s, idx) => (
          <React.Fragment key={s.labelKey}>
            {renderStep(s.icon, t(s.labelKey), s.labelKey)}
            {idx < rowSteps.length - 1 && (
              <Text style={styles.logisticsArrow}>{arrow === 'forward' ? '→' : '←'}</Text>
            )}
          </React.Fragment>
        ))}
      </View>
    );

    const cards = [
      { title: 'home.logisticsCard1Title', d1: 'home.logisticsCard1D1', d2: 'home.logisticsCard1D2', icon: 'filter' },
      { title: 'home.logisticsCard2Title', d1: 'home.logisticsCard2D1', d2: 'home.logisticsCard2D2', icon: 'cart-outline' },
      { title: 'home.logisticsCard3Title', d1: 'home.logisticsCard3D1', d2: 'home.logisticsCard3D2', icon: 'document-text-outline' },
      { title: 'home.logisticsCard4Title', d1: 'home.logisticsCard4D1', d2: 'home.logisticsCard4D2', icon: 'rocket' },
    ];

    return (
      <View style={styles.logisticsSection}>
        <Text style={[styles.logisticsSectionTitleOrange, { color: LOGISTICS_ORANGE }]}>
          {t('home.logisticsTitleOrange')}
        </Text>
        <Text style={styles.logisticsSectionTitleBlack}>{t('home.logisticsTitleBlack')}</Text>
        {renderRow(row1, 'forward')}
        <View style={{ height: SPACING.md }} />
        {renderRow(row2, 'back')}
        <View style={styles.logisticsCardsGrid}>
          {cards.map((c) => (
            <TouchableOpacity
              key={c.title}
              style={styles.logisticsServiceCard}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('CustomerService' as never)}
            >
              <View style={[styles.logisticsServiceIconRing, { borderColor: LOGISTICS_ORANGE }]}>
                <Icon name={c.icon} size={22} color={LOGISTICS_ORANGE} />
              </View>
              <View style={styles.logisticsServiceTextCol}>
                <Text style={styles.logisticsServiceTitle}>{t(c.title)}</Text>
                <Text style={styles.logisticsServiceDesc}>{t(c.d1)}</Text>
                <Text style={styles.logisticsServiceDesc}>{t(c.d2)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderIntegratedServicesSection = () => {
    const go = () => navigation.navigate('CustomerService' as never);

    type CornerKey = 'tl' | 'tr' | 'bl' | 'br';
    const CORNER_TRANSLATE: Record<CornerKey, { x: number; y: number }> = {
      tl: { x: 35.2, y: 31.2 },
      tr: { x: -35.2, y: 31.2 },
      bl: { x: 35.2, y: -31.2 },
      br: { x: -35.2, y: -31.2 },
    };

    const cell = (labelKey: string, icon: string | React.ReactNode, large?: boolean, corner?: CornerKey) => (
      <TouchableOpacity
        style={[styles.integratedCell, large && styles.integratedCellLarge]}
        onPress={go}
        activeOpacity={0.88}
      >
        <View style={[styles.integratedCellInner, large && styles.integratedCellInnerLarge]}>
          {!large && corner && (
            <View
              style={[
                styles.integratedCornerInsetGroup,
                { transform: [{ translateX: CORNER_TRANSLATE[corner].x }, { translateY: CORNER_TRANSLATE[corner].y }] },
              ]}
              pointerEvents="none"
            >
              <View style={styles.integratedCornerOverlay} />
              <View style={styles.integratedCornerInsetContent}>
                {typeof icon === 'string'
                  ? <Icon name={icon} size={24} color={LOGISTICS_ORANGE} />
                  : icon}
                <Text style={styles.integratedCellLabel} numberOfLines={3}>
                  {t(labelKey)}
                </Text>
              </View>
            </View>
          )}
          {(large || !corner) && (typeof icon === 'string'
            ? <Icon name={icon} size={large ? 28 : 24} color={LOGISTICS_ORANGE} />
            : icon)}
          {(large || !corner) && (
            <Text style={[styles.integratedCellLabel, large && styles.integratedCellLabelLarge]} numberOfLines={3}>
              {t(labelKey)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );

    const ParcelTrackingIcon = (
      <Svg width={32} height={32} viewBox="0 0 48 48" fill="none">
        <Path
          d="M6.50014 36.7031V13.3031L3.30014 6.50312C3.00014 5.83646 2.97514 5.16146 3.22514 4.47812C3.47514 3.79479 3.93348 3.30313 4.60014 3.00313C5.26681 2.70312 5.94181 2.66979 6.62514 2.90313C7.30848 3.13646 7.80014 3.58646 8.10014 4.25313L12.3001 13.2031H35.7001L39.9001 4.25313C40.2001 3.58646 40.6918 3.13646 41.3751 2.90313C42.0585 2.66979 42.7335 2.70312 43.4001 3.00313C44.0668 3.30313 44.5168 3.79479 44.7501 4.47812C44.9835 5.16146 44.9501 5.83646 44.6501 6.50312L41.5001 13.3031V36.7031C41.5001 38.2031 40.9918 39.4615 39.9751 40.4781C38.9585 41.4948 37.7001 42.0031 36.2001 42.0031H11.8001C10.3001 42.0031 9.04181 41.4948 8.02514 40.4781C7.00848 39.4615 6.50014 38.2031 6.50014 36.7031ZM19.9001 27.1031H28.1001C28.8335 27.1031 29.4501 26.8531 29.9501 26.3531C30.4501 25.8531 30.7001 25.2365 30.7001 24.5031C30.7001 23.7698 30.4501 23.1365 29.9501 22.6031C29.4501 22.0698 28.8335 21.8031 28.1001 21.8031H19.9001C19.1668 21.8031 18.5501 22.0698 18.0501 22.6031C17.5501 23.1365 17.3001 23.7698 17.3001 24.5031C17.3001 25.2365 17.5501 25.8531 18.0501 26.3531C18.5501 26.8531 19.1668 27.1031 19.9001 27.1031Z"
          fill={LOGISTICS_ORANGE}
        />
      </Svg>
    );

    const CustomsCodeIcon = (
      <Svg width={32} height={32} viewBox="0 0 48 48" fill="none">
        <Path
          d="M10.6516 41.3031V43.1531C10.6516 43.8865 10.3932 44.5115 9.87656 45.0281C9.3599 45.5448 8.7349 45.8031 8.00156 45.8031H6.00156C5.26823 45.8031 4.64323 45.5448 4.12656 45.0281C3.6099 44.5115 3.35156 43.8865 3.35156 43.1531V38.6531C3.35156 37.9198 3.6099 37.2948 4.12656 36.7781C4.64323 36.2615 5.26823 36.0031 6.00156 36.0031H42.0016C42.7349 36.0031 43.3599 36.2615 43.8766 36.7781C44.3932 37.2948 44.6516 37.9198 44.6516 38.6531V43.1531C44.6516 43.8865 44.3932 44.5115 43.8766 45.0281C43.3599 45.5448 42.7349 45.8031 42.0016 45.8031H40.0016C39.2682 45.8031 38.6432 45.5448 38.1266 45.0281C37.6099 44.5115 37.3516 43.8865 37.3516 43.1531V41.3031H27.6516V43.1531C27.6516 43.8865 27.3932 44.5115 26.8766 45.0281C26.3599 45.5448 25.7349 45.8031 25.0016 45.8031H23.0016C22.2682 45.8031 21.6432 45.5448 21.1266 45.0281C20.6099 44.5115 20.3516 43.8865 20.3516 43.1531V41.3031H10.6516ZM12.0016 32.0031C11.2682 32.0031 10.6432 31.7448 10.1266 31.2281C9.6099 30.7115 9.35156 30.0865 9.35156 29.3531V5.35313C9.35156 4.61979 9.6099 3.99479 10.1266 3.47813C10.6432 2.96146 11.2682 2.70312 12.0016 2.70312H36.0016C36.7349 2.70312 37.3599 2.96146 37.8766 3.47813C38.3932 3.99479 38.6516 4.61979 38.6516 5.35313V29.3531C38.6516 30.0865 38.3932 30.7115 37.8766 31.2281C37.3599 31.7448 36.7349 32.0031 36.0016 32.0031H12.0016ZM28.0016 16.0031C28.7349 16.0031 29.3599 15.7448 29.8766 15.2281C30.3932 14.7115 30.6516 14.0865 30.6516 13.3531C30.6516 12.6198 30.3932 11.9948 29.8766 11.4781C29.3599 10.9615 28.7349 10.7031 28.0016 10.7031H20.0016C19.2682 10.7031 18.6432 10.9615 18.1266 11.4781C17.6099 11.9948 17.3516 12.6198 17.3516 13.3531C17.3516 14.0865 17.6099 14.7115 18.1266 15.2281C18.6432 15.7448 19.2682 16.0031 20.0016 16.0031H28.0016Z"
          fill={LOGISTICS_ORANGE}
        />
      </Svg>
    );

    return (
      <View style={styles.integratedSection}>
        <Text style={[styles.logisticsSectionTitleOrange, { color: LOGISTICS_ORANGE }]}>
          {t('home.integratedTitleOrange')}
        </Text>
        <Text style={styles.logisticsSectionTitleBlack}>{t('home.integratedTitleBlack')}</Text>
        <View style={styles.integratedPlus}>
          <View style={styles.integratedCenterOrangeStandalone} pointerEvents="none" />
          <View style={[styles.integratedCornerSlot, { top: 0, left: 0 }]}>
            {cell('home.integratedBtn1', ParcelTrackingIcon, false, 'tl')}
          </View>
          <View style={[styles.integratedCornerSlot, { top: 0, right: 0 }]}>
            {cell('home.integratedBtn2', CustomsCodeIcon, false, 'tr')}
          </View>
          <View style={styles.integratedCenterSlot}>
            <TouchableOpacity style={styles.integratedCenterWhiteCard} onPress={go} activeOpacity={0.88}>
              <View style={styles.integratedCenterContent}>
                <Image
                  source={require('../../assets/icons/kcs-logo.png')}
                  style={styles.integratedUnipassLogo}
                  resizeMode="contain"
                />
                <Text style={[styles.integratedCellLabel, styles.integratedCellLabelLarge]} numberOfLines={3}>
                  {t('home.integratedBtn3')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={[styles.integratedCornerSlot, { bottom: 0, left: 0 }]}>
            {cell('home.integratedBtn4', 'person-outline', false, 'bl')}
          </View>
          <View style={[styles.integratedCornerSlot, { bottom: 0, right: 0 }]}>
            {cell('home.integratedBtn5', 'code-slash-outline', false, 'br')}
          </View>
        </View>
      </View>
    );
  };

  /** CS Center 하단: 영업시간 → 빠른 연락 → 환율 안내 → 배송 (로그인 화면과 동일 UI, 게스트 하단에도 사용) */
  const renderCsCenterFooter = () => (
    <>
      <Text style={styles.csHours}>{t('home.csHoursLine1')}</Text>
      <Text style={styles.csHours}>{t('home.csHoursLine2')}</Text>
      <Text style={[styles.csHours, styles.csHoursAccent]}>{t('home.csHoursLine3')}</Text>

      <View style={styles.csQuickRow}>
        {([
          {  title: 'home.csKakaoTitle', image: require('../../assets/icons/cs-kakao.png') },
          { title: 'home.csWechatTitle', image: require('../../assets/icons/cs-wechat.png') },
          { title: 'home.csOneTitle', image: require('../../assets/icons/cs-one.png') },
        ] as Array<{ bg: string; title: string; icon?: string; image?: any }>).map((q) => (
          <TouchableOpacity
            key={q.title}
            style={styles.csQuickCol}
            onPress={() => navigation.navigate('CustomerService' as never)}
            activeOpacity={0.88}
          >
            <View style={[styles.csQuickCircle, { backgroundColor: q.bg }]}>
              {q.image ? (
                <Image source={q.image} style={styles.csQuickIconImage} resizeMode="contain" />
              ) : (
                <Icon name={q.icon!} size={26} color={q.bg === '#FEE500' ? COLORS.black : COLORS.white} />
              )}
            </View>
            <Text style={styles.csQuickTitle}>{t(q.title)}</Text>
            <Text style={styles.csQuickGo}>{t('home.csGo')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.csFxCard}>
        <View style={styles.csFxHeader}>
          <Svg width={20} height={20} viewBox="0 0 16 16" fill="none">
            <Path
              d="M6.16354 10.2302H7.78021C8.02465 10.2302 8.23299 10.1441 8.40521 9.97188C8.57743 9.79965 8.66354 9.59132 8.66354 9.34688C8.66354 9.10243 8.57743 8.8941 8.40521 8.72188C8.23299 8.54965 8.02465 8.46354 7.78021 8.46354H6.19688L6.44688 8.21354C6.61354 8.04688 6.69688 7.84132 6.69688 7.59688C6.69688 7.35243 6.61354 7.14688 6.44688 6.98021C6.28021 6.81354 6.07465 6.73021 5.83021 6.73021C5.58576 6.73021 5.38021 6.81354 5.21354 6.98021L3.44688 8.74688C3.2691 8.92465 3.18021 9.13021 3.18021 9.36354C3.18021 9.59688 3.2691 9.80243 3.44688 9.98021L5.21354 11.7469C5.38021 11.9135 5.58576 11.9969 5.83021 11.9969C6.07465 11.9969 6.28021 11.9135 6.44688 11.7469C6.61354 11.5802 6.69688 11.3747 6.69688 11.1302C6.69688 10.8858 6.61354 10.6802 6.44688 10.5135L6.16354 10.2302ZM9.79688 7.53021L9.54688 7.78021C9.38021 7.94688 9.29688 8.15243 9.29688 8.39688C9.29688 8.64132 9.38021 8.84688 9.54688 9.01354C9.71354 9.18021 9.9191 9.26354 10.1635 9.26354C10.408 9.26354 10.6135 9.18021 10.7802 9.01354L12.5469 7.24688C12.7247 7.0691 12.8135 6.86354 12.8135 6.63021C12.8135 6.39688 12.7247 6.19132 12.5469 6.01354L10.7802 4.24688C10.6135 4.08021 10.408 3.99688 10.1635 3.99688C9.9191 3.99688 9.71354 4.08021 9.54688 4.24688C9.38021 4.41354 9.29688 4.6191 9.29688 4.86354C9.29688 5.10799 9.38021 5.31354 9.54688 5.48021L9.83021 5.76354H8.21354C7.9691 5.76354 7.76076 5.84965 7.58854 6.02188C7.41632 6.1941 7.33021 6.40243 7.33021 6.64688C7.33021 6.89132 7.41632 7.09965 7.58854 7.27188C7.76076 7.4441 7.9691 7.53021 8.21354 7.53021H9.79688ZM7.99688 15.1969C6.99688 15.1969 6.06076 15.008 5.18854 14.6302C4.31632 14.2524 3.55521 13.7385 2.90521 13.0885C2.25521 12.4385 1.74132 11.6774 1.36354 10.8052C0.985764 9.93299 0.796875 8.99688 0.796875 7.99688C0.796875 6.99688 0.985764 6.05799 1.36354 5.18021C1.74132 4.30243 2.25521 3.53854 2.90521 2.88854C3.55521 2.23854 4.31632 1.72743 5.18854 1.35521C6.06076 0.982986 6.99688 0.796875 7.99688 0.796875C8.99688 0.796875 9.93576 0.982986 10.8135 1.35521C11.6913 1.72743 12.4552 2.23854 13.1052 2.88854C13.7552 3.53854 14.2663 4.30243 14.6385 5.18021C15.0108 6.05799 15.1969 6.99688 15.1969 7.99688C15.1969 8.99688 15.0108 9.93299 14.6385 10.8052C14.2663 11.6774 13.7552 12.4385 13.1052 13.0885C12.4552 13.7385 11.6913 14.2524 10.8135 14.6302C9.93576 15.008 8.99688 15.1969 7.99688 15.1969ZM7.99688 13.4302C9.5191 13.4302 10.8052 12.9052 11.8552 11.8552C12.9052 10.8052 13.4302 9.5191 13.4302 7.99688C13.4302 6.47465 12.9052 5.18854 11.8552 4.13854C10.8052 3.08854 9.5191 2.56354 7.99688 2.56354C6.47465 2.56354 5.18854 3.08854 4.13854 4.13854C3.08854 5.18854 2.56354 6.47465 2.56354 7.99688C2.56354 9.5191 3.08854 10.8052 4.13854 11.8552C5.18854 12.9052 6.47465 13.4302 7.99688 13.4302Z"
              fill={LOGISTICS_ORANGE}
            />
          </Svg>
          <Text style={[styles.csFxHeaderTitle, { color: LOGISTICS_ORANGE }]}>{t('home.csFxTitle')}</Text>
        </View>
        {[
          ['home.csFxRow1L', 'home.csFxRow1R'],
          ['home.csFxRow2L', 'home.csFxRow2R'],
          ['home.csFxRow3L', 'home.csFxRow3R'],
          ['home.csFxRow4L', 'home.csFxRow4R'],
        ].map(([l, r]) => (
          <View key={l} style={styles.csFxRow}>
            <Text style={styles.csFxLabel}>{t(l)}</Text>
            <Text style={styles.csFxValue}>{t(r)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.csShipCard}>
        <View style={styles.csShipHeader}>
          <Image
            source={require('../../assets/icons/boat-plane.png')}
            style={styles.csShipHeaderIcon}
            resizeMode="contain"
          />
          <Text style={styles.csShipHeaderTitle}>{t('home.csShipTitle')}</Text>
        </View>
        <View style={styles.csShipBody}>
          <View style={styles.csShipLeft}>
            <Text style={styles.csShipWeek}>{t('home.csShipWeek')}</Text>
            <Text style={styles.csShipWeekSub}>{t('home.csShipWeekSub')}</Text>
          </View>
          <View style={styles.csShipRight}>
            <Text style={styles.csShipLine}>{t('home.csShipAir')}</Text>
            <Text style={styles.csShipLine}>{t('home.csShipPyeong')}</Text>
            <Text style={styles.csShipLine}>{t('home.csShipIncheon')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.csShipFooter} activeOpacity={0.85}>
          <Text style={styles.csShipFooterText}>{t('home.csShipMonth')}</Text>
          <Icon name="chevron-forward" size={18} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>
    </>
  );

  const renderCsCenterSection = () => {
    const phoneRow = (phone: string, tag: string) => (
      <TouchableOpacity style={styles.csPhoneRow} onPress={() => openDial(phone)} activeOpacity={0.85}>
        <Icon name="call" size={18} color={COLORS.black} />
        <View style={styles.csPhoneTextCol}>
          <Text style={styles.csPhoneNumber}>{phone}</Text>
          <Text style={styles.csPhoneTag}>{tag}</Text>
        </View>
      </TouchableOpacity>
    );

    return (
      <View style={styles.csSection}>
        <Text style={[styles.csTitleOrange, { color: LOGISTICS_ORANGE }]}>{t('home.csTitleOrange')}</Text>
        <Text style={styles.csTitleBlack}>{t('home.csTitleBlack')}</Text>
        <Text style={styles.csSubtitle} >
          <Text>{t('home.csSubtitleBefore')}</Text>
          <Text style={{ color: LOGISTICS_ORANGE, fontWeight: '700' }}>{t('home.csSubtitleHighlight')}</Text>
          <Text>{t('home.csSubtitleAfter')}</Text>
        </Text>

        <View style={styles.csCardsRow}>
          <View style={[styles.csCityCard, styles.csCityCardTall]}>
            <Text style={styles.csCityName}>{t('home.csWeihai')}</Text>
            {phoneRow(t('home.csPhoneWeihai1'), t('home.csTagWeihai1'))}
            {phoneRow(t('home.csPhoneWeihai2'), t('home.csTagWeihai2'))}
          </View>
          <View style={styles.csCityCard}>
            <Text style={styles.csCityName}>{t('home.csYiwu')}</Text>
            {phoneRow(t('home.csPhoneYiwu'), t('home.csTagYiwu'))}
          </View>
          <View style={styles.csCityCard}>
            <Text style={styles.csCityName}>{t('home.csGwangju')}</Text>
            {phoneRow(t('home.csPhoneGwangju'), t('home.csTagGwangju'))}
          </View>
        </View>

        {renderCsCenterFooter()}
      </View>
    );
  };

  const renderHeader = () => {
    const wordmark = String(t('home.guestLogoWordmark'));
    const taglineFull = String(t('home.guestPartnerTagline'));
    const tag1688 = '1688';
    const tag1688Idx = taglineFull.indexOf(tag1688);
    const useTodayGgiguMark = wordmark.toLowerCase() === 'todayggigu';

    const renderTodayGgiguMark = () => {
      if (!useTodayGgiguMark) {
        return (
          <Text style={styles.guestWordmarkPlain} numberOfLines={1}>
            {wordmark}
          </Text>
        );
      }
      return (
        <TodayGgiguWordmarkIcon
          style={styles.guestWordmarkImage}
          accessibilityLabel={wordmark}
        />
      );
    };

    const renderTagline = () =>
      tag1688Idx >= 0 ? (
        <Text style={styles.homeGuestBrandSubDark} numberOfLines={2}>
          {tag1688Idx > 0 ? taglineFull.slice(0, tag1688Idx) : ''}
          <Text style={styles.homeGuestBrand1688}>{taglineFull.slice(tag1688Idx, tag1688Idx + tag1688.length)}</Text>
          {taglineFull.slice(tag1688Idx + tag1688.length)}
        </Text>
      ) : (
        <Text style={styles.homeGuestBrandSubDark} numberOfLines={2}>
          {taglineFull}
        </Text>
      );

    return (
      <View style={[styles.header, styles.headerGuestLight]}>
        <View style={styles.headerContent}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent={Platform.OS === 'android'}
          />
          <View style={styles.headerGuestTop}>
            <TouchableOpacity
              style={styles.headerGuestMenuBtn}
              onPress={() => navigation.navigate('Category' as never)}
              activeOpacity={0.85}
            >
              <MenuIcon width={26} height={26} color={COLORS.black} />
            </TouchableOpacity>
            <View style={styles.homeGuestBrandCenter}>
              {renderTodayGgiguMark()}
              {renderTagline()}
            </View>
            <View style={styles.homeGuestHeaderRight}>
              <TouchableOpacity
                style={styles.headerGuestIconBtn}
                onPress={() => navigation.navigate('LanguageSettings' as never)}
                activeOpacity={0.85}
              >
                <Text style={styles.flagText}>{getLanguageFlag(locale)}</Text>
              </TouchableOpacity>
              <NotificationBadge
                customIcon={<HeadsetMicIcon width={26} height={26} color={COLORS.black} />}
                count={unreadCount}
                badgeColor={LOGISTICS_ORANGE}
                onPress={() => navigation.navigate('CustomerService' as never)}
              />
            </View>
          </View>
          <View style={styles.searchButtonContainer}>
            <SearchButton
              placeholder={t('home.guestSearchPlaceholder')}
              onPress={() => navigation.navigate('Search' as never)}
              onCameraPress={handleImageSearch}
              style={styles.searchButtonStyle}
              isHomepage={true}
              hideMenu
              prominentBorder
              showPlaceholderAsBody
              cameraLeading
            />
          </View>
        </View>
      </View>
    );
  };


  // Handle scroll event to detect when user reaches the end
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        // Safety check for event
        if (!event || !event.nativeEvent) return;
        
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        
        // Safety checks for scroll properties
        if (!layoutMeasurement || !contentOffset || !contentSize) return;
        
        const scrollPosition = contentOffset.y;

        // Update isScrolled state based on threshold
        if (scrollPosition > SCROLL_THRESHOLD && !isScrolled) {
          setIsScrolled(true);
        } else if (scrollPosition <= SCROLL_THRESHOLD && isScrolled) {
          setIsScrolled(false);
        }
        
        if (scrollPosition > 300 && !showScrollToTop) {
          setShowScrollToTop(true);
          Animated.timing(scrollToTopOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else if (scrollPosition <= 300 && showScrollToTop) {
          Animated.timing(scrollToTopOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setShowScrollToTop(false));
        }
        
      }
    }
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>{t('home.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.white, 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackgroundFixed}
        pointerEvents="none"
      />
      <View style={styles.fixedTopBars}>
        <View style={styles.homeHeaderWhiteShell}>
          {renderHeader()}
        </View>
      </View>
      
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.guestAboveFold}>
            {renderGuestInsightGrid()}
          </View>
          {!(user && !isGuest) && (
            <View style={styles.guestAboveFold}>
              {renderGuestWelcomePanel()}
              {renderGuestOrbGrid()}
            </View>
          )}
          {/* {renderQuickCategories()} */}
          {isAuthenticated && !isGuest && user && renderUserOrderSummaryCard()}
          {renderGlobalLogisticsSection()}
          {renderIntegratedServicesSection()}
          {renderCsCenterSection()}
          {/* {renderTrendingProducts()} */}
          {/* {renderPopularCategories()} */}
          {/* {renderPromoCards()} */}
          {/* {renderNewInCards()} */}
        </View>
      </Animated.ScrollView>
      
      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <Animated.View
          style={[
            styles.scrollToTopButton,
            { opacity: scrollToTopOpacity }
          ]}
        >
          <TouchableOpacity
            onPress={scrollToTop}
            style={styles.scrollToTopTouchable}
            activeOpacity={0.8}
          >
            <Icon name="chevron-up" size={28} color={COLORS.black} />
          </TouchableOpacity>
        </Animated.View>
      )}
      
      <ImagePickerModal
        visible={imagePickerModalVisible}
        onClose={() => setImagePickerModalVisible(false)}
        onTakePhoto={handleTakePhoto}
        onChooseFromGallery={handleChooseFromGallery}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackgroundFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 650, // Shorter gradient coverage
    zIndex: 0,
  },
  gradientFill: {
    flex: 1,
  },
  scrollView: {
    minHeight: '100%',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 32,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  fixedTopBars: {
    backgroundColor: 'transparent',
    zIndex: 10,
    // marginBottom: -80,
  },
  homeHeaderWhiteShell: {
    backgroundColor: COLORS.white,
  },
  headerPlaceholder: {
    backgroundColor: COLORS.white,
  },
  contentWrapper: {
    backgroundColor: COLORS.background,
    marginBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    fontWeight: '500',
    marginTop: SPACING.md,
  },
  header: {
    zIndex: 10,
    paddingHorizontal: HOME_GUTTER,
    // SafeAreaView already clears the status bar; keep modest insets (tuned for Android emulator + iOS)
    paddingTop: Platform.OS === 'android' ? 12 : 26,
    paddingBottom: SPACING.sm,
  },
  headerGuestLight: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'android' ? 10 : 16,
    paddingBottom: SPACING.sm,
  },
  headerContent: {
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  menuButtonContainer: {
    // width: 80, // Fixed width to balance with right side
    alignItems: 'flex-start',
  },
  logoContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  homeMemberHeaderMain: {
    marginLeft: 0,
  },
  homeHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  homeHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  homeHeaderAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  homeHeaderTitleTexts: {
    flex: 1,
    minWidth: 0,
    marginLeft: SPACING.sm,
  },
  homeLoginCta: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'android'
      ? {
          minHeight: 48,
          minWidth: 88,
          paddingHorizontal: SPACING.md + 2,
          borderRadius: BORDER_RADIUS['2xl'],
          elevation: 3,
        }
      : {}),
  },
  homeLoginCtaText: {
    fontSize: Platform.OS === 'android' ? FONTS.sizes.md : FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.red,
  },
  guestWordmarkImage: {
    alignSelf: 'center',
    width: Math.min(200, screenWidth - 148),
    height: 30,
  },
  guestWordmarkPlain: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.black,
    textAlign: 'center',
  },
  homeGuestBrandSubDark: {
    marginTop: 4,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    color: COLORS.black,
    textAlign: 'center',
    lineHeight: 18,
  },
  homeGuestBrand1688: {
    color: LOGISTICS_ORANGE,
    fontWeight: '800',
  },
  headerGuestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerGuestMenuBtn: {
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  homeGuestBrandCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  homeGuestBrandTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  homeGuestBrandSub: {
    marginTop: 2,
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 18,
  },
  homeGuestHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerGuestIconBtn: {
    padding: SPACING.xs,
  },
  guestAboveFold: {
    paddingHorizontal: HOME_GUTTER,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  guestInsightGrid: {
    marginBottom: SPACING.md,
  },
  guestInsightRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  guestInsightCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    minHeight: 112,
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_05,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
    }),
  },
  guestInsightTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  guestInsightLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  guestInsightRank: {
    width: 18,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  guestInsightItem: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  guestInsightUp: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    fontWeight: '800',
  },
  guestInsightMeta: {
    marginTop: SPACING.xs,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  guestInsightThumb: {
    marginTop: SPACING.sm,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[200],
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_05,
  },
  /** Figma Group 76728 — full-width inside 16px gutter, min height 472 */
  guestWelcomePanel: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.lightRed,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_20,
    minHeight: GUEST_PROMO_MIN_HEIGHT,
  },
  guestWelcomeHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  guestMascot: {
    fontSize: 40,
    lineHeight: 44,
  },
  guestWelcomeHeadline: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  guestQuickStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_05,
  },
  guestQuickItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  guestQuickLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  guestBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 8,
  },
  guestBulletText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  guestPrimaryLoginBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: COLORS.red,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },
  guestPrimaryLoginText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: FONTS.sizes.md,
  },
  guestOrbSection: {
    marginBottom: SPACING.lg,
  },
  guestOrbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  guestOrbCell: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  guestOrbCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_05,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
    }),
  },
  guestOrbLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
    paddingHorizontal: 2,
    lineHeight: 13,
  },
  logisticsSection: {
    paddingHorizontal: HOME_GUTTER,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  logisticsSectionTitleOrange: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
  },
  logisticsSectionTitleBlack: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SPACING.md,
  },
  logisticsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  logisticsStepCol: {
    width: 76,
    alignItems: 'center',
  },
  logisticsStepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logisticsStepLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'center',
    lineHeight: 13,
  },
  logisticsArrow: {
    fontSize: FONTS.sizes.sm,
    color: LOGISTICS_ORANGE,
    fontWeight: '700',
    marginTop: 14,
    paddingHorizontal: 2,
  },
  logisticsCardsGrid: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  logisticsServiceCard: {
    width: (HOME_CONTENT_WIDTH - SPACING.sm) / 2,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_05,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
    }),
  },
  logisticsServiceIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  logisticsServiceTextCol: {
    flex: 1,
    minWidth: 0,
  },
  logisticsServiceTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: 4,
  },
  logisticsServiceDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  integratedSection: {
    paddingHorizontal: HOME_GUTTER,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  integratedPlus: {
    marginTop: SPACING.md,
    alignSelf: 'center',
    width: HOME_CONTENT_WIDTH,
    aspectRatio: 341 / 316,
    position: 'relative',
  },
  integratedRowSpread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  integratedCenterSlot: {
    position: 'absolute',
    top: `${(74 / 316) * 100}%`,
    left: `${(94 / 341) * 100}%`,
    width: `${(152 / 341) * 100}%`,
    height: `${(152 / 316) * 100}%`,
    zIndex: 2,
  },
  integratedCornerSlot: {
    position: 'absolute',
    width: `${(120 / 341) * 100}%`,
    height: `${(120 / 316) * 100}%`,
    zIndex: 1,
  },
  integratedCell: {
    width: '100%',
    height: '100%',
  },
  integratedCellLarge: {
    width: '100%',
    height: '100%',
  },
  integratedCellInner: {
    flex: 1,
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
    borderRadius: 8,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integratedCornerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: LOGISTICS_ORANGE,
    borderRadius: 8,
    zIndex: 0,
  },
  integratedCenterOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: LOGISTICS_ORANGE,
    borderRadius: 8,
    zIndex: 5,
  },
  integratedCenterOrangeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
    borderRadius: 8,
    zIndex: 2,
  },
  integratedCenterOrangeStandalone: {
    position: 'absolute',
    top: `${(74 / 316) * 100}%`,
    left: `${(94 / 341) * 100}%`,
    width: `${(152 / 341) * 100}%`,
    height: `${(152 / 316) * 100}%`,
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
    borderRadius: 8,
    zIndex: 0,
  },
  integratedCenterWhiteCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: LOGISTICS_ORANGE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  integratedCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  integratedCornerInsetGroup: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integratedCornerInsetContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  integratedCellInnerLarge: {
    paddingVertical: SPACING.md,
  },
  integratedCellLabel: {
    marginTop: SPACING.xs,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    lineHeight: 14,
  },
  integratedCellLabelLarge: {
    fontSize: FONTS.sizes.sm,
  },
  integratedUnipassLogo: {
    width: 44,
    height: 44,
  },
  integratedUnipassMark: {
    fontSize: 28,
    lineHeight: 32,
  },
  csSection: {
    
    paddingHorizontal: HOME_GUTTER,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  csTitleOrange: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '800',
  },
  csTitleBlack: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '800',
    color: COLORS.black,
  },
  csSubtitle: {
    marginTop: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  csCardsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'stretch',
  },
  csCityCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_05,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
    }),
  },
  csCityCardTall: {
    justifyContent: 'flex-start',
  },
  csCityName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  csPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  csPhoneTextCol: {
    flex: 1,
    minWidth: 0,
  },
  csPhoneNumber: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: LOGISTICS_ORANGE,
  },
  csPhoneTag: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  csHours: {
    textAlign: 'center',
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
  },
  csHoursAccent: {
    color: LOGISTICS_ORANGE,
    fontWeight: '600',
  },
  csQuickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  csQuickCol: {
    flex: 1,
    alignItems: 'center',
  },
  csQuickCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  csQuickIconImage: {
    width: 40,
    height: 40,
  },
  csQuickTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    lineHeight: 13,
  },
  csQuickGo: {
    marginTop: 4,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  csFxCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_05,
    marginBottom: SPACING.md,
  },
  csFxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FFE8DC',
  },
  csFxHeaderTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
  },
  csFxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: FIGMA_OVERLAY_05,
  },
  csFxLabel: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  csFxValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.black,
  },
  csShipCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FIGMA_OVERLAY_05,
  },
  csShipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#E3F2FD',
  },
  csShipHeaderIcon: {
    width: 24,
    height: 20,
  },
  csShipHeaderTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.black,
  },
  csShipBody: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  csShipLeft: {
    flex: 1,
  },
  csShipRight: {
    flex: 1.2,
  },
  csShipWeek: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
    color: COLORS.black,
  },
  csShipWeekSub: {
    marginTop: 4,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  csShipLine: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginBottom: 6,
    fontWeight: '600',
  },
  csShipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: FIGMA_OVERLAY_05,
    gap: SPACING.xs,
  },
  csShipFooterText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  appName: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  logo: {
    width: 120,
    height: 40,
    minWidth: 120, // Ensure minimum width
    minHeight: 40, // Ensure minimum height
  },
  headerPlatformMenu: {
    marginLeft: SPACING.md,
  },
  headerSpacer: {
    flex: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerIcon: {
    padding: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    height: 36,
  },
  flagText: {
    fontSize: 24,
  },
  searchButtonContainer: {
    width: '100%',
    flexDirection: 'row',
  },
  searchButtonStyle: {
    flex: 1,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  platformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
  },
  logoTitle: {
    fontSize: Platform.OS === 'android' ? FONTS.sizes.md : FONTS.sizes.sm,
    fontWeight: '900',
    color: COLORS.white,
  },
  logoText: {
    fontSize: Platform.OS === 'android' ? FONTS.sizes.sm : FONTS.sizes.xs,
    fontWeight: '400',
    color: COLORS.white,
    ...(Platform.OS === 'android' ? { lineHeight: 20 } : {}),
  },
  quickCategoriesContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  quickCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    justifyContent: 'space-between',
  },
  quickCategoryItem: {
    width: (width - SPACING.lg * 2 - SPACING.sm * 4) / 5,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  quickCategoryImage: {
    width: (width - SPACING.md * 2 - SPACING.sm * 4) / 5,
    height: (width - SPACING.md * 2 - SPACING.sm * 4) / 5,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  quickCategoryName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    // backgroundColor: COLORS.background,
    
    paddingVertical: 8,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.smmd,
    textAlign: 'center',
  },
  newInContainer: {
    // No padding here, handled by page container
  },
  newInPage: {
    width: width,
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.xs,
  },
  newInCardWrapper: {
    width: NEW_IN_CARD_WIDTH,
    flexShrink: 0,
  },
  newInCard: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    position: 'relative',
  },
  newInImage: {
    width: '100%',
    height: NEW_IN_CARD_HEIGHT,
    borderRadius: 8,
  },
  newInDiscountBadge: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newInDiscountText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  newInLikeButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newInInfo: {
    padding: SPACING.xs,
  },
  newInName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    minHeight: 36,
  },
  newInPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  newInPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  newInOriginalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    textDecorationLine: 'line-through',
  },
  newInRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newInRatingText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  newInOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // height: 48,
    paddingHorizontal: SPACING.md,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  newInTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '400',
    color: COLORS.text.primary,
  },
  newInTitleOverlay: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    color: COLORS.white,
  },
  newInPreviewRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  previewOuterCircle: {
    width: (width - SPACING.md * 2 - SPACING.sm * 2) / 4,
    height: (width - SPACING.md * 2 - SPACING.sm * 2) / 4,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginRight: SPACING.md,
  },
  previewOuterCircleGray: {
    width: (width - SPACING.md * 2 - SPACING.sm * 2) / 4,
    height: (width - SPACING.md * 2 - SPACING.sm * 2) / 4,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginRight: SPACING.md,
  },
  previewInnerCircle: {
    width: (width - SPACING.md * 3 - SPACING.sm * 5) / 4,
    height: (width - SPACING.md * 3 - SPACING.sm * 5) / 4,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInnerCircleGray: {
    width: (width - SPACING.md * 3 - SPACING.sm * 5) / 4,
    height: (width - SPACING.md * 3 - SPACING.sm * 5) / 4,
    borderRadius: 50,
    backgroundColor: COLORS.gray[50],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  eventIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  eventIcon: {
  },
  trendingProductsContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  trendingProductCard: {
    width: GRID_CARD_WIDTH,
    paddingHorizontal: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    // padding: SPACING.sm,
    // ...SHADOWS.md,
  },
  trendingImageWrap: { position: 'relative' },
  trendingProductImage: {
    width: GRID_CARD_WIDTH - SPACING.sm * 2,
    height: (GRID_CARD_WIDTH - SPACING.sm * 2) * 1.2,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    marginRight: 0,
  },
  discountBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  trendingHeartBtn: {
    position: 'absolute',
    right: 8,
    bottom: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  trendingHeartBtnActive: {
    position: 'absolute',
    right: 8,
    bottom: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    // backgroundColor: COLORS.red,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  trendingProductInfo: {
    flex: 1,
  },
  trendingProductName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  trendingProductPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  trendingProductRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
   newInGridContainer: {
    width: '100%',
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
   },
   newInGridCard: {
     width: GRID_CARD_WIDTH,
     marginBottom: SPACING.md,
     backgroundColor: COLORS.white,
     borderRadius: 12,
   },
   newInGridImage: {
     width: GRID_CARD_WIDTH - SPACING.sm * 2,
     height: (GRID_CARD_WIDTH - SPACING.sm * 2) * 1.2,
     borderRadius: 8,
     marginBottom: SPACING.sm,
   },
  ratingText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  soldText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  playIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  scrollToTopButton: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 100,
    zIndex: 999,
  },
  scrollToTopTouchable: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
    elevation: 8,
  },
  popularCategoriesTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  popularText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
    color: COLORS.red,
  },
  categoriesText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '900',
    color: COLORS.text.primary,
  },
  fireIcon: {
    fontSize: FONTS.sizes.xl,
  },
  popularCategoriesContainer: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
    width: '100%',
  },
  popularCategoriesSubContainer: {
    flexDirection: 'column', 
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    width: '100%',
  },
  popularCategoryImageContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  popularCategoryItem: {
    alignItems: 'center',
    // marginBottom: SPACING.md,
  },
  popularCategoryImage: {
    resizeMode: 'contain',
    borderRadius: BORDER_RADIUS.md,
    // marginBottom: SPACING.xs,
  },
  popularCategoryPlatform: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text.red,
    marginTop: SPACING.sm,
    marginVertical: SPACING.xs / 2,
    textAlign: 'left',
  },
  popularCategoryName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  promoCardsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  promoCard: {
    height: 280,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  promoCardBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  promoCardGradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  promoCardInner: {
    position: 'absolute',
    top: 60,
    left: '50%',
    marginLeft: -(width - SPACING.md * 4) / 2, // Half of width (240/2)
    width: width - SPACING.md * 4,
    height: 160,
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  promoCardContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  promoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoCardTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  promoCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#FFFFFF33',
  },
  promoCardText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    flex: 1,
  },
  promoCardButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    // backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },

  // Live Channel Section Styles
  liveChannelContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  liveChannelCard: {
    // flex: 0.6,
    height: 210,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#FFD9B3',
    position: 'relative',
    width: 163,
  },
  liveChannelImageCarousel: {
    // position: 'absolute',
    // width: '100%',
    // height: '100%',
  },
  liveChannelBackgroundImage: {
    width: 163,
    height: 210,
  },
  liveChannelOverlay: {
    position: 'absolute',
    width: '100%',
    height: '50%',
    borderRadius: BORDER_RADIUS.md,
  },
  liveChannelContent: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    padding: SPACING.smmd,
    justifyContent: 'space-between',
  },
  liveIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  liveIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIconText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '900',
    color: COLORS.black,
    width: '50%',
  },
  liveChannelTextContainer: {
    marginBottom: SPACING.sm,
  },
  liveChannelTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    color: COLORS.black,
    lineHeight: 20,
  },
  liveChannelSubtitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    color: '#FF0000',
    marginBottom: SPACING.sm,
  },
  watchNowButton: {
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.md,
  },
  watchNowButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.black,
  },
  livePaginationContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderColor: COLORS.white,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
    backgroundColor: '#0000001A',
  },
  livePaginationContainerFixed: {
    flexDirection: 'row',
    // justifyContent: 'center',
    // alignItems: 'center',
    // paddingVertical: SPACING.xs,
  },
  livePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promosRightStack: {
    // flex: 0.4,
    gap: SPACING.sm,
    justifyContent: 'space-between',    
    width: '100%',
  },
  liveChannelPromoCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    // padding: SPACING.sm,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  promoCardTopRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
    width: '100%',
  },
  promoCardTopRowIcon: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
    width: '50%',
    paddingTop: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  promoCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.smmd,
  },
  promoCardIcon: {
    fontSize: FONTS.sizes.xs,
  },
  promoCardTitleSmall: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.black,
    flex: 1,
  },
  promoCardImages: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
    flex: 1,
  },
  promoCardSmallImage: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
  },
  promoCardPriceTag: {
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  promoCardPrice: {
    backgroundColor: COLORS.red,
    position: 'absolute',
    bottom: 0,
    width: 85,
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
    borderBottomLeftRadius: BORDER_RADIUS.sm,
    borderBottomRightRadius: BORDER_RADIUS.sm,
  },

  todaysDealsContainer: {
    // paddingHorizontal: SPACING.md,
    // paddingVertical: SPACING.md,
  },
  todaysDealsSectionTitle: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  todaysDealsBlock: {
    marginBottom: SPACING.lg,
    // backgroundColor: COLORS.background,
    position: 'relative',
  },
  todaysDealsBlockTitleContainer: {
    left: 10,
    height: 1,
    width: 100,
    zIndex: 2,
    borderTopWidth: 5,
    // borderTopColor: 'rgba(255, 47, 47, 0.5)',
    padding: SPACING.md,
    maxHeight: 5,
    position: 'absolute',
  },
  todaysDealsBlockTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
    marginLeft: SPACING.sm,
  },
  todaysDealsBlockSubtitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  todaysDealsProductsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
  },
  todaysDealsProductWrap: {
    width: GRID_CARD_WIDTH,
    zIndex: 2,
    gap: SPACING.xs,
  },
  // Live Hot Item card
  liveHotCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    padding: SPACING.xs,
    height: 210,
    zIndex: 1,
  },
  liveHotLiveRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: SPACING.xs,
    width: GRID_CARD_WIDTH,
    borderRadius: 8,
    position: 'absolute',
    overflow: 'hidden',
    bottom: -4,
  },
  liveHotLiveRowIconContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    gap: 4,
  },
  liveHotLiveRowIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.black,
    borderRadius: BORDER_RADIUS.full,
  },
  liveHotLiveRowIconInner: {
    width: 24,
    height: 18,
    backgroundColor: '#FF0000',
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveHotLiveText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.white,
    marginRight: SPACING.xs,
  },
  liveHotPointBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FF0000',
    borderRadius: 8,
  },
  liveHotPointBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.white,
  },
  liveHotImage: {
    width: GRID_CARD_WIDTH,
    height: GRID_CARD_WIDTH,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[200],
  },
  liveHotLiveRowUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#00000080',
    width: '100%',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomLeftRadius: BORDER_RADIUS.md,
    borderBottomRightRadius: BORDER_RADIUS.md,
  },
  liveHotUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 6,
    width: GRID_CARD_WIDTH,
    position: 'relative',
    overflow: 'hidden',
  },
  liveHotAvatar: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    // backgroundColor: COLORS.white,
  },
  liveHotUserNameContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  liveHotUserName: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  liveHotViews: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: '#AAAAAA',
  },
  liveHotProductName: {
    fontSize: 12,
    color: COLORS.text.primary,
    marginTop: 4,
    width: GRID_CARD_WIDTH,
  },
  liveHotPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.red,
    marginTop: 2,
    width: GRID_CARD_WIDTH,
  },
  // Today's Hot Deals / Best Sellers product card
  dealProductCard: {
    width: GRID_CARD_WIDTH,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  dealProductImageWrap: {
    width: GRID_CARD_WIDTH,
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  dealProductBadge: {
    width: GRID_CARD_WIDTH,
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
  dealProductImage: {
    width: GRID_CARD_WIDTH,
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.md,
  },
  dealProductName: {
    fontSize: 12,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
    paddingHorizontal: 2,
  },
  dealProductPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.red,
    marginTop: 2,
    paddingHorizontal: 2,
    paddingBottom: SPACING.xs,
  },
  todaysItemsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  todaysItemsTitle: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '800',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  todaysItemsCards: {
    gap: SPACING.md,
  },
  todaysItemCard: {
    height: 240,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  todaysItemCardBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  todaysItemGradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  todaysItemImagesContainer: {
    position: 'absolute',
    top: 65,
    left: SPACING.md,
    right: SPACING.md,
    height: width - SPACING.md * 2,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  todaysItemImagesGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.smmd,
  },
  todaysItemImagesRow: {
    flexDirection: 'row',
    gap: SPACING.smmd,
  },
  todaysItemImage: {
    borderRadius: BORDER_RADIUS.lg,
  },
  todaysItemImage2x2: {
    width: (width - SPACING.md * 4 - SPACING.smmd) / 2,
    height: (width - SPACING.md * 4) / 2,
  },
  todaysItemImageRow: {
    flex: 1,
    height: (width - SPACING.md * 4) / 2,
  },
  todaysItemContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  todaysItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todaysItemTitle: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.white,
  },
  todaysItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF33',
  },
  todaysItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    flex: 1,
  },
  todaysItemButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    // backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  moreToLoveFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  moreToLoveFooterText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },

  /* ---------- User Order Summary card (login-only) ---------- */
  uosOuter: {
    marginHorizontal: HOME_GUTTER,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    borderColor: LOGISTICS_ORANGE,
    backgroundColor: '#FFF6F0',
  },
  uosUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
  },
  uosAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.gray[200],
  },
  uosUserNameCol: {
    flex: 1,
    marginLeft: SPACING.sm,
    minWidth: 0,
  },
  uosUserName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.black,
  },
  uosUserMember: {
    marginTop: 2,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  uosInquiryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    gap: 4,
  },
  uosInquiryText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  uosOrderBlock: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  uosOrderBlockSpacer: {
    marginTop: SPACING.sm,
  },
  uosProductRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  uosProductImage: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[100],
  },
  uosProductTextCol: {
    flex: 1,
    marginLeft: SPACING.sm,
    minWidth: 0,
  },
  uosProductTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.black,
    lineHeight: 18,
  },
  uosProductMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  uosProductMetaLeft: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  uosProductPriceCol: {
    alignItems: 'flex-end',
  },
  uosProductPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.black,
  },
  uosProductPriceStrike: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  uosTrackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: FIGMA_OVERLAY_05,
  },
  uosTrackingCarrier: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.black,
    fontWeight: '600',
  },
  uosTrackingNumber: {
    color: '#1976D2',
    fontWeight: '700',
  },
  uosCopyButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  uosCopyButtonText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  uosStatusBlock: {
    marginTop: SPACING.sm,
  },
  uosStatusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uosStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LOGISTICS_ORANGE,
  },
  uosStatusText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.black,
  },
  uosStatusTime: {
    marginLeft: 'auto',
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  uosStatusDetail: {
    marginTop: 4,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  uosLogisticsMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 6,
  },
  uosLogisticsMoreCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.gray[400],
  },
  uosLogisticsMoreText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  uosAddressBlock: {
    marginTop: SPACING.sm,
  },
  uosAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  uosAddressText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.black,
    fontWeight: '600',
    lineHeight: 18,
  },
  uosAddressContact: {
    marginTop: 4,
    marginLeft: 20,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  uosViewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: FIGMA_OVERLAY_05,
    gap: 4,
  },
  uosViewAllText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  uosEmptyState: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  uosEmptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  uosShortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 102, 0, 0.15)',
  },
  uosShortcutItem: {
    width: '20%',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  uosShortcutCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.black,
  },
  uosShortcutLabel: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.black,
    textAlign: 'center',
  },
});

export default HomeScreen;

import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '../../../components/Icon';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { COLORS, FONTS, SPACING, SCREEN_HEIGHT, STORAGE_KEYS, BORDER_RADIUS } from '../../../constants';
import { RootStackParamList, Product } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { useAppSelector } from '../../../store/hooks';
import { translations } from '../../../i18n/translations';
import { useSocket } from '../../../context/SocketContext';
import { useNotes } from '../../../hooks/useNotes';
import { useGeneralInquiry } from '../../../hooks/useGeneralInquiry';
import { inquiryApi } from '../../../services/inquiryApi';
import { wishlistApi } from '../../../services/wishlistApi';
import { productsApi } from '../../../services/productsApi';
import { MemberAvatar, NotificationBadge, ProductCard } from '../../../components';
import { useRecommendationsMutation } from '../../../hooks/useRecommendationsMutation';
import { useWishlistStatus } from '../../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../../hooks/useDeleteFromWishlistMutation';
import { usePlatformStore } from '../../../store/platformStore';
import { formatPriceKRW, formatDepositBalance } from '../../../utils/i18nHelpers';
import { useGetOrdersMutation } from '../../../hooks/useGetOrdersMutation';
import { mapLocaleToOrdersLang } from '../../../services/orderApi';
import { mergeProfileOrderCounts } from '../../../utils/orderCounts';
import HeadsetMicIcon from '../../../assets/icons/HeadsetMicIcon';
import LocationIcon from '../../../assets/icons/LocationIcon';
import SettingsIcon from '../../../assets/icons/SettingsIcon';
import CoinIcon from '../../../assets/icons/CoinIcon';
import CouponIcon from '../../../assets/icons/CouponIcon';
import PointIcon from '../../../assets/icons/PointIcon';
import DeliveryIcon from '../../../assets/icons/DeliveryIcon';
import UndoIcon from '../../../assets/icons/UndoIcon';
import ToPayIcon from '../../../assets/icons/ToPayIcon';
import ToShipIcon from '../../../assets/icons/ToShipIcon';
import ToMessageIcon from '../../../assets/icons/ToMessageIcon';
import HeartIcon from '../../../assets/icons/HeartIcon';
import SupportAgentIcon from '../../../assets/icons/SupportAgentIcon';
import PaymentIcon from '../../../assets/icons/PaymentIcon';
import ProblemProductIcon from '../../../assets/icons/ProblemProductIcon';
import ShareAppIcon from '../../../assets/icons/ShareAppIcon';
import SuggestionIcon from '../../../assets/icons/SuggestionIcon';
import LoginIcon from '../../../assets/icons/LoginIcon';
import ReviewIcon from '../../../assets/icons/ReviewIcon';
import ViewedIcon from '../../../assets/icons/ViewedIcon';
import OfficialSupportIcon from '../../../assets/icons/OfficialSupportIcon';
import FeedbackIcon from '../../../assets/icons/FeedbackIcon';
import AddressIcon from '../../../assets/icons/AddressIcon';
import SellerShopIcon from '../../../assets/icons/SellerShopIcon';
import CustomerSupportIcon from '../../../assets/icons/CustomerSupportIcon';
import AffiliateMarketingIcon from '../../../assets/icons/AffiliateMarketingIcon';



type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, isAuthenticated, isGuest } = useAuth();
  const currentLocale = useAppSelector((state) => state.i18n.locale) as string;
  const normalizedLocale: 'en' | 'ko' | 'zh' =
    currentLocale === 'kr'
      ? 'ko'
      : (currentLocale === 'en' || currentLocale === 'ko' || currentLocale === 'zh' ? currentLocale : 'ko');
  const { selectedPlatform } = usePlatformStore();
  const badgePulse = useRef(new Animated.Value(1)).current;
  const hasLoggedStats = useRef(false);
  const { unreadCount: socketUnreadCount } = useSocket(); // Get total unread count from socket context
  const [notificationCount, setNotificationCount] = useState(0); // Local state for notification count (from REST API)
  const { notes: broadcastNotes } = useNotes(); // Get broadcast notes count
  const { unreadCount: generalInquiryUnreadCount } = useGeneralInquiry(); // Get general inquiry unread count
  const [orderCounts, setOrderCounts] = useState({
    unpaid: 0,
    to_be_shipped: 0,
    shipped: 0,
    processed: 0,
    shipping_delay: 0,  
    error: 0,
    refunds: 0,
    problemProducts: 0,
  }); // Order counts from API

  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistFirstImage, setWishlistFirstImage] = useState<string>('');
  const [viewedCount, setViewedCount] = useState(0);
  const [viewedFirstImage, setViewedFirstImage] = useState<string>('');

  // Order counts for My Orders — API viewFilterCounts with client-side fallback
  const { mutate: getOrders } = useGetOrdersMutation({
    onSuccess: (data) => {
      setOrderCounts(mergeProfileOrderCounts(data.orders ?? [], data.viewFilterCounts));
    },
  });
  
  // Recommendations state for "More to Love"
  const [recommendationsProducts, setRecommendationsProducts] = useState<Product[]>([]);
  const [recommendationsOffset, setRecommendationsOffset] = useState(1); // Current page offset
  const [recommendationsHasMore, setRecommendationsHasMore] = useState(true); // Whether more products exist
  const fetchRecommendationsRef = useRef<((country: string, outMemberId?: string, beginPage?: number, pageSize?: number, platform?: string) => Promise<void>) | null>(null);
  const hasInitialFetchRef = useRef<string | null>(null); // Track locale+user combination for initial fetch
  const isRecommendationsRefreshingRef = useRef(false); // Prevent loading during refresh
  const currentRecommendationsPageRef = useRef<number>(1); // Track current page for callbacks
  const isLoadingMoreRecommendationsRef = useRef(false); // Prevent multiple simultaneous loads
  
  // Wishlist hooks
  const { isProductLiked } = useWishlistStatus();
  const { mutate: addToWishlist } = useAddToWishlistMutation();
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation();

  // If user is not logged in, redirect to Auth (Login) when Profile gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated || isGuest) {
        (navigation as any).navigate('Auth', { screen: 'Login', params: { fromProfile: true } });
      }
    }, [isAuthenticated, isGuest, navigation])
  );

  // Combined focus effect for logging and data fetching
  useFocusEffect(
    React.useCallback(() => {
      // Fetch unread counts
      const fetchUnreadCounts = async () => {
        try {
          const response = await inquiryApi.getUnreadCounts();
          if (response.success && response.data) {
            setNotificationCount(response.data.totalUnread);
          }
        } catch (error) {
          // console.error('Failed to fetch unread counts:', error);
        }
      };
      fetchUnreadCounts();

      // Get order counts from API (fetch larger page size to calculate accurate counts)
      getOrders({ page: 1, pageSize: 100, lang: mapLocaleToOrdersLang(normalizedLocale) });

      // Set wishlist and viewed counts from API
      const fetchCounts = async () => {
        if (!isAuthenticated || isGuest || !user) return;
        try {
          const [wishlistRes, viewedRes] = await Promise.allSettled([
            wishlistApi.getWishlist({ discounted: false }),
            productsApi.getRecentlyViewedProducts(100),
          ]);
          console.log("viewed products: ", viewedRes)
          if (wishlistRes.status === 'fulfilled' && wishlistRes.value?.success && wishlistRes.value?.data) {
            const data = wishlistRes.value.data as any;
            setWishlistCount(data.total ?? data.wishlist?.length ?? 0);
            const firstItem = data.wishlist?.[0];
            setWishlistFirstImage(firstItem?.imageUrl || firstItem?.image || '');
          }
          if (viewedRes.status === 'fulfilled' && viewedRes.value?.success && viewedRes.value?.data) {
            const data = viewedRes.value.data as any;
            // API returns { items: [...] } — use items.length as count
            // Also check for total field at various levels
            const count = data.total ?? data.totalCount ?? data.count ?? data.items?.length ?? 0;
            setViewedCount(count);
            const firstItem = data.items?.[0];
            setViewedFirstImage(firstItem?.photoUrl || firstItem?.imageUrl || firstItem?.image || '');
          }
        } catch {
          // silently fail
        }
      };
      fetchCounts();
    }, [])
  );
  
  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    const resolve = (localeKey: 'en' | 'ko' | 'zh') => {
      let current: any = translations[localeKey];
      for (const k of keys) {
        current = current?.[k];
      }
      return current;
    };

    // 1) current locale, 2) Korean fallback, 3) English fallback
    let value: any = resolve(normalizedLocale);
    if (value == null) value = resolve('ko');
    if (value == null) value = resolve('en');
    return value || key;
  };

  // Helper function for string interpolation
  const tWithParams = (key: string, params: { [key: string]: string | number }) => {
    let text = t(key);
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, String(params[param]));
    });
    return text;
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

  useEffect(() => {
    if (notificationCount > 0) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(badgePulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      badgePulse.setValue(1);
    }
  }, [notificationCount]);


  const handleLogin = () => {
    (navigation as any).navigate('Auth', { screen: 'Login', params: { fromProfile: true } });
  };

  const showComingSoon = (feature: string) => {
    // console.log(`${feature} feature coming soon`);
    // You can add an alert or toast here if needed
  };

  // Recommendations API mutation with infinite scroll support
  const { 
    mutate: fetchRecommendations, 
    isLoading: recommendationsLoading, 
    isError: recommendationsError 
  } = useRecommendationsMutation({
    onSuccess: (data) => {
      // Updated API structure: data.products (not data.recommendations)
      const productsArray = data?.products || [];
      const currentPage = currentRecommendationsPageRef.current;
      
      // Reset loading flag
      isLoadingMoreRecommendationsRef.current = false;
      
      if (productsArray.length > 0) {
        // Map API response to Product format
        const mappedProducts = productsArray.map((item: any): Product => {
          const price = parseFloat(item.priceInfo?.price || item.priceInfo?.consignPrice || 0);
          const originalPrice = parseFloat(item.priceInfo?.consignPrice || item.priceInfo?.price || 0);
          const discount = originalPrice > price && originalPrice > 0
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;
          
          const productData: Product = {
            id: item.offerId?.toString() || '',
            externalId: item.offerId?.toString() || '',
            offerId: item.offerId?.toString() || '',
            name: normalizedLocale === 'zh' ? (item.subject || item.subjectTrans || '') : (item.subjectTrans || item.subject || ''),
            image: item.imageUrl || '',
            price: price,
            originalPrice: originalPrice,
            discount: discount,
            description: '',
            category: { id: '', name: '', icon: '', image: '', subcategories: [] },
            subcategory: '',
            brand: '',
            seller: { 
              id: '', 
              name: '', 
              avatar: '', 
              rating: 0, 
              reviewCount: 0, 
              isVerified: false, 
              followersCount: 0, 
              description: '', 
              location: '', 
              joinedDate: new Date() 
            },
            rating: 0,
            reviewCount: 0,
            rating_count: 0,
            inStock: true,
            stockCount: 0,
            tags: [],
            isNew: false,
            isFeatured: false,
            isOnSale: discount > 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            orderCount: item.monthSold || 0,
            repurchaseRate: item.repurchaseRate || '',
          };
          
          (productData as any).source = selectedPlatform;
          
          return productData;
        });
        
        // Check pagination - if we got fewer products than pageSize, no more pages
        const pageSize = 20;
        const hasMore = productsArray.length >= pageSize;
        setRecommendationsHasMore(hasMore);
        
        // If it's the first page, replace products, otherwise append
        if (currentPage === 1) {
          setRecommendationsProducts(mappedProducts);
        } else {
          setRecommendationsProducts(prev => [...prev, ...mappedProducts]);
        }
      } else {
        // No products found
        if (currentPage === 1) {
          setRecommendationsProducts([]);
        }
        setRecommendationsHasMore(false);
      }
    },
    onError: (error) => {
      console.error('ProfileScreen: More to Love API Error:', error);
      // Reset loading flag
      isLoadingMoreRecommendationsRef.current = false;
      const currentPage = currentRecommendationsPageRef.current;
      if (currentPage === 1) {
        setRecommendationsProducts([]);
      }
      setRecommendationsHasMore(false);
    },
  });

  // Store fetchRecommendations in ref to prevent dependency issues
  useLayoutEffect(() => {
    fetchRecommendationsRef.current = fetchRecommendations;
  }, [fetchRecommendations]);

  // Load more recommendations when page offset changes (infinite scroll)
  useEffect(() => {
    if (isRecommendationsRefreshingRef.current || isLoadingMoreRecommendationsRef.current) {
      return;
    }
    if (recommendationsOffset > 1 && fetchRecommendationsRef.current && recommendationsHasMore) {
      isLoadingMoreRecommendationsRef.current = true;
      const outMemberId = user?.id?.toString() || 'dferg0001';
      const platform = '1688';
      currentRecommendationsPageRef.current = recommendationsOffset;
      fetchRecommendationsRef
        .current(normalizedLocale, outMemberId, recommendationsOffset, 20, platform)
        .finally(() => {
          isLoadingMoreRecommendationsRef.current = false;
        });
    }
  }, [recommendationsOffset, normalizedLocale, user?.id, recommendationsHasMore]);

  // Initial fetch for "products worth viewing" at bottom of account page
  useEffect(() => {
    if (!fetchRecommendationsRef.current) return;
    const outMemberId = user?.id?.toString() || 'dferg0001';
    const platform = '1688';
    const fetchKey = `${normalizedLocale}-${outMemberId}-${platform}`;
    if (!hasInitialFetchRef.current || hasInitialFetchRef.current !== fetchKey) {
      hasInitialFetchRef.current = fetchKey;
      setRecommendationsOffset(1);
      setRecommendationsHasMore(true);
      setRecommendationsProducts([]);
      currentRecommendationsPageRef.current = 1;
      fetchRecommendationsRef.current(normalizedLocale, outMemberId, 1, 20, platform);
    }
  }, [normalizedLocale, user?.id, fetchRecommendations]);

  const loadMoreRecommendations = useCallback(() => {
    if (
      isLoadingMoreRecommendationsRef.current ||
      isRecommendationsRefreshingRef.current ||
      !recommendationsHasMore ||
      recommendationsLoading
    ) {
      return;
    }
    setRecommendationsOffset((prev) => prev + 1);
  }, [recommendationsHasMore, recommendationsLoading]);

  // Toggle wishlist function
  const toggleWishlist = async (product: Product) => {
    if (!user || isGuest) {
      return;
    }

    const externalId = 
      (product as any).externalId?.toString() ||
      (product as any).offerId?.toString() ||
      '';

    if (!externalId) {
      return;
    }

    const isLiked = isProductLiked(product);
    const source = (product as any).source || selectedPlatform || '1688';
    const country = currentLocale || 'en';

    if (isLiked) {
      deleteFromWishlist(externalId);
    } else {
      const imageUrl = product.image || '';
      const price = product.price || 0;
      const title = product.name || '';

      if (!imageUrl || !title || price <= 0) {
        return;
      }

      addToWishlist({ offerId: externalId, platform: source });
    }
  };

  // Helper function to navigate to product detail
  const navigateToProductDetail = async (
    productId: string | number,
    source: string = selectedPlatform,
    country: string = currentLocale
  ) => {
    navigation.navigate('ProductDetail', {
      productId: productId.toString(),
      source: source,
      country: country,
    });
  };

  const handleProductPress = async (product: Product) => {
    const offerId = (product as any).offerId;
    const productIdToUse = offerId || product.id;
    // Get source from product data, fallback to selectedPlatform
    const source = (product as any).source || selectedPlatform || '1688';
    await navigateToProductDetail(productIdToUse, source, currentLocale);
  };

  const renderHeader = () => {
    // Extract first name from full name
    const firstName = user?.name?.split(' ')[0] || user?.name || '';
    // Truncate first name to 3 characters with "..." if longer than 3
    const displayFirstName = firstName.length > 3 ? `${firstName.substring(0, 3)}...` : firstName;
    const userLabel = (user as any)?.label || 'TM VIP';
    
    return (
      <View style={styles.header}>
        {/* {isAuthenticated && user ? (
          <View style={styles.headerUserInfo}>
            <Image
              source={
                user?.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== ''
                  ? { uri: user.avatar } 
                  : require('../../../assets/images/avatar.png')
              }
              style={styles.headerAvatar}
            />
            <View style={styles.headerUserText}>
              <View style={styles.headerUserTop}>
                <Text style={styles.headerFirstName}>{displayFirstName}</Text> */}
                {/* <View style={styles.headerLabel}>
                  <Text style={styles.headerLabelText}>{userLabel}</Text>
                </View> */}
              {/* </View>
              <Text style={styles.headerFullName}>{user.name || ''}</Text>
            </View>
          </View>
        ) : ( */}
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          </View>
        {/* )} */}
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={styles.headerIcon}
            onPress={() => navigation.navigate('LanguageSettings')}
          >
            <LocationIcon width={24} height={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <NotificationBadge
            customIcon={<HeadsetMicIcon width={24} height={24} color={COLORS.text.primary} />}
            count={notificationCount}
            badgeColor={COLORS.red}
            onPress={() => {
              navigation.navigate('CustomerService');
            }}
          />
          {isAuthenticated && (
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => navigation.navigate('ProfileSettings')}
            >
              <SettingsIcon width={24} height={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderUserSection = () => (
    <View style={styles.userSection}>
      <View style={styles.userCard}>
        {isAuthenticated ? (
          <View style={styles.userInfo}>
            {/* <View style={styles.avatarContainer}>
              <Image
                source={
                  user?.avatar 
                    ? { uri: user.avatar } 
                    : require('../../../assets/images/avatar.png')
                }
                style={styles.avatar}
              />
              <View style={styles.avatarBorder} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {user?.name || t('profile.user')}
              </Text>
              <View style={styles.userBadge}>
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.verifiedText}>{t('profile.verifiedMember')}</Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => navigation.navigate('ProfileSettings')}
              >
                <Icon name="pencil" size={14} color={COLORS.primary} />
                <Text style={styles.editText}>{t('profile.editProfile')}</Text>
              </TouchableOpacity>
            </View> */}
          </View>
        ) : (
          <View style={styles.authSection}>
            <Image source={require('../../../assets/icons/logo.png')} style={styles.loginBackground} />
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <LoginIcon width={20} height={20} color={COLORS.white} />
              <Text style={styles.loginButtonText}>{t('profile.login')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderStatsSection = () => {
    const defaultAddress = user?.addresses && user.addresses.length > 0 ? user?.addresses.find(addr => addr.isDefault) : null;

    const addressString = defaultAddress
      ? `${defaultAddress.street}, ${defaultAddress.city}, ${defaultAddress.state}, ${defaultAddress.zipCode}, ${defaultAddress.country}`
      : '';
    return (<View style={styles.statsSection}>       
        {/* <View style={styles.headerLabel}>
          <Text style={styles.headerLabelText}>{t('profile.tmVip')}</Text>
        </View>
        <Text style={styles.explanationText}>{t('profile.vipVoucherMessage')}</Text>
        <Text style={styles.explanationButtonText}>{t('profile.claimNow')}</Text> */}
      <View style={styles.headerUserInfo}>
        <MemberAvatar
          uri={typeof user?.avatar === 'string' ? user.avatar : null}
          displayName={user?.name || t('profile.user')}
          size={48}
          style={styles.headerAvatar}
        />
        <View style={styles.headerUserText}>
          <View style={styles.headerUserTop}>
            <Text style={styles.headerFirstName}>{user?.name || ''}</Text>
            {/* <View style={styles.headerLabel}> */}
            <Text style={[styles.headerLabelText, {color: '#E0B9A6'}]}> {t('profile.userId')}:</Text>
            <Text style={styles.headerLabelText}> {user?.userUniqueId || ''}</Text>
            {/* </View> */}
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <AddressIcon width={16} height={16} color="#E0B9A6" />
            <Text style={[styles.headerFullName, {color: '#E0B9A6'}]}>{addressString || ''}</Text>
          </View>
        </View>
      </View>
      <View style={styles.statsCard}>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => navigation.navigate('Deposit')}
        >
          <View style={{flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center'}}>
            <Text style={styles.statLabel}>{t('profile.deposit')}:</Text>
            <Text style={styles.statValue}>
              {(() => {
                const depositBalance = (user as any)?.depositBalance ?? (user as any)?.deposit;
                if (typeof depositBalance === 'number') return formatDepositBalance(depositBalance);
                if (typeof depositBalance === 'string') {
                  const numValue = parseFloat(depositBalance);
                  return isNaN(numValue) ? depositBalance : formatDepositBalance(numValue);
                }
                return formatDepositBalance(0);
              })()}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => navigation.navigate('Coupon')}
        >
          <View style={{flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center'}}>
            <Text style={styles.statLabel}>{t('profile.coupons')}:</Text>
            <Text style={styles.statValue}>
              {(() => {
                const coupon = (user as any)?.coupon;
                if (typeof coupon === 'number') return String(coupon);
                if (typeof coupon === 'string') return coupon;
                return '0';
              })()}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => navigation.navigate('PointDetail')}
        >
          <View style={{flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center'}}>
            <Text style={styles.statLabel}>{t('profile.points')}:</Text>
            <Text style={styles.statValue}>
              {(() => {
                const points = (user as any)?.points ?? 0;
                if (typeof points === 'number') return String(points);
                if (typeof points === 'string') {
                  const numValue = parseFloat(points);
                  return isNaN(numValue) ? points : String(numValue);
                }
                return '0';
              })()}
            </Text>
          </View>
        </TouchableOpacity>
        {/* <TouchableOpacity 
          style={styles.statItem}
          onPress={() => navigation.navigate('Wishlist')}
        >
          <View style={[styles.statIconContainer, { backgroundColor: '#E8F8F5' }]}>
            <Icon name="heart-outline" size={24} color="#26D0CE" />
          </View>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>{t('profile.wishlist')}</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} /> */}
      </View>
    </View>)
  };

  const renderMenuItems = () => {

    return (
      <View style={styles.menuContainer}>
        <View style={styles.myOrder}>
          <TouchableOpacity 
            style={styles.myOrderHeader}
            onPress={() => navigation.navigate('BuyList', { initialTab: 'all' })}
          >
            <Text style={styles.myOrderHeaderText}>{t('profile.myOrders')}{">"}</Text>
            <Text style={styles.myOrderHeaderTextSub}>{t('profile.viewAll')}{' >'}</Text>
          </TouchableOpacity>
          <View style={styles.myOrderContent}>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => (navigation as any).navigate('BuyList', { initialTab: 'purchase_agency' })}
            >
              {/* <NotificationBadge
                customIcon={<ToPayIcon width={24} height={24} color={COLORS.black} />}
                count={orderCounts.unpaid}
                badgeColor={COLORS.red}
                onPress={() => navigation.navigate('BuyList', { initialTab: 'waiting' })}
                showCount={true}
              /> */}
              <Text style={styles.myOrderItemCount}>{orderCounts.unpaid}</Text>
              <Text style={styles.myOrderItemText}>{t('profile.toPay')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => (navigation as any).navigate('BuyList', { initialTab: 'warehouse' })}
            >
              {/* <ToShipIcon width={24} height={24} color={COLORS.black} /> */}
              {/* <NotificationBadge
                customIcon={<ToShipIcon width={24} height={24} color={COLORS.black} />}
                count={0}
                badgeColor={COLORS.red}
                onPress={() => navigation.navigate('BuyList', { initialTab: 'progressing' })}
                showCount={true}
              /> */}
              <Text style={styles.myOrderItemCount}>{orderCounts.to_be_shipped}</Text>
              <Text style={styles.myOrderItemText}>{t('profile.toShip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => (navigation as any).navigate('BuyList', { initialTab: 'international_shipping' })}
            >
              {/* <DeliveryIcon width={24} height={24} color={COLORS.black} /> */}
              {/* <NotificationBadge
                customIcon={<DeliveryIcon width={24} height={24} color={COLORS.black} />}
                count={0}
                badgeColor={COLORS.red}
                onPress={() => navigation.navigate('BuyList', { initialTab: 'progressing' })}
                showCount={true}
              /> */}
              <Text style={styles.myOrderItemCount}>{orderCounts.shipped}</Text>
              <Text style={styles.myOrderItemText}>{t('profile.shipped')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.myOrderItem}
              onPress={() => (navigation as any).navigate('BuyList', { initialTab: 'international_shipping' })}
            >
              <Text style={styles.myOrderItemCount}>{orderCounts.shipping_delay}</Text>
              <Text style={styles.myOrderItemText}>{t('profile.toShippingDelay')}</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('BuyList', { initialTab: 'waiting' })}
            >
              <UndoIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.returns')}</Text>
            </TouchableOpacity> */}
          </View>
          <View style={styles.myOrderContent}>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => (navigation as any).navigate('BuyList', { initialTab: 'international_shipping' })}
            >
              {/* <NotificationBadge
                customIcon={<ToPayIcon width={24} height={24} color={COLORS.black} />}
                count={0}
                badgeColor={COLORS.red}
                onPress={() => navigation.navigate('BuyList', { initialTab: 'waiting' })}
                showCount={true}
              /> */}
              <Text style={styles.myOrderItemCount}>{orderCounts.processed}</Text>
              <Text style={styles.myOrderItemText}>{t('profile.toReview')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.myOrderItem}
              onPress={() => (navigation as any).navigate('BuyList', { initialTab: 'purchase_agency' })}
            >
              <Text style={styles.myOrderItemCount}>{orderCounts.problemProducts}</Text>
              <Text style={styles.myOrderItemText}>{t('profile.toProblem')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => (navigation as any).navigate('BuyList', { initialTab: 'error' })}
            >
              {/* <DeliveryIcon width={24} height={24} color={COLORS.black} /> */}
              {/* <NotificationBadge
                customIcon={<DeliveryIcon width={24} height={24} color={COLORS.black} />}
                count={0}
                badgeColor={COLORS.red}
                onPress={() => navigation.navigate('BuyList', { initialTab: 'progressing' })}
                showCount={true}
              /> */}
              <Text style={styles.myOrderItemCount}>{orderCounts.error}</Text>
              <Text style={styles.myOrderItemText}>{t('profile.toErrorIn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => (navigation as any).navigate('BuyList', { initialTab: 'error' })}
            >
              {/* <ToMessageIcon width={24} height={24} color={COLORS.black} /> */}
              {/* <NotificationBadge
                customIcon={<ReviewIcon width={24} height={24} color={COLORS.black} />}
                count={0}
                badgeColor={COLORS.red}
                onPress={() => {
                  // navigation.navigate('CustomerService');
                }}
                showCount={true}
              /> */}
              <Text style={styles.myOrderItemCount}>{orderCounts.refunds}</Text>
              <Text style={styles.myOrderItemText}>{t('profile.toRefunds')}</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('BuyList', { initialTab: 'waiting' })}
            >
              <UndoIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.returns')}</Text>
            </TouchableOpacity> */}
          </View>
        </View>
        <View style={[styles.myOrder, { paddingTop: 0}]}>
          <View style={styles.myOrderContent}>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('Wishlist')}
            >
              <HeartIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.wishlist')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('FollowedStore' as never)}
            >
              <SellerShopIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.followedStores')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('Coupon')}
            >
              <CouponIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.coupons')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('PointDetail' as never)}
            >
              <PointIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.points')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.myOrderContent}>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('AffiliateMarketing' as never)}
            >
              <AffiliateMarketingIcon width={24} height={24} color={COLORS.black} />
              {/* <ProblemProductIcon width={24} height={24} color={COLORS.black} /> */}
              <Text style={styles.myOrderItemText}>{t('profile.affiliateMarketing')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('Note' as never)}
            >
              <View style={styles.iconWithBadge}>
                <FeedbackIcon width={24} height={24} color={COLORS.black} />
                {(() => {
                  const notesCount = Array.isArray(broadcastNotes) ? broadcastNotes.length : 0;
                  const inquiryCount = typeof generalInquiryUnreadCount === 'number' ? generalInquiryUnreadCount : 0;
                  const totalCount = notesCount + inquiryCount;
                  return totalCount > 0 ? (
                  <View style={styles.suggestionBadge}>
                    <Text style={styles.suggestionBadgeText}>
                        {String(totalCount)}
                    </Text>
                  </View>
                  ) : null;
                })()}
              </View>
              <Text style={styles.myOrderItemText}>{t('profile.suggestion')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('CustomerService')}
            >
              <OfficialSupportIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.customerSupport')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('CustomerService')}
            >
              {/* <PaymentIcon width={24} height={24} color={COLORS.black} /> */}
              {/* <ToMessageIcon width={24} height={24} color={COLORS.black} /> */}              
              <CustomerSupportIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.customerSupport')}</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity 
              style={styles.myOrderItem}
              onPress={() => navigation.navigate('ShareApp' as never)}
            >
              <ShareAppIcon width={24} height={24} color={COLORS.black} />
              <Text style={styles.myOrderItemText}>{t('profile.shareApp')}</Text>
            </TouchableOpacity> */}
          </View>
        </View>
        {/* {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index === 0 && styles.firstMenuItem,
              index === menuItems.length - 1 && styles.lastMenuItem
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: getMenuIconColor(index).bg }]}>
                <Icon name={item.icon as any} size={22} color={getMenuIconColor(index).icon} />
              </View>
              <Text style={styles.menuItemText}>{item.title}</Text>
              {(item as any).showBadge && (
                <View style={styles.menuItemBadge}>
                  <View style={styles.menuItemBadgeDot} />
                </View>
              )}
            </View>
            <Icon name="chevron-forward" size={18} color={COLORS.gray[400]} />
          </TouchableOpacity>
        ))} */}
      </View>
    );
  };

  // Render More to Love item
  const renderMoreToLoveItem = useCallback(({ item: product, index }: { item: Product; index: number }) => {
    if (!product || !product.id) {
      return null;
    }
    
    const handleLike = async () => {
      if (!user || isGuest) {
        return;
      }
      try {
        await toggleWishlist(product);
      } catch (error) {
        // Error toggling wishlist
      }
    };
    
    return (
      <ProductCard
        key={`moretolove-${product.id || index}`}
        product={product}
        variant="moreToLove"
        onPress={() => handleProductPress(product)}
        onLikePress={handleLike}
        isLiked={isProductLiked(product)}
        showLikeButton={true}
        showDiscountBadge={true}
        showRating={true}
      />
    );
  }, [user, isGuest, toggleWishlist, handleProductPress, isProductLiked]);

  // Render footer for "More to Love" loading indicator
  const renderMoreToLoveFooter = () => {
    if (recommendationsLoading && recommendationsProducts.length > 0) {
      return (
        <View style={styles.moreToLoveFooter}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.moreToLoveFooterText}>{t('profile.loadingMore')}</Text>
        </View>
      );
    }
    return null;
  };

  const renderQuickAccessSection = () => {
    const expressCount = orderCounts.shipped;
    const cards = [
      expressCount > 0 && (
        <TouchableOpacity
          key="delivery"
          style={styles.quickAccessCard}
          onPress={() => navigation.navigate('MyDeliveries' as never)}
        >
          <View style={styles.quickAccessHeader}>
            <Text style={styles.quickAccessTitle}>{t('profile.expressDelivery')}</Text>
            <Text style={styles.quickAccessSubtitle}>{tWithParams('profile.itemsPendingShipment', { count: expressCount })}</Text>
          </View>
          <View style={styles.quickAccessImageContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/120x120/D4B896/FFFFFF?text=Delivery' }}
              style={styles.quickAccessImage}
            />
          </View>
        </TouchableOpacity>
      ),
      (
        <TouchableOpacity
          key="wishlist"
          style={styles.quickAccessCard}
          onPress={() => navigation.navigate('Wishlist')}
        >
          <View style={styles.quickAccessHeader}>
            <Text style={styles.quickAccessTitle}>{t('profile.wishlist')}</Text>
            <Text style={styles.quickAccessSubtitle}>{tWithParams('profile.itemsInWishlist', { count: wishlistCount })}</Text>
          </View>
          <View style={styles.quickAccessImageContainer}>
            {wishlistFirstImage ? (
              <Image source={{ uri: wishlistFirstImage }} style={styles.quickAccessImage} />
            ) : (
              <Image source={{ uri: 'https://via.placeholder.com/120x120/D4B896/FFFFFF?text=Wishlist' }} style={styles.quickAccessImage} />
            )}
          </View>
        </TouchableOpacity>
      ),
      (
        <TouchableOpacity
          key="viewed"
          style={styles.quickAccessCard}
          onPress={() => navigation.navigate('ViewedProducts' as never)}
        >
          <View style={styles.quickAccessHeader}>
            <Text style={styles.quickAccessTitle}>{t('profile.viewed')}</Text>
            <Text style={styles.quickAccessSubtitle}>{tWithParams('profile.viewedItemsToday', { count: viewedCount })}</Text>
          </View>
          <View style={styles.quickAccessImageContainer}>
            {viewedFirstImage ? (
              <Image source={{ uri: viewedFirstImage }} style={styles.quickAccessImage} />
            ) : (
              <Image source={{ uri: 'https://via.placeholder.com/120x120/D4B896/FFFFFF?text=Viewed' }} style={styles.quickAccessImage} />
            )}
          </View>
        </TouchableOpacity>
      ),
    ].filter(Boolean);

    return (
      <View style={styles.quickAccessSection}>
        <View style={styles.quickAccessContainer}>
          {cards}
        </View>
      </View>
    );
  };

  const renderMoreToLove = () => {
    const productsToDisplay = recommendationsProducts;
    const sectionTitle = t('profile.worthViewingProducts');

    if (recommendationsLoading && productsToDisplay.length === 0) {
      return (
        <View style={styles.moreToLoveSection}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('profile.loading')}</Text>
          </View>
        </View>
      );
    }

    if (recommendationsError && productsToDisplay.length === 0) {
      return (
        <View style={styles.moreToLoveSection}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <View style={styles.loadingContainer}>
            <Text style={styles.errorDetailText}>
              {t('profile.failedToLoadRecommendations')}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                hasInitialFetchRef.current = null;
                setRecommendationsOffset(1);
                setRecommendationsHasMore(true);
                setRecommendationsProducts([]);
                currentRecommendationsPageRef.current = 1;
                const outMemberId = user?.id?.toString() || 'dferg0001';
                fetchRecommendationsRef.current?.(
                  normalizedLocale,
                  outMemberId,
                  1,
                  20,
                  '1688',
                );
              }}
            >
              <Text style={styles.retryButtonText}>{t('helpCenter.retry')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!Array.isArray(productsToDisplay) || productsToDisplay.length === 0) {
      return null;
    }

    return (
      <View style={styles.moreToLoveSection}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <FlatList
          data={productsToDisplay}
          renderItem={renderMoreToLoveItem}
          keyExtractor={(item, index) => `moretolove-${item.id?.toString() || index}-${index}`}
          numColumns={2}
          scrollEnabled={false}
          nestedScrollEnabled
          columnWrapperStyle={styles.productRow}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          ListFooterComponent={() => {
            if (recommendationsLoading && productsToDisplay.length > 0) {
              return renderMoreToLoveFooter();
            }
            if (!recommendationsHasMore && productsToDisplay.length > 0) {
              return (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>{t('profile.noMoreProducts')}</Text>
                </View>
              );
            }
            return renderMoreToLoveFooter();
          }}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top half linear gradient background */}
      <LinearGradient
        colors={['#FFE1D4', '#FAFAFA']}
        style={styles.gradientBackground}
      />
      
      {renderHeader()}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const distanceFromBottom =
            contentSize.height - contentOffset.y - layoutMeasurement.height;
          if (distanceFromBottom < 200) {
            loadMoreRecommendations();
          }
        }}
        scrollEventThrottle={16}
      >
        {/* {renderUserSection()} */}
        {isAuthenticated && renderStatsSection()}
        {isAuthenticated && renderMenuItems()}
        {isAuthenticated && renderQuickAccessSection()}
        {renderMoreToLove()}
      </ScrollView>
    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT / 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingBottom: SPACING.sm,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerUserText: {
    flex: 1,
  },
  headerUserTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerFirstName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
    marginRight: SPACING.xs,
  },
  headerLabel: {
    backgroundColor: '#4E3E01',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  headerLabelText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: COLORS.white,
  },
  headerFullName: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.black,
    fontWeight: '400',
  },
  backButton: {
    width: 24,
    height: 24,
    borderRadius: 20,
    // backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: 0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  flagCircle: {
    marginLeft: SPACING.md,
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
  headerIcon: {
    padding: SPACING.xs,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
    minHeight: '100%',
    marginBottom: 100,
  },
  userSection: {
    paddingHorizontal: SPACING.lg,
    // paddingTop: SPACING.lg,
    // paddingBottom: SPACING.xl, // Add bottom padding for spacing
    // marginTop: -20,
  },
  userCard: {
    paddingHorizontal: SPACING.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.lg,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.gray[200],
  },
  avatarBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FF9A9E', // Korean favorite coral pink
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  verifiedText: {
    fontSize: FONTS.sizes.sm,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6', // Soft pink background
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  editText: {
    fontSize: FONTS.sizes.sm,
    color: '#FF6B9D', // Pink text
    marginLeft: 4,
    fontWeight: '500',
  },
  authSection: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: SPACING.md,
    gap: SPACING.sm,
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
  loginBackground: {
    width: 150,
    height: 50,
    resizeMode: 'contain',
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.text.red,
    borderRadius: 9999,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loginButtonText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  statsSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: '#703A1F',
    padding: SPACING.sm,
    borderRadius: SPACING.md,
  },
  statsCard: {
    backgroundColor: COLORS.text.red,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderRadius: SPACING.md,
    gap: SPACING.xl,
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.gray[200],
    marginHorizontal: SPACING.sm,
  },
  statValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '400',
  },
  explanationCard: {
    backgroundColor: '#703A1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  explanationText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '300',
    width: '54%',
  },
  explanationButtonText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '700',
  },
  menuContainer: {
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.xl
  },
  myOrder: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  myOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    // borderBottomWidth: 1,
    // borderBottomColor: COLORS.gray[100],
  },
  myOrderHeaderText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  myOrderHeaderTextSub: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '400',
  },
  myOrderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    // gap: SPACING.xs,
  },
  myOrderItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: SPACING.md,
    width: 65,
    minHeight: 70,
  },
  myOrderItemCount: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    color: COLORS.text.primary,
  },
  myOrderItemText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: SPACING.xs,
    // minHeight: 32,
  },
  iconWithBadge: {
    position: 'relative',
  },
  suggestionBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  suggestionBadgeText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  quickAccessSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: 0,
  },
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.smmd,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  quickAccessCard: {
    flex: 1,
    minHeight: 180,
  },
  quickAccessHeader: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickAccessTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  quickAccessSubtitle: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontWeight: '400',
  },
  quickAccessImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // marginVertical: SPACING.xs,
  },
  quickAccessImage: {
    width: 109,
    height: 109,
    borderRadius: SPACING.xs,
    backgroundColor: COLORS.gray[100],
  },
  quickAccessAction: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: COLORS.red,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  firstMenuItem: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.lg,
  },
  menuItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  menuItemBadge: {
    marginLeft: SPACING.xs,
    position: 'relative',
  },
  menuItemBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
  },
  moreToLoveSection: {
    paddingHorizontal: SPACING.md,
    paddingTop: 0,
    paddingBottom: SPACING.lg,
    marginTop: 10,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  errorDetailText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '600',
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  loadingMoreContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
  },
  endOfListContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endOfListText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
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
});

export default ProfileScreen;



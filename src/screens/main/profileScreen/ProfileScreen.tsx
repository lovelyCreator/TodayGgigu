import React, { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
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
  useWindowDimensions,
  RefreshControl,
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
import { depositApi } from '../../../services/depositApi';
import { productsApi } from '../../../services/productsApi';
import { MemberAvatar, NotificationBadge, ProductCard } from '../../../components';
import { useRecommendationsMutation } from '../../../hooks/useRecommendationsMutation';
import { useWishlistStatus } from '../../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../../hooks/useDeleteFromWishlistMutation';
import { usePlatformStore } from '../../../store/platformStore';
import { useToast } from '../../../context/ToastContext';
import { formatPriceKRW, formatDepositBalance } from '../../../utils/i18nHelpers';
import { useGetOrdersMutation } from '../../../hooks/useGetOrdersMutation';
import { mapLocaleToOrdersLang } from '../../../services/orderApi';
import {
  mergeProfileOrderCounts,
  computeProfileOrderCountsByDomain,
  type ProfileOrderCountsByDomain,
} from '../../../utils/orderCounts';
import { getProfileMoreToLoveGridLayout } from '../../../utils/profileMoreToLoveLayout';
import HeadsetMicIcon from '../../../assets/icons/HeadsetMicIcon';
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
  const { width: windowWidth } = useWindowDimensions();
  const moreToLoveGrid = useMemo(
    () => getProfileMoreToLoveGridLayout(windowWidth),
    [windowWidth],
  );

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
  // Deposit balance sourced from the same API the DepositScreen uses, so the
  // value shown in the stats card stays in sync with the deposit detail page.
  const [depositBalance, setDepositBalance] = useState<number | null>(null);
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

  // 사업 도메인별 ProfileOrderCounts — 활성 탭에 맞춰 카드 셀에 표시된다.
  // 백엔드는 viewFilterCounts 를 도메인 무관 전체로만 내려주므로,
  // orders 배열을 도메인별로 쪼개 클라이언트에서 직접 계산한다.
  const [orderCountsByDomain, setOrderCountsByDomain] =
    useState<ProfileOrderCountsByDomain>({
      purchase_agency: {
        quotePending: 0, unpaid: 0, to_be_shipped: 0, shipped: 0, processed: 0,
        shipping_delay: 0, error: 0, refunds: 0, problemProducts: 0,
      },
      rocket_3pl: {
        quotePending: 0, unpaid: 0, to_be_shipped: 0, shipped: 0, processed: 0,
        shipping_delay: 0, error: 0, refunds: 0, problemProducts: 0,
      },
      vvic_hipass: {
        quotePending: 0, unpaid: 0, to_be_shipped: 0, shipped: 0, processed: 0,
        shipping_delay: 0, error: 0, refunds: 0, problemProducts: 0,
      },
      shipping_agency: {
        quotePending: 0, unpaid: 0, to_be_shipped: 0, shipped: 0, processed: 0,
        shipping_delay: 0, error: 0, refunds: 0, problemProducts: 0,
      },
    });

  // 내주문 카드 상단 탭(구매대행 / 로켓·3PL / VVIC하이패스 / 배송대행) 활성 키.
  // 활성 탭이 바뀌면 밑의 5×2 그리드 내용도 myOrderTabContent 룩업으로 교체된다.
  const [activeOrderTab, setActiveOrderTab] = useState<
    'purchase_agency' | 'rocket_3pl' | 'vvic_hipass' | 'shipping_agency'
  >('purchase_agency');

  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistFirstImage, setWishlistFirstImage] = useState<string>('');
  const [viewedCount, setViewedCount] = useState(0);
  const [viewedFirstImage, setViewedFirstImage] = useState<string>('');

  // Order counts for My Orders — API viewFilterCounts with client-side fallback.
  // 또한 orders 배열을 사업 도메인별로 쪼개 도메인 × 상태 카운트도 함께 계산한다.
  const { mutate: getOrders } = useGetOrdersMutation({
    onSuccess: (data) => {
      const ordersList = data.orders ?? [];
      setOrderCounts(mergeProfileOrderCounts(ordersList, data.viewFilterCounts));
      setOrderCountsByDomain(computeProfileOrderCountsByDomain(ordersList));
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
  
  const { showToast } = useToast();

  const refreshWishlistSummary = useCallback(async () => {
    if (!isAuthenticated || isGuest || !user) return;
    try {
      const wishlistRes = await wishlistApi.getWishlist({ discounted: false });
      if (wishlistRes?.success && wishlistRes?.data) {
        const data = wishlistRes.data as any;
        setWishlistCount(data.total ?? data.wishlist?.length ?? 0);
        const firstItem = data.wishlist?.[0];
        setWishlistFirstImage(firstItem?.imageUrl || firstItem?.image || '');
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated, isGuest, user]);

  // If user is not logged in, redirect to Auth (Login) when Profile gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated || isGuest) {
        (navigation as any).navigate('Auth', { screen: 'Login', params: { fromProfile: true } });
      }
    }, [isAuthenticated, isGuest, navigation])
  );

  // pull-to-refresh 전용 상태. 초기 로딩과 별도로 ScrollView 상단의
  // RefreshControl 인디케이터에만 연결된다.
  const [profileRefreshing, setProfileRefreshing] = useState(false);

  // 계정 화면의 모든 자료(주문 카운트 / 예치금 / 알림 / 위시리스트 / 최근본)를
  // 한 번에 다시 받아오는 통합 로더. useFocusEffect 와 pull-to-refresh 양쪽에서
  // 호출한다. 네트워크는 병렬로 던지고, 호출자가 await 로 끝나기를 기다릴 수
  // 있도록 Promise<void> 를 반환한다.
  const loadProfileData = useCallback(async () => {
    // 1) 알림 unread 카운트
    const fetchUnreadCounts = async () => {
      try {
        const response = await inquiryApi.getUnreadCounts();
        if (response.success && response.data) {
          setNotificationCount(response.data.totalUnread);
        }
      } catch {
        // silent
      }
    };

    // 2) 예치금 — DepositScreen 과 같은 endpoint 를 써서 항상 동기화 유지.
    const fetchDepositBalance = async () => {
      if (!isAuthenticated || isGuest) return;
      try {
        const response = await depositApi.getBalance();
        if (response.success && response.data) {
          const d = response.data as any;
          const value = d.depositBalance ?? d.balance ?? d.totalDeposit ?? 0;
          setDepositBalance(typeof value === 'number' ? value : Number(value) || 0);
        }
      } catch {
        // silent
      }
    };

    // 3) 주문 카운트 — getOrders 의 onSuccess 가 orderCounts / orderCountsByDomain 갱신.
    getOrders({ page: 1, pageSize: 100, lang: mapLocaleToOrdersLang(normalizedLocale) });

    // 4) 위시리스트 + 최근본 카운트
    const fetchCounts = async () => {
      if (!isAuthenticated || isGuest || !user) return;
      try {
        const [wishlistRes, viewedRes] = await Promise.allSettled([
          wishlistApi.getWishlist({ discounted: false }),
          productsApi.getRecentlyViewedProducts(100, normalizedLocale),
        ]);
        if (wishlistRes.status === 'fulfilled' && wishlistRes.value?.success && wishlistRes.value?.data) {
          const data = wishlistRes.value.data as any;
          setWishlistCount(data.total ?? data.wishlist?.length ?? 0);
          const firstItem = data.wishlist?.[0];
          setWishlistFirstImage(firstItem?.imageUrl || firstItem?.image || '');
        }
        if (viewedRes.status === 'fulfilled' && viewedRes.value?.success && viewedRes.value?.data) {
          const data = viewedRes.value.data as any;
          const count = data.total ?? data.totalCount ?? data.count ?? data.items?.length ?? 0;
          setViewedCount(count);
          const firstItem = data.items?.[0];
          setViewedFirstImage(firstItem?.photoUrl || firstItem?.imageUrl || firstItem?.image || '');
        }
      } catch {
        // silently fail
      }
    };

    // await 가능한 묶음 — pull-to-refresh 핸들러가 끝까지 대기할 수 있도록 모음.
    await Promise.allSettled([
      fetchUnreadCounts(),
      fetchDepositBalance(),
      fetchCounts(),
    ]);
  }, [isAuthenticated, isGuest, user, normalizedLocale, getOrders]);

  // 화면 포커스 시 통합 로더 실행 — 진입 / 다른 탭에서 돌아옴 / 백그라운드 복귀 모두 커버.
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
      // 의존성은 빈 배열 유지 — loadProfileData 자체가 useCallback 으로 안정적이라
      // focus 시점에만 실행되면 충분하다(루프 방지).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // pull-to-refresh — 본문 ScrollView 가 더 이상 위로 못 갈 때 한 번 더 당기면
  // 계정 자료(주문 카운트 / 예치금 / 알림 / 위시리스트 / 최근본) 를 모두 다시
  // 받아온다. 상단 인디케이터만 잠깐 보이고 본문 카드 레이아웃은 흔들리지 않는다.
  const onProfileRefresh = useCallback(async () => {
    setProfileRefreshing(true);
    try {
      await loadProfileData();
    } finally {
      setProfileRefreshing(false);
    }
  }, [loadProfileData]);
  
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

  const { isProductLiked, refreshExternalIds, addExternalId, removeExternalId } = useWishlistStatus();
  const { mutate: addToWishlist } = useAddToWishlistMutation({
    onSuccess: async () => {
      showToast(t('home.productAddedToWishlist'), 'success');
      await refreshExternalIds();
      await refreshWishlistSummary();
    },
    onError: async (error) => {
      await refreshExternalIds();
      showToast(error || t('home.failedToAddToWishlist'), 'error');
    },
  });
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation({
    onSuccess: async () => {
      showToast(t('home.productRemovedFromWishlist'), 'success');
      await refreshExternalIds();
      await refreshWishlistSummary();
    },
    onError: async (error) => {
      await refreshExternalIds();
      showToast(error || t('home.failedToRemoveFromWishlist'), 'error');
    },
  });

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
          const priceInfo = item.priceInfo;
          const originalPrice = priceInfo
            ? parseFloat(priceInfo.price || priceInfo.consignPrice || '0')
            : parseFloat(item.price || '0');
          const price = priceInfo
            ? parseFloat(
                priceInfo.promotionPrice || priceInfo.price || priceInfo.consignPrice || '0',
              )
            : originalPrice;
          const discount = originalPrice > price && originalPrice > 0
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;
          
          const productData: Product = {
            id: item.offerId?.toString() || '',
            externalId: item.offerId?.toString() || '',
            offerId: item.offerId?.toString() || '',
            name: normalizedLocale === 'zh' ? (item.subject || item.subjectTrans || '') : (item.subjectTrans || item.subject || ''),
            image: item.imageUrl || item.image || '',
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

  const toggleWishlist = useCallback(
    async (product: Product) => {
      if (!user || isGuest) {
        showToast(t('home.pleaseLogin'), 'warning');
        return;
      }

      const externalId =
        (product as any).externalId?.toString() ||
        (product as any).offerId?.toString() ||
        product.id?.toString() ||
        '';

      if (!externalId) {
        showToast(t('home.invalidProductId'), 'error');
        return;
      }

      const isLiked = isProductLiked(product);
      const source = (product as any).source || selectedPlatform || '1688';

      if (isLiked) {
        await removeExternalId(externalId);
        deleteFromWishlist(externalId);
      } else {
        await addExternalId(externalId);
        addToWishlist({ offerId: externalId, platform: source });
      }
    },
    [
      user,
      isGuest,
      showToast,
      t,
      isProductLiked,
      selectedPlatform,
      removeExternalId,
      deleteFromWishlist,
      addExternalId,
      addToWishlist,
    ],
  );

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
            <Text style={styles.flagText}>{getLanguageFlag(currentLocale)}</Text>
          </TouchableOpacity>
          <NotificationBadge
            customIcon={<HeadsetMicIcon width={24} height={24} color={COLORS.text.primary} />}
            count={notificationCount}
            badgeColor={COLORS.red}
            onPress={() => {
              // Route the inquiry icon to the Message tab's 1:1 (general)
              // section — same deep-link target as the product detail page.
              navigation.navigate('Main', {
                screen: 'Message',
                params: { initialTab: 'general' },
              });
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
              {formatDepositBalance(depositBalance ?? 0)}
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
        {(() => {
          /*
            내주문 카드 — 4개 탭(구매대행 / 로켓·3PL / VVIC하이패스 / 배송대행)을
            하나의 틀거리에 묶고, 첫머리 탭이 붉은색으로 활성화될 때마다
            밑의 5×2 그리드 내용이 바뀐다. 각 셀: 왼쪽 라벨 / 오른쪽 카운트,
            disabled=true 셀은 연한 회색 + 클릭 불가.
          */
          type Cell = {
            labelKey: string;
            count: number;
            initialTab?: string;
            disabled?: boolean;
            accent?: boolean;
          };
          // 4개 탭 모두 하나의 BuyList 페지로 내비게이션된다 (별도 페지 없음).
          // 활성 도메인은 BuyList 의 발주관리 드롭다운에 의해 결정되므로
          // 셀을 누를 때 domain 파라미터로 어떤 도메인을 활성화할지 전달한다.
          // BuyListScreen 의 useEffect 가 route.params.domain 변화를 감지해
          // activeBusinessDomain 을 동기화한다.
          const tabDomain: Record<typeof activeOrderTab, string> = {
            purchase_agency: 'purchase_agency',
            rocket_3pl: 'rocket_3pl',
            vvic_hipass: 'vvic_hipass',
            shipping_agency: 'shipping_agency',
          };

          /**
           * 도메인 하나의 ProfileOrderCounts 를 카드의 10개 셀 배열로 변환한다.
           * 라벨 구성은 4개 탭이 모두 동일하고, 다른 점은 카운트뿐 — 그래서
           * 한 함수로 4개 탭의 셀을 일관되게 만든다. 백엔드가 viewFilterCounts
           * 를 도메인 무관 전체로 내리므로 orderCountsByDomain[domain] 는
           * 클라이언트에서 도메인 분류 후 다시 계산한 결과를 갖는다.
           */
          const buildCells = (
            counts: ProfileOrderCountsByDomain[keyof ProfileOrderCountsByDomain],
          ): Cell[] => {
            const total =
              (counts.quotePending || 0) +
              (counts.unpaid || 0) +
              (counts.to_be_shipped || 0) +
              (counts.shipped || 0) +
              (counts.processed || 0) +
              (counts.shipping_delay || 0) +
              (counts.error || 0) +
              (counts.refunds || 0) +
              (counts.problemProducts || 0);
            return [
              // 견적대기 ↔ counts.quotePending (P_QUOTE 가 그대로 남은 주문)
              { labelKey: 'profile.quoteWaiting', count: counts.quotePending, initialTab: 'category' },
              { labelKey: 'profile.customerConfirm', count: 0, disabled: true },
              // 고객결제 ↔ counts.unpaid (BUY_PAY_WAIT + 자동 전환된 P_QUOTE)
              { labelKey: 'profile.customerPayment', count: counts.unpaid, initialTab: 'unpaid' },
              { labelKey: 'profile.paymentReview', count: 0, disabled: true },
              { labelKey: 'profile.orderPurchasing', count: counts.to_be_shipped, initialTab: 'to_be_shipped' },
              { labelKey: 'profile.orderWarehoused', count: counts.processed, initialTab: 'processed' },
              { labelKey: 'profile.shipmentWaiting', count: counts.shipping_delay, initialTab: 'shipping_delay' },
              { labelKey: 'profile.partialShipment', count: 0, disabled: true },
              { labelKey: 'profile.orderCompleted', count: counts.shipped, initialTab: 'shipped' },
              { labelKey: 'profile.allOrders', count: total, initialTab: 'all', accent: true },
            ];
          };

          const myOrderTabContent: Record<typeof activeOrderTab, Cell[]> = {
            purchase_agency: buildCells(orderCountsByDomain.purchase_agency),
            rocket_3pl: buildCells(orderCountsByDomain.rocket_3pl),
            vvic_hipass: buildCells(orderCountsByDomain.vvic_hipass),
            shipping_agency: buildCells(orderCountsByDomain.shipping_agency),
          };

          const tabs: { key: typeof activeOrderTab; labelKey: string }[] = [
            { key: 'purchase_agency', labelKey: 'profile.tabPurchaseAgency' },
            { key: 'rocket_3pl', labelKey: 'profile.tabRocket3pl' },
            { key: 'vvic_hipass', labelKey: 'profile.tabVvicHipass' },
            { key: 'shipping_agency', labelKey: 'profile.tabShippingAgency' },
          ];

          const activeCells = myOrderTabContent[activeOrderTab];
          // 5×2 그리드 — 2개씩 묶어 5행으로 나눈다.
          const rows: Cell[][] = [];
          for (let i = 0; i < activeCells.length; i += 2) {
            rows.push(activeCells.slice(i, i + 2));
          }

          return (
            <View style={styles.myOrder}>
              {/* 탭 스트립 — 활성 탭은 붉은색 */}
              <View style={styles.myOrderTabRow}>
                {tabs.map((tab, idx) => {
                  const isActive = activeOrderTab === tab.key;
                  return (
                    <React.Fragment key={tab.key}>
                      <TouchableOpacity
                        style={styles.myOrderTabItem}
                        activeOpacity={0.6}
                        onPress={() => setActiveOrderTab(tab.key)}
                      >
                        <Text
                          style={[
                            styles.myOrderTabText,
                            isActive && styles.myOrderTabTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {t(tab.labelKey)}
                        </Text>
                      </TouchableOpacity>
                      {idx < tabs.length - 1 && (
                        <Text style={styles.myOrderTabChevron}>{'>'}</Text>
                      )}
                    </React.Fragment>
                  );
                })}
              </View>

              {/* 5×2 셀 그리드 — 활성 탭의 데이터로 렌더 */}
              <View style={styles.myOrderGrid}>
                {rows.map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.myOrderGridRow}>
                    {row.map((cell, cellIdx) => {
                      const labelStyle = [
                        styles.myOrderCellLabel,
                        cell.disabled && styles.myOrderCellLabelDisabled,
                      ];
                      const countStyle = [
                        styles.myOrderCellCount,
                        cell.disabled && styles.myOrderCellCountDisabled,
                        cell.accent && styles.myOrderCellCountAccent,
                      ];
                      if (cell.disabled) {
                        return (
                          <View
                            key={cellIdx}
                            style={[styles.myOrderCell, styles.myOrderCellDisabled]}
                          >
                            <Text style={labelStyle}>{t(cell.labelKey)}</Text>
                            <Text style={countStyle}>{cell.count}</Text>
                          </View>
                        );
                      }
                      return (
                        <TouchableOpacity
                          key={cellIdx}
                          style={styles.myOrderCell}
                          onPress={() => {
                            // 셀별 initialTab 키('category', 'unpaid' 등)는 실제
                            // Order.status 값과 정확히 매칭되지 않아 본문이 빈 상태로
                            // 보이는 문제가 있었다. 발주관리 드롭다운에서 도메인을 직접
                            // 누른 것과 동일한 결과를 보장하기 위해 다음과 같이 보낸다:
                            //  • 전체주문(accent) 셀 → initialTab: 'all' (모든 그룹)
                            //  • 그 외 셀 → initialTab: <도메인 그룹 키> ('purchase_agency'
                            //    / 'warehouse' / 'international_shipping' / 'error')
                            // BuyListScreen 의 STATUS_GROUPS 키와 정렬되어 본문이
                            // 그 도메인의 주문 카드 리스트를 즉시 표시한다.
                            const domain = tabDomain[activeOrderTab];
                            // 구매대행 도메인: 발주관리 드롭다운의 '구매대행' 클릭과
                            //   동일 — activeTab='purchase_agency' (그룹 전체 표시).
                            // 비-구매대행 도메인: 본문이 placeholder 로 렌더되므로
                            //   필터링이 의미 없음 — activeTab='all' 로 보냄.
                            const groupTab =
                              domain === 'purchase_agency' ? 'purchase_agency' : 'all';
                            (navigation as any).navigate('BuyList', {
                              domain,
                              initialTab: cell.accent ? 'all' : groupTab,
                            });
                          }}
                        >
                          <Text style={labelStyle}>{t(cell.labelKey)}</Text>
                          <Text style={countStyle}>{cell.count}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          );
        })()}
        {/*
          Hidden per request — 8-item quick grid (위시리스트 / 팔로우하는
          스토어 / 쿠폰 / 포인트 / Affiliate Marketing / 피드백 / 고객 지원 / 고객
          지원). The wrapping `SHOW_QUICK_MENU_GRID` flag is referenced
          via a function call so TypeScript can't determine at compile
          time that the inner JSX is unreachable (avoiding the
          "Unreachable code" hint that a literal `false &&` triggers).
          Flip the flag to `true` to bring the menu strip back without
          touching the JSX below.
        */}
        {((): boolean => false)() && (
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
        )}
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
    
    const handleLike = () => {
      toggleWishlist(product);
    };
    
    return (
      <ProductCard
        key={`moretolove-${product.id || index}`}
        product={product}
        variant="moreToLove"
        cardWidth={moreToLoveGrid.cardWidth}
        onPress={() => handleProductPress(product)}
        onLikePress={handleLike}
        isLiked={isProductLiked(product)}
        showLikeButton={true}
        showDiscountBadge={true}
        showRating={true}
      />
    );
  }, [user, isGuest, toggleWishlist, handleProductPress, isProductLiked, moreToLoveGrid.cardWidth]);

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
    const moreToLoveSectionStyle = {
      paddingHorizontal: moreToLoveGrid.horizontalInset,
    };
    const moreToLoveProductRowStyle = {
      gap: moreToLoveGrid.columnGap,
      marginBottom: moreToLoveGrid.rowGap,
    };

    if (recommendationsLoading && productsToDisplay.length === 0) {
      return (
        <View style={[styles.moreToLoveSection, moreToLoveSectionStyle]}>
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
        <View style={[styles.moreToLoveSection, moreToLoveSectionStyle]}>
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
      <View style={[styles.moreToLoveSection, moreToLoveSectionStyle]}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <FlatList
          data={productsToDisplay}
          renderItem={renderMoreToLoveItem}
          keyExtractor={(item, index) => `moretolove-${item.id?.toString() || index}-${index}`}
          numColumns={2}
          scrollEnabled={false}
          nestedScrollEnabled
          columnWrapperStyle={moreToLoveProductRowStyle}
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
        refreshControl={
          <RefreshControl
            refreshing={profileRefreshing}
            onRefresh={onProfileRefresh}
            colors={[COLORS.red]}
            tintColor={COLORS.red}
          />
        }
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
    paddingBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  // 내주문 카드 상단 탭 스트립 — 구매대행 > 로켓/3PL > VVIC하이패스 >
  myOrderTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.md,
  },
  myOrderTabItem: {
    paddingVertical: SPACING.xs,
    flexShrink: 1,
  },
  myOrderTabText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.secondary,
  },
  myOrderTabTextActive: {
    color: COLORS.red,
  },
  myOrderTabChevron: {
    marginHorizontal: SPACING.xs,
    color: COLORS.text.secondary,
    fontSize: FONTS.sizes.md,
    fontWeight: '400',
  },
  // 5×2 셀 그리드
  myOrderGrid: {
    flexDirection: 'column',
  },
  myOrderGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  myOrderCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    minHeight: 52,
  },
  myOrderCellDisabled: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  myOrderCellLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
    flexShrink: 1,
  },
  myOrderCellLabelDisabled: {
    color: COLORS.text.secondary,
    opacity: 0.6,
  },
  myOrderCellCount: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
  },
  myOrderCellCountDisabled: {
    color: COLORS.text.secondary,
    opacity: 0.6,
  },
  myOrderCellCountAccent: {
    color: COLORS.red,
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
    flex: 1,
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



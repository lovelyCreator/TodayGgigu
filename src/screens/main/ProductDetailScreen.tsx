import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  SafeAreaView,
  Modal,
  StatusBar,
  Share,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from '../../components/Icon';
// Removed WebView import - using simpler HTML rendering approach
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, SERVER_BASE_URL } from '../../constants';
import { useAuth } from '../../context/AuthContext';

import { ProductCard, SearchButton } from '../../components';
import { PhotoCaptureModal } from '../../components';
import { usePlatformStore } from '../../store/platformStore';
import { useAppSelector } from '../../store/hooks';
import { ActivityIndicator } from 'react-native';
import { Product } from '../../types';
import { useProductDetailMutation } from '../../hooks/useProductDetailMutation';
import { useRelatedRecommendationsMutation } from '../../hooks/useRelatedRecommendationsMutation';
import { useSearchProductsMutation } from '../../hooks/useSearchProductsMutation';
import { useAddToCartMutation } from '../../hooks/useAddToCartMutation';
import { useCheckoutDirectPurchaseMutation } from '../../hooks/useCheckoutDirectPurchaseMutation';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../context/ToastContext';
import { formatPriceKRW, getLocalizedText } from '../../utils/i18nHelpers';
import { useWishlistStatus } from '../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../hooks/useDeleteFromWishlistMutation';
import { useGetCartMutation } from '../../hooks/useGetCartMutation';
import { productsApi } from '../../services/productsApi';
import HeartPlusIcon from '../../assets/icons/HeartPlusIcon';
import FamilyStarIcon from '../../assets/icons/FamilyStarIcon';
import ArrowBackIcon from '../../assets/icons/ArrowBackIcon';
import CartIcon from '../../assets/icons/CartIcon';
import StarIcon from '../../assets/icons/StarIcon';
import StarHalfIcon from '../../assets/icons/StarHalfIcon';
import StarOutlineIcon from '../../assets/icons/StarOutlineIcon';
import DeliveryIcon from '../../assets/icons/DeliveryIcon';
import ArrowRightIcon from '../../assets/icons/ArrowRightIcon';
import HeartIcon from '../../assets/icons/HeartIcon';
import CameraIcon from '../../assets/icons/CameraIcon';
import SupportAgentIcon from '../../assets/icons/SupportAgentIcon';
import ContentCopyIcon from '../../assets/icons/ContentCopyIcon';
import PlusIcon from '../../assets/icons/PlusIcon';
import MinusIcon from '../../assets/icons/MinusIcon';
import ShareAppIcon from '../../assets/icons/ShareAppIcon';
import CheckIcon from '../../assets/icons/CheckIcon';
import ShoppingCreditsIcon from '../../assets/icons/ShoppingCreditsIcon';
import HomeIcon from '../../assets/icons/HomeIcon';
import SellerShopIcon from '../../assets/icons/SellerShopIcon';
import ImageSearchResultsModal from './searchScreen/ImageSearchResultsModal';
import SearchImageIcon from '../../assets/icons/SearchImageIcon';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 400;

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { productId, offerId, productData: initialProductData, source: routeSource, country: routeCountry } = route.params || {};
  // console.log("[ProductDetailScreen] routeSource:", routeSource);
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS OR HOOKS THAT USE THEM
  // Get platform and locale (defined early so they can be used in callbacks)
  const { selectedPlatform } = usePlatformStore();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { t } = useTranslation();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  
  // Use wishlist status hook to check if products are liked based on external IDs
  const { isProductLiked, refreshExternalIds, addExternalId, removeExternalId } = useWishlistStatus();
  const { user, isAuthenticated } = useAuth();
  
  // Use refs to track values (defined early)
  const sourceRef = useRef<string>('1688');
  const countryRef = useRef<string>('en');
  const hasFetchedProductRef = useRef<string | null>(null);

  // Keep refs in sync with route params / store so fetch calls use correct source/country
  useEffect(() => {
    // Prefer explicit route params when provided, otherwise fallback to selectedPlatform/locale
    const rawSource = (route.params?.source as string) || selectedPlatform || '1688';
    sourceRef.current = (rawSource === 'live-commerce' || rawSource === 'companymall' || rawSource === 'myCompany' || rawSource?.toLowerCase() === 'mycompany') ? 'ownmall' : rawSource;
    countryRef.current = (route.params?.country as string) || (locale === 'zh' ? 'zh' : locale === 'ko' ? 'ko' : 'en');
  }, [route.params?.source, route.params?.country, selectedPlatform, locale]);
  
  // Use product data from navigation params if available, otherwise fetch
  const [product, setProduct] = useState<any>(initialProductData || null);
  const [loading, setLoading] = useState(!initialProductData);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);

  // Scroll-based header animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_SCROLL_THRESHOLD = 80;

  // Image search state
  const [similarSearchVisible, setSimilarSearchVisible] = useState(false);
  const [similarSearchBase64, setSimilarSearchBase64] = useState<string>('');
  const [similarSearchUri, setSimilarSearchUri] = useState<string>('');
  const [isFetchingBase64, setIsFetchingBase64] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  // Initialize quantity with minOrderQuantity if available, otherwise 1
  const [quantity, setQuantity] = useState(() => {
    const minOrderQty = initialProductData?.minOrderQuantity;
    return minOrderQty && minOrderQty > 0 ? minOrderQty : 1;
  });
  
  // Add to wishlist mutation (defined after t and showToast)
  const { mutate: addToWishlist } = useAddToWishlistMutation({
    onSuccess: async (data) => {
      showToast(t('product.productAddedToWishlist'), 'success');
      // Immediately refresh external IDs to update heart icon color
      await refreshExternalIds();
      // Refresh wishlist count
      const externalId = product?.offerId || product?.externalId || product?.id || productId || offerId || '';
      const fetchSource = sourceRef.current;
      if (externalId && fetchSource) {
        try {
          const response = await productsApi.getWishlistCount(externalId.toString(), fetchSource);
          if (response.success && response.data) {
            setWishlistCount(response.data.count || 0);
          }
        } catch (error) {
          // console.error('Failed to refresh wishlist count:', error);
        }
      }
    },
    onError: (error) => {
      showToast(error || t('product.failedToAddToWishlist'), 'error');
    },
  });

  // Delete from wishlist mutation
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation({
    onSuccess: async (data) => {
      showToast(t('product.productRemovedFromWishlist'), 'success');
      // Immediately refresh external IDs to update heart icon color
      await refreshExternalIds();
      // Refresh wishlist count
      const externalId = product?.offerId || product?.externalId || product?.id || productId || offerId || '';
      const fetchSource = sourceRef.current;
      if (externalId && fetchSource) {
        try {
          const response = await productsApi.getWishlistCount(externalId.toString(), fetchSource);
          if (response.success && response.data) {
            setWishlistCount(response.data.count || 0);
          }
        } catch (error) {
          // console.error('Failed to refresh wishlist count:', error);
        }
      }
    },
    onError: (error) => {
      showToast(error || t('product.failedToRemoveFromWishlist'), 'error');
    },
  });
  
  // Add to cart mutation (for Add to Cart button)
  const { mutate: addToCart, isLoading: isAddingToCart } = useAddToCartMutation({
    onSuccess: (data) => {
      // console.log('Product added to cart successfully:', data);
      showToast(t('product.addedToCart'), 'success');
      // Navigate to cart screen
      navigation.navigate('Cart');
    },
    onError: (error) => {
      // console.error('Failed to add product to cart:', error);
      showToast(error || t('product.failedToAdd'), 'error');
    },
  });
  
  // Get cart mutation to fetch cart after adding product (for Buy Now - navigates to Payment)
  const { mutate: fetchCart } = useGetCartMutation({
    onSuccess: (data) => {
      // console.log('Cart fetched after Buy Now:', data);
      // Find the cart item we just added
      const cartData = data?.cart;
      const cartItems = cartData?.items || [];
      
      // Find the item that matches our product
      const productIdForUrl = product?.offerId || product?.id || productId || offerId || '';
      const addedCartItem = cartItems.find((item: any) => 
        item.offerId?.toString() === productIdForUrl.toString() ||
        item.productId?.toString() === productIdForUrl.toString()
      );
      
      if (!addedCartItem) {
        showToast(t('product.failedToFindCartItem'), 'error');
        return;
      }
      
      // Format the item for Payment screen (similar to CartScreen)
      const price = parseFloat(addedCartItem.skuInfo?.price || addedCartItem.skuInfo?.consignPrice || addedCartItem.price || product?.price || '0');
      const productQuantity = quantity;
      
      // Extract color and size from variations
      const variations = (addedCartItem.skuInfo?.skuAttributes || []).map((attr: any) => ({
        name: attr.attributeNameTrans || attr.attributeName || '',
        value: attr.valueTrans || attr.value || '',
      }));
      
      const colorVariation = variations.find((v: any) =>
        v.name.toLowerCase().includes('color') || v.name.toLowerCase().includes('colour')
      );
      const sizeVariation = variations.find((v: any) =>
        v.name.toLowerCase().includes('size')
      );
      
      const paymentItem = {
        id: addedCartItem.id || addedCartItem._id || productIdForUrl.toString(),
        _id: addedCartItem._id, // Cart item ID from backend
        name: product?.name || product?.subjectTrans || product?.subject || addedCartItem.subjectTrans || '',
        color: colorVariation?.value || selectedVariations[Object.keys(selectedVariations).find(k => k.toLowerCase().includes('color')) || ''] || undefined,
        size: sizeVariation?.value || selectedVariations[Object.keys(selectedVariations).find(k => k.toLowerCase().includes('size')) || ''] || undefined,
        price: price,
        quantity: productQuantity,
        image: product?.images?.[0] || product?.image || addedCartItem.imageUrl || '',
      };
      
      const totalAmount = price * productQuantity;
      
      // Navigate directly to Payment page (like CartScreen does)
      navigation.navigate('Payment', {
        items: [paymentItem],
        totalAmount: totalAmount,
        fromCart: false, // Indicate this is from Buy Now, not cart
        selectedAddress: user?.addresses?.find(addr => addr.isDefault) || user?.addresses?.[0],
      });
    },
    onError: (error) => {
      // console.error('Failed to fetch cart after Buy Now:', error);
      showToast(t('product.failedToProceed'), 'error');
    },
  });

  // Direct purchase checkout (Buy Now) - POST /cart/checkout/direct-purchase, then navigate to Payment with response
  const resolveText = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && ('en' in value || 'ko' in value || 'zh' in value)) {
      const o = value as Record<string, string>;
      return getLocalizedText({ en: o.en ?? '', ko: o.ko ?? '', zh: o.zh ?? '' }, locale);
    }
    return String(value);
  };

  const { mutate: checkoutDirectPurchase, isLoading: isAddingToCartForBuyNow } = useCheckoutDirectPurchaseMutation({
    onSuccess: (data) => {
      if (!data.selectedItems || data.selectedItems.length === 0) {
        showToast(t('product.failedToProceed'), 'error');
        return;
      }
      const paymentItems = data.selectedItems.map((item: any) => ({
        id: item._id,
        _id: item._id,
        offerId: item.offerId,
        name: resolveText(item.subjectMultiLang ?? item.subjectTrans ?? item.subject) || '',
        price: item.previewFinalUnitPriceKRW ?? parseFloat(item.skuInfo?.price || '0'),
        quantity: item.quantity,
        image: item.imageUrl,
        source: item.source,
        skuInfo: item.skuInfo,
        companyName: resolveText(item.companyName) || '',
        sellerOpenId: item.sellerOpenId,
      }));
      const totalAmount = data.productTotalKRW ?? paymentItems.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
      navigation.navigate('Payment', {
        items: paymentItems,
        totalAmount,
        fromCart: false,
        estimatedShippingCost: data.estimatedShippingCost ?? 0,
        estimatedShippingCostBySeller: data.estimatedShippingCostBySeller ?? {},
        checkoutData: {
          productTotalKRW: data.productTotalKRW,
          shippingTotalKRW: data.shippingTotalKRW,
          estimatedShippingCost: data.estimatedShippingCost,
          estimatedShippingCostBySeller: data.estimatedShippingCostBySeller,
          availableCoupons: data.availableCoupons,
          availablePoints: data.availablePoints,
          transportationMethods: data.transportationMethods,
          additionalServicePrices: data.additionalServicePrices,
          serviceFeePercentage: data.serviceFeePercentage,
          estimatedRuralCost: data.estimatedRuralCost,
        },
        directPurchaseItems: data.selectedItems,
        selectedAddress: user?.addresses?.find(addr => addr.isDefault) || user?.addresses?.[0],
      });
    },
    onError: (error) => {
      showToast(error || t('product.failedToProceed'), 'error');
    },
  });

  // Toggle wishlist function
  const toggleWishlist = async (product: any) => {
    if (!user || !isAuthenticated) {
      showToast(t('home.pleaseLogin'), 'warning');
      return;
    }

    // Get product external ID - prioritize externalId, never use MongoDB _id
    const externalId = 
      (product as any).externalId?.toString() ||
      (product as any).offerId?.toString() ||
      '';

    if (!externalId) {
      showToast(t('product.invalidProductId'), 'error');
      return;
    }

    const isLiked = isProductLiked(product);
    const source = (product as any).source || selectedPlatform || '1688';
    const country = locale === 'zh' ? 'en' : locale;

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
        showToast(t('product.invalidProductData'), 'error');
        return;
      }

      // Optimistic update - add to state and AsyncStorage immediately
      await addExternalId(externalId);
      addToWishlist({ offerId: externalId, platform: source });
    }
  };

  // Handle follow/unfollow store
  const handleFollowStore = async () => {
    if (!user || !isAuthenticated) {
      showToast(t('home.pleaseLogin'), 'warning');
      // navigation.navigate()
      return;
    }

    if (isStoreFollowed) {
      // Show unfollow confirmation modal
      setShowUnfollowModal(true);
    } else {
      // Follow directly
      await performFollowAction();
    }
  };

  const performFollowAction = async () => {
    setIsFollowingStore(true);
    try {
      // Get company name from product metadata or seller
      const companyName = (product as any).metadata?.original1688Data?.companyName || 
                          product.seller?.name || 
                          'Store';
      
      // Get shop ID and name
      const shopId = product.seller?.id || (product as any).sellerOpenId || '';
      const shopName = companyName;
      
      // Get platform
      const platform = source === 'taobao' ? 'taobao' : '1688';
      
      // Get up to 2 products from the current product
      const products = [
        {
          offerId: product.offerId || product.id || '',
          title: product.name || product.subject || '',
          imageUrl: product.image || product.images?.[0] || '',
          price: product.price || 0,
        }
      ];
      
      const response = await productsApi.followStoreWithProducts(shopId, shopName, products, platform);
      
      if (response.success) {
        setIsStoreFollowed(true);
        showToast(t('live.storeFollowedSuccessfully'), 'success');
      } else {
        showToast(response.message || t('live.failedToFollowStore'), 'error');
      }
    } catch (error) {
      showToast(t('live.failedToFollowStore'), 'error');
    } finally {
      setIsFollowingStore(false);
    }
  };

  const performUnfollowAction = async () => {
    setIsFollowingStore(true);
    try {
      const shopId = product.seller?.id || (product as any).sellerOpenId || '';
      const platform = source === 'taobao' ? 'taobao' : '1688';
      
      const response = await productsApi.toggleFollowStore(shopId, platform, 'unfollow');
      
      if (response.success) {
        setIsStoreFollowed(false);
        showToast(t('live.storeUnfollowedSuccessfully'), 'success');
      } else {
        showToast(response.message || t('live.failedToUnfollowStore'), 'error');
      }
    } catch (error) {
      showToast(t('live.failedToUnfollowStore'), 'error');
    } finally {
      setIsFollowingStore(false);
      setShowUnfollowModal(false);
    }
  };
  
  // Additional state declarations - MUST be before any hooks that use them
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullSpecifications, setShowFullSpecifications] = useState(false);
  const [currentStatIndex, setCurrentStatIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [photoCaptureVisible, setPhotoCaptureVisible] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedProductsPage, setRelatedProductsPage] = useState(1);
  const [relatedProductsHasMore, setRelatedProductsHasMore] = useState(true);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [similarProductsPage, setSimilarProductsPage] = useState(1);
  const [similarProductsHasMore, setSimilarProductsHasMore] = useState(true);
  const [similarProductsLoadingMore, setSimilarProductsLoadingMore] = useState(false);
  const isFetchingSimilarProductsRef = useRef(false);
  const loadedPagesRef = useRef<Set<number>>(new Set());
  const [isStoreFollowed, setIsStoreFollowed] = useState(false);
  const [isFollowingStore, setIsFollowingStore] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);

  // Use source from route params if available, otherwise use selectedPlatform
  // Memoize to prevent infinite loops - only depend on route params, not store values
  const source = useMemo(() => {
    const raw = routeSource || selectedPlatform || '1688';
    // Normalize ownmall-family sources
    if (raw === 'live-commerce' || raw === 'companymall' || raw === 'myCompany' || raw?.toLowerCase() === 'mycompany') return 'ownmall';
    return raw;
  }, [routeSource, selectedPlatform]);
  const country = useMemo(() => routeCountry || (locale === 'zh' ? 'en' : locale), [routeCountry, locale]);
  
  // Live stats data - defined before useEffect that uses it
  const liveStats = [
    { icon: 'star', color: '#FFD700', text: '155+ people gave 5-star reviews' },
    { icon: 'cart-outline', color: COLORS.primary, text: '900+ people bought this item' },
    { icon: 'heart-outline', color: COLORS.red, text: '3,000+ people added to cart' },
  ];
  
  // Search products mutation (for Taobao related products) - MUST be before useEffect hooks
  const { mutate: searchProducts, isLoading: searchProductsLoading } = useSearchProductsMutation({
    onSuccess: (data) => {
      if (!data || !data.products || !Array.isArray(data.products)) {
        setRelatedProducts([]);
        setRelatedProductsHasMore(false);
        return;
      }

      // Map search results to Product format
      const mappedProducts: Product[] = data.products.map((item: any) => {
        return {
          id: item.id?.toString() || item.externalId?.toString() || '',
          externalId: item.externalId?.toString() || item.id?.toString() || '',
          offerId: item.offerId?.toString() || item.externalId?.toString() || item.id?.toString() || '',
          name: item.name || item.title || '',
          description: item.description || '',
          images: item.images || (item.image ? [item.image] : []),
          image: item.image || item.images?.[0] || '',
          price: item.price || 0,
          originalPrice: item.originalPrice || item.price || 0,
          category: item.category || { id: '', name: '', icon: '', image: '', subcategories: [] },
          subcategory: item.subcategory || { id: '', name: '', icon: '', image: '', subcategories: [] },
          brand: item.brand || '',
          seller: item.seller || { id: '', name: '', avatar: '', rating: 0, reviewCount: 0, isVerified: false, followersCount: 0, description: '', location: '', joinedDate: new Date() },
          rating: item.rating || 0,
          reviewCount: item.reviewCount || 0,
          rating_count: item.rating_count || 0,
          inStock: item.inStock !== undefined ? item.inStock : true,
          stockCount: item.stockCount || 0,
          tags: item.tags || [],
          isNew: item.isNew || false,
          isFeatured: item.isFeatured || false,
          isOnSale: item.isOnSale || false,
          createdAt: item.createdAt || new Date(),
          updatedAt: item.updatedAt || new Date(),
          orderCount: item.orderCount || 0,
          repurchaseRate: item.repurchaseRate || '',
          source: item.source || 'taobao',
        } as Product;
      });

      setRelatedProducts(mappedProducts);
      setRelatedProductsHasMore(
        data.pagination?.pageNo < Math.ceil((data.pagination?.totalRecords || 0) / (data.pagination?.pageSize || 20))
      );
    },
    onError: (error) => {
      // console.error('Failed to search related products:', error);
      setRelatedProducts([]);
      setRelatedProductsHasMore(false);
    },
  });

  // Related recommendations mutation (for non-Taobao products)
  const { mutate: fetchRelatedRecommendations, isLoading: relatedRecommendationsLoading } = useRelatedRecommendationsMutation({
    onSuccess: (data) => {
      if (!data || !data.recommendations) {
        return;
      }

      let mappedProducts: Product[] = [];

      // Non-Taobao related recommendations mapping (1688 and other platforms)
      mappedProducts = data.recommendations.map((rec: any) => ({
          id: rec.offerId?.toString() || '',
          externalId: rec.offerId?.toString() || '',
          offerId: rec.offerId?.toString() || '',
          name: country === 'zh' ? (rec.subject || rec.subjectTrans || '') : (rec.subjectTrans || rec.subject || ''),
          description: '',
          price: parseFloat(rec.priceInfo?.price || 0),
          originalPrice: parseFloat(rec.priceInfo?.price || 0),
          image: rec.imageUrl || '',
          images: rec.imageUrl ? [rec.imageUrl] : [],
          category: {
            id: rec.topCategoryId?.toString() || '',
            name: '',
            icon: '',
            image: '',
            subcategories: [],
          },
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
            joinedDate: new Date(),
          },
          rating: 0,
          reviewCount: 0,
          rating_count: 0,
          inStock: true,
          stockCount: 0,
          tags: [],
          isNew: false,
          isFeatured: false,
          isOnSale: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          orderCount: 0,
          repurchaseRate: '',
          mainVideo: '',
          rawVariants: [],
          attributes: [],
          productSkuInfos: [],
          productSaleInfo: {},
          productShippingInfo: {},
          sellerDataInfo: {},
          minOrderQuantity: 1,
          unitInfo: {},
          categoryId: rec.topCategoryId,
          subject: rec.subject || '',
          subjectTrans: rec.subjectTrans || rec.subject || '',
          promotionUrl: '',
        }));

      setRelatedProducts(mappedProducts);
      setRelatedProductsHasMore(
        data.pagination?.pageNo <
          Math.ceil((data.pagination?.totalRecords || 0) / (data.pagination?.pageSize || 10))
      );
    },
    onError: (error) => {
      showToast(error || t('product.failedToLoadRelatedProducts'), 'error');
    },
  });

  // Product detail mutation - MUST be called before any useEffect hooks
  const { mutate: fetchProductDetail, isLoading: isFetchingDetail } = useProductDetailMutation({
    onSuccess: (data) => {
      // console.log('📦 [ProductDetailScreen] Product detail fetched successfully:', {
      //   hasData: !!data,
      //   dataKeys: data ? Object.keys(data) : [],
      //   source,
      // });

      // Taobao product detail mapping
      if (source === 'taobao' && data) {
        const taobao = data;

        // Images from pic_urls
        const images: string[] = Array.isArray(taobao.pic_urls) ? taobao.pic_urls : [];

        // Build map from sku_id to localized properties if multi_language_info.sku_properties exists
        const localizedSkuPropsMap: Record<string, any[]> = {};
        if (taobao.multi_language_info?.sku_properties && Array.isArray(taobao.multi_language_info.sku_properties)) {
          taobao.multi_language_info.sku_properties.forEach((skuProp: any) => {
            if (skuProp && skuProp.sku_id) {
              localizedSkuPropsMap[skuProp.sku_id.toString()] = skuProp.properties || [];
            }
          });
        }

        // Map SKUs to variants
        const rawVariants = (taobao.sku_list || []).map((sku: any) => {
          const skuId = sku.sku_id?.toString() || '';
          const localizedProps = localizedSkuPropsMap[skuId] || sku.properties || [];

          const name = Array.isArray(localizedProps)
            ? localizedProps
                .map((p: any) => `${p.prop_name || p.propId}: ${p.value_name || p.value_desc || p.valueId}`)
                .join(' / ')
            : '';

          const priceNum = Number(sku.promotion_price ?? sku.price ?? taobao.promotion_price ?? taobao.price ?? 0);
          const price = isNaN(priceNum) ? 0 : priceNum;

          return {
            id: skuId,
            name,
            price,
            stock: sku.quantity || 0,
            image: sku.pic_url || images[0] || '',
            attributes: localizedProps,
            specId: sku.spec_id || skuId,
            skuId,
          };
        });

        // Map attributes (properties) to simple name/value pairs
        const attributes = (taobao.multi_language_info?.properties || taobao.properties || []).map((attr: any) => ({
          name: attr.prop_name || '',
          value: attr.value_name || '',
        }));

        const priceNum = Number(taobao.promotion_price ?? taobao.price ?? 0);
        const price = isNaN(priceNum) ? 0 : priceNum;

        const mappedProduct = {
          id: taobao.item_id?.toString() || productId?.toString() || '',
          externalId: taobao.item_id?.toString() || '',
          offerId: taobao.item_id?.toString() || '',
          name: taobao.multi_language_info?.title || taobao.title || '',
          description: taobao.description || '',
          images,
          image: images[0] || '',
          price,
          originalPrice: price,
          category: {
            id: taobao.category_id?.toString() || '',
            name: taobao.category_name || '',
            icon: '',
            image: '',
            subcategories: [],
          },
          brand: '',
          seller: {
            id: taobao.shop_id?.toString() || '',
            name: taobao.shop_name || '',
            avatar: '',
            rating: 0,
            reviewCount: 0,
            isVerified: false,
            followersCount: 0,
            description: '',
            location: '',
            joinedDate: new Date(),
          },
          rating: 0,
          reviewCount: 0,
          rating_count: 0,
          inStock: true,
          stockCount: (taobao.sku_list || []).reduce(
            (sum: number, sku: any) => sum + (sku.quantity || 0),
            0
          ),
          tags: taobao.tags || [],
          isNew: false,
          isFeatured: false,
          isOnSale: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          orderCount: 0,
          repurchaseRate: '',
          // Additional fields to align with 1688 mapping
          mainVideo: '',
          rawVariants,
          attributes,
          productSkuInfos: taobao.sku_list || [],
          productSaleInfo: {},
          productShippingInfo: {},
          sellerDataInfo: {},
          minOrderQuantity: 1,
          unitInfo: {},
          categoryId: taobao.category_id,
          subject: taobao.title || '',
          subjectTrans: taobao.multi_language_info?.title || taobao.title || '',
          promotionUrl: '',
        };

        setProduct(mappedProduct);
        setLoading(false);

        const currentProductId = productId?.toString() || offerId?.toString() || '';
        if (currentProductId) {
          hasFetchedProductRef.current = currentProductId;
        }
        return;
      }

      // 1688 / default product detail mapping
      if (data && data.product) {
        // Map API response to product format
        const apiProduct = data.product;
        
        // Extract images from productImage.images
        const images = apiProduct.productImage?.images || [];
        
        // Map SKUs to variants
        const rawVariants = (apiProduct.productSkuInfos || []).map((sku: any) => ({
          id: sku.skuId?.toString() || '',
          name: sku.skuAttributes?.map((attr: any) => 
            `${attr.attributeNameTrans || attr.attributeName}: ${attr.valueTrans || attr.value}`
          ).join(' / ') || '',
          price: parseFloat(sku.price || sku.consignPrice || 0),
          stock: sku.amountOnSale || 0,
          image: sku.skuAttributes?.[0]?.skuImageUrl || images[0] || '',
          attributes: sku.skuAttributes || [],
          specId: sku.specId || '',
          skuId: sku.skuId?.toString() || '',
        }));
        
        // Map product attributes
        const attributes = (apiProduct.productAttribute || []).map((attr: any) => ({
          name: attr.attributeNameTrans || attr.attributeName,
          value: attr.valueTrans || attr.value,
        }));
        
        // Map product data
        const mappedProduct = {
          id: apiProduct.offerId?.toString() || productId?.toString() || '',
          offerId: apiProduct.offerId?.toString() || '',
          name: resolveText(locale === 'zh' ? (apiProduct.subject || apiProduct.subjectTrans || '') : (apiProduct.subjectTrans || apiProduct.subject || '')),
          description: typeof apiProduct.description === 'string' ? apiProduct.description : '',
          images: images,
          image: images[0] || '',
          price: parseFloat(apiProduct.productSaleInfo?.priceRangeList?.[0]?.price || apiProduct.productSkuInfos?.[0]?.price || 0),
          originalPrice: parseFloat(apiProduct.productSaleInfo?.priceRangeList?.[0]?.price || apiProduct.productSkuInfos?.[0]?.price || 0),
          category: {
            id: apiProduct.categoryId?.toString() || '',
            name: '',
            icon: '',
            image: '',
            subcategories: [],
          },
          brand: '',
          seller: {
            id: apiProduct.sellerOpenId || '',
            name: resolveText(apiProduct.companyName) || '',
            avatar: '',
            rating: parseFloat(apiProduct.sellerDataInfo?.compositeServiceScore || apiProduct.tradeScore || 0),
            reviewCount: 0,
            isVerified: false,
            followersCount: 0,
            description: '',
            location: apiProduct.productShippingInfo?.sendGoodsAddressText || '',
            joinedDate: new Date(),
          },
          rating: parseFloat(apiProduct.tradeScore || 0),
          reviewCount: parseInt(apiProduct.soldOut || '0', 10),
          rating_count: parseInt(apiProduct.soldOut || '0', 10),
          inStock: (apiProduct.productSaleInfo?.amountOnSale || 0) > 0,
          stockCount: apiProduct.productSaleInfo?.amountOnSale || 0,
          tags: [],
          isNew: false,
          isFeatured: false,
          isOnSale: false,
          createdAt: apiProduct.createDate ? new Date(apiProduct.createDate) : new Date(),
          updatedAt: new Date(),
          orderCount: parseInt(apiProduct.soldOut || '0', 10),
          repurchaseRate: apiProduct.sellerDataInfo?.repeatPurchasePercent || '',
          // Additional fields from API
          mainVideo: apiProduct.mainVideo || '',
          rawVariants: rawVariants,
          attributes: attributes,
          productSkuInfos: apiProduct.productSkuInfos || [],
          productSaleInfo: apiProduct.productSaleInfo || {},
          productShippingInfo: apiProduct.productShippingInfo || {},
          sellerDataInfo: apiProduct.sellerDataInfo || {},
          minOrderQuantity: apiProduct.minOrderQuantity || 1,
          unitInfo: apiProduct.productSaleInfo?.unitInfo || {},
          // Additional fields for cart API
          categoryId: apiProduct.categoryId,
          subject: apiProduct.subject || '',
          subjectTrans: apiProduct.subjectTrans || apiProduct.subject || '',
          promotionUrl: apiProduct.promotionUrl || '',
        };
        
        setProduct(mappedProduct);
        setLoading(false);
        // Mark this productId as fetched
        const currentProductId = productId?.toString() || offerId?.toString() || '';
        if (currentProductId) {
          hasFetchedProductRef.current = currentProductId;
        }
      }
    },
    onError: (error) => {
      const errorStr = typeof error === 'string' ? error : (error as any)?.message || String(error);
      // console.error('📦 [ProductDetailScreen] Product detail fetch error:', {
      //   error,
      //   errorType: typeof error,
      //   errorMessage: errorStr,
      //   productId,
      //   offerId,
      //   source,
      //   country,
      // });
      setLoading(false);
      // Reset ref on error so we can retry
      hasFetchedProductRef.current = null;
      
      // Check if it's a 404 or "not found" error
      const errorMessage = errorStr.toLowerCase();
      const isNotFound = 
        errorMessage.includes('404') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('no product') ||
        errorMessage.includes('product not found');
      
      if (isNotFound) {
        // Navigate to 404 page after a short delay
        setTimeout(() => {
          navigation.navigate('NotFound', {
            message: t('notFound.productNotFound') || 'The product you are looking for could not be found.',
            title: t('notFound.productTitle') || 'Product Not Found',
          });
        }, 500);
      } else if (!errorMessage.includes('numeric') && !errorMessage.includes('offerid')) {
        showToast(error || t('home.productDetailsError'), 'error');
      }
    },
  });

  // Update quantity when product is loaded/updated with minOrderQuantity
  useEffect(() => {
    if (product?.minOrderQuantity && product.minOrderQuantity > 0) {
      setQuantity(product.minOrderQuantity);
    }
  }, [product?.minOrderQuantity]);

  // Fetch product detail if productId is available and no initialProductData
  // Only fetch once per productId - use route params in dependencies to avoid infinite loops
  useEffect(() => {
    if (initialProductData) {
      setProduct(initialProductData);
      setLoading(false);
      // Mark as fetched so we don't fetch again
      const currentProductId = productId?.toString() || offerId?.toString() || '';
      if (currentProductId) {
        hasFetchedProductRef.current = currentProductId;
      }
    } else {
      // Determine which productId to use
      const currentProductId = productId?.toString() || offerId?.toString() || '';
      
      if (currentProductId) {
        // Check if we've already fetched for this productId
        const alreadyFetched = hasFetchedProductRef.current === currentProductId;
        
        // Only fetch if we haven't fetched for this productId yet and not currently loading
        if (!alreadyFetched && !isFetchingDetail) {
          hasFetchedProductRef.current = currentProductId; // Mark as fetching
          setLoading(true);
          const fetchSource = sourceRef.current;
          const fetchCountry = countryRef.current;
          // console.log('📦 [ProductDetailScreen] Fetching product detail:', {
          //   currentProductId,
          //   productId,
          //   offerId,
          //   source: fetchSource,
          //   country: fetchCountry,
          //   routeSource,
          //   routeCountry,
          // });
          fetchProductDetail(currentProductId, fetchSource, fetchCountry);
        } else if (alreadyFetched) {
          // Already fetched, don't show loading
          setLoading(false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, offerId, initialProductData, routeSource, routeCountry]); // Use route params instead of derived source/country
  
  // Fetch wishlist count when product is loaded
  useEffect(() => {
    const fetchWishlistCount = async () => {
      if (!product) return;
      
      const externalId = product?.offerId || product?.externalId || product?.id || productId || offerId || '';
      const fetchSource = sourceRef.current;
      
      if (!externalId || !fetchSource) return;
      
      try {
        const response = await productsApi.getWishlistCount(externalId.toString(), fetchSource);
        if (response.success && response.data) {
          setWishlistCount(response.data.count || 0);
        } else {
          setWishlistCount(0);
        }
      } catch (error) {
        // console.error('Failed to fetch wishlist count:', error);
        setWishlistCount(0);
      }
    };
    
    fetchWishlistCount();
  }, [product, productId, offerId, routeSource]);

  // Fetch related products when productId is available
  useEffect(() => {
    const currentProductId = productId?.toString() || offerId?.toString() || '';
    if (currentProductId && product) {
      // Map locale to language code
      const language = locale === 'zh' ? 'zh' : locale === 'ko' ? 'ko' : 'en';
      const fetchSource = sourceRef.current; // Use ref to avoid infinite loops
      
      if (fetchSource === 'taobao') {
        // For Taobao, use search API with category name as keyword
        const searchKeyword = product.category?.name || '';
        if (searchKeyword) {
          // console.log('🔍 [ProductDetailScreen] Fetching related products via search API for Taobao:', {
          //   keyword: searchKeyword,
          //   source: fetchSource,
          //   language,
          // });
          searchProducts(searchKeyword, fetchSource, language, 1, 20, undefined, undefined, undefined, undefined, false); // requireAuth = false for product detail page
        }
      } else {
        // For non-Taobao, use related recommendations API
        fetchRelatedRecommendations(currentProductId, 1, 10, language, fetchSource);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, offerId, locale, product, routeSource]); // Use routeSource instead of source to avoid infinite loops
  
  // Load more similar products - MUST be before early return
  const loadMoreSimilarProducts = useCallback(() => {
    // Function removed - API integration removed
  }, []);

  // Extract image URLs from HTML description - MUST be before early return
  const extractImagesFromHtml = useCallback((html: string): string[] => {
    if (!html) return [];
    
    // Match all img tags with src attribute
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const images: string[] = [];
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      if (match[1]) {
        images.push(match[1]);
    }
    }
    
    return images;
  }, []);

  // Get product images from API only (not from HTML description)
  const getApiProductImages = useCallback((currentProduct: any): string[] => {
    if (!currentProduct) return [];
    
    // Use images array from API, or fallback to single image
    const apiImages = (currentProduct as any).images || [];
    if (apiImages.length > 0) {
      return apiImages;
    }
    
    // Fallback to single image if images array is empty
    if (currentProduct.image) {
      return [currentProduct.image];
    }
    
    return [];
  }, []);

  // Parse variation types from variant names
  // Example: "Color: Cat print thickened modal-grey / Specifications: 20*25cm"
  // IMPORTANT: This must be defined before early return to avoid hooks order issues
  const getVariationTypes = useCallback(() => {
    if (!product) return [];
    
    const variationTypesMap = new Map<string, Map<string, { value: string; image?: string; [key: string]: any }>>();
    
    // Get source to determine filtering logic
    const currentSource = (product as any).source || routeSource || selectedPlatform || '1688';
    
    // Check if we have raw variants data (from product detail API)
    const rawVariants = (product as any).rawVariants || [];
    const productSkuInfos = (product as any).productSkuInfos || [];
    
    if (rawVariants.length > 0) {
      // Parse each variant name to extract variation types
      rawVariants.forEach((variant: any) => {
        // Filter out variations based on source
        if (currentSource === '1688') {
          // For 1688, filter out if amountOnSale is 0
          // Check in variant first, then try to find in productSkuInfos
          let amountOnSale = variant.amountOnSale;
          if (amountOnSale === undefined && variant.skuId) {
            const matchingSku = productSkuInfos.find((sku: any) => 
              sku.skuId?.toString() === variant.skuId?.toString() || 
              sku.specId?.toString() === variant.specId?.toString()
            );
            amountOnSale = matchingSku?.amountOnSale;
          }
          if (amountOnSale === 0) {
            return; // Skip this variant
          }
        } else if (currentSource === 'taobao') {
          // For Taobao, filter out if quantity is 0
          const quantity = variant.quantity || variant.stock || 0;
          if (quantity === 0) {
            return; // Skip this variant
          }
        }
        
        const variantName = variant.name || '';
        
        if (!variantName) return;
        
        // Split by "/" to get each variation type
        const parts = variantName.split('/').map((p: string) => p.trim());
        
        parts.forEach((part: string) => {
          // Extract type name (before ":") and value (after ":")
          const colonIndex = part.indexOf(':');
          if (colonIndex === -1) return;
          
          const typeName = part.substring(0, colonIndex).trim();
          const value = part.substring(colonIndex + 1).trim();
          
          if (!typeName || !value) return;
          
          // Initialize map for this variation type if it doesn't exist
          if (!variationTypesMap.has(typeName)) {
            variationTypesMap.set(typeName, new Map());
          }
          
          const optionsMap = variationTypesMap.get(typeName)!;
          
          // Only add if value doesn't exist (remove duplicates)
          if (!optionsMap.has(value)) {
            optionsMap.set(value, {
              value: value,
              image: variant.image || undefined,
              ...variant,
            });
          }
        });
      });
    }
    
    // Convert map to array format
    const variationTypes: Array<{ name: string; options: Array<{ value: string; image?: string; [key: string]: any }> }> = [];
    
    variationTypesMap.forEach((optionsMap, typeName) => {
      // Options are already filtered at the variant level above
      // Just convert to array and add to variationTypes
      const options = Array.from(optionsMap.values());
      
      if (options.length > 0) {
        variationTypes.push({
          name: typeName,
          options: options,
        });
      }
    });
    
    return variationTypes;
  }, [product, routeSource, selectedPlatform, selectedVariations]);

  // Check if all variation types are selected
  // IMPORTANT: This must be defined before early return to avoid hooks order issues
  const canAddToCart = useMemo(() => {
    const variationTypes = getVariationTypes();
    
    // If there are no variations, buttons should be enabled
    if (variationTypes.length === 0) {
      return true;
    }
    
    // Check if all variation types have selections
    for (const variationType of variationTypes) {
      const variationName = variationType.name.toLowerCase();
      const selectedValue = selectedVariations[variationName] || 
                           (variationName === 'color' ? selectedColor : null) ||
                           (variationName === 'size' ? selectedSize : null);
      
      if (!selectedValue) {
        return false; // At least one variation is not selected
      }
    }
    
    return true; // All variations are selected
  }, [getVariationTypes, selectedVariations, selectedColor, selectedSize]);

  // Get selected variation price - MUST be before early return
  const getSelectedVariationPrice = useMemo(() => {
    if (!product) return { price: 0, originalPrice: 0 };
    
    const source = routeSource || selectedPlatform || '1688';
    
    if (source === 'taobao') {
      // For Taobao, find the selected variation and return its price
      const selectedVariation = product.rawVariants?.find((variant: any) => {
        if (!variant.attributes || !Array.isArray(variant.attributes)) return false;
        
        return Object.keys(selectedVariations).every(variantName => {
          const selectedValue = selectedVariations[variantName];
          return variant.attributes.some((attr: any) => {
            const attrName = attr.prop_name || attr.propId || '';
            const attrValue = attr.value_name || attr.value_desc || attr.valueId || '';
            return attrName === variantName && attrValue === selectedValue;
          });
        });
      });
      
      if (selectedVariation) {
        return {
          price: selectedVariation.price || product.price || 0,
          originalPrice: selectedVariation.price || product.originalPrice || product.price || 0,
        };
      }
    } else {
      // For 1688, find the selected SKU and return its consignPrice
      const productSkuInfos = (product as any).productSkuInfos || [];
      const rawVariants = (product as any).rawVariants || [];
      
      // Find matching variant from rawVariants
      let selectedVariant: any = null;
      if (rawVariants.length > 0 && Object.keys(selectedVariations).length > 0) {
        selectedVariant = rawVariants.find((variant: any) => {
          const variantName = variant.name || '';
          if (!variantName) return false;
          
          return Object.entries(selectedVariations).every(([variationName, selectedValue]) => {
            const searchPattern = `${variationName}: ${selectedValue}`;
            return variantName.toLowerCase().includes(searchPattern.toLowerCase());
          });
        });
      }
      
      // Get skuId from variant if found
      let skuIdFromVariant: string | number | null = null;
      if (selectedVariant) {
        skuIdFromVariant = selectedVariant.skuId || selectedVariant.id || null;
      }
      
      // Find matching SKU from productSkuInfos
      let selectedSku: any = null;
      if (productSkuInfos.length > 0) {
        if (skuIdFromVariant) {
          selectedSku = productSkuInfos.find((sku: any) => 
            sku.skuId?.toString() === skuIdFromVariant?.toString() || 
            sku.specId?.toString() === skuIdFromVariant?.toString()
          );
        }
        
        // If no match by skuId, try to match by attributes
        if (!selectedSku && Object.keys(selectedVariations).length > 0) {
          selectedSku = productSkuInfos.find((sku: any) => {
            const skuAttributes = sku.skuAttributes || [];
            return Object.entries(selectedVariations).every(([variationName, selectedValue]) => {
              return skuAttributes.some((attr: any) => {
                const attrName = (attr.attributeNameTrans || attr.attributeName || '').toLowerCase();
                const attrValue = attr.valueTrans || attr.value || '';
                return attrName === variationName.toLowerCase() && attrValue === selectedValue;
              });
            });
          });
        }
      }
      
      // For 1688, use consignPrice from selectedSku
      if (selectedSku?.consignPrice) {
        return {
          price: parseFloat(selectedSku.consignPrice) || product.price || 0,
          originalPrice: parseFloat(selectedSku.consignPrice) || product.originalPrice || product.price || 0,
        };
      } else if (selectedVariant?.consignPrice) {
        return {
          price: parseFloat(selectedVariant.consignPrice) || product.price || 0,
          originalPrice: parseFloat(selectedVariant.consignPrice) || product.originalPrice || product.price || 0,
        };
      }
    }
    
    return { price: product.price || 0, originalPrice: product.originalPrice || product.price || 0 };
  }, [product, selectedVariations, routeSource, selectedPlatform]);

  const handleRelatedProductPress = useCallback((item: Product | any) => {
    const productIdToUse = (item as any).offerId || item.id;
    const itemSource =
      selectedPlatform === 'taobao'
        ? (item as any).source || 'taobao'
        : (item as any).source || selectedPlatform || '1688';
    const itemCountry = locale === 'zh' ? 'zh' : locale === 'ko' ? 'ko' : 'en';

    navigation.push('ProductDetail', {
      productId: productIdToUse?.toString() || item.id?.toString() || '',
      offerId: (item as any).offerId?.toString(),
      source: itemSource,
      country: itemCountry,
    });
  }, [locale, navigation, selectedPlatform]);

  const renderRelatedProductItem = useCallback(({ item }: { item: Product | any }) => {
    if (selectedPlatform === 'taobao') {
      return (
        <TouchableOpacity
          style={styles.similarProductItem}
          onPress={() => handleRelatedProductPress(item)}
        >
          <View style={styles.simpleTaobaoCard}>
            <Image
              source={{ uri: (item as any).image }}
              style={styles.simpleTaobaoImage as any}
              resizeMode="cover"
            />
            <Text style={styles.simpleTaobaoTitle} numberOfLines={2}>
              {(item as any).name}
            </Text>
            <Text style={styles.simpleTaobaoPrice}>
              {formatPriceKRW(Number((item as any).price || 0))}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.similarProductItem}>
        <ProductCard
          product={item}
          variant="moreToLove"
          onPress={() => handleRelatedProductPress(item)}
          onLikePress={() => toggleWishlist(item)}
          isLiked={isProductLiked(item)}
        />
      </View>
    );
  }, [handleRelatedProductPress, isProductLiked, selectedPlatform, toggleWishlist]);

  const relatedProductsKeyExtractor = useCallback(
    (item: Product | any, index: number) =>
      `related-${item.id?.toString() || (item as any).offerId?.toString() || index}-${index}`,
    [],
  );

  const renderSimilarProductItem = useCallback(({ item }: { item: Product }) => (
    <View style={styles.similarProductItem}>
      <ProductCard
        product={item}
        variant="moreToLove"
        onPress={() => navigation.push('ProductDetail', { productId: item.id })}
        onLikePress={() => toggleWishlist(item)}
        isLiked={isProductLiked(item)}
      />
    </View>
  ), [isProductLiked, navigation, toggleWishlist]);

  const similarProductsKeyExtractor = useCallback(
    (item: Product, index: number) => `similar-${item.id?.toString() || index}-${index}`,
    [],
  );

  const renderSimilarProductsFooter = useCallback(() => {
    if (!similarProductsLoadingMore) {
      return null;
    }

    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  }, [similarProductsLoadingMore]);

  // Early return - MUST be after ALL hooks
  if (loading || !product) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: SPACING.md, color: COLORS.text.secondary }}>{t('product.loadingProduct')}</Text>
      </View>
    );
  }

  const isLiked = isProductLiked(product);

  const handleQuantityChange = (increment: boolean) => {
    const minOrderQuantity = (product as any)?.minOrderQuantity || 1;
    if (increment) {
      setQuantity(prev => prev + 1);
    } else {
      setQuantity(prev => Math.max(minOrderQuantity, prev - 1));
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      // Navigate to login page with return navigation info
      navigation.navigate('Auth', {
        screen: 'Login',
        params: {
          returnTo: 'ProductDetail',
          returnParams: {
            productId: productId || offerId,
            offerId: offerId,
            productData: product,
          },
        },
      } as never);
      return;
    }

    if (!canAddToCart) {
      const variationTypes = getVariationTypes();
      if (variationTypes.length > 0) {
        showToast(t('product.pleaseSelectOptions'), 'warning');
      }
      return;
    }

    // Check minOrderQuantity
    const minOrderQuantity = (product as any).minOrderQuantity || 1;
    if (quantity < minOrderQuantity) {
      showToast(
        t('product.minOrderQuantity') || `Minimum order quantity is ${minOrderQuantity}`,
        'warning'
      );
      return;
    }

    try {
      // Get the selected SKU based on selected variations
      const productSkuInfos = (product as any).productSkuInfos || [];
      const rawVariants = (product as any).rawVariants || [];
      
      // Get source from product, route params, or selected platform
      const source = (product as any).source || route.params?.source || selectedPlatform || '1688';
      
      // Find the matching variant/SKU based on selected variations
      let selectedVariant: any = null;
      let selectedSku: any = null;
      
      // First, try to find matching variant from rawVariants (for Taobao, this contains sku_id from sku_properties)
      if (rawVariants.length > 0) {
        if (Object.keys(selectedVariations).length > 0) {
          // Match variant based on selected variations
          // Variant name format: "Color: Red / Size: Large"
          selectedVariant = rawVariants.find((variant: any) => {
            const variantName = variant.name || '';
            if (!variantName) return false;
            
            // Check if all selected variations match this variant's name
            return Object.entries(selectedVariations).every(([variationName, selectedValue]) => {
              // Check if variant name contains the selected value
              // Format: "variationName: selectedValue"
              const searchPattern = `${variationName}: ${selectedValue}`;
              return variantName.toLowerCase().includes(searchPattern.toLowerCase());
            });
          });
        }
        
        // If no match found or no variations selected, use the first variant
        if (!selectedVariant && rawVariants.length > 0) {
          selectedVariant = rawVariants[0];
        }
      }
      
      // If we found a variant, get skuId from it (this comes from sku_properties)
      let skuIdFromVariant: string | number | null = null;
      let variantPrice: number | null = null;
      
      if (selectedVariant) {
        skuIdFromVariant = selectedVariant.skuId || selectedVariant.id || null;
        variantPrice = selectedVariant.price || null;
      }
      
      // Now try to find matching SKU from productSkuInfos
      if (productSkuInfos.length > 0) {
        if (skuIdFromVariant) {
          // Find SKU by skuId
          selectedSku = productSkuInfos.find((sku: any) => 
            sku.skuId?.toString() === skuIdFromVariant?.toString() || 
            sku.specId?.toString() === skuIdFromVariant?.toString()
          );
        }
        
        // If we have selected variations but no skuId from variant, try to match by attributes
        if (!selectedSku && Object.keys(selectedVariations).length > 0) {
          selectedSku = productSkuInfos.find((sku: any) => {
            const skuAttributes = sku.skuAttributes || [];
            // Check if all selected variations match this SKU
            return Object.entries(selectedVariations).every(([variationName, selectedValue]) => {
              return skuAttributes.some((attr: any) => {
                const attrName = (attr.attributeNameTrans || attr.attributeName || '').toLowerCase();
                const attrValue = attr.valueTrans || attr.value || '';
                return attrName === variationName.toLowerCase() && attrValue === selectedValue;
              });
            });
          });
        }
        
        // If no match found, use the first SKU
        if (!selectedSku && productSkuInfos.length > 0) {
          selectedSku = productSkuInfos[0];
        } 
      }
      
      // Determine final skuId, specId, and price
      // Priority: skuId from variant (from sku_properties) > skuId from selectedSku > fallback
      const finalSkuId = skuIdFromVariant || selectedSku?.skuId || selectedVariant?.skuId || selectedVariant?.id || '0';
      
      // Determine specId based on source:
      // - For 1688: Use specId from selectedSku if available (specId exists separately in SKU info)
      // - For Taobao: specId can be same as skuId
      const isTaobao = source === 'taobao';
      const finalSpecId = isTaobao 
        ? finalSkuId.toString() // For Taobao, specId same as skuId
        : (selectedSku?.specId?.toString() || finalSkuId.toString()); // For 1688, use specId from SKU info if available
      
      const finalPrice = variantPrice || selectedSku?.price || selectedSku?.consignPrice || product.price || 0;
      
      // Get product ID for promotionUrl
      const productIdForUrl = product.offerId || product.id || productId || offerId || '';
      
      // For Taobao cases, set promotionUrl
      const promotionUrl = isTaobao 
        ? `${SERVER_BASE_URL}/${productIdForUrl}`
        : ((product as any).promotionUrl || '');
      
      // Convert skuId to number if it's a string
      const skuIdValue = typeof finalSkuId === 'string' ? parseInt(finalSkuId) || 0 : finalSkuId;
      
      // Build the request body
      const requestBody = {
        offerId: parseInt(productIdForUrl.toString() || '0'),
        categoryId: parseInt((product as any).categoryId || product.category?.id || '0'),
        subject: resolveText((product as any).subject || product.name || ''),
        subjectTrans: resolveText((product as any).subjectTrans || product.name || ''),
        imageUrl: product.images?.[0] || product.image || '',
        promotionUrl: promotionUrl,
        source: source,
        skuInfo: {
          skuId: skuIdValue,
          specId: finalSpecId,
          price: finalPrice.toString(),
          amountOnSale: selectedSku?.amountOnSale || selectedVariant?.stock || 0,
          consignPrice: finalPrice.toString(),
          cargoNumber: selectedSku?.cargoNumber || '',
          skuAttributes: (selectedSku?.skuAttributes || selectedVariant?.attributes || []).map((attr: any) => ({
            attributeId: parseInt(attr.attributeId || attr.propId || '0', 10) || 0,
            attributeName: attr.attributeName || attr.prop_name || '',
            attributeNameTrans: attr.attributeNameTrans || attr.prop_name || attr.attributeName || '',
            value: attr.value || attr.value_name || attr.value_desc || '',
            valueTrans: attr.valueTrans || attr.value_name || attr.value_desc || attr.value || '',
            skuImageUrl: attr.skuImageUrl || attr.image || '',
          })),
          fenxiaoPriceInfo: selectedSku?.fenxiaoPriceInfo || {
            offerPrice: finalPrice.toString(),
          },
        },
        companyName: resolveText(product.seller?.name || (product as any).companyName || ''),
        sellerOpenId: product.seller?.id || (product as any).sellerOpenId || '',
        quantity: quantity,
        minOrderQuantity: minOrderQuantity,
      };
      
      await addToCart(requestBody);
    } catch (error: any) {
      showToast(error?.message || t('product.failedToAdd'), 'error');
    }
  };

  // Handle Buy Now - same logic as handleAddToCart but navigates to Checkout
  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      showToast(t('home.pleaseLogin'), 'warning');
      return;
    }

    if (!canAddToCart) {
      const variationTypes = getVariationTypes();
      if (variationTypes.length > 0) {
        showToast(t('product.pleaseSelectOptions'), 'warning');
      }
      return;
    }

    // Check minOrderQuantity
    const minOrderQuantity = (product as any).minOrderQuantity || 1;
    if (quantity < minOrderQuantity) {
      showToast(
        t('product.minOrderQuantity') || `Minimum order quantity is ${minOrderQuantity}`,
        'warning'
      );
      return;
    }

    try {
      // Reuse the same logic from handleAddToCart
      const productSkuInfos = (product as any).productSkuInfos || [];
      const rawVariants = (product as any).rawVariants || [];
      const fetchSource = sourceRef.current;
      
      let selectedVariant: any = null;
      let selectedSku: any = null;
      
      if (rawVariants.length > 0) {
        if (Object.keys(selectedVariations).length > 0) {
          selectedVariant = rawVariants.find((variant: any) => {
            const variantName = variant.name || '';
            if (!variantName) return false;
            return Object.entries(selectedVariations).every(([variationName, selectedValue]) => {
              const searchPattern = `${variationName}: ${selectedValue}`;
              return variantName.toLowerCase().includes(searchPattern.toLowerCase());
            });
          });
        }
        if (!selectedVariant && rawVariants.length > 0) {
          selectedVariant = rawVariants[0];
        }
      }
      
      let skuIdFromVariant: string | number | null = null;
      let variantPrice: number | null = null;
      
      if (selectedVariant) {
        skuIdFromVariant = selectedVariant.skuId || selectedVariant.id || null;
        variantPrice = selectedVariant.price || null;
      }
      
      if (productSkuInfos.length > 0) {
        if (skuIdFromVariant) {
          selectedSku = productSkuInfos.find((sku: any) => 
            sku.skuId?.toString() === skuIdFromVariant?.toString() || 
            sku.specId?.toString() === skuIdFromVariant?.toString()
          );
        }
        
        if (!selectedSku && Object.keys(selectedVariations).length > 0) {
          selectedSku = productSkuInfos.find((sku: any) => {
            const skuAttributes = sku.skuAttributes || [];
            return Object.entries(selectedVariations).every(([variationName, selectedValue]) => {
              return skuAttributes.some((attr: any) => {
                const attrName = (attr.attributeNameTrans || attr.attributeName || '').toLowerCase();
                const attrValue = attr.valueTrans || attr.value || '';
                return attrName === variationName.toLowerCase() && attrValue === selectedValue;
              });
            });
          });
        }
        
        if (!selectedSku && productSkuInfos.length > 0) {
          selectedSku = productSkuInfos[0];
        }
      }
      
      const finalSkuId = skuIdFromVariant || selectedSku?.skuId || selectedVariant?.skuId || selectedVariant?.id || '0';
      
      // Determine specId based on source:
      // - For 1688: Use specId from selectedSku if available (specId exists separately in SKU info)
      // - For Taobao: specId can be same as skuId
      const isTaobao = fetchSource === 'taobao';
      const finalSpecId = isTaobao 
        ? finalSkuId.toString() // For Taobao, specId same as skuId
        : (selectedSku?.specId?.toString() || finalSkuId.toString()); // For 1688, use specId from SKU info if available
      
      const finalPrice = variantPrice || selectedSku?.price || selectedSku?.consignPrice || product.price || 0;
      
      const productIdForUrl = product.offerId || product.id || productId || offerId || '';
      const promotionUrl = isTaobao 
        ? `${SERVER_BASE_URL}/${productIdForUrl}`
        : ((product as any).promotionUrl || '');
      
      const skuIdValue = typeof finalSkuId === 'string' ? parseInt(finalSkuId) || 0 : finalSkuId;
      
      const skuInfoPayload = {
        skuId: skuIdValue,
        specId: finalSpecId,
        price: finalPrice.toString(),
        amountOnSale: selectedSku?.amountOnSale || selectedVariant?.stock || 0,
        consignPrice: finalPrice.toString(),
        cargoNumber: selectedSku?.cargoNumber || '',
        skuAttributes: (selectedSku?.skuAttributes || selectedVariant?.attributes || []).map((attr: any) => ({
          attributeId: parseInt(attr.attributeId || attr.propId || '0', 10) || 0,
          attributeName: attr.attributeName || attr.prop_name || '',
          attributeNameTrans: attr.attributeNameTrans || attr.prop_name || attr.attributeName || '',
          value: attr.value || attr.value_name || attr.value_desc || '',
          valueTrans: attr.valueTrans || attr.value_name || attr.value_desc || attr.value || '',
          skuImageUrl: attr.skuImageUrl || attr.image || '',
        })),
        fenxiaoPriceInfo: selectedSku?.fenxiaoPriceInfo || {
          offerPrice: finalPrice.toString(),
        },
      };

      const directPurchaseBody = {
        productId: parseInt(productIdForUrl.toString(), 10) || 0,
        source: fetchSource,
        quantity: String(quantity),
        price: typeof finalPrice === 'number' ? finalPrice : parseFloat(String(finalPrice)) || 0,
        sellerOpenId: product.seller?.id || (product as any).sellerOpenId || '',
        imageUrl: product.images?.[0] || product.image || '',
        promotionUrl: (product as any).promotionUrl || undefined,
        companyName: resolveText(product.seller?.name || (product as any).companyName || ''),
        subject: resolveText((product as any).subject || product.name || ''),
        subjectTrans: resolveText((product as any).subjectTrans || product.name || (product as any).subject || ''),
        categoryid: (product as any).categoryId?.toString() || product.category?.id?.toString() || undefined,
        categoryname: (product as any).categoryName || product.category?.name || undefined,
        skuInfo: skuInfoPayload,
      };

      checkoutDirectPurchase(directPurchaseBody);
    } catch (error: any) {
      showToast(error?.message || t('product.failedToProceedToCheckout'), 'error');
    }
  };

  const handleCartIconPress = () => {
    if (!isAuthenticated) {
      return;
    }
    navigation.navigate('Cart');
  };

  const handlePhotoCaptureConfirm = (data: { quantity: number; request: string; photos: string[] }) => {
    // Handle photo capture confirmation
    // In a real app, this would send the data to the server
  };

  const handleSimilarImageSearch = async () => {
    if (!product) return;
    const imageUrl = getApiProductImages(product)[0] || product.image || '';
    if (!imageUrl) {
      showToast(t('product.noProductImageAvailable'), 'error');
      return;
    }
    setIsFetchingBase64(true);
    try {
      const RNFS = require('react-native-fs');
      // Download the remote image to a temp file then read as base64
      const tempPath = `${RNFS.CachesDirectoryPath}/similar_search_${Date.now()}.jpg`;
      await RNFS.downloadFile({ fromUrl: imageUrl, toFile: tempPath }).promise;
      const base64 = await RNFS.readFile(tempPath, 'base64');
      setSimilarSearchUri(imageUrl);
      setSimilarSearchBase64(base64);
      setSimilarSearchVisible(true);
    } catch (e) {
      showToast(t('product.failedToLoadProductImage'), 'error');
    } finally {
      setIsFetchingBase64(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareContent = {
        message: t('product.shareMessage')
          .replace('{productName}', product.name)
          .replace('{price}', formatPriceKRW(product.price)),
        url: `https://todaymall.com/product/${productId}`, // Replace with your actual app URL
      };
      
      await Share.share(shareContent);
    } catch (error) {
      // Error sharing - silently fail
    }
  };

  const renderHeader = () => {
    const headerBg = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_THRESHOLD],
      outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'],
      extrapolate: 'clamp',
    });
    const searchBarOpacity = scrollY.interpolate({
      inputRange: [HEADER_SCROLL_THRESHOLD * 0.5, HEADER_SCROLL_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    const cameraIconOpacity = scrollY.interpolate({
      inputRange: [0, HEADER_SCROLL_THRESHOLD * 0.5],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <ArrowBackIcon width={12} height={20} color={COLORS.text.primary} />
        </TouchableOpacity>

        {/* Search bar — fades in on scroll */}
        <Animated.View style={[styles.headerCenter, { opacity: searchBarOpacity }]}>
          <SearchButton
            placeholder={t('category.searchPlaceholder') || 'Search products...'}
            onPress={() => navigation.navigate('Search' as never)}
            style={styles.searchButtonStyle}
            isHomepage={false}
          />
        </Animated.View>

        {/* Camera icon — fades out on scroll */}
        <Animated.View style={[styles.headerCameraIcon, { opacity: cameraIconOpacity }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSimilarImageSearch}
            disabled={isFetchingBase64}
          >
            <SearchImageIcon width={30} height={30} color={COLORS.black}/>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <ShareAppIcon width={24} height={24} color={COLORS.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleCartIconPress}>
            <CartIcon width={24} height={24} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderImageGallery = () => {
    // Use only API images (not from HTML description)
    const apiImages = getApiProductImages(product);
    const totalImages = apiImages.length;
    const currentStat = liveStats[currentStatIndex];
    
    if (totalImages === 0) {
      return null;
    }
    
    return (
      <View style={styles.imageGalleryContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setSelectedImageIndex(index);
          }}
          scrollEventThrottle={16}
        >
          {apiImages.map((img: string, index: number) => (
            <TouchableOpacity
              key={`image-${img}-${index}`}
              activeOpacity={0.9}
              onPress={() => {
                setViewerImageIndex(index);
                setImageViewerVisible(true);
              }}
            >
              <Image
                source={{ uri: img }}
                style={styles.productImage as any}
                resizeMode="cover"
                fadeDuration={300}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Image indicators */}
        <View style={styles.imageIndicators}>
          {apiImages.map((img: any, index: number) => (
            <View
              key={`indicator-${index}`}
              style={[
                styles.indicator,
                selectedImageIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
        <View style={styles.itemInfoBar}>
          {/* Review badge with star and review count */}
          <View style={styles.reviewBadgeContainer}>
            {/* <View style={styles.reviewBadge}>
              <FamilyStarIcon width={18} height={18} color={COLORS.white} />
              <Text style={[styles.reviewBadgeText, { marginLeft: SPACING.xs }]}>
                {product.rating?.toFixed(1) || '0'}
              </Text>
            </View> */}
            <Text style={styles.itemInfoText}>
              {totalImages}/{selectedImageIndex + 1}
            </Text>
          </View>
          
          <View style={{ flex: 1 }} />
          
          <View style={styles.heartButtonContainer}>
            {wishlistCount !== null && wishlistCount > 0 && (
              <Text style={styles.wishlistCountText}>{wishlistCount}</Text>
            )}
            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => toggleWishlist(product)}
            >
              <HeartPlusIcon
                width={24}
                height={24}
                color={isLiked ? COLORS.red : COLORS.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleCopyProductCode = async () => {
    const productCode = (product as any).productCode || 
                       (product as any).offerId || 
                       product.id || 
                       '';
    if (productCode) {
      await Clipboard.setString(productCode);
      setIsCopied(true);
      // Reset icon after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  const renderProductInfo = () => {
    // Calculate discount percentage
    const discount = product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;
    
    // Get product code
    const productCode = (product as any).productCode || 
                       (product as any).offerId || 
                       product.id || 
                       '';
    
    // Get soldOut number from product
    const soldOut = (product as any).soldOut || '0';
    
    return (
      <View style={styles.productInfoContainer}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name || t('product.product')}
        </Text>
        
        {/* Review/Rating Row */}
        <View style={styles.ratingRow}>
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {(() => {
                const rating = product.rating || 0;
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;
                const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                
                const stars = [];
                // Full stars
                for (let i = 0; i < fullStars; i++) {
                  stars.push(
                    <StarIcon key={`full-${i}`} width={16} height={16} color="#FF5500" />
                  );
                }
                // Half star
                if (hasHalfStar) {
                  stars.push(
                    <StarHalfIcon key="half" width={16} height={16} color="#FF5500" />
                  );
                }
                // Empty stars
                for (let i = 0; i < emptyStars; i++) {
                  stars.push(
                    <StarOutlineIcon key={`empty-${i}`} width={16} height={16} color="#E0E0E0" />
                  );
                }
                return stars;
              })()}
            </View>
            <Text style={styles.ratingText}>
              {product.rating?.toFixed(1) || '0'}
            </Text>
          </View>
          <View style={{ width: 1, height: 16, backgroundColor: COLORS.gray[500], marginRight: SPACING.sm }} />
          <Text style={styles.soldText}>{soldOut || 0} {t('product.sold')}</Text>
        </View>
        
        {/* Discount and Product Code badges */}
        <View style={styles.badgesRow}>
          {discount > 0 && (
            <View style={styles.discountBadgeInline}>
              <Text style={styles.discountBadgeText}>-{discount}%</Text>
            </View>
          )}
          {productCode && (
            <View style={styles.productCodeBadge}>
              <Text style={styles.productCodeBadgeText}>{t('product.productCodeLabel')} {productCode}</Text>
              <TouchableOpacity
                onPress={handleCopyProductCode}
                style={styles.copyIconButton}
              >
                {isCopied ? (
                  <CheckIcon size={18} color={COLORS.red} isSelected={true} />
                ) : (
                  <ContentCopyIcon width={18} height={18} color={COLORS.red} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  const renderRatingRow = () => {
    // Get soldOut number from product
    const soldOut = (product as any).soldOut || '0';
    
    return (
      <View style={styles.ratingRow}>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>
            {product.rating?.toFixed(1) || '0'}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.soldText}>{soldOut || 0} sold</Text>
      </View>
    );
  };

  const renderPriceRow = () => {
    const { price, originalPrice } = getSelectedVariationPrice;
    return (
      <View style={styles.priceRow}>
        <Text style={styles.pricePrimary}>{formatPriceKRW(price)}</Text>
        {originalPrice > 0 && originalPrice > price && (
          <Text style={styles.originalPriceRight}>{formatPriceKRW(originalPrice)}</Text>
        )}
      </View>
    );
  };

  const renderProductCode = () => (
    <>
      {/* Product Code with Copy Button */}
      {product.productCode && (
        <View style={styles.productCodeContainer}>
          <Text style={styles.productCodeLabel}>{t('product.productCodeLabel')} </Text>
          <Text style={styles.productCodeText}>{product.productCode}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyProductCode}
          >
            {isCopied ? (
              <CheckIcon size={16} color="#10B981" isSelected={true} circleColor="#10B981" />
            ) : (
              <ContentCopyIcon width={16} height={16} color={COLORS.primary} />
            )}
            <Text style={[
              styles.copyButtonText,
              isCopied && { color: "#10B981" }
            ]}>
              {isCopied ? t('product.copied') : t('product.copy')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );


  const renderVariationSelector = (variationType: { name: string; options: Array<{ value: string; image?: string; [key: string]: any }> }, index: number) => {
    const variationName = variationType.name.toLowerCase();
    
    // Get selected value from selectedVariations state
    const selectedValue = selectedVariations[variationName] || null;
    
    const handleSelect = (value: string) => {
      // Update selectedVariations state
      setSelectedVariations(prev => ({
        ...prev,
        [variationName]: value,
      }));
      
      // Also update selectedColor and selectedSize for backward compatibility with addToCart
      if (variationName === 'color') {
        setSelectedColor(value);
      } else if (variationName === 'size') {
        setSelectedSize(value);
      }
    };

    // First variation type shows with images (if available), others show only text
    const isFirstVariation = index === 0;
    const hasImages = variationType.options.some((opt: any) => opt.image);

    if (isFirstVariation) {
      // Render first variation type with images (if available) and text
      return (
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>{variationType.name}{selectedValue ? ` : ${selectedValue}` : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {variationType.options.map((option: any, optIndex: number) => {
              const isSelected = selectedValue === option.value;
              return (
                <TouchableOpacity
                  key={optIndex}
                  style={styles.colorOption}
                  onPress={() => handleSelect(option.value)}
                >
                  {option.image && (
                    <Image
                      source={{ uri: option.image }}
                      style={[
                        styles.colorImage,
                        isSelected && styles.selectedColorImage,
                      ] as any}
                    />
                  )}
                  <Text 
                    style={[
                      styles.colorName,
                      isSelected && styles.selectedColorName,
                    ]}
                    numberOfLines={3}
                  >
                    {option.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      );
    } else {
      // Render other variation types (or first if no images) as text buttons
      return (
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>{variationType.name}{selectedValue ? ` : ${selectedValue}` : ''}</Text>
          <View style={styles.sizeGrid}>
            {variationType.options.map((option: any, optIndex: number) => {
              const isSelected = selectedValue === option.value;
              return (
                <TouchableOpacity
                  key={optIndex}
                  style={[
                    styles.sizeOption,
                    isSelected && styles.selectedSizeOption,
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      isSelected && styles.selectedSizeText,
                    ]}
                  >
                    {option.value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }
  };

  const renderAllVariations = () => {
    const variationTypes = getVariationTypes();
    
    if (variationTypes.length === 0) {
      return null;
    }
    
    return variationTypes.map((variationType, index) => (
      <View key={index} style={{ paddingBottom: SPACING.md}}>
        {renderVariationSelector(variationType, index)}
      </View>
    ));
  };

  const renderServiceCommitment = () => {
    return (
      <View style={styles.serviceCommitmentContainer}>
        <Text style={styles.serviceCommitmentTitle}>
          {t('product.serviceCommitment.title')}
        </Text>
        {/* Choice line at the top */}
        <View style={styles.serviceCommitmentChoice}>
          <Text style={styles.serviceCommitmentChoiceText}>
            {t('product.serviceCommitment.choice')}
          </Text>
          <Text style={styles.serviceCommitmentChoiceContent}>
            {t('product.serviceCommitment.choiceContent')}
          </Text>
        </View>
        
        {/* Title and contents */}
        <View style={styles.serviceCommitmentContent}>
          <View style={styles.serviceCommitmentContentHeader}>
            <View style={styles.serviceCommitmentContentHeaderLeft}>
              <DeliveryIcon width={20} height={20} color={COLORS.text.red} />
              <Text style={styles.serviceCommitmentContentTitle}>
                {t('product.serviceCommitment.title')}
              </Text>
            </View>
            <View style={styles.serviceCommitmentContentHeaderRight}>
              <ArrowRightIcon width={10} height={10} color={COLORS.black} />
            </View>
          </View>
          <View style={styles.serviceCommitmentContentSeparator} >
            <Text style={styles.serviceCommitmentText}>
              Delivery:
            </Text>
            <Text style={[styles.serviceCommitmentText, { fontWeight: '800' }]}>
              Dec 19 - 26
            </Text>
          </View>
          <Text style={[styles.serviceCommitmentText, { marginLeft: SPACING.lg }]}>
            Courier company:
          </Text>
        </View>
      </View>
    );
  };

  const renderSellerInfo = () => {
    // Get company name from product metadata or seller
    const companyName = (product as any).metadata?.original1688Data?.companyName || 
                        product.seller?.name || 
                        'Store';
    
    // Get seller rating
    const sellerRating = product.seller?.rating || 
                        (product as any).metadata?.original1688Data?.sellerDataInfo?.compositeServiceScore || 
                        '0';
    
    // Get sold count
    const soldCount = product.orderCount || product.reviewCount || 0;
    const soldText = soldCount >= 1000 
      ? `${Math.floor(soldCount / 1000)},${String(soldCount % 1000).padStart(3, '0')}+` 
      : `${soldCount}+`;
    
    return (
      <View style={styles.sellerInfoContainer}>
        <TouchableOpacity 
          style={styles.sellerHeader}
          onPress={() => {
            const sellerId = product.seller?.id || (product as any).sellerOpenId || '';
            const shopId = source === 'taobao' 
              ? (product.seller?.id || (product as any).shop_id || '')
              : sellerId;
            
            if (shopId) {
              navigation.navigate('SellerProfile', {
                sellerId: shopId,
                sellerName: companyName,
                source: source,
                country: country,
              });
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.sellerDetails}>
            <Text style={styles.sellerNameBold}>{companyName}</Text>
            <View style={styles.sellerStatsRow}>
              <View style={styles.sellerRatingContainer}>
                {(() => {
                  const r = typeof sellerRating === 'number' ? sellerRating : parseFloat(sellerRating) || 0;
                  const full = Math.floor(r);
                  const half = r % 1 >= 0.5;
                  const empty = 5 - full - (half ? 1 : 0);
                  const stars: React.ReactNode[] = [];
                  for (let i = 0; i < full; i++) stars.push(<StarIcon key={`sf-${i}`} width={16} height={16} color="#FF5500" />);
                  if (half) stars.push(<StarHalfIcon key="sh" width={16} height={16} color="#FF5500" />);
                  for (let i = 0; i < empty; i++) stars.push(<StarOutlineIcon key={`se-${i}`} width={16} height={16} color="#E0E0E0" />);
                  return stars;
                })()}
                <Text style={styles.sellerRatingText}>
                  {typeof sellerRating === 'number' ? sellerRating.toFixed(1) : sellerRating}
                </Text>
              </View>
              <Text style={styles.sellerSoldText}>| {soldText} sold</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.followButton, isStoreFollowed && styles.followButtonActive]}
          onPress={handleFollowStore}
          disabled={isFollowingStore || isStoreFollowed}
        >
          {isFollowingStore ? (
            <ActivityIndicator size="small" color={isStoreFollowed ? COLORS.text.primary : COLORS.white} />
          ) : (
            <>
              {!isStoreFollowed && <PlusIcon width={16} height={16} color={COLORS.white} />}
              <Text style={[styles.followButtonText, isStoreFollowed && styles.followButtonTextActive]}>
                {isStoreFollowed ? 'Following' : 'Follow'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };


  const renderReviews = () => (
    <View style={styles.reviewsContainer}>
      <View style={styles.reviewsHeader}>
        <Text style={styles.reviewsTitle}>{t('product.reviewsCount').replace('{count}', product.ratingCount || '5.5K')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Reviews', { productId })}>
          <Text style={styles.seeAllText}>{t('product.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      {(product.reviews || []).slice(0, 2).map((review: any, index: number) => (
        <View key={review.id || `review-${index}`} style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <Image
              source={{ uri: 'https://picsum.photos/seed/user/50/50' }}
              style={styles.reviewAvatar as any}
            />
            <View style={styles.reviewUserInfo}>
              <Text style={styles.reviewUserName}>{review.user || 'Artimus'}</Text>
              <View style={styles.reviewRating}>
                {[...Array(5)].map((_, i) => (
                  <Icon
                    key={i}
                    name="star"
                    size={12}
                    color={i < (review.rating || 5) ? '#FFD700' : COLORS.gray[300]}
                  />
                ))}
              </View>
            </View>
          </View>
          <Text style={styles.reviewText}>
            {review.comment || 'This product is absolutely Great.'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderProductDetails = () => {
    // Use product attributes from API (productAttribute with attributeNameTrans and valueTrans)
    const attributes = product.attributes || [];
    
    // Extract images from HTML description
    const descriptionImages = product.description ? extractImagesFromHtml(product.description) : [];
    
    // Strip HTML tags and get plain text
    const stripHtml = (html: string) => {
      if (!html) return '';
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const plainText = product.description ? stripHtml(product.description) : '';
    
    // Return null if no attributes and no description
    if (attributes.length === 0 && !product.description) {
      return null;
    }
    
    const INITIAL_SPECS_COUNT = 5; // Show first 5 specifications initially
    const shouldShowReadMore = attributes.length > INITIAL_SPECS_COUNT;
    const displayedSpecs = showFullSpecifications 
      ? attributes 
      : attributes.slice(0, INITIAL_SPECS_COUNT);
    
    return (
      <View style={styles.detailsContainer}>
        {/* Header with title and report link */}
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsTitle}>{t('product.productDetails')}</Text>
          <TouchableOpacity>
            <Text style={styles.reportItemText}>{t('product.reportItem')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Specifications Section */}
        {attributes.length > 0 && (
          <View style={styles.specificationsContainer}>
            <Text style={styles.sectionSubtitle}>{t('product.specifications')}{" >"}</Text>
            {displayedSpecs.map((attr: any, index: number) => (
              <View key={`${attr.name || 'spec'}-${index}`} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{attr.name || ''}</Text>
                <Text style={styles.detailValue} numberOfLines={0}>{attr.value || ''}</Text>
              </View>
            ))}
            {shouldShowReadMore && (
              <TouchableOpacity onPress={() => setShowFullSpecifications(!showFullSpecifications)}>
                <Text style={styles.readMoreText}>
                  {showFullSpecifications ? t('product.readLess') : t('product.readMore')}
                </Text>
              </TouchableOpacity>
            )}
          </ View >
        )}
        
        {/* Product Description Section */}
        {product.description && (
          <>
            {/* {attributes.length > 0 && <View style={styles.sectionSeparator} />} */}
            {/* <Text style={styles.sectionSubtitle}>{t('product.productDescription')}</Text> */}
            <View style={styles.htmlContentContainer}>
              {/* Display images from HTML description */}
              {descriptionImages.length > 0 && (
                <View style={styles.descriptionImagesContainer}>
                  {descriptionImages.map((imgUrl: string, index: number) => (
                    <Image
                      key={index}
                      source={{ uri: imgUrl }}
                      style={styles.descriptionImage as any}
                      resizeMode="contain"
                    />
                  ))}
                </View>
              )}
              
              {/* Display plain text description */}
              {plainText && (
                <View style={styles.descriptionTextContainer}>
                  <Text style={styles.descriptionText} numberOfLines={3}>{plainText}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderRelatedProducts = () => {
    const isLoading = source === 'taobao' ? searchProductsLoading : relatedRecommendationsLoading;
    if (relatedProducts.length === 0 && !isLoading) {
      return null;
    }
    
    return (
      <View style={styles.similarProductsContainer}>
        <Text style={styles.similarProductsTitle}>{t('home.moreToLove')}</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('product.loadingProduct')}</Text>
          </View>
        ) : (
          <FlatList
            data={relatedProducts}
            renderItem={({ item }) => {
              // Taobao case: show only image, name and price as requested
              if (selectedPlatform === 'taobao') {
                return (
                  <TouchableOpacity
                    style={styles.similarProductItem}
                    onPress={() => {
                      const productIdToUse = (item as any).offerId || item.id;
                      // Get source from product data, fallback to 'taobao' for Taobao-related products
                      const source = (item as any).source || 'taobao';
                      const country =
                        locale === 'zh' ? 'zh' : locale === 'ko' ? 'ko' : 'en';
                      navigation.push('ProductDetail', {
                        productId: productIdToUse?.toString() || item.id?.toString() || '',
                        offerId: (item as any).offerId?.toString(),
                        source,
                        country,
                      });
                    }}
                  >
                    <View style={styles.simpleTaobaoCard}>
                      <Image
                        source={{ uri: (item as any).image }}
                        style={styles.simpleTaobaoImage as any}
                        resizeMode="cover"
                      />
                      <Text
                        style={styles.simpleTaobaoTitle}
                        numberOfLines={2}
                      >
                        {(item as any).name}
                      </Text>
                      <Text style={styles.simpleTaobaoPrice}>
                        ₩{Number((item as any).price || 0).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              // Default (1688 etc.) uses existing ProductCard
              return (
                <View style={styles.similarProductItem}>
                  <ProductCard
                    product={item}
                    variant="moreToLove"
                    onPress={() => {
                      const productIdToUse = (item as any).offerId || item.id;
                      // Get source from product data, fallback to selectedPlatform
                      const source = (item as any).source || selectedPlatform || '1688';
                      const country =
                        locale === 'zh' ? 'zh' : locale === 'ko' ? 'ko' : 'en';
                      navigation.push('ProductDetail', {
                        productId: productIdToUse?.toString() || item.id?.toString() || '',
                        offerId: (item as any).offerId?.toString(),
                        source,
                        country,
                      });
                    }}
                    onLikePress={() => toggleWishlist(item)}
                    isLiked={isProductLiked(item)}
                  />
                </View>
              );
            }}
            keyExtractor={(item, index) => `related-${item.id?.toString() || (item as any).offerId?.toString() || index}-${index}`}
            numColumns={2}
            scrollEnabled={false}
            nestedScrollEnabled={true}
            columnWrapperStyle={styles.similarProductsGrid}
            removeClippedSubviews={true}
            maxToRenderPerBatch={6}
            windowSize={5}
            initialNumToRender={6}
            updateCellsBatchingPeriod={50}
          />
        )}
      </View>
    );
  };


  const renderSimilarProducts = () => {
    if (similarProducts.length === 0 && !similarProductsLoadingMore) {
      return null;
    }
    
    return (
    <View style={styles.similarProductsContainer}>
        <Text style={styles.similarProductsTitle}>{t('home.moretolove')}</Text>
        <FlatList
          data={similarProducts}
          renderItem={renderSimilarProductItem}
          keyExtractor={similarProductsKeyExtractor}
          numColumns={2}
          scrollEnabled={false}
          nestedScrollEnabled={true}
          columnWrapperStyle={styles.similarProductsGrid}
          onEndReached={loadMoreSimilarProducts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderSimilarProductsFooter}
          removeClippedSubviews={true}
          maxToRenderPerBatch={6}
          windowSize={5}
          initialNumToRender={6}
          updateCellsBatchingPeriod={50}
        />
    </View>
  );
  };

  const renderBottomBar = () => { 
    const companyName = (product as any).metadata?.original1688Data?.companyName || 
                        product.seller?.name || 
                        'Store';
    return(
    <View style={[styles.bottomBar, { paddingBottom: SPACING.lg + insets.bottom }]}>
      {/* Top row with quantity and cart icon */}
      <View style={styles.topActionRow}>
        {/* Quantity Selector */}
        <View style={styles.quantitySelector}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(false)}
          >
            <MinusIcon width={18} height={18} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(true)}
          >
            <PlusIcon width={18} height={18} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Camera Button */}
      </View>
      
      {/* Bottom row with main action buttons */}
      <View style={styles.mainActionRow}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: SPACING.sm}}>
          <TouchableOpacity 
            style={styles.cameraButton}
            onPress={() => {
              const sellerId = product.seller?.id || (product as any).sellerOpenId || '';
              const shopId = source === 'taobao' 
                ? (product.seller?.id || (product as any).shop_id || '')
                : sellerId;
              
              if (shopId) {
                navigation.navigate('SellerProfile', {
                  sellerId: shopId,
                  sellerName: companyName,
                  source: source,
                  country: country,
                });
              }
            }}
          >
            <SellerShopIcon width={30} height={30} color={COLORS.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.supportAgentButton}
            onPress={() => navigation.navigate('CustomerService')}
          >
            <SupportAgentIcon width={30} height={30} color={COLORS.text.primary} />
          </TouchableOpacity>        
          
          {/* Cart Icon Button */}
          <TouchableOpacity 
            style={styles.cartIconButton}
            onPress={() => toggleWishlist(product)}
          >
            {/* <Ionicons name="cart-outline" size={22} color={COLORS.text.primary} /> */}
            <HeartIcon 
              width={30} 
              height={30} 
              color={isLiked ? COLORS.red : COLORS.black} 
            />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row'}}>
          <TouchableOpacity
            style={[styles.addToCartButton, !canAddToCart && styles.disabledButton]}
            disabled={isAddingToCart}
            onPress={() => {
              handleAddToCart();
            }}
          >
            {/* <Ionicons name="cart-outline" size={18} color={COLORS.black} /> */}
            {isAddingToCart ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                <ActivityIndicator size="small" color={COLORS.black} />
                <Text style={styles.addToCartText}>{t('product.addingToCart')}</Text>
              </View>
            ) : (
              <Text style={styles.addToCartText}>{t('product.addToCart')}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.buyNowButton, (!canAddToCart || isAddingToCartForBuyNow) && styles.disabledButton]}
            disabled={!canAddToCart || isAddingToCartForBuyNow}
            onPress={() => {
              if (!isAuthenticated) {
                // Navigate to login page with return navigation info (same as Add to Cart)
                navigation.navigate('Auth', {
                  screen: 'Login',
                  params: {
                    returnTo: 'ProductDetail',
                    returnParams: {
                      productId: productId || offerId,
                      offerId: offerId,
                      productData: product,
                    },
                  },
                } as never);
                return;
              }

              if (!canAddToCart) {
                const variationTypes = getVariationTypes();
                if (variationTypes.length > 0) {
                  showToast(t('product.pleaseSelectOptions'), 'warning');
                }
                return;
              }

              // For Buy Now: Use handleAddToCart logic but with Buy Now mutation
              // Reuse the same logic from handleAddToCart
              handleBuyNow();
            }}
          >
            <Text style={styles.buyNowText}>{t('product.buyNow')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );}

  const renderImageViewer = () => {
    // Use only API images for viewer
    const images = getApiProductImages(product);
    
    return (
      <Modal
        visible={imageViewerVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setImageViewerVisible(false)}
          >
            <Icon name="close" size={32} color={COLORS.white} />
          </TouchableOpacity>

          {/* Image counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {viewerImageIndex + 1} / {images.length}
            </Text>
          </View>

          {/* Full screen image gallery */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setViewerImageIndex(index);
            }}
            scrollEventThrottle={16}
            contentOffset={{ x: viewerImageIndex * width, y: 0 }}
          >
            {images.map((img: string, index: number) => (
              <View key={`fullscreen-${img}-${index}`} style={styles.fullScreenImageContainer}>
                <Image
                  source={{ uri: img }}
                  style={styles.fullScreenImage as any}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Absolutely positioned header overlays the image */}
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]} pointerEvents="box-none">
        {renderHeader()}
      </SafeAreaView>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 + insets.bottom }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {renderImageGallery()}
        {renderProductInfo()}
        {/* {renderRatingRow()} */}
        {renderPriceRow()}
        {renderAllVariations()}
        {/* {renderServiceCommitment()} */}
        {routeSource !== 'live-commerce' && routeSource !== 'live' && renderSellerInfo()}
        {/* {renderReviews()} */}
        {renderProductDetails()}
        {renderRelatedProducts()}
        {/* {renderSimilarProducts()} */}
      </Animated.ScrollView>

      {renderBottomBar()}
      {renderImageViewer()}

      {/* Similar product image search modal */}
      {similarSearchVisible && (
        <ImageSearchResultsModal
          visible={similarSearchVisible}
          onClose={() => setSimilarSearchVisible(false)}
          imageUri={similarSearchUri}
          imageBase64={similarSearchBase64}
        />
      )}

      <PhotoCaptureModal
        visible={photoCaptureVisible}
        onClose={() => setPhotoCaptureVisible(false)}
        onConfirm={handlePhotoCaptureConfirm}
        product={{
          id: product.id,
          name: product.name,
          image: product.images?.[0] || product.image,
          price: product.price,
        }}
      />

      {/* Unfollow Confirmation Modal */}
      <Modal
        visible={showUnfollowModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnfollowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unfollow</Text>
            <Text style={styles.modalMessage}>Are you sure you want to unfollow?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowUnfollowModal(false)}
                disabled={isFollowingStore}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={performUnfollowAction}
                disabled={isFollowingStore}
              >
                {isFollowingStore ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingTop: SPACING['2xl'],
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerCameraIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.sm,
  },
  searchButtonStyle: {
    // flex: 1,
    height: 40,
    marginRight: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  imageGalleryContainer: {
    position: 'relative',
  },
  productImage: {
    width: width,
    height: IMAGE_HEIGHT,
    backgroundColor: COLORS.gray[100],
  },
  imageIndicators: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    opacity: 0.5,
  },
  activeIndicator: {
    opacity: 1,
  },
  liveStatBadge: {
    position: 'absolute',
    bottom: 70,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    maxWidth: width - SPACING.md * 2,
  },
  liveStatIconContainer: {
    marginRight: SPACING.xs,
  },
  liveStatBadgeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '500',
  },
  itemInfoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  itemInfoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  itemInfoSeparator: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    marginHorizontal: SPACING.sm,
  },
  reviewBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.xs,
    paddingHorizontal: SPACING.smmd,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.small,
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.yellow,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  reviewBadgeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  heartButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  heartButton: {
    padding: SPACING.xs,
    backgroundColor: '#00000066',
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.small,
  },
  wishlistCountText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
    backgroundColor: '#FFFFFF33',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.small,
  },
  productInfoContainer: {
    padding: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  productName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  discountBadgeInline: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  discountBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  productCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightRed,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  productCodeBadgeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
  copyIconButton: {
    padding: 2,
  },
  productDescription: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  soldOutText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginLeft: SPACING.xs,
  },
  soldText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.red,
    marginRight: SPACING.sm,
  },
  pricePrimary: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },
  originalPrice: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
    marginRight: SPACING.sm,
  },
  originalPriceRight: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    textDecorationLine: 'line-through',
    marginLeft: 'auto',
  },
  discountBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  discountText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  productCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  productCodeLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  productCodeText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  copyButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  selectorContainer: {
    padding: SPACING.md,
    paddingBottom: 0,
  },
  selectorTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  colorOption: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  colorImage: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
  },
  selectedColorImage: {
    borderColor: COLORS.red,
    borderWidth: 3,
  },
  colorName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 80,
  },
  selectedColorName: {
    color: COLORS.red,
    fontWeight: '600',
  },
  sizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sizeOption: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  selectedSizeOption: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.white,
  },
  sizeText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  selectedSizeText: {
    color: COLORS.red,
    fontWeight: '600',
  },
  serviceCommitmentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderColor: COLORS.gray[100],
    marginTop: SPACING.md,
  },
  serviceCommitmentChoice: {
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#E1FEEE',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#0000000D',
  },
  serviceCommitmentChoiceText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '900',
    color: COLORS.white,
    backgroundColor: COLORS.text.red,
    padding: SPACING.sm,
    paddingVertical: 0,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: '#0000000D',
  },
  serviceCommitmentChoiceContent: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '900',
    color: COLORS.text.primary,
  },
  serviceCommitmentContent: {
    marginTop: SPACING.xs,
  },
  serviceCommitmentContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  serviceCommitmentContentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  serviceCommitmentContentHeaderRight: {
    alignItems: 'center',
  },
  serviceCommitmentContentSeparator: {
    marginLeft: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  serviceCommitmentContentTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.black,
  },
  serviceCommitmentTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.red,
    marginBottom: SPACING.xs,
  },
  serviceCommitmentText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  sellerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 5,
    borderTopWidth: 5,
    borderColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  sellerHeader: {
    flex: 1,
    marginRight: SPACING.md,
  },
  sellerDetails: {
    flex: 1,
    marginRight: SPACING.md,
  },
  sellerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerNameBold: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sellerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sellerRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sellerRatingText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginLeft: SPACING.xs,
  },
  sellerSoldText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '400',
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  sellerStatsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginLeft: SPACING.xs,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.text.primary,
    borderRadius: 20,
    gap: SPACING.xs,
    minWidth: 100,
  },
  followButtonActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  followButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  followButtonTextActive: {
    color: COLORS.text.primary,
  },
  reviewsContainer: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  reviewsTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  seeAllText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  reviewItem: {
    marginBottom: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  detailsContainer: {
    padding: SPACING.lg,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  reportItemText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '400',
    color: COLORS.text.primary,
  },
  specificationsContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.md,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderColor: COLORS.gray[200],
  },
  detailLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    width: '35%',
    height: '100%',
    marginRight: SPACING.md,
    borderRightWidth: 1,
    borderColor: COLORS.gray[200],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray[50],
    textAlignVertical: 'center',
  },
  detailValue: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '400',
    height: '100%',
    width: '60%',
    flexWrap: 'wrap',
    textAlign: 'left',
    paddingVertical: SPACING.sm,
    textAlignVertical: 'center',
  },
  readMoreText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    textDecorationLine: 'underline',
    paddingHorizontal: SPACING.md,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderColor: COLORS.gray[200],
  },
  productImagesContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  productImagesTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  productDescriptionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  productDescriptionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  htmlContentContainer: {
    width: '100%',
    backgroundColor: COLORS.white,
  },
  descriptionImagesContainer: {
    width: '100%',
    marginVertical: SPACING.md,
  },
  descriptionImage: {
    width: '100%',
    height: 300,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.md,
  },
  descriptionTextContainer: {
    width: '100%',
  },
  descriptionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  similarProductsContainer: {
    padding: SPACING.sm,
  },
  similarProductsTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
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
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  similarProductsGrid: {
    justifyContent: 'flex-start',
    gap: SPACING.sm,
  },
  simpleTaobaoCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.sm,
    margin: SPACING.xs,
    ...SHADOWS.small,
  },
  simpleTaobaoImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  simpleTaobaoTitle: {
    fontSize: 12,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
  },
  simpleTaobaoPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  similarProductItem: {
    width: (width - SPACING.sm * 2 - SPACING.sm) / 2,
  },
  loadingMoreContainer: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  loadingMoreText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginLeft: SPACING.sm,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    ...SHADOWS.lg,
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
    ...SHADOWS.small,
  },
  quantityText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    minWidth: 40,
    textAlign: 'center',
  },
  supportAgentButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIconButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  addToCartButton: {
    // flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.full, // Full round button
    borderBottomLeftRadius: BORDER_RADIUS.full, // Full round button
    borderWidth: 1,
    borderColor: '#00000033',
    // paddingVertical: SPACING.smmd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: 0.5,
    padding: SPACING.sm,
  },
  buyNowButton: {
    // flex: 1,
    backgroundColor: COLORS.red,
    borderTopRightRadius: BORDER_RADIUS.full, // Full round button
    borderBottomRightRadius: BORDER_RADIUS.full, // Full round button
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00000033',
  },
  buyNowText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
    padding: SPACING.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: SPACING.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCounter: {
    position: 'absolute',
    top: 50,
    left: SPACING.lg,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  imageCounterText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  fullScreenImageContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: width * 0.8,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: FONTS.sizes.md,
    color: COLORS.gray[500],
    marginBottom: SPACING.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.black,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#FF5722',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default ProductDetailScreen;

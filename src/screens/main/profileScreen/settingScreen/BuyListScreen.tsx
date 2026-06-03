import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import Icon from '../../../../components/Icon';
import { ScreenSkeleton } from '../../../../components/Skeleton';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { RootStackParamList, Product } from '../../../../types';
import { ProductCard, SearchButton } from '../../../../components';
import TuneIcon from '../../../../assets/icons/TuneIcon';
import GridViewIcon from '../../../../assets/icons/GridViewIcon';
import HeartIcon from '../../../../assets/icons/HeartIcon';
import ViewedIcon from '../../../../assets/icons/ViewedIcon';
import OfficialSupportIcon from '../../../../assets/icons/OfficialSupportIcon';
import FeedbackIcon from '../../../../assets/icons/FeedbackIcon';
import CustomerSupportIcon from '../../../../assets/icons/CustomerSupportIcon';
import HeadsetMicIcon from '../../../../assets/icons/HeadsetMicIcon';
import SellerShopIcon from '../../../../assets/icons/SellerShopIcon';
import { OrderFilterModal } from '../../../../components';
import { useGetOrdersMutation } from '../../../../hooks/useGetOrdersMutation';
import { Order as ApiOrder } from '../../../../services/orderApi';
import { useToast } from '../../../../context/ToastContext';
import { useRecommendationsMutation } from '../../../../hooks/useRecommendationsMutation';
import { useWishlistStatus } from '../../../../hooks/useWishlistStatus';
import { useAddToWishlistMutation } from '../../../../hooks/useAddToWishlistMutation';
import { useDeleteFromWishlistMutation } from '../../../../hooks/useDeleteFromWishlistMutation';
import { useAuth } from '../../../../context/AuthContext';
import { usePlatformStore } from '../../../../store/platformStore';
import { useAppSelector } from '../../../../store/hooks';
import {
  coerceDisplayText,
  extractCompanyNameFromProductDetail,
  formatPriceKRW,
  resolveOrderItemCompanyName,
} from '../../../../utils/i18nHelpers';
import { productsApi } from '../../../../services/productsApi';
import { translations } from '../../../../i18n/translations';
import { useCancelOrderMutation } from '../../../../hooks/useCancelOrderMutation';
import { useAddToCartMutation } from '../../../../hooks/useAddToCartMutation';
import { useProductDetailMutation } from '../../../../hooks/useProductDetailMutation';
import type { ViewFilterType } from '../../../../services/orderApi';
import { inquiryApi } from '../../../../services/inquiryApi';
import { useSocket } from '../../../../context/SocketContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../../../constants';
import PrintIcon from '../../../../assets/icons/PrintIcon';
import ExportOrderIcon from '../../../../assets/icons/ExportOrderIcon';
import HomeIcon from '../../../../assets/icons/HomeIcon';
import AccountIcon from '../../../../assets/icons/AccountIcon';
import MessageIcon from '../../../../assets/icons/MessageIcon';
import ReceiptIcon from '../../../../assets/icons/ReceiptIcon';
import CartIcon from '../../../../assets/icons/CartIcon';
import EditIcon from '../../../../assets/icons/EditIcon';
import { WebView } from 'react-native-webview';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  orderApi,
  mapLocaleToOrdersLang,
  normalizeProgressStatus,
  resolveOrderItemUnitPrice,
  resolveOrderTotalKRW,
  resolveOrderProgressStatus,
  isShippingAgencyOrder,
} from '../../../../services/orderApi';
import {
  computeProgressStatusCounts,
  computeStatusGroupCounts,
} from '../../../../utils/orderCounts';

type BuyListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'BuyList'>;
type BuyListScreenRouteProp = RouteProp<RootStackParamList, 'BuyList'>;

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  image: string;
  companyName: string;
  companyNameMultiLang?: Record<string, unknown>;
  sellerOpenId: string;
  offerId: string;
  itemId?: string; // MongoDB _id from API
  subtotal: number;
  source?: string;
  otherSite?: string;
  specId?: string;
  skuId?: string;
  skuAttributes?: {
    attributeId?: number;
    attributeName: string;
    attributeNameTrans: string;
    value: string;
    valueTrans: string;
    skuImageUrl?: string;
  }[];
}

interface Order {
  id: string;
  orderId?: string; // Order ID from API
  orderNumber: string;
  date: string;
  status: 'category' | 'unpaid' | 'progressing' | 'end' | 'pending_review' | 'error' | 'refunds';
  progressStatus: string;
  statusGroup: 'purchase_agency' | 'warehouse' | 'international_shipping' | 'error' | 'other';
  statusTranslationKey: string;
  items: OrderItem[];
  totalAmount: number;
  inquiryId?: string; // Inquiry ID if inquiry exists for this order
  unreadCount?: number; // Unread message count for this inquiry
  shippingAddress?: any; // Address information
  transferMethod?: string;
  firstTierCost?: any;
  trackingNumbers?: string[];
  createdAt?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  orderMainInfo?: any;
}

interface StoreGroup {
  companyName: string;
  sellerOpenId: string;
  items: OrderItem[];
  storeTotal: number;
}

// Map API order status to tab status
const mapOrderStatusToTab = (order: ApiOrder): Order['status'] => {
  console.log('🛒 BuyListScreen: Mapping order status:', {
    progressStatus: order.progressStatus,
    orderStatus: order.orderStatus,
    shippingStatus: order.shippingStatus,
    warehouseStatus: order.warehouseStatus,
    paymentStatus: order.paymentStatus,
  });
  
  // Map based on progressStatus and orderStatus from real API
  if (order.progressStatus === 'BUY_PAY_WAIT') {
    console.log('🛒 BuyListScreen: Mapped to unpaid (payment pending)');
    return 'unpaid';
  }
  if (order.orderStatus === 'completed' || order.shippingStatus === 'delivered') {
    console.log('🛒 BuyListScreen: Mapped to pending_review (delivered)');
    return 'pending_review'; // Orders that are delivered but pending review
  }
  if (order.shippingStatus === 'shipped' || order.warehouseStatus === 'warehoused') {
    console.log('🛒 BuyListScreen: Mapped to progressing (shipped/warehoused)');
    return 'progressing';
  }
  if (order.orderStatus === 'reviewed') {
    console.log('🛒 BuyListScreen: Mapped to end (reviewed)');
    return 'end'; // Orders that have been reviewed
  }
  
  // Additional mappings based on real API response
  if (order.shippingStatus === 'not_shipped' && order.orderStatus === 'confirmed') {
    console.log('🛒 BuyListScreen: Mapped to progressing (confirmed but not shipped)');
    return 'progressing';
  }
  
  console.log('🛒 BuyListScreen: Mapped to category (default)');
  return 'category';
};

const STATUS_GROUPS = [
  {
    key: 'purchase_agency',
    title: '발주관리',
    titleKey: 'pages.orders.groups.purchaseAgency',
    statuses: ['P_QUOTE', 'BUY_PAY_WAIT', 'P_AU_PURCHASING', 'BUYING_MANUAL', 'BUYING_PROBLEM', 'BUY_FINAL_DONE'],
  },
  {
    key: 'warehouse',
    title: '현지입/출고',
    titleKey: 'pages.orders.groups.warehouse',
    statuses: ['P_RECEIPT_APPLICATION', 'WH_ARRIVE_EXPECTED', 'DELIVERY_EXCEPTION', 'WH_IN_PROGRESS', 'WH_IN_DONE', 'WH_PICK_DONE', 'WH_PAY_WAIT', 'WH_SHIPPED'],
  },
  {
    key: 'international_shipping',
    title: '국제운송',
    titleKey: 'pages.orders.groups.internationalShipping',
    statuses: ['INTERNATIONAL_SHIPPING', 'INTERNATIONAL_SHIPPED', 'ORDER_RECEIVED'],
  },
  {
    key: 'error',
    title: '오류',
    titleKey: 'pages.orders.groups.error',
    statuses: ['ERR_IN', 'USER_REFUND_REQ', 'USER_REFUND_COMPLETED'],
  },
] as const;

const PROGRESS_STATUS_META: Record<string, {
  tab: Order['status'];
  group: Order['statusGroup'];
  translationKey: string;
}> = {
  P_QUOTE: { tab: 'category', group: 'purchase_agency', translationKey: 'pages.orders.status.quotePending' },
  BUY_PAY_WAIT: { tab: 'unpaid', group: 'purchase_agency', translationKey: 'pages.orders.status.paymentPending' },
  BUY_PAY_DONE: { tab: 'progressing', group: 'purchase_agency', translationKey: 'pages.orders.status.paymentComplete' },
  P_AU_PURCHASING: { tab: 'progressing', group: 'purchase_agency', translationKey: 'pages.orders.status.purchasing' },
  BUYING_MANUAL: { tab: 'progressing', group: 'purchase_agency', translationKey: 'pages.orders.status.purchasing' },
  BUYING_FINANCIAL_SETTLEMENT: { tab: 'progressing', group: 'purchase_agency', translationKey: 'pages.orders.status.financialSettlement' },
  BUYING_PROBLEM: { tab: 'error', group: 'purchase_agency', translationKey: 'pages.orders.status.problemProduct' },
  BUY_FINAL_DONE: { tab: 'end', group: 'purchase_agency', translationKey: 'pages.orders.status.purchaseFinalComplete' },
  P_RECEIPT_APPLICATION: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.receiptApplication' },
  WH_ARRIVE_EXPECTED: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.centerArrivalExpected' },
  DELIVERY_EXCEPTION: { tab: 'error', group: 'warehouse', translationKey: 'pages.orders.status.deliveryException' },
  WH_IN_EXPECTED: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.expectedWarehouseIn' },
  WH_IN_PROGRESS: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.warehouseInProgress' },
  WH_IN_DONE: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.warehouseInComplete' },
  WH_PICK_DONE: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.domesticWarehousePacking' },
  WH_PAY_WAIT: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.waitingSettlement' },
  WH_PAY_DONE: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.settlementComplete' },
  WH_SHIPPED: { tab: 'progressing', group: 'warehouse', translationKey: 'pages.orders.status.shipmentComplete' },
  INTERNATIONAL_SHIPPING: { tab: 'progressing', group: 'international_shipping', translationKey: 'pages.orders.status.internationalShippingInProgress' },
  INTERNATIONAL_SHIPPED: { tab: 'end', group: 'international_shipping', translationKey: 'pages.orders.status.internationalShippingComplete' },
  ORDER_RECEIVED: { tab: 'pending_review', group: 'international_shipping', translationKey: 'pages.orders.status.orderReceived' },
  ERR_IN: { tab: 'error', group: 'error', translationKey: 'pages.orders.status.errorWarehouse' },
  NO_ORDER_INFO: { tab: 'error', group: 'error', translationKey: 'pages.orders.status.noOrderInfo' },
  USER_REFUND_REQ: { tab: 'refunds', group: 'error', translationKey: 'pages.orders.status.userRefundRequest' },
  USER_REFUND_COMPLETED: { tab: 'refunds', group: 'error', translationKey: 'pages.orders.status.userRefundComplete' },
};

/** Canonical progress status for list filtering (handles P_PENDING → BUY_PAY_WAIT, etc.) */
const getCanonicalOrderProgressStatus = (order: {
  progressStatus?: string | null;
  paymentStatus?: string | null;
  firstTierCost?: ApiOrder['firstTierCost'];
  orderMainInfo?: ApiOrder['orderMainInfo'];
  orderType?: string;
  orderNumber?: string;
}): string =>
  resolveOrderProgressStatus({
    progressStatus: order.progressStatus,
    paymentStatus: order.paymentStatus,
    firstTierCost: order.firstTierCost,
    orderMainInfo: order.orderMainInfo,
    orderType: order.orderType,
    orderNumber: order.orderNumber,
  });

const orderMatchesProgressStatus = (order: Order, selected: string): boolean =>
  getCanonicalOrderProgressStatus(order) === normalizeProgressStatus(selected);

const orderBelongsToStatusGroup = (order: Order, groupKey: string): boolean => {
  const group = STATUS_GROUPS.find((g) => g.key === groupKey);
  if (!group) return order.statusGroup === groupKey;
  const canonical = getCanonicalOrderProgressStatus(order);
  return (group.statuses as readonly string[]).includes(canonical);
};

/**
 * 주문을 4개 사업 도메인(구매대행 / 로켓-3PL / VVIC하이패스 / 배송대행) 중
 * 하나로 분류한다. 우선권은:
 *   1) VVIC하이패스  ← orderMainInfo.transferMethod 또는 shippingMethod 에 'VVIC' 포함
 *   2) 로켓/3PL      ← orderType==='Rocket' 또는 shippingMethod==='로켓배송'
 *   3) 배송대행      ← orderType==='Shipping' (위 1·2 조건이 모두 거짓일 때)
 *   4) 구매대행      ← 그 외 (General 등)
 *
 * 백엔드가 한 항목에 여러 신호를 동시에 줄 수 있어 (예: requestType='Shipping' +
 * transferMethod='VVIC(육로)항공'), VVIC 가 우선이라는 규칙은 응답자료의
 * P00000014 케이스에서 직접 드러난다.
 */
type BuyListBusinessDomain =
  | 'purchase_agency'
  | 'rocket_3pl'
  | 'vvic_hipass'
  | 'shipping_agency';

const resolveOrderBusinessDomain = (order: Order): BuyListBusinessDomain => {
  const info: any = (order as any).orderMainInfo || {};
  const orderType = String((order as any).orderType || '').toLowerCase();
  const transferMethod = String(info.transferMethod || '').toLowerCase();
  const shippingMethod = String(info.shippingMethod || '').toLowerCase();
  const requestType = String(info.requestType || '').toLowerCase();

  // 1) VVIC 하이패스 — 신호가 들어 있으면 무조건 우선.
  if (transferMethod.includes('vvic') || shippingMethod.includes('vvic')) {
    return 'vvic_hipass';
  }
  // 2) 로켓/3PL — orderType / requestType / shippingMethod 중 어디에든 'Rocket' / '로켓배송' 신호.
  if (
    orderType === 'rocket' ||
    requestType === 'rocket' ||
    shippingMethod.includes('로켓') ||
    shippingMethod.includes('rocket')
  ) {
    return 'rocket_3pl';
  }
  // 3) 배송대행 — requestType / orderType 이 Shipping.
  if (orderType === 'shipping' || requestType === 'shipping') {
    return 'shipping_agency';
  }
  // 4) 구매대행 — General / 기본값.
  return 'purchase_agency';
};

const mapOrderStatusMeta = (order: ApiOrder): Pick<Order, 'status' | 'statusGroup' | 'statusTranslationKey' | 'progressStatus'> => {
  const progressStatus = resolveOrderProgressStatus({
    progressStatus: order.progressStatus,
    paymentStatus: order.paymentStatus,
    firstTierCost: order.firstTierCost,
    orderMainInfo: order.orderMainInfo,
    orderType: order.orderType,
    orderNumber: order.orderNumber,
  });
  const directMeta = PROGRESS_STATUS_META[progressStatus];
  if (directMeta) {
    return {
      status: directMeta.tab,
      statusGroup: directMeta.group,
      statusTranslationKey: directMeta.translationKey,
      progressStatus,
    };
  }

  if (order.orderStatus === 'completed' || order.shippingStatus === 'delivered') {
    return {
      status: 'pending_review',
      statusGroup: 'international_shipping',
      statusTranslationKey: 'pages.orders.status.orderReceived',
      progressStatus,
    };
  }

  if (order.shippingStatus === 'shipped' || order.warehouseStatus === 'warehoused') {
    return {
      status: 'progressing',
      statusGroup: 'warehouse',
      statusTranslationKey: 'pages.orders.status.shipmentComplete',
      progressStatus,
    };
  }

  if (order.orderStatus === 'reviewed') {
    return {
      status: 'end',
      statusGroup: 'international_shipping',
      statusTranslationKey: 'pages.orders.status.orderReceived',
      progressStatus,
    };
  }

  const fallbackNormalized = normalizeProgressStatus(progressStatus);
  const fallbackMeta = PROGRESS_STATUS_META[fallbackNormalized];
  if (fallbackMeta) {
    return {
      status: fallbackMeta.tab,
      statusGroup: fallbackMeta.group,
      statusTranslationKey: fallbackMeta.translationKey,
      progressStatus: fallbackNormalized,
    };
  }

  const history = order.statusHistory ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    const fromHistory = normalizeProgressStatus(history[i]?.status);
    const historyMeta = PROGRESS_STATUS_META[fromHistory];
    if (historyMeta) {
      return {
        status: historyMeta.tab,
        statusGroup: historyMeta.group,
        statusTranslationKey: historyMeta.translationKey,
        progressStatus: fromHistory,
      };
    }
  }

  if (/^P_AU_/.test(fallbackNormalized) || /^BUYING_/.test(fallbackNormalized)) {
    return {
      status: 'progressing',
      statusGroup: 'purchase_agency',
      statusTranslationKey: 'pages.orders.status.purchasing',
      progressStatus: fallbackNormalized,
    };
  }

  if (
    isShippingAgencyOrder({
      orderMainInfo: order.orderMainInfo,
      orderType: order.orderType,
      orderNumber: order.orderNumber,
    })
  ) {
    const receiptMeta = PROGRESS_STATUS_META.P_RECEIPT_APPLICATION;
    return {
      status: receiptMeta.tab,
      statusGroup: receiptMeta.group,
      statusTranslationKey: receiptMeta.translationKey,
      progressStatus: fallbackNormalized || 'P_RECEIPT_APPLICATION',
    };
  }

  return {
    status: 'category',
    statusGroup: 'other',
    statusTranslationKey: 'pages.orders.status.noOrderInfo',
    progressStatus: fallbackNormalized || progressStatus,
  };
};

const BuyListScreen = () => {
  const navigation = useNavigation<BuyListScreenNavigationProp>();
  const route = useRoute<BuyListScreenRouteProp>();
  const { showToast } = useToast();
  const { user, isGuest } = useAuth();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { selectedPlatform } = usePlatformStore();
  const { isProductLiked } = useWishlistStatus();
  const { onMessageReceived, isConnected, connect, unreadCount: socketUnreadCount, generalInquiryUnreadCount } = useSocket();
  const totalMessageUnread = socketUnreadCount + generalInquiryUnreadCount;
  
  // Get initial tab from route params, default to 'all' (purchase_agency group)
  const initialTab = (route.params?.initialTab as Order['status']) || 'purchase_agency';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<Order['statusGroup'] | null>(null);
  const [expandedStatusGroup, setExpandedStatusGroup] = useState<Order['statusGroup'] | null>(null);
  // 현재 활성 사업 도메인 — 발주관리 드롭다운에서 선택되거나, 외부(예: ProfileScreen
  // 의 내주문 카드)에서 route.params.domain 으로 진입할 때 결정된다.
  // 'purchase_agency' 가 기본값이며 이때만 기존 BuyListScreen 본문(주문 카드 리스트)
  // 이 그대로 표시된다. 나머지 4개 도메인은 BuyListScreen 안에서 별도의
  // placeholder 대시보드를 렌더한다 (페지 이동 없이 본문만 교체).
  type BusinessDomain =
    | 'purchase_agency'
    | 'rocket_3pl'
    | 'vvic_hipass'
    | 'shipping_agency'
    | 'error_management'
    | 'refund_management';
  const initialDomain = (route.params?.domain as BusinessDomain | undefined) ?? 'purchase_agency';
  const [activeBusinessDomain, setActiveBusinessDomain] = useState<BusinessDomain>(initialDomain);
  // 발주관리 칩의 화면상 좌표 — 드롭다운을 칩 바로 밑에 띄우기 위해 측정.
  // 화면 회전/스크롤로 위치가 바뀔 수 있으므로 클릭할 때마다 다시 측정한다.
  const [purchaseChipLayout, setPurchaseChipLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const purchaseChipRef = useRef<View | null>(null);
  // 현지입/출고 칩의 화면상 좌표 — 드롭다운을 칩 바로 밑에 띄우고 너비도 칩에 맞춤.
  const [warehouseChipLayout, setWarehouseChipLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const warehouseChipRef = useRef<View | null>(null);
  // 통관방식 칩의 화면상 좌표 — 발주관리·현지입/출고와 같은 앵커링 방식.
  const [customsChipLayout, setCustomsChipLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const customsChipRef = useRef<View | null>(null);
  // 운송방식 칩의 화면상 좌표 — 같은 앵커링 방식.
  const [transportChipLayout, setTransportChipLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const transportChipRef = useRef<View | null>(null);
  const [selectedProgressStatus, setSelectedProgressStatus] = useState<string | null>(null);
  // 현지입/출고 드롭다운 필터 — '전체' / '입고' / '출고' 3가지.
  // 'all' 일 때는 현지 그룹 전체, 'in' 은 입고 관련 진행상태, 'out' 은 출고 관련.
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | 'in' | 'out'>('all');
  
  // Update active tab when route params change
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab as string);
    }
  }, [route.params?.initialTab]);

  // 외부(ProfileScreen 내주문 카드 등)에서 BuyList 라우트에 domain 으로 진입할 때
  // 발주관리 드롭다운에서 그 항목을 직접 '클릭'한 것과 같은 상태가 되도록 부수효과를
  // 모두 적용한다. 단순히 activeBusinessDomain 만 바꾸면 selected 표시는 되지만
  // selectedProgressStatus 같은 부수 필터가 이전 세션 값으로 남아 충돌이 생긴다.
  useEffect(() => {
    const domain = route.params?.domain as BusinessDomain | undefined;
    if (!domain) return;
    setActiveBusinessDomain(domain);
    setExpandedStatusGroup(null);
    switch (domain) {
      case 'purchase_agency':
        // 카드 셀에서 들어올 때 initialTab 이 함께 오므로 activeTab 은 위쪽
        // useEffect 가 처리한다. 진행상태 필터만 비우면 충분.
        setSelectedProgressStatus(null);
        break;
      case 'rocket_3pl':
      case 'vvic_hipass':
      case 'shipping_agency':
        // 도메인 그룹만 전환 — 세부 진행상태 필터 해제. activeTab 은 initialTab
        // (대개 'all') 이 위쪽 useEffect 에서 반영됨.
        setSelectedProgressStatus(null);
        break;
      case 'error_management':
        setActiveTab('error');
        setSelectedProgressStatus(null);
        break;
      case 'refund_management':
        setActiveTab('error');
        setSelectedProgressStatus('USER_REFUND_REQ');
        break;
    }
  }, [route.params?.domain]);
  const [unreadCounts, setUnreadCounts] = useState<{ [inquiryId: string]: number }>({});
  const [selectedCustomsMethod, setSelectedCustomsMethod] = useState<string | null>(null);
  const [selectedTransportMethod, setSelectedTransportMethod] = useState<string | null>(null);
  const [showCustomsDropdown, setShowCustomsDropdown] = useState(false);
  const [showTransportDropdown, setShowTransportDropdown] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [orderSearchText, setOrderSearchText] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [pickingEnd, setPickingEnd] = useState(false);
  // Add to cart modal state
  const [addToCartModalVisible, setAddToCartModalVisible] = useState(false);
  const [addToCartItem, setAddToCartItem] = useState<OrderItem | null>(null);
  const [addToCartProductDetail, setAddToCartProductDetail] = useState<any>(null);
  const [addToCartQuantity, setAddToCartQuantity] = useState(1);
  const [addToCartSelectedSku, setAddToCartSelectedSku] = useState<any>(null);
  const [addToCartSelectedAttrs, setAddToCartSelectedAttrs] = useState<Record<string, string>>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [showNavModal, setShowNavModal] = useState(false);
  const [cancelOrderModal, setCancelOrderModal] = useState<{ orderId: string } | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Changed my mind');
  const [cancelOtherText, setCancelOtherText] = useState('');
  const [showAllFiltersModal, setShowAllFiltersModal] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [showInlineCalendar, setShowInlineCalendar] = useState(false);
  const [inlineCalendarDate, setInlineCalendarDate] = useState(new Date());
  const [inlinePickingEnd, setInlinePickingEnd] = useState(false);
  // Draft states — only applied when user presses Apply
  const [draftPlatform, setDraftPlatform] = useState<string>('');
  const [draftCustoms, setDraftCustoms] = useState<string | null>(null);
  const [draftTransport, setDraftTransport] = useState<string | null>(null);
  const [draftStartDate, setDraftStartDate] = useState<Date | null>(null);
  const [draftEndDate, setDraftEndDate] = useState<Date | null>(null);
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundSelectedItems, setRefundSelectedItems] = useState<Set<string>>(new Set());
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedOrderForAddress, setSelectedOrderForAddress] = useState<Order | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);
  const [showKakaoAddress, setShowKakaoAddress] = useState(false);
  const [editAddress, setEditAddress] = useState({
    zonecode: '',
    roadAddress: '',
    detailAddress: '',
    recipient: '',
    contact: '',
    customsCode: '',
  });
  const [filters, setFilters] = useState<{ orderNumber: string; startDate: Date | null; endDate: Date | null }>({
    orderNumber: '',
    startDate: null,
    endDate: null,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const storeNameCacheRef = useRef<Map<string, string>>(new Map());
  const [viewFilterCounts, setViewFilterCounts] = useState<Record<string, number>>({});
  /** Snapshot for navigation badges — unfiltered fetch so counts stay accurate while filtering the list */
  const [countOrders, setCountOrders] = useState<
    Array<{
      progressStatus: string;
      paymentStatus?: string;
      firstTierCost?: Order['firstTierCost'];
    }>
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Recommendations state for "More to Love"
  const [recommendationsProducts, setRecommendationsProducts] = useState<Product[]>([]);
  const [recommendationsOffset, setRecommendationsOffset] = useState(1); // Current page offset
  const [hasMoreRecommendations, setHasMoreRecommendations] = useState(true); // Whether more products exist
  const isRecommendationsRefreshingRef = React.useRef(false); // Prevent loading during refresh
  const currentRecommendationsPageRef = React.useRef<number>(1); // Track current page for callbacks
  const isLoadingMoreRecommendationsRef = React.useRef(false); // Prevent multiple simultaneous loads

  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const unknownStoreLabel = t('profile.unknownStore');

  const enrichOrderStoreNames = useCallback(
    async (orderList: Order[]) => {
      const pending = new Map<string, { offerId: string; source: string }>();

      for (const order of orderList) {
        for (const item of order.items) {
          if (resolveOrderItemCompanyName(item as unknown as Record<string, unknown>, locale)) {
            continue;
          }
          const offerId = String(item.offerId ?? '').trim();
          if (!offerId) continue;
          const source = item.source || '1688';
          const cacheKey = `${source}:${offerId}`;
          if (storeNameCacheRef.current.has(cacheKey) || pending.has(cacheKey)) continue;
          pending.set(cacheKey, { offerId, source });
        }
      }

      if (pending.size === 0) return;

      const fetched = await Promise.all(
        [...pending.entries()].map(async ([cacheKey, { offerId, source }]) => {
          try {
            const res = await productsApi.getProductDetail(offerId, source, locale);
            const name = res.success
              ? extractCompanyNameFromProductDetail(res.data, locale)
              : '';
            return { cacheKey, name };
          } catch {
            return { cacheKey, name: '' };
          }
        }),
      );

      let hasNew = false;
      for (const { cacheKey, name } of fetched) {
        if (name) {
          storeNameCacheRef.current.set(cacheKey, name);
          hasNew = true;
        }
      }
      if (!hasNew) return;

      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: order.items.map((item) => {
            const cacheKey = `${item.source || '1688'}:${item.offerId}`;
            const cached = storeNameCacheRef.current.get(cacheKey);
            if (!cached) return item;
            if (resolveOrderItemCompanyName(item as unknown as Record<string, unknown>, locale)) {
              return item;
            }
            return { ...item, companyName: cached };
          }),
        })),
      );
    },
    [locale],
  );

  const resolveStoreName = useCallback(
    (value: unknown, item?: OrderItem): string => {
      const fromItem =
        item != null
          ? resolveOrderItemCompanyName(item as unknown as Record<string, unknown>, locale)
          : '';
      return (
        fromItem ||
        coerceDisplayText(value, locale, '') ||
        unknownStoreLabel
      );
    },
    [locale, unknownStoreLabel],
  );

  // Add to wishlist mutation
  const { mutate: addToWishlist } = useAddToWishlistMutation({
    onSuccess: async (data) => {
      // console.log('Product added to wishlist successfully:', data);
      showToast(t('home.productAddedToWishlist'), 'success');
    },
    onError: (error) => {
      // console.error('Failed to add product to wishlist:', error);
      showToast(error || t('buyList.failedToAddWishlist'), 'error');
    },
  });

  const { mutate: cancelOrder, isLoading: isCancellingOrder } = useCancelOrderMutation({
    onSuccess: () => {
      showToast(t('home.orderCancelled'), 'success');
      fetchOrdersRef.current();
      fetchOrderCountsRef.current?.();
    },
    onError: (err) => {
      showToast(err || t('buyList.failedToCancelOrder'), 'error');
    },
  });

  const handleConfirmReceived = async (orderId: string) => {
    try {
      const { orderApi } = await import('../../../../services/orderApi');
      const res = await orderApi.confirmReceived(orderId);
      if (res.success) {
        showToast(t('profile.confirmReceipt') || 'Order confirmed', 'success');
        fetchOrdersRef.current();
      } else {
        showToast(res.error || 'Failed to confirm receipt', 'error');
      }
    } catch {
      showToast(t('home.failedToConfirmReceipt'), 'error');
    }
  };

  const { mutate: addToCart } = useAddToCartMutation({
    onSuccess: () => {
      showToast(t('product.addedToCart') || 'Added to cart', 'success');
    },
    onError: (error) => {
      showToast(error || 'Failed to add to cart', 'error');
    },
  });

  // OrderItem 의 companyName 은 string 한 개지만 cartApi.AddToCartRequest 는
  // MultiLang({en?, ko?, zh?}) 객체를 요구한다. 문자열의 글자 셋(중국어 한자/
  // 한글/그 외)을 보고 해당 언어 슬롯에만 채워 백엔드가 zh 슬롯에서 한글을
  // 만나 500 을 내는 케이스를 막는다. (ProductDetailScreen 의 동일 패턴 재사용)
  const buildCompanyMultiLang = (raw: unknown): { en?: string; ko?: string; zh?: string } => {
    // 이미 객체 형태로 들어오면 그대로 (필요 시 백엔드 정규화에 맡김).
    if (raw && typeof raw === 'object') {
      return raw as { en?: string; ko?: string; zh?: string };
    }
    if (typeof raw !== 'string' || !raw.trim()) {
      return {};
    }
    const s = raw.trim();
    const containsChinese = /[一-鿿]/.test(s);
    const containsHangul = /[가-힯ᄀ-ᇿ㄰-㆏]/.test(s);
    if (containsChinese) return { zh: s };
    if (containsHangul) return { ko: s };
    return { en: s };
  };

  const handleRepurchase = (order: Order) => {
    order.items.forEach((item) => {
      const skuAttrs = (item.skuAttributes || []).map((attr: any) => ({
        attributeId: attr.attributeId ?? 0,
        attributeName: attr.attributeName ?? '',
        attributeNameTrans: attr.attributeNameTrans ?? attr.attributeName ?? '',
        value: attr.value ?? '',
        valueTrans: attr.valueTrans ?? attr.value ?? '',
        skuImageUrl: attr.skuImageUrl,
      }));
      const repurchasePrice = String(item.price);
      addToCart({
        offerId: parseInt(item.offerId, 10) || 0,
        // 카테고리 정보는 재구매 시 OrderItem 에 없음 — 빈 문자열로 보내면
        // 백엔드가 offerId 로부터 알아서 채운다 (cartApi 의 문자열 | MultiLang 허용).
        categoryName: '',
        subject: item.productName,
        subjectTrans: item.productName,
        imageUrl: item.image,
        skuInfo: {
          skuId: parseInt(item.skuId || '0', 10) || 0,
          specId: item.specId || String(item.offerId),
          price: repurchasePrice,
          amountOnSale: 999999,
          consignPrice: repurchasePrice,
          skuAttributes: skuAttrs,
          // 백엔드는 onePiecePrice 와 offerPrice 둘 다 요구한다.
          fenxiaoPriceInfo: { onePiecePrice: repurchasePrice, offerPrice: repurchasePrice },
        },
        companyName: buildCompanyMultiLang(item.companyName),
        sellerOpenId: item.sellerOpenId,
        source: item.source || '1688',
        quantity: item.quantity,
        minOrderQuantity: 1,
      });
    });
  };

  const handleOrderInquiry = (order: Order) => {
    // Always go to Chat — if no inquiry exists, sending a message will create one
    (navigation as any).navigate('Chat', {
      inquiryId: order.inquiryId || undefined,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
    });
  };

  const { mutate: fetchProductDetail, isLoading: isLoadingProductDetail } = useProductDetailMutation({
    onSuccess: (data) => {
      setAddToCartProductDetail(data);
      // Pre-select first SKU variant if available
      const variants = data?.product?.rawVariants || data?.rawVariants || [];
      if (variants.length > 0) setAddToCartSelectedSku(variants[0]);
    },
    onError: () => {
      // Show modal with basic item info even if detail fetch fails
      setAddToCartProductDetail(null);
    },
  });

  const handleOpenAddToCartModal = (item: OrderItem) => {
    setAddToCartItem(item);
    setAddToCartQuantity(item.quantity || 1);
    setAddToCartSelectedSku(null);
    setAddToCartSelectedAttrs({});
    setAddToCartProductDetail(null);
    setAddToCartModalVisible(true);
    fetchProductDetail(item.offerId, item.source || '1688', locale);
  };

  const handleConfirmAddToCart = () => {
    if (!addToCartItem) return;
    const selectedSku = addToCartSelectedSku;
    const skuAttrs = selectedSku?.skuAttributes || (addToCartItem.skuAttributes || []).map((attr: any) => ({
      attributeId: attr.attributeId ?? 0,
      attributeName: attr.attributeName ?? '',
      attributeNameTrans: attr.attributeNameTrans ?? attr.attributeName ?? '',
      value: attr.value ?? '',
      valueTrans: attr.valueTrans ?? attr.value ?? '',
      skuImageUrl: attr.skuImageUrl,
    }));
    const skuPriceStr = String(selectedSku?.price || addToCartItem.price);
    addToCart({
      offerId: parseInt(addToCartItem.offerId, 10) || 0,
      categoryName: '',
      subject: addToCartItem.productName,
      subjectTrans: addToCartItem.productName,
      imageUrl: addToCartItem.image,
      skuInfo: {
        skuId: selectedSku?.skuId ? parseInt(String(selectedSku.skuId), 10) : (parseInt(addToCartItem.skuId || '0', 10) || 0),
        specId: selectedSku?.specId || addToCartItem.specId || String(addToCartItem.offerId),
        price: skuPriceStr,
        amountOnSale: selectedSku?.amountOnSale || 999999,
        consignPrice: String(selectedSku?.consignPrice || addToCartItem.price),
        skuAttributes: skuAttrs,
        // 백엔드는 onePiecePrice 와 offerPrice 둘 다 요구.
        fenxiaoPriceInfo: { onePiecePrice: skuPriceStr, offerPrice: skuPriceStr },
      },
      companyName: buildCompanyMultiLang(addToCartItem.companyName),
      sellerOpenId: addToCartItem.sellerOpenId,
      source: addToCartItem.source || '1688',
      quantity: addToCartQuantity,
      minOrderQuantity: 1,
    });
    setAddToCartModalVisible(false);
  };

  // Delete from wishlist mutation
  const { mutate: deleteFromWishlist } = useDeleteFromWishlistMutation({
    onSuccess: async (data) => {
      // console.log('Product removed from wishlist successfully:', data);
      showToast(t('home.productRemovedFromWishlist'), 'success');
    },
    onError: (error) => {
      // console.error('Failed to remove product from wishlist:', error);
      showToast(error || 'Failed to remove product from wishlist', 'error');
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
      deleteFromWishlist(externalId);
    } else {
      const imageUrl = product.image || product.images?.[0] || '';
      const price = product.price || 0;
      const title = product.name || product.title || '';

      if (!imageUrl || !title || price <= 0) {
        showToast(t('home.invalidProductData'), 'error');
        return;
      }

      addToWishlist({ offerId: externalId, platform: source });
    }
  };

  // Helper function to navigate to product detail
  const navigateToProductDetail = async (
    productId: string | number,
    source: string = selectedPlatform,
    country: string = locale
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
    await navigateToProductDetail(productIdToUse, selectedPlatform, locale);
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
        const mappedProducts = productsArray.map((item: any) => {
          const price = parseFloat(item.priceInfo?.price || item.priceInfo?.consignPrice || 0);
          const originalPrice = parseFloat(item.priceInfo?.consignPrice || item.priceInfo?.price || 0);
          const discount = originalPrice > price && originalPrice > 0
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;
          
          const productData: Product & { source?: string } = {
            id: item.offerId?.toString() || '',
            externalId: item.offerId?.toString() || '',
            offerId: item.offerId?.toString() || '',
            name: locale === 'zh' ? (item.subject || item.subjectTrans || '') : (item.subjectTrans || item.subject || ''),
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
              joinedDate: new Date(),
            },
            rating: 0,
            rating_count: 0,
            reviewCount: 0,
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
            source: selectedPlatform,
          };
          
          return productData;
        });
        
        // Check pagination - if we got fewer products than pageSize, no more pages
        const pageSize = 20;
        const hasMore = productsArray.length >= pageSize;
        setHasMoreRecommendations(hasMore);
        
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
        setHasMoreRecommendations(false);
      }
    },
    onError: (error) => {
      // Reset loading flag
      isLoadingMoreRecommendationsRef.current = false;
      const currentPage = currentRecommendationsPageRef.current;
      if (currentPage === 1) {
        setRecommendationsProducts([]);
      }
      setHasMoreRecommendations(false);
    },
  });

  // Store fetchRecommendations in ref to prevent dependency issues
  const fetchRecommendationsRef = React.useRef(fetchRecommendations);
  React.useEffect(() => {
    fetchRecommendationsRef.current = fetchRecommendations;
  }, [fetchRecommendations]);

  // Load more recommendations when offset changes (infinite scroll)
  React.useEffect(() => {
    // Prevent loading more data when refreshing or already loading
    if (isRecommendationsRefreshingRef.current || isLoadingMoreRecommendationsRef.current) {
      return;
    }
    
    if (recommendationsOffset > 1 && fetchRecommendationsRef.current && hasMoreRecommendations) {
      isLoadingMoreRecommendationsRef.current = true;
      const outMemberId = user?.id?.toString() || 'dferg0001';
      const platform = '1688'; // Always use 1688 for More to Love products
      currentRecommendationsPageRef.current = recommendationsOffset;
      fetchRecommendationsRef.current(locale, outMemberId, recommendationsOffset, 20, platform)
        .finally(() => {
          isLoadingMoreRecommendationsRef.current = false;
        });
    }
  }, [recommendationsOffset, locale, user?.id, hasMoreRecommendations]);

  // Track if initial fetch has been done (prevent real-time updates)
  const hasInitialFetchRef = React.useRef<string | null>(null);

  // Fetch recommendations only once on mount or when locale/user/platform changes (not real-time)
  React.useEffect(() => {
    if (locale && fetchRecommendationsRef.current) {
      const outMemberId = user?.id?.toString() || 'dferg0001';
      const platform = '1688'; // Always use 1688 for More to Love products
      const fetchKey = `${locale}-${outMemberId}-${platform}`;
      
      // Only fetch if this is the first time or locale/user changed
      if (!hasInitialFetchRef.current || hasInitialFetchRef.current !== fetchKey) {
        hasInitialFetchRef.current = fetchKey;
        // Reset pagination state
        setRecommendationsOffset(1);
        setHasMoreRecommendations(true);
        // Clear existing products BEFORE making the API call
        setRecommendationsProducts([]);
        // Fetch first page
        currentRecommendationsPageRef.current = 1;
        fetchRecommendationsRef.current(locale, outMemberId, 1, 20, platform);
      }
    }
  }, [locale, user?.id, fetchRecommendations]);

  // Get orders mutation
  const mapTabToViewFilter = (tab: string): ViewFilterType => {
    // tab is now a STATUS_GROUP key — always fetch all for group-based tabs
    return 'all';
  };

  const getOrdersOptions = useMemo(() => ({
    onSuccess: async (data: any) => {
      if (!data || !data.orders || !Array.isArray(data.orders)) {
        setOrders([]);
        return;
      }
      const mappedOrders = data.orders.map((order: any) => {
        const statusMeta = mapOrderStatusMeta(order);
        const totalAmount = resolveOrderTotalKRW(order);
        return {
          id: order.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          date: new Date(order.createdAt).toISOString().split('T')[0],
          ...statusMeta,
          items: (order.items || []).map((item: any) => {
            const quantity = item.quantity || 1;
            const unitPrice = resolveOrderItemUnitPrice(item);
            return {
            productName:
              coerceDisplayText(item.subjectMultiLang, locale, '') ||
              coerceDisplayText(item.subjectTrans, locale, '') ||
              coerceDisplayText(item.subject, locale, '') ||
              t('buyList.unknownProduct'),
            quantity,
            price: unitPrice,
            image: item.imageUrl || item.image || '',
            companyName: resolveOrderItemCompanyName(item, locale),
            companyNameMultiLang:
              item.companyNameMultiLang ??
              (typeof item.companyName === 'object' && item.companyName != null
                ? item.companyName
                : undefined),
            sellerOpenId: item.sellerOpenId || '',
            offerId: String(item.offerId ?? ''),
            itemId: item._id || item.id || '',
            subtotal: item.subtotal ?? unitPrice * quantity,
            skuAttributes: item.skuAttributes || [],
            source:
              item.source ||
              (String(item.otherSite ?? '').includes('taobao') ? 'taobao' : '1688'),
            specId: item.specId || '',
            skuId: String(item.skuId ?? ''),
          };
          }),
          totalAmount,
          // Raw API fields for OrderDetailScreen
          shippingAddress: order.shippingAddress,
          firstTierCost: order.firstTierCost,
          trackingNumbers: order.trackingNumbers || [],
          statusHistory: order.statusHistory || [],
          paymentMethod: order.paymentMethod,
          transferMethod: order.transferMethod,
          warehouseCode: order.warehouseCode,
          createdAt: order.createdAt,
          paidAmount: order.paidAmount,
          paymentStatus: order.paymentStatus,
          orderMainInfo: order.orderMainInfo,
          applicationCategory: order.applicationCategory,
        };
      });
      setOrders(mappedOrders);
      setHasMore(data.pagination?.page < data.pagination?.totalPages);
      if (data.viewFilterCounts) setViewFilterCounts(data.viewFilterCounts);

      // Fetch inquiries and unread counts (non-blocking)
      try {
        const [inquiriesResponse, unreadCountsResponse] = await Promise.all([
          inquiryApi.getInquiries(),
          inquiryApi.getUnreadCounts(),
        ]);
        const inquiryMap = new Map<string, string>();
        if (inquiriesResponse.success && inquiriesResponse.data?.inquiries) {
          inquiriesResponse.data.inquiries.forEach((inquiry: any) => {
            if (inquiry.order?._id) inquiryMap.set(inquiry.order._id, inquiry._id);
          });
        }
        let unreadCountsMap: { [inquiryId: string]: number } = {};
        if (unreadCountsResponse.success && unreadCountsResponse.data?.inquiries) {
          unreadCountsResponse.data.inquiries.forEach((inq: any) => {
            if (inq._id && inq.unreadCount > 0) unreadCountsMap[inq._id] = inq.unreadCount;
          });
        }
        setUnreadCounts(unreadCountsMap);
        const ordersWithInquiries = mappedOrders.map((order: any) => ({
          ...order,
          inquiryId: inquiryMap.get(order.id) || null,
          unreadCount: inquiryMap.get(order.id) ? (unreadCountsMap[inquiryMap.get(order.id)!] || 0) : 0,
        }));
        setOrders(ordersWithInquiries);
        void enrichOrderStoreNames(ordersWithInquiries);
      } catch {
        // silently fail — orders already set
        void enrichOrderStoreNames(mappedOrders);
      }
    },
    onError: (error: string) => {
      console.error('🛒 BuyListScreen: Failed to fetch orders:', error);
      showToast(error || 'Failed to fetch orders', 'error');
      setOrders([]);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t/unknownStoreLabel stable enough per locale
  }), [locale, enrichOrderStoreNames]);

  const { mutate: getOrders, isLoading } = useGetOrdersMutation(getOrdersOptions);

  const getOrdersRef = useRef(getOrders);
  getOrdersRef.current = getOrders;

  const fetchOrders = useCallback(() => {
    const hasSimplifiedClearance =
      selectedCustomsMethod === '간이통관' ? true :
      selectedCustomsMethod === '일반통관' ? false :
      undefined;

    const transferMethod =
      selectedTransportMethod === '항공' ? 'air' :
      selectedTransportMethod === '선박' ? 'ship' :
      undefined;

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const searchQuery = (filters.orderNumber || orderSearchText || '').trim();

    getOrdersRef.current({
      page: 1,
      pageSize: 50,
      lang: mapLocaleToOrdersLang(locale),
      search: searchQuery || undefined,
      datePeriod: 'last_6_months',
      platform: filterPlatform || undefined,
      viewFilter: 'all',
      // Status filters are applied client-side so API codes like P_PENDING still match BUY_PAY_WAIT
      hasSimplifiedClearance,
      transferMethod: transferMethod as 'air' | 'ship' | undefined,
      periodFrom: selectedStartDate ? formatDate(selectedStartDate) : undefined,
      periodTo: selectedEndDate ? formatDate(selectedEndDate) : undefined,
    });
  }, [
    locale,
    filters.orderNumber,
    orderSearchText,
    filterPlatform,
    selectedCustomsMethod,
    selectedTransportMethod,
    selectedStartDate,
    selectedEndDate,
  ]);

  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;

  const fetchOrderCounts = useCallback(async () => {
    if (isGuest || !user) return;
    try {
      const response = await orderApi.getOrders({
        page: 1,
        pageSize: 100,
        lang: mapLocaleToOrdersLang(locale),
        viewFilter: 'all',
        datePeriod: 'last_6_months',
      });
      if (response.success && response.data?.orders) {
        setCountOrders(
          response.data.orders.map((order) => ({
            progressStatus: resolveOrderProgressStatus({
              progressStatus: order.progressStatus,
              paymentStatus: order.paymentStatus,
              firstTierCost: order.firstTierCost,
              orderMainInfo: order.orderMainInfo,
              orderType: order.orderType,
              orderNumber: order.orderNumber,
            }),
            paymentStatus: order.paymentStatus,
            firstTierCost: order.firstTierCost,
            orderMainInfo: order.orderMainInfo,
          })),
        );
        if (response.data.viewFilterCounts) {
          setViewFilterCounts(response.data.viewFilterCounts);
        }
      }
    } catch {
      // counts are non-blocking
    }
  }, [isGuest, user, locale]);

  const fetchOrderCountsRef = useRef(fetchOrderCounts);
  fetchOrderCountsRef.current = fetchOrderCounts;

  const progressStatusCounts = useMemo(
    () => computeProgressStatusCounts(countOrders),
    [countOrders],
  );

  const statusGroupCounts = useMemo(
    () => computeStatusGroupCounts(countOrders, STATUS_GROUPS),
    [countOrders],
  );

  // 사업 도메인별 주문 수 — 발주관리 칩의 카운트 배지 등에서 사용.
  // resolveOrderBusinessDomain 은 orderType / orderMainInfo 를 읽으므로
  // countOrders(가벼운 카운트 전용 튜플)가 아닌 전체 orders 배열을 쓴다.
  // 우선권 규칙(VVIC > Rocket > Shipping > Purchase)은 분류기 안에서 처리.
  const businessDomainCounts = useMemo(() => {
    const counts: Record<BuyListBusinessDomain, number> = {
      purchase_agency: 0,
      rocket_3pl: 0,
      vvic_hipass: 0,
      shipping_agency: 0,
    };
    for (const order of orders) {
      const domain = resolveOrderBusinessDomain(order);
      counts[domain] += 1;
    }
    return counts;
  }, [orders]);

  // Fetch orders from API when tab, filters, or platform change (not on every render)
  useEffect(() => {
    if (!isGuest && user) {
      fetchOrders();
      fetchOrderCounts();
    }
  }, [fetchOrders, fetchOrderCounts, isGuest, user]);

  useFocusEffect(
    useCallback(() => {
      if (!isGuest && user) {
        fetchOrdersRef.current();
        fetchOrderCountsRef.current();
      }
    }, [isGuest, user]),
  );

  // Ensure socket is connected
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  // Listen to socket events for new messages (works globally, not just in ChatScreen)
  useEffect(() => {
    // console.log('BuyListScreen: Setting up message received listener');
    
    const handleMessageReceived = (data: { 
      message: any; 
      inquiryId: string; 
      unreadCount?: number; 
      totalUnreadCount?: number;
    }) => {
      // console.log('🔔 BuyListScreen: NEW MESSAGE RECEIVED!', {
      //   inquiryId: data.inquiryId,
      //   messageText: data.message?.message || data.message?.text || 'N/A',
      //   unreadCount: data.unreadCount,
      //   totalUnreadCount: data.totalUnreadCount,
      //   fullData: data,
      // });
      
      // Update unread count for this inquiry
      if (data.inquiryId) {
        // If unreadCount is provided, use it; otherwise increment existing count
        setUnreadCounts(prev => {
          const currentCount = prev[data.inquiryId] || 0;
          const newCount = data.unreadCount !== undefined 
            ? data.unreadCount 
            : currentCount + 1;
          
          // console.log(`📊 BuyListScreen: Updating unread count for inquiry ${data.inquiryId}:`, {
          //   previousCount: currentCount,
          //   newCount: newCount,
          //   providedUnreadCount: data.unreadCount,
          // });
          
          const updatedCounts = {
            ...prev,
            [data.inquiryId]: newCount,
          };
          
          // Save to AsyncStorage
          AsyncStorage.setItem(STORAGE_KEYS.INQUIRY_UNREAD_COUNTS, JSON.stringify(updatedCounts))
            .then(() => {
              // console.log('💾 BuyListScreen: Saved unread counts to AsyncStorage');
            })
            .catch((error) => {
              // console.error('Failed to save unread counts:', error);
            });
          
          return updatedCounts;
        });
        
        // Update orders with new unread count
        setOrders(prevOrders => {
          const updatedOrders = prevOrders.map(order => {
            if (order.inquiryId === data.inquiryId) {
              const currentCount = order.unreadCount || 0;
              const newCount = data.unreadCount !== undefined 
                ? data.unreadCount 
                : currentCount + 1;
              // console.log(`✅ BuyListScreen: Updated order ${order.orderNumber} unread count:`, {
              //   previousCount: currentCount,
              //   newCount: newCount,
              // });
              return { ...order, unreadCount: newCount };
            }
            return order;
          });
          return updatedOrders;
        });
      } else {
        // console.warn('⚠️ BuyListScreen: Message received but no inquiryId provided', data);
      }
    };

    onMessageReceived(handleMessageReceived);
    // console.log('✅ BuyListScreen: Message received listener registered');
    
    // Cleanup - note: onMessageReceived doesn't have cleanup, but the callback ref will be replaced
    return () => {
      // console.log('BuyListScreen: Cleaning up message received listener');
    };
  }, [onMessageReceived]);

  // Render More to Love item (same as HomeScreen)
  const renderMoreToLoveItem = React.useCallback(({ item: product, index }: { item: Product; index: number }) => {
    if (!product || !product.id) {
      return null;
    }
    
    const handleLike = async () => {
      if (!user || isGuest) {
        Alert.alert('', t('home.pleaseLogin'));
        return;
      }
      try {
        await toggleWishlist(product);
      } catch (error) {
        // console.error('Error toggling wishlist:', error);
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

  // Render More to Love section (same as HomeScreen)
  const renderMoreToLove = () => {
    const productsToDisplay = recommendationsProducts;
    
    if (recommendationsLoading && productsToDisplay.length === 0) {
      return (
        <View style={styles.moreToLoveSection}>
          <Text style={styles.sectionTitle}>{t('home.moreToLove')}</Text>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      );
    }
    
    if (recommendationsError && productsToDisplay.length === 0) {
      return (
        <View style={styles.moreToLoveSection}>
          <Text style={styles.sectionTitle}>{t('home.moreToLove')}</Text>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Failed to load recommendations</Text>
          </View>
        </View>
      );
    }
    
    if (!Array.isArray(productsToDisplay) || productsToDisplay.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.moreToLoveSection}>
        <Text style={styles.sectionTitle}>{t('home.moreToLove')}</Text>
        <FlatList
          data={productsToDisplay}
          renderItem={renderMoreToLoveItem}
          keyExtractor={(item, index) => `moretolove-${item.id?.toString() || index}-${index}`}
          numColumns={2}
          scrollEnabled={false}
          nestedScrollEnabled={true}
          columnWrapperStyle={styles.productRow}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          onEndReached={() => {
            // For nested FlatList with scrollEnabled={false}, onEndReached may not fire reliably
            // Rely on parent ScrollView scroll detection instead
            // This is kept as a backup but parent scroll detection is primary
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => {
            if (isLoadingMoreRecommendationsRef.current && productsToDisplay.length > 0) {
              return (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              );
            }
            if (!hasMoreRecommendations && productsToDisplay.length > 0) {
              return (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>No more products</Text>
                </View>
              );
            }
            return null;
          }}
        />
      </View>
    );
  };

  // Sample products for "More to love" section
  const recommendedProducts: Partial<Product>[] = [
    {
      id: '1',
      name: 'Summer Floral Dress',
      price: 45.99,
      originalPrice: 65.99,
      discount: 30,
      rating: 4.5,
      rating_count: 128,
      image: 'https://picsum.photos/seed/dress1/400/500',
      orderCount: 456,
    },
    {
      id: '2',
      name: 'Wireless Headphones',
      price: 89.99,
      originalPrice: 129.99,
      discount: 31,
      rating: 4.8,
      rating_count: 256,
      image: 'https://picsum.photos/seed/headphones/400/500',
      orderCount: 789,
    },
    {
      id: '3',
      name: 'Smart Watch',
      price: 199.99,
      originalPrice: 299.99,
      discount: 33,
      rating: 4.7,
      rating_count: 512,
      image: 'https://picsum.photos/seed/watch/400/500',
      orderCount: 1234,
    },
    {
      id: '4',
      name: 'Laptop Stand',
      price: 35.99,
      originalPrice: 49.99,
      discount: 28,
      rating: 4.6,
      rating_count: 89,
      image: 'https://picsum.photos/seed/stand/400/500',
      orderCount: 345,
    },
    {
      id: '5',
      name: 'Phone Case',
      price: 15.99,
      originalPrice: 24.99,
      discount: 36,
      rating: 4.9,
      rating_count: 678,
      image: 'https://picsum.photos/seed/case/400/500',
      orderCount: 2345,
    },
    {
      id: '6',
      name: 'USB Cable Set',
      price: 12.99,
      originalPrice: 19.99,
      discount: 35,
      rating: 4.4,
      rating_count: 234,
      image: 'https://picsum.photos/seed/cable/400/500',
      orderCount: 567,
    },
  ];

  const handleApplyFilters = (newFilters: { orderNumber: string; startDate: Date | null; endDate: Date | null }) => {
    setFilters(newFilters);
    // console.log('Filters applied:', newFilters);
    // Here you would filter the orders based on the filters
  };

  // Group order items by store (similar to CartScreen)
  const groupOrderItemsByStore = (items: OrderItem[]): StoreGroup[] => {
    const grouped: { [key: string]: OrderItem[] } = {};
    items.forEach((item) => {
      const storeLabel = resolveStoreName(item.companyName, item);
      const key = `${item.sellerOpenId}_${storeLabel}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return Object.keys(grouped).map((key) => {
      const storeItems = grouped[key];
      const companyName = resolveStoreName(storeItems[0]?.companyName, storeItems[0]);
      const sellerOpenId = storeItems[0]?.sellerOpenId ?? '';
      const storeTotal = storeItems.reduce((sum, item) => sum + item.subtotal, 0);
      return { companyName, sellerOpenId, items: storeItems, storeTotal };
    });
  };

  // Render store group header
  const renderStoreHeader = (storeGroup: StoreGroup) => (
    <View style={styles.storeHeader}>
      <Text style={styles.storeName} numberOfLines={1}>
        {resolveStoreName(storeGroup.companyName, storeGroup.items[0])}
      </Text>
      <Text style={styles.storeName}>{'>'}</Text>
    </View>
  );

  // Render individual product item
  const renderProductItem = (item: OrderItem, uniqueKey: string) => {
    const formatSkuAttributes = (skuAttributes: OrderItem['skuAttributes']) => {
      if (!skuAttributes || skuAttributes.length === 0) return '';
      return skuAttributes
        .map(attr => attr.valueTrans || attr.value || '')
        .filter(Boolean)
        .join('/');
    };
    const specsText = formatSkuAttributes(item.skuAttributes);

    return (
      <View key={uniqueKey} style={styles.productItem}>
        <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.productName}</Text>
          {!!specsText && (
            <Text style={styles.productSpecs} numberOfLines={1}>{specsText}</Text>
          )}
        </View>
        <View style={styles.productPriceCol}>
          <Text style={styles.currentPrice}>{formatPriceKRW(item.price)}</Text>
          <Text style={styles.quantity}>x{item.quantity}</Text>
        </View>
      </View>
    );
  };

  // Render order with store grouping
  const renderOrderWithStoreGrouping = (order: Order, showStatusInfo: boolean = false) => {
    const storeGroups = groupOrderItemsByStore(order.items);
    const statusLabel = t(order.statusTranslationKey) || order.progressStatus;

    return (
      <View key={`order-${order.id}`} style={styles.orderContainer}>
        {/* Status row */}
        <View style={styles.orderStatusRow}>
          <View style={styles.orderStatusLeft}>
            <TouchableOpacity
              style={[styles.orderCheckbox, selectedOrderIds.has(order.id) && styles.orderCheckboxChecked]}
              onPress={() => {
                setSelectedOrderIds(prev => {
                  const next = new Set(prev);
                  next.has(order.id) ? next.delete(order.id) : next.add(order.id);
                  return next;
                });
              }}
            >
              {selectedOrderIds.has(order.id) && (
                <Icon name="checkmark" size={12} color={COLORS.white} />
              )}
            </TouchableOpacity>
            {/* <View style={styles.orderStatusDot} /> */}
            <Text style={styles.orderStatusText}>{statusLabel}</Text>
          </View>
          <TouchableOpacity style={styles.orderHelpButton} onPress={() => handleOrderInquiry(order)}>
            <Icon name="help-circle-outline" size={20} color={COLORS.text.secondary} />
            {order.unreadCount != null && order.unreadCount > 0 && (
              <View style={styles.inquiryUnreadBadge}>
                <Text style={styles.inquiryUnreadBadgeText}>{order.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Order number + copy */}
        <View style={styles.orderIdRow}>
          <Text style={styles.orderIdText}>{t('buyList.orderId')}: {order.orderNumber}</Text>
          <TouchableOpacity onPress={() => {
            const Clipboard = require('@react-native-clipboard/clipboard').default;
            Clipboard.setString(order.orderNumber);
            showToast(t('common.copied') || 'Copied', 'success');
          }}>
            <Text style={styles.orderCopyText}>{t('buyList.copy')}</Text>
          </TouchableOpacity>
        </View>

        {/* Store groups */}
        {storeGroups.map((storeGroup, storeIndex) => (
          <TouchableOpacity
            key={`order-${order.id}-store-${storeIndex}`}
            onPress={() => (navigation as any).navigate('OrderDetail', { orderId: order.id, order: order })}
            activeOpacity={0.7}
          >
            {/* Store header */}
            <View style={styles.storeHeader}>
              <Text style={styles.storeName}>
                {resolveStoreName(storeGroup.companyName, storeGroup.items[0])} {'>'}
              </Text>
            </View>
            {/* Items */}
            {storeGroup.items.map((item, itemIndex) =>
              renderProductItem(item, `order-${order.id}-store-${storeIndex}-item-${itemIndex}`)
            )}
          </TouchableOpacity>
        ))}

        {/* Total row */}
        <View style={styles.orderTotalRow}>
          <Text style={styles.orderTotalLabel}>{t('buyList.paymentAmount')}:</Text>
          <Text style={styles.orderTotalValue}>{formatPriceKRW(order.totalAmount)}</Text>
        </View>

        {/* Action buttons — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.orderActionButtons}
          contentContainerStyle={styles.orderActionButtonsContent}
        >
          {/* Left button: Cancel order (unpaid) or Repurchase */}
          {order.status === 'unpaid' ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setCancelReason(t('buyList.changedMyMind'));
                setCancelOtherText('');
                setCancelOrderModal({ orderId: order.id });
              }}
            >
              <Text style={styles.secondaryButtonText}>{t('cart.cancelOrder') || 'Cancel order'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => handleRepurchase(order)}>
              <Text style={styles.secondaryButtonText}>{t('profile.repurchase') || 'Repurchase'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryButton} onPress={() => order.items[0] && handleOpenAddToCartModal(order.items[0])}>
            <Text style={styles.secondaryButtonText}>
              {order.status === 'pending_review' ? t('buyList.review') : t('buyList.addToCart')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => {
              const address = (order as any).shippingAddress;
              setEditAddress({
                zonecode: address?.zipCode || '',
                roadAddress: address?.detailedAddress || '',
                detailAddress: address?.detailedAddress ? `${address.detailedAddress}`.trim() : '',
                recipient: address?.recipient || '',
                contact: address?.contact || '',
                customsCode: address?.personalCustomsCode || '',
              });
              setSelectedOrderForAddress(order);
              setIsDefaultAddress(address?.defaultAddress || false);
              setAddressModalVisible(true);
            }}
          >
            <Text style={styles.secondaryButtonText}>{t('buyList.editAddress')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setRefundSelectedItems(new Set());
              setRefundModalOrder(order);
            }}
          >
            <Text style={styles.secondaryButtonText}>{t('profile.refund') || 'Refund'}</Text>
          </TouchableOpacity>

          {/* Primary button: Pay for unpaid/waiting settlement, Confirm receipt for shipped */}
          {(order.status === 'unpaid' || order.progressStatus === 'WH_PAY_WAIT') ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Payment' as never)}
            >
              <Text style={styles.primaryButtonText}>{t('cart.pay') || 'Pay Now'}</Text>
            </TouchableOpacity>
          ) : (order.progressStatus === 'INTERNATIONAL_SHIPPED' || order.progressStatus === 'ORDER_RECEIVED') ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleConfirmReceived(order.id)}
            >
              <Text style={styles.primaryButtonText}>{t('profile.confirmReceipt') || 'Confirm receipt'}</Text>
            </TouchableOpacity>
          ) : order.status === 'progressing' ? (
            <TouchableOpacity style={[styles.primaryButton, { opacity: 0.4 }]} disabled>
              <Text style={styles.primaryButtonText}>{t('profile.confirmReceipt') || 'Confirm receipt'}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    );
  };

  // Check if a tab has orders with unread messages
  const filteredOrders = useMemo(
    () => {
      let result = orders;
      if (filters.orderNumber.trim()) {
        const q = filters.orderNumber.trim().toLowerCase();
        result = result.filter(order =>
          order.orderNumber?.toLowerCase().includes(q),
        );
      }
      if (filterPlatform) {
        result = result.filter(order =>
          order.items?.some(item => {
            const site = String((item as any).otherSite ?? item.source ?? '').toLowerCase();
            if (filterPlatform === 'taobao') return site.includes('taobao');
            if (filterPlatform === '1688') return site.includes('1688');
            return true;
          }),
        );
      }
      if (selectedTransportMethod === '항공') {
        result = result.filter(order => order.transferMethod === 'air');
      } else if (selectedTransportMethod === '선박') {
        result = result.filter(order => order.transferMethod === 'ship');
      }
      // 1) 사업 도메인 필터 — 발주관리 드롭다운의 활성 항목으로 1차 필터링.
      //    구매대행/로켓-3PL/VVIC하이패스/배송대행 각 도메인은
      //    resolveOrderBusinessDomain 으로 분류되며 우선권 규칙(VVIC > Rocket > Shipping > Purchase)
      //    을 따른다. 오류/반품관리는 도메인 필터 대신 status 그룹 필터를 따른다.
      if (
        activeBusinessDomain === 'purchase_agency' ||
        activeBusinessDomain === 'rocket_3pl' ||
        activeBusinessDomain === 'vvic_hipass' ||
        activeBusinessDomain === 'shipping_agency'
      ) {
        result = result.filter(
          (order) => resolveOrderBusinessDomain(order) === activeBusinessDomain,
        );
      }

      // 2) activeTab 별 추가 필터. 두 종류가 섞여 들어온다:
      //    - 상태 그룹 키 ('purchase_agency' / 'warehouse' / 'international_shipping' / 'error')
      //    - Order.status 값 ('category' / 'unpaid' / 'progressing' / 'end' / ...)
      //   'purchase_agency' 같은 그룹 키가 들어와도 이미 도메인 필터를 적용했으므로
      //   추가 좁힘 없이 그대로 통과시킨다(이중 필터 방지).
      if (activeTab !== 'all') {
        const isKnownGroup = STATUS_GROUPS.some((g) => g.key === activeTab);
        const isKnownStatus = ['category','unpaid','progressing','end','pending_review','error','refunds']
          .includes(activeTab);
        if (isKnownGroup) {
          // 도메인 필터가 이미 처리했으므로 그룹 키는 통과.
          // (단, warehouse·international_shipping·error 같은 현지·오류 그룹은 그대로 필터.)
          if (activeTab !== 'purchase_agency') {
            result = result.filter(order => orderBelongsToStatusGroup(order, activeTab));
          }
        } else if (isKnownStatus) {
          result = result.filter(order => order.status === activeTab);
        }
      }
      // Further filter by selected progress status (canonical codes)
      if (selectedProgressStatus) {
        result = result.filter(order =>
          orderMatchesProgressStatus(order, selectedProgressStatus),
        );
      }
      return result;
    },
    [
      activeTab,
      orders,
      selectedProgressStatus,
      filters.orderNumber,
      filterPlatform,
      selectedTransportMethod,
      activeBusinessDomain,
    ],
  );

  const groupedOrdersForCategory = useMemo(() => {
    return STATUS_GROUPS.map((group) => {
      const statusSections = group.statuses
        .map((progressStatus) => {
          const meta = PROGRESS_STATUS_META[progressStatus];
          const sectionOrders = filteredOrders.filter(order =>
            orderMatchesProgressStatus(order, progressStatus),
          );
          return {
            progressStatus,
            title: meta ? meta.translationKey : progressStatus,
            orders: sectionOrders,
          };
        })
        .filter(section => section.orders.length > 0);

      return {
        key: group.key,
        title: group.title,
        statusSections,
      };
    }).filter(group => {
      if (selectedStatusGroup && group.key !== selectedStatusGroup) {
        return false;
      }
      return group.statusSections.length > 0;
    });
  }, [filteredOrders, selectedStatusGroup]);

  const hasUnreadInTab = (tab: Order['status']): boolean => {
    return orders.some(order => 
      order.status === tab && (order.unreadCount || 0) > 0
    );
  };

  const getGroupOrderCount = (groupKey: string): number => statusGroupCounts[groupKey] ?? 0;

  const getProgressStatusCount = (progressStatus: string): number =>
    progressStatusCounts[progressStatus] ?? 0;

  const renderCategoryStatusFilters = () => {
    // 발주관리 / 현지입/출고 두 항목만 노출한다.
    // 사용자 요청으로 국제운송과 오류 칩은 제거 — '오류관리'는 발주관리
    // 드롭다운 안으로 옮겨졌고 국제운송은 별도 페지로 분리되었다.
    const groups = STATUS_GROUPS.filter(
      (g) => g.key === 'purchase_agency' || g.key === 'warehouse',
    );
    const currentGroup = groups.find((g) => g.key === activeTab);

    // 발주관리 드롭다운 — 스크린샷의 7개 항목. 각 항목의 onPress 는
    // 해당 도메인 화면으로 분기하거나 현재 BuyList 의 필터 상태를 바꾼다.
    type PurchaseDropdownItem = {
      key: string;
      labelKey: string;
      fallbackLabel: string;
      onSelect: () => void;
      isSelected: () => boolean;
    };
    // 항목 선택 시 페지를 이동하지 않고 같은 BuyListScreen 안에서
    // activeBusinessDomain 만 갱신한다. 본문 영역은 도메인별로 다른
    // 대시보드(주문 카드 리스트 또는 placeholder)를 렌더한다.
    // purchase_agency 도메인의 세부 필터 키들 — 구매대행 셀에서 진입할 때
    // initialTab 으로 전달될 수 있는 모든 값(견적대기='category', 결제대기='unpaid', ...).
    // '전체' 항목이 아니면 모두 구매대행 항목이 selected 로 표시되어야 한다.
    const purchaseAgencyTabs = [
      'purchase_agency',
      'category',
      'unpaid',
      'to_be_shipped',
      'shipped',
      'processed',
      'shipping_delay',
      'end',
    ];

    const purchaseDropdownItems: PurchaseDropdownItem[] = [
      {
        key: 'all',
        labelKey: 'profile.viewAll',
        fallbackLabel: '전체',
        onSelect: () => {
          setActiveBusinessDomain('purchase_agency');
          setActiveTab('all');
          setSelectedProgressStatus(null);
          setExpandedStatusGroup(null);
        },
        isSelected: () =>
          activeBusinessDomain === 'purchase_agency' && activeTab === 'all',
      },
      {
        key: 'purchase_agency',
        labelKey: 'profile.tabPurchaseAgency',
        fallbackLabel: '구매대행',
        onSelect: () => {
          setActiveBusinessDomain('purchase_agency');
          setActiveTab('purchase_agency');
          setSelectedProgressStatus(null);
          setExpandedStatusGroup(null);
        },
        // ProfileScreen 카드의 구매대행 셀(견적대기/결제대기/.../완료)에서 들어오면
        // activeTab 이 'category'·'unpaid' 같은 세부 필터로 설정되는데, 그때도
        // 사용자 인식상 도메인은 '구매대행' 이므로 이 항목을 selected 로 표시한다.
        isSelected: () =>
          activeBusinessDomain === 'purchase_agency' &&
          purchaseAgencyTabs.includes(activeTab),
      },
      {
        key: 'rocket_3pl',
        labelKey: 'profile.tabRocket3pl',
        fallbackLabel: '로켓/3PL',
        onSelect: () => {
          setActiveBusinessDomain('rocket_3pl');
          setActiveTab('all');
          setSelectedProgressStatus(null);
          setExpandedStatusGroup(null);
        },
        isSelected: () => activeBusinessDomain === 'rocket_3pl',
      },
      {
        key: 'vvic_hipass',
        labelKey: 'profile.tabVvicHipass',
        fallbackLabel: 'WIC하이패스',
        onSelect: () => {
          setActiveBusinessDomain('vvic_hipass');
          setActiveTab('all');
          setSelectedProgressStatus(null);
          setExpandedStatusGroup(null);
        },
        isSelected: () => activeBusinessDomain === 'vvic_hipass',
      },
      {
        key: 'shipping_agency',
        labelKey: 'profile.tabShippingAgency',
        fallbackLabel: '배송대행',
        onSelect: () => {
          setActiveBusinessDomain('shipping_agency');
          setActiveTab('all');
          setSelectedProgressStatus(null);
          setExpandedStatusGroup(null);
        },
        isSelected: () => activeBusinessDomain === 'shipping_agency',
      },
      {
        key: 'error_management',
        labelKey: 'profile.errorManagement',
        fallbackLabel: '오류관리',
        // 오류 상태 그룹 필터를 적용 (상단 칩이 보이지 않는 대신 본문은 필터됨).
        onSelect: () => {
          setActiveBusinessDomain('error_management');
          setActiveTab('error');
          setSelectedProgressStatus(null);
          setExpandedStatusGroup(null);
        },
        isSelected: () => activeBusinessDomain === 'error_management',
      },
      {
        key: 'refund_management',
        labelKey: 'profile.refundManagement',
        fallbackLabel: '반품관리',
        // 환불 요청 진행상태를 선택. PROGRESS_STATUS_META 의 USER_REFUND_REQ 사용.
        onSelect: () => {
          setActiveBusinessDomain('refund_management');
          setActiveTab('error');
          setSelectedProgressStatus('USER_REFUND_REQ');
          setExpandedStatusGroup(null);
        },
        isSelected: () => activeBusinessDomain === 'refund_management',
      },
    ];

    const isPurchaseDropdownOpen = expandedStatusGroup === 'purchase_agency';

    return (
      <>
        {/* Row 1: Status group tabs (발주관리, 현지입/출고 만 노출) */}
        <View style={styles.filterRow1}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow1Content}>
            <TouchableOpacity
              style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
              onPress={() => { setActiveTab('all'); setSelectedProgressStatus(null); }}
            >
              <Text style={[styles.filterChipText, activeTab === 'all' && styles.filterChipTextActive]}>
                {t('profile.viewAll') || 'All'}
              </Text>
            </TouchableOpacity>
            {groups.map((group) => {
              const isOpen = expandedStatusGroup === group.key;
              const isPurchase = group.key === 'purchase_agency';
              const isWarehouse = group.key === 'warehouse';
              // 발주관리 칩은 활성 도메인 이름을 라벨로 보여준다 (예: 로켓/3PL).
              // 다른 칩은 기존 그룹 제목을 그대로 사용.
              let chipLabel = t(group.titleKey) || group.title;
              if (isPurchase) {
                const labelKey =
                  activeBusinessDomain === 'rocket_3pl'
                    ? 'profile.tabRocket3pl'
                    : activeBusinessDomain === 'vvic_hipass'
                      ? 'profile.tabVvicHipass'
                      : activeBusinessDomain === 'shipping_agency'
                        ? 'profile.tabShippingAgency'
                        : activeBusinessDomain === 'error_management'
                          ? 'profile.errorManagement'
                          : activeBusinessDomain === 'refund_management'
                            ? 'profile.refundManagement'
                            : null;
                if (labelKey) {
                  chipLabel = t(labelKey) || chipLabel;
                }
              }
              // 발주관리 칩은 다음 중 하나라도 만족하면 붉은색 활성:
              //  1) 도메인이 purchase_agency 이고 activeTab 이 그 도메인의 어떤 세부
              //     필터(견적대기 = 'category', 결제대기 = 'unpaid', ...) 라도 켜져 있을 때 —
              //     ProfileScreen 카드에서 구매대행 셀로 진입한 경우가 여기에 해당.
              //  2) 도메인이 로켓/3PL · VVIC하이패스 · 배송대행 · 오류관리 · 반품관리 처럼
              //     비-구매대행 도메인으로 갈아탔을 때(드롭다운 라벨이 그 이름으로 바뀜).
              // 현지입/출고 칩은 기존대로 activeTab 매칭만.
              const isChipActive = isPurchase
                ? (activeBusinessDomain === 'purchase_agency' && purchaseAgencyTabs.includes(activeTab)) ||
                  activeBusinessDomain !== 'purchase_agency'
                : activeTab === group.key;
              return (
                <TouchableOpacity
                  key={group.key}
                  // 발주관리·현지입/출고 칩에 측정 ref 를 단다. measureInWindow
                  // 로 화면 절대 좌표를 얻어 드롭다운 위치를 칩 바로 아래로 고정.
                  ref={
                    isPurchase
                      ? (purchaseChipRef as any)
                      : isWarehouse
                        ? (warehouseChipRef as any)
                        : undefined
                  }
                  style={[styles.filterChip, isChipActive && styles.filterChipActive]}
                  onPress={() => {
                    if (isPurchase) {
                      // 칩 위치 측정 — 매 클릭마다 다시 잰다(회전·스크롤 대비).
                      purchaseChipRef.current?.measureInWindow((x, y, width, height) => {
                        setPurchaseChipLayout({ x, y, width, height });
                      });
                      // 발주관리는 항상 드롭다운 토글만 — activeTab 변경 X.
                      setExpandedStatusGroup(prev => prev === group.key ? null : group.key);
                      return;
                    }
                    if (isWarehouse) {
                      warehouseChipRef.current?.measureInWindow((x, y, width, height) => {
                        setWarehouseChipLayout({ x, y, width, height });
                      });
                    }
                    if (activeTab === group.key) {
                      // Already on this tab — toggle dropdown
                      setExpandedStatusGroup(prev => prev === group.key ? null : group.key);
                    } else {
                      // Switch to this tab and open dropdown
                      setActiveTab(group.key);
                      setExpandedStatusGroup(group.key);
                    }
                  }}
                >
                  <Text style={[styles.filterChipText, isChipActive && styles.filterChipTextActive]}>
                    {chipLabel}
                    {' '}
                    <Text style={[styles.filterChipCountBadge, isChipActive && styles.filterChipCountBadgeActive]}>
                      ({isPurchase
                        ? (activeBusinessDomain === 'rocket_3pl'
                            ? businessDomainCounts.rocket_3pl
                            : activeBusinessDomain === 'vvic_hipass'
                              ? businessDomainCounts.vvic_hipass
                              : activeBusinessDomain === 'shipping_agency'
                                ? businessDomainCounts.shipping_agency
                                : businessDomainCounts.purchase_agency)
                        : getGroupOrderCount(group.key)})
                    </Text>
                  </Text>
                  <Icon
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={isChipActive ? COLORS.red : COLORS.text.primary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 발주관리 드롭다운 — 도메인 선택 목록.
            앵커 좌표는 발주관리 칩의 measureInWindow 결과로부터 계산.
            top  = chip.y + chip.height + 4 (칩 아래 약간 띄움)
            left = chip.x (칩의 좌측에 맞춰 정렬).
            팝오버 느낌을 위해 backdrop 은 투명 — 바깥쪽 탭으로만 닫힘. */}
        <Modal
          visible={isPurchaseDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setExpandedStatusGroup(null)}
        >
          <TouchableOpacity
            style={styles.purchaseDropdownBackdrop}
            activeOpacity={1}
            onPress={() => setExpandedStatusGroup(null)}
          >
            <View
              style={[
                styles.purchaseDropdownAnchor,
                purchaseChipLayout && {
                  top: purchaseChipLayout.y + purchaseChipLayout.height + 4,
                  left: purchaseChipLayout.x,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.purchaseDropdownCard}>
                <Text style={styles.purchaseDropdownTitle}>
                  {t('pages.orders.groups.purchaseAgency') || '발주관리'}
                </Text>
                {purchaseDropdownItems.map((item) => {
                  const selected = item.isSelected();
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.purchaseDropdownItem}
                      activeOpacity={0.7}
                      onPress={item.onSelect}
                    >
                      {/* 좌측 붉은색 활성 표식 */}
                      <View
                        style={[
                          styles.purchaseDropdownBullet,
                          selected && styles.purchaseDropdownBulletActive,
                        ]}
                      />
                      <Text
                        style={[
                          styles.purchaseDropdownText,
                          selected && styles.purchaseDropdownTextActive,
                        ]}
                      >
                        {t(item.labelKey) || item.fallbackLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 현지입/출고 드롭다운 — 기존 상태 목록.
            발주관리와 같은 앵커링 패턴: 칩 바로 아래에 떠 있고 너비는 칩 너비와 일치.
            top·left·width 모두 칩의 measureInWindow 결과로 인라인 오버라이드. */}
        <Modal
          visible={!!(currentGroup && expandedStatusGroup === activeTab && activeTab === 'warehouse')}
          transparent
          animationType="fade"
          onRequestClose={() => setExpandedStatusGroup(null)}
        >
          <TouchableOpacity
            style={styles.purchaseDropdownBackdrop}
            activeOpacity={1}
            onPress={() => setExpandedStatusGroup(null)}
          >
            <View
              style={[
                styles.warehouseDropdownAnchor,
                warehouseChipLayout && {
                  top: warehouseChipLayout.y + warehouseChipLayout.height + 4,
                  left: warehouseChipLayout.x,
                  width: warehouseChipLayout.width,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.purchaseDropdownCard}>
                <Text style={styles.purchaseDropdownTitle}>
                  {currentGroup ? (t(currentGroup.titleKey) || currentGroup.title) : ''}
                </Text>
                {/* 현지입/출고 드롭다운 — 전체 / 입고 / 출고 3개 항목.
                    기존 8개 진행상태(접수신청·도착예정·...) 는 사용자 요청으로 모두 제거. */}
                {([
                  { key: 'all', labelKey: 'profile.viewAll', fallbackLabel: '전체' },
                  { key: 'in', labelKey: 'profile.warehouseIn', fallbackLabel: '입고' },
                  { key: 'out', labelKey: 'profile.warehouseOut', fallbackLabel: '출고' },
                ] as const).map((item) => {
                  const selected = warehouseFilter === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.purchaseDropdownItem}
                      activeOpacity={0.7}
                      onPress={() => {
                        setActiveTab('warehouse');
                        setWarehouseFilter(item.key);
                        setSelectedProgressStatus(null);
                        setExpandedStatusGroup(null);
                      }}
                    >
                      <View
                        style={[
                          styles.purchaseDropdownBullet,
                          selected && styles.purchaseDropdownBulletActive,
                        ]}
                      />
                      <Text
                        style={[
                          styles.purchaseDropdownText,
                          selected && styles.purchaseDropdownTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {t(item.labelKey) || item.fallbackLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Row 2: Select all + customs + transport + date */}
        <View style={styles.filterRow2}>
          <TouchableOpacity
            style={styles.selectAllChip}
            onPress={() => {
              if (selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0) {
                // Deselect all
                setSelectedOrderIds(new Set());
                setSelectAll(false);
              } else {
                // Select all
                setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
                setSelectAll(true);
              }
            }}
          >
            <View style={[styles.selectAllCircle, (selectAll || (selectedOrderIds.size > 0 && selectedOrderIds.size === filteredOrders.length)) && styles.selectAllCircleActive]}>
              {(selectAll || (selectedOrderIds.size > 0 && selectedOrderIds.size === filteredOrders.length)) && (
                <Icon name="checkmark" size={12} color={COLORS.white} />
              )}
            </View>
            <Text style={styles.selectAllText}>{t('pages.orders.filters.selectAll') || '전체 선택'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            ref={customsChipRef as any}
            style={[styles.filterChip, !!selectedCustomsMethod && styles.filterChipActive]}
            onPress={() => {
              // 칩 위치 측정 — 클릭마다 다시 잰다(회전·스크롤 대비).
              customsChipRef.current?.measureInWindow((x, y, width, height) => {
                setCustomsChipLayout({ x, y, width, height });
              });
              setShowCustomsDropdown(prev => !prev);
            }}
          >
            <Text style={[styles.filterChipText, !!selectedCustomsMethod && styles.filterChipTextActive]}>
              {selectedCustomsMethod || (t('pages.orders.filters.customsMethod') || '통관방식')}
            </Text>
            <Icon
              name={showCustomsDropdown ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={selectedCustomsMethod ? COLORS.red : COLORS.text.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            ref={transportChipRef as any}
            style={[styles.filterChip, !!selectedTransportMethod && styles.filterChipActive]}
            onPress={() => {
              // 칩 위치 측정 — 클릭마다 다시 잰다(회전·스크롤 대비).
              transportChipRef.current?.measureInWindow((x, y, width, height) => {
                setTransportChipLayout({ x, y, width, height });
              });
              setShowTransportDropdown(prev => !prev);
            }}
          >
            <Text style={[styles.filterChipText, !!selectedTransportMethod && styles.filterChipTextActive]}>
              {selectedTransportMethod || (t('pages.orders.filters.transportMethod') || '운송방식')}
            </Text>
            <Icon
              name={showTransportDropdown ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={selectedTransportMethod ? COLORS.red : COLORS.text.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, (selectedStartDate || selectedEndDate) && styles.filterChipActive]}
            onPress={() => setShowDateModal(true)}
          >
            <Text style={[styles.filterChipText, (selectedStartDate || selectedEndDate) && styles.filterChipTextActive]}>
              {selectedStartDate
                ? `${selectedStartDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}${selectedEndDate ? ` ~ ${selectedEndDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}` : ''}`
                : (t('pages.orders.filters.periodSelect') || '기간선택')}
            </Text>
            <Icon name="calendar-outline" size={14} color={(selectedStartDate || selectedEndDate) ? COLORS.red : COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Customs dropdown — All, General, Simplified only */}
        {/* Transport dropdown */}
        {/* (Modals moved to main return for proper overlay) */}
      </>
    );
  };

  // Kakao address search HTML
  const kakaoPostcodeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #wrap { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="wrap"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    window.onload = function() {
      new daum.Postcode({
        oncomplete: function(data) {
          var msg = JSON.stringify({
            zonecode: data.zonecode,
            roadAddress: data.roadAddress || data.jibunAddress,
            jibunAddress: data.jibunAddress,
            sido: data.sido,
            sigungu: data.sigungu,
          });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(msg);
          }
        },
        width: '100%',
        height: '100%',
        maxSuggestItems: 5,
      }).embed(document.getElementById('wrap'), { autoClose: true });
    };
  </script>
</body>
</html>`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main' as never);
            }
          }}
        >
          <Icon name="chevron-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        
        {/* Order number search input */}
        <View style={styles.headerCenter}>
          <View style={styles.orderSearchBar}>
            <TextInput
              style={styles.orderSearchInput}
              placeholder={t('profile.searchOrders') || '주문 검색'}
              placeholderTextColor={COLORS.text.secondary}
              value={orderSearchText}
              onChangeText={(text) => {
                setOrderSearchText(text);
                handleApplyFilters({ ...filters, orderNumber: text });
              }}
              returnKeyType="search"
            />
            {!!orderSearchText ? (
              <TouchableOpacity onPress={() => { setOrderSearchText(''); handleApplyFilters({ ...filters, orderNumber: '' }); }}>
                <Icon name="close-circle" size={18} color={COLORS.text.primary} />
              </TouchableOpacity>
            ) : (
              <Icon name="search" size={18} color={COLORS.text.primary} />
            )}
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => {
              setShowMoreMenu(false);
              // Initialize drafts from current applied values
              setDraftPlatform(filterPlatform);
              setDraftCustoms(selectedCustomsMethod);
              setDraftTransport(selectedTransportMethod);
              setDraftStartDate(selectedStartDate);
              setDraftEndDate(selectedEndDate);
              setShowInlineCalendar(false);
              setShowAllFiltersModal(true);
            }}>
            <TuneIcon width={24} height={24} color={COLORS.black} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => setShowNavModal(true)}>
            <GridViewIcon width={24} height={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={() => setShowMoreMenu(prev => !prev)}
          >
            <Icon name="ellipsis-horizontal" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* More menu — absolute overlay below header */}
      {showMoreMenu && (
        <>
          <TouchableOpacity
            style={{ position: 'absolute', top: headerHeight, left: 0, right: 0, bottom: 0, zIndex: 99, backgroundColor: 'rgba(0,0,0,0.4)' }}
            activeOpacity={1}
            onPress={() => setShowMoreMenu(false)}
          />
          <View style={[styles.moreMenuRow, { top: headerHeight }]}>
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => { setShowMoreMenu(false); showToast(t('home.exportOrders'), 'info'); }}
            >
              <ExportOrderIcon color={COLORS.black} />
              <Text style={styles.moreMenuItemText}>{t('home.exportOrders')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moreMenuItem}
              onPress={() => { setShowMoreMenu(false); showToast(t('home.print'), 'info'); }}
            >
              {/* <Icon name="print-outline" size={20} color={COLORS.text.primary} /> */}
              <PrintIcon color={COLORS.black} />
              <Text style={styles.moreMenuItemText}>{t('home.print')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Filter rows — outside ScrollView so modals work */}
      {renderCategoryStatusFilters()}

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
          if (distanceFromBottom < 200 && hasMoreRecommendations && !recommendationsLoading && !isRecommendationsRefreshingRef.current && !isLoadingMoreRecommendationsRef.current) {
            setRecommendationsOffset(prev => prev + 1);
          }
        }}
        scrollEventThrottle={400}
      >
        <View style={styles.content}>

          {/* 본문 분기:
              - 4개 사업 도메인(구매대행 · 로켓/3PL · VVIC하이패스 · 배송대행):
                resolveOrderBusinessDomain 으로 분류한 결과를 filteredOrders 가
                이미 필터링했으므로 그대로 주문 카드 리스트를 렌더한다.
              - 오류관리 · 반품관리: 백엔드에 별도 데이터가 없으므로 placeholder. */}
          {activeBusinessDomain === 'error_management' ||
          activeBusinessDomain === 'refund_management' ? (
            <View style={styles.emptyState}>
              <Icon name="basket-outline" size={80} color="#CCC" />
              <Text style={styles.emptyTitle}>
                {activeBusinessDomain === 'error_management'
                  ? (t('profile.errorManagement') || '오류관리')
                  : (t('profile.refundManagement') || '반품관리')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {t('profile.placeholderEmpty') || '아직 표시할 주문이 없습니다.'}
              </Text>
            </View>
          ) : isLoading && orders.length === 0 ? (
            /* Loading State — show a list-shaped skeleton in the body while
               orders are being fetched, so the page never flips back to a
               spinner after the lazy-route skeleton fades out. */
            <ScreenSkeleton variant="list" showHeader={false} />
          ) : (
            <>
              {/* Orders List or Empty State */}
              {filteredOrders.length === 0 && groupedOrdersForCategory.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="basket-outline" size={80} color="#CCC" />
                  <Text style={styles.emptyTitle}>No orders</Text>
                  <Text style={styles.emptySubtitle}>You don't have any orders in this category</Text>
                </View>
              ) : (
                <View style={styles.ordersContainer}>
                  {filteredOrders.map((order) => renderOrderWithStoreGrouping(order, true))}
                </View>
              )}
            </>
          )}

          {/* More to Love Section */}
          {/* {renderMoreToLove()} */}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <OrderFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
      />

      {/* 통관방식 드롭다운 — 발주관리·현지입/출고와 같은 앵커 패턴.
          칩 바로 아래에 떠 있고 너비는 칩과 일치한다. */}
      <Modal
        visible={showCustomsDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomsDropdown(false)}
      >
        <TouchableOpacity
          style={styles.purchaseDropdownBackdrop}
          activeOpacity={1}
          onPress={() => setShowCustomsDropdown(false)}
        >
          <View
            style={[
              styles.warehouseDropdownAnchor,
              customsChipLayout && {
                top: customsChipLayout.y + customsChipLayout.height + 4,
                left: customsChipLayout.x,
                width: customsChipLayout.width,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.purchaseDropdownCard}>
              <Text style={styles.purchaseDropdownTitle}>
                {t('pages.orders.filters.customsMethod') || '통관방식'}
              </Text>
              {[
                { label: t('profile.viewAll') || 'All', value: '' },
                { label: t('pages.orders.filters.generalClearance') || '일반통관', value: '일반통관' },
                { label: t('pages.orders.filters.simplifiedClearance') || '간이통관', value: '간이통관' },
              ].map((opt) => {
                const selected = selectedCustomsMethod === (opt.value || null);
                return (
                  <TouchableOpacity
                    key={opt.value || 'all'}
                    style={styles.purchaseDropdownItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedCustomsMethod(opt.value || null);
                      setShowCustomsDropdown(false);
                    }}
                  >
                    <View
                      style={[
                        styles.purchaseDropdownBullet,
                        selected && styles.purchaseDropdownBulletActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.purchaseDropdownText,
                        selected && styles.purchaseDropdownTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 운송방식 드롭다운 — 발주관리·현지입출고·통관방식과 같은 앵커 패턴.
          칩 바로 아래에 떠 있고 너비는 칩과 일치한다. */}
      <Modal
        visible={showTransportDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransportDropdown(false)}
      >
        <TouchableOpacity
          style={styles.purchaseDropdownBackdrop}
          activeOpacity={1}
          onPress={() => setShowTransportDropdown(false)}
        >
          <View
            style={[
              styles.warehouseDropdownAnchor,
              transportChipLayout && {
                top: transportChipLayout.y + transportChipLayout.height + 4,
                left: transportChipLayout.x,
                width: transportChipLayout.width,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.purchaseDropdownCard}>
              <Text style={styles.purchaseDropdownTitle}>
                {t('pages.orders.filters.transportMethod') || '운송방식'}
              </Text>
              {[
                { label: t('profile.viewAll') || 'All', value: '' },
                { label: t('pages.orders.filters.air') || '항공', value: '항공' },
                { label: t('pages.orders.filters.ship') || '선박', value: '선박' },
              ].map((opt) => {
                const selected = selectedTransportMethod === (opt.value || null);
                return (
                  <TouchableOpacity
                    key={opt.value || 'all'}
                    style={styles.purchaseDropdownItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedTransportMethod(opt.value || null);
                      setShowTransportDropdown(false);
                    }}
                  >
                    <View
                      style={[
                        styles.purchaseDropdownBullet,
                        selected && styles.purchaseDropdownBulletActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.purchaseDropdownText,
                        selected && styles.purchaseDropdownTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Range Picker Modal */}
      <Modal visible={showDateModal} transparent animationType="fade" onRequestClose={() => setShowDateModal(false)}>
        <TouchableOpacity style={styles.dateModalOverlay} activeOpacity={1} onPress={() => setShowDateModal(false)}>
          <View style={styles.dateModalContent} onStartShouldSetResponder={() => true}>
            {/* Month navigation */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth() - 1); setCalendarDate(d); }}>
                <Icon name="chevron-back" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
              <Text style={styles.calendarHeaderText}>
                {calendarDate.getFullYear()}년 {calendarDate.getMonth() + 1}월
              </Text>
              <TouchableOpacity onPress={() => { const d = new Date(calendarDate); d.setMonth(d.getMonth() + 1); setCalendarDate(d); }}>
                <Icon name="chevron-forward" size={20} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            {/* Day headers */}
            <View style={styles.calendarWeekRow}>
              {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <Text key={d} style={styles.calendarDayHeader}>{d}</Text>
              ))}
            </View>
            {/* Calendar grid */}
            {(() => {
              const year = calendarDate.getFullYear();
              const month = calendarDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells: (number | null)[] = Array(firstDay).fill(null);
              for (let i = 1; i <= daysInMonth; i++) cells.push(i);
              while (cells.length % 7 !== 0) cells.push(null);
              const weeks: (number | null)[][] = [];
              for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
              return weeks.map((week, wi) => (
                <View key={wi} style={styles.calendarWeekRow}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={styles.calendarDayCell} />;
                    const date = new Date(year, month, day);
                    const isStart = selectedStartDate && date.toDateString() === selectedStartDate.toDateString();
                    const isEnd = selectedEndDate && date.toDateString() === selectedEndDate.toDateString();
                    const inRange = selectedStartDate && selectedEndDate && date > selectedStartDate && date < selectedEndDate;
                    return (
                      <TouchableOpacity
                        key={di}
                        style={[styles.calendarDayCell, (isStart || isEnd) && styles.calendarDayCellSelected, inRange && styles.calendarDayCellInRange]}
                        onPress={() => {
                          if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
                            setSelectedStartDate(date);
                            setSelectedEndDate(null);
                            setPickingEnd(true);
                          } else {
                            if (date < selectedStartDate) {
                              setSelectedEndDate(selectedStartDate);
                              setSelectedStartDate(date);
                            } else {
                              setSelectedEndDate(date);
                            }
                            setPickingEnd(false);
                            setShowDateModal(false);
                            handleApplyFilters({ ...filters, startDate: date < selectedStartDate ? date : selectedStartDate, endDate: date < selectedStartDate ? selectedStartDate : date });
                          }
                        }}
                      >
                        <Text style={[styles.calendarDayText, (isStart || isEnd) && styles.calendarDayTextSelected]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()}
            {/* Hint */}
            <Text style={styles.calendarHint}>
              {!selectedStartDate ? '시작일을 선택하세요' : !selectedEndDate ? '종료일을 선택하세요' : ''}
            </Text>
            {/* Clear */}
            {(selectedStartDate || selectedEndDate) && (
              <TouchableOpacity style={styles.calendarClearButton} onPress={() => { setSelectedStartDate(null); setSelectedEndDate(null); handleApplyFilters({ ...filters, startDate: null, endDate: null }); setShowDateModal(false); }}>
                <Text style={styles.calendarClearText}>초기화</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add to Cart Modal */}
      <Modal visible={addToCartModalVisible} transparent animationType="slide" onRequestClose={() => setAddToCartModalVisible(false)}>
        <View style={styles.atcModalOverlay}>
          <View style={styles.atcModalContent}>
            {/* Header */}
            <View style={styles.atcModalHeader}>
              <Text style={styles.atcModalTitle}>Add to Cart</Text>
              <TouchableOpacity onPress={() => setAddToCartModalVisible(false)}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {isLoadingProductDetail ? (
              <View style={styles.atcLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Product image + name */}
                <View style={styles.atcProductRow}>
                  <Image source={{ uri: addToCartItem?.image }} style={styles.atcProductImage} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.atcProductName} numberOfLines={3}>{addToCartItem?.productName}</Text>
                    <Text style={styles.atcProductPrice}>{formatPriceKRW(addToCartSelectedSku?.price || addToCartItem?.price || 0)}</Text>
                  </View>
                </View>

                {/* SKU options — same logic as ProductDetailScreen */}
                {(() => {
                  const rawVariants: any[] = addToCartProductDetail?.product?.rawVariants || addToCartProductDetail?.rawVariants || [];
                  const productSkuInfos: any[] = addToCartProductDetail?.product?.productSkuInfos || addToCartProductDetail?.productSkuInfos || [];
                  
                  // If rawVariants empty but productSkuInfos has data, build variants from it
                  const effectiveVariants = rawVariants.length > 0 ? rawVariants :
                    productSkuInfos.map((sku: any) => ({
                      id: sku.skuId?.toString() || '',
                      name: (sku.skuAttributes || []).map((a: any) => `${a.attributeNameTrans || a.attributeName}: ${a.valueTrans || a.value}`).join(' / '),
                      price: parseFloat(sku.price || sku.consignPrice || 0),
                      stock: sku.amountOnSale || 0,
                      image: sku.skuAttributes?.[0]?.skuImageUrl || '',
                      attributes: sku.skuAttributes || [],
                      specId: sku.specId || '',
                      skuId: sku.skuId?.toString() || '',
                    }));

                  if (effectiveVariants.length === 0) return null;

                  // Build variationTypesMap exactly like ProductDetailScreen.getVariationTypes
                  const variationTypesMap = new Map<string, Map<string, { value: string; image?: string }>>();

                  effectiveVariants.forEach((variant: any) => {
                    const attrs = variant.attributes || variant.skuAttributes || [];
                    attrs.forEach((a: any) => {
                      const typeName = (a.attributeNameTrans || a.attributeName || a.prop_name || a.name || '').trim();
                      const val = (a.valueTrans || a.value || '').trim();
                      const img = a.skuImageUrl || a.pic_url || '';
                      if (!typeName || !val) return;
                      if (!variationTypesMap.has(typeName)) variationTypesMap.set(typeName, new Map());
                      const optMap = variationTypesMap.get(typeName)!;
                      if (!optMap.has(val)) optMap.set(val, { value: val, image: img });
                    });
                    // Also handle variant.name format "Color: Red / Size: L"
                    if (attrs.length === 0 && variant.name) {
                      variant.name.split('/').forEach((part: string) => {
                        const [k, v] = part.split(':').map((s: string) => s.trim());
                        if (k && v) {
                          if (!variationTypesMap.has(k)) variationTypesMap.set(k, new Map());
                          const optMap = variationTypesMap.get(k)!;
                          if (!optMap.has(v)) optMap.set(v, { value: v, image: variant.image || '' });
                        }
                      });
                    }
                  });

                  const variationTypes: { name: string; options: { value: string; image?: string }[] }[] = [];
                  variationTypesMap.forEach((optMap, name) => {
                    variationTypes.push({ name, options: Array.from(optMap.values()) });
                  });

                  if (variationTypes.length === 0) return null;

                  const findMatchingSku = (attrs: Record<string, string>) => {
                    return effectiveVariants.find((v: any) => {
                      const vAttrs = v.attributes || v.skuAttributes || [];
                      if (vAttrs.length > 0) {
                        return Object.entries(attrs).every(([k, val]) =>
                          vAttrs.some((a: any) => (a.attributeNameTrans || a.attributeName || a.name || '').trim() === k && (a.valueTrans || a.value || '').trim() === val)
                        );
                      }
                      // name-based matching
                      return Object.entries(attrs).every(([k, val]) =>
                        (v.name || '').toLowerCase().includes(`${k}: ${val}`.toLowerCase())
                      );
                    }) || null;
                  };

                  return variationTypes.map((vt, idx) => {
                    const selectedVal = addToCartSelectedAttrs[vt.name] || null;
                    const hasImages = vt.options.some(o => o.image);
                    return (
                      <View key={vt.name} style={styles.atcSection}>
                        <Text style={styles.atcSectionTitle}>
                          {vt.name}{selectedVal ? ` : ${selectedVal}` : ''}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={styles.atcSkuRow}>
                            {vt.options.map((opt) => {
                              const isSelected = selectedVal === opt.value;
                              return (
                                <TouchableOpacity
                                  key={opt.value}
                                  style={[styles.atcSkuChip, isSelected && styles.atcSkuChipActive]}
                                  onPress={() => {
                                    const newAttrs = { ...addToCartSelectedAttrs, [vt.name]: opt.value };
                                    setAddToCartSelectedAttrs(newAttrs);
                                    setAddToCartSelectedSku(findMatchingSku(newAttrs));
                                  }}
                                >
                                  {hasImages && opt.image ? (
                                    <Image source={{ uri: opt.image }} style={styles.atcSkuChipImage} />
                                  ) : null}
                                  <Text style={[styles.atcSkuChipText, isSelected && styles.atcSkuChipTextActive]} numberOfLines={2}>
                                    {opt.value}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    );
                  });
                })()}

                {/* Quantity */}
                <View style={styles.atcSection}>
                  <Text style={styles.atcSectionTitle}>Quantity</Text>
                  <View style={styles.atcQtyRow}>
                    <TouchableOpacity style={styles.atcQtyBtn} onPress={() => setAddToCartQuantity(q => Math.max(1, q - 1))}>
                      <Icon name="remove" size={18} color={COLORS.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.atcQtyText}>{addToCartQuantity}</Text>
                    <TouchableOpacity style={styles.atcQtyBtn} onPress={() => setAddToCartQuantity(q => q + 1)}>
                      <Icon name="add" size={18} color={COLORS.text.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Add to cart button */}
            <TouchableOpacity style={styles.atcConfirmButton} onPress={handleConfirmAddToCart}>
              <Text style={styles.atcConfirmButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Refund Modal */}
      <Modal visible={!!refundModalOrder} transparent animationType="slide" onRequestClose={() => setRefundModalOrder(null)}>
        <View style={styles.refundModalOverlay}>
          <View style={styles.refundModalContent}>
            {/* Header */}
            <Text style={styles.refundModalTitle}>{t('profile.refund') || 'Refund'}</Text>

            {refundModalOrder && (
              <>
                {/* Order ID + copy */}
                <View style={styles.refundOrderIdRow}>
                  <Text style={styles.refundOrderIdText}>주문ID: {refundModalOrder.orderNumber}</Text>
                  <TouchableOpacity onPress={() => {
                    const Clipboard = require('@react-native-clipboard/clipboard').default;
                    Clipboard.setString(refundModalOrder.orderNumber);
                    showToast(t('common.copied') || 'Copied', 'success');
                  }}>
                    <Text style={styles.refundCopyText}>복사</Text>
                  </TouchableOpacity>
                </View>

                {/* Order status */}
                <Text style={styles.refundStatusText}>{t(refundModalOrder.statusTranslationKey) || refundModalOrder.progressStatus}</Text>

                {/* Select all */}
                <TouchableOpacity
                  style={styles.refundSelectAllRow}
                  onPress={() => {
                    const allIds = new Set(refundModalOrder.items.map((_, i) => String(i)));
                    if (refundSelectedItems.size === refundModalOrder.items.length) {
                      setRefundSelectedItems(new Set());
                    } else {
                      setRefundSelectedItems(allIds);
                    }
                  }}
                >
                  <View style={[styles.refundCheckbox, refundSelectedItems.size === refundModalOrder.items.length && refundModalOrder.items.length > 0 && styles.refundCheckboxChecked]}>
                    {refundSelectedItems.size === refundModalOrder.items.length && refundModalOrder.items.length > 0 && (
                      <Icon name="checkmark" size={12} color={COLORS.white} />
                    )}
                  </View>
                  <Text style={styles.refundSelectAllText}>{t('pages.orders.filters.selectAll') || '전체 선택'}</Text>
                </TouchableOpacity>

                {/* Store groups with items */}
                <ScrollView style={styles.refundItemsScroll} showsVerticalScrollIndicator={false}>
                  {groupOrderItemsByStore(refundModalOrder.items).map((group, gi) => (
                    <View key={gi} style={styles.refundStoreGroup}>
                      <Text style={styles.refundStoreName}>
                        {resolveStoreName(group.companyName, group.items[0])} {'>'}
                      </Text>
                      {group.items.map((item, ii) => {
                        const itemKey = String(gi * 100 + ii);
                        const isSelected = refundSelectedItems.has(itemKey);
                        return (
                          <TouchableOpacity
                            key={ii}
                            style={styles.refundItemRow}
                            onPress={() => {
                              setRefundSelectedItems(prev => {
                                const next = new Set(prev);
                                next.has(itemKey) ? next.delete(itemKey) : next.add(itemKey);
                                return next;
                              });
                            }}
                          >
                            <View style={[styles.refundCheckbox, isSelected && styles.refundCheckboxChecked]}>
                              {isSelected && <Icon name="checkmark" size={12} color={COLORS.white} />}
                            </View>
                            <Image source={{ uri: item.image }} style={styles.refundItemImage} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.refundItemName} numberOfLines={2}>{item.productName}</Text>
                              <Text style={styles.refundItemPrice}>{formatPriceKRW(item.price)} x{item.quantity}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Buttons */}
            <View style={styles.refundButtons}>
              <TouchableOpacity style={styles.refundCancelButton} onPress={() => setRefundModalOrder(null)}>
                <Text style={styles.refundCancelButtonText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.refundConfirmButton, refundSelectedItems.size === 0 && { opacity: 0.4 }]}
                disabled={refundSelectedItems.size === 0}
                onPress={async () => {
                  if (!refundModalOrder) return;
                  // Build items list from selected indices
                  const allItems: any[] = [];
                  groupOrderItemsByStore(refundModalOrder.items).forEach((group, gi) => {
                    group.items.forEach((item, ii) => {
                      const key = String(gi * 100 + ii);
                      if (refundSelectedItems.has(key)) {
                        allItems.push({ item, key });
                      }
                    });
                  });
                  // Call refund-amount API
                  try {
                    const { orderApi } = await import('../../../../services/orderApi');
                    const refundItems = allItems.map(({ item }) => ({
                      itemId: item.itemId || item.offerId || '',
                      quantity: item.quantity,
                    }));
                    const res = await orderApi.getRefundAmount(refundModalOrder.id, refundItems);
                    setRefundModalOrder(null);
                    navigation.navigate('RefundRequest', {
                      orderId: refundModalOrder.id,
                      orderNumber: refundModalOrder.orderNumber,
                      items: allItems.map(({ item }) => item),
                      refundData: res.success ? res.data : null,
                    });
                  } catch {
                    showToast(t('home.failedToGetRefundAmount'), 'error');
                  }
                }}
              >
                <Text style={styles.refundConfirmButtonText}>{t('common.confirm') || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Order Modal */}
      <Modal visible={!!cancelOrderModal} transparent animationType="fade" onRequestClose={() => setCancelOrderModal(null)}>
        <View style={styles.cancelModalOverlay}>
          <View style={styles.cancelModalContent}>
            {/* Header */}
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>{t('cart.cancelOrder') || 'Cancel order'}</Text>
              <TouchableOpacity onPress={() => setCancelOrderModal(null)}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Warning */}
            <View style={styles.cancelWarningBox}>
              <Icon name="alert-circle-outline" size={18} color={COLORS.red} style={{ marginTop: 2 }} />
              <Text style={styles.cancelWarningText}>
                Once cancelled, this action cannot be undone. Coupons and red envelopes will be returned and can be used within their validity period.
              </Text>
            </View>

            <Text style={styles.cancelReasonLabel}>Please select a reason for cancelling the order.</Text>

            {/* Reasons */}
            {[t('buyList.changedMyMind'), t('buyList.incorrectInfo'), t('buyList.outOfStock'), t('buyList.other')].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.cancelReasonRow}
                onPress={() => setCancelReason(reason)}
              >
                <View style={[styles.cancelRadio, cancelReason === reason && styles.cancelRadioSelected]}>
                  {cancelReason === reason && <Icon name="checkmark" size={12} color={COLORS.white} />}
                </View>
                <Text style={styles.cancelReasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}

            {/* Other input */}
            {cancelReason === 'Other' && (
              <TextInput
                style={styles.cancelOtherInput}
                placeholder="Please describe your reason..."
                placeholderTextColor={COLORS.text.secondary}
                value={cancelOtherText}
                onChangeText={setCancelOtherText}
                multiline
                numberOfLines={3}
              />
            )}

            {/* Buttons */}
            <View style={styles.cancelModalButtons}>
              <TouchableOpacity style={styles.cancelModalCancelBtn} onPress={() => setCancelOrderModal(null)}>
                <Text style={styles.cancelModalCancelText}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelModalConfirmBtn, (cancelReason === 'Other' && !cancelOtherText.trim()) && { opacity: 0.4 }]}
                disabled={cancelReason === 'Other' && !cancelOtherText.trim()}
                onPress={() => {
                  if (cancelOrderModal) {
                    cancelOrder(cancelOrderModal.orderId);
                    setCancelOrderModal(null);
                  }
                }}
              >
                <Text style={styles.cancelModalConfirmText}>{t('common.confirm') || 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Navigation Modal */}
      <Modal visible={showNavModal} transparent animationType="fade" onRequestClose={() => setShowNavModal(false)}>
        <TouchableOpacity style={styles.navModalOverlay} activeOpacity={1} onPress={() => setShowNavModal(false)}>
          <View style={styles.navModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.navModalGrid}>
              {[
                { icon: (
                  <View>
                    <MessageIcon width={28} height={28} color={COLORS.text.primary} />
                    {totalMessageUnread > 0 && (
                      <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: COLORS.red || '#FF0000', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{totalMessageUnread > 99 ? '99+' : totalMessageUnread}</Text>
                      </View>
                    )}
                  </View>
                ), label: 'Message', onPress: () => navigation.navigate('Main', { screen: 'Message' }) },
                { icon: <HomeIcon width={28} color={COLORS.text.primary} />, label: 'Main', onPress: () => navigation.navigate('Main', { screen: 'Home' }) },
                { icon: <AccountIcon width={28} color={COLORS.text.primary} />, label: 'My Account', onPress: () => navigation.navigate('ProfileSettings') },
                { icon: <CartIcon width={28} color={COLORS.text.primary} />, label: 'Cart', onPress: () => navigation.navigate('Main', { screen: 'Cart' }) },
                { icon: <ReceiptIcon width={28} color={COLORS.text.primary} />, label: 'My Orders', onPress: () => setShowNavModal(false) },
                { icon: <ViewedIcon width={28} height={28} color={COLORS.text.primary} />, label: 'Viewed Products', onPress: () => navigation.navigate('ViewedProducts') },
                { icon: <HeartIcon width={28} height={28} color={COLORS.text.primary} />, label: 'WishList', onPress: () => navigation.navigate('Wishlist') },
                { icon: <OfficialSupportIcon width={28} height={28} color={COLORS.text.primary} />, label: 'Official Support', onPress: () => navigation.navigate('CustomerService') },
                { icon: <FeedbackIcon width={28} height={28} color={COLORS.text.primary} />, label: 'Feedback', onPress: () => navigation.navigate('Note') },
                { icon: <CustomerSupportIcon width={28} height={28} color={COLORS.text.primary} />, label: 'After-sales', onPress: () => navigation.navigate('CustomerService') },
              ].map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.navModalGridItem}
                  onPress={() => { setShowNavModal(false); item.onPress(); }}
                >
                  <View style={styles.navModalIconBox}>{item.icon}</View>
                  <Text style={styles.navModalItemText} numberOfLines={2}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.navModalCancelBtn}
              onPress={() => setShowNavModal(false)}
            >
              <Text style={styles.navModalCancelText}>{t('common.cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* All Filters Modal */}
      <Modal visible={showAllFiltersModal} transparent animationType="slide" onRequestClose={() => setShowAllFiltersModal(false)}>
        <View style={styles.allFiltersOverlay}>
          <View style={styles.allFiltersContent}>
            <View style={styles.allFiltersHeader}>
              <Text style={styles.allFiltersTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowAllFiltersModal(false)}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Platform */}
              <View style={styles.allFiltersSection}>
                <Text style={styles.allFiltersSectionTitle}>Platform</Text>
                <View style={styles.allFiltersChipRow}>
                  {['All', '1688', 'Taobao'].map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.allFiltersChip, draftPlatform === (p === 'All' ? '' : p.toLowerCase()) && styles.allFiltersChipActive]}
                      onPress={() => setDraftPlatform(p === 'All' ? '' : p.toLowerCase())}
                    >
                      <Text style={[styles.allFiltersChipText, draftPlatform === (p === 'All' ? '' : p.toLowerCase()) && styles.allFiltersChipTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Customs */}
              <View style={styles.allFiltersSection}>
                <Text style={styles.allFiltersSectionTitle}>{t('pages.orders.filters.customsMethod') || '통관방식'}</Text>
                <View style={styles.allFiltersChipRow}>
                  {[
                    { label: t('profile.viewAll') || 'All', value: '' },
                    { label: t('pages.orders.filters.generalClearance') || '일반통관', value: '일반통관' },
                    { label: t('pages.orders.filters.simplifiedClearance') || '간이통관', value: '간이통관' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value || 'all'}
                      style={[styles.allFiltersChip, draftCustoms === (opt.value || null) && styles.allFiltersChipActive]}
                      onPress={() => setDraftCustoms(opt.value || null)}
                    >
                      <Text style={[styles.allFiltersChipText, draftCustoms === (opt.value || null) && styles.allFiltersChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Transport */}
              <View style={styles.allFiltersSection}>
                <Text style={styles.allFiltersSectionTitle}>{t('pages.orders.filters.transportMethod') || '운송방식'}</Text>
                <View style={styles.allFiltersChipRow}>
                  {[
                    { label: t('profile.viewAll') || 'All', value: '' },
                    { label: t('pages.orders.filters.air') || '항공', value: '항공' },
                    { label: t('pages.orders.filters.ship') || '선박', value: '선박' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value || 'all'}
                      style={[styles.allFiltersChip, draftTransport === (opt.value || null) && styles.allFiltersChipActive]}
                      onPress={() => setDraftTransport(opt.value || null)}
                    >
                      <Text style={[styles.allFiltersChipText, draftTransport === (opt.value || null) && styles.allFiltersChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Period */}
              <View style={styles.allFiltersSection}>
                <Text style={styles.allFiltersSectionTitle}>{t('pages.orders.filters.periodSelect') || '기간선택'}</Text>
                <TouchableOpacity
                  style={[styles.allFiltersChip, (draftStartDate || draftEndDate) && styles.allFiltersChipActive]}
                  onPress={() => setShowInlineCalendar(prev => !prev)}
                >
                  <Icon name="calendar-outline" size={14} color={(draftStartDate || draftEndDate) ? COLORS.red : COLORS.text.primary} />
                  <Text style={[styles.allFiltersChipText, (draftStartDate || draftEndDate) && styles.allFiltersChipTextActive]}>
                    {draftStartDate
                      ? `${draftStartDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}${draftEndDate ? ` ~ ${draftEndDate.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}` : ''}`
                      : (t('pages.orders.filters.periodSelect') || '기간선택')}
                  </Text>
                  <Icon name={showInlineCalendar ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.text.secondary} />
                </TouchableOpacity>

                {/* Inline calendar */}
                {showInlineCalendar && (
                  <View style={styles.inlineCalendar}>
                    {/* Month nav */}
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity onPress={() => { const d = new Date(inlineCalendarDate); d.setMonth(d.getMonth() - 1); setInlineCalendarDate(d); }}>
                        <Icon name="chevron-back" size={18} color={COLORS.text.primary} />
                      </TouchableOpacity>
                      <Text style={styles.calendarHeaderText}>{inlineCalendarDate.getFullYear()}년 {inlineCalendarDate.getMonth() + 1}월</Text>
                      <TouchableOpacity onPress={() => { const d = new Date(inlineCalendarDate); d.setMonth(d.getMonth() + 1); setInlineCalendarDate(d); }}>
                        <Icon name="chevron-forward" size={18} color={COLORS.text.primary} />
                      </TouchableOpacity>
                    </View>
                    {/* Day headers */}
                    <View style={styles.calendarWeekRow}>
                      {['일','월','화','수','목','금','토'].map(d => (
                        <Text key={d} style={styles.calendarDayHeader}>{d}</Text>
                      ))}
                    </View>
                    {/* Days grid */}
                    {(() => {
                      const year = inlineCalendarDate.getFullYear();
                      const month = inlineCalendarDate.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const cells: (number | null)[] = Array(firstDay).fill(null);
                      for (let i = 1; i <= daysInMonth; i++) cells.push(i);
                      while (cells.length % 7 !== 0) cells.push(null);
                      const weeks: (number | null)[][] = [];
                      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
                      return weeks.map((week, wi) => (
                        <View key={wi} style={styles.calendarWeekRow}>
                          {week.map((day, di) => {
                            if (!day) return <View key={di} style={styles.calendarDayCell} />;
                            const date = new Date(year, month, day);
                            const isStart = draftStartDate && date.toDateString() === draftStartDate.toDateString();
                            const isEnd = draftEndDate && date.toDateString() === draftEndDate.toDateString();
                            const inRange = draftStartDate && draftEndDate && date > draftStartDate && date < draftEndDate;
                            return (
                              <TouchableOpacity
                                key={di}
                                style={[styles.calendarDayCell, (isStart || isEnd) && styles.calendarDayCellSelected, inRange && styles.calendarDayCellInRange]}
                                onPress={() => {
                                  if (!draftStartDate || (draftStartDate && draftEndDate)) {
                                    setDraftStartDate(date);
                                    setDraftEndDate(null);
                                    setInlinePickingEnd(true);
                                  } else {
                                    const start = date < draftStartDate ? date : draftStartDate;
                                    const end = date < draftStartDate ? draftStartDate : date;
                                    setDraftStartDate(start);
                                    setDraftEndDate(end);
                                    setInlinePickingEnd(false);
                                    setShowInlineCalendar(false);
                                  }
                                }}
                              >
                                <Text style={[styles.calendarDayText, (isStart || isEnd) && styles.calendarDayTextSelected]}>{day}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ));
                    })()}
                    <Text style={styles.calendarHint}>
                      {!draftStartDate ? '시작일을 선택하세요' : !draftEndDate ? '종료일을 선택하세요' : ''}
                    </Text>
                    {(draftStartDate || draftEndDate) && (
                      <TouchableOpacity onPress={() => { setDraftStartDate(null); setDraftEndDate(null); setShowInlineCalendar(false); }}>
                        <Text style={{ color: COLORS.red, fontSize: FONTS.sizes.xs, textAlign: 'center', marginTop: 4 }}>초기화</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Apply / Reset */}
            <View style={styles.allFiltersButtons}>
              <TouchableOpacity
                style={styles.allFiltersResetBtn}
                onPress={() => {
                  setDraftPlatform('');
                  setDraftCustoms(null);
                  setDraftTransport(null);
                  setDraftStartDate(null);
                  setDraftEndDate(null);
                }}
              >
                <Text style={styles.allFiltersResetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.allFiltersApplyBtn}
                onPress={() => {
                  // Commit drafts to real filter states (triggers re-fetch via useCallback deps)
                  setFilterPlatform(draftPlatform);
                  setSelectedCustomsMethod(draftCustoms);
                  setSelectedTransportMethod(draftTransport);
                  setSelectedStartDate(draftStartDate);
                  setSelectedEndDate(draftEndDate);
                  setShowAllFiltersModal(false);
                }}
              >
                <Text style={styles.allFiltersApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selection bottom bar */}
      {selectedOrderIds.size > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionBarText}>
            {selectedOrderIds.size}개 선택됨
          </Text>
          {/* <TouchableOpacity
            style={styles.selectionBarDelete}
            onPress={() => {
              Alert.alert(
                t('common.delete') || 'Delete',
                `${selectedOrderIds.size}개 주문을 삭제하시겠습니까?`,
                [
                  { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                  { text: t('common.confirm') || 'Confirm', onPress: () => setSelectedOrderIds(new Set()) },
                ]
              );
            }}
          >
            <Text style={styles.selectionBarDeleteText}>{t('common.delete') || 'Delete'}</Text>
          </TouchableOpacity> */}
        </View>
      )}

      {/* Edit Address Modal */}
      <Modal visible={addressModalVisible} transparent animationType="slide" onRequestClose={() => setAddressModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.addressModalContent}>
            <View style={styles.addressModalHeader}>
              <Text style={styles.addressModalTitle}>Edit address</Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.addressModalLabel}>Currently delivering to:</Text>
              <View style={styles.addressModalRow}>
                <View style={styles.addressModalDropdown}>
                  <Text style={styles.addressModalDropdownText}>한국</Text>
                  <Icon name="chevron-down" size={20} color={COLORS.gray[600]} />
                </View>
                {/* <TouchableOpacity style={styles.defaultCheckboxRow} onPress={() => setIsDefaultAddress(!isDefaultAddress)}>
                  <Text style={styles.defaultText}>Default</Text>
                  <View style={[styles.checkboxSquare, isDefaultAddress && styles.checkboxSquareChecked]}>
                    {isDefaultAddress && <Icon name="checkmark" size={16} color={COLORS.white} />}
                  </View>
                </TouchableOpacity> */}
              </View>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Address information:</Text>
              <TouchableOpacity style={styles.addressSearchBtn} onPress={() => setShowKakaoAddress(true)}>
                <Icon name="search" size={16} color={COLORS.white} />
                <Text style={styles.addressSearchBtnText}>Search Address (Kakao)</Text>
              </TouchableOpacity>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Postal code:</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder="e.g. 06000"
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.zonecode}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, zonecode: v }))}
                keyboardType="number-pad"
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Detail address:</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder="Search address above or enter manually"
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.detailAddress}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, detailAddress: v }))}
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Recipient name:</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder="Up to 25 characters"
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.recipient}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, recipient: v }))}
                maxLength={25}
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Mobile number:</Text>
              <View style={styles.addressModalPhoneRow}>
                <View style={styles.addressModalPhoneCode}>
                  <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.text.primary }}>한국 +82</Text>
                  <Icon name="chevron-down" size={20} color={COLORS.gray[600]} />
                </View>
                <TextInput
                  style={[styles.addressModalInput, { flex: 1 }]}
                  value={editAddress.contact}
                  onChangeText={(v) => setEditAddress(prev => ({ ...prev, contact: v }))}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>Customs clearance code:</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder="Please enter the customs clearance code"
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.customsCode}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, customsCode: v }))}
              />

              <TouchableOpacity
                style={styles.addressModalSaveButton}
                disabled={isSavingAddress}
                onPress={async () => {
                  if (!selectedOrderForAddress) return;
                  setIsSavingAddress(true);
                  try {
                    const res = await orderApi.updateShippingAddress(selectedOrderForAddress.id, {
                      recipient: editAddress.recipient,
                      contact: editAddress.contact,
                      detailedAddress: editAddress.detailAddress || editAddress.roadAddress,
                      zipCode: editAddress.zonecode,
                      personalCustomsCode: editAddress.customsCode,
                      country: 'South Korea',
                    });
                    if (res.success) {
                      showToast(t('profile.addressModal.updateSuccess'), 'success');
                      // Update the order in the list with new address
                      setOrders(prevOrders => 
                        prevOrders.map(o => 
                          o.id === selectedOrderForAddress.id 
                            ? {
                                ...o,
                                shippingAddress: {
                                  ...o.shippingAddress,
                                  recipient: editAddress.recipient,
                                  contact: editAddress.contact,
                                  detailedAddress: editAddress.detailAddress || editAddress.roadAddress,
                                  zipCode: editAddress.zonecode,
                                  personalCustomsCode: editAddress.customsCode,
                                } as any
                              }
                            : o
                        )
                      );
                      setAddressModalVisible(false);
                    } else {
                      showToast(res.error || t('buyList.failedToUpdateAddress'), 'error');
                    }
                  } catch (error: any) {
                    console.error('Address update error:', error);
                    showToast(error?.message || t('buyList.failedToUpdateAddress'), 'error');
                  } finally {
                    setIsSavingAddress(false);
                  }
                }}
              >
                {isSavingAddress ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.addressModalSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Kakao Address Search WebView */}
      <Modal visible={showKakaoAddress} transparent animationType="slide" onRequestClose={() => setShowKakaoAddress(false)}>
        <View style={styles.kakaoModalOverlay}>
          <View style={styles.kakaoModalContent}>
            <View style={styles.kakaoModalHeader}>
              <Text style={styles.kakaoModalTitle}>Search Address</Text>
              <TouchableOpacity onPress={() => setShowKakaoAddress(false)}>
                <Icon name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <WebView
              source={{ html: kakaoPostcodeHtml, baseUrl: 'https://postcode.map.daum.net' }}
              style={{ flex: 1 }}
              onMessage={(e) => {
                try {
                  const data = JSON.parse(e.nativeEvent.data);
                  setEditAddress(prev => ({
                    ...prev,
                    zonecode: data.zonecode || '',
                    roadAddress: data.roadAddress || '',
                    detailAddress: data.roadAddress || '',
                  }));
                  setShowKakaoAddress(false);
                } catch {}
              }}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              originWhitelist={['*']}
              allowsInlineMediaPlayback
            />
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm * 2,
    paddingTop: SPACING.lg * 2,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  orderSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0000000D',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    // height: 40,
  },
  orderSearchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,

  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  dateModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  calendarHeaderText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
    paddingVertical: SPACING.xs,
  },
  calendarDayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  calendarDayCellSelected: {
    backgroundColor: COLORS.red,
  },
  calendarDayCellInRange: {
    backgroundColor: COLORS.lightRed,
    borderRadius: 0,
  },
  calendarDayText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  calendarDayTextSelected: {
    color: COLORS.white,
    fontWeight: '700',
  },
  calendarHint: {
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
  },
  calendarClearButton: {
    marginTop: SPACING.sm,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  calendarClearText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: SPACING.xl,
  },
  tabScrollView: {
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  tabScrollContent: {
    paddingHorizontal: SPACING.md,
  },
  categoryStatusFilterContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryStatusGroupsRow: {
    gap: SPACING.sm,
  },
  categoryStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryStatusChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryStatusChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  categoryStatusChipTextActive: {
    color: COLORS.white,
  },
  categoryStatusChipArrow: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  categoryStatusDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.xs,
  },
  categoryStatusOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  categoryStatusOptionActive: {
    backgroundColor: COLORS.primary + '12',
  },
  categoryStatusOptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  categoryStatusOptionTextActive: {
    color: COLORS.primary,
  },
  categoryStatusOptionCode: {
    marginTop: 2,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  // New filter row styles
  tabBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  tabBarContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  tabBarItem: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBarItemActive: {
    borderBottomColor: COLORS.red,
  },
  tabBarText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '400',
  },
  tabBarTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  filterRow1: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  filterRow1Content: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  filterRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.lightRed,
  },
  filterChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  filterChipTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  filterChipCountBadge: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
    fontWeight: '400',
  },
  filterChipCountBadgeActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  selectAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  selectAllCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.gray[400],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllCircleActive: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  selectAllText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  groupDropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  groupDropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[100],
  },
  groupDropdownItemActive: {
    backgroundColor: COLORS.lightRed,
  },
  groupDropdownText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  groupDropdownTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  groupDropdownCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  // 발주관리 드롭다운 backdrop — dim 없이 투명. 바깥 탭으로만 닫힘.
  purchaseDropdownBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // 발주관리 드롭다운 — 칩 아래에 떠 있는 카드.
  // top/left 는 발주관리 칩의 measureInWindow 결과로 인라인 오버라이드된다.
  // 측정 전 잠깐 깜박임을 막기 위해 기본값을 화면 밖으로 둔다.
  // 너비는 이전 220px 의 절반인 110px.
  purchaseDropdownAnchor: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 110,
  },
  // 현지입/출고 드롭다운 — 칩 아래에 떠 있고 너비는 칩과 일치.
  // top·left·width 모두 measureInWindow 결과로 인라인 오버라이드된다.
  warehouseDropdownAnchor: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 110,
  },
  purchaseDropdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    paddingVertical: SPACING.xs,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  purchaseDropdownTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  purchaseDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
  },
  purchaseDropdownBullet: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: 'transparent',
    marginRight: SPACING.sm,
  },
  purchaseDropdownBulletActive: {
    backgroundColor: COLORS.red,
  },
  purchaseDropdownText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  purchaseDropdownTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  dropdownModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    width: '100%',
    overflow: 'hidden',
    maxHeight: 400,
  },
  dropdownModalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  tabContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  tab: {
    // paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.red,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    color: COLORS.text.primary,
  },
  tabTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  ordersContainer: {
    backgroundColor: COLORS.white,
    // borderRadius: 12,
    padding: SPACING.md,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusSection: {
    marginBottom: SPACING.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  statusTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  orderCard: {
    // marginBottom: SPACING.md,
  },
  storeHeader: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  storeName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  productItem: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  productSpecs: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  productDescription: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  productPriceCol: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 60,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  currentPrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  originalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textDecorationLine: 'line-through',
  },
  quantity: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: FONTS.sizes.xs,
    color: '#856404',
    fontWeight: '500',
  },
  shippingInfo: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray[50],
  },
  shippingTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  shippingDetails: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  transitInfo: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray[50],
  },
  transitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transitTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  transitDetails: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  orderTotal: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'flex-end',
  },
  totalText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    // borderTopWidth: 1,
    // borderTopColor: COLORS.border,
  },
  secondaryButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  primaryButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  cancelOrderButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelOrderButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    fontWeight: '600',
  },
  additionalActions: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  additionalActionButton: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  additionalActionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    fontWeight: '500',
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
  // New styles for store grouping
  orderContainer: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  orderStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  orderStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  orderCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.gray[400],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCheckboxChecked: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  orderStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.red,
  },
  orderStatusText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.red,
  },
  orderHelpButton: {
    padding: SPACING.xs,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  orderIdText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  orderCopyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '600',
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  orderTotalLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  orderTotalValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  orderNumber: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  orderDate: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  storeTotal: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  storeTotalText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  orderActionButtons: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  orderActionButtonsContent: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  orderAdditionalActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    gap: SPACING.md,
    justifyContent: 'center',
  },
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    ...SHADOWS.md,
  },
  selectionBarText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  selectionBarDelete: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: BORDER_RADIUS.md,
  },
  selectionBarDeleteText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  moreMenuRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    gap: SPACING.xl,
    flexDirection: 'row',
    zIndex: 100,
    elevation: 4,
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  moreMenuItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  allFiltersOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  allFiltersContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    maxHeight: '80%',
  },
  allFiltersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  allFiltersTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  allFiltersSection: {
    marginBottom: SPACING.md,
  },
  allFiltersSectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  allFiltersChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  allFiltersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
  },
  allFiltersChipActive: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.lightRed,
  },
  allFiltersChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  allFiltersChipTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  allFiltersButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  allFiltersResetBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  allFiltersResetText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  allFiltersApplyBtn: {
    flex: 2,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.red,
    alignItems: 'center',
  },
  allFiltersApplyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '700',
  },
  inlineCalendar: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  navModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  navModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  navModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  navModalGridItem: {
    width: '20%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  navModalIconBox: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  navModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[100],
  },
  navModalItemText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '400',
    textAlign: 'center',
  },
  navModalCancelBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    alignItems: 'center',
  },
  navModalCancelText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  cancelModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    width: '100%',
  },
  cancelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cancelModalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  cancelWarningBox: {
    flexDirection: 'row',
    gap: SPACING.xs,
    backgroundColor: '#FFF3EE',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cancelWarningText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  cancelReasonLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  cancelReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  cancelRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.gray[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelRadioSelected: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  cancelReasonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  cancelOtherInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    minHeight: 72,
    textAlignVertical: 'top',
    marginTop: SPACING.xs,
  },
  cancelModalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    paddingTop: SPACING.md,
  },
  cancelModalCancelBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  cancelModalCancelText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  cancelModalConfirmBtn: {
    flex: 2,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.red,
    alignItems: 'center',
  },
  cancelModalConfirmText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '700',
  },
  refundModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  refundModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    maxHeight: '85%',
  },
  refundModalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  refundOrderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    marginBottom: SPACING.xs,
  },
  refundOrderIdText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  refundCopyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '600',
  },
  refundStatusText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  refundSelectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    marginBottom: SPACING.sm,
  },
  refundSelectAllText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  refundCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.gray[400],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refundCheckboxChecked: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  refundItemsScroll: {
    maxHeight: 300,
    marginBottom: SPACING.md,
  },
  refundStoreGroup: {
    marginBottom: SPACING.sm,
  },
  refundStoreName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    marginBottom: SPACING.xs,
  },
  refundItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[100],
  },
  refundItemImage: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
  },
  refundItemName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  refundItemPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  refundButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  refundCancelButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  refundCancelButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  refundConfirmButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.red,
    alignItems: 'center',
  },
  refundConfirmButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '700',
  },
  atcModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  atcModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    maxHeight: '80%',
  },
  atcModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  atcModalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  atcLoadingContainer: {
    paddingVertical: SPACING.xl * 2,
    alignItems: 'center',
  },
  atcProductRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  atcProductImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
  },
  atcProductName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  atcProductPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.red,
  },
  atcSection: {
    marginBottom: SPACING.md,
  },
  atcSectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  atcSkuRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  atcSkuChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  atcSkuChipActive: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.lightRed,
  },
  atcSkuChipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  atcSkuChipTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  atcSkuChipImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 4,
  },
  atcQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  atcQtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  atcQtyText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  atcConfirmButton: {
    backgroundColor: COLORS.red,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  atcConfirmButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Address modal styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  addressModalContent: { 
    backgroundColor: COLORS.white, 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: SPACING.md, 
    maxHeight: '90%' 
  },
  addressModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: SPACING.md 
  },
  addressModalTitle: { 
    fontSize: FONTS.sizes.lg, 
    fontWeight: '700', 
    color: COLORS.text.primary 
  },
  addressModalLabel: { 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.text.secondary, 
    marginBottom: SPACING.xs, 
    marginTop: SPACING.sm 
  },
  addressModalRequired: { 
    color: COLORS.red 
  },
  addressModalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: SPACING.sm 
  },
  addressModalDropdown: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: COLORS.gray[300], 
    borderRadius: BORDER_RADIUS.md, 
    paddingHorizontal: SPACING.sm, 
    paddingVertical: SPACING.sm, 
    gap: SPACING.xs, 
    flex: 1 
  },
  addressModalDropdownText: { 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.text.primary, 
    flex: 1 
  },
  defaultCheckboxRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.xs, 
    marginLeft: SPACING.sm 
  },
  defaultText: { 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.text.primary 
  },
  checkboxSquare: { 
    width: 20, 
    height: 20, 
    borderRadius: 4, 
    borderWidth: 1.5, 
    borderColor: COLORS.gray[400], 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  checkboxSquareChecked: { 
    borderColor: COLORS.red, 
    backgroundColor: COLORS.red 
  },
  addressModalInput: { 
    borderWidth: 1, 
    borderColor: COLORS.gray[300], 
    borderRadius: BORDER_RADIUS.md, 
    paddingHorizontal: SPACING.sm, 
    paddingVertical: SPACING.sm, 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  addressModalPhoneRow: { 
    flexDirection: 'row', 
    gap: SPACING.sm 
  },
  addressModalPhoneCode: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: COLORS.gray[300], 
    borderRadius: BORDER_RADIUS.md, 
    paddingHorizontal: SPACING.sm, 
    paddingVertical: SPACING.sm, 
    gap: SPACING.xs, 
    minWidth: 110 
  },
  addressModalSaveButton: { 
    backgroundColor: COLORS.red, 
    borderRadius: BORDER_RADIUS.md, 
    paddingVertical: SPACING.md, 
    alignItems: 'center', 
    marginTop: SPACING.md, 
    marginBottom: SPACING.xl 
  },
  addressModalSaveButtonText: { 
    fontSize: FONTS.sizes.md, 
    fontWeight: '700', 
    color: COLORS.white 
  },
  addressSearchBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.xs,
    backgroundColor: COLORS.red, 
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start', 
    marginBottom: SPACING.sm,
  },
  addressSearchBtnText: { 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.white, 
    fontWeight: '600' 
  },
  kakaoModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  kakaoModalContent: { 
    backgroundColor: COLORS.white, 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    height: '80%' 
  },
  kakaoModalHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: SPACING.md, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.gray[200],
  },
  kakaoModalTitle: { 
    fontSize: FONTS.sizes.md, 
    fontWeight: '700', 
    color: COLORS.text.primary 
  },
  inquiryUnreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.red,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  inquiryUnreadBadgeText: {
    fontSize: FONTS.sizes['2xs'],
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default BuyListScreen;

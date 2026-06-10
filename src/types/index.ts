import { StyleProp, ViewStyle } from "react-native";
import type { NavigatorScreenParams } from "@react-navigation/native";

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  memberId?: string;
  avatar?: string;
  phone?: string;
  birthday?: string;
  gender?: string; // User gender from API
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  wishlist: string[];
  preferences?: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    language: string;
    currency: string;
  };
  followersCount?: number; // Add followers count
  followingsCount?: number; // Add followings count
  createdAt: Date;
  updatedAt: Date;
  // Additional fields from API response
  depositBalance?: number; // User's deposit balance
  points?: number; // User's loyalty points
  level?: string; // User's level/tier
  referredCount?: number; // Number of users referred by this user
  userUniqueId?: string; // Unique user identifier from backend (legacy)
  userUniqueNo?: string; // Unique user number from backend
  userName?: string; // User's display name
  notes?: string; // User notes/remarks
  searchKeywords?: string[]; // Recent search keywords saved by user
  googleId?: string; // Google authentication ID
  isBusiness?: boolean; // Whether user is a business account
  isEmailVerified?: boolean; // Email verification status
  authProvider?: string; // Authentication provider (local, google, etc.)
  referralCode?: string; // User's referral code
  lastLogin?: string; // Last login timestamp
  referredBy?: string; // Who referred this user
}

export interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface CustomSwitchProps {
  value: boolean;
  onChange: (newValue: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  style?: StyleProp<ViewStyle>;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

// Product Types
export interface Product {
  externalId: string;
  offerId: string;
  rating_count: number;
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  discountPercentage?: number;
  image: string;
  videos?: string[];
  category: Category;
  subcategory: string;
  brand: string;
  seller: Seller;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount: number;
  sizes?: string[];
  colors?: Color[];
  tags: string[];
  isNew: boolean;
  isFeatured: boolean;
  isOnSale: boolean;
  createdAt: Date;
  updatedAt: Date;
  orderCount?: number;
  wishlists_count?: number; // Add wishlists_count field
  variations?: VariationData;
  avgRating?: number;
  repurchaseRate?: string | number; // Repurchase rate from API (e.g., "42%" or 42)
}

export interface Color {
  name: string;
  hex: string;
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  image: string;
  description?: string;
  productCount?: number;
  subcategories: string[];
}

export interface Banner {
  _id: string;
  title: {
    en?: string;
    zh?: string;
    ko?: string;
    [key: string]: string | undefined;
  };
  imageLink: string;
  category?: string;
  exposureLocation?: string;
  exposureOrder?: number;
  startDate?: string;
  endDate?: string;
  views?: number;
  clicks?: number;
  situation?: string;
  isActive?: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface Carousel {
  _id: string;
  no: number;
  title: string;
  link: string;
  isActive: boolean;
  desktopImage: string;
  mobileImage: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  followersCount: number;
  description: string;
  banner?: string;
  location: string;
  joinedDate: Date;
  orderCount?: number;
}

// Cart & Order Types
export interface CartItem {
  userId: string;
  id: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: Color;
  price: number;
  // Additional fields from new API
  variant?: Array<{ name: string; value: string; _id?: string }>;
  skuAttributes?: Array<any>;
  specId?: string;
  offerId?: string;
  image?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  promoCode?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  status: OrderStatus;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  promoCode?: string;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'sent'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// Review Types
export interface Review {
  id: string;
  userId: string;
  productId: string;
  userName?: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  isVerified: boolean;
  helpful: number;
  createdAt: Date;
  updatedAt: Date;
}

// Story Types
export interface Story {
  id: string;
  userId: string;
  sellerId?: string;
  user: User;
  type: 'image' | 'video';
  media: string;
  product?: Product;
  duration: number;
  isViewed: boolean;
  createdAt: Date;
  expiresAt: Date;
  
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'offer' | 'activity' | 'promotion' | 'stock' | 'review' | 'sale' | 'cart' | 'arrival';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

// Search & Filter Types
export interface SearchFilters {
  category?: string;
  categories?: string[];
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  brand?: string;
  color?: string;
  size?: string;
  sellerId?: string;
  sortBy?: 'price' | 'rating' | 'popularity' | 'newest' | 'relevance' | 'price_low' | 'price_high';
  sortOrder?: 'asc' | 'desc';
  inStock?: boolean;
  onSale?: boolean;
}

export type PerformanceDataParams = {
  buyers: number;
  orderCount: number;
  sales: number;
  salesPerOrder: number;
  salesPerBuyer: number;
  orderConversionRate: number;
};

export type CartScreenParams = {
  fromBuyNow?: boolean;
  /** Open order create/confirm modal once cart is ready (product detail Order flow) */
  openOrderModal?: boolean;
  cartResponse?: { cart?: { items?: unknown[] } };
  selectCartItemId?: string;
  offerId?: string;
};

export type MainTabParamList = {
  Home: undefined;
  // Category 탭은 사용자 요청으로 보텀바에서 제거됨. 대신 상품리스트(ProductList)
  // 탭이 같은 자리를 차지한다. Category 라우트 자체는 RootStack 에 여전히
  // 등록돼 있어 다른 화면에서 navigation.navigate('Category') 호출은 계속 동작한다.
  ProductList: undefined;
  Message:
    | {
        /** Optional deep-link target — 'order' is the default (first tab). */
        initialTab?: 'order' | 'general' | 'fileDownload';
        orderId?: string;
        orderNumber?: string;
      }
    | undefined;
  Cart: CartScreenParams | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  OtpVerification: undefined;
  ProductDetail: {
    productId: string;
    source?: string;
    country?: string;
    productData?: any;
    /**
     * Pre-known thumbnail URL from the previous screen (search card,
     * recommendation grid, cart row, …). Used to paint the gallery's first
     * slot instantly before the product detail API responds.
     */
    thumbnailUrl?: string;
  };
  SellerProfile: { sellerId: string; sellerName?: string; source?: string; country?: string };
  LiveSellerSearch: { query?: string } | undefined;
  LiveSellerDetail: { sellerId: string; sellerName?: string; source?: string };
  OrderConfirmation: { orderId: string };
  Search: { query?: string; filters?: SearchFilters };
  Category: {
    categoryId?: string;
    filters?: SearchFilters;
    /** CategoryTab company tab: '1688' | 'Taobao' (from product detail platform link) */
    initialCompany?: '1688' | 'Taobao' | 'All';
  } | undefined;
  EditProfile: undefined;
  AddressBook: { fromShippingSettings?: boolean };
  SelectAddress: { selectedAddressId?: string; onSelect?: (address: Address) => void };
  AddNewAddress: { fromShippingSettings?: boolean };
  EditAddress: { address: Address; fromShippingSettings?: boolean };
  EditFinanceAddress: { address: Address };
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
  OrderHistory: undefined;
  Wishlist: undefined;
  Cart: undefined;
  FollowedStore: undefined;
  Payment: undefined;
  OrderPayment: {
    orderId: string;
  };
  /**
   * BillGate 신용카드 결제 WebView — OrderPaymentScreen 에서 신용카드 결제
   * 제출 시 `POST /v1/payments/billgate/prepare` 응답을 그대로 넘긴다.
   */
  BillgateWebView: {
    orderId: string;
    paymentData: Record<string, string>;
    /** @deprecated certify.jsp form POST 방식으로 전환 후 사용하지 않음. */
    billgateScriptUrl?: string;
  };
  Settings: undefined;
  ProfileSettings: undefined;
  LanguageSettings: undefined;
  ImageSearch: { imageUri: string; imageBase64?: string };
  ImageSearchCamera: undefined;
  Store: { storeId: string };
  // Seller screens
  MyStore: undefined;
  MyStoreSettings: undefined;
  StoreInformation: undefined;
  StorePerformance: undefined;
  ShippingSettings: undefined;
  ShippingService: undefined;
  AddShippingService: { mode?: 'add' | 'edit'; shippingService?: ShippingService };
  MyProducts: undefined;
  AddProduct: { 
    product?: Product; 
    variations?: VariationData; 
    selectedCategory?: string;
    selectedCategoryId?: string; // Add category ID
    service_name?: string;
    weight?: string;
    height?: string;
    width?: string;
    length?: string;
  } | undefined;
  Finance: undefined;
  BalanceSettings: undefined;
  BankAccount: undefined;
  Withdraw: undefined;
  WithdrawConfirm: { amount: string };
  WithdrawSuccess: undefined;
  SellerCategory: undefined;
  EditProduct: { product: Product };
  Categories: { categoryId: string };
  // Order screens
  MyOrders: undefined;
  DetailOrder: { orderData: CustomerOrderDetails };
  LeaveFeedback: { orderId: number; product: any };
  // Settings screens
  Notifications: undefined;
  NotificationsSettings: undefined;
  SellerNotificationsSettings: undefined;
  PrivacyPolicy: undefined;
  AboutUs: undefined;
  ChangePassword: undefined;
  AffiliateMarketing: undefined;
  UnitSettings: undefined;
  PaymentPassword: undefined;
  Deposit: undefined;
  Charge: undefined;
  PointDetail: undefined;
  Coupon: { initialSection?: 'coupon' | 'point' } | undefined;
  BuyList: {
    initialTab?: 'category' | 'unpaid' | 'to_be_shipped' | 'shipped' | 'processed' | 'error' | 'shipping_delay' | 'refunds' | 'purchase_agency' | 'warehouse' | 'international_shipping' | 'all';
    // 사업 도메인 — 발주관리 드롭다운에서 선택되는 키. 외부(ProfileScreen 내주문 카드 등)에서
    // 도메인을 강제로 활성화시키며 BuyListScreen 으로 진입할 때 사용.
    domain?: 'purchase_agency' | 'rocket_3pl' | 'vvic_hipass' | 'shipping_agency' | 'error_management' | 'refund_management';
    progressStatus?: string;
  } | undefined;
  // 로켓/3PL, VVIC하이패스, 배송대행 페지는 구매대행과 동일한 9개 단계 라벨(견적대기/고객확인/.../완료/전체주문)을 공유한다.
  // 4개 도메인은 시각상 ">"로 묶여 있어도 서로 독립이며, 카운트만 도메인별로 다르다.
  Rocket3PLList: { initialTab?: 'category' | 'unpaid' | 'to_be_shipped' | 'shipped' | 'processed' | 'shipping_delay' | 'all' } | undefined;
  VvicHipassList: { initialTab?: 'category' | 'unpaid' | 'to_be_shipped' | 'shipped' | 'processed' | 'shipping_delay' | 'all' } | undefined;
  ShippingAgencyList: { initialTab?: 'category' | 'unpaid' | 'to_be_shipped' | 'shipped' | 'processed' | 'shipping_delay' | 'all' } | undefined;
  ProductManagement: undefined;
  // 홈페지 베스트상품 카드에서 진입. tab 키를 함께 보내면 그 탭이 default
  // 활성으로 시작한다. 'overall' 이 화면 기본값.
  BestProducts: { initialTab?: 'popularSeller' | 'price' | 'overall' } | undefined;
  // 홈페지의 신규등록상점 인사이트 카드에서 진입. 최근 등록된 상점 리스트.
  NewStores: undefined;
  // 홈페지의 인기업체 인사이트 카드에서 진입. 인기도 순위로 정렬된 업체 리스트.
  PopularMerchants: undefined;
  // 상품관리 카드의 편집(✏️) 아이콘에서 진입. 카드의 현재 필드들을 그대로
  // 전달해 폼이 즉시 초기화된다. productId 만 있고 나머지는 옵션이어서
  // 호출자가 일부만 보낼 수도 있다.
  // offerId + source 는 GET /products/detail 호출용 — 진입 즉시 그 API 를
  // 불러 응답으로 폼을 한 번 더 보강한다 (카드에 없는 productSkuInfos /
  // productImage / productAttribute 등 풀 데이터).
  OnlineProductEdit: {
    productId: string;
    offerId?: string;
    source?: string;
    productName?: string;
    unitPrice?: number;
    option1?: string;
    option2?: string;
    categoryName?: string;
    thumbnailUrl?: string;
  } | undefined;
  UnitSurvey: undefined;
  UnitSurveyDetail: { applicationId: string; preview?: import('./tradeApplication').TradeApplication };
  OEMSurvey: undefined;
  PaymentHistory: undefined;
  PersonalInformation: undefined;
  ProgressNotification: undefined;
  RefundRequest: { orderId: string; orderNumber: string; items: any[]; refundData?: any };
  ProblemProduct: undefined;
  MyDeliveries: undefined;
  DeliveryDetail: { deliveryId: string };
  OrderDetail: { orderId: string; order?: any };
  Note: undefined;
  LeaveNote: undefined;
  ShareApp: undefined;
  ViewedProducts: undefined;
  Variations: { variations?: VariationData } | undefined;
  SetUpVariationsInfo: { variations?: Variation[] } | undefined;
  // Chat screens
  Chat: { 
    userId?: string; 
    storeId?: string; 
    productId?: string; 
    orderId?: string;
    orderNumber?: string; // For order inquiry
    inquiryId?: string; // For existing inquiry
    inquiryDetail?: any; // Inquiry details from API (to avoid re-fetching)
    sellerId?: string;
    orderDetails?: CustomerOrderDetails;
  };
  ChattingMembers: undefined,
  // General Inquiry screens
  GeneralInquiryList: undefined;
  GeneralInquiryChat: { inquiryId?: string };
  CreateGeneralInquiry: undefined;
  CustomerService: undefined,
  OrderInquiry: { orderNumber?: string; orderId?: string },
  ChatProducts: { 
    sellerId?: string;
  };
  ChatOrders: undefined;
  SellingHistory: {store_id: string};
  PusherTest: undefined;
  // Other screens
  SearchResults: { query: string; filters?: SearchFilters };
  StoryView: { storyIndex?: number; productId?: string };
  SubCategory: { categoryName: string; categoryId?: string | number; subcategories?: any[] }; // Add category ID and subcategories
  ProductDiscovery: { 
    subCategoryName: string;
    categoryId?: string;
    categoryName?: string;
    subcategoryId?: string;
    subsubcategories?: any[];
    source?: string; // Platform/source (e.g., 'taobao', '1688')
  };
  Reviews: { productId: string };
  Following: undefined;
  Followers: undefined;
  ComponentDemo: undefined;
  ExtendedComponentDemo: undefined;
  // Add Explore screen to the navigation stack
  Explore: undefined;
  // Order Success screen
  OrderSuccess: undefined;
  // 404 Not Found screen
  NotFound: { message?: string; title?: string } | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string; email: string };
  OtpVerification: { email: string; phoneNumber?: string; countryCode?: string; recoveryMethod?: 'email' | 'phone' };
  EmailVerification: { email: string; verified?: boolean; token?: string; userData?: any };
  SetPassword: { email: string; code: string };
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface OrderItem {
  id: string;
  storeName: string;
  productBrand: string;
  status: 'Sent' | 'Waiting for payment' | 'On Process' | 'Cancelled';
  productName: string;
  brand: string;
  quantity: string;
  size: string;
  variant: string;
  image: any;
}

// Add the VariationData type
export type VariationData = {
  name: string;
  options: {
    id: number;
    value: string;
    price: number;
    stock: number;
    image: string;
    imageName?: string;
  }[];
}[];

// Add the Variation type
export type Variation = {
  id: number;
  name: string;
  options: {
    id: number;
    value: string;
    image: string;
    imageName?: string;
  }[];
};

// Shipping Service Types
export interface ShippingLocation {
  id?: number;
  shipping_service_id?: number;
  location: string;
  service: string;
  charge_type: string;
  one_item: string | number;
  additional_item: string | number;
  created_at?: string;
  updated_at?: string;
}

export interface ShippingService {
  id?: number;
  service_name: string;
  shipping_price_type: string;
  origin_zip: string;
  processing_time: string;
  store_id: number;
  created_at?: string;
  updated_at?: string;
  locations: ShippingLocation[];
}

// Add the NewInProduct type for the new API response
export interface NewInProduct {
  id: string | number;
  name: string;
  image: string;
  video: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  rating?: number;
  ratingCount?: number;
  sales?: number;
  offerId?: string;
}

// Add the Store type for the store API response
export interface Store {
  id: number;
  name: string;
  phone: string;
  email: string;
  logo: string | null;
  cover_photo: string | null;
  logo_full_url: string | null;
  cover_photo_full_url: string | null;
  address: string | null;
  delivery_time: string;
  rating: number[];
  items_count: number;
  orders_count: number;
  reviews_count: number;
  featured: number;
  active: boolean;
  open: number;
  distance: number | null;
  // Additional fields from the detailed store API response
  followers?: number;
  avg_rating?: number;
  rating_count?: number;
  total_items?: number;
  // Add other fields as needed based on the API response
  [key: string]: any; // Allow additional properties
}

// Add interfaces from useWishlistMutations.ts
export interface WishlistItem {
  id: number;
  user_id: number;
  item_id: number;
  created_at: string;
  updated_at: string;
  store_id: number | null;
  item: Product;
}

export interface UseMutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export interface UseAddToWishlistMutationResult {
  mutate: (imageUrl: string, externalId: string, price: number, title: string) => Promise<void>;
  data: { message: string } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseRemoveFromWishlistMutationResult {
  mutate: (itemId: string) => Promise<void>;
  data: { message: string } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseGetWishlistMutationResult {
  mutate: () => Promise<void>;
  data: WishlistItem[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface StoreProfileResponse {
  name: string;
  description: string;
  logo: string;
}

export interface StorePerformanceReuquest {
  period: string;
  status: string;

}

// Add interfaces from useStoreMutation.ts
export interface StoreResponse {
  id: number;
  name: string;
  phone: string;
  email: string;
  logo: string | null;
  cover_photo: string | null;
  logo_full_url: string | null;
  cover_photo_full_url: string | null;
  address: string | null;
  delivery_time: string;
  rating: number[];
  items_count: number;
  orders_count: number;
  reviews_count: number;
  featured: number;
  active: boolean;
  open: number;
  distance: number | null;
  canceledCount: number;
  completedCount: number;
  confirmedCount: number;
  followers: number;
  following: number;
}

export interface OrderStatsResponse {
  // Define the structure based on your API response
  [key: string]: any;
}

export interface UseStoreMutationResult {
  data: StoreResponse | null;
  storeProfileData: StoreProfileResponse | null,
  orderStats: OrderStatsResponse | null;
  loading: boolean;
  error: string | null;
  getStore: (userId: string) => Promise<ApiResponse<StoreResponse> | null>;
  getOrderStats: (storeId: number) => Promise<ApiResponse<OrderStatsResponse> | null>;
  getStoreProfile: () => Promise<ApiResponse<Object> | null>;
}

// Add interface for useStoreDetailsMutation hook
export interface UseStoreDetailsMutationResult {
  data: Store | null;
  loading: boolean;
  error: string | null;
  getStoreDetails: (storeId: string) => Promise<ApiResponse<Store> | null>;
}

// Add interfaces from useShippingServices.ts
export interface UseShippingServicesOptions {
  onSuccess?: (data: ShippingService[]) => void;
  onError?: (error: string) => void;
}

export interface UseShippingServicesResult {
  shippingServices: ShippingService[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  deleteShippingService: (serviceId: number) => Promise<boolean>;
}

export interface UseGetShippingServicesMutationResult {
  mutate: (storeId: number) => Promise<void>;
  data: ShippingService[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseDeleteShippingServiceMutationResult {
  mutate: (serviceId: number) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useShippingServiceMutations.ts
export interface UseShippingServiceMutationOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: string) => void;
}

export interface CreateShippingServiceVariables {
  serviceData: Omit<ShippingService, 'id' | 'created_at' | 'updated_at'>;
}

export interface UpdateShippingServiceVariables {
  serviceId: number;
  serviceData: Omit<ShippingService, 'id' | 'created_at' | 'updated_at'>;
}

export interface DeleteShippingServiceVariables {
  serviceId: number;
}

export interface UseCreateShippingServiceMutationResult {
  mutate: (variables: CreateShippingServiceVariables) => Promise<void>;
  data: ShippingService | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseUpdateShippingServiceMutationResult {
  mutate: (variables: UpdateShippingServiceVariables) => Promise<void>;
  data: ShippingService | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseDeleteShippingServiceMutationResult {
  mutate: (serviceId: number) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces for customer orders
export interface CustomerOrderDetails {
  // price: string;
  id: number;
  order_id: number;
  user_id: number;
  order_amount: number;
  coupon_discount_amount: number;
  coupon_discount_title: string | null;
  payment_status: string;
  order_status: string;
  total_tax_amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  delivery_address_id: number | null;
  delivery_man_id: number | null;
  coupon_code: string | null;
  order_note: string | null;
  order_type: string;
  checked: number;
  store_id: number | null;
  created_at: string;
  updated_at: string;
  delivery_charge: number;
  schedule_at: string | null;
  callback: string | null;
  otp: string | null;
  pending: string | null;
  accepted: string | null;
  confirmed: string | null;
  processing: string | null;
  handover: string | null;
  picked_up: string | null;
  delivered: string | null;
  canceled: string | null;
  refund_requested: string | null;
  refunded: string | null;
  delivery_address: string | null;
  scheduled: number;
  store_discount_amount: number;
  original_delivery_charge: number;
  failed: string | null;
  adjusment: string;
  edited: number;
  delivery_time: string | null;
  zone_id: number | null;
  module_id: number;
  order_attachment: string | null;
  parcel_category_id: number | null;
  receiver_details: string | null;
  charge_payer: string | null;
  distance: number;
  dm_tips: number;
  free_delivery_by: string | null;
  refund_request_canceled: string | null;
  prescription_order: boolean;
  tax_status: string | null;
  dm_vehicle_id: number | null;
  cancellation_reason: string | null;
  canceled_by: string | null;
  coupon_created_by: string | null;
  discount_on_product_by: string;
  processing_time: string | null;
  unavailable_item_note: string | null;
  cutlery: boolean;
  delivery_instruction: string | null;
  tax_percentage: string | null;
  additional_charge: number;
  order_proof: string | null;
  partially_paid_amount: number;
  is_guest: boolean;
  flash_admin_discount_amount: number;
  flash_store_discount_amount: number;
  cash_back_id: number | null;
  extra_packaging_amount: number;
  ref_bonus_amount: number;
  tax_type: string | null;
  module_type: string;
  order_attachment_full_url: string[];
  order_proof_full_url: string[];
  details: any[];
  storage: any[];
  module: {
    id: number;
    module_name: string;
    module_type: string;
    thumbnail: string;
    status: string;
    stores_count: number;
    created_at: string;
    updated_at: string;
    icon: string;
    theme_id: number;
    description: string;
    all_zone_service: number;
    icon_full_url: string;
    thumbnail_full_url: string;
    translations: any[];
    storage: any[];
  };
}

export interface CustomerOrderResponse {
  total_size: number;
  limit: string;
  offset: string;
  orders: CustomerOrderDetails[];
}

// Add interfaces from useRelatedProducts.ts
export interface UseRelatedProductsOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseRelatedProductsResult {
  forYouData: any[] | null;
  newInData: any[] | null;
  isLoading: boolean;
  error: string | null;
  fetchForYouProducts: (
    categoryIds: number[],
    type?: string,
    filter?: string,
    ratingCount?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string,
    offset?: number,
    limit?: number,
    append?: boolean
  ) => Promise<void>;
  fetchNewInProducts: (
    categoryId: number,
    type?: string,
    filter?: string,
    ratingCount?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string
  ) => Promise<void>;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useProductDetails.ts
export interface UseProductDetailsOptions {
  onSuccess?: (data: any[]) => void;
  onError?: (error: string) => void;
}

export interface UseProductDetailsResult {
  data: any[] | null;
  isLoading: boolean;
  error: string | null;
  fetchProductDetails: (storeId: number) => Promise<void>;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useProductDetailMutation.ts
export interface UseProductDetailMutationOptions {
  onSuccess?: (data: Product) => void;
  onError?: (error: string) => void;
}

export interface UseProductDetailMutationResult {
  mutate: (productId: string) => Promise<void>;
  data: Product | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useProductDetail.ts
export interface UseProductDetailOptions {
  onSuccess?: (data: Product) => void;
  onError?: (error: string) => void;
}

export interface UseProductDetailResult {
  data: Product | null;
  isLoading: boolean;
  error: string | null;
  fetchProductDetail: (productId: string) => Promise<void>;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useSearchMutations.ts
export interface UseSearchMutationOptions {
  onSuccess?: (data: Product[]) => void;
  onError?: (error: string) => void;
}

export interface UseSearchProductsMutationResult {
  mutate: (query: string, page?: number, limit?: number, filters?: any, sellerId?: string) => Promise<void>;
  data: Product[] | null;
  error: string | null;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseSortProductsMutationResult {
  mutate: (
    sortBy: string, 
    categoryIds?: number[], 
    page?: number, 
    limit?: number,
    type?: string,
    filter?: string,
    ratingCount?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string,
    sellerId?: string
  ) => Promise<void>;
  data: Product[] | null;
  error: string | null;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useHomeScreenMutations.ts
export interface HomeUseMutationOptions {
  onSuccess?: (data: any, offset?: number) => void;
  onError?: (error: string) => void;
}

// Types for Trending products
export interface TrendingProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  rating: number;
  rating_count: number;
  order_count: number;
  discount?: number;
  originalPrice?: number;
  variation?: string;
  category?: any;
  subcategory?: string;
  brand?: string;
  seller?: any;
  inStock?: boolean;
  stock_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Types for "For You" products
export interface ForYouProduct {
  id: string;
  name: string;
  price: number;
  images: string[];
  rating: number;
  rating_count: number;
  order_count: number;
  discount?: number;
  originalPrice?: number;
  variation?: string;
  category?: any;
  subcategory?: string;
  brand?: string;
  seller?: any;
  inStock?: boolean;
  stock_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseNewInProductsMutationResult {
  mutate: (
    platform?: string,
    country?: string
  ) => Promise<void>;
  data: NewInProduct[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseTrendingProductsMutationResult {
  mutate: (
    categoryIds: number[],
    type?: string,
    filter?: string,
    ratingCount?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string
  ) => Promise<void>;
  data: TrendingProduct[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseForYouProductsMutationResult {
  mutate: (
    categoryIds: number[], 
    offset?: number, 
    limit?: number,
    type?: string,
    filter?: string,
    ratingCount?: string,
    minPrice?: number,
    maxPrice?: number,
    search?: string
  ) => Promise<void>;
  data: ForYouProduct[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseStoresMutationResult {
  mutate: (storeType?: string, offset?: number, limit?: number) => Promise<void>;
  data: Store[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useAuthMutations.ts
export interface AuthUseMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string, errorCode?: string) => void;
}

export interface LoginVariables {
  users_id: string;
  password: string;
  email?: string;
}

export interface RegisterVariables {
  email: string;
  password: string;
  name: string;
  phone: string;
  isBusiness: boolean;
  referralCode?: string;
  user_id?: string;
  isSeller?: boolean;
  businessRegistrationImage?: string; // local URI of the file to upload
}

export interface GuestLoginVariables {
  fcm_token: string;
}

export interface UseLoginMutationResult {
  mutate: (variables: LoginVariables) => Promise<void>;
  data: { token: string; user: Partial<User> } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseRegisterMutationResult {
  mutate: (variables: RegisterVariables) => Promise<void>;
  data: { 
    token?: string; 
    user?: Partial<User>;
    email?: string;
    message?: string;
    requiresVerification?: boolean;
  } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface useGuestLoginMutationResult {
  mutate: (variables: GuestLoginVariables) => Promise<void>;
  data: { guest_id: number; } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add the change password mutation result interface
export interface UseChangePasswordMutationResult {
  mutate: (variables: { currentPassword: string; newPassword: string }) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useCartMutations.ts
export interface CartUseMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

// Types for cart operations
export interface AddToCartParams {
  offerId: string;
  specId: string;
  quantity: number;
}

export interface UpdateCartItemParams {
  cartItemId: string;
  quantity: number;
}

export interface RemoveFromCartParams {
  cartItemId: string;
}

export interface DeleteCartBatchParams {
  itemIds: string[];
}

// Checkout Order Params
export interface CheckoutOrderParams {
  orderAmount: number;
  cartIds: number[];
  addressId: number;
}


// Add to Cart Mutation
export interface UseAddToCartMutationResult {
  mutate: (variables: AddToCartParams) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Get Cart Query
export interface UseGetCartQueryResult {
  refetch: () => Promise<void>;
  data: any[] | null;
  error: string | null;
  isLoading: boolean;
}

// Get Cart Mutation
export interface UseGetCartMutationResult {
  mutate: () => Promise<void>;
  data: any[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Update Cart Item Mutation
export interface UseUpdateCartItemMutationResult {
  mutate: (variables: UpdateCartItemParams) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Remove From Cart Mutation
export interface UseRemoveFromCartMutationResult {
  mutate: (variables: RemoveFromCartParams) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Checkout Order Mutation
export interface UseCheckoutOrderMutationResult {
  mutate: (variables: CheckoutOrderParams) => Promise<void>;
  data: any | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from useCategories.ts
export interface CategoryData {
  id: number;
  name: string;
  image_full_url: string | null;
  slug: string | null;
  childes?: CategoryData[];
}

export interface UseCategoriesOptions {
  onSuccess?: (data: CategoryData[]) => void;
  onError?: (error: string) => void;
}

export interface UseChildCategoriesOptions {
  onSuccess?: (data: CategoryData[]) => void;
  onError?: (error: string) => void;
}

export interface UseCategoriesResult {
  mutate: () => Promise<void>;
  data: CategoryData[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseChildCategoriesResult {
  mutate: (parentId: number) => Promise<void>;
  data: CategoryData[] | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Category Tree Types for 1688 API
export interface CategoryTreeItem {
  _id: string;
  platform: string;
  externalId: string;
  parentId: string | null;
  name: {
    zh: string;
    en: string;
    ko: string;
  };
  level: number;
  path: string;
  isLeaf: boolean;
  isActive: boolean;
  metadata?: {
    parentCateId: string;
    lastFetched: string;
  };
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  children: CategoryTreeItem[];
}

export interface CategoriesTreeResponse {
  tree: CategoryTreeItem[];
  platform: string;
  cached: boolean;
  totalCategories: number;
  responseTime: string;
}

export interface UseCategoriesTreeOptions {
  onSuccess?: (data: CategoriesTreeResponse) => void;
  onError?: (error: string) => void;
}

export interface UseCategoriesTreeResult {
  mutate: (platform: string) => Promise<void>;
  data: CategoriesTreeResponse | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from authApi.ts
export interface AuthResponse {
  following_count: number;
  follower_count: number;
  first_name: string;
  token: string;
  is_phone_verified: number;
  is_email_verified: number;
  is_personal_info: number;
  is_exist_user: null;
  login_type: string;
  email: string;
  user_id: string;
}

export interface GuestResponse {
  message: string;
  guest_id: number;
}

export interface LoginRequest {
  email_or_phone: string;
  password: string;
  login_type: string;
  field_type: string;
  guest_id: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  isBusiness: boolean;
}

export interface GustLoginRequest {
  fcm_token: string;
}

// Add interfaces from productsApi.ts
export interface ProductCreateData {
  name: string;
  description: string;
  category_id: number;
  price: number;
  current_stock: number;
  weight: number;
  height: number;
  width: number;
  length: number;
  store_id: number;
  shipping_options: number;
  item_images: string[];
  videos: string[];
  variations: {
    name: string;
    options: {
      value: string;
      price: number;
      stock: number;
    }[];
  }[];
  [key: string]: any; // Allow additional properties
}

export interface ProductUpdateData extends ProductCreateData {
  id: string;
}

// Add interfaces from cloudinary.ts
export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}

// Add interfaces from socialAuth.ts
export interface SocialLoginOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface SocialLoginResult {
  mutate: (provider: 'google' | 'facebook' | 'apple' | 'naver' | 'kakao') => Promise<void>;
  data: any;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add interfaces from storesApi.ts
export interface Store {
  id: number;
  name: string;
  phone: string;
  email: string;
  logo: string | null;
  cover_photo: string | null;
  logo_full_url: string | null;
  cover_photo_full_url: string | null;
  address: string | null;
  delivery_time: string;
  rating: number[];
  items_count: number;
  orders_count: number;
  reviews_count: number;
  featured: number;
  active: boolean;
  open: number;
  distance: number | null;
}

// Add interfaces from followsApi.ts
export interface Follow {
  id: number;
  store_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  store: {
    id: number;
    name: string;
    phone: string;
    email: string;
    logo: string | null;
    latitude: string;
    longitude: string;
    address: string | null;
    footer_text: string | null;
    minimum_order: number;
    comission: string | null;
    schedule_order: boolean;
    status: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    free_delivery: boolean;
    rating: number[];
    cover_photo: string | null;
    delivery: boolean;
    take_away: boolean;
    item_section: boolean;
    tax: number;
    zone_id: number;
    reviews_section: boolean;
    active: boolean;
    off_day: string;
    self_delivery_system: number;
    pos_system: boolean;
    minimum_shipping_charge: number;
    delivery_time: string;
    veg: number;
    non_veg: number;
    order_count: number;
    total_order: number;
    module_id: number;
    order_place_to_schedule_interval: number;
    featured: number;
    per_km_shipping_charge: number;
    prescription_order: boolean;
    slug: string;
    maximum_shipping_charge: number;
    cutlery: boolean;
    meta_title: string | null;
    meta_description: string | null;
    meta_image: string | null;
    announcement: number;
    announcement_message: string | null;
    store_business_model: string;
    package_id: string | null;
    pickup_zone_id: string;
    comment: string | null;
    tin: string;
    tin_expire_date: string;
    tin_certificate_image: string | null;
    gst_status: boolean;
    gst_code: string;
    logo_full_url: string | null;
    cover_photo_full_url: string | null;
    meta_image_full_url: string | null;
    tin_certificate_image_full_url: string | null;
    translations: {
      id: number;
      translationable_type: string;
      translationable_id: number;
      locale: string;
      key: string;
      value: string;
      created_at: string | null;
      updated_at: string | null;
    }[];
    storage: {
      id: number;
      data_type: string;
      data_id: string;
      key: string;
      value: string;
      created_at: string;
      updated_at: string;
    }[];
  };
}

export interface Follower {
  id: number;
  user_id: number;
  store_id: number;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    f_name: string;
    l_name: string;
    email: string;
    phone: string;
    image: string | null;
    image_full_url: string | null;
    is_phone_verified: number;
    is_email_verified: number;
    login_type: string;
    created_at: string;
    updated_at: string;
  };
}

export interface CheckFollowResponse {
  is_following: boolean;
}

// Add interfaces for addresses API
export interface ApiAddress {
  id: number;
  address_type: string;
  phone: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  user_id: number;
  contact_person_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  zone_id: number;
  floor: string | null;
  road: string | null;
  house: string | null;
  apt: string;
  city: string;
  state: string;
  zip_code: number;
  is_primary_address: number;
  is_store_address: number;
}

// Add interfaces for address mutations
export interface UseGetAddressesMutationResult {
  mutate: (moduleId?: number) => Promise<void>;
  data: PaginatedResponse<ApiAddress> | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseCreateAddressMutationResult {
  mutate: (variables: { addressData: CreateAddressRequest; moduleId?: number }) => Promise<void>;
  data: { message: string } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseUpdateAddressMutationResult {
  mutate: (variables: { addressData: UpdateAddressRequest; moduleId?: number }) => Promise<void>;
  data: { message: string } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseDeleteAddressMutationResult {
  mutate: (variables: { addressId: number; moduleId?: number }) => Promise<void>;
  data: { message: string } | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Add request interfaces for addresses
export interface CreateAddressRequest {
  address: string;
  apt: string;
  city: string;
  state: string;
  zip_code: number;
  is_primary_address: number;
  is_store_address: number;
  phone: string,
}

export interface UpdateAddressRequest extends CreateAddressRequest {
  id: number;
}


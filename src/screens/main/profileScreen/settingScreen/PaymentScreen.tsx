import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Clipboard from '@react-native-clipboard/clipboard';
import Icon from '../../../../components/Icon';
import HeadsetMicIcon from '../../../../assets/icons/HeadsetMicIcon';
import NotificationBadge from '../../../../components/NotificationBadge';
import EditIcon from '../../../../assets/icons/EditIcon';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants';
import { useAppSelector } from '../../../../store/hooks';
import { translations } from '../../../../i18n/translations';
import { PhotoCaptureModal } from '../../../../components';
import { InputCheckServiceModal } from '../../../../components';
import { OrderServiceModal } from '../../../../components';
import { TransferMethodModal } from '../../../../components';
import { CouponModal } from '../../../../components';
import { useAuth } from '../../../../context/AuthContext';
import { Address } from '../../../../types';
import { useCreateOrderMutation } from '../../../../hooks/useCreateOrderMutation';
import { useCreateOrderDirectPurchaseMutation } from '../../../../hooks/useCreateOrderDirectPurchaseMutation';
import { useToast } from '../../../../context/ToastContext';
import { formatPriceKRW, formatKRWDirect, formatDepositBalance } from '../../../../utils/i18nHelpers';
import {
  addressApi,
  buildAddressSubmitBody,
  buildCreateOrderLineItems,
  getAddressSaveSuccessMessage,
  resolveAddressSaveError,
} from '../../../../services/addressApi';
import { buildShippingAddressFromAddress } from '../../../../services/orderApi';

interface PaymentScreenParams {
  items: Array<{
    id: string;
    _id?: string; // Cart item ID from backend
    offerId?: string;
    name: string;
    price: number;
    originalPrice?: number;
    quantity: number;
    image: string;
    source?: string;
    skuInfo?: {
      skuId?: number;
      specId?: string;
      price?: string;
      skuAttributes?: Array<{
        attributeId?: number;
        attributeName?: string;
        attributeNameTrans?: string;
        value?: string;
        valueTrans?: string;
        valueMultiLang?: { en?: string; ko?: string; zh?: string };
        skuImageUrl?: string;
      }>;
    };
    companyName?: string;
    sellerOpenId?: string;
  }>;
  totalAmount: number;
  fromCart?: boolean;
  selectedAddress?: Address;
  estimatedShippingCost?: number;
  estimatedShippingCostBySeller?: { [sellerId: string]: number };
  /** From POST /cart/checkout or /cart/checkout/direct-purchase response */
  checkoutData?: {
    productTotalKRW?: number;
    shippingTotalKRW?: number;
    estimatedShippingCost?: number;
    estimatedShippingCostBySeller?: { [sellerId: string]: number };
    availableCoupons?: Array<{ usageId: string; couponId: string; name: string; type: string; amount: number; minPurchaseAmount?: number; validUntil?: string; applicableDiscount?: number }>;
    availablePoints?: number;
    transportationMethods?: Array<{ deliveryName: string; defaultWeight?: number; defaultPrice?: number; additionalWeight?: number; additionalWeightPrice?: number; shippingTimeRequired?: string }>;
    additionalServicePrices?: Array<{ type: string; price: number; nameEn: string; nameKo: string; nameZh: string }>;
    serviceFeePercentage?: number;
    estimatedRuralCost?: { postalCode?: string; ferryFee?: number; additionalShippingFee?: number; total?: number };
  };
  /** Raw selectedItems from checkout/direct-purchase (for POST /orders/direct-purchase) */
  directPurchaseItems?: any[];
}

const PaymentScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  // Some entry points (e.g. BuyList's "Pay Now" button on an existing order)
  // navigate to this screen without route params. Fall back to an empty
  // object so destructuring below cannot crash with
  // "Cannot read property 'items' of undefined".
  const params = (route.params ?? {}) as PaymentScreenParams;
  const {
    items = [],
    totalAmount = 0,
    fromCart = false,
    estimatedShippingCost: paramShipping = 0,
    estimatedShippingCostBySeller: paramShippingBySeller = {},
    checkoutData,
    directPurchaseItems,
  } = params;
  const estimatedShippingCost = checkoutData?.estimatedShippingCost ?? paramShipping;
  const estimatedShippingCostBySeller = checkoutData?.estimatedShippingCostBySeller ?? paramShippingBySeller;
  const insets = useSafeAreaInsets();

  // i18n
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    if (typeof value === 'string') return value;
    if (value != null && typeof value === 'object' && ('en' in value || 'ko' in value || 'zh' in value)) {
      const o = value as Record<string, string>;
      return o[locale] || o.en || o.ko || o.zh || key;
    }
    return String(value ?? key);
  };

  // Safely render text that may be a string or multilingual object { en, ko, zh }
  const safeText = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && ('en' in value || 'ko' in value || 'zh' in value)) {
      const o = value as Record<string, string>;
      return o[locale] || o.en || o.ko || o.zh || '';
    }
    return String(value);
  };

  // Auth context
  const { user, updateUser } = useAuth();

  // State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('bank');
  const [selectedTransportType, setSelectedTransportType] = useState<string>('air');
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string>('general');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [orderMemos, setOrderMemos] = useState<Record<string, string>>({});
  const [productNotes, setProductNotes] = useState<Record<string, string>>({});
  const [pointsInput, setPointsInput] = useState<string>('');
  const [useCoupon, setUseCoupon] = useState(false);
  const [photoCaptureVisible, setPhotoCaptureVisible] = useState(false);
  const [selectedProductForPhoto, setSelectedProductForPhoto] = useState<any>(null);
  const [designatedShootingData, setDesignatedShootingData] = useState<Record<string, { quantity: number; request: string; photos: string[] }>>({});
  const [inputCheckServiceVisible, setInputCheckServiceVisible] = useState(false);
  const [orderServiceVisible, setOrderServiceVisible] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [addressEditModalVisible, setAddressEditModalVisible] = useState(false);
  const [isAddressCollapsed, setIsAddressCollapsed] = useState(false);
  const [selectedProductCouponState, setSelectedProductCouponState] = useState<any>(null);
  const [selectedShippingCouponState, setSelectedShippingCouponState] = useState<any>(null);
  const [selectedInputCheckServices, setSelectedInputCheckServices] = useState<any[]>([]);
  const [saveIdChecked, setSaveIdChecked] = useState(false);
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
  // Payment dropdown state
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('0');
  const [memberName, setMemberName] = useState<string>('');
  const { showToast } = useToast();

  // Set default address on mount
  React.useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
      setSelectedAddress(defaultAddress);
    }
  }, [user]);

  // Refresh address selection when returning from AddNewAddress screen
  useFocusEffect(
    React.useCallback(() => {
      if (user?.addresses && user.addresses.length > 0) {
        // If no address is selected, select default or first address
        if (!selectedAddress) {
          const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
          setSelectedAddress(defaultAddress);
        } else {
          // Verify selected address still exists in the list
          const addressExists = user.addresses.find(addr => addr.id === selectedAddress.id);
          if (!addressExists) {
            // If selected address no longer exists, select default or first
            const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
            setSelectedAddress(defaultAddress);
          }
        }
      }
    }, [user, selectedAddress])
  );


  // Helper function to update memo for specific product
  const updateOrderMemo = (productId: string, memo: string) => {
    setOrderMemos(prev => ({
      ...prev,
      [productId]: memo
    }));
  };

  // Helper function to update note for specific product
  const updateProductNote = (productId: string, note: string) => {
    setProductNotes(prev => ({
      ...prev,
      [productId]: note
    }));
  };

  // Handle camera button press
  const handleCameraPress = (item: any) => {
    setSelectedProductForPhoto(item);
    setPhotoCaptureVisible(true);
  };

  // Handle photo capture confirmation
  const handlePhotoCaptureConfirm = (data: { quantity: number; request: string; photos: string[] }) => {
    if (selectedProductForPhoto?.id) {
      setDesignatedShootingData(prev => ({
        ...prev,
        [selectedProductForPhoto.id]: data,
      }));
    }
    setPhotoCaptureVisible(false);
    setSelectedProductForPhoto(null);
  };

  // Handle input check service confirmation
  const handleInputCheckServiceConfirm = (selectedServices: any[]) => {
    setSelectedInputCheckServices(selectedServices);
    // showToast('Input check services updated', 'success');
  };

  // Handle order service confirmation
  const handleOrderServiceConfirm = (selectedServices: string[]) => {
    // console.log('Selected order services:', selectedServices);
    // showToast('Order services updated', 'success');
  };

  // Handle address selection from route params
  React.useEffect(() => {
    const params = route.params as PaymentScreenParams;
    if (params?.selectedAddress) {
      setSelectedAddress(params.selectedAddress);
    }
  }, [route.params]);

  // Update address when screen comes into focus (e.g., returning from SelectAddress)
  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as PaymentScreenParams;
      if (params?.selectedAddress) {
        setSelectedAddress(params.selectedAddress);
      }
    }, [route.params])
  );

  // Handle coupon confirmation (unused modal path — kept for CouponModal compatibility)
  const handleCouponConfirm = (coupon: any) => {
    if (!coupon || coupon.type === 'shipping') {
      setSelectedShippingCouponState(coupon ?? null);
    } else {
      setSelectedProductCouponState(coupon ?? null);
    }
  };

  // Mock data
  const paymentMethods = [
    { 
      id: 'deposit', 
      name: 'Deposit', 
      iconType: 'icon',
      iconName: 'wallet-outline'
    },
    { 
      id: 'kakaopay', 
      name: 'KakaoPay', 
      iconType: 'text',
      iconText: 'K',
      iconColor: '#FFCD00',
      textColor: '#000000'
    },
    { 
      id: 'naverpay', 
      name: 'NaverPay', 
      iconType: 'text',
      iconText: 'N',
      iconColor: '#03C75A',
      textColor: '#FFFFFF'
    },
    { 
      id: 'newcard', 
      name: 'New Card', 
      iconType: 'icon',
      iconName: 'card-outline'
    },
  ];

  const cardOptions = [
    { id: 'visa', name: 'VISA', color: '#1A1F71', textColor: '#FFFFFF' },
    { id: 'mastercard', name: 'MC', color: '#EB001B', textColor: '#FFFFFF' },
    { id: 'paypal', name: 'PayPal', color: '#0070BA', textColor: '#FFFFFF' },
    { id: 'amex', name: 'AMEX', color: '#006FCF', textColor: '#FFFFFF' },
  ];

  // Calculate pricing (use checkout API totals when available)
  const subtotalFromItems = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const productTotalKRW = checkoutData?.productTotalKRW ?? subtotalFromItems;
  const shippingTotalKRW = checkoutData?.shippingTotalKRW ?? estimatedShippingCost;
  const subtotal = productTotalKRW;
  const warehouseFee = 1.00;
  const areaTransport = 2.00;
  const internationalTransport = shippingTotalKRW / 210.78; // Convert KRW to CNY for legacy calc if needed
  
  const availablePointsAmount = checkoutData?.availablePoints ?? 0;
  const maxPointsKRW = Math.floor(availablePointsAmount / 10);
  const enteredPoints = Math.min(Math.max(0, parseInt(pointsInput || '0', 10)), availablePointsAmount);
  const pointsDiscount = Math.floor(enteredPoints / 10);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.orderConfirmation') || 'Order Confirmation'}</Text>
      </View>
      <NotificationBadge
        customIcon={<HeadsetMicIcon width={24} height={24} color={COLORS.text.primary} />}
        count={0}
        badgeColor={COLORS.red}
        onPress={() => {
          // 메세지 페지의 두 번째 탭(general — 1:1 상담) 으로 내비게이션.
          // HomeScreen 의 1:1 상담신청 카드와 동일한 패턴.
          (navigation as any).navigate('Main', {
            screen: 'Message',
            params: { initialTab: 'general' },
          });
        }}
      />
    </View>
  );

  const renderOrderItems = () => {
    // Group items by seller
    const itemsBySeller: { [sellerId: string]: typeof items } = {};
    items.forEach(item => {
      const sellerId = item.sellerOpenId || 'unknown';
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = [];
      }
      itemsBySeller[sellerId].push(item);
    });

    return (
      <>
        {Object.entries(itemsBySeller).map(([sellerId, sellerItems]) => {
          const companyName = safeText(sellerItems[0]?.companyName) || sellerId;
          const source = sellerItems[0]?.source || '1688';
          
          // Get platform name
          const getPlatformName = (platform: string) => {
            switch (platform.toLowerCase()) {
              case '1688':
                return '1688';
              case 'taobao':
                return '淘宝';
              case 'companymall':
              case 'mycompany':
                return 'Company Mall';
              default:
                return '1688';
            }
          };
          
          return (
            <View key={sellerId} style={styles.sellerGroup}>
              {/* Platform + Store Header */}
              <View style={styles.sellerHeader}>
                {/* <Text style={styles.platformName}>{getPlatformName(source)}</Text> */}
                <Text style={styles.sellerName}>{companyName}</Text>
                <Icon name="chevron-forward" size={20} color={COLORS.text.primary} />
              </View>

              {/* Products for this seller */}
              {sellerItems.map((item, index) => (
                <View key={item.id || item._id || item.offerId || `item-${index}`}>
                  {/* Product Item */}
                  <View style={styles.orderItem}>
                    <Image 
                      source={{ uri: item.image }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={1}>{safeText(item.name)}</Text>
                      {item.skuInfo?.skuAttributes && item.skuInfo.skuAttributes.length > 0 && (
                        <Text style={styles.itemVariant}>
                          {item.skuInfo.skuAttributes.map((attr: any) =>
                            safeText(attr.valueMultiLang ?? attr.valueTrans ?? attr.value)
                          ).join('/')}
                        </Text>
                      )}
                      <View style={styles.productPriceRow}>
                        <Text style={styles.itemPrice}>{formatPriceKRW(item.price)}</Text>
                        {/* {item.originalPrice && item.originalPrice > item.price && (
                          <Text style={styles.itemOriginalPrice}>{formatPriceKRW(item.originalPrice)}</Text>
                        )} */}
                        {/* <View style={styles.quantityControls}> */}
                          {/* <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => {
                              // Decrease quantity logic
                            }}
                          >
                            <Icon name="remove" size={16} color={COLORS.text.primary} />
                          </TouchableOpacity> */}
                          <Text style={styles.quantityText}>x{item.quantity}</Text>
                          {/* <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => {
                              // Increase quantity logic
                            }}
                          >
                            <Icon name="add" size={16} color={COLORS.text.primary} />
                          </TouchableOpacity> */}
                        {/* </View> */}
                      </View>
                    </View>
                  </View>

                  {/* Delivery Info */}
                  {/* <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Delivery:</Text>
                    <Text style={styles.infoValue}>Dispatch within 48 hours</Text>
                  </View> */}

                  {/* Return Policy */}
                  {/* <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Return Policy:</Text>
                    <Text style={styles.infoValue}>{t('payment.officialReturnPolicy') || 'Official Return Policy'}</Text>
                  </View> */}

                  {/* Invoice */}
                  {/* <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Invoice:</Text>
                    <Text style={styles.infoValueGray}>No invoice will be issued for this order.</Text>
                  </View> */}

                  {/* Note - Editable */}
                  {/* <View style={[styles.noteSection, styles.lastInfoSection]}>
                    <Text style={styles.infoLabel}>Note:</Text>
                    <TextInput
                      style={styles.noteInput}
                      placeholder={t('payment.addOrEditNote') || 'Add or edit note'}
                      placeholderTextColor={COLORS.gray[400]}
                      value={productNotes[item.id] || ''}
                      onChangeText={(text) => updateProductNote(item.id, text)}
                      multiline
                    />
                  </View> */}

                  {/* Hidden sections - will be used later */}
                  {/* Input Check Service for this product */}
                  {false && (
                  <TouchableOpacity 
                    style={styles.serviceSection}
                    onPress={() => setInputCheckServiceVisible(true)}
                  >
                    <View style={styles.serviceTitleRow}>
                      <Text style={styles.serviceTitle}>{t('payment.inputCheckService') || 'Input Check Service'}</Text>
                      <TouchableOpacity onPress={() => setInputCheckServiceVisible(true)}>
                        <Icon name="chevron-forward" size={16} color={COLORS.gray[400]} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.serviceRow}>
                      {selectedInputCheckServices.length > 0 ? (
                        <>
                          <View style={{ flex: 1 }}>
                            {selectedInputCheckServices.map((service) => (
                              <View key={service.id} style={[styles.serviceCheck, { marginBottom: SPACING.xs }]}>
                                <Icon name="checkmark-circle" size={20} color={COLORS.red} />
                                <Text style={styles.serviceName}>{safeText(service.name)}</Text>
                              </View>
                            ))}
                          </View>
                          <Text style={styles.servicePrice}>
                            {formatKRWDirect(selectedInputCheckServices.reduce((sum, s) => sum + s.price, 0))}
                          </Text>
                        </>
                      ) : (
                        <>
                          <View style={styles.serviceCheck}>
                            <Icon name="checkmark-circle" size={20} color={COLORS.red} />
                            <Text style={styles.serviceName}>{t('payment.camera') || 'Camera'}</Text>
                          </View>
                          <Text style={styles.servicePrice}>{formatPriceKRW(0)}</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                  )}

                  {/* Order Service for this product */}
                  {false && (
                  <TouchableOpacity 
                    style={styles.orderServiceSection}
                    onPress={() => setOrderServiceVisible(true)}
                  >
                    <View style={styles.serviceTitleRow}>
                      <Text style={styles.serviceTitle}>{t('payment.orderService') || 'Order Service'}</Text>
                      <TouchableOpacity onPress={() => setOrderServiceVisible(true)}>
                        <Icon name="chevron-forward" size={16} color={COLORS.gray[400]} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.serviceRow}>
                      <View style={styles.serviceCheck}>
                        <Icon name="checkmark-circle" size={20} color={COLORS.red} />
                        <Text style={styles.serviceName}>{t('payment.camera') || 'Camera'}</Text>
                      </View>
                      <Text style={styles.servicePrice}>{formatPriceKRW(0)}</Text>
                    </View>
                  </TouchableOpacity>
                  )}

                  {/* Order Memo for this product */}
                  {false && (
                  <View style={styles.memoSection}>
                    <Text style={styles.sectionTitle}>{t('payment.orderMemo') || 'Order Memo'}</Text>
                    <TextInput
                      style={styles.memoInput}
                      placeholder={t('payment.makeMemo') || 'Please make memo for this order'}
                      placeholderTextColor={COLORS.gray[400]}
                      value={orderMemos[item.id] || ''}
                      onChangeText={(text) => updateOrderMemo(item.id, text)}
                      multiline
                    />
                  </View>
                  )}
                </View>
              ))}
            </View>
          );
        })}
      </>
    );
  };



  const renderPaymentMethods = () => {
    const depositBalance = (user as any)?.depositBalance ?? (user as any)?.balance ?? 0;
    const paymentOptions = [
      { id: 'bank', label: t('payment.bank') || 'Bank' },
      { id: 'credit_card', label: t('payment.creditCard') || 'Credit Card' },
      { id: 'deposit', label: t('payment.deposit') || 'Deposit' },
    ];
    const selectedLabel = paymentOptions.find(o => o.id === selectedPaymentMethod)?.label ?? paymentOptions[0].label;

    return (
      <View style={styles.paymentSection}>
        <Text style={styles.paymentSectionTitle}>{t('payment.paymentMethod') || 'Payment method'}</Text>

        {/* Dropdown selector */}
        <TouchableOpacity
          style={styles.paymentDropdown}
          onPress={() => setShowPaymentDropdown(prev => !prev)}
          activeOpacity={0.8}
        >
          <Text style={styles.paymentDropdownText}>{selectedLabel}</Text>
          <Icon name={showPaymentDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.text.primary} />
        </TouchableOpacity>

        {showPaymentDropdown && (
          <View style={styles.paymentDropdownMenu}>
            {paymentOptions.map((option, idx) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.paymentDropdownItem,
                  idx < paymentOptions.length - 1 && styles.paymentDropdownItemBorder,
                  selectedPaymentMethod === option.id && styles.paymentDropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedPaymentMethod(option.id);
                  setShowPaymentDropdown(false);
                  if (option.id === 'deposit') {
                    setDepositAmount(String(Math.round(finalTotal)));
                  } else {
                    setDepositAmount('0');
                  }
                }}
              >
                <Text style={[
                  styles.paymentDropdownItemText,
                  selectedPaymentMethod === option.id && styles.paymentDropdownItemTextActive,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Deposit amount row — always shown */}
        <View style={styles.paymentInputRow}>
          <TextInput
            style={styles.paymentInputField}
            value={depositAmount}
            onChangeText={setDepositAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={COLORS.text.secondary}
          />
          <Text style={styles.paymentBalanceText}>
            {t('payment.balance') || '잔액'}: {formatPriceKRW(depositBalance)}
          </Text>
          <TouchableOpacity
            style={styles.paymentUseAllButton}
            onPress={() => {
              setSelectedPaymentMethod('deposit');
              setDepositAmount(String(Math.round(finalTotal)));
            }}
          >
            <Text style={styles.paymentUseAllText}>{t('payment.useFullDeposit') || '예치금 전액사용'}</Text>
          </TouchableOpacity>
        </View>

        {/* Bank info — shown for bank method */}
        {selectedPaymentMethod === 'bank' && (
          <>
            {/* Member name row — bank only */}
            <View style={styles.paymentInputRow}>
              <TextInput
                style={[styles.paymentInputField, { flex: 1 }]}
                value={memberName}
                onChangeText={setMemberName}
                placeholder={t('payment.enterMemberName') || '회원명 입력해 주세요'}
                placeholderTextColor={COLORS.text.secondary}
              />
              <TouchableOpacity
                style={styles.paymentUseAllButton}
                onPress={() => setMemberName(user?.name || '')}
              >
                <Text style={styles.paymentUseAllText}>{t('payment.useMemberName') || '회원명으로 사용'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>{t('payment.bankName') || '은행명'}</Text>
              <Text style={styles.paymentInfoValue}>{t('payment.kbBank') || '국민은행'}</Text>
              <TouchableOpacity style={styles.paymentInfoTextCopy} onPress={() => { Clipboard.setString('국민은행'); showToast(t('common.copied') || 'Copied', 'success'); }}>
                <Text style={styles.paymentInfoValue}>{t('payment.copy') || 'copy'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>{t('payment.accountNumber') || '계좌번호'}</Text>
              <Text style={styles.paymentInfoValue}>21830104406282</Text>
              <TouchableOpacity style={styles.paymentInfoTextCopy} onPress={() => { Clipboard.setString('21830104406282'); showToast(t('common.copied') || 'Copied', 'success'); }}>
                <Text style={styles.paymentInfoValue}>{t('payment.copy') || 'copy'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };





  const renderAddress = () => {
    const addresses = user?.addresses || [];
    
    // Get default address or first address
    const defaultAddress = selectedAddress || addresses.find(addr => addr.isDefault) || addresses[0];
    
    // If no addresses, navigate to select address page
    if (!defaultAddress) {
      return (
        <View style={styles.addressSection}>
          <TouchableOpacity 
            style={styles.addressRow}
            onPress={() => navigation.navigate('AddressBook')}
          >
            <Icon name="location-outline" size={24} color={COLORS.black} />
            <Text style={styles.addressText}>{t('payment.addAddress') || 'Add address'}</Text>
            <View style={styles.addressActions}>
              <Icon name="create-outline" size={20} color={COLORS.gray[600]} />
              <Icon name="chevron-forward" size={20} color={COLORS.gray[600]} />
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Show only default address with edit option
    return (
      <View style={styles.addressSection}>
        <View style={styles.addressRow}>
          <Icon name="location-outline" size={24} color={COLORS.black} style={styles.locationIcon} />
          <View style={styles.addressInfo}>
            <Text style={styles.addressFullText}>
              {defaultAddress.street || ''}
              {defaultAddress.zipCode ? `, ${defaultAddress.zipCode}` : ''}
              {/* {defaultAddress.city ? `, ${defaultAddress.city}` : ''} */}
            </Text>
            {!isAddressCollapsed && (
              <Text style={styles.addressPhone}>
                {safeText(defaultAddress.name) || safeText(user?.name) || t('payment.unnamed') || 'Unnamed'} {defaultAddress.phone || ''}
              </Text>
            )}
          </View>
          <View style={styles.addressActions}>
            <TouchableOpacity
              onPress={() => {
                if (selectedAddress) {
                  setEditAddress({
                    zonecode: selectedAddress.zipCode || '',
                    roadAddress: selectedAddress.street || '',
                    detailAddress: selectedAddress.street || '',
                    recipient: selectedAddress.name || '',
                    contact: selectedAddress.phone || '',
                    customsCode: (selectedAddress as any).personalCustomsCode || '',
                  });
                  setIsDefaultAddress(selectedAddress.isDefault || false);
                } else {
                  // Reset form for adding new address
                  setEditAddress({ zonecode: '', roadAddress: '', detailAddress: '', recipient: '', contact: '', customsCode: '' });
                  setIsDefaultAddress(false);
                }
                setAddressEditModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <EditIcon width={20} height={20} color={COLORS.gray[600]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddressBook' as never)}
              activeOpacity={0.7}
            >
              <Icon name="chevron-forward" size={20} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>
        </View>
        {addresses.length > 0 && (
          <TouchableOpacity
            style={styles.addNewAddressButton}
            onPress={() => {
              // Reset form for adding new address
              setEditAddress({ zonecode: '', roadAddress: '', detailAddress: '', recipient: '', contact: '', customsCode: '' });
              setIsDefaultAddress(false);
              setAddressEditModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="add-circle-outline" size={20} color={COLORS.red} />
            <Text style={styles.addNewAddressText}>{t('payment.addNewAddress') || 'Add new address'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTransferMethod = () => {
    const methods = checkoutData?.transportationMethods ?? [
      { deliveryName: 'ship' },
      { deliveryName: 'air' },
    ];
    return (
      <View style={styles.transportationSection}>
        <Text style={styles.transportationTitle}>{t('payment.transportationMethod') || 'Transportation method'}</Text>
        {/* <Text style={styles.transportationSubtitle}>Shipping Method</Text> */}
        {methods.map((method) => {
          const key = method.deliveryName;
          const isSelected = selectedTransportType === key;
          const price = method.defaultPrice;
          const time = method.shippingTimeRequired;
          return (
            <TouchableOpacity
              key={key}
              style={styles.transportationOption}
              onPress={() => setSelectedTransportType(key)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.transportationOptionText,
                  isSelected && styles.transportationOptionTextSelected,
                ]}>
                  {/* 알려진 운송 키('ship' / 'air') 는 i18n 키로 매핑하고,
                      그 외 백엔드가 보내는 임의 키는 capitalize 한 원문 사용. */}
                  {key === 'ship'
                    ? t('payment.transportShip') || 'Ship'
                    : key === 'air'
                      ? t('payment.transportAir') || 'Air'
                      : key.charAt(0).toUpperCase() + key.slice(1)}
                </Text>
                {/* {(price != null || time) ? (
                  <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.gray[500] }}> */}
                    {/* {price != null ? formatPriceKRW(price) : ''}{price != null && time ? '  ·  ' : ''} */}
                    {/* {time ?? ''}
                  </Text>
                ) : null} */}
              </View>
              <View style={[
                styles.transportationRadio,
                isSelected && styles.transportationRadioSelected,
              ]}>
                {isSelected && <Icon name="checkmark" size={16} color={COLORS.white} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const availableCoupons = checkoutData?.availableCoupons ?? [];
  const productCoupons = availableCoupons.filter((c: any) => c.type !== 'shipping');
  const shippingCoupons = availableCoupons.filter((c: any) => c.type === 'shipping');
  const selectedProductCoupon = selectedProductCouponState;
  const selectedShippingCoupon = selectedShippingCouponState;
  const productCouponDiscount = selectedProductCoupon?.applicableDiscount ?? selectedProductCoupon?.amount ?? 0;
  const shippingCouponDiscount = selectedShippingCoupon?.applicableDiscount ?? selectedShippingCoupon?.amount ?? 0;
  const couponDiscount = productCouponDiscount + shippingCouponDiscount;
  const finalTotal = productTotalKRW + shippingTotalKRW - pointsDiscount - couponDiscount;

  const renderPriceBreakdown = () => (
    <View style={styles.priceSection}>
      <Text style={styles.priceBreakdownTitle}>{t('payment.priceBreakdown') || 'Price breakdown'}</Text>

      {/* Items total */}
      <View style={styles.priceRow}>
        <Text style={styles.priceRowLabel}>{t('payment.itemsTotal') || 'Items total'}</Text>
        <Text style={[styles.priceRowValue, { fontSize: FONTS.sizes.md }]}>{formatPriceKRW(subtotal)}</Text>
      </View>

      {/* Product coupon selector */}
      {productCoupons.length > 0 && (
        <View style={styles.couponSelectorBlock}>
          <View style={styles.couponSelectorRow}>
            <Icon name="ticket-outline" size={14} color={COLORS.red} />
            <Text style={styles.couponSelectorLabel}>{t('payment.productCoupon') || 'Product coupon'}</Text>
            {selectedProductCoupon && (
              <Text style={styles.couponDiscountText}>-{formatPriceKRW(productCouponDiscount)}</Text>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {productCoupons.map((c: any) => {
              const isSelected = selectedProductCoupon?.usageId === c.usageId;
              return (
                <TouchableOpacity
                  key={c.usageId}
                  style={[styles.couponChip, isSelected && styles.couponChipActive]}
                  onPress={() => setSelectedProductCouponState(isSelected ? null : c)}
                >
                  <Text style={[styles.couponChipText, isSelected && styles.couponChipTextActive]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={[styles.couponChipAmount, isSelected && styles.couponChipTextActive]}>
                    -{formatPriceKRW(c.applicableDiscount ?? c.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Shipping */}
      <View style={styles.priceRow}>
        <Text style={styles.priceRowLabelGray}>{t('payment.shipping') || 'Shipping'}</Text>
        <Text style={styles.priceRowValue}>{formatPriceKRW(shippingTotalKRW)}</Text>
      </View>

      {/* Shipping coupon selector */}
      {shippingCoupons.length > 0 && (
        <View style={styles.couponSelectorBlock}>
          <View style={styles.couponSelectorRow}>
            <Icon name="ticket-outline" size={14} color={COLORS.red} />
            <Text style={styles.couponSelectorLabel}>{t('payment.shippingCoupon') || 'Shipping coupon'}</Text>
            {selectedShippingCoupon && (
              <Text style={styles.couponDiscountText}>-{formatPriceKRW(shippingCouponDiscount)}</Text>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {shippingCoupons.map((c: any) => {
              const isSelected = selectedShippingCoupon?.usageId === c.usageId;
              return (
                <TouchableOpacity
                  key={c.usageId}
                  style={[styles.couponChip, isSelected && styles.couponChipActive]}
                  onPress={() => setSelectedShippingCouponState(isSelected ? null : c)}
                >
                  <Text style={[styles.couponChipText, isSelected && styles.couponChipTextActive]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={[styles.couponChipAmount, isSelected && styles.couponChipTextActive]}>
                    -{formatPriceKRW(c.applicableDiscount ?? c.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Points */}
      {availablePointsAmount > 0 && (
        <View style={styles.couponSelectorBlock}>
          <View style={styles.couponSelectorRow}>
            <Icon name="star-outline" size={14} color={COLORS.red} />
            <Text style={styles.couponSelectorLabel}>{t('payment.points') || 'Points'}</Text>
            <Text style={styles.availablePointsText}>
              {availablePointsAmount.toLocaleString()}P available (= {formatPriceKRW(maxPointsKRW)})
            </Text>
          </View>
          <View style={styles.pointsInputRow}>
            <TextInput
              style={styles.pointsInputField}
              value={pointsInput}
              onChangeText={(v) => {
                const num = parseInt(v.replace(/[^0-9]/g, ''), 10);
                if (isNaN(num)) {
                  setPointsInput('');
                } else {
                  setPointsInput(String(Math.min(num, availablePointsAmount)));
                }
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.text.secondary}
            />
            <Text style={styles.availablePointsText}>P</Text>
            <TouchableOpacity
              style={styles.paymentUseAllButton}
              onPress={() => setPointsInput(String(availablePointsAmount))}
            >
              <Text style={styles.paymentUseAllText}>{t('payment.useAll') || 'Use all'}</Text>
            </TouchableOpacity>
            {pointsDiscount > 0 && (
              <Text style={styles.couponDiscountText}>-{formatPriceKRW(pointsDiscount)}</Text>
            )}
          </View>
        </View>
      )}

      {/* Extra discounts */}
      {(couponDiscount + pointsDiscount) > 0 && (
        <View style={styles.priceRow}>
          <Text style={styles.priceRowLabelGray}>{t('payment.extraDiscounts') || 'Extra discounts'}</Text>
          <Text style={styles.priceRowValueRed}>-{formatPriceKRW(couponDiscount + pointsDiscount)}</Text>
        </View>
      )}

      {/* Estimated total */}
      <View style={styles.estimatedTotalRow}>
        <Text style={styles.estimatedTotalLabel}>{t('payment.estimatedTotal') || 'Estimated total'}</Text>
        <Text style={styles.estimatedTotalValue}>{formatPriceKRW(finalTotal)}</Text>
      </View>
    </View>
  );

  // Create order mutation
  const { mutate: createOrder, isLoading: isCreatingOrder } = useCreateOrderMutation({
    onSuccess: (data) => {
      const orderNumber = data?.order?.orderNumber;
      showToast(orderNumber ? `Order ${orderNumber} created` : 'Order created successfully', 'success');
      navigation.reset({ index: 0, routes: [{ name: 'BuyList' as never }] });
    },
    onError: (error) => {
      Alert.alert('Error', error || 'Failed to create order. Please try again.');
    },
  });

  const { mutate: createOrderDirectPurchase, isLoading: isCreatingDirectOrder } = useCreateOrderDirectPurchaseMutation({
    onSuccess: (data) => {
      const orderNumber = data?.order?.orderNumber;
      showToast(orderNumber ? `Order ${orderNumber} created` : 'Order created successfully', 'success');
      navigation.reset({ index: 0, routes: [{ name: 'BuyList' as never }] });
    },
    onError: (error) => {
      Alert.alert('Error', error || 'Failed to create order. Please try again.');
    },
  });

  const handleConfirm = () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (selectedPaymentMethod === 'bank' && !memberName.trim()) {
      Alert.alert('Error', t('payment.enterMemberName') || 'Please enter member name');
      return;
    }

    const paymentMethodMap: Record<string, 'deposit' | 'bank' | 'card'> = {
      'deposit': 'deposit',
      'bank': 'bank',
      'credit_card': 'card',
      'kakaopay': 'deposit',
      'naverpay': 'deposit',
    };
    const paymentMethod = paymentMethodMap[selectedPaymentMethod] || 'bank';
    const transferMethod: 'air' | 'ship' = selectedTransportType === 'ship' ? 'ship' : 'air';
    const couponUsageId = selectedProductCoupon?.usageId || selectedProductCoupon?.id;
    const shippingCouponUsageId = selectedShippingCoupon?.usageId || selectedShippingCoupon?.id;

    if (fromCart) {
      if (items.length === 0) {
        Alert.alert('Error', 'No items to order');
        return;
      }
      const cartItems = items
        .map(item => item._id || item.id)
        .filter(id => id);
      if (cartItems.length === 0) {
        Alert.alert('Error', 'Invalid cart items - no valid IDs found');
        return;
      }
      const quantities: Record<string, number> = {};
      items.forEach(item => {
        const itemId = item._id || item.id;
        if (itemId) quantities[itemId] = item.quantity || 1;
      });
      const orderTypeMap: Record<string, 'General' | 'VVIC' | 'Rocket'> = {
        'general': 'General',
        'vvic': 'VVIC',
        'rocket': 'Rocket',
      };
      const orderType = orderTypeMap[selectedDeliveryMethod] || 'General';
      const allNotes = items
        .map(item => {
          const note = productNotes[item.id];
          return note ? `${safeText(item.name)}: ${note}` : '';
        })
        .filter(note => note)
        .join('\n');

      const orderLineItems = buildCreateOrderLineItems(
        cartItems,
        quantities,
        checkoutData?.selectedItems ?? items.map((item) => ({
          _id: item._id || item.id,
          id: item._id || item.id,
          offerId: item.offerId,
          subject: item.name,
          productName: item.name,
          imageUrl: item.image,
          source: item.source,
          quantity: item.quantity,
          skuInfo: item.skuInfo,
          companyName: item.companyName,
          sellerOpenId: item.sellerOpenId,
        })),
        items.map((item) => ({
          id: item._id || item.id,
          offerId: item.offerId,
          productName: item.name,
          productImage: item.image,
          source: item.source,
          quantity: item.quantity,
        })),
        locale,
      );

      // 선택된 주소 객체를 풀-shape 로 함께 전송 — addressId 만으로 backend 가
      // 조회 실패할 경우에도 주소 정보가 보존되도록 보장.
      const shippingAddress = buildShippingAddressFromAddress(selectedAddress as any);

      const orderRequest = {
        cartItems,
        quantities,
        items: orderLineItems,
        estimatedShippingCostBySeller: estimatedShippingCostBySeller || {},
        netExpectedTotalKRW: Math.round(finalTotal),
        userCouponUsageId: couponUsageId || undefined,
        userShippingCouponUsageId: shippingCouponUsageId || '',
        orderType,
        transferMethod,
        flow: 'general' as const,
        paymentMethod,
        addressId: selectedAddress.id,
        ...(shippingAddress ? { shippingAddress } : {}),
        ...(allNotes && { notes: allNotes }),
        ...(enteredPoints > 0 && { pointsToUse: enteredPoints }),
        ...(paymentMethod === 'bank' && { memberName: memberName.trim() }),
      };
      createOrder(orderRequest);
      return;
    }

    // Direct purchase (from product detail)
    if (!directPurchaseItems || directPurchaseItems.length === 0) {
      Alert.alert('Error', 'No direct purchase items. Please try again from the product page.');
      return;
    }
    const designatedShootingCount = directPurchaseItems.reduce(
      (sum, it) => sum + (Array.isArray(it.designatedShooting) ? it.designatedShooting.length : 0),
      0
    );
    // direct purchase 흐름에서도 풀-주소 객체를 함께 전송 — backend 보존 보장.
    const directShippingAddress = buildShippingAddressFromAddress(selectedAddress as any);

    const directRequest = {
      items: directPurchaseItems,
      designatedShootingImageCount: designatedShootingCount || undefined,
      estimatedShippingCostBySeller: estimatedShippingCostBySeller || {},
      addressId: selectedAddress.id,
      ...(directShippingAddress ? { shippingAddress: directShippingAddress } : {}),
      paymentMethod,
      serviceCode: '',
      transferMethod,
      flow: 'general' as const,
      userCouponUsageId: couponUsageId || undefined,
      userShippingCouponUsageId: shippingCouponUsageId || '',
      pointsToUse: enteredPoints > 0 ? enteredPoints : 0,
      netExpectedTotalKRW: Math.round(finalTotal),
      ...(paymentMethod === 'bank' && { memberName: memberName.trim() }),
    };
    createOrderDirectPurchase(directRequest);
  };

  const renderBottomBar = () => {
    const itemCount = items.length;
    const totalDiscount = couponDiscount + pointsDiscount;
    
    return (
      <View style={[styles.bottomBar, { paddingBottom: SPACING.md + insets.bottom }]}>
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomBarLeft}>
            <Text style={styles.bottomBarBreakdown}>
              <Text style={styles.bottomBarBreakdownBold}>{t('payment.breakdown') || 'Breakdown'}</Text>
              <Text style={styles.bottomBarBreakdownLight}> {itemCount} {itemCount > 1 ? (t('payment.itemsInTotal') || 'items in total') : (t('payment.itemInTotal') || 'item in total')}</Text>
            </Text>
            {totalDiscount > 0 && (
              <Text style={styles.bottomBarDiscount}>¥{totalDiscount.toFixed(0)} {t('payment.offInTotal') || 'off in total'}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.confirmButton, (isCreatingOrder || isCreatingDirectOrder || !selectedAddress) && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={isCreatingOrder || isCreatingDirectOrder || !selectedAddress}
          >
            {(isCreatingOrder || isCreatingDirectOrder) ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.confirmButtonText}>
                {t('payment.amountPaid') || 'Amount paid'}: {formatPriceKRW(finalTotal)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        stickyHeaderIndices={[0]}
        onScroll={(event) => {
          const scrollY = event.nativeEvent.contentOffset.y;
          setIsAddressCollapsed(scrollY > 10);
        }}
        scrollEventThrottle={16}
      >
        {renderAddress()}
        {renderOrderItems()}
        {renderTransferMethod()}
        {renderPriceBreakdown()}
        {renderPaymentMethods()}
        
        <View style={styles.bottomSpace} />
      </ScrollView>
      
      {renderBottomBar()}
      
      {selectedProductForPhoto && (
        <PhotoCaptureModal
          visible={photoCaptureVisible}
          onClose={() => {
            setPhotoCaptureVisible(false);
            setSelectedProductForPhoto(null);
          }}
          onConfirm={handlePhotoCaptureConfirm}
          product={{
            id: selectedProductForPhoto.id,
            name: safeText(selectedProductForPhoto.name),
            image: selectedProductForPhoto.image,
            price: selectedProductForPhoto.price,
          }}
        />
      )}
      
      <InputCheckServiceModal
        visible={inputCheckServiceVisible}
        onClose={() => setInputCheckServiceVisible(false)}
        onConfirm={handleInputCheckServiceConfirm}
      />
      
      <OrderServiceModal
        visible={orderServiceVisible}
        onClose={() => setOrderServiceVisible(false)}
        onConfirm={handleOrderServiceConfirm}
      />
      
      <CouponModal
        visible={couponModalVisible}
        onClose={() => setCouponModalVisible(false)}
        onConfirm={handleCouponConfirm}
        selectedCouponId={selectedProductCoupon?.id ?? selectedShippingCoupon?.id}
      />

      {/* Address Add/Edit Modal */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']} visible={addressEditModalVisible} transparent animationType="slide" onRequestClose={() => setAddressEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.addressModalContent}>
            <View style={styles.addressModalHeader}>
              <Text style={styles.addressModalTitle}>{(selectedAddress && !editAddress.recipient) || editAddress.recipient?.length === 0 ? (t('payment.newAddress') || 'New address') : (t('payment.editAddress') || 'Edit address')}</Text>
              <TouchableOpacity onPress={() => setAddressEditModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.addressModalLabel}>{t('payment.currentlyDeliveringTo') || 'Currently delivering to:'}</Text>
              <View style={styles.addressModalRow}>
                <View style={styles.addressModalDropdown}>
                  <Text style={styles.addressModalDropdownText}>{t('payment.countryKorea') || '한국'}</Text>
                  <Icon name="chevron-down" size={20} color={COLORS.gray[600]} />
                </View>
                <TouchableOpacity style={styles.defaultCheckboxRow} onPress={() => setIsDefaultAddress(!isDefaultAddress)}>
                  <Text style={styles.defaultText}>{t('payment.default') || 'Default'}</Text>
                  <View style={[styles.checkboxSquare, isDefaultAddress && styles.checkboxSquareChecked]}>
                    {isDefaultAddress && <Icon name="checkmark" size={16} color={COLORS.white} />}
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>{t('payment.addressInformation') || 'Address information:'}</Text>
              <TouchableOpacity style={styles.addressSearchBtn} onPress={() => setShowKakaoAddress(true)}>
                <Icon name="search" size={16} color={COLORS.white} />
                <Text style={styles.addressSearchBtnText}>{t('payment.searchAddressKakao') || 'Search Address (Kakao)'}</Text>
              </TouchableOpacity>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>{t('payment.postalCode') || 'Postal code:'}</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder={t('payment.zipPlaceholder') || 'e.g. 06000'}
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.zonecode}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, zonecode: v }))}
                keyboardType="number-pad"
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>{t('payment.detailAddressLabel') || 'Detail address:'}</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder={t('payment.addressSearchPlaceholder') || 'Search address above or enter manually'}
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.detailAddress}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, detailAddress: v }))}
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>{t('payment.recipientName') || 'Recipient name:'}</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder={t('payment.detailAddressPlaceholder') || 'Up to 25 characters'}
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.recipient}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, recipient: v }))}
                maxLength={25}
              />

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>{t('payment.mobileNumber') || 'Mobile number:'}</Text>
              <View style={styles.addressModalPhoneRow}>
                <View style={styles.addressModalPhoneCode}>
                  <Text style={{ fontSize: FONTS.sizes.sm, color: COLORS.text.primary }}>{t('payment.countryKoreaCode') || '한국 +82'}</Text>
                  <Icon name="chevron-down" size={20} color={COLORS.gray[600]} />
                </View>
                <TextInput
                  style={[styles.addressModalInput, { flex: 1 }]}
                  value={editAddress.contact}
                  onChangeText={(v) => setEditAddress(prev => ({ ...prev, contact: v }))}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.addressModalLabel}><Text style={styles.addressModalRequired}>* </Text>{t('payment.customsClearanceCode') || 'Customs clearance code:'}</Text>
              <TextInput
                style={styles.addressModalInput}
                placeholder={t('payment.customsCodePlaceholder') || 'Please enter the customs clearance code'}
                placeholderTextColor={COLORS.gray[400]}
                value={editAddress.customsCode}
                onChangeText={(v) => setEditAddress(prev => ({ ...prev, customsCode: v }))}
              />

              <TouchableOpacity
                style={styles.addressModalSaveButton}
                onPress={async () => {
                  const detail = (editAddress.detailAddress || editAddress.roadAddress || '').trim();
                  if (!detail || detail.length < 2) {
                    showToast(t('payment.detailAddressMin2') || 'Please enter detailed address (at least 2 characters)', 'error');
                    return;
                  }
                  setIsSavingAddress(true);
                  try {
                    const addressData = buildAddressSubmitBody({
                      addressType: 'personal',
                      recipient: editAddress.recipient,
                      contact: editAddress.contact,
                      mainAddress: editAddress.roadAddress || '',
                      detailedAddress: detail,
                      zipCode: editAddress.zonecode,
                      personalCustomsCode: editAddress.customsCode,
                      defaultAddress: isDefaultAddress,
                      note: '',
                    });

                    let response;
                    if (selectedAddress?.id) {
                      // Update existing address
                      response = await addressApi.updateAddress(selectedAddress.id, addressData);
                    } else {
                      // Add new address
                      response = await addressApi.addAddress(addressData);
                    }

                    if (response.success) {
                      showToast(getAddressSaveSuccessMessage(Boolean(selectedAddress?.id), t), 'success');
                      setAddressEditModalVisible(false);
                      // Update user context with new addresses
                      if (response.data?.addresses) {
                        const mappedAddresses = response.data.addresses.map((addr: any) => ({
                          id: addr._id || addr.id || '',
                          type: (addr.customerClearanceType === 'business' ? 'work' : 'home') as 'home' | 'work' | 'other',
                          name: addr.recipient || '',
                          street: addr.detailedAddress || '',
                          city: addr.mainAddress || '',
                          state: '',
                          zipCode: addr.zipCode || '',
                          country: '',
                          phone: addr.contact || '',
                          isDefault: addr.defaultAddress || false,
                          personalCustomsCode: addr.personalCustomsCode || '',
                          note: addr.note || '',
                          customerClearanceType: addr.customerClearanceType || 'individual',
                        }));
                        updateUser({ addresses: mappedAddresses });
                        // Update selectedAddress state to match the saved address
                        const savedAddress = mappedAddresses.find(addr => addr.phone === editAddress.contact && addr.zipCode === editAddress.zonecode);
                        if (savedAddress) {
                          setSelectedAddress(savedAddress);
                        }
                      }
                      // Reset form
                      setEditAddress({ zonecode: '', roadAddress: '', detailAddress: '', recipient: '', contact: '', customsCode: '' });
                      setIsDefaultAddress(false);
                    } else {
                      console.error('Address save failed:', response.error);
                      showToast(resolveAddressSaveError(response.error, t), 'error');
                    }
                  } catch (error: any) {
                    console.error('Address save error:', error);
                    showToast(resolveAddressSaveError(error, t), 'error');
                  } finally {
                    setIsSavingAddress(false);
                  }
                }}
              >
                {isSavingAddress ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.addressModalSaveButtonText}>{t('payment.save') || 'Save'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Kakao Address Search WebView */}
      <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']} visible={showKakaoAddress} transparent animationType="slide" onRequestClose={() => setShowKakaoAddress(false)}>
        <View style={styles.kakaoModalOverlay}>
          <View style={styles.kakaoModalContent}>
            <View style={styles.kakaoModalHeader}>
              <Text style={styles.kakaoModalTitle}>{t('payment.searchAddress') || 'Search Address'}</Text>
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
                  console.log('Kakao address data received:', data);
                  
                  if (data.zonecode && data.roadAddress) {
                    setEditAddress(prev => ({
                      ...prev,
                      zonecode: data.zonecode || '',
                      roadAddress: data.roadAddress || '',
                      detailAddress: data.roadAddress || '',
                    }));
                    
                    // Close modal after a short delay to ensure state updates are processed
                    setTimeout(() => {
                      setShowKakaoAddress(false);
                    }, 100);
                    
                    showToast('Address selected successfully', 'success');
                  } else {
                    console.warn('Incomplete address data:', data);
                    showToast('Please select a complete address', 'error');
                  }
                } catch (err) {
                  console.error('Error parsing Kakao address data:', err);
                  showToast('Failed to parse address data', 'error');
                }
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
    backgroundColor: COLORS.white,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    // 상태바 인셋은 외부 SafeAreaView 의 paddingTop: insets.top 이 이미
    // 처리하므로 헤더는 일반적인 vertical padding 만 갖는다. 기존
    // paddingTop: SPACING['2xl'] * 2 는 인셋과 중복되어 헤더와 그 위
    // 사이에 큰 빈 공간을 만들고 있었음.
    paddingVertical: SPACING.sm,
    // White background — explicit on every device (mobile + tablet) so
    // the header doesn't inherit any darker gray from a parent in
    // certain RN versions.
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerRight: {
    padding: SPACING.xs,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    // Body background also white so the area below the header reads as
    // one continuous white surface, matching the user's requested look
    // (was the app-wide `COLORS.background` light-gray before).
    backgroundColor: COLORS.white,
  },
  sellerGroup: {
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    // borderBottomWidth: 1,
    // borderBottomColor: COLORS.gray[100],
  },
  platformName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.red,
  },
  sellerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
    backgroundColor: COLORS.gray[100],
  },
  itemDetails: {
    flex: 1,
    gap: SPACING.xs,
  },
  itemName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
    fontWeight: '400',
  },
  itemVariant: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '400',
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  itemPrice: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  itemOriginalPrice: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
    textDecorationLine: 'line-through',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0000000D',
    overflow: 'hidden',
  },
  quantityButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  quantityText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    minWidth: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    flexDirection: 'row',
  },
  lastInfoSection: {
    paddingBottom: SPACING.md,
  },
  infoLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
    width: 100,
  },
  infoValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    flex: 1,
  },
  infoValueGray: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    flex: 1,
  },
  noteSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    padding: 0,
    minHeight: 20,
  },
  serviceSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  serviceTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginLeft: SPACING.xs,
  },
  servicePrice: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  paymentSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.background,
    backgroundColor: COLORS.white,
  },
  paymentSectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  paymentMethodLeft: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  paymentMethodNameSelected: {
    color: COLORS.red,
    fontWeight: '700',
  },
  paymentMethodBalance: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: SPACING.xs,
  },
  paymentMethodRadio: {
    width: 24,
    height: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodRadioSelected: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  paymentDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  paymentDropdownText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  paymentDropdownMenu: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  paymentDropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  paymentDropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  paymentDropdownItemActive: {
    backgroundColor: COLORS.gray[50],
  },
  paymentDropdownItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  paymentDropdownItemTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  paymentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  paymentInputField: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    minWidth: 40,
  },
  paymentBalanceText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'right',
  },
  paymentUseAllButton: {
    backgroundColor: COLORS.black,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  paymentUseAllText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: '600',
  },
  paymentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    marginTop: SPACING.md
  },
  paymentInfoLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    width: 80,
  },
  paymentInfoTextCopy: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs
  },
  paymentInfoValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.red,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.red,
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  paymentMethodText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  balanceText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginTop: SPACING.xs / 2,
  },
  paymentMethodIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodIconText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardOptions: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  cardOption: {
    width: 60,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  orderServiceSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  memoSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  memoInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addressSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  locationIcon: {
    marginTop: 2,
  },
  addressInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  addressFullText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    lineHeight: Math.round(FONTS.sizes.md * 20 / 16),
  },
  addressPhone: {
    fontSize: FONTS.sizes.md,
    color: '#666666',
    lineHeight: Math.round(FONTS.sizes.md * 18 / 16),
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.sm,
  },
  addNewAddressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '500',
  },
  addressText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    flex: 1,
    marginLeft: SPACING.sm,
    fontWeight: '400',
  },
  transportationSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  transportationTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  transportationSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    fontWeight: '400',
  },
  transportationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  transportationOptionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  transportationOptionTextSelected: {
    color: COLORS.red,
    fontWeight: '700',
  },
  transportationRadio: {
    width: 24,
    height: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transportationRadioSelected: {
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
  },
  addressSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  editAddressText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '500',
  },
  addressList: {
    gap: SPACING.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  addressName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginRight: SPACING.sm,
  },
  addressCity: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginTop: SPACING.xs,
  },
  defaultBadge: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  defaultBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[50],
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.red,
    borderStyle: 'dashed',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  addAddressButtonText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.red,
    fontWeight: '500',
  },
  priceSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 8,
    borderBottomColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  priceBreakdownTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  priceRowLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  priceRowLabelGray: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
  },
  priceRowValue: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.primary,
    fontWeight: '700',
  },
  priceRowValueRed: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    fontWeight: '600',
  },
  shippingSavingsRow: {
    paddingVertical: SPACING.xs,
  },
  shippingSavingsText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
  },
  shippingSavingsAmount: {
    color: COLORS.red,
    fontWeight: '600',
  },
  estimatedTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  estimatedTotalLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  estimatedTotalValue: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  priceSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  priceLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
  },
  priceValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  availablePointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  availablePointsText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
  },
  pointsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pointsInputField: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  couponText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
  },
  couponSelectorBlock: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  couponSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  couponSelectorLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    marginRight: SPACING.xs,
  },
  couponChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    marginRight: SPACING.xs,
  },
  couponChipActive: {
    borderColor: COLORS.red,
    backgroundColor: '#FFF0F0',
  },
  couponChipText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[600],
  },
  couponChipAmount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    marginTop: 1,
  },
  couponChipTextActive: {
    color: COLORS.red,
    fontWeight: '600',
  },
  couponDiscountText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  couponRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  totalValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.red,
  },
  bottomSpace: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    ...SHADOWS.lg,
  },
  bottomBarContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  bottomBarLeft: {
    marginBottom: SPACING.sm,
  },
  bottomBarBreakdown: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
  bottomBarBreakdownBold: {
    fontWeight: '700',
  },
  bottomBarBreakdownLight: {
    color: COLORS.text.secondary,
  },
  bottomBarDiscount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    marginTop: SPACING.xs / 2,
  },
  bottomTotal: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.smmd,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  // Address Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  addressModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  addressModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  addressModalTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  addressModalLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  addressModalRequired: {
    color: COLORS.red,
  },
  addressModalRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  addressModalDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  addressModalDropdownText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  defaultCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  defaultText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  addressModalInput: {
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
  },
  addressModalTextArea: {
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  addressModalPhoneRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  addressModalPhoneCode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    minWidth: 120,
  },
  addressModalCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.red,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSquareChecked: {
    backgroundColor: COLORS.red,
    borderColor: COLORS.red,
  },
  addressModalCheckboxText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[600],
    lineHeight: Math.round(FONTS.sizes.sm * 18 / 14),
  },
  addressModalSaveButton: {
    backgroundColor: COLORS.red,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  addressModalSaveButtonDisabled: {
    backgroundColor: COLORS.gray[300],
    opacity: 0.6,
  },
  addressModalSaveButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
  addressSearchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.red, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    alignSelf: 'flex-start', marginBottom: SPACING.sm,
  },
  addressSearchBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.white, fontWeight: '600' },
  kakaoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  kakaoModalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%' },
  kakaoModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.gray[200],
  },
  kakaoModalTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text.primary },
});

export default PaymentScreen;
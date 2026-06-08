import { getStoredToken, refreshAccessToken } from './authApi';
import { axiosWithAuth } from './authenticatedHttp';

import { API_BASE_URL, CATEGORIES_BASE_URL } from '../constants';
import {
  resolveOrderMainRequestType,
  resolveOrdersProxyOrderType,
} from '../utils/centerManageMeta';
import {
  convertToKRW,
  resolveLocalizedValue,
  resolveOrderItemCompanyName,
  type AppLocale,
} from '../utils/i18nHelpers';

/** Orders list/create proxy (same host as categories-proxy) */
const ORDERS_PROXY_BASE_URL = CATEGORIES_BASE_URL;
import { buildSignatureHeaders } from './signature';
import {
  API_PROGRESS_STATUS_ALIASES,
  isApiProgressStatusRecognized,
} from '../utils/apiProgressStatus';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

const coerceOrderAmount = (value: unknown): number => {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

export interface DesignatedShootingItem {
  note: string;
  photo: string;
}

export interface ItemDetails {
  notes?: string;
  designatedShooting?: DesignatedShootingItem[];
}

/** Line item payload required by orders-proxy (`subject` or `productName`). */
export interface CreateOrderLineItem {
  cartItemId: string;
  _id?: string;
  offerId?: number | string;
  source?: string;
  subject: string;
  productName: string;
  subjectTrans?: string;
  imageUrl?: string;
  quantity: number;
  skuInfo?: unknown;
  companyName?: string | Record<string, string>;
  sellerOpenId?: string;
  negotiationContentImages?: string[];
  note?: string;
  [key: string]: unknown;
}

export interface CreateOrderRequest {
  cartItems: string[];
  quantities: Record<string, number>;
  /** Full line metadata — orders-proxy validates `items[n].subject` / `productName`. */
  items: CreateOrderLineItem[];
  estimatedShippingCostBySeller?: Record<string, number>;
  netExpectedTotalKRW: number;
  userCouponUsageId?: string;
  userShippingCouponUsageId?: string;
  pointsToUse?: number;
  orderType: 'General' | 'VVIC' | 'Rocket';
  transferMethod: 'air' | 'ship';
  flow: 'general';
  paymentMethod: 'deposit' | 'bank' | 'card';
  addressId: string;
  notes?: string;
  /** 협상내역 — uploaded image URLs from device attachments. */
  negotiationContentImages?: string[];
  /** 협상내역 — remarks (비고). */
  note?: string;
  orderMainInfo?: {
    requestType?: string;
    logisticsCenter?: string;
    transferMethod?: string;
    shippingMethod?: string;
    customMethod?: string;
  };
  orderPaymentInfo?: {
    dispatchPayment?: string;
    shipPayment?: string;
  };
}

/** Web orders-proxy line item (POST https://todayggigu.kr/api/orders-proxy). */
export interface OrdersProxyAddService {
  id: string;
  note: string;
  imageUrl: string[];
}

export interface OrdersProxyLineItem {
  otherSite: string;
  offerId: number | string;
  skuId?: number | string;
  specId?: string;
  quantity: number;
  subject?: string;
  subjectTrans?: string;
  imageUrl?: string;
  sellerOpenId?: string;
  skuAttributes?: unknown[];
  companyName?: string | Record<string, string>;
  categoryId?: number | string;
  addServices?: OrdersProxyAddService[];
  negotiationContentImages?: string[];
  note?: string;
  [key: string]: unknown;
}

/** Web orders-proxy create body (matches working web checkout). */
export interface OrdersProxyCreateRequest {
  orderType: string;
  cartItemIds: string[];
  addressId: string;
  dispatchmethod: string;
  dispatchmethodship: string;
  items: OrdersProxyLineItem[];
  /** Checkout total in KRW — helps orders-proxy persist firstTierCost like web. */
  netExpectedTotalKRW?: number;
  orderMainInfo: {
    requestType: string;
    logisticsCenter: string;
    transferMethod: string;
    shippingMethod: string;
    customMethod: string;
  };
}

/** Must match POST /v1/orders/upload-images `kind` enum (not shorthand aliases). */
export type OrderImageUploadKind = 'addServices' | 'negotiationContentImages';

export interface OrderImageUploadFile {
  uri: string;
  fileName?: string;
  type?: string;
}

export interface OrderImageUploadData {
  urls: string[];
  groupedUrls?: Record<string, string[]>;
}

export const toOtherSite = (source?: string): string => {
  const s = String(source ?? '1688').toLowerCase();
  if (s.includes('taobao')) return 'taobao.com';
  return '1688.com';
};

export const mapLogisticsCenterToApi = (
  center: 'haerae' | 'guangzhou' | 'yiwu',
): string => {
  const map: Record<typeof center, string> = {
    haerae: 'Weihai',
    guangzhou: 'Guangzhou',
    yiwu: 'Yiwu',
  };
  return map[center];
};

export const mapApplicationTypeToOrderType = (
  appType: 'sea' | 'air' | 'rocket',
): 'General' | 'VVIC' | 'Rocket' => {
  if (appType === 'rocket') return 'Rocket';
  return 'General';
};

export const mapApplicationTypeToRequestType = (appType: 'sea' | 'air' | 'rocket'): string => {
  if (appType === 'rocket') return 'Rocket';
  if (appType === 'air') return 'Air';
  return 'General';
};

export const mapOrderMainTransferMethod = (appType: 'sea' | 'air' | 'rocket'): string => {
  if (appType === 'rocket') return 'Rocket sea (CJ)';
  if (appType === 'air') return 'Air';
  return 'Sea (LCL)';
};

export const mapShippingMethodToApi = (
  method: 'rocketPallet' | 'rocketDelivery' | 'selfPallet' | 'selfDelivery',
): string => {
  const map: Record<typeof method, string> = {
    rocketPallet: 'Rocket Pallet',
    rocketDelivery: 'Rocket delivery',
    selfPallet: 'Self Pallet',
    selfDelivery: 'Self Delivery',
  };
  return map[method];
};

export const mapCustomsMethodToApi = (method: 'business' | 'personal'): string =>
  method === 'business' ? 'Business' : 'Personal';

export const mapPurchasePaymentToDispatchMethod = (payment: 'manual' | 'auto'): string =>
  payment === 'auto' ? 'buy_auto' : 'buy_manual';

export const mapShippingPaymentToDispatchMethodShip = (payment: 'manual' | 'auto'): string =>
  payment === 'auto' ? 'auto' : 'manual';

/**
 * Per-cart-item overrides for `buildOrdersProxyLineItems`.
 * When provided, the returned value REPLACES the top-level
 * `addServices` / `negotiationContentImages` / `negotiationNote` for
 * that specific cart item, allowing the order modal's multi-card
 * UI to ship each product's own negotiation data and extra-services
 * (see the API contract shown in the order-create response sample).
 */
export type BuildOrdersProxyItemsPerCart = (cartItemId: string) => {
  addServices?: OrdersProxyAddService[];
  negotiationContentImages?: string[];
  negotiationNote?: string;
} | null | undefined;

export type BuildOrdersProxyItemsOptions = {
  locale?: string;
  /** Order-wide fallback when no per-item override is returned. */
  addServices?: OrdersProxyAddService[];
  negotiationContentImages?: string[];
  negotiationNote?: string;
  /** Returns per-cart-item data. Falls back to the order-wide values. */
  perCart?: BuildOrdersProxyItemsPerCart;
};

/** Prefer cart API rows (skuInfo) merged with checkout selectedItems. */
export const mergeOrderSourceItems = (
  cartItemIds: string[],
  checkoutItems: unknown[] = [],
  cartItems: unknown[] = [],
): unknown[] =>
  cartItemIds.map((cartItemId) => {
    const findById = (list: unknown[]) =>
      list.find((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const row = entry as Record<string, unknown>;
        return (
          row._id === cartItemId ||
          row.id === cartItemId ||
          row.cartItemId === cartItemId
        );
      }) as Record<string, unknown> | undefined;

    const fromCart = findById(cartItems);
    const fromCheckout = findById(checkoutItems);

    if (fromCart && fromCheckout) {
      return {
        ...fromCheckout,
        ...fromCart,
        skuInfo: fromCart.skuInfo ?? fromCheckout.skuInfo,
        quantity: fromCheckout.quantity ?? fromCart.quantity,
        // Checkout KRW prices must survive cart row spread (web sends these; Android needs them for orders-proxy).
        previewFinalUnitPriceKRW:
          fromCheckout.previewFinalUnitPriceKRW ?? fromCart.previewFinalUnitPriceKRW,
        userPrice: fromCheckout.userPrice ?? fromCart.userPrice,
        unitPriceKRW: fromCheckout.unitPriceKRW ?? fromCart.unitPriceKRW,
        priceKRW: fromCheckout.priceKRW ?? fromCart.priceKRW,
      };
    }
    return fromCart ?? fromCheckout ?? { _id: cartItemId };
  });

/** 1688 line items must include specId or skuId before orders-proxy create. */
export const validateOrdersProxyLineItems = (items: OrdersProxyLineItem[]): string | null => {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (item.otherSite !== '1688.com') continue;
    const hasSpec = Boolean(item.specId && String(item.specId).trim());
    const hasSku = item.skuId != null && String(item.skuId).trim() !== '';
    if (!hasSpec && !hasSku) {
      return `items[${i}] requires specId or skuId for 1688`;
    }
  }
  return null;
};

const resolveSkuInfoUnitPriceCNY = (
  skuInfo: Record<string, unknown> | undefined,
): number => {
  if (!skuInfo || typeof skuInfo !== 'object') return 0;
  const fenxiao = skuInfo.fenxiaoPriceInfo as { offerPrice?: unknown } | undefined;
  for (const candidate of [
    fenxiao?.offerPrice,
    skuInfo.price,
    skuInfo.consignPrice,
  ]) {
    const n = coerceOrderAmount(candidate);
    if (n > 0) return n;
  }
  return 0;
};

/** KRW unit price from POST /cart/checkout `selectedItems` (or merged cart row). */
export const resolveCheckoutLineUnitPriceKRW = (
  row: Record<string, unknown> | undefined,
  fallbackUnitPriceCNY?: number,
): number => {
  if (row) {
    for (const key of [
      'previewFinalUnitPriceKRW',
      'userPrice',
      'unitPriceKRW',
      'priceKRW',
    ] as const) {
      const n = coerceOrderAmount(row[key]);
      if (n > 0) return n;
    }
    const fromSku = convertToKRW(
      resolveSkuInfoUnitPriceCNY(row.skuInfo as Record<string, unknown> | undefined),
    );
    if (fromSku > 0) return fromSku;
  }
  const fallback = convertToKRW(coerceOrderAmount(fallbackUnitPriceCNY));
  return fallback > 0 ? fallback : 0;
};

/** Build web-shaped `items` for orders-proxy from checkout/cart rows. */
export const buildOrdersProxyLineItems = (
  cartItemIds: string[],
  quantities: Record<string, number>,
  sourceItems: unknown[] = [],
  fallbackCards: CreateOrderCardFallback[] = [],
  options: BuildOrdersProxyItemsOptions = {},
): OrdersProxyLineItem[] => {
  const {
    locale = 'ko',
    addServices,
    negotiationContentImages,
    negotiationNote,
    perCart,
  } = options;

  return cartItemIds.map((cartItemId) => {
    // Per-cart overrides win over the order-wide defaults so the
    // multi-card order modal can ship each product's own services and
    // negotiation. When `perCart` returns nothing for an id, fall back
    // to the order-wide values for backward compatibility.
    const override = perCart?.(cartItemId);
    const itemServices = override?.addServices ?? addServices;
    const itemNegImages =
      override?.negotiationContentImages ?? negotiationContentImages;
    const itemNoteRaw = override?.negotiationNote ?? negotiationNote;
    const itemNote = itemNoteRaw?.trim();
    const raw = sourceItems.find((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const row = entry as Record<string, unknown>;
      return (
        row._id === cartItemId ||
        row.id === cartItemId ||
        row.cartItemId === cartItemId
      );
    }) as Record<string, unknown> | undefined;

    const card = fallbackCards.find((c) => c.id === cartItemId);
    const skuInfo = raw?.skuInfo as Record<string, unknown> | undefined;
    const source = String(raw?.source ?? card?.source ?? '1688');
    const title =
      (raw && pickCartLineTitle(raw, locale)) ||
      card?.productName?.trim() ||
      'Product';
    const qty =
      quantities[cartItemId] ??
      (typeof raw?.quantity === 'number' ? raw.quantity : undefined) ??
      card?.quantity ??
      1;

    const skuIdRaw = skuInfo?.skuId ?? raw?.skuId ?? card?.skuId;
    const skuId =
      typeof skuIdRaw === 'number' || typeof skuIdRaw === 'string' ? skuIdRaw : undefined;
    const specIdRaw = skuInfo?.specId ?? raw?.specId ?? card?.specId;
    const specId = specIdRaw != null && String(specIdRaw).trim() ? String(specIdRaw) : undefined;
    const otherSite = toOtherSite(source);
    const unitPriceKRW =
      resolveCheckoutLineUnitPriceKRW(raw, card?.unitPriceCNY) ||
      coerceOrderAmount(card?.unitPriceKRW);
    const subtotalKRW = unitPriceKRW > 0 ? unitPriceKRW * qty : undefined;

    return {
      otherSite,
      offerId: (raw?.offerId as number | string | undefined) ?? card?.offerId ?? '',
      ...(skuId != null && skuId !== '' ? { skuId } : {}),
      ...(specId ? { specId } : {}),
      ...(skuInfo && typeof skuInfo === 'object' ? { skuInfo } : {}),
      quantity: qty,
      subject: title,
      subjectTrans: raw?.subjectTrans != null ? String(raw.subjectTrans) : undefined,
      imageUrl:
        (typeof raw?.imageUrl === 'string' ? raw.imageUrl : undefined) ??
        card?.productImage ??
        undefined,
      sellerOpenId: raw?.sellerOpenId != null ? String(raw.sellerOpenId) : undefined,
      skuAttributes: skuInfo?.skuAttributes as unknown[] | undefined,
      companyName: raw?.companyName as string | Record<string, string> | undefined,
      categoryId: raw?.categoryId as number | string | undefined,
      ...(unitPriceKRW > 0
        ? {
            userPrice: unitPriceKRW,
            price: unitPriceKRW,
            previewFinalUnitPriceKRW: unitPriceKRW,
            subtotal: subtotalKRW,
          }
        : {}),
      ...(itemServices && itemServices.length > 0
        ? { addServices: itemServices }
        : {}),
      ...(itemNegImages && itemNegImages.length > 0
        ? { negotiationContentImages: itemNegImages }
        : {}),
      ...(itemNote ? { note: itemNote } : {}),
    };
  });
};

export type BuildOrdersProxyCreateParams = {
  cartItemIds: string[];
  addressId: string;
  /** From GET /center-manage/meta — Korean labels as on web */
  businessType: string;
  logisticsCenter: string;
  transportMethod: string;
  applicationCategory: string;
  customsClearance: string;
  purchasePayment: 'manual' | 'auto';
  shippingPayment: 'manual' | 'auto';
  items: OrdersProxyLineItem[];
  netExpectedTotalKRW?: number;
};

export const buildOrdersProxyCreateRequest = (
  params: BuildOrdersProxyCreateParams,
): OrdersProxyCreateRequest => {
  const orderType = resolveOrdersProxyOrderType(params.transportMethod);
  const requestType = resolveOrderMainRequestType(
    params.transportMethod,
    params.businessType,
  );

  return {
    orderType,
    cartItemIds: params.cartItemIds,
    addressId: params.addressId,
    dispatchmethod: mapPurchasePaymentToDispatchMethod(params.purchasePayment),
    dispatchmethodship: mapShippingPaymentToDispatchMethodShip(params.shippingPayment),
    items: params.items,
    ...(params.netExpectedTotalKRW != null && params.netExpectedTotalKRW > 0
      ? { netExpectedTotalKRW: params.netExpectedTotalKRW }
      : {}),
    orderMainInfo: {
      requestType,
      logisticsCenter: params.logisticsCenter,
      transferMethod: params.transportMethod,
      shippingMethod: params.applicationCategory,
      customMethod: params.customsClearance,
    },
  };
};

export const isOrdersProxyCreateRequest = (
  request: CreateOrderRequest | OrdersProxyCreateRequest,
): request is OrdersProxyCreateRequest => {
  const proxy = request as OrdersProxyCreateRequest;
  return (
    Array.isArray(proxy.cartItemIds) &&
    typeof proxy.dispatchmethod === 'string' &&
    typeof proxy.dispatchmethodship === 'string' &&
    proxy.orderMainInfo != null
  );
};

export const convertLegacyCreateOrderToProxy = (
  req: CreateOrderRequest,
): OrdersProxyCreateRequest => {
  const items = buildOrdersProxyLineItems(
    req.cartItems,
    req.quantities,
    req.items as unknown[],
    [],
    {
      negotiationContentImages: req.negotiationContentImages,
      negotiationNote: req.note,
    },
  );

  const dispatchmethod =
    req.orderPaymentInfo?.dispatchPayment === 'auto' ? 'buy_auto' : 'buy_manual';
  const dispatchmethodship =
    req.orderPaymentInfo?.shipPayment === 'auto' ? 'auto' : 'manual';

  return {
    orderType: req.orderType,
    cartItemIds: req.cartItems,
    addressId: req.addressId,
    dispatchmethod,
    dispatchmethodship,
    items,
    ...(req.netExpectedTotalKRW > 0 ? { netExpectedTotalKRW: req.netExpectedTotalKRW } : {}),
    orderMainInfo: {
      requestType: req.orderMainInfo?.requestType ?? req.orderType,
      logisticsCenter: req.orderMainInfo?.logisticsCenter ?? 'Weihai',
      transferMethod: req.orderMainInfo?.transferMethod ?? 'Sea (LCL)',
      shippingMethod: req.orderMainInfo?.shippingMethod ?? 'Rocket delivery',
      customMethod: req.orderMainInfo?.customMethod ?? 'Personal',
    },
  };
};

const pickCartLineTitle = (
  item: Record<string, unknown>,
  locale: string,
): string => {
  const multi = item.subjectMultiLang as Record<string, string> | undefined;
  if (multi && typeof multi === 'object') {
    const fromMulti = multi[locale] || multi.ko || multi.en || multi.zh;
    if (fromMulti && String(fromMulti).trim()) return String(fromMulti).trim();
  }
  const direct = item.subjectTrans || item.subject || item.productName || item.name;
  return String(direct ?? '').trim();
};

export type CreateOrderCardFallback = {
  id: string;
  offerId?: string;
  productName?: string;
  productImage?: string | null;
  source?: string;
  quantity?: number;
  specId?: string;
  skuId?: string | number;
  /** KRW unit price from checkout — used when merged row lacks previewFinalUnitPriceKRW. */
  unitPriceKRW?: number;
  /** Cart UI unit price in CNY — last-resort when checkout omits KRW fields. */
  unitPriceCNY?: number;
};

/** Build `items` array for POST /orders-proxy from checkout rows or cart UI cards. */
export const buildCreateOrderLineItems = (
  cartItemIds: string[],
  quantities: Record<string, number>,
  sourceItems: unknown[] = [],
  fallbackCards: CreateOrderCardFallback[] = [],
  locale = 'ko',
): CreateOrderLineItem[] => {
  return cartItemIds.map((cartItemId) => {
    const raw = sourceItems.find((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const row = entry as Record<string, unknown>;
      return (
        row._id === cartItemId ||
        row.id === cartItemId ||
        row.cartItemId === cartItemId
      );
    }) as Record<string, unknown> | undefined;

    const card = fallbackCards.find((c) => c.id === cartItemId);
    const title =
      (raw && pickCartLineTitle(raw, locale)) ||
      card?.productName?.trim() ||
      'Product';
    const qty =
      quantities[cartItemId] ??
      (typeof raw?.quantity === 'number' ? raw.quantity : undefined) ??
      card?.quantity ??
      1;

    const unitPriceKRW =
      resolveCheckoutLineUnitPriceKRW(raw, card?.unitPriceCNY) ||
      coerceOrderAmount(card?.unitPriceKRW);
    const subtotalKRW = unitPriceKRW > 0 ? unitPriceKRW * qty : undefined;

    return {
      cartItemId,
      _id: cartItemId,
      offerId: (raw?.offerId as number | string | undefined) ?? card?.offerId,
      source: String(raw?.source ?? card?.source ?? '1688'),
      subject: title,
      productName: title,
      subjectTrans: raw?.subjectTrans != null ? String(raw.subjectTrans) : undefined,
      imageUrl:
        (typeof raw?.imageUrl === 'string' ? raw.imageUrl : undefined) ??
        card?.productImage ??
        undefined,
      quantity: qty,
      skuInfo: raw?.skuInfo,
      companyName: raw?.companyName as string | Record<string, string> | undefined,
      sellerOpenId: raw?.sellerOpenId != null ? String(raw.sellerOpenId) : undefined,
      ...(unitPriceKRW > 0
        ? {
            userPrice: unitPriceKRW,
            price: unitPriceKRW,
            previewFinalUnitPriceKRW: unitPriceKRW,
            subtotal: subtotalKRW,
          }
        : {}),
    };
  });
};

/** Item shape for POST /orders/direct-purchase (from checkout selectedItems) */
export interface DirectPurchaseOrderItem {
  offerId: number;
  source: string;
  originalSource?: string;
  subject: string;
  subjectTrans?: string;
  imageUrl: string;
  promotionUrl?: string;
  skuInfo: any;
  companyName: string | Record<string, string>;
  sellerOpenId: string;
  quantity: number;
  minOrderQuantity?: number;
  addedAt?: string;
  categoryName?: Record<string, string>;
  categoryId?: number;
  previewFinalUnitPriceKRW?: number;
  designatedShooting?: DesignatedShootingItem[];
  [key: string]: any;
}

export interface CreateOrderDirectPurchaseRequest {
  items: DirectPurchaseOrderItem[];
  designatedShootingImageCount?: number;
  estimatedShippingCostBySeller?: Record<string, number>;
  addressId: string;
  paymentMethod: 'deposit' | 'bank' | 'card';
  serviceCode?: string;
  transferMethod: 'air' | 'ship';
  flow: 'general';
  userCouponUsageId?: string;
  userShippingCouponUsageId?: string;
  pointsToUse?: number;
  netExpectedTotalKRW: number;
}

export interface OrderResponse {
  order: {
    _id: string;
    orderNumber: string;
    user: string;
    items: any[];
    addressId: string;
    shippingAddress: any;
    subtotal: number;
    shippingCost: number;
    tax: number;
    discount: number;
    totalAmount: number;
    currency: string;
    paymentMethod: string;
    paymentStatus: string;
    orderStatus: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface OrderItemSkuAttribute {
  attributeId: number;
  attributeName: string;
  attributeNameTrans?: string;
  attributeNameMultiLang?: Record<string, string>;
  value: string;
  valueTrans?: string;
  valueMultiLang?: Record<string, string>;
  skuImageUrl?: string;
}

export interface OrderItem {
  id: string;
  _id?: string;
  itemUniqueNo?: number;
  offerId: string;
  specId: string;
  skuId: string;
  subject: string;
  subjectTrans?: string;
  subjectMultiLang?: Record<string, string>;
  imageUrl: string;
  promotionUrl?: string;
  price: number;
  userPrice?: number;
  quantity: number;
  subtotal: number;
  userShippingFee?: number;
  skuAttributes?: OrderItemSkuAttribute[];
  companyName: string | Record<string, string>;
  companyNameMultiLang?: Record<string, string> | Record<string, unknown>;
  categoryName?: Record<string, string>;
  sellerOpenId: string;
  notes?: string;
  designatedShooting?: DesignatedShootingItem[];
  externalOrderId?: string;
  source?: string;
  otherSite?: string;
  addServices?: unknown[];
  incomeImgUrl?: string[];
  issueImgUrl?: string[];
  productStatus?: string;
  itemAmount?: number;
  sellerShippingFee?: number;
  productOrderNumber?: string;
}

export interface FirstTierCost {
  realProductTotalKRW?: number;
  productTotalKRW?: number;
  chinaShippingKRW?: number;
  baseInternationalShippingKRW?: number;
  serviceFee?: number;
  serviceFeeAmountKRW?: number;
  totalKRW?: number;
  totalCNY?: number;
  total?: number;
  addOnAtCreation?: any[];
  _id?: string;
}

/** Unit price for order line display (handles userPrice, subtotal/qty, numeric strings). */
export const resolveOrderItemUnitPrice = (item: {
  userPrice?: unknown;
  price?: unknown;
  unitPrice?: unknown;
  previewFinalUnitPriceKRW?: unknown;
  unitPriceKRW?: unknown;
  priceKRW?: unknown;
  subtotal?: unknown;
  quantity?: unknown;
  skuInfo?: {
    userPrice?: unknown;
    price?: unknown;
    consignPrice?: unknown;
    fenxiaoPriceInfo?: { offerPrice?: unknown };
  } | null;
}): number => {
  const qty = coerceOrderAmount(item.quantity) || 1;
  const userPrice = coerceOrderAmount(item.userPrice);
  const price = coerceOrderAmount(item.price);
  const unitPrice = coerceOrderAmount(item.unitPrice);
  const previewKRW = coerceOrderAmount(item.previewFinalUnitPriceKRW);
  const unitPriceKRW = coerceOrderAmount(item.unitPriceKRW);
  const priceKRW = coerceOrderAmount(item.priceKRW);
  if (userPrice > 0) return userPrice;
  if (price > 0) return price;
  if (unitPrice > 0) return unitPrice;
  if (previewKRW > 0) return previewKRW;
  if (unitPriceKRW > 0) return unitPriceKRW;
  if (priceKRW > 0) return priceKRW;
  const subtotal = coerceOrderAmount(item.subtotal);
  if (subtotal > 0 && qty > 0) return subtotal / qty;
  const sku = item.skuInfo;
  if (sku && typeof sku === 'object') {
    const skuUserPrice = coerceOrderAmount(sku.userPrice);
    if (skuUserPrice > 0) return skuUserPrice;
    const fromSkuCny = convertToKRW(
      resolveSkuInfoUnitPriceCNY(sku as Record<string, unknown>),
    );
    if (fromSkuCny > 0) return fromSkuCny;
  }
  return 0;
};

/** Order total in KRW for list/detail (falls back when totalKRW is 0 or missing). */
export const resolveOrderTotalKRW = (order: {
  firstTierCost?: FirstTierCost | null;
  paidAmount?: unknown;
  totalAmount?: unknown;
  items?: Array<{
    userPrice?: unknown;
    price?: unknown;
    unitPrice?: unknown;
    subtotal?: unknown;
    quantity?: unknown;
  }>;
}): number => {
  const tier = order.firstTierCost;
  for (const candidate of [
    tier?.totalKRW,
    tier?.productTotalKRW,
    tier?.realProductTotalKRW,
    order.paidAmount,
    order.totalAmount,
    tier?.totalCNY,
    tier?.total,
  ]) {
    const n = coerceOrderAmount(candidate);
    if (n > 0) return n;
  }
  const items = order.items ?? [];
  return items.reduce((sum, item) => {
    const subtotal = coerceOrderAmount(item.subtotal);
    const line =
      subtotal > 0
        ? subtotal
        : resolveOrderItemUnitPrice(item) * (coerceOrderAmount(item.quantity) || 1);
    return sum + line;
  }, 0);
};

/** Pending payment amount from GET /orders/:id `orderPayments`. */
export const resolvePendingOrderPayment = (
  order: { orderPayments?: OrderPayment[]; progressStatus?: string },
): { tier: 'first' | 'second'; amountKRW: number } | null => {
  const payments = order.orderPayments ?? [];
  const progress = normalizeProgressStatus(order.progressStatus);
  const preferredTier = progress === 'WH_PAY_WAIT' ? 'second' : 'first';
  const pending = payments.find(
    (p) => p.status === 'pending' && p.tier === preferredTier,
  );
  if (pending && coerceOrderAmount(pending.amountKRW) > 0) {
    return { tier: preferredTier, amountKRW: coerceOrderAmount(pending.amountKRW) };
  }
  const anyPending = payments.find((p) => p.status === 'pending');
  if (anyPending && coerceOrderAmount(anyPending.amountKRW) > 0) {
    const tier = anyPending.tier === 'second' ? 'second' : 'first';
    return { tier, amountKRW: coerceOrderAmount(anyPending.amountKRW) };
  }
  return null;
};

export interface OrderPayment {
  tier: string;
  amountKRW: number;
  status: string;
  paidAt?: string;
  paymentMethod?: string;
  depositTransactionId?: string;
  couponIds?: string[];
  userCouponUsageIds?: string[];
  _id?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  orderType: string;
  progressStatus: string;
  orderStatus: string;
  shippingStatus: string;
  warehouseStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  firstTierCost?: FirstTierCost;
  secondTierCost?: any;
  orderPayments?: OrderPayment[];
  paidAmount?: number;
  totalAmount?: number;
  currency: string;
  items: OrderItem[];
  shippingAddress: any;
  transferMethod: string;
  warehouseCode?: string;
  trackingNumber?: string;
  childOrders: any[];
  isParentOrder: boolean;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
    changedBy?: string;
    actionType?: string;
    content?: string;
    detail?: string;
    _id: string;
  }>;
  customerReturnRequest?: any;
  refundStatus?: string;
  isRefundProcessing?: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface GetOrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  platformCounts?: Record<string, number>;
  viewFilterCounts?: Record<string, number>;
  requestTypeCounts?: Record<string, number>;
}

/** Query params for GET /orders-proxy */
export type ViewFilterType = 'all' | 'unpaid' | 'to_be_shipped' | 'shipped' | 'processed';
export interface GetOrdersParams {
  page?: number;
  pageSize?: number;
  lang?: string;
  search?: string;
  datePeriod?: string;
  platform?: string;
  viewFilter?: ViewFilterType;
  progressStatus?: string;
  hasSimplifiedClearance?: boolean;
  transferMethod?: 'air' | 'ship';
  periodFrom?: string;
  periodTo?: string;
}

/** Map app locale to orders-proxy `lang` query param */
export const mapLocaleToOrdersLang = (locale?: string): 'en' | 'ko' | 'zh' => {
  if (locale === 'ko' || locale === 'kr') return 'ko';
  if (locale === 'zh') return 'zh';
  return 'en';
};

const deriveSourceFromOtherSite = (otherSite?: string): string => {
  const site = (otherSite ?? '').toLowerCase();
  if (site.includes('taobao')) return 'taobao';
  if (site.includes('1688')) return '1688';
  return '1688';
};

const LOCALIZED_PROGRESS_STATUS_ALIASES: Record<string, string> = {
  임시저장: 'P_TEMPSAVE',
  구매견적: 'P_QUOTE',
  구매결제대기: 'P_PENDING',
  구매결제완료: 'P_PAY_COMPLETE',
  구매중: 'P_AU_PURCHASING',
  문제상품: 'P_MA_PROBLEM',
  구매완료: 'P_PUR_COMPLETE',
  구매최종완료: 'P_FINAL_PUR_COMPLETE',
  센터도착예정: 'IO_ARRIVE_EXPECTED',
  현지배송지연: 'IO_DELAY',
  입고처리중: 'IO_PROGRESS',
  입고완료: 'IO_WARE_COMPLETE',
  최종입고완료: 'IO_FINAL_WARE_COMPLETE',
  출고결제대기: 'IO_PAY_PENDING',
  출고결제완료: 'IO_PAY_COMPLETE',
  출고대기: 'IO_SHIP_PENDING',
  출고완료: 'IO_SHIP_COMPLETE',
  추가비용결제대기: 'IO_COST_PENDING',
  추가비용결제완료: 'IO_COST_COMPLETE',
  오류입고: 'E_ERROR',
  사용자환불신청: 'E_CUSTOMER_RETURN_REQ',
  사용자환불신청중: 'E_CUSTOMER_REFUND_PROGRESS',
  사용자환불완료: 'E_CUSTOMER_REFUND_COMPLETED',
  플랫폼환불신청: 'E_PLATFORM_REFUND_REQ',
  플랫폼환불신청중: 'E_PLATFORM_REFUND_IN_PROGRESS',
  플랫폼환불신청완료: 'E_PLATFORM_REFUND_COMPLETED',
  최종환불신청: 'E_FINAL_REFUND_REQ',
  최종환불신청중: 'E_FINAL_REFUND_PROGRESS',
  최종환불신청완료: 'E_FINAL_REFUND_COMPLETED',
  주문폐기: 'E_ORDER_CANCELLED',
  출고보류: 'E_SHIPMENT_HOLD',
  '采购完成': 'P_PUR_COMPLETE',
  采购付款完成: 'P_PAY_COMPLETE',
  问题商品: 'P_MA_PROBLEM',
  中心到达预定: 'IO_ARRIVE_EXPECTED',
};

export const isRecognizedProgressStatus = isApiProgressStatusRecognized;

/** Canonical progressStatus codes used by Order Management tabs */
export const normalizeProgressStatus = (raw?: string | null): string => {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  if (LOCALIZED_PROGRESS_STATUS_ALIASES[trimmed]) {
    return LOCALIZED_PROGRESS_STATUS_ALIASES[trimmed];
  }
  const upper = trimmed.toUpperCase();
  const aliases: Record<string, string> = {
    ...API_PROGRESS_STATUS_ALIASES,
    P_AU_COMPLETE: 'P_PUR_COMPLETE',
    P_AU_PURCHASE_COMPLETE: 'P_PUR_COMPLETE',
    P_AU_PURCHASED: 'P_PUR_COMPLETE',
    P_AU_DONE: 'P_PUR_COMPLETE',
  };
  return aliases[upper] ?? upper;
};

const resolveProgressStatusFromHistory = (
  statusHistory?: Array<{ status?: string | null }>,
): string => {
  if (!statusHistory?.length) return '';
  for (let i = statusHistory.length - 1; i >= 0; i--) {
    const code = normalizeProgressStatus(statusHistory[i]?.status);
    if (!code || code === 'NO_ORDER_INFO') continue;
    return code;
  }
  return '';
};

/**
 * Admin may move an order to payment pending while progressStatus still shows quote,
 * or the API may return mixed casing. Map those orders to BUY_PAY_WAIT for 발주관리.
 */
export const resolvePurchaseAgencyProgressStatus = (order: {
  progressStatus?: string | null;
  paymentStatus?: string | null;
  firstTierCost?: { totalKRW?: number; totalCNY?: number; total?: number } | null;
}): string => {
  const normalized = normalizeProgressStatus(order.progressStatus);
  const paymentPaid = String(order.paymentStatus ?? '').toLowerCase() === 'paid';
  if (normalized === 'P_PAY_COMPLETE') {
    return 'P_PAY_COMPLETE';
  }
  // 결제 API 성공 직후 progressStatus 가 아직 P_PENDING 인 경우 paymentStatus 로 보정.
  if (paymentPaid && normalized === 'P_PENDING') {
    return 'P_PAY_COMPLETE';
  }
  if (normalized === 'P_PENDING') {
    return 'P_PENDING';
  }
  // P_QUOTE 는 API 가 명시한 구매견적 상태 — 견적금액·paymentStatus 와 무관하게 유지.
  if (normalized === 'P_QUOTE') {
    return 'P_QUOTE';
  }
  // progressStatus 가 비어 있을 때만 견적금액 기준으로 결제대기 추론.
  if (!normalized) {
    const tier = order.firstTierCost;
    const hasQuoteTotal =
      (tier?.totalKRW ?? 0) > 0 ||
      (tier?.totalCNY ?? 0) > 0 ||
      (tier?.total ?? 0) > 0;
    const paymentPending = String(order.paymentStatus ?? 'pending').toLowerCase() === 'pending';
    if (paymentPending && hasQuoteTotal) {
      return 'P_PENDING';
    }
  }
  return normalized;
};

const matchesShippingAgencyLabel = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes('배송대행')) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower === 'shipping' ||
    lower === 'delivery' ||
    lower === 'shipping_agency' ||
    lower === 'delivery_agency' ||
    lower === 'shipping agency'
  );
};

/** 신청구분 = 배송대행 (orderMainInfo.requestType, businessType, etc.). */
export const isShippingAgencyOrder = (order: {
  orderMainInfo?: { requestType?: string; businessType?: string } | null;
  requestType?: string;
  businessType?: string;
  orderType?: string;
  orderNumber?: string;
}): boolean => {
  const orderNum = String(order.orderNumber ?? '').trim();
  if (/^G\d/i.test(orderNum)) return true;
  const candidates = [
    order.orderMainInfo?.requestType,
    order.orderMainInfo?.businessType,
    order.requestType,
    order.businessType,
    order.orderType,
  ];
  return candidates.some((c) => matchesShippingAgencyLabel(String(c ?? '')));
};

/**
 * UI / filter progress status.
 * 배송대행 orders use NO_ORDER_INFO while waiting for inbound — show as 도착예정, not 주문정보없음.
 */
export const resolveOrderProgressStatus = (order: {
  progressStatus?: string | null;
  statusHistory?: Array<{ status?: string | null }>;
  paymentStatus?: string | null;
  firstTierCost?: { totalKRW?: number; totalCNY?: number; total?: number } | null;
  orderMainInfo?: { requestType?: string; businessType?: string } | null;
  requestType?: string;
  businessType?: string;
  orderType?: string;
  orderNumber?: string;
}): string => {
  let status = resolvePurchaseAgencyProgressStatus(order);

  const shouldPreferHistory =
    !status || status === 'NO_ORDER_INFO' || !isRecognizedProgressStatus(status);
  if (shouldPreferHistory) {
    const fromHistory = resolveProgressStatusFromHistory(order.statusHistory);
    if (fromHistory) {
      status = resolvePurchaseAgencyProgressStatus({
        ...order,
        progressStatus: fromHistory,
      });
    }
  }

  if (status === 'NO_ORDER_INFO' && isShippingAgencyOrder(order)) {
    return 'IO_ARRIVE_EXPECTED';
  }
  return status;
};

const deriveOrderStatusFromProxy = (raw: any): string => {
  if (raw.orderStatus) return raw.orderStatus;
  if (normalizeProgressStatus(raw.progressStatus) === 'P_QUOTE') return 'quote';
  if (raw.paymentStatus === 'pending') return 'pending';
  if (raw.shippingStatus === 'delivered') return 'completed';
  return 'confirmed';
};

const normalizeProxyOrderItem = (item: any, locale: AppLocale = 'ko'): OrderItem => {
  const source = item.source || deriveSourceFromOtherSite(item.otherSite);
  const quantity = coerceOrderAmount(item.quantity) || 1;
  const unitPrice = resolveOrderItemUnitPrice(item);
  const userPrice = coerceOrderAmount(item.userPrice);
  const companyName = resolveOrderItemCompanyName(item, locale);
  return {
    id: String(item._id ?? item.id ?? ''),
    _id: item._id,
    itemUniqueNo: item.itemUniqueNo,
    offerId: String(item.offerId ?? ''),
    specId: String(item.specId ?? ''),
    skuId: String(item.skuId ?? ''),
    subject: item.subject ?? '',
    subjectTrans: item.subjectTrans,
    subjectMultiLang: item.subjectMultiLang,
    imageUrl: item.imageUrl ?? '',
    promotionUrl: item.promotionUrl,
    price: unitPrice,
    userPrice: userPrice > 0 ? userPrice : undefined,
    quantity,
    subtotal: coerceOrderAmount(item.subtotal) || unitPrice * quantity,
    skuAttributes: item.skuAttributes,
    companyName: companyName || '',
    companyNameMultiLang:
      item.companyNameMultiLang ??
      (typeof item.companyName === 'object' && item.companyName != null
        ? item.companyName
        : undefined),
    categoryName: item.categoryName ?? item.categoryNameMultiLang,
    sellerOpenId: item.sellerOpenId ?? '',
    source,
    otherSite: item.otherSite,
    addServices: item.addServices,
    incomeImgUrl: item.incomeImgUrl ?? item.incomeimgurl ?? [],
    issueImgUrl: item.issueImgUrl ?? item.issueimgurl ?? [],
    productStatus: item.productStatus,
    itemAmount: coerceOrderAmount(item.itemAmount),
    sellerShippingFee: coerceOrderAmount(item.sellerShippingFee),
    productOrderNumber: item.productOrderNumber,
  };
};

/** Normalize GET /orders-proxy document into app Order shape */
export const normalizeProxyOrder = (raw: any, locale: AppLocale = 'ko'): Order => {
  const id = String(raw._id ?? raw.id ?? '');
  const trackingNumbers = Array.isArray(raw.trackingNumbers) ? raw.trackingNumbers : [];
  const items = (raw.items ?? []).map((item: any) => normalizeProxyOrderItem(item, locale));

  return {
    ...raw,
    id,
    _id: raw._id,
    orderNumber: raw.orderNumber ?? '',
    orderType: raw.orderType ?? 'General',
    progressStatus: resolveOrderProgressStatus({
      progressStatus: raw.progressStatus,
      statusHistory: raw.statusHistory,
      paymentStatus: raw.paymentStatus,
      firstTierCost: raw.firstTierCost,
      orderMainInfo: raw.orderMainInfo,
      orderType: raw.orderType,
      orderNumber: raw.orderNumber,
    }),
    orderStatus: deriveOrderStatusFromProxy(raw),
    shippingStatus: raw.shippingStatus ?? 'not_shipped',
    warehouseStatus: raw.warehouseStatus ?? 'not_warehoused',
    paymentStatus: raw.paymentStatus ?? 'pending',
    paymentMethod: raw.paymentMethod ?? '',
    firstTierCost: raw.firstTierCost,
    secondTierCost: raw.secondTierCost,
    orderPayments: raw.orderPayments,
    paidAmount: raw.paidAmount,
    totalAmount: resolveOrderTotalKRW({
      firstTierCost: raw.firstTierCost,
      paidAmount: raw.paidAmount,
      totalAmount: raw.totalAmount,
      items,
    }),
    currency: raw.currency ?? 'KRW',
    items,
    shippingAddress: raw.shippingAddress,
    transferMethod:
      raw.transferMethod ??
      raw.orderMainInfo?.transferMethod ??
      raw.transfermethod ??
      'ship',
    warehouseCode: raw.warehouseCode,
    trackingNumber: raw.trackingNumber ?? trackingNumbers[0],
    trackingNumbers,
    childOrders: raw.childOrders ?? [],
    isParentOrder: raw.isParentOrder ?? false,
    statusHistory: raw.statusHistory ?? [],
    customerReturnRequest: raw.customerReturnRequest,
    refundStatus: raw.refundStatus,
    isRefundProcessing: raw.isRefundProcessing,
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
    orderMainInfo: raw.orderMainInfo,
    orderPaymentInfo: raw.orderPaymentInfo,
    addressId: raw.addressId,
    applicationCategory: raw.applicationCategory,
  };
};

/** Order preview (POST /orders/preview) - for detail order */
export interface OrderPreviewCargo {
  amount: number;
  finalUnitPrice: number;
  specId: string;
  skuId: number;
  offerId: number;
  openOfferId?: string;
  cargoPromotionList?: any[];
}
export interface OrderPreviewItem {
  tradeModeNameList?: string[];
  status: boolean;
  taoSampleSinglePromotion?: boolean;
  sumPayment: number;
  sumCarriage: number;
  sumPaymentNoCarriage: number;
  flowFlag: string;
  cargoList: OrderPreviewCargo[];
  shopPromotionList?: any[];
  tradeModelList?: any[];
  payChannelInfos?: any[];
  tradeServiceList?: any[];
  canUseOfficialSolution?: boolean;
}
export interface OrderPreviewResponse {
  preview: OrderPreviewItem[];
  warehouse: { id: string; code: string; name: string };
}

export const orderApi = {
  getOrders: async (params?: GetOrdersParams | number, pageSize?: number): Promise<ApiResponse<GetOrdersResponse>> => {
    try {
      let token = await getStoredToken();
      if (!token) {
        // Retry once after a short delay — token may not be in AsyncStorage yet on first mount
        await new Promise(resolve => setTimeout(resolve, 500));
        token = await getStoredToken();
        if (!token) {
          return {
            success: false,
            error: 'Authentication required. Please log in again.',
          };
        }
      }
      const p: GetOrdersParams =
        typeof params === 'number'
          ? { page: params, pageSize: pageSize ?? 10 }
          : { page: 1, pageSize: 10, ...params };
      const searchParams = new URLSearchParams();
      searchParams.set('page', String(p.page ?? 1));
      searchParams.set('pagesize', String(p.pageSize ?? 10));
      searchParams.set('lang', mapLocaleToOrdersLang(p.lang));
      if (p.search) searchParams.set('search', p.search);
      if (p.datePeriod) searchParams.set('datePeriod', p.datePeriod);
      if (p.platform) searchParams.set('platform', p.platform);
      if (p.viewFilter) searchParams.set('viewFilter', p.viewFilter);
      if (p.progressStatus) {
        searchParams.set('progressStatus', normalizeProgressStatus(p.progressStatus));
      }
      if (p.hasSimplifiedClearance !== undefined) {
        searchParams.set('hasSimplifiedClearance', String(p.hasSimplifiedClearance));
      }
      if (p.transferMethod) searchParams.set('transferMethod', p.transferMethod);
      if (p.periodFrom) searchParams.set('periodFrom', p.periodFrom);
      if (p.periodTo) searchParams.set('periodTo', p.periodTo);
      const query = searchParams.toString();
      const url = `${ORDERS_PROXY_BASE_URL}/orders-proxy?${query}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            responseData?.message ||
            responseData?.error ||
            `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status && responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || responseData?.error || 'Failed to get orders',
        };
      }

      const rawData = responseData.data ?? responseData ?? {};
      const ordersLocale = mapLocaleToOrdersLang(p.lang);
      const normalizedOrders = (rawData.orders ?? []).map((order: any) =>
        normalizeProxyOrder(order, ordersLocale),
      );

      return {
        success: true,
        message: responseData.message || 'Orders retrieved successfully',
        data: {
          orders: normalizedOrders,
          pagination: rawData.pagination ?? {
            page: p.page ?? 1,
            pageSize: p.pageSize ?? 10,
            total: normalizedOrders.length,
            totalPages: 1,
          },
          requestTypeCounts: rawData.requestTypeCounts,
          viewFilterCounts: rawData.viewFilterCounts,
        },
      };
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  getOrderPreview: async (body?: Record<string, any>): Promise<ApiResponse<OrderPreviewResponse>> => {
    try {
      const token = await getStoredToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }
      const url = `${API_BASE_URL}/orders/preview`;
      const payload = body ?? {};
      const signatureHeaders = await buildSignatureHeaders('POST', url, payload);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }
      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }
      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to get order preview',
        };
      }
      return {
        success: true,
        message: responseData.message || 'Order preview retrieved successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An unexpected error occurred. Please try again.',
      };
    }
  },

  cancelOrder: async (orderId: string): Promise<ApiResponse<{ order?: any }>> => {
    try {
      const token = await getStoredToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }
      const url = `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/cancel`;
      const signatureHeaders = await buildSignatureHeaders('PUT', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });
      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }
      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }
      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to cancel order',
        };
      }
      return {
        success: true,
        message: responseData.message || 'Order cancelled successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An unexpected error occurred. Please try again.',
      };
    }
  },

  confirmReceived: async (orderId: string): Promise<ApiResponse<{ order?: any }>> => {
    try {
      const token = await getStoredToken();
      if (!token) {
        return { success: false, error: 'No authentication token found. Please log in again.' };
      }
      const url = `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/received`;
      const signatureHeaders = await buildSignatureHeaders('PUT', url);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });
      const responseText = await response.text();
      let responseData: any;
      try { responseData = JSON.parse(responseText); } catch {
        return { success: false, error: 'Invalid response from server.' };
      }
      if (!response.ok) {
        return { success: false, error: responseData?.message || `Request failed with status ${response.status}` };
      }
      if (responseData.status !== 'success') {
        return { success: false, error: responseData?.message || 'Failed to confirm receipt' };
      }
      return { success: true, message: responseData.message || 'Order marked as received', data: responseData.data };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  getOrderById: async (
    orderId: string,
    lang?: string,
  ): Promise<ApiResponse<{ order: Order & { userInfo?: Record<string, unknown> } }>> => {
    try {
      const token = await getStoredToken();
      if (!token) return { success: false, error: 'No authentication token found.' };
      const langParam = mapLocaleToOrdersLang(lang);
      const url = `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}?lang=${encodeURIComponent(langParam)}`;
      const signatureHeaders = await buildSignatureHeaders('GET', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
      });
      const responseText = await response.text();
      let responseData: any;
      try { responseData = JSON.parse(responseText); } catch {
        return { success: false, error: 'Invalid response from server.' };
      }
      if (!response.ok) return { success: false, error: responseData?.message || `Status ${response.status}` };
      if (responseData.status !== 'success') return { success: false, error: responseData?.message || 'Failed to get order' };
      const rawOrder = responseData.data?.order ?? responseData.data;
      const normalized = normalizeProxyOrder(rawOrder, langParam);
      return {
        success: true,
        data: {
          order: {
            ...normalized,
            userInfo: rawOrder?.userInfo,
          },
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  updateShippingAddress: async (orderId: string, shippingAddress: {
    recipient: string;
    contact: string;
    detailedAddress: string;
    zipCode: string;
    customerClearanceType?: string;
    personalCustomsCode?: string;
    note?: string;
    country?: string;
    province?: string;
    city?: string;
    district?: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      if (!token) return { success: false, error: 'No authentication token found.' };
      const url = `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/shipping-address`;
      const body = { shippingAddress };
      const signatureHeaders = await buildSignatureHeaders('PUT', url, body);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
        body: JSON.stringify(body),
      });
      const responseText = await response.text();
      let responseData: any;
      try { responseData = JSON.parse(responseText); } catch {
        return { success: false, error: 'Invalid response from server.' };
      }
      if (!response.ok) return { success: false, error: responseData?.message || `Status ${response.status}` };
      if (responseData.status !== 'success') return { success: false, error: responseData?.message || 'Failed to update address' };
      return { success: true, data: responseData.data, message: responseData.message };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  getRefundAmount: async (orderId: string, items: { itemId: string; quantity: number }[]): Promise<ApiResponse<any>> => {
    try {
      const token = await getStoredToken();
      if (!token) return { success: false, error: 'No authentication token found.' };
      const url = `${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/refund-amount`;
      const body = { items };
      const signatureHeaders = await buildSignatureHeaders('POST', url, body);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
        body: JSON.stringify(body),
      });
      const responseText = await response.text();
      let responseData: any;
      try { responseData = JSON.parse(responseText); } catch {
        return { success: false, error: 'Invalid response from server.' };
      }
      if (!response.ok) return { success: false, error: responseData?.message || `Status ${response.status}` };
      if (responseData.status !== 'success') return { success: false, error: responseData?.message || 'Failed to get refund amount' };
      return { success: true, data: responseData.data };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
  },

  uploadOrderImages: async (
    kind: OrderImageUploadKind,
    files: OrderImageUploadFile[],
    lang?: string,
  ): Promise<ApiResponse<OrderImageUploadData>> => {
    try {
      if (files.length === 0) {
        return { success: true, data: { urls: [] } };
      }

      let token = await getStoredToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const langParam = lang || 'en';
      const url = `${API_BASE_URL}/orders/upload-images?lang=${encodeURIComponent(langParam)}`;
      const formData = new FormData();
      formData.append('kind', kind);
      files.forEach((file, index) => {
        formData.append('images', {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.fileName || `image_${Date.now()}_${index}.jpg`,
        } as unknown as Blob);
      });

      const postForm = async (accessToken: string) => {
        const signatureHeaders = await buildSignatureHeaders('POST', url);
        return fetch(url, {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'ngrok-skip-browser-warning': 'true',
            ...signatureHeaders,
          },
        });
      };

      let response = await postForm(token);
      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          token = newToken;
          response = await postForm(newToken);
        }
      }

      const responseText = await response.text();
      let responseData: {
        status?: string;
        message?: string;
        data?: OrderImageUploadData & {
          urls?: string[];
          groupedUrls?: Record<string, string[]>;
        };
      };
      try {
        responseData = JSON.parse(responseText);
      } catch {
        return { success: false, error: 'Invalid response from server.' };
      }

      if (!response.ok || responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || `Upload failed with status ${response.status}`,
        };
      }

      const grouped = responseData.data?.groupedUrls;
      const urls =
        responseData.data?.urls ??
        grouped?.[kind] ??
        (kind === 'addServices'
          ? grouped?.addServices
          : grouped?.negotiationContentImages) ??
        [];

      return {
        success: true,
        message: responseData.message,
        data: { urls, groupedUrls: responseData.data?.groupedUrls },
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        success: false,
        error: err.message || 'Failed to upload order images.',
      };
    }
  },

  createOrder: async (
    request: CreateOrderRequest | OrdersProxyCreateRequest,
  ): Promise<ApiResponse<OrderResponse>> => {
    try {
      const token = await getStoredToken();
      // console.log('🛒 CREATE ORDER - ACCESS TOKEN:', token);

      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }

      const body = isOrdersProxyCreateRequest(request)
        ? request
        : convertLegacyCreateOrderToProxy(request);

      const url = `${ORDERS_PROXY_BASE_URL}/orders-proxy`;
      console.log('🛒 CREATE ORDER REQUEST URL:', url);
      console.log('🛒 CREATE ORDER REQUEST BODY:', JSON.stringify(body, null, 2));
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(body),
      });

      console.log('🛒 CREATE ORDER RESPONSE STATUS:', response.status);

      const responseText = await response.text();
      console.log('🛒 CREATE ORDER RESPONSE TEXT:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('🛒 CREATE ORDER RESPONSE DATA:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.error('🛒 CREATE ORDER PARSE ERROR:', parseError);
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error:
            responseData?.message ||
            responseData?.error ||
            `Request failed with status ${response.status}`,
        };
      }

      if (responseData.status && responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || responseData?.error || 'Failed to create order',
        };
      }

      return {
        success: true,
        message: responseData.message || 'Order created successfully',
        data: responseData.data ?? responseData,
      };
    } catch (error: any) {
      console.error('🛒 CREATE ORDER ERROR:', error);
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Purchase order payment — matches web POST /v1/orders/checkout?lang=ko
   * Body: { orderId, paymentMethod, amount [, memberName] }
   */
  payOrder: async (
    orderId: string,
    payload: {
      paymentMethod: 'bank' | 'credit_card' | 'deposit';
      amountKRW: number;
      memberName?: string;
      lang?: string;
    },
  ): Promise<ApiResponse<{ order?: any; amountPaid?: number; newStatus?: string }>> => {
    try {
      const paymentMethodMap = {
        bank: 'bank',
        credit_card: 'card',
        deposit: 'deposit',
      } as const;

      const body: Record<string, unknown> = {
        orderId,
        paymentMethod: paymentMethodMap[payload.paymentMethod],
        amount: Math.round(payload.amountKRW),
      };
      if (payload.memberName?.trim()) {
        body.memberName = payload.memberName.trim();
      }

      const lang = mapLocaleToOrdersLang(payload.lang);
      const url = `${API_BASE_URL}/orders/checkout?lang=${encodeURIComponent(lang)}`;
      const response = await axiosWithAuth('POST', url, { data: body });
      const responseData = response.data;

      if (!responseData) {
        return { success: false, error: 'Invalid response from server. Please try again.' };
      }
      if (responseData.status && responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || responseData?.error || 'Failed to process payment',
        };
      }
      return {
        success: true,
        message: responseData.message || 'Payment submitted successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      return {
        success: false,
        error: serverMessage || 'An unexpected error occurred. Please try again.',
      };
    }
  },

  createOrderDirectPurchase: async (request: CreateOrderDirectPurchaseRequest): Promise<ApiResponse<OrderResponse>> => {
    try {
      const token = await getStoredToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found. Please log in again.',
        };
      }
      const url = `${API_BASE_URL}/orders/direct-purchase`;
      const signatureHeaders = await buildSignatureHeaders('POST', url, request);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...signatureHeaders,
        },
        body: JSON.stringify(request),
      });
      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        return {
          success: false,
          error: 'Invalid response from server. Please try again.',
        };
      }
      if (!response.ok) {
        return {
          success: false,
          error: responseData?.message || `Request failed with status ${response.status}`,
        };
      }
      if (responseData.status !== 'success') {
        return {
          success: false,
          error: responseData?.message || 'Failed to create order',
        };
      }
      return {
        success: true,
        message: responseData.message || 'Order created successfully',
        data: responseData.data,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  },
};



import type { ProfileSidebarActiveKey } from './ProfileTabletSidebar';
import { isProfileEmbeddedPanelKey } from './profileEmbeddedPanelKeys';

export type BuyListEmbedDomain =
  | 'purchase_agency'
  | 'rocket_3pl'
  | 'vvic_hipass'
  | 'shipping_agency'
  | 'error_management'
  | 'refund_management';

export type ProfileDashboardRoute =
  | { type: 'buyList'; domain: BuyListEmbedDomain; initialTab: string; progressStatus?: string; unconfirmedOnly?: boolean }
  | { type: 'cart' }
  | { type: 'productList' }
  | { type: 'category' }
  | { type: 'wishlist' }
  | { type: 'viewedProducts' }
  | { type: 'unitSurvey' }
  | { type: 'oemSurvey' }
  | { type: 'paymentHistory' }
  | { type: 'deposit' }
  | { type: 'personalSecurity' }
  | { type: 'progressNotification' }
  | { type: 'deliveryAddress' }
  | { type: 'orderDetail'; orderId: string; order?: unknown }
  | { type: 'orderPayment'; orderId: string }
  | {
      type: 'refundRequest';
      orderId: string;
      orderNumber?: string;
      items?: unknown[];
      refundData?: unknown;
    }
  | {
      type: 'chat';
      inquiryId?: string;
      orderId?: string;
      orderNumber?: string;
    }
  | { type: 'customerService' }
  | { type: 'note' }
  | { type: 'profileSettings' }
  | { type: 'message'; initialTab?: 'order' | 'general' | 'fileDownload' }
  | {
      type: 'productDetail';
      productId: string;
      source?: string;
      country?: string;
    };

export const sidebarKeyToDashboardRoute = (
  key: ProfileSidebarActiveKey,
  orderInitialTab: string,
): ProfileDashboardRoute | null => {
  if (!isProfileEmbeddedPanelKey(key)) return null;

  switch (key) {
    case 'purchase_agency':
    case 'rocket_3pl':
    case 'vvic_hipass':
    case 'shipping_agency':
      return { type: 'buyList', domain: key, initialTab: orderInitialTab };
    case 'cart':
      return { type: 'cart' };
    case 'productList':
      return { type: 'productList' };
    case 'category':
      return { type: 'category' };
    case 'wishlist':
      return { type: 'wishlist' };
    case 'myActivity':
      return { type: 'viewedProducts' };
    case 'unitSurvey':
      return { type: 'unitSurvey' };
    case 'oemSurvey':
      return { type: 'oemSurvey' };
    case 'paymentHistory':
      return { type: 'paymentHistory' };
    case 'deposit':
      return { type: 'deposit' };
    case 'personalSecurity':
      return { type: 'personalSecurity' };
    case 'progressNotification':
      return { type: 'progressNotification' };
    case 'deliveryAddress':
      return { type: 'deliveryAddress' };
    default:
      return null;
  }
};

export const mapNavigationTargetToDashboardRoute = (
  target: string,
  params?: Record<string, unknown>,
): ProfileDashboardRoute | null => {
  switch (target) {
    case 'OrderDetail':
      return {
        type: 'orderDetail',
        orderId: String(params?.orderId ?? ''),
        order: params?.order,
      };
    case 'OrderPayment':
      return {
        type: 'orderPayment',
        orderId: String(params?.orderId ?? ''),
      };
    case 'RefundRequest':
      return {
        type: 'refundRequest',
        orderId: String(params?.orderId ?? ''),
        orderNumber: params?.orderNumber as string | undefined,
        items: params?.items as unknown[] | undefined,
        refundData: params?.refundData,
      };
    case 'Chat':
      return {
        type: 'chat',
        inquiryId: params?.inquiryId as string | undefined,
        orderId: params?.orderId as string | undefined,
        orderNumber: params?.orderNumber as string | undefined,
      };
    case 'ProductDetail':
      return {
        type: 'productDetail',
        productId: String(params?.productId ?? ''),
        source: params?.source as string | undefined,
        country: params?.country as string | undefined,
      };
    case 'ProfileSettings':
      return { type: 'profileSettings' };
    case 'ViewedProducts':
      return { type: 'viewedProducts' };
    case 'Wishlist':
      return { type: 'wishlist' };
    case 'CustomerService':
      return { type: 'customerService' };
    case 'Note':
      return { type: 'note' };
    case 'BuyList':
      return {
        type: 'buyList',
        domain: (params?.domain as BuyListEmbedDomain) ?? 'purchase_agency',
        initialTab: String(params?.initialTab ?? 'all'),
        progressStatus:
          typeof params?.progressStatus === 'string' ? params.progressStatus : undefined,
      };
    case 'Main': {
      const screen = params?.screen as string | undefined;
      const nested = params?.params as Record<string, unknown> | undefined;
      if (screen === 'Message') {
        return {
          type: 'message',
          initialTab: (nested?.initialTab as 'order' | 'general' | 'fileDownload') ?? 'general',
        };
      }
      if (screen === 'Cart') {
        return { type: 'cart' };
      }
      return null;
    }
    default:
      return null;
  }
};

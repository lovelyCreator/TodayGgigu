/**
 * Backend progressStatus codes — aligned with web order-management dashboard.
 * @see 구매 / 입·출고 / 오류 3-column status board
 */

export type ApiProgressStatusTab =
  | 'category'
  | 'unpaid'
  | 'progressing'
  | 'end'
  | 'pending_review'
  | 'error'
  | 'refunds';

export type ApiProgressStatusGroup =
  | 'purchase_agency'
  | 'warehouse'
  | 'international_shipping'
  | 'error'
  | 'other';

export type ApiProgressStatusMeta = {
  tab: ApiProgressStatusTab;
  group: ApiProgressStatusGroup;
  translationKey: string;
};

/** Web dashboard — 구매 column */
export const PURCHASE_DASHBOARD_STATUSES = [
  'P_TEMPSAVE',
  'P_QUOTE',
  'P_PENDING',
  'P_PAY_COMPLETE',
  'P_AU_PURCHASING',
  'P_MA_PROBLEM',
  'P_PUR_COMPLETE',
  'P_FINAL_PUR_COMPLETE',
] as const;

/** Web dashboard — 입/출고 column */
export const WAREHOUSE_DASHBOARD_STATUSES = [
  'IO_ARRIVE_EXPECTED',
  'IO_DELAY',
  'IO_PROGRESS',
  'IO_WARE_COMPLETE',
  'IO_FINAL_WARE_COMPLETE',
  'IO_PAY_PENDING',
  'IO_PAY_COMPLETE',
  'IO_SHIP_PAY_PENDING',
  'IO_SHIP_PAY_COMPLETE',
  'IO_SHIP_PENDING',
  'IO_SHIP_COMPLETE',
  'IO_COST_PENDING',
  'IO_COST_COMPLETE',
] as const;

/** Web dashboard — 오류 column */
export const ERROR_DASHBOARD_STATUSES = [
  'E_ERROR',
  'E_CUSTOMER_RETURN_REQ',
  'E_CUSTOMER_REFUND_PROGRESS',
  'E_CUSTOMER_REFUND_COMPLETED',
  'E_PLATFORM_REFUND_REQ',
  'E_PLATFORM_REFUND_PRO',
  'E_PLATFORM_REFUND_IN_PROGRESS',
  'E_PLATFORM_REFUND_COMPLETED',
  'E_FINAL_REFUND_REQ',
  'E_FINAL_REFUND_PROGRESS',
  'E_FINAL_REFUND_COMPLETED',
  'E_ORDER_CANCELLED',
  'E_SHIPMENT_HOLD',
] as const;

/**
 * Legacy / WH_* / BUY_* codes → API canonical codes (display & counts).
 * API codes themselves are never collapsed away.
 */
export const API_PROGRESS_STATUS_ALIASES: Record<string, string> = {
  BUY_PAY_WAIT: 'P_PENDING',
  PAY_WAIT: 'P_PENDING',
  PAYMENT_PENDING: 'P_PENDING',
  PENDING_PAYMENT: 'P_PENDING',
  BUY_PAY_PENDING: 'P_PENDING',
  BUY_PAY_DONE: 'P_PAY_COMPLETE',
  PAY_COMPLETE: 'P_PAY_COMPLETE',
  BUY_FINAL_DONE: 'P_PUR_COMPLETE',
  P_PROBLEM: 'P_MA_PROBLEM',
  BUYING_PROBLEM: 'P_MA_PROBLEM',
  PURCHASING: 'P_AU_PURCHASING',
  AU_PURCHASING: 'P_AU_PURCHASING',
  QUOTE: 'P_QUOTE',
  QUOTE_PENDING: 'P_QUOTE',
  PENDING_QUOTE: 'P_QUOTE',
  P_RECEIPT: 'P_RECEIPT_APPLICATION',
  RECEIPT_APPLICATION: 'P_RECEIPT_APPLICATION',
  WH_ARRIVE_EXPECTED: 'IO_ARRIVE_EXPECTED',
  DELIVERY_EXCEPTION: 'IO_DELAY',
  WH_IN_PROGRESS: 'IO_PROGRESS',
  WH_IN_DONE: 'IO_WARE_COMPLETE',
  WH_PICK_DONE: 'IO_FINAL_WARE_COMPLETE',
  WH_PAY_WAIT: 'IO_PAY_PENDING',
  WH_PAY_DONE: 'IO_PAY_COMPLETE',
  WH_SHIPPED: 'IO_SHIP_COMPLETE',
  INTERNATIONAL_SHIPPING: 'IO_DELIVERY_PROGRESS',
  INTERNATIONAL_SHIPPED: 'IO_DELIVERY_COMPLETE',
  ERR_IN: 'E_ERROR',
  USER_REFUND_REQ: 'E_CUSTOMER_RETURN_REQ',
  USER_REFUND_COMPLETED: 'E_CUSTOMER_REFUND_COMPLETED',
  BUY_COMPLETE: 'P_PUR_COMPLETE',
  PURCHASE_COMPLETE: 'P_PUR_COMPLETE',
  PURCHASE_FINAL_COMPLETE: 'P_FINAL_PUR_COMPLETE',
  PURCHASE_FINAL_DONE: 'P_FINAL_PUR_COMPLETE',
};

const purchase = (translationKey: string, tab: ApiProgressStatusTab = 'progressing'): ApiProgressStatusMeta => ({
  tab,
  group: 'purchase_agency',
  translationKey,
});

const warehouse = (translationKey: string, tab: ApiProgressStatusTab = 'progressing'): ApiProgressStatusMeta => ({
  tab,
  group: 'warehouse',
  translationKey,
});

const err = (translationKey: string, tab: ApiProgressStatusTab = 'error'): ApiProgressStatusMeta => ({
  tab,
  group: 'error',
  translationKey,
});

const refund = (translationKey: string): ApiProgressStatusMeta => ({
  tab: 'refunds',
  group: 'error',
  translationKey,
});

/** Display meta — keyed by canonical API progressStatus. */
export const API_PROGRESS_STATUS_META: Record<string, ApiProgressStatusMeta> = {
  // ── 구매 ──
  P_TEMPSAVE: purchase('pages.orders.status.tempSave', 'category'),
  P_QUOTE: purchase('pages.orders.status.quotePending', 'category'),
  P_PENDING: purchase('pages.orders.status.paymentPending', 'unpaid'),
  P_PAY_COMPLETE: purchase('pages.orders.status.purchasePaymentCompleteStatus'),
  P_AU_PURCHASING: purchase('pages.orders.status.purchasing'),
  P_MA_PROBLEM: purchase('pages.orders.status.problemProduct'),
  P_PUR_COMPLETE: purchase('pages.orders.status.purchaseFinalComplete', 'end'),
  P_FINAL_PUR_COMPLETE: purchase('pages.orders.status.finalPurchaseComplete', 'end'),
  BUYING_MANUAL: purchase('pages.orders.status.purchasing'),
  BUYING_FINANCIAL_SETTLEMENT: purchase('pages.orders.status.financialSettlement'),
  P_RECEIPT_APPLICATION: warehouse('pages.orders.status.receiptApplication'),

  // ── 입/출고 ──
  IO_ARRIVE_EXPECTED: warehouse('pages.orders.status.centerArrivalExpected'),
  IO_DELAY: warehouse('pages.orders.status.localDeliveryDelay', 'error'),
  IO_PROGRESS: warehouse('pages.orders.status.warehouseProcessing'),
  IO_WARE_COMPLETE: warehouse('pages.orders.status.warehouseInComplete'),
  IO_FINAL_WARE_COMPLETE: warehouse('pages.orders.status.finalWarehouseComplete'),
  IO_PAY_PENDING: warehouse('pages.orders.status.shipPaymentPending'),
  IO_PAY_COMPLETE: warehouse('pages.orders.status.shipPaymentComplete'),
  IO_SHIP_PAY_PENDING: warehouse('pages.orders.status.shipPaymentPending'),
  IO_SHIP_PAY_COMPLETE: warehouse('pages.orders.status.shipPaymentComplete'),
  IO_SHIP_PENDING: warehouse('pages.orders.status.shipmentPending'),
  IO_SHIP_COMPLETE: warehouse('pages.orders.status.shipmentComplete'),
  IO_COST_PENDING: warehouse('pages.orders.status.additionalCostPaymentPending'),
  IO_COST_COMPLETE: warehouse('pages.orders.status.additionalCostPaymentComplete'),
  IO_DELIVERY_PROGRESS: warehouse('pages.orders.status.internationalShippingInProgress'),
  IO_DELIVERY_COMPLETE: warehouse('pages.orders.status.internationalShippingComplete', 'end'),

  // ── 국제운송 (legacy WH/INTL aliases target IO_DELIVERY_*) ──
  INTERNATIONAL_SHIPPING: warehouse('pages.orders.status.internationalShippingInProgress'),
  INTERNATIONAL_SHIPPED: warehouse('pages.orders.status.internationalShippingComplete', 'end'),
  ORDER_RECEIVED: { tab: 'pending_review', group: 'international_shipping', translationKey: 'pages.orders.status.orderReceived' },
  WH_IN_EXPECTED: warehouse('pages.orders.status.expectedWarehouseIn'),

  // ── 오류 / 환불 ──
  E_ERROR: err('pages.orders.status.errorInbound'),
  E_CUSTOMER_RETURN_REQ: refund('pages.orders.status.userRefundRequest'),
  E_CUSTOMER_REFUND_PROGRESS: refund('pages.orders.status.userRefundInProgress'),
  E_CUSTOMER_REFUND_COMPLETED: refund('pages.orders.status.userRefundComplete'),
  E_PLATFORM_REFUND_REQ: refund('pages.orders.status.platformRefundRequest'),
  E_PLATFORM_REFUND_PRO: refund('pages.orders.status.platformRefundInProgress'),
  E_PLATFORM_REFUND_IN_PROGRESS: refund('pages.orders.status.platformRefundInProgress'),
  E_PLATFORM_REFUND_COMPLETED: refund('pages.orders.status.platformRefundComplete'),
  E_FINAL_REFUND_REQ: refund('pages.orders.status.finalRefundRequest'),
  E_FINAL_REFUND_PROGRESS: refund('pages.orders.status.finalRefundInProgress'),
  E_FINAL_REFUND_COMPLETED: refund('pages.orders.status.finalRefundComplete'),
  E_ORDER_CANCELLED: err('pages.orders.status.orderDiscarded'),
  E_SHIPMENT_HOLD: err('pages.orders.status.shipmentHold'),
  NO_ORDER_INFO: err('pages.orders.status.noOrderInfo'),

  RETURN_REQUEST: refund('pages.orders.status.returnRequest'),
  RETURN_PAY_PENDING: refund('pages.orders.status.returnPaymentPending'),
  RETURN_PAY_COMPLETE: refund('pages.orders.status.returnPaymentComplete'),
  RETURN_COMPLETE: refund('pages.orders.status.returnComplete'),
};

export const isApiProgressStatusRecognized = (code?: string | null): boolean => {
  const normalized = String(code ?? '').trim();
  if (!normalized) return false;
  return (
    normalized in API_PROGRESS_STATUS_META ||
    normalized in API_PROGRESS_STATUS_ALIASES ||
    /^P_/.test(normalized) ||
    /^IO_/.test(normalized) ||
    /^E_/.test(normalized) ||
    /^RETURN_/.test(normalized) ||
    /^BUYING_/.test(normalized) ||
    /^WH_/.test(normalized)
  );
};

export const API_PROGRESS_STATUS_I18N: Record<string, string> = Object.fromEntries(
  Object.entries(API_PROGRESS_STATUS_META).map(([code, meta]) => [code, meta.translationKey]),
);

/** Web dashboard 3-column layout (구매 / 입·출고 / 오류). */
export const DASHBOARD_STATUS_COLUMNS = [
  { key: 'purchase', titleKey: 'pages.orders.groups.purchaseAgency', statuses: PURCHASE_DASHBOARD_STATUSES },
  { key: 'warehouse', titleKey: 'pages.orders.groups.warehouse', statuses: WAREHOUSE_DASHBOARD_STATUSES },
  { key: 'error', titleKey: 'pages.orders.groups.error', statuses: ERROR_DASHBOARD_STATUSES },
] as const;

export const resolveProgressStatusTranslationKey = (raw?: string | null): string | undefined => {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  const canonical = API_PROGRESS_STATUS_ALIASES[upper] ?? upper;
  return API_PROGRESS_STATUS_META[canonical]?.translationKey ?? API_PROGRESS_STATUS_META[trimmed]?.translationKey;
};

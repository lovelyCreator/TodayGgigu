import { normalizeProgressStatus } from '../services/orderApi';

/** i18n keys under `pages.orders.status.*` (aligned with BuyList order management). */
const PROGRESS_STATUS_I18N: Record<string, string> = {
  P_QUOTE: 'pages.orders.status.quotePending',
  BUY_PAY_WAIT: 'pages.orders.status.paymentPending',
  BUY_PAY_DONE: 'pages.orders.status.paymentComplete',
  P_RECEIPT_APPLICATION: 'pages.orders.status.receiptApplication',
  P_AU_PURCHASING: 'pages.orders.status.purchasing',
  BUYING_MANUAL: 'pages.orders.status.purchasing',
  BUYING_FINANCIAL_SETTLEMENT: 'pages.orders.status.financialSettlement',
  BUYING_PROBLEM: 'pages.orders.status.problemProduct',
  BUY_FINAL_DONE: 'pages.orders.status.purchaseFinalComplete',
  WH_ARRIVE_EXPECTED: 'pages.orders.status.centerArrivalExpected',
  DELIVERY_EXCEPTION: 'pages.orders.status.deliveryException',
  WH_IN_EXPECTED: 'pages.orders.status.expectedWarehouseIn',
  WH_IN_PROGRESS: 'pages.orders.status.warehouseInProgress',
  WH_IN_DONE: 'pages.orders.status.warehouseInComplete',
  WH_PICK_DONE: 'pages.orders.status.domesticWarehousePacking',
  WH_PAY_WAIT: 'pages.orders.status.waitingSettlement',
  WH_PAY_DONE: 'pages.orders.status.settlementComplete',
  WH_SHIPPED: 'pages.orders.status.shipmentComplete',
  INTERNATIONAL_SHIPPING: 'pages.orders.status.internationalShippingInProgress',
  INTERNATIONAL_SHIPPED: 'pages.orders.status.internationalShippingComplete',
  ORDER_RECEIVED: 'pages.orders.status.orderReceived',
  ERR_IN: 'pages.orders.status.errorWarehouse',
  NO_ORDER_INFO: 'pages.orders.status.noOrderInfo',
  USER_REFUND_REQ: 'pages.orders.status.userRefundRequest',
  USER_REFUND_COMPLETED: 'pages.orders.status.userRefundComplete',
};

/** Legacy message list keys (Message tab) — used when pages.orders key missing. */
const MESSAGE_PROGRESS_FALLBACK: Record<string, string> = {
  BUY_PAY_WAIT: 'message.progressStatus.paymentPending',
  P_PENDING: 'message.progressStatus.paymentPending',
  BUY_PAY_DONE: 'message.progressStatus.purchaseInProgress',
  BUYING_MANUAL: 'message.progressStatus.buyingInProgress',
  WH_ARRIVE_EXPECTED: 'message.progressStatus.shippingPending',
  WH_IN_DONE: 'message.progressStatus.warehouseComplete',
  INTERNATIONAL_SHIPPED: 'message.progressStatus.inTransit',
  ORDER_RECEIVED: 'message.progressStatus.received',
};

export const getOrderProgressStatusLabel = (
  t: (key: string) => string,
  rawStatus?: string | null,
): string => {
  const code = normalizeProgressStatus(rawStatus);
  if (!code) return '';

  const pagesKey = PROGRESS_STATUS_I18N[code];
  if (pagesKey) {
    const label = t(pagesKey);
    if (label && label !== pagesKey) return label;
  }

  const messageKey = MESSAGE_PROGRESS_FALLBACK[code];
  if (messageKey) {
    const label = t(messageKey);
    if (label && label !== messageKey) return label;
  }

  if (/^P_AU_/.test(code) || /^BUYING_/.test(code)) {
    const purchasing = t('pages.orders.status.purchasing');
    if (purchasing && purchasing !== 'pages.orders.status.purchasing') return purchasing;
  }

  return code;
};

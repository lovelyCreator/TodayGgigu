import { normalizeProgressStatus } from '../services/orderApi';
import { resolveProgressStatusTranslationKey } from './apiProgressStatus';

export type OrderDetailTimelineStep = {
  key: string;
  labelKey: string;
  icon: 'receipt' | 'document' | 'card' | 'cart' | 'warehouse' | 'truck' | 'check';
};

export const ORDER_DETAIL_TIMELINE_STEPS: OrderDetailTimelineStep[] = [
  { key: 'order_placed', labelKey: 'profile.orderDetailPage.orderPlaced', icon: 'receipt' },
  { key: 'quote_done', labelKey: 'profile.orderDetailPage.quoteDone', icon: 'document' },
  { key: 'payment_done', labelKey: 'profile.orderDetailPage.paymentDone', icon: 'card' },
  { key: 'purchasing', labelKey: 'profile.orderDetailPage.purchasing', icon: 'cart' },
  { key: 'warehouse', labelKey: 'profile.orderDetailPage.warehouseWork', icon: 'warehouse' },
  { key: 'shipment', labelKey: 'profile.orderDetailPage.shipment', icon: 'truck' },
  { key: 'complete', labelKey: 'profile.orderDetailPage.completed', icon: 'check' },
];

const STATUS_STEP_INDEX: Record<string, number> = {
  P_TEMPSAVE: 0,
  P_QUOTE: 0,
  P_PENDING: 1,
  P_PAY_COMPLETE: 2,
  P_AU_PURCHASING: 3,
  P_MA_PROBLEM: 3,
  P_PUR_COMPLETE: 3,
  P_FINAL_PUR_COMPLETE: 3,
  P_RECEIPT_APPLICATION: 4,
  IO_ARRIVE_EXPECTED: 4,
  IO_DELAY: 4,
  IO_PROGRESS: 4,
  IO_WARE_COMPLETE: 4,
  IO_FINAL_WARE_COMPLETE: 4,
  IO_PAY_PENDING: 4,
  IO_PAY_COMPLETE: 4,
  IO_SHIP_PAY_PENDING: 4,
  IO_SHIP_PAY_COMPLETE: 4,
  IO_SHIP_PENDING: 5,
  IO_SHIP_COMPLETE: 5,
  IO_COST_PENDING: 5,
  IO_COST_COMPLETE: 5,
  E_ERROR: 4,
  E_ORDER_CANCELLED: 0,
  E_SHIPMENT_HOLD: 5,
  IO_DELIVERY_PROGRESS: 5,
  IO_DELIVERY_COMPLETE: 6,
  ORDER_RECEIVED: 6,
  // legacy
  BUY_PAY_WAIT: 1,
  BUY_PAY_DONE: 2,
  BUY_FINAL_DONE: 3,
  WH_ARRIVE_EXPECTED: 4,
  WH_IN_PROGRESS: 4,
  WH_IN_DONE: 4,
  WH_SHIPPED: 5,
  INTERNATIONAL_SHIPPING: 5,
  INTERNATIONAL_SHIPPED: 6,
};

/** 출고결제대기·출고결제완료 — 출고 단계 진행 중(배경 미채움, 테두리만 활성). */
const SHIPMENT_BORDER_ACTIVE_STATUSES = new Set([
  'IO_PAY_PENDING',
  'IO_PAY_COMPLETE',
  'IO_SHIP_PAY_PENDING',
  'IO_SHIP_PAY_COMPLETE',
]);

export const isShipmentStepBorderActive = (progressStatus?: string | null): boolean => {
  const code = normalizeProgressStatus(progressStatus);
  return SHIPMENT_BORDER_ACTIVE_STATUSES.has(code);
};

/** 추가비용결제대기·완료 — 출고 완료 후 최종 완료 직전(배경 미채움, 테두리만 활성). */
const COMPLETE_BORDER_ACTIVE_STATUSES = new Set(['IO_COST_PENDING', 'IO_COST_COMPLETE']);

export const isCompleteStepBorderActive = (progressStatus?: string | null): boolean => {
  const code = normalizeProgressStatus(progressStatus);
  return COMPLETE_BORDER_ACTIVE_STATUSES.has(code);
};

export const resolveOrderDetailStepIndex = (progressStatus?: string | null): number => {
  const code = normalizeProgressStatus(progressStatus);
  if (!code) return 0;
  if (STATUS_STEP_INDEX[code] != null) return STATUS_STEP_INDEX[code];
  if (/^P_AU_/.test(code) || /^BUYING_/.test(code)) return 3;
  if (/^IO_/.test(code) || /^WH_/.test(code)) return 4;
  return 0;
};

export const resolveOrderDetailStatusTitleKey = (progressStatus?: string | null): string => {
  const code = normalizeProgressStatus(progressStatus);
  const fromMeta = resolveProgressStatusTranslationKey(code);
  if (fromMeta) return fromMeta;
  if (!code) return 'pages.orders.status.noOrderInfo';
  return 'pages.orders.status.noOrderInfo';
};

export const resolveOrderDetailStatusSubtitleKey = (
  progressStatus?: string | null,
): string => resolveOrderDetailStatusTitleKey(progressStatus);

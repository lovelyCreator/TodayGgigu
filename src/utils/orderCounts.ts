import type { Order as ApiOrder } from '../services/orderApi';
import { resolveOrderProgressStatus } from '../services/orderApi';
import { WAREHOUSE_DASHBOARD_STATUSES } from './apiProgressStatus';

export type ProfileOrderCounts = {
  // 구매견적 — API progressStatus 가 P_QUOTE 인 주문.
  quotePending: number;
  // 구매결제대기 — BUY_PAY_WAIT / P_PENDING (및 progressStatus 미지정 시 추론된 결제대기).
  unpaid: number;
  to_be_shipped: number;
  shipped: number;
  processed: number;
  shipping_delay: number;
  error: number;
  refunds: number;
  problemProducts: number;
};

/**
 * ProfileScreen 내주문 카드의 4개 탭(구매대행/로켓-3PL/VVIC하이패스/배송대행)
 * 마다 별도 ProfileOrderCounts 를 가진다. 활성 탭의 카운트만 카드 셀에 표시.
 *
 * 도메인 분류 우선권: VVIC > Rocket > Shipping > Purchase
 * — BuyListScreen 의 resolveOrderBusinessDomain 과 동일한 규칙.
 */
export type BusinessDomain =
  | 'purchase_agency'
  | 'rocket_3pl'
  | 'vvic_hipass'
  | 'shipping_agency';

export type ProfileOrderCountsByDomain = Record<BusinessDomain, ProfileOrderCounts>;

/** Profile 내주문 카드 — 발주/출고 결제·미확인·오류 요약 셀용 카운트. */
export type ProfileDashboardCounts = {
  /** "내 주문 → 발주 결제" — 구매결제대기(P_PENDING) 주문 수. */
  purchasePaymentPending: number;
  /** "내 주문 → 출고 결제" — 출고결제대기(IO_PAY_PENDING / IO_SHIP_PAY_PENDING) 주문 수. */
  shipPaymentPending: number;
  /** "내 주문 → 미확인" — 라벨이 미확인인 (unreadCount > 0) 주문 수. */
  unconfirmed: number;
  /** "오류 → 문제상품" — P_MA_PROBLEM 주문 수. */
  problemProduct: number;
  /** "오류 → 현지배송지연" — IO_DELAY 주문 수.
   *  (이전엔 'errorInbound' (E_ERROR) 였으나 사용자 요구에 따라 의미를 변경.) */
  errorInbound: number;
  /** "오류 → 출고보류" — E_SHIPMENT_HOLD 주문 수. */
  shipmentHold: number;
};

const EMPTY_DASHBOARD_COUNTS: ProfileDashboardCounts = {
  purchasePaymentPending: 0,
  shipPaymentPending: 0,
  unconfirmed: 0,
  problemProduct: 0,
  errorInbound: 0,
  shipmentHold: 0,
};

const classifyOrderDomain = (order: {
  orderType?: string | null;
  orderMainInfo?: ApiOrder['orderMainInfo'];
}): BusinessDomain => {
  const info: any = order.orderMainInfo || {};
  const orderType = String(order.orderType || '').toLowerCase();
  const transferMethod = String(info.transferMethod || '').toLowerCase();
  const shippingMethod = String(info.shippingMethod || '').toLowerCase();
  const requestType = String(info.requestType || '').toLowerCase();

  if (transferMethod.includes('vvic') || shippingMethod.includes('vvic')) {
    return 'vvic_hipass';
  }
  if (
    orderType === 'rocket' ||
    requestType === 'rocket' ||
    shippingMethod.includes('로켓') ||
    shippingMethod.includes('rocket')
  ) {
    return 'rocket_3pl';
  }
  if (orderType === 'shipping' || requestType === 'shipping') {
    return 'shipping_agency';
  }
  return 'purchase_agency';
};

const EMPTY_PROFILE_COUNTS: ProfileOrderCounts = {
  quotePending: 0,
  unpaid: 0,
  to_be_shipped: 0,
  shipped: 0,
  processed: 0,
  shipping_delay: 0,
  error: 0,
  refunds: 0,
  problemProducts: 0,
};

const PROFILE_STATUS_MAP: Record<keyof ProfileOrderCounts, readonly string[]> = {
  quotePending: ['P_QUOTE'],
  unpaid: ['P_PENDING'],
  to_be_shipped: [
    'P_PAY_COMPLETE',
    'P_AU_PURCHASING',
    'P_MA_PROBLEM',
    'P_PUR_COMPLETE',
    'P_FINAL_PUR_COMPLETE',
    'P_RECEIPT_APPLICATION',
    'IO_ARRIVE_EXPECTED',
    'IO_PROGRESS',
    'IO_WARE_COMPLETE',
    'IO_FINAL_WARE_COMPLETE',
    'IO_PAY_PENDING',
    'IO_PAY_COMPLETE',
    'IO_SHIP_PENDING',
    'IO_SHIP_COMPLETE',
    'IO_COST_PENDING',
    'IO_COST_COMPLETE',
  ],
  shipped: ['IO_DELIVERY_PROGRESS', 'IO_DELIVERY_COMPLETE'],
  shipping_delay: ['IO_DELAY'],
  processed: ['ORDER_RECEIVED'],
  problemProducts: ['P_MA_PROBLEM'],
  error: ['E_ERROR', 'NO_ORDER_INFO', 'E_ORDER_CANCELLED', 'E_SHIPMENT_HOLD'],
  refunds: [
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
    'RETURN_REQUEST',
    'RETURN_PAY_PENDING',
    'RETURN_PAY_COMPLETE',
    'RETURN_COMPLETE',
  ],
};

export const computeBusinessDomainCounts = (
  orders: Array<{
    orderType?: string | null;
    orderMainInfo?: ApiOrder['orderMainInfo'];
  }>,
): Record<BusinessDomain, number> => {
  const counts: Record<BusinessDomain, number> = {
    purchase_agency: 0,
    rocket_3pl: 0,
    vvic_hipass: 0,
    shipping_agency: 0,
  };
  for (const order of orders) {
    counts[classifyOrderDomain(order)] += 1;
  }
  return counts;
};

/**
 * BuyList 발주관리 칩 배지와 동일 — 구매대행·로켓·VVIC·배송대행 도메인 주문 합계.
 * 오류관리·반품관리는 별도 화면이라 도메인 분류에서 제외하지 않는다.
 */
/** BuyList STATUS_GROUPS.warehouse 와 동일한 진행상태 목록. */
const WAREHOUSE_STATUS_GROUP_STATUSES: readonly string[] = [
  'P_RECEIPT_APPLICATION',
  ...WAREHOUSE_DASHBOARD_STATUSES,
];

/** BuyList 현지입/출고 칩 배지와 동일한 그룹 카운트. */
export const computeWarehouseGroupCount = (
  orders: Array<{
    progressStatus?: string | null;
    statusHistory?: Array<{ status?: string | null }>;
    paymentStatus?: string | null;
    firstTierCost?: ApiOrder['firstTierCost'];
    orderMainInfo?: ApiOrder['orderMainInfo'];
    orderType?: string | null;
    orderNumber?: string | null;
  }>,
): number => {
  const progressCounts = computeProgressStatusCounts(orders);
  return WAREHOUSE_STATUS_GROUP_STATUSES.reduce(
    (sum, status) => sum + (progressCounts[status] ?? 0),
    0,
  );
};

/** BuyList 오류 > 출고보류(E_SHIPMENT_HOLD) + 반품관리(USER_REFUND_REQ) 합계. */
export const computeShipmentHoldDashboardCount = (
  orders: Array<{
    progressStatus?: string | null;
    statusHistory?: Array<{ status?: string | null }>;
    paymentStatus?: string | null;
    firstTierCost?: ApiOrder['firstTierCost'];
    orderMainInfo?: ApiOrder['orderMainInfo'];
    orderType?: string | null;
    orderNumber?: string | null;
  }>,
): number => {
  const progressCounts = computeProgressStatusCounts(orders);
  return (
    (progressCounts.E_SHIPMENT_HOLD ?? 0) +
    (progressCounts.E_CUSTOMER_RETURN_REQ ?? 0)
  );
};

export const computePurchaseAgencyDropdownCount = (
  orders: Array<{
    orderType?: string | null;
    orderMainInfo?: ApiOrder['orderMainInfo'];
  }>,
): number => {
  const domainCounts = computeBusinessDomainCounts(orders);
  return (
    domainCounts.purchase_agency +
    domainCounts.rocket_3pl +
    domainCounts.vvic_hipass +
    domainCounts.shipping_agency
  );
};

export const getOrderProgressStatus = (order: {
  progressStatus?: string | null;
  statusHistory?: Array<{ status?: string | null }>;
  paymentStatus?: string | null;
  firstTierCost?: ApiOrder['firstTierCost'];
  orderMainInfo?: ApiOrder['orderMainInfo'];
  orderType?: string | null;
  orderNumber?: string | null;
}): string =>
  resolveOrderProgressStatus({
    progressStatus: order.progressStatus,
    statusHistory: order.statusHistory,
    paymentStatus: order.paymentStatus,
    firstTierCost: order.firstTierCost,
    orderMainInfo: order.orderMainInfo,
    orderType: order.orderType,
    orderNumber: order.orderNumber,
  });

export const computeProgressStatusCounts = (
  orders: Array<{
    progressStatus?: string | null;
    paymentStatus?: string | null;
    firstTierCost?: ApiOrder['firstTierCost'];
  }>,
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    const status = getOrderProgressStatus(order);
    if (!status) continue;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
};

export const computeStatusGroupCounts = (
  orders: Array<{
    progressStatus?: string | null;
    paymentStatus?: string | null;
    firstTierCost?: ApiOrder['firstTierCost'];
  }>,
  groups: ReadonlyArray<{ key: string; statuses: readonly string[] }>,
): Record<string, number> => {
  const progressCounts = computeProgressStatusCounts(orders);
  const groupCounts: Record<string, number> = {};
  for (const group of groups) {
    groupCounts[group.key] = group.statuses.reduce(
      (sum, status) => sum + (progressCounts[status] ?? 0),
      0,
    );
  }
  return groupCounts;
};

export const computeProfileOrderCounts = (
  orders: Array<{
    progressStatus?: string | null;
    paymentStatus?: string | null;
    firstTierCost?: ApiOrder['firstTierCost'];
  }>,
): ProfileOrderCounts => {
  const counts = { ...EMPTY_PROFILE_COUNTS };
  for (const order of orders) {
    const status = getOrderProgressStatus(order);
    (Object.keys(PROFILE_STATUS_MAP) as Array<keyof ProfileOrderCounts>).forEach((key) => {
      if (PROFILE_STATUS_MAP[key].includes(status)) {
        counts[key] += 1;
      }
    });
  }
  return counts;
};

/** Prefer API viewFilterCounts when present; fill gaps from loaded orders. */
export const mergeProfileOrderCounts = (
  orders: Array<{
    progressStatus?: string | null;
    paymentStatus?: string | null;
    firstTierCost?: ApiOrder['firstTierCost'];
  }>,
  viewFilterCounts?: Record<string, number> | null,
): ProfileOrderCounts => {
  const computed = computeProfileOrderCounts(orders);
  if (!viewFilterCounts) return computed;

  return {
    // 백엔드는 quotePending 을 따로 안 내려 주므로 항상 클라이언트 계산값.
    quotePending: computed.quotePending,
    unpaid: viewFilterCounts.unpaid ?? computed.unpaid,
    to_be_shipped: viewFilterCounts.to_be_shipped ?? computed.to_be_shipped,
    shipped: viewFilterCounts.shipped ?? computed.shipped,
    processed: viewFilterCounts.processed ?? computed.processed,
    shipping_delay: viewFilterCounts.shipping_delay ?? computed.shipping_delay,
    error: viewFilterCounts.error ?? computed.error,
    refunds: viewFilterCounts.refunds ?? computed.refunds,
    problemProducts: computed.problemProducts,
  };
};

/**
 * orders 배열을 4개 사업 도메인별로 쪼개고 각 도메인의 ProfileOrderCounts 를
 * 계산한다. ProfileScreen 내주문 카드의 활성 탭에 맞춰 카운트를 골라 쓰면
 * 카드 셀(견적대기/결제대기/...)의 숫자가 그 도메인에 한정된 값이 된다.
 */
export const computeProfileOrderCountsByDomain = (
  orders: Array<{
    progressStatus?: string | null;
    paymentStatus?: string | null;
    firstTierCost?: ApiOrder['firstTierCost'];
    orderType?: string | null;
    orderMainInfo?: ApiOrder['orderMainInfo'];
  }>,
): ProfileOrderCountsByDomain => {
  const buckets: Record<BusinessDomain, typeof orders> = {
    purchase_agency: [],
    rocket_3pl: [],
    vvic_hipass: [],
    shipping_agency: [],
  };
  for (const order of orders) {
    buckets[classifyOrderDomain(order)].push(order);
  }
  // 구매대행 탭은 사용자가 인지하는 "발주관리 전체" 의미라 모든 주문을 합쳐서
  // 카운트한다. 즉 로켓·VVIC·배송대행 도메인의 주문도 그쪽 진행상태에 따라
  // 구매대행 셀(견적대기/고객결제/구매중/...)에 함께 누적된다.
  // 다른 3개 도메인(로켓/VVIC/배송대행)은 자기 도메인 주문만으로 한정.
  return {
    purchase_agency: computeProfileOrderCounts(orders),
    rocket_3pl: computeProfileOrderCounts(buckets.rocket_3pl),
    vvic_hipass: computeProfileOrderCounts(buckets.vvic_hipass),
    shipping_agency: computeProfileOrderCounts(buckets.shipping_agency),
  };
};

export const computeProfileDashboardCounts = (
  orders: Array<{
    progressStatus?: string | null;
    statusHistory?: Array<{ status?: string | null }>;
    paymentStatus?: string | null;
    firstTierCost?: ApiOrder['firstTierCost'];
    orderMainInfo?: ApiOrder['orderMainInfo'];
    orderType?: string | null;
    orderNumber?: string | null;
    unreadCount?: number;
  }>,
): ProfileDashboardCounts => {
  const counts = { ...EMPTY_DASHBOARD_COUNTS };
  const progressCounts = computeProgressStatusCounts(orders);

  // ─── 내 주문 ─────────────────────────────────────────────
  // 발주 결제 — 구매결제대기 (P_PENDING)
  counts.purchasePaymentPending = progressCounts.P_PENDING ?? 0;
  // 출고 결제 — 출고결제대기. 백엔드/도메인 별로 IO_PAY_PENDING 또는
  // IO_SHIP_PAY_PENDING 으로 들어올 수 있어 둘 다 합산.
  counts.shipPaymentPending =
    (progressCounts.IO_PAY_PENDING ?? 0) +
    (progressCounts.IO_SHIP_PAY_PENDING ?? 0);
  // 미확인 — 라벨이 미확인인 (unreadCount > 0) 주문 수
  for (const order of orders) {
    if ((order.unreadCount ?? 0) > 0) {
      counts.unconfirmed += 1;
    }
  }

  // ─── 오류 ────────────────────────────────────────────────
  counts.problemProduct = progressCounts.P_MA_PROBLEM ?? 0;
  // 현지배송지연 — IO_DELAY (이전엔 errorInbound = E_ERROR 였으나 사용자
  // 요구에 따라 의미를 "현지배송지연" 으로 변경).
  counts.errorInbound = progressCounts.IO_DELAY ?? 0;
  // 출고보류 — E_SHIPMENT_HOLD 만 (이전엔 반품관리 USER_REFUND_REQ 까지
  // 합산했지만 사용자 요구는 출고보류 단독).
  counts.shipmentHold = progressCounts.E_SHIPMENT_HOLD ?? 0;

  return counts;
};

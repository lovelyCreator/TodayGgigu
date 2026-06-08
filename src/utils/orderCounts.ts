import type { Order as ApiOrder } from '../services/orderApi';
import { resolveOrderProgressStatus } from '../services/orderApi';

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

export const getOrderProgressStatus = (order: {
  progressStatus?: string | null;
  statusHistory?: Array<{ status?: string | null }>;
  paymentStatus?: string | null;
  firstTierCost?: ApiOrder['firstTierCost'];
  orderMainInfo?: ApiOrder['orderMainInfo'];
}): string =>
  resolveOrderProgressStatus({
    progressStatus: order.progressStatus,
    statusHistory: order.statusHistory,
    paymentStatus: order.paymentStatus,
    firstTierCost: order.firstTierCost,
    orderMainInfo: order.orderMainInfo,
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

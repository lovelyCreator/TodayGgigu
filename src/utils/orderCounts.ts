import type { Order as ApiOrder } from '../services/orderApi';
import { resolveOrderProgressStatus } from '../services/orderApi';

export type ProfileOrderCounts = {
  // 견적대기 — P_QUOTE 가 그대로 남은 주문(결제대기로 자동 전환되지 않은 것).
  // resolvePurchaseAgencyProgressStatus 가 P_QUOTE + paymentPending + hasQuoteTotal>0
  // 인 주문을 자동으로 BUY_PAY_WAIT(결제대기) 로 옮기므로, 견적이 떨어지지 않은
  // 또는 paymentStatus 가 pending 이 아닌 P_QUOTE 만 여기에 남는다.
  quotePending: number;
  // 결제대기(고객결제) — BUY_PAY_WAIT / P_PENDING / 자동 전환된 P_QUOTE.
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
  unpaid: ['BUY_PAY_WAIT', 'P_PENDING'],
  to_be_shipped: [
    'P_RECEIPT_APPLICATION',
    'WH_ARRIVE_EXPECTED',
    'WH_IN_PROGRESS',
    'WH_IN_DONE',
    'WH_PICK_DONE',
    'WH_PAY_WAIT',
    'WH_SHIPPED',
  ],
  shipped: ['INTERNATIONAL_SHIPPING', 'INTERNATIONAL_SHIPPED'],
  shipping_delay: ['DELIVERY_EXCEPTION'],
  processed: ['ORDER_RECEIVED'],
  problemProducts: ['BUYING_PROBLEM'],
  error: ['ERR_IN', 'NO_ORDER_INFO'],
  refunds: ['USER_REFUND_REQ', 'USER_REFUND_COMPLETED'],
};

export const getOrderProgressStatus = (order: {
  progressStatus?: string | null;
  paymentStatus?: string | null;
  firstTierCost?: ApiOrder['firstTierCost'];
  orderMainInfo?: ApiOrder['orderMainInfo'];
}): string =>
  resolveOrderProgressStatus({
    progressStatus: order.progressStatus,
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
  return {
    purchase_agency: computeProfileOrderCounts(buckets.purchase_agency),
    rocket_3pl: computeProfileOrderCounts(buckets.rocket_3pl),
    vvic_hipass: computeProfileOrderCounts(buckets.vvic_hipass),
    shipping_agency: computeProfileOrderCounts(buckets.shipping_agency),
  };
};

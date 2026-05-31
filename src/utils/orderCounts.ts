import type { Order as ApiOrder } from '../services/orderApi';
import { resolveOrderProgressStatus } from '../services/orderApi';

export type ProfileOrderCounts = {
  unpaid: number;
  to_be_shipped: number;
  shipped: number;
  processed: number;
  shipping_delay: number;
  error: number;
  refunds: number;
  problemProducts: number;
};

const EMPTY_PROFILE_COUNTS: ProfileOrderCounts = {
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

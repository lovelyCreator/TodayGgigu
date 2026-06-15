import { TradeApplicationStatus } from '../types/tradeApplication';

const STATUS_KEYS: Record<TradeApplicationStatus, string> = {
  SUBMITTED: 'profile.unitSurvey.status.submitted',
  RECEIVED: 'profile.unitSurvey.status.received',
  PAYMENT_PENDING: 'profile.unitSurvey.status.paymentPending',
  PAID: 'profile.unitSurvey.status.paid',
  IN_PROGRESS: 'profile.unitSurvey.status.inProgress',
  COMPLETED: 'profile.unitSurvey.status.completed',
  CANCELLED: 'profile.unitSurvey.status.cancelled',
  REJECTED: 'profile.unitSurvey.status.rejected',
};

export const getTradeApplicationStatusLabelKey = (
  status: TradeApplicationStatus | string,
): string => STATUS_KEYS[status as TradeApplicationStatus] ?? 'profile.unitSurvey.status.unknown';

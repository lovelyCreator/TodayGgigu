import { normalizeProgressStatus } from '../services/orderApi';
import {
  API_PROGRESS_STATUS_I18N,
  resolveProgressStatusTranslationKey,
} from './apiProgressStatus';

/** i18n keys under `pages.orders.status.*` (aligned with web order-management dashboard). */
const PROGRESS_STATUS_I18N: Record<string, string> = {
  ...API_PROGRESS_STATUS_I18N,
};

export const getOrderProgressStatusLabel = (
  t: (key: string) => string,
  rawStatus?: string | null,
): string => {
  const code = normalizeProgressStatus(rawStatus);
  if (!code) return '';

  const pagesKey =
    PROGRESS_STATUS_I18N[code] ?? resolveProgressStatusTranslationKey(code);
  if (pagesKey) {
    const label = t(pagesKey);
    if (label && label !== pagesKey) return label;
  }

  return code;
};

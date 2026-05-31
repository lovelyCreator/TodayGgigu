import { translations } from '../i18n/translations';

// Helper function to get translated text
export const getTranslation = (key: string, locale: 'en' | 'ko' | 'zh') => {
  const keys = key.split('.');
  let value: any = translations[locale as keyof typeof translations];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
};

// Helper function to create translation function for a specific locale
export const createTranslationFunction = (locale: 'en' | 'ko' | 'zh') => {
  return (key: string) => getTranslation(key, locale);
};

export type AppLocale = 'en' | 'ko' | 'zh';

const LOCALE_KEYS: AppLocale[] = ['en', 'ko', 'zh'];

const LOCALE_KEY_ALIASES: Record<AppLocale, string[]> = {
  en: ['en', 'english', 'EN', 'en-US', 'en_US'],
  ko: ['ko', 'kr', 'korean', 'KO', 'KR', 'ko-KR', 'ko_KR'],
  zh: ['zh', 'cn', 'chinese', 'ZH', 'CN', 'zh-CN', 'zh_CN', 'zh-Hans', 'zh_Hans'],
};

/** i18n fallback labels — must not be treated as real store names. */
export const UNKNOWN_STORE_PLACEHOLDER_LABELS = new Set([
  'Unknown Store',
  '알 수 없는 매장',
  '未知店铺',
  'orderDetail.unknownStore',
  'profile.unknownStore',
]);

// Helper function to get localized text from multilingual object
export const getLocalizedText = (textObj: { en: string; ko: string; zh: string }, locale: AppLocale) => {
  return textObj[locale] || textObj.en; // Fallback to English if locale not found
};

const tryParseJsonRecord = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const pickLocalizedFromRecord = (obj: Record<string, unknown>, locale: AppLocale): string => {
  for (const key of LOCALE_KEY_ALIASES[locale]) {
    const candidate = obj[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (candidate != null && typeof candidate === 'object') {
      const nested = resolveLocalizedValue(candidate, locale);
      if (nested) return nested;
    }
  }
  for (const key of LOCALE_KEYS) {
    const candidate = obj[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  for (const [key, candidate] of Object.entries(obj)) {
    if (key.startsWith('_') || key.startsWith('$')) continue;
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (candidate != null && typeof candidate === 'object') {
      const nested = resolveLocalizedValue(candidate, locale);
      if (nested) return nested;
    }
  }
  return '';
};

/** Resolve API multi-lang fields (companyName, subjectMultiLang, etc.) to a display string. */
export const resolveLocalizedValue = (value: unknown, locale: AppLocale): string => {
  if (value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parsed = tryParseJsonRecord(trimmed);
    if (parsed) return pickLocalizedFromRecord(parsed, locale);
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'object') return '';

  return pickLocalizedFromRecord(value as Record<string, unknown>, locale);
};

const INVALID_DISPLAY_STRINGS = new Set(['[object Object]', '[object Array]']);

export const isPlaceholderStoreLabel = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (INVALID_DISPLAY_STRINGS.has(trimmed)) return true;
  return UNKNOWN_STORE_PLACEHOLDER_LABELS.has(trimmed);
};

/** Safe UI string — never returns a non-string or [object Object]. */
export const coerceDisplayText = (
  value: unknown,
  locale: AppLocale,
  fallback = '',
): string => {
  let text = '';
  if (typeof value === 'string') {
    text = value.trim();
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    text = String(value);
  } else if (value != null && typeof value === 'object') {
    text = resolveLocalizedValue(value, locale);
  }
  if (!text || INVALID_DISPLAY_STRINGS.has(text)) return fallback;
  return text;
};

const collectOrderItemCompanyNameCandidates = (
  item: Record<string, unknown>,
): unknown[] => {
  const seller =
    item.seller && typeof item.seller === 'object'
      ? (item.seller as Record<string, unknown>)
      : null;
  const metadata =
    item.metadata && typeof item.metadata === 'object'
      ? (item.metadata as Record<string, unknown>)
      : null;
  const original1688 =
    metadata?.original1688Data && typeof metadata.original1688Data === 'object'
      ? (metadata.original1688Data as Record<string, unknown>)
      : null;
  const product =
    item.product && typeof item.product === 'object'
      ? (item.product as Record<string, unknown>)
      : null;

  const candidates: unknown[] = [
    item.companyNameMultiLang,
    typeof item.companyName === 'object' && item.companyName != null ? item.companyName : null,
    original1688?.companyName,
    product?.companyName,
    metadata?.companyName,
    seller?.companyName,
    seller?.name,
    item.shop_name,
    item.shopName,
    item.storeNameMultiLang,
    item.storeName,
    item.sellerName,
  ];

  if (typeof item.companyName === 'string') {
    const parsed = tryParseJsonRecord(item.companyName);
    if (parsed) candidates.push(parsed);
    else if (!isPlaceholderStoreLabel(item.companyName)) candidates.push(item.companyName);
  }

  return candidates.filter((c) => c != null && c !== '');
};

/** Store / seller label from an order line item (orders-proxy shapes). */
export const resolveOrderItemCompanyName = (
  item: Record<string, unknown> | null | undefined,
  locale: AppLocale,
): string => {
  if (!item) return '';
  for (const candidate of collectOrderItemCompanyNameCandidates(item)) {
    const text = coerceDisplayText(candidate, locale, '');
    if (text && !isPlaceholderStoreLabel(text)) return text;
  }
  return '';
};

/** Same fields ProductDetailScreen uses for 1688 / Taobao detail payloads. */
export const extractCompanyNameFromProductDetail = (
  data: unknown,
  locale: AppLocale,
): string => {
  if (!data || typeof data !== 'object') return '';
  const root = data as Record<string, unknown>;
  const product =
    root.product && typeof root.product === 'object'
      ? (root.product as Record<string, unknown>)
      : root;
  const metadata =
    product.metadata && typeof product.metadata === 'object'
      ? (product.metadata as Record<string, unknown>)
      : null;
  const original1688 =
    metadata?.original1688Data && typeof metadata.original1688Data === 'object'
      ? (metadata.original1688Data as Record<string, unknown>)
      : null;

  const candidates = [
    product.companyName,
    original1688?.companyName,
    product.seller && typeof product.seller === 'object'
      ? (product.seller as Record<string, unknown>).name ??
        (product.seller as Record<string, unknown>).companyName
      : undefined,
    root.shop_name,
    product.shop_name,
  ];

  for (const candidate of candidates) {
    const text = coerceDisplayText(candidate, locale, '');
    if (text && !isPlaceholderStoreLabel(text)) return text;
  }
  return '';
};

// Price conversion factor: multiply by 210.78 to convert to KRW
// const PRICE_CONVERSION_FACTOR = 210.78;
const PRICE_CONVERSION_FACTOR = 1;

// Helper function to convert price to KRW
export const convertToKRW = (price: number): number => {
  return price * PRICE_CONVERSION_FACTOR;
};

// Helper function to convert price from KRW back to CNY (for API calls)
export const convertFromKRW = (krwPrice: number): number => {
  return krwPrice / PRICE_CONVERSION_FACTOR;
};

// Helper function to format price in KRW
export const formatPriceKRW = (price: number): string => {
  const krwPrice = convertToKRW(price);
  return `₩${krwPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

// Helper function to format KRW price directly (when price is already in KRW)
export const formatKRWDirect = (krwPrice: number): string => {
  return `₩${krwPrice.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

// Helper function to format currency based on locale (now always returns KRW)
export const formatCurrency = (amount: number, locale: 'en' | 'ko' | 'zh') => {
  // Always return KRW format regardless of locale
  return formatPriceKRW(amount);
};

// Helper function to format numbers based on locale
export const formatNumber = (num: number, locale: 'en' | 'ko' | 'zh') => {
  switch (locale) {
    case 'ko':
      return num.toLocaleString('ko-KR');
    case 'zh':
      return num.toLocaleString('zh-CN');
    case 'en':
    default:
      return num.toLocaleString('en-US');
  }
};

// Helper function to format large numbers in shortened format (e.g., 10000000 -> "10M")
export const formatShortNumber = (num: number): string => {
  if (num >= 1000000000) {
    // Billions
    const billions = num / 1000000000;
    return billions % 1 === 0 ? `${billions}B` : `${billions.toFixed(1)}B`;
  } else if (num >= 1000000) {
    // Millions
    const millions = num / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  } else if (num >= 1000) {
    // Thousands
    const thousands = num / 1000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
  } else {
    // Less than 1000, show as is
    return num.toString();
  }
};

// Helper function to format deposit balance with currency in shortened format
// Converts from CNY to KRW first, then formats in shortened format
export const formatDepositBalance = (balanceCNY: number): string => {
  // Convert CNY to KRW
  const balanceKRW = convertToKRW(balanceCNY);
  // Format in shortened format
  const formatted = formatShortNumber(balanceKRW);
  return `₩${formatted}`;
};

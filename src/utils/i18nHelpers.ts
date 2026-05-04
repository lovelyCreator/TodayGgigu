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

// Helper function to get localized text from multilingual object
export const getLocalizedText = (textObj: { en: string; ko: string; zh: string }, locale: 'en' | 'ko' | 'zh') => {
  return textObj[locale] || textObj.en; // Fallback to English if locale not found
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

import { translations } from './translations';

export type AppLocale = 'en' | 'ko' | 'zh';

export const normalizeLocale = (locale?: string | null): AppLocale => {
  if (locale === 'en' || locale === 'zh') return locale;
  if (locale === 'ko' || locale === 'kr') return 'ko';
  return 'ko';
};

/** Resolve a dotted i18n key with locale fallbacks (current → ko → en). */
export const translate = (
  key: string,
  locale?: string | null,
  params?: Record<string, string>,
): string => {
  const normalized = normalizeLocale(locale);
  const keys = key.split('.');

  const resolve = (loc: AppLocale): string | undefined => {
    let value: unknown = translations[loc];
    for (const k of keys) {
      if (value == null || typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[k];
    }
    return typeof value === 'string' ? value : undefined;
  };

  let text =
    resolve(normalized) ??
    resolve('ko') ??
    resolve('en') ??
    key;

  if (params) {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(`{${paramKey}}`, params[paramKey]);
    });
  }

  return text;
};

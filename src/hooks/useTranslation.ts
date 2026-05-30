import { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { translate, normalizeLocale, type AppLocale } from '../i18n/translate';

export const useTranslation = () => {
  const rawLocale = useAppSelector((state) => state.i18n?.locale);
  const locale = normalizeLocale(rawLocale);

  const t = useCallback(
    (key: string, params?: Record<string, string>) => translate(key, locale, params),
    [locale],
  );

  return { t, locale: locale as AppLocale };
};

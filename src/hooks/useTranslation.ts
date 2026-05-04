import { useAppSelector } from '../store/hooks';
import { translations } from '../i18n/translations';

export const useTranslation = () => {
  const locale = useAppSelector((state) => state.i18n?.locale || 'ko');

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations] || translations.ko;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return { t, locale };
};
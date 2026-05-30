import type { AdditionalServiceDto } from '../services/additionalServicesApi';

export type AdditionalServiceType = 'origin' | 'packaging' | 'carton' | 'inspection';

export interface MappedExtraService {
  id: string;
  name: string;
  iconUrl?: string;
  imageUrl?: string;
  price?: string;
  description?: string;
  serviceType?: AdditionalServiceType;
}

export interface MappedServiceCategory {
  id: string;
  titleKey: 'origin' | 'package' | 'carton' | 'inspect';
  required?: boolean;
  items: MappedExtraService[];
}

const SERVICE_TYPE_ORDER: AdditionalServiceType[] = [
  'origin',
  'packaging',
  'carton',
  'inspection',
];

const CATEGORY_META: Record<
  AdditionalServiceType,
  { id: string; titleKey: MappedServiceCategory['titleKey']; required?: boolean }
> = {
  origin: { id: 'cat-origin', titleKey: 'origin', required: true },
  packaging: { id: 'cat-package', titleKey: 'package' },
  carton: { id: 'cat-carton', titleKey: 'carton' },
  inspection: { id: 'cat-inspect', titleKey: 'inspect' },
};

const isServiceType = (value: string): value is AdditionalServiceType =>
  SERVICE_TYPE_ORDER.includes(value as AdditionalServiceType);

export const pickAdditionalServiceName = (
  item: AdditionalServiceDto,
  locale: string,
): string => {
  if (locale === 'zh') return item.nameZh || item.name;
  if (locale === 'en') return item.nameEn || item.name;
  return item.name;
};

export const pickAdditionalServiceDescription = (
  item: AdditionalServiceDto,
  locale: string,
): string => {
  const multi = item.descriptionMultiLang;
  if (multi) {
    if (locale === 'zh' && multi.zh) return multi.zh;
    if (locale === 'en' && multi.en) return multi.en;
    if (multi.ko) return multi.ko;
    if (multi.zh) return multi.zh;
    if (multi.en) return multi.en;
  }
  return item.description || '';
};

export const formatAdditionalServicePrice = (
  price: number,
  currency: string | undefined,
  quoteLabel: string,
): string => {
  if (price === 0) return quoteLabel;
  const symbol = currency === 'CNY' ? '¥' : currency || '¥';
  return `${symbol}${price}/PCS`;
};

export const mapAdditionalServicesToCategories = (
  items: AdditionalServiceDto[],
  locale: string,
  quoteLabel: string,
): MappedServiceCategory[] => {
  const grouped = new Map<AdditionalServiceType, MappedExtraService[]>();
  for (const type of SERVICE_TYPE_ORDER) {
    grouped.set(type, []);
  }

  for (const item of items) {
    if (!isServiceType(item.serviceType)) continue;
    grouped.get(item.serviceType)!.push({
      id: item.id,
      name: pickAdditionalServiceName(item, locale),
      iconUrl: item.icon,
      imageUrl: item.imageUrl,
      price: formatAdditionalServicePrice(item.price, item.feeCurrency, quoteLabel),
      description: pickAdditionalServiceDescription(item, locale),
      serviceType: item.serviceType,
    });
  }

  return SERVICE_TYPE_ORDER.map((type) => {
    const meta = CATEGORY_META[type];
    return {
      id: meta.id,
      titleKey: meta.titleKey,
      required: meta.required,
      items: grouped.get(type) || [],
    };
  }).filter((cat) => cat.items.length > 0);
};

import { SERVER_BASE_URL } from '../constants';
import { AddToCartRequest, MultiLang } from '../services/cartApi';
import { coerceDisplayText, getLocalizedText, type AppLocale } from './i18nHelpers';

export interface OrderItemCartFallback {
  subject?: string;
  subjectTrans?: string;
  subjectMultiLang?: Record<string, string>;
  companyName?: string | Record<string, string>;
  companyNameMultiLang?: Record<string, unknown>;
  categoryName?: string | Record<string, string>;
  sellerOpenId?: string;
  imageUrl?: string;
  source?: string;
  offerId?: string;
  skuId?: string;
  specId?: string;
  skuAttributes?: any[];
  price?: number;
}

export interface BuildAddToCartOptions {
  productDetail?: any | null;
  quantity: number;
  locale?: AppLocale | string;
  preferredSkuId?: string | number;
  preferredSpecId?: string;
  selectedSku?: any;
  selectedVariations?: Record<string, string>;
  orderItemFallback?: OrderItemCartFallback;
}

type LocaleSlot = 'en' | 'ko' | 'zh';

export function stripAlicdnSizeSuffix(url: string): string {
  return url ? url.replace(/_\d+x\d+\.(jpg|jpeg|png|webp)$/i, '') : url;
}

function localeFromText(text: string): LocaleSlot {
  if (/[가-힯ᄀ-ᇿ㄰-㆏]/.test(text)) return 'ko';
  if (/[一-鿿]/.test(text)) return 'zh';
  return 'en';
}

function containsChinese(s: string): boolean {
  return /[一-鿿]/.test(s);
}

function containsHangul(s: string): boolean {
  return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(s);
}

function normalizeMultiLangObject(input: unknown): MultiLang {
  const merged: MultiLang = {};
  if (!input || typeof input !== 'object') return merged;
  const obj = input as Record<string, unknown>;
  const zh = typeof obj.zh === 'string' ? obj.zh.trim() : '';
  const ko = typeof obj.ko === 'string' ? obj.ko.trim() : '';
  const en = typeof obj.en === 'string' ? obj.en.trim() : '';
  if (zh && containsChinese(zh)) merged.zh = zh;
  if (ko && containsHangul(ko)) merged.ko = ko;
  if (en && !containsChinese(en) && !containsHangul(en)) merged.en = en;
  return merged;
}

function buildMultiLangFromText(value: unknown): MultiLang {
  if (value == null) return {};
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return {};
    return { [localeFromText(trimmed)]: trimmed };
  }
  return normalizeMultiLangObject(value);
}

function resolveText(value: unknown, locale: AppLocale): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, string>;
    if ('en' in o || 'ko' in o || 'zh' in o) {
      return getLocalizedText(
        { en: o.en ?? '', ko: o.ko ?? '', zh: o.zh ?? '' },
        locale,
      );
    }
  }
  return String(value);
}

function unwrapProduct(detail: any): Record<string, any> {
  if (!detail) return {};
  return detail.product && typeof detail.product === 'object' ? detail.product : detail;
}

function walkCompanyCandidates(product: Record<string, any>, fallback: OrderItemCartFallback): unknown[] {
  const metadata =
    product.metadata && typeof product.metadata === 'object' ? product.metadata : null;
  const original1688 =
    metadata?.original1688Data && typeof metadata.original1688Data === 'object'
      ? metadata.original1688Data
      : null;
  const rawCandidates = (product as any)._rawCompanyNameCandidates;
  const list: unknown[] = [];
  if (Array.isArray(rawCandidates)) list.push(...rawCandidates);
  list.push(
    product.companyName,
    original1688?.companyName,
    product.seller?.companyName,
    product.seller?.name,
    fallback.companyNameMultiLang,
    typeof fallback.companyName === 'object' ? fallback.companyName : null,
    typeof fallback.companyName === 'string' ? fallback.companyName : null,
  );
  return list;
}

function findChineseCompanyName(
  product: Record<string, any>,
  fallback: OrderItemCartFallback,
): string {
  for (const cand of walkCompanyCandidates(product, fallback)) {
    if (cand && typeof cand === 'object' && typeof (cand as any).zh === 'string') {
      const zh = (cand as any).zh.trim();
      if (zh && containsChinese(zh)) return zh;
    }
    if (typeof cand === 'string' && containsChinese(cand)) return cand.trim();
  }
  return '';
}

function findKoreanCompanyName(
  product: Record<string, any>,
  fallback: OrderItemCartFallback,
): string {
  for (const cand of walkCompanyCandidates(product, fallback)) {
    if (cand && typeof cand === 'object' && typeof (cand as any).ko === 'string') {
      const ko = (cand as any).ko.trim();
      if (ko && containsHangul(ko)) return ko;
    }
    if (typeof cand === 'string' && containsHangul(cand)) return cand.trim();
  }
  return '';
}

function findEnglishCompanyName(
  product: Record<string, any>,
  fallback: OrderItemCartFallback,
): string {
  for (const cand of walkCompanyCandidates(product, fallback)) {
    if (cand && typeof cand === 'object' && typeof (cand as any).en === 'string') {
      const en = (cand as any).en.trim();
      if (en && !containsChinese(en) && !containsHangul(en)) return en;
    }
    if (
      typeof cand === 'string' &&
      cand.trim() &&
      !containsChinese(cand) &&
      !containsHangul(cand)
    ) {
      return cand.trim();
    }
  }
  return '';
}

function buildCompanyMultiLang(
  product: Record<string, any>,
  fallback: OrderItemCartFallback,
): MultiLang {
  const fromOrder = normalizeMultiLangObject(
    fallback.companyNameMultiLang ??
      (typeof fallback.companyName === 'object' ? fallback.companyName : undefined),
  );
  if (typeof fallback.companyName === 'string' && fallback.companyName.trim()) {
    Object.assign(fromOrder, buildMultiLangFromText(fallback.companyName));
  }

  const companyMultiLang: MultiLang = { ...fromOrder };
  const companyZh = findChineseCompanyName(product, fallback);
  const companyKo = findKoreanCompanyName(product, fallback);
  const companyEn = findEnglishCompanyName(product, fallback);
  if (companyZh) companyMultiLang.zh = companyZh;
  if (companyKo) companyMultiLang.ko = companyKo;
  if (companyEn) companyMultiLang.en = companyEn;
  return companyMultiLang;
}

function mapSkuAttributes(attrs: any[]): AddToCartRequest['skuInfo']['skuAttributes'] {
  return (attrs || []).map((attr: any) => ({
    attributeId: parseInt(attr.attributeId || attr.propId || '0', 10) || 0,
    attributeName: attr.attributeName || attr.prop_name || '',
    attributeNameTrans:
      attr.attributeNameTrans || attr.attributeName || attr.prop_name || '',
    value: attr.value || attr.value_name || attr.value_desc || '',
    valueTrans:
      attr.valueTrans || attr.value_name || attr.value_desc || attr.value || '',
    skuImageUrl: stripAlicdnSizeSuffix(attr.skuImageUrl || attr.image || ''),
  }));
}

export function buildOrderItemCartFallback(item: {
  productName?: string;
  image?: string;
  price?: number;
  companyName?: string | Record<string, string>;
  companyNameMultiLang?: Record<string, unknown>;
  sellerOpenId?: string;
  offerId?: string;
  skuId?: string;
  specId?: string;
  source?: string;
  skuAttributes?: any[];
}): OrderItemCartFallback {
  const subject = item.productName || '';
  const subjectMultiLang = subject ? buildMultiLangFromText(subject) : {};
  return {
    subject,
    subjectTrans: subject,
    subjectMultiLang,
    companyName: item.companyName,
    companyNameMultiLang: item.companyNameMultiLang,
    sellerOpenId: item.sellerOpenId,
    imageUrl: item.image,
    source: item.source,
    offerId: item.offerId,
    skuId: item.skuId,
    specId: item.specId,
    skuAttributes: item.skuAttributes,
    price: item.price,
  };
}

export function buildAddToCartRequestFromDetail(
  options: BuildAddToCartOptions,
): AddToCartRequest | null {
  const locale = (options.locale || 'ko') as AppLocale;
  const fallback = options.orderItemFallback ?? {};
  const product = unwrapProduct(options.productDetail);
  const source = product.source || fallback.source || '1688';
  const offerIdStr = String(product.offerId ?? product.id ?? fallback.offerId ?? '0');
  const offerIdNum = parseInt(offerIdStr, 10) || 0;
  if (!offerIdNum) return null;

  const productSkuInfos = product.productSkuInfos || [];
  const rawVariants = product.rawVariants || [];
  const minOrderQuantity = product.minOrderQuantity || 1;

  let selectedSku: any = null;
  let selectedVariant: any = options.selectedSku ?? null;
  const prefSkuId = options.preferredSkuId != null ? String(options.preferredSkuId) : '';
  const prefSpecId = options.preferredSpecId ?? '';

  if (selectedVariant && !selectedVariant.skuAttributes && selectedVariant.attributes) {
    selectedVariant = { ...selectedVariant, skuAttributes: selectedVariant.attributes };
  }

  if (productSkuInfos.length > 0) {
    if (prefSkuId || prefSpecId) {
      selectedSku = productSkuInfos.find(
        (sku: any) =>
          (prefSkuId && String(sku.skuId) === prefSkuId) ||
          (prefSpecId && String(sku.specId) === prefSpecId),
      );
    }
    if (!selectedSku && selectedVariant?.skuId != null) {
      selectedSku = productSkuInfos.find(
        (sku: any) =>
          String(sku.skuId) === String(selectedVariant.skuId) ||
          (selectedVariant.specId && String(sku.specId) === String(selectedVariant.specId)),
      );
    }
    if (
      !selectedSku &&
      options.selectedVariations &&
      Object.keys(options.selectedVariations).length > 0
    ) {
      selectedSku = productSkuInfos.find((sku: any) =>
        Object.entries(options.selectedVariations!).every(([variationName, selectedValue]) =>
          (sku.skuAttributes || []).some((attr: any) => {
            const attrName = (attr.attributeNameTrans || attr.attributeName || '').toLowerCase();
            const attrValue = attr.valueTrans || attr.value || '';
            return attrName === variationName.toLowerCase() && attrValue === selectedValue;
          }),
        ),
      );
    }
    if (!selectedSku && productSkuInfos.length > 0) {
      selectedSku = productSkuInfos[0];
    }
  }

  if (!selectedVariant && rawVariants.length > 0) {
    if (prefSkuId || prefSpecId) {
      selectedVariant = rawVariants.find(
        (v: any) =>
          (prefSkuId && String(v.skuId || v.id) === prefSkuId) ||
          (prefSpecId && String(v.specId) === prefSpecId),
      );
    }
    if (
      !selectedVariant &&
      options.selectedVariations &&
      Object.keys(options.selectedVariations).length > 0
    ) {
      selectedVariant = rawVariants.find((variant: any) =>
        Object.entries(options.selectedVariations!).every(([variationName, selectedValue]) =>
          (variant.name || '')
            .toLowerCase()
            .includes(`${variationName}: ${selectedValue}`.toLowerCase()),
        ),
      );
    }
    if (!selectedVariant) {
      selectedVariant = rawVariants[0];
    }
    if (!selectedSku && selectedVariant?.skuId != null && productSkuInfos.length > 0) {
      selectedSku = productSkuInfos.find(
        (sku: any) => String(sku.skuId) === String(selectedVariant.skuId),
      );
    }
  }

  const hasNoOptions = rawVariants.length === 0 && productSkuInfos.length === 0;
  const defaultSkuFromOffer = hasNoOptions ? offerIdStr : '0';
  const skuIdFromVariant = selectedVariant?.skuId || selectedVariant?.id || null;
  const variantPrice = selectedVariant?.price ?? null;

  const finalSkuId =
    skuIdFromVariant ||
    selectedSku?.skuId ||
    (prefSkuId || null) ||
    defaultSkuFromOffer;
  const isTaobao = source === 'taobao';
  const finalSpecId = isTaobao
    ? String(finalSkuId)
    : selectedSku?.specId?.toString() ||
      prefSpecId ||
      (hasNoOptions ? offerIdStr : String(finalSkuId));
  const finalPrice =
    variantPrice ??
    selectedSku?.price ??
    selectedSku?.consignPrice ??
    fallback.price ??
    product.price ??
    0;
  const finalPriceStr = String(finalPrice);
  const skuIdValue =
    typeof finalSkuId === 'string' ? parseInt(finalSkuId, 10) || 0 : Number(finalSkuId) || 0;

  const subjectTransText =
    resolveText(product.subjectTrans || product.name || product.subject, locale) ||
    coerceDisplayText(fallback.subjectMultiLang, locale, '') ||
    fallback.subjectTrans ||
    fallback.subject ||
    '';
  const rawSubjectMultiLang = normalizeMultiLangObject(
    product.subjectMultiLang ?? product.subjectMultilang ?? fallback.subjectMultiLang,
  );
  const subjectMultiLang: MultiLang =
    Object.keys(rawSubjectMultiLang).length > 0
      ? rawSubjectMultiLang
      : subjectTransText
        ? buildMultiLangFromText(subjectTransText)
        : {};

  const rawCategoryName = product.categoryName ?? fallback.categoryName;
  const categoryName: string | MultiLang =
    rawCategoryName && typeof rawCategoryName === 'object'
      ? normalizeMultiLangObject(rawCategoryName)
      : typeof rawCategoryName === 'string' && rawCategoryName
        ? rawCategoryName
        : '';

  const rawImageUrl = product.images?.[0] || product.image || fallback.imageUrl || '';
  const cleanImageUrl = stripAlicdnSizeSuffix(rawImageUrl);
  const promotionUrl = isTaobao
    ? `${SERVER_BASE_URL}/${offerIdStr}`
    : product.promotionUrl || '';

  const skuAttrsSource =
    selectedSku?.skuAttributes ||
    selectedVariant?.skuAttributes ||
    selectedVariant?.attributes ||
    fallback.skuAttributes ||
    [];

  return {
    offerId: offerIdNum,
    categoryName,
    subject: subjectTransText,
    subjectTrans: subjectTransText,
    subjectMultiLang,
    imageUrl: cleanImageUrl,
    promotionUrl,
    source,
    originalSource: product.originalSource || source,
    skuInfo: {
      skuId: skuIdValue,
      specId: finalSpecId,
      price: finalPriceStr,
      amountOnSale: (() => {
        // 1688/타오바오 SKU 응답이 `amountOnSale` 을 빠뜨리거나 0/1 같은
        // 비현실적으로 작은 값으로 보내는 경우가 잦아, 그대로 backend 에
        // 저장하면 사용자가 수량을 +1 만 해도 "Only 1 items available in
        // stock" 으로 거절된다. 의미 있는 양수가 아니면 999999 로 보정.
        const raw =
          selectedSku?.amountOnSale ??
          selectedVariant?.stock ??
          (hasNoOptions ? 999999 : undefined);
        const n = Number(raw);
        return Number.isFinite(n) && n > 1 ? n : 999999;
      })(),
      consignPrice: String(selectedSku?.consignPrice || finalPriceStr),
      cargoNumber: selectedSku?.cargoNumber || '',
      skuAttributes: mapSkuAttributes(skuAttrsSource),
      fenxiaoPriceInfo: selectedSku?.fenxiaoPriceInfo
        ? {
            onePiecePrice:
              selectedSku.fenxiaoPriceInfo.onePiecePrice ||
              selectedSku.fenxiaoPriceInfo.offerPrice ||
              finalPriceStr,
            offerPrice:
              selectedSku.fenxiaoPriceInfo.offerPrice ||
              selectedSku.fenxiaoPriceInfo.onePiecePrice ||
              finalPriceStr,
          }
        : { onePiecePrice: finalPriceStr, offerPrice: finalPriceStr },
    },
    companyName: buildCompanyMultiLang(product, fallback),
    sellerOpenId:
      product.seller?.id || product.sellerOpenId || fallback.sellerOpenId || '',
    quantity: options.quantity,
    minOrderQuantity,
  };
}

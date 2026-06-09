import AsyncStorage from '@react-native-async-storage/async-storage';

export type SkuLabelSettings = {
  labelType: 'product' | 'foodInspect';
  labelFormat: '50x80' | '40x60';
  labelProductName: string;
  labelContent: string;
  labelBarcode: string;
  labelFileUri: string | null;
  /** 라벨설정 모달에서 저장을 눌렀을 때 true — 👁 아이콘 활성 기준. */
  configured: boolean;
};

export type OnlineProductEditDraft = {
  productName: string;
  categoryName: string;
  thumbUrls: string[];
  /** 구버전 드래프트 호환 */
  thumbUrl?: string;
  optionLabel: string;
  remark: string;
  selectedOptionValues: Record<string, string>;
  skuPriceMap: Record<string, string>;
  skuRemarkMap: Record<string, string>;
  skuLabelMap: Record<string, SkuLabelSettings>;
  updatedAt: string;
};

const draftKey = (offerId: string) => `online_product_edit_draft_${offerId}`;

export const createEmptySkuLabel = (productName = ''): SkuLabelSettings => ({
  labelType: 'product',
  labelFormat: '50x80',
  labelProductName: productName,
  labelContent: '',
  labelBarcode: '(01)01234567890128TEC-IT',
  labelFileUri: null,
  configured: false,
});

export const isSkuLabelConfigured = (label?: SkuLabelSettings | null): boolean =>
  !!label?.configured;

const normalizeDraft = (parsed: OnlineProductEditDraft): OnlineProductEditDraft => {
  if (Array.isArray(parsed.thumbUrls)) return parsed;
  const legacy = parsed.thumbUrl?.trim();
  return {
    ...parsed,
    thumbUrls: legacy ? [legacy] : [],
  };
};

export const loadOnlineProductEditDraft = async (
  offerId: string,
): Promise<OnlineProductEditDraft | null> => {
  try {
    const raw = await AsyncStorage.getItem(draftKey(offerId));
    if (!raw) return null;
    return normalizeDraft(JSON.parse(raw) as OnlineProductEditDraft);
  } catch {
    return null;
  }
};

export const saveOnlineProductEditDraft = async (
  offerId: string,
  draft: Omit<OnlineProductEditDraft, 'updatedAt'>,
): Promise<void> => {
  const payload: OnlineProductEditDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(draftKey(offerId), JSON.stringify(payload));
};

/** SKU row types for the BuyList / product-mgmt cart selection modal. */

export type CartModalSizeVariant = {
  skuId: string;
  specId: string;
  size: string;
  price: number;
  attributes: any[];
};

export type CartModalSku = {
  skuId: string;
  specId: string;
  name: string;
  optionLabel: string;
  price: number;
  image: string;
  attributes: any[];
  sizes: CartModalSizeVariant[];
  selectedSizeIdx: number;
};

export interface BuildCartModalSkusInput {
  productName: string;
  galleryFirst?: string;
  unitPrice?: number;
  skuId?: string;
  specId?: string;
  offerId?: string;
  optionDefaultLabel?: string;
}

export function buildCartModalSkusFromDetail(
  apiProduct: any,
  input: BuildCartModalSkusInput,
): CartModalSku[] {
  const galleryFirst =
    input.galleryFirst ||
    apiProduct?.productImage?.images?.[0] ||
    '';
  const rawSkus: any[] = apiProduct?.productSkuInfos || [];
  const optionDefault = input.optionDefaultLabel || 'Default';
  const groupsMap = new Map<string, CartModalSku>();

  for (const sku of rawSkus) {
    const attrs: any[] = sku.skuAttributes || [];
    const color = String(attrs[0]?.valueTrans || attrs[0]?.value || '').trim();
    const size = String(attrs[1]?.valueTrans || attrs[1]?.value || '').trim();
    const groupKey = color || String(sku.skuId || sku.specId || '');
    const skuPrice = Number(sku.price ?? sku.consignPrice ?? input.unitPrice ?? 0);
    const variant: CartModalSizeVariant = {
      skuId: String(sku.skuId || ''),
      specId: String(sku.specId || ''),
      size,
      price: skuPrice,
      attributes: attrs,
    };
    const existing = groupsMap.get(groupKey);
    if (existing) {
      existing.sizes.push(variant);
    } else {
      const optionLabel =
        attrs[1]?.attributeNameTrans ||
        attrs[1]?.attributeName ||
        attrs[0]?.attributeNameTrans ||
        attrs[0]?.attributeName ||
        optionDefault;
      const image = attrs.find((a: any) => a.skuImageUrl)?.skuImageUrl || galleryFirst;
      groupsMap.set(groupKey, {
        skuId: String(sku.skuId || ''),
        specId: String(sku.specId || ''),
        name: color || input.productName,
        optionLabel: String(optionLabel),
        price: skuPrice,
        image,
        attributes: attrs,
        sizes: [variant],
        selectedSizeIdx: 0,
      });
    }
  }

  const skus: CartModalSku[] = Array.from(groupsMap.values());
  if (skus.length === 0) {
    const fallbackVariant: CartModalSizeVariant = {
      skuId: String(input.skuId || ''),
      specId: String(input.specId || input.offerId || ''),
      size: '',
      price: Number(input.unitPrice ?? 0),
      attributes: [],
    };
    skus.push({
      skuId: String(input.skuId || ''),
      specId: String(input.specId || input.offerId || ''),
      name: input.productName,
      optionLabel: optionDefault,
      price: Number(input.unitPrice ?? 0),
      image: galleryFirst,
      attributes: [],
      sizes: [fallbackVariant],
      selectedSizeIdx: 0,
    });
  }

  return skus;
}

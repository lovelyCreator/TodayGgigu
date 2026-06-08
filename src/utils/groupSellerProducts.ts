import type { SellerProduct } from '../services/productListApi';

/** 상품리스트 카드 1장 = offerId(1688 상품) 단위. 동일 상품의 SKU 행을 묶는다. */
export type GroupedSellerProduct = SellerProduct & {
  groupKey: string;
  /** 원본 product-list 레코드 _id (삭제·선택 시 전체 SKU 행 대상). */
  groupedRecordIds: string[];
  groupedSkuIds: string[];
  variantCount: number;
  minUnitPrice?: number;
  maxUnitPrice?: number;
};

const thumbUrl = (p: SellerProduct): string | null =>
  p.thumbnails?.find((th) => th.isThumbnail)?.url || p.thumbnails?.[0]?.url || null;

export const resolveSellerProductGroupKey = (product: SellerProduct): string => {
  const offerId = String(product.offerId ?? '').trim();
  if (offerId) return `offer:${offerId}`;
  const orderId = String(product.orderId ?? '').trim();
  if (orderId) return `order:${orderId}`;
  return `record:${product._id}`;
};

const collectSkuId = (product: SellerProduct): string => {
  const skuId = String(product.skuId ?? product.sku ?? '').trim();
  return skuId;
};

/**
 * GET /customer/product-list/products 는 SKU 마다 한 행을 내려준다.
 * offerId 기준으로 합쳐 상품 상세(products/detail)와 동일한 단위로 표시한다.
 */
export const groupSellerProductsByOffer = (
  products: SellerProduct[],
): GroupedSellerProduct[] => {
  const buckets = new Map<
    string,
    {
      rep: SellerProduct;
      recordIds: string[];
      skuIds: Set<string>;
      minPrice?: number;
      maxPrice?: number;
    }
  >();

  for (const product of products) {
    const key = resolveSellerProductGroupKey(product);
    const skuId = collectSkuId(product);
    const price =
      typeof product.unitPrice === 'number' && !Number.isNaN(product.unitPrice)
        ? product.unitPrice
        : undefined;

    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        rep: product,
        recordIds: [product._id],
        skuIds: new Set(skuId ? [skuId] : []),
        minPrice: price,
        maxPrice: price,
      });
      continue;
    }

    existing.recordIds.push(product._id);
    if (skuId) existing.skuIds.add(skuId);

    if (price != null) {
      existing.minPrice =
        existing.minPrice == null ? price : Math.min(existing.minPrice, price);
      existing.maxPrice =
        existing.maxPrice == null ? price : Math.max(existing.maxPrice, price);
    }

    // 썸네일이 없는 대표 행이면 썸네일 있는 행으로 교체.
    if (!thumbUrl(existing.rep) && thumbUrl(product)) {
      existing.rep = product;
    }
  }

  return Array.from(buckets.entries()).map(([groupKey, bucket]) => {
    const variantCount = Math.max(bucket.skuIds.size, bucket.recordIds.length);
    const rep = { ...bucket.rep };
    return {
      ...rep,
      groupKey,
      groupedRecordIds: bucket.recordIds,
      groupedSkuIds: Array.from(bucket.skuIds),
      variantCount,
      minUnitPrice: bucket.minPrice,
      maxUnitPrice: bucket.maxPrice,
      unitPrice: bucket.minPrice ?? rep.unitPrice,
      offerId: rep.offerId || rep._id,
    };
  });
};

import type { ProductPlatformKey } from './productPlatform';

export type ParsedProductLink = {
  offerId: string;
  source: ProductPlatformKey;
};

const OFFER_PATH_RE = /\/offer\/(\d+)/i;
const OFFER_ID_QUERY_RE = /[?&]offerId=(\d+)/i;
const TAOBAO_ID_QUERY_RE = /[?&]id=(\d+)/i;

/** Minimum digits for plain offerId / productNo search (avoids short numeric keywords). */
const MIN_PLAIN_PRODUCT_ID_LENGTH = 8;

const LABELED_OFFER_ID_RE =
  /^(?:offer\s*id|offerid)[:\s#-]*(\d+)$/i;
const LABELED_PRODUCT_NO_RE =
  /^(?:product\s*no(?:\.|mber)?|productno|product\s*number|상품번호)[:\s#-]*(\d+)$/i;
const PLAIN_PRODUCT_ID_RE = new RegExp(`^\\d{${MIN_PLAIN_PRODUCT_ID_LENGTH},}$`);

const is1688Link = (input: string) =>
  /(?:https?:\/\/)?(?:[\w-]+\.)?1688\.com/i.test(input) || OFFER_PATH_RE.test(input);

const isTaobaoLink = (input: string) =>
  /(?:https?:\/\/)?(?:[\w-]+\.)?(?:taobao|tmall)\.com/i.test(input);

/** True when input is a product link or direct offerId / productNo search. */
export function looksLikeDirectProductSearch(input: string): boolean {
  return resolveProductFromSearchInput(input) !== null;
}

/** @deprecated Use looksLikeDirectProductSearch */
export function looksLikeProductLink(input: string): boolean {
  return looksLikeDirectProductSearch(input);
}

/**
 * Extract offer id + marketplace from pasted product links, e.g.
 * `https://detail.1688.com/offer/622451595265.html?...` → 622451595265 / 1688
 */
export function parseProductOfferFromSearchInput(input: string): ParsedProductLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (is1688Link(trimmed)) {
    const match = trimmed.match(OFFER_PATH_RE) ?? trimmed.match(OFFER_ID_QUERY_RE);
    if (match?.[1]) {
      return { offerId: match[1], source: '1688' };
    }
  }

  if (isTaobaoLink(trimmed)) {
    const match = trimmed.match(TAOBAO_ID_QUERY_RE);
    if (match?.[1]) {
      return { offerId: match[1], source: 'taobao' };
    }
  }

  return null;
}

/**
 * Plain-text offerId / productNo, e.g. `622451595265`, `offerid:622451595265`,
 * `productno 12345678`. Platform comes from the active search tab when not in a URL.
 */
export function parseProductIdFromPlainSearchInput(
  input: string,
  defaultSource: ProductPlatformKey = '1688',
): ParsedProductLink | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const labeledOffer = trimmed.match(LABELED_OFFER_ID_RE);
  if (labeledOffer?.[1]) {
    return { offerId: labeledOffer[1], source: defaultSource };
  }

  const labeledProductNo = trimmed.match(LABELED_PRODUCT_NO_RE);
  if (labeledProductNo?.[1]) {
    return { offerId: labeledProductNo[1], source: defaultSource };
  }

  if (PLAIN_PRODUCT_ID_RE.test(trimmed)) {
    return { offerId: trimmed, source: defaultSource };
  }

  return null;
}

/** Resolve product from pasted link or plain offerId / productNo search input. */
export function resolveProductFromSearchInput(
  input: string,
  defaultSource: ProductPlatformKey = '1688',
): ParsedProductLink | null {
  return (
    parseProductOfferFromSearchInput(input) ??
    parseProductIdFromPlainSearchInput(input, defaultSource)
  );
}

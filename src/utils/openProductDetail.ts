import { Image } from 'react-native';

interface OpenProductDetailParams {
  productId: string;
  offerId?: string;
  source?: string;
  country?: string;
  /** Best-known thumbnail at click time (search card, recommendation, …). */
  thumbnailUrl?: string;
  /** Optional partial product object — lets the detail screen paint
   *  name/price immediately while the full API response loads. */
  productData?: any;
}

/**
 * Loose nav shape — React Navigation's strongly-typed `StackNavigationProp`
 * defines `navigate` / `push` as overloaded generics keyed off the param
 * list, which doesn't structurally assign to a single signature. We only
 * need to invoke `navigate('ProductDetail', params)`, so accept anything
 * that exposes those methods.
 */
type NavLike = {
  navigate: (...args: any[]) => void;
  push?: (...args: any[]) => void;
};

/**
 * Centralised entry point into `ProductDetail`. Performs two things at the
 * exact moment of the user's tap so the next screen feels instant:
 *
 *   1. Kicks off `Image.prefetch(thumbnailUrl)` BEFORE navigation so the
 *      bytes are warming the cache while React Navigation is still running
 *      its transition animation.
 *   2. Forwards `thumbnailUrl` (and any `productData` already in memory) as
 *      route params, so `ProductDetailScreen` can paint the hero image and
 *      basic metadata on its very first frame — no spinner, no flicker.
 *
 * Use `usePush = true` to push onto the stack (e.g. recommendations on an
 * existing product page) instead of navigating.
 */
export const openProductDetail = (
  nav: NavLike,
  params: OpenProductDetailParams,
  opts: { usePush?: boolean } = {},
) => {
  if (params.thumbnailUrl) {
    // Fire and forget — failures are non-fatal; the image will simply load
    // on demand once the gallery mounts.
    Image.prefetch(params.thumbnailUrl).catch(() => {});
  }

  const routeParams = {
    productId: params.productId,
    offerId: params.offerId,
    source: params.source,
    country: params.country,
    thumbnailUrl: params.thumbnailUrl,
    productData: params.productData,
  };

  if (opts.usePush && nav.push) {
    nav.push('ProductDetail', routeParams);
  } else {
    nav.navigate('ProductDetail', routeParams);
  }
};

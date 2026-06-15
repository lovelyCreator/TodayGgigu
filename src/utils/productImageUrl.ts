/**
 * Normalize Alibaba CDN image URLs for React Native <Image>.
 *
 * - Protocol-relative (`//img.alicdn.com/...`) and `http://` must become `https://`.
 * - 1688 (`cbu0*.alicdn.com`) thumbnails accept `...jpg_200x200.jpg`.
 * - Taobao (`img.alicdn.com/bao/...`, `imgextra`, etc.) must NOT get that suffix (404).
 */

import type { ImageURISource } from 'react-native';

const ALICDN_REFERER = 'https://www.taobao.com/';

export const isTaobaoPlatform = (source?: string | null): boolean =>
  (source ?? '').toLowerCase() === 'taobao';

export function coerceProductImageUrl(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['url', 'pic_url', 'image', 'src', 'main_image_url', 'image_url']) {
      const candidate = record[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return '';
}

export function normalizeProductImageUrl(image?: string | null): string {
  const raw = (image ?? '').trim();
  if (!raw) {
    return '';
  }

  let uri = raw;

  if (uri.startsWith('//')) {
    uri = `https:${uri}`;
  } else if (/^http:\/\//i.test(uri)) {
    uri = uri.replace(/^http:\/\//i, 'https://');
  } else if (uri.startsWith('/') && !uri.startsWith('//')) {
    uri = `https://img.alicdn.com${uri}`;
  } else if (!/^https?:\/\//i.test(uri) && /\.alicdn\.com/i.test(uri)) {
    uri = `https://${uri.replace(/^\/+/, '')}`;
  }

  const hasSizeSuffix = /_\d+x\d+|_\.(webp|jpg|png)|_q\d+/i.test(uri);
  const is1688Cdn = /cbu0\d\.alicdn\.com/i.test(uri);

  if (is1688Cdn && !hasSizeSuffix) {
    uri = `${uri}_200x200.jpg`;
  }

  return uri;
}

/** True when two product image URLs refer to the same asset (ignores 1688 thumb suffixes). */
export function productImageUrlsMatch(
  a?: string | null,
  b?: string | null,
): boolean {
  const na = normalizeProductImageUrl(a || '');
  const nb = normalizeProductImageUrl(b || '');
  if (!na || !nb) return false;
  if (na === nb) return true;
  const baseKey = (u: string) =>
    u.replace(/_\d+x\d+(?:\.\w+)?$/i, '').replace(/\?.*$/, '');
  const ba = baseKey(na);
  const bb = baseKey(nb);
  return ba === bb || ba.includes(bb) || bb.includes(ba);
}

export function normalizeProductImageUrls(images: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of images) {
    const normalized = normalizeProductImageUrl(coerceProductImageUrl(item));
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

/** Collect every image field Taobao Global detail/search may return. */
export function extractTaobaoImageSources(taobao: Record<string, unknown>): unknown[] {
  const sources: unknown[] = [];

  if (Array.isArray(taobao.pic_urls)) {
    sources.push(...taobao.pic_urls);
  }

  const ml = taobao.multi_language_info as Record<string, unknown> | undefined;
  if (ml?.main_image_url) {
    sources.push(ml.main_image_url);
  }

  if (taobao.main_image_url) {
    sources.push(taobao.main_image_url);
  }
  if (taobao.pic_url) {
    sources.push(taobao.pic_url);
  }

  if (Array.isArray(taobao.property_image_list)) {
    sources.push(...taobao.property_image_list);
  }

  if (Array.isArray(taobao.sku_list)) {
    for (const sku of taobao.sku_list as Record<string, unknown>[]) {
      if (sku?.pic_url) {
        sources.push(sku.pic_url);
      }
    }
  }

  return sources;
}

/** Prefer stable gallery URLs (skip crop-variant paths with commas/tilde). */
export function pickTaobaoGalleryImages(taobao: Record<string, unknown>): string[] {
  const normalized = normalizeProductImageUrls(extractTaobaoImageSources(taobao));
  const stable = normalized.filter((url) => !url.includes('~crop,') && !url.includes(','));

  return stable.length > 0 ? stable : normalized;
}

export function getProductImageSource(image?: string | null): ImageURISource {
  const uri = normalizeProductImageUrl(image);
  if (!uri) {
    return { uri: '' };
  }

  if (/\.alicdn\.com/i.test(uri)) {
    return {
      uri,
      headers: {
        Referer: ALICDN_REFERER,
      },
    };
  }

  return { uri };
}

import RNFS from 'react-native-fs';
import { normalizeProductImageUrl } from './productImageUrl';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/product-images`;

const DOWNLOAD_HEADERS = {
  Referer: 'https://www.taobao.com/',
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
};

const memoryCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const isAlicdnUrl = (uri: string) => /\.alicdn\.com/i.test(uri);

const hashUrl = (url: string): string => {
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
};

const fileExtension = (url: string): string => {
  const match = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (!match) {
    return '.img';
  }
  const ext = match[1].toLowerCase();
  return ext === 'jpeg' ? '.jpg' : `.${ext}`;
};

const toFileUri = (path: string) => (path.startsWith('file://') ? path : `file://${path}`);

let cacheDirReady: Promise<void> | null = null;

const ensureCacheDir = async () => {
  if (!cacheDirReady) {
    cacheDirReady = (async () => {
      if (!(await RNFS.exists(CACHE_DIR))) {
        await RNFS.mkdir(CACHE_DIR);
      }
    })();
  }
  await cacheDirReady;
};

const downloadToCache = async (normalized: string): Promise<string> => {
  await ensureCacheDir();

  const localPath = `${CACHE_DIR}/${hashUrl(normalized)}${fileExtension(normalized)}`;

  if (await RNFS.exists(localPath)) {
    const fileUri = toFileUri(localPath);
    memoryCache.set(normalized, fileUri);
    return fileUri;
  }

  const result = await RNFS.downloadFile({
    fromUrl: normalized,
    toFile: localPath,
    headers: DOWNLOAD_HEADERS,
  }).promise;

  const status = result.statusCode ?? 200;
  if (status >= 400) {
    await RNFS.unlink(localPath).catch(() => undefined);
    throw new Error(`AliCDN download failed (${status})`);
  }

  const fileUri = toFileUri(localPath);
  memoryCache.set(normalized, fileUri);
  return fileUri;
};

/**
 * Resolve a product image URL for <Image>.
 * Alibaba CDN URLs are downloaded with Referer headers (RN Image headers fail on Android).
 */
export async function resolveProductImageUri(image?: string | null): Promise<string> {
  const normalized = normalizeProductImageUrl(image);
  if (!normalized) {
    return '';
  }

  if (!isAlicdnUrl(normalized)) {
    return normalized;
  }

  const cached = memoryCache.get(normalized);
  if (cached) {
    return cached;
  }

  const existing = inflight.get(normalized);
  if (existing) {
    return existing;
  }

  const task = downloadToCache(normalized).finally(() => {
    inflight.delete(normalized);
  });

  inflight.set(normalized, task);
  return task;
}

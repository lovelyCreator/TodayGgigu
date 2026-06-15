import axios from 'axios';
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

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const triplet = (a << 16) | (b << 8) | c;
    output += CHARS[(triplet >> 18) & 63];
    output += CHARS[(triplet >> 12) & 63];
    output += i + 1 < bytes.length ? CHARS[(triplet >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? CHARS[triplet & 63] : '=';
  }
  return output;
};

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

/**
 * Download via axios + RNFS.writeFile instead of RNFS.downloadFile.
 * RNFS.downloadFile rejects with a null code on some Android failures and crashes the app.
 */
const downloadToCache = async (normalized: string): Promise<string> => {
  await ensureCacheDir();

  const localPath = `${CACHE_DIR}/${hashUrl(normalized)}${fileExtension(normalized)}`;

  if (await RNFS.exists(localPath)) {
    const fileUri = toFileUri(localPath);
    memoryCache.set(normalized, fileUri);
    return fileUri;
  }

  try {
    const response = await axios.get<ArrayBuffer>(normalized, {
      responseType: 'arraybuffer',
      headers: DOWNLOAD_HEADERS,
      timeout: 20000,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const base64 = arrayBufferToBase64(response.data);
    await RNFS.writeFile(localPath, base64, 'base64');

    const fileUri = toFileUri(localPath);
    memoryCache.set(normalized, fileUri);
    return fileUri;
  } catch {
    await RNFS.unlink(localPath).catch(() => undefined);
    return normalized;
  }
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

  const task = downloadToCache(normalized)
    .catch(() => normalized)
    .finally(() => {
      inflight.delete(normalized);
    });

  inflight.set(normalized, task);
  return task;
}

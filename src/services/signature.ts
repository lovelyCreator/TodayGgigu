import { API_BASE_URL } from '../constants';
import { sha256 } from 'js-sha256';

// IMPORTANT: Signature secret.
// Prefer setting API_SIGNATURE_SECRET in env.json.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const envConfig: { API_SIGNATURE_SECRET?: string } = (() => {
  try {
    // Reuse env.json if it contains a signature secret
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../env.json');
  } catch {
    return {};
  }
})();

// Use env value if provided, otherwise fall back to known secret you gave.
// NOTE: in production you should only use the env-based secret.
const SIGNATURE_SECRET =
  envConfig.API_SIGNATURE_SECRET ||
  'f7a2d98b4e31c6a0b5d2e8f9a1c3b7d4';

// Helper to recursively sort object keys and drop undefined values
const sortForStable = (value: any): any => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortForStable);
  }
  const sortedKeys = Object.keys(value).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    const v = value[key];
    if (v === undefined) continue;
    result[key] = sortForStable(v);
  }
  return result;
};

// Stable JSON stringify (sorted keys, recursive) to match backend canonical body hash
export const stableStringify = (value: any): string => {
  return JSON.stringify(sortForStable(value));
};

/**
 * Build signature headers for a request.
 * - method: HTTP method (GET/POST/PUT/DELETE...)
 * - url: full URL or path (we will extract pathname without query)
 * - body: for POST/PUT/PATCH, the JS object to be sent as JSON; for GET, pass null/undefined.
 */
export const buildSignatureHeaders = async (
  method: string,
  url: string,
  body?: any
): Promise<Record<string, string>> => {
  const timestamp = Math.floor(Date.now() / 1000).toString(); // Unix seconds

  // Extract path without query
  let path: string;
  try {
    const full = url.startsWith('http')
      ? new URL(url)
      : new URL(url, API_BASE_URL);
    path = full.pathname;
  } catch {
    // Fallback: assume url is already a path
    path = url.split('?')[0];
  }

  // Normalize path: backend canonical path does NOT include a trailing slash
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  let bodyHash = '';
  const upperMethod = method.toUpperCase();
  if (
    ['POST', 'PUT', 'PATCH'].includes(upperMethod) &&
    body !== undefined &&
    body !== null
  ) {
    const canonicalJson = stableStringify(body);
    bodyHash = sha256(canonicalJson);
  }

  const canonical = `${upperMethod}\n${path}\n${timestamp}\n${bodyHash}`;
  if (!SIGNATURE_SECRET) {
    console.warn('[signature] API_SIGNATURE_SECRET is not set; requests will be rejected by backend');
  }
  // js-sha256: HMAC usage is sha256.hmac(key, message)
  const signature = sha256.hmac(SIGNATURE_SECRET, canonical);

  console.log('[signature]', upperMethod, path, 'ts:', timestamp, 'bodyHash:', bodyHash || '(empty)', 'sig:', signature.slice(0, 16) + '...');

  return {
    'X-Request-Timestamp': timestamp,
    'X-Request-Signature': signature,
  };
};


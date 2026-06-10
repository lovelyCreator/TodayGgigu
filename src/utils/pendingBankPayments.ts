/**
 * 무통장 입금 결제 신청 후 — admin 의 입금 확인 시까지의 "결제중" 상태를
 * 클라이언트 측에서만 표시하기 위한 로컬 스토어.
 *
 * 흐름:
 *   1) 사용자가 OrderPaymentScreen 에서 무통장(bank) 결제 신청
 *   2) `markBankPaymentPending(orderId)` 로 timestamp 저장
 *   3) BuyListScreen 이 카드 렌더 시 `isBankPaymentPending(orderId)` 확인
 *      → 결제하기 버튼 대신 "결제중" 라벨 표시
 *   4) backend 가 `paymentStatus: 'paid'` 또는 `progressStatus: P_PAY_COMPLETE`
 *      를 반환하면 `resolvePurchaseAgencyProgressStatus` 가 자연스럽게 그쪽으로
 *      우선 매핑되므로 결제중 → 결제완료로 자동 전환.
 *   5) 7일 이내 입금 확인 안 되면 자동 만료 (admin 처리 누락 시 stuck 방지).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pending_bank_payments_v1';
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7일

type PendingMap = Record<string, number>; // orderId → timestamp(ms)

let cache: PendingMap | null = null;

const loadCache = async (): Promise<PendingMap> => {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = {};
      return cache;
    }
    const parsed = JSON.parse(raw);
    cache = typeof parsed === 'object' && parsed != null ? parsed : {};
  } catch {
    cache = {};
  }
  return cache;
};

const persist = async (next: PendingMap): Promise<void> => {
  cache = next;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 실패해도 메모리 캐시는 유효 — 다음 세션에 사라질 뿐.
  }
};

const purgeExpired = (map: PendingMap, now: number): PendingMap => {
  const next: PendingMap = {};
  let mutated = false;
  for (const [orderId, ts] of Object.entries(map)) {
    if (now - ts < EXPIRY_MS) {
      next[orderId] = ts;
    } else {
      mutated = true;
    }
  }
  return mutated ? next : map;
};

/** 무통장 결제 신청 시점에 호출 — 카드에 "결제중" 라벨 표시 시작. */
export const markBankPaymentPending = async (orderId: string): Promise<void> => {
  if (!orderId) return;
  const map = await loadCache();
  const now = Date.now();
  const purged = purgeExpired(map, now);
  await persist({ ...purged, [orderId]: now });
};

/** backend 가 paid/complete 로 확정한 경우 (또는 사용자 취소 시) 호출. */
export const clearBankPaymentPending = async (orderId: string): Promise<void> => {
  if (!orderId) return;
  const map = await loadCache();
  if (!(orderId in map)) return;
  const next = { ...map };
  delete next[orderId];
  await persist(next);
};

/** 캐시를 강제로 비우고 다음 read 시 AsyncStorage 에서 다시 로드. */
export const invalidatePendingBankPaymentsCache = (): void => {
  cache = null;
};

/** 동기 조회 — 캐시에 없으면 false (BuyList 진입 시 prewarm 권장). */
export const isBankPaymentPendingSync = (orderId: string): boolean => {
  if (!cache || !orderId) return false;
  const ts = cache[orderId];
  if (!ts) return false;
  if (Date.now() - ts >= EXPIRY_MS) return false;
  return true;
};

/** 비동기 조회 — 캐시 로드 후 정확한 값 반환. */
export const isBankPaymentPending = async (orderId: string): Promise<boolean> => {
  if (!orderId) return false;
  await loadCache();
  return isBankPaymentPendingSync(orderId);
};

/** BuyListScreen mount/focus 시 한 번 호출 — 캐시 prewarm + 만료 정리. */
export const prewarmPendingBankPayments = async (): Promise<void> => {
  const map = await loadCache();
  const purged = purgeExpired(map, Date.now());
  if (purged !== map) {
    await persist(purged);
  }
};

/** 디버깅용 — 현재 캐시된 pending 목록. */
export const getPendingBankPaymentsMap = async (): Promise<PendingMap> => {
  return { ...(await loadCache()) };
};

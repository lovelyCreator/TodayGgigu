/**
 * 주문문의 카드 — 사용자가 마지막으로 방문(조회)한 시각을 inquiryId 별로 영속 저장.
 *
 * 표시 규칙 (MessageScreen 의 카드):
 *   - `visitedAt` 이 없거나 `lastMessageAt > visitedAt` → "미확인"
 *   - `visitedAt >= lastMessageAt` → "확인완료"
 *
 * 즉 사용자가 한 번 본 inquiry 라도 admin 이 그 후 새 메시지를 보내면
 * (lastMessageAt 이 visitedAt 보다 나중이 되면) 다시 미확인 상태로 보인다.
 * 사용자가 다시 카드를 탭하면 visitedAt 이 갱신되어 확인완료로 돌아간다.
 *
 * 메모리 + AsyncStorage 동기화. 동기 read 를 지원해 FlatList 의 renderItem
 * 에서 직접 호출 가능.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'visited_inquiries_v2';
const LEGACY_KEY = 'visited_inquiries_v1';

type VisitedMap = Record<string, number>; // inquiryId → unix ms

let cache: VisitedMap | null = null;

const loadCache = async (): Promise<VisitedMap> => {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cache = typeof parsed === 'object' && parsed != null
        ? Object.fromEntries(
            Object.entries(parsed)
              .filter(([k, v]) => typeof k === 'string' && typeof v === 'number')
              .map(([k, v]) => [k, Number(v)]),
          )
        : {};
      return cache;
    }
    // v1 (Set<string>) → v2 (Record<string, number>) 마이그레이션. 정확한 방문
    // 시각을 모르므로 현재 시각으로 일괄 표시 → 마이그레이션 시점 이후 admin
    // 이 보낸 메시지는 lastMessageAt > visitedAt 이 되어 미확인으로 정상 표시.
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy) {
      try {
        const arr = JSON.parse(legacy);
        if (Array.isArray(arr)) {
          const now = Date.now();
          const map: VisitedMap = {};
          for (const id of arr) {
            if (typeof id === 'string') map[id] = now;
          }
          cache = map;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
          await AsyncStorage.removeItem(LEGACY_KEY);
          return cache;
        }
      } catch { /* fallthrough */ }
    }
    cache = {};
  } catch {
    cache = {};
  }
  return cache;
};

const persist = async (map: VisitedMap): Promise<void> => {
  cache = map;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* 저장 실패해도 메모리 캐시는 유효 */
  }
};

/**
 * 사용자가 inquiry 카드를 탭해 ChatScreen 에 진입한 시점에 호출.
 * 현재 시각으로 마지막 방문 시각을 갱신한다.
 */
export const markInquiryVisited = async (inquiryId: string): Promise<void> => {
  if (!inquiryId) return;
  const map = await loadCache();
  const next = { ...map, [inquiryId]: Date.now() };
  await persist(next);
};

/**
 * 동기 조회 — 마지막 방문 시각 (ms). 미방문이면 0 반환.
 * FlatList 의 renderItem 에서 호출. prewarm 후 유효.
 */
export const getVisitedAtSync = (inquiryId: string): number => {
  if (!cache || !inquiryId) return 0;
  return cache[inquiryId] || 0;
};

/**
 * 동기 조회 — `lastMessageAt` 와 비교해 사용자가 본 후 새 메시지가 있는지 판단.
 *   - 방문 기록이 없으면 false (한 번도 안 본 상태)
 *   - 방문 기록이 있고 visitedAt >= lastMessageAt 이면 true (모두 봤음)
 *   - 방문 기록이 있어도 lastMessageAt 이 더 나중이면 false (새 메시지 있음)
 */
export const isInquiryConfirmedSync = (
  inquiryId: string,
  lastMessageAt: string | number | Date | null | undefined,
): boolean => {
  const visitedAt = getVisitedAtSync(inquiryId);
  if (visitedAt <= 0) return false;
  if (!lastMessageAt) return true; // 마지막 메시지 정보가 없으면 방문 기록만으로 confirmed
  const lastMs = typeof lastMessageAt === 'number'
    ? lastMessageAt
    : new Date(lastMessageAt).getTime();
  if (!Number.isFinite(lastMs)) return true;
  return visitedAt >= lastMs;
};

/**
 * 동기 버전 — 인메모리 캐시를 즉시 갱신하고 영속 저장은 백그라운드로.
 * 사용자 상호작용(전송/토글)에서 호출해 카드 라벨이 즉시 반영되게 한다.
 */
export const markInquiryVisitedSync = (inquiryId: string): void => {
  if (!inquiryId) return;
  // 캐시 미로드 시 부분 데이터로 덮어쓰지 않도록 async 버전(loadCache 후 병합)으로 폴백.
  if (!cache) { void markInquiryVisited(inquiryId); return; }
  void persist({ ...cache, [inquiryId]: Date.now() }); // persist 가 cache 를 동기 갱신
};

/** 동기 버전 — 방문 기록 제거(→ 미확인). 인메모리 캐시 즉시 갱신. */
export const clearInquiryVisitedSync = (inquiryId: string): void => {
  if (!inquiryId) return;
  if (!cache) { void clearInquiryVisited(inquiryId); return; }
  if (!(inquiryId in cache)) return;
  const next = { ...cache };
  delete next[inquiryId];
  void persist(next);
};

/** 캐시 prewarm — 화면 mount/focus 시 한 번 호출. */
export const prewarmVisitedInquiries = async (): Promise<void> => {
  await loadCache();
};

/** 캐시 무효화 — 다음 read 시 AsyncStorage 에서 다시 로드. */
export const invalidateVisitedInquiriesCache = (): void => {
  cache = null;
};

/** 단일 inquiry 의 방문 기록 제거 (디버그/관리용). */
export const clearInquiryVisited = async (inquiryId: string): Promise<void> => {
  if (!inquiryId) return;
  const map = await loadCache();
  if (!(inquiryId in map)) return;
  const next = { ...map };
  delete next[inquiryId];
  await persist(next);
};

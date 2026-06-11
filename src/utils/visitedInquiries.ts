/**
 * 주문문의 카드 — 사용자가 한 번이라도 방문(조회)한 inquiry 의 ID 를 영속 저장.
 *
 * MessageScreen 의 주문문의 탭에서 카드 status 표시 시:
 *   - backend 응답의 status (open/pending/unconfirmed/...) 와 상관없이
 *   - 이 스토어에 inquiryId 가 기록되어 있으면 → "확인완료" 로 강제 표시
 *
 * 이렇게 하면 backend 가 unread/unconfirmed 로 응답해도 사용자가 이미 방문한
 * 적이 있는 inquiry 는 "확인" 상태로 보인다. admin 이 새 메시지를 보내
 * backend 가 unread 로 갱신해도 사용자 방문 기록은 유지되어 "확인" 표시 유지.
 *
 * 메모리 + AsyncStorage 동기화. 동기 read 를 지원해 FlatList 의 renderItem
 * 에서 직접 호출 가능.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'visited_inquiries_v1';

let cache: Set<string> | null = null;

const loadCache = async (): Promise<Set<string>> => {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = new Set();
      return cache;
    }
    const parsed = JSON.parse(raw);
    cache = new Set(Array.isArray(parsed) ? parsed.map((x: any) => String(x)) : []);
  } catch {
    cache = new Set();
  }
  return cache;
};

const persist = async (set: Set<string>): Promise<void> => {
  cache = set;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* 저장 실패 시에도 메모리 캐시는 유효 */
  }
};

/** 사용자가 inquiry 카드를 탭해 ChatScreen 에 진입한 시점에 호출. */
export const markInquiryVisited = async (inquiryId: string): Promise<void> => {
  if (!inquiryId) return;
  const set = await loadCache();
  if (set.has(inquiryId)) return;
  const next = new Set(set);
  next.add(inquiryId);
  await persist(next);
};

/** 동기 조회 — FlatList 의 renderItem 에서 호출. prewarm 후 사용. */
export const isInquiryVisitedSync = (inquiryId: string): boolean => {
  if (!cache || !inquiryId) return false;
  return cache.has(inquiryId);
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
  const set = await loadCache();
  if (!set.has(inquiryId)) return;
  const next = new Set(set);
  next.delete(inquiryId);
  await persist(next);
};

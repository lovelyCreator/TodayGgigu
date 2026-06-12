/**
 * 사용자가 메시지 페이지에서 "삭제" 한 주문문의 카드의 inquiryId 집합을
 * 영속 저장. 백엔드에는 문의 자체를 삭제하는 API 가 없으므로 클라이언트
 * 측에서 숨김 처리한다 — 다음 fetch 결과에서도 이 ID 들은 필터링되어
 * 카드 목록에 표시되지 않는다.
 *
 * 메모리 + AsyncStorage 동기화. 동기 read (isInquiryHiddenSync) 를 지원해
 * FlatList renderItem / 필터에서 직접 호출 가능.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'hidden_inquiries_v1';

let cache: Set<string> | null = null;

const loadCache = async (): Promise<Set<string>> => {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cache = new Set(parsed.filter((v): v is string => typeof v === 'string'));
        return cache;
      }
    }
  } catch {
    // ignore
  }
  cache = new Set<string>();
  return cache;
};

const persist = async (set: Set<string>) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

/** 앱 시작 시 1회 호출하여 cache 를 미리 로드. 동기 조회를 위해 필요. */
export const prewarmHiddenInquiries = async (): Promise<void> => {
  await loadCache();
};

/** 동기 조회 — 미리 prewarm 되어 있어야 정확하다. */
export const isInquiryHiddenSync = (inquiryId: string): boolean => {
  if (!cache) return false;
  return cache.has(inquiryId);
};

/** inquiryId 를 숨김 목록에 추가. */
export const hideInquiry = async (inquiryId: string): Promise<void> => {
  const set = await loadCache();
  if (!set.has(inquiryId)) {
    set.add(inquiryId);
    await persist(set);
  }
};

/** 숨김 해제 (현재 UI 에서 노출되지는 않지만 유지보수 목적). */
export const unhideInquiry = async (inquiryId: string): Promise<void> => {
  const set = await loadCache();
  if (set.delete(inquiryId)) {
    await persist(set);
  }
};

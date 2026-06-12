/**
 * Order note 의 `value` 문자열을 채팅 버블 렌더용 세그먼트 배열로 변환.
 *
 * 백엔드의 `orderNoteLines[].value` 는 다음 형태로 저장된다:
 *   "텍스트만"
 *   "<img src='url'>"
 *   "텍스트<img src='url'>"
 *   "<img src='url1'><img src='url2'>"
 *
 * 이 함수는 그것을 `{type: 'text' | 'image', value: string}` 세그먼트 배열로
 * 분해해 채팅 버블에서 텍스트 + 인라인 이미지를 자연스럽게 표시할 수 있게 함.
 *
 * 추가로 `<div><br></div>` 같은 리치 에디터 마크업은 빈 텍스트로 정리하고,
 * 일반 HTML entity (`&nbsp;` 등) 도 복원한다.
 */
export type ChatBubbleSegment =
  | { type: 'text'; value: string }
  | { type: 'image'; url: string };

const decodeHtmlEntities = (s: string): string =>
  s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");

const stripBlockTags = (s: string): string =>
  s
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    // 모든 비-img 태그 제거 (open + close).
    .replace(/<(?!img\b)[^>]+>/gi, '');

const cleanTextSegment = (s: string): string => {
  let v = decodeHtmlEntities(stripBlockTags(s));
  v = v.replace(/\n{3,}/g, '\n\n').trim();
  return v;
};

const IMG_REGEX = /<img\s[^>]*?src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi;

export const parseChatBubbleContent = (raw: string | null | undefined): ChatBubbleSegment[] => {
  if (!raw) return [];
  const input = String(raw);
  const segments: ChatBubbleSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  IMG_REGEX.lastIndex = 0;
  while ((match = IMG_REGEX.exec(input)) !== null) {
    const before = input.slice(lastIndex, match.index);
    const text = cleanTextSegment(before);
    if (text) segments.push({ type: 'text', value: text });
    const rawUrl = match[1] || match[2] || match[3] || '';
    const url = decodeHtmlEntities(rawUrl).trim();
    if (url) segments.push({ type: 'image', url });
    lastIndex = match.index + match[0].length;
  }
  const tail = cleanTextSegment(input.slice(lastIndex));
  if (tail) segments.push({ type: 'text', value: tail });
  return segments;
};

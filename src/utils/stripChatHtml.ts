/**
 * Admin / web 의 리치 텍스트 에디터가 메시지에 HTML 마크업
 * (`<div>`, `<br>`, `<p>`, `&nbsp;` 등) 을 섞어 보내는 경우가 있다.
 * 모바일 채팅 화면은 plain `<Text>` 로 렌더하므로 이 마크업이 그대로 노출
 * 되는 문제가 있어, 표시 전에 다음 처리를 한다:
 *
 *   1. `<br>` / `</div>` / `</p>` 같은 줄바꿈 의도가 있는 태그는 개행으로 변환
 *   2. 그 외 모든 HTML 태그는 제거
 *   3. 일반적인 HTML entity 들(`&nbsp;`, `&amp;`, `&lt;` 등) 을 원문자로 복원
 *   4. 연속 개행은 최대 2 줄로 축소, 양끝 공백 제거
 *
 * 숫자/짧은 텍스트만 보낸 경우엔 마크업이 없어 원문이 그대로 반환된다.
 */
export const stripChatHtml = (raw: string | null | undefined): string => {
  if (!raw) return '';
  let text = String(raw);

  // 1) 줄바꿈 의도 태그를 \n 로
  text = text
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n');

  // 2) 나머지 모든 태그 제거
  text = text.replace(/<[^>]+>/g, '');

  // 3) 주요 entity 복원
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");

  // 4) 연속 개행 / 양끝 공백 정리
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
};

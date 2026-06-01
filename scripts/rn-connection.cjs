/**
 * Metro "No apps connected" — what it really means (RN CLI message socket).
 * Run: yarn rn:hint
 */
/* eslint-disable no-console */
const { execSync } = require('child_process');

console.log('');
console.log('[React Native] "No apps connected" / reload failed — 정확한 의미');
console.log('================================================================');
console.log(
  'Metro의 "메시지 소켓"에 연결된 디버그 앱(WebSocket 클라이언트)이 0명일 때,',
);
console.log(
  '터미널에서 r(reload) 등으로 브로드캐스트하면 RN CLI가 이 경고를 냅니다.',
);
console.log('(소스: @react-native-community/cli-server-api, clients.size === 0)');
console.log('');
console.log('즉, "코드 버그"라기보다 "아직 앱이 Metro 디버그 채널에 붙지 않음" 상태입니다.');
console.log('');
console.log('이번 로그처럼 된 경우 (아주 흔함):');
console.log('  • yarn android 로 앱을 띄운 뒤 yarn metro:free8081 로 8081을 비우면,');
console.log('    에뮬레이터 안의 앱은 "옛 Metro"와의 연결이 끊긴 채로 남습니다.');
console.log('    새로 yarn start 한 Metro에는 WebSocket이 다시 안 붙을 수 있습니다.');
console.log('    → 에뮬에서 앱 완전 종료 후 다시 실행, 또는 기기에서 Reload 하세요.');
console.log('');
console.log('반드시 할 일 (순서):');
console.log(
  '  (원터미널) Metro + 빌드/설치를 한 번에: yarn dev:android 또는 yarn dev:ios',
);
console.log('    → Metro가 먼저 뜬 뒤 run-* --no-packager 로 앱이 같은 Metro에 붙습니다.');
console.log('  (수동 2터미널) 1) 터미널 A: yarn start  (Metro 유지) — 8081 충돌이면 먼저 다른 Metro 종료');
console.log(
  '  2) 네이티브 모듈명/등록명을 바꾼 뒤라면: 앱을 다시 빌드·설치 (캐시된 APK로는 안 됨)',
);
console.log('  3) 터미널 B (dev:* 를 쓰면 이 단계는 스킵):');
console.log('       Android 에뮬/기기: yarn android:no-packager');
console.log('       (USB 실기기면 먼저 yarn adb:reverse)');
console.log('       iOS: yarn ios:no-packager');
console.log('  4) 앱이 완전히 뜬 뒤에 Metro에서 r — 그 전에 누르면 같은 경고가 납니다.');
console.log('  5) 디버깅 중에는 yarn metro:free8081 을 쓴 직후, 반드시 앱을 한 번 다시 켜기.');
console.log('');
console.log('추가 점검:');
console.log('  - MainActivity.getMainComponentName / iOS withModuleName ===');
console.log('    AppRegistry.registerComponent 첫 인자 (현재: todayggigu)');
console.log('  - Cursor/VSCode RN 확장이 저장 시 reload를 내면 앱 없을 때 동일 경고');
console.log('  - Windows 방화벽이 node(Metro) 수신을 막으면 앱이 소켓에 못 붙을 수 있음');
console.log('');

try {
  const out = execSync('adb devices', { encoding: 'utf8' });
  console.log('adb devices:\n' + out.trim());
} catch {
  console.log('(adb 없음 — iOS 시뮬레이터만 쓰면 무시)');
}
console.log('');

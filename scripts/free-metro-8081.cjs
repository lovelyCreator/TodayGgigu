/**
 * Frees port 8081 (Metro) and prints the post-kill reconnect steps from project analysis.
 * Invoked by: yarn metro:free8081, start:clean, start:reset:clean
 */
/* eslint-disable no-console */
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

console.log('');
console.log('[metro:free8081] Stopping process bound to port 8081...');
console.log('');

try {
  execSync('npx --yes kill-port 8081', { stdio: 'inherit', cwd: root, env: process.env });
} catch {
  process.exit(1);
}

console.log('');
console.log(
  '[!] KR: 에뮬/실기기에서 앱이 켜져 있었다면, 방금 Metro와의 디버그 연결이 끊겼습니다.',
);
console.log('    → `yarn start` 후 앱을 완전히 종료했다가 다시 실행하세요. (또는 `yarn dev:android`)');
console.log('');
console.log(
  '[!] EN: If the RN app was running, its dev connection to Metro was dropped.',
);
console.log('    → After `yarn start`, force-close and reopen the app (or use `yarn dev:android`).');
console.log('');

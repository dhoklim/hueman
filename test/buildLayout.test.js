import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const npmCli = process.env.npm_execpath;

describe('production build layout', () => {
  it('emits the exhibition, QR receiver, and shared emotion wall pages with the configured transfer endpoint', () => {
    // 실제 dist/ 를 가짜 서버 주소 빌드로 덮어쓰지 않도록 임시 폴더에 빌드한다.
    // (테스트 뒤 dist/ 를 그대로 띄우면 QR·감정 벽이 transfer.example 로 요청하던 문제)
    const dist = mkdtempSync(join(tmpdir(), 'hueman-build-'));
    try {
      execFileSync(process.execPath, [npmCli, 'run', 'build', '--', '--outDir', dist, '--emptyOutDir'], {
        cwd: process.cwd(),
        env: { ...process.env, VITE_QR_TRANSFER_API_URL: 'https://transfer.example' },
        stdio: 'pipe',
      });
      expectBuiltPages(dist);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  }, 60_000);
});

function expectBuiltPages(dist) {
  const receiver = join(dist, 'receive.html');
  const wall = join(dist, 'wall.html');
  expect(existsSync(join(dist, 'index.html'))).toBe(true);
  expect(existsSync(receiver)).toBe(true);
  expect(existsSync(wall)).toBe(true);
  expect(readFileSync(receiver, 'utf8')).toContain('hueman 결과 카드');
  expect(readFileSync(wall, 'utf8')).toContain('hueman 공동 감정 벽');
  expect(readBuiltJavaScript(dist)).toContain('https://transfer.example');
}

function readBuiltJavaScript(dist) {
  return readdirSync(join(dist, 'assets'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => readFileSync(join(dist, 'assets', file), 'utf8'))
    .join('\n');
}

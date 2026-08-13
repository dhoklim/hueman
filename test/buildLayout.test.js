import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const npmCli = process.env.npm_execpath;

describe('production build layout', () => {
  it('emits both the exhibition and QR receiver pages with the configured transfer endpoint', () => {
    execFileSync(process.execPath, [npmCli, 'run', 'build'], {
      cwd: process.cwd(),
      env: { ...process.env, VITE_QR_TRANSFER_API_URL: 'https://transfer.example' },
      stdio: 'pipe',
    });

    const dist = join(process.cwd(), 'dist');
    const receiver = join(dist, 'receive.html');
    expect(existsSync(join(dist, 'index.html'))).toBe(true);
    expect(existsSync(receiver)).toBe(true);
    expect(readFileSync(receiver, 'utf8')).toContain('hueman 결과 카드');
    expect(readFileSync(join(dist, 'assets', findReceiverAsset(dist)), 'utf8'))
      .toContain('https://transfer.example');
  });
});

function findReceiverAsset(dist) {
  const html = readFileSync(join(dist, 'receive.html'), 'utf8');
  const match = html.match(/src="\/hueman\/assets\/([^\"]+\.js)"/);
  if (!match) throw new Error('receive page script asset is missing');
  return match[1];
}

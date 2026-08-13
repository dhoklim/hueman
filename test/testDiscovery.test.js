import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const vitestCli = join(process.cwd(), 'node_modules', 'vitest', 'vitest.mjs');

describe('test discovery', () => {
  it('does not collect tests from local git worktrees', () => {
    const output = execFileSync(process.execPath, [vitestCli, 'list', '--filesOnly'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).not.toContain('.worktrees/');
  });
});

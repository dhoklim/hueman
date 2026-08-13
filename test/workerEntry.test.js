import { describe, expect, it } from 'vitest';
import * as workerEntry from '../worker/src/index.js';

describe('Cloudflare Worker entry module', () => {
  it('exports the default handler and the declared emotion wall durable object', () => {
    expect(Object.keys(workerEntry).sort()).toEqual(['EmotionWall', 'default']);
    expect(workerEntry.EmotionWall).toBeTypeOf('function');
  });
});

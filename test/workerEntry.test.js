import { describe, expect, it } from 'vitest';
import * as workerEntry from '../worker/src/index.js';

describe('Cloudflare Worker entry module', () => {
  it('exports only the default handler accepted by the Workers runtime', () => {
    expect(Object.keys(workerEntry)).toEqual(['default']);
  });
});

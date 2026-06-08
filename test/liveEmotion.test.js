// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/faceEmotion.js', () => ({
  loadModels: vi.fn(async () => { throw new Error('model missing'); }),
  startCamera: vi.fn(),
  detectExpressions: vi.fn(),
}));

describe('liveEmotion startup cleanup', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.resetModules();
  });

  it('removes the preview video when camera startup fails', async () => {
    const { startLiveEmotion } = await import('../src/liveEmotion.js');

    await expect(startLiveEmotion()).rejects.toThrow('model missing');

    expect(document.getElementById('cam-preview')).toBe(null);
  });
});

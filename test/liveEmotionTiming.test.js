// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

const faceEmotionMock = vi.hoisted(() => ({
  loadModels: vi.fn(async () => {}),
  startCamera: vi.fn(async () => ({ getTracks: () => [] })),
  detectExpressions: vi.fn(async () => ({ happy: 0.9, neutral: 0.1 })),
}));

vi.mock('../src/faceEmotion.js', () => faceEmotionMock);

describe('liveEmotion timing', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('emits expression updates within 350ms for responsive tint changes', async () => {
    vi.useFakeTimers();
    const onEmotion = vi.fn();
    const { startLiveEmotion, stopLiveEmotion } = await import('../src/liveEmotion.js');

    await startLiveEmotion({ onEmotion });
    await vi.advanceTimersByTimeAsync(350);

    expect(onEmotion).toHaveBeenCalledWith(expect.objectContaining({
      detected: 'joy',
      emotion: 'joy',
      faceFound: true,
    }));

    stopLiveEmotion();
  });

  it('skips a scheduled frame while the previous detection is still running', async () => {
    vi.useFakeTimers();
    let resolveDetection;
    faceEmotionMock.detectExpressions.mockImplementationOnce(() => new Promise((resolve) => {
      resolveDetection = resolve;
    }));
    const { startLiveEmotion, stopLiveEmotion } = await import('../src/liveEmotion.js');

    await startLiveEmotion({ onEmotion: vi.fn() });
    await vi.advanceTimersByTimeAsync(650);

    expect(faceEmotionMock.detectExpressions).toHaveBeenCalledTimes(1);

    resolveDetection({ happy: 0.9, neutral: 0.1 });
    await vi.runOnlyPendingTimersAsync();
    stopLiveEmotion();
  });
});

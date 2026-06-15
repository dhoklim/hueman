// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

// 무표정에 sad가 새는 얼굴 — 보정 전이면 'sad'로 읽힌다.
const faceEmotionMock = vi.hoisted(() => ({
  loadModels: vi.fn(async () => {}),
  startCamera: vi.fn(async () => ({ getTracks: () => [] })),
  detectExpressions: vi.fn(async () => ({ neutral: 0.55, sad: 0.45 })),
}));

vi.mock('../src/faceEmotion.js', () => faceEmotionMock);

describe('liveEmotion calibration', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('builds a baseline from neutral samples and returns it', async () => {
    vi.useFakeTimers();
    const { startLiveEmotion, startCalibration, finishCalibration, stopLiveEmotion } =
      await import('../src/liveEmotion.js');

    await startLiveEmotion({ onEmotion: vi.fn() });
    startCalibration();
    await vi.advanceTimersByTimeAsync(1500); // 여러 tick 동안 무표정 수집

    const baseline = finishCalibration();
    expect(baseline).not.toBeNull();
    expect(baseline.neutral).toBeCloseTo(0.55);
    expect(baseline.sad).toBeCloseTo(0.45);

    stopLiveEmotion();
  });

  it('reads the same resting face as numb after calibration', async () => {
    vi.useFakeTimers();
    const onEmotion = vi.fn();
    const { startLiveEmotion, startCalibration, finishCalibration, stopLiveEmotion } =
      await import('../src/liveEmotion.js');

    await startLiveEmotion({ onEmotion });
    startCalibration();
    await vi.advanceTimersByTimeAsync(1500);
    finishCalibration();

    onEmotion.mockClear();
    await vi.advanceTimersByTimeAsync(1500); // 보정 적용된 채로 같은 무표정 감지

    const last = onEmotion.mock.calls.at(-1)[0];
    expect(last.detected).toBe('numb');

    stopLiveEmotion();
  });

  it('returns null baseline when too few face samples were collected', async () => {
    vi.useFakeTimers();
    faceEmotionMock.detectExpressions.mockResolvedValue(null); // 얼굴 미검출(어두움)
    const { startLiveEmotion, startCalibration, finishCalibration, getBaseline, stopLiveEmotion } =
      await import('../src/liveEmotion.js');

    await startLiveEmotion({ onEmotion: vi.fn() });
    startCalibration();
    await vi.advanceTimersByTimeAsync(1500);

    expect(finishCalibration()).toBeNull();
    expect(getBaseline()).toBeNull(); // 보정 미적용

    stopLiveEmotion();
  });
});

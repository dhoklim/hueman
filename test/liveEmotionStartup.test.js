// @vitest-environment jsdom
// 카메라 시작 대기 시간 단축: 모델 로드와 카메라 켜기를 동시에 진행하고,
// 대기 화면에서 미리 모델을 받아 엔진을 데워 둔다.
import { afterEach, describe, expect, it, vi } from 'vitest';

const faceEmotionMock = vi.hoisted(() => ({
  loadModels: vi.fn(),
  warmUp: vi.fn(),
  startCamera: vi.fn(),
  detectExpressions: vi.fn(async () => null),
}));
vi.mock('../src/faceEmotion.js', () => faceEmotionMock);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fakeStream() {
  const track = { stop: vi.fn() };
  return { track, stream: { getTracks: () => [track] } };
}

describe('live emotion startup speed', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('starts the camera without waiting for the models to finish loading', async () => {
    const models = deferred();
    const { stream } = fakeStream();
    faceEmotionMock.loadModels.mockReturnValue(models.promise);
    faceEmotionMock.startCamera.mockResolvedValue(stream);
    const { startLiveEmotion, stopLiveEmotion } = await import('../src/liveEmotion.js');

    const started = startLiveEmotion();
    await Promise.resolve();
    expect(faceEmotionMock.startCamera).toHaveBeenCalledTimes(1);

    models.resolve();
    await expect(started).resolves.toBeInstanceOf(HTMLVideoElement);
    stopLiveEmotion();
  });

  it('turns the camera back off when the models fail after the camera started', async () => {
    const { track, stream } = fakeStream();
    faceEmotionMock.loadModels.mockRejectedValue(new Error('model missing'));
    faceEmotionMock.startCamera.mockResolvedValue(stream);
    const { startLiveEmotion } = await import('../src/liveEmotion.js');

    await expect(startLiveEmotion()).rejects.toThrow('model missing');

    expect(track.stop).toHaveBeenCalled();
    expect(document.getElementById('cam-preview')).toBe(null);
  });

  it('preloads and warms up the models in the background without throwing', async () => {
    faceEmotionMock.warmUp.mockRejectedValue(new Error('offline'));
    const { preloadEmotionModels } = await import('../src/liveEmotion.js');

    await expect(preloadEmotionModels()).resolves.toBe(false);
    expect(faceEmotionMock.warmUp).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}models`);
    expect(faceEmotionMock.startCamera).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

let liveCallback = null;
let startedVideo = null;

const snapshotMock = vi.hoisted(() => ({
  captureTargetFrom: vi.fn(() => true),
  grabTargetCanvas: vi.fn(() => document.createElement('canvas')),
  setTarget: vi.fn(),
  addTile: vi.fn(),
  getTarget: vi.fn(() => ({})),
  getTiles: vi.fn(() => []),
  hasEnough: vi.fn(() => false),
  reset: vi.fn(),
}));

const liveMock = vi.hoisted(() => ({
  startCalibration: vi.fn(),
  finishCalibration: vi.fn(() => null),
}));

vi.mock('../src/liveEmotion.js', () => ({
  startLiveEmotion: vi.fn(async ({ onEmotion } = {}) => {
    liveCallback = onEmotion;
    startedVideo = document.createElement('video');
    return startedVideo;
  }),
  stopLiveEmotion: vi.fn(),
  setFallback: vi.fn(),
  startCalibration: liveMock.startCalibration,
  finishCalibration: liveMock.finishCalibration,
}));

vi.mock('../src/snapshots.js', () => snapshotMock);

vi.mock('../src/sound.js', () => ({ enableSound: vi.fn(), playEmotionCue: vi.fn() }));
vi.mock('../src/videoMap.js', () => ({ SCENE_VIDEOS: {} }));

describe('live emotion display', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    liveCallback = null;
    startedVideo = null;
    vi.clearAllMocks();
    vi.resetModules();
  });

  // 인트로 → 카메라 시작 → 사진 촬영 확정 → 보정 카운트다운 종료까지 진행해
  // 스토리 장면(.scene-text)에 도달시킨다. (fake timer 필요)
  async function reachStoryScene() {
    document.querySelector('.intro-start-cam').click();
    await vi.advanceTimersByTimeAsync(1); // startLiveEmotion 비동기 flush
    document.querySelector('.confirm-start').click();
    await vi.advanceTimersByTimeAsync(4000); // 보정 카운트다운 종료 → 장면 진입
  }

  it('opens a separate camera capture screen instead of capturing on the intro', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    document.querySelector('.intro-start-cam').click();

    await vi.waitFor(() => expect(document.querySelector('.camera-screen')).toBeTruthy());
    expect(snapshotMock.setTarget).not.toHaveBeenCalled();
    expect(document.querySelector('.intro')).toBeNull();
    expect(document.querySelector('.camera-shutter')).toBeTruthy();
  });

  it('does not tint the screen before the game starts (camera capture screen)', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    document.querySelector('.intro-start-cam').click();
    await vi.waitFor(() => expect(liveCallback).toBeTypeOf('function'));

    const tint = document.getElementById('tint');
    expect(tint.style.opacity).toBe('0');

    // 아직 사진 촬영 화면 — 게임 시작 전이므로 감정이 들어와도 화면을 칠하지 않는다
    liveCallback({ emotion: 'anger', detected: 'anger', faceFound: true });

    expect(tint.style.opacity).toBe('0');
    expect(tint.style.background).not.toContain('rgb(224, 49, 49)');
  });

  it('runs a neutral-face calibration step between the photo and the game', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    document.querySelector('.intro-start-cam').click();
    await vi.advanceTimersByTimeAsync(1);

    // 사진 확정 직후 — 아직 스토리 장면이 아니라 무표정 보정 화면
    document.querySelector('.confirm-start').click();
    await vi.advanceTimersByTimeAsync(1);
    expect(document.querySelector('.calibration')).toBeTruthy();
    expect(document.querySelector('.scene-text')).toBeNull();
    expect(liveMock.startCalibration).toHaveBeenCalled();

    // 카운트다운이 끝나면 보정값을 확정하고 스토리 장면으로 진입
    await vi.advanceTimersByTimeAsync(4000);
    expect(liveMock.finishCalibration).toHaveBeenCalled();
    expect(document.querySelector('.calibration')).toBeNull();
    expect(document.querySelector('.scene-text')).toBeTruthy();
  });

  it('tints the screen with the live emotion once the game has started', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    await reachStoryScene();
    expect(document.querySelector('.scene-text')).toBeTruthy();

    const tint = document.getElementById('tint');
    liveCallback({ emotion: 'anger', detected: 'anger', faceFound: true });

    expect(Number(tint.style.opacity)).toBeGreaterThan(0);
    expect(tint.style.background).toContain('rgb(224, 49, 49)'); // anger #E03131
  });

  it('uses the latest detected expression for tint instead of waiting for smoothed emotion', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    await reachStoryScene();

    const tint = document.getElementById('tint');
    liveCallback({ emotion: 'joy', detected: 'sad', faceFound: true });

    expect(tint.style.background).toContain('rgb(59, 125, 216)'); // sad #3B7DD8
    expect(tint.style.background).not.toContain('rgb(255, 210, 63)'); // joy #FFD23F
  });

  it('blends two colors when two emotions are detected similarly', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    await reachStoryScene();

    const tint = document.getElementById('tint');
    for (const emotion of ['joy', 'sad', 'joy', 'sad']) {
      liveCallback({ emotion, detected: emotion, faceFound: true });
    }

    expect(tint.style.background).toContain('linear-gradient');
    expect(tint.style.background).toContain('rgb(255, 210, 63)'); // joy
    expect(tint.style.background).toContain('rgb(59, 125, 216)'); // sad
  });
});

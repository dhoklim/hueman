// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

let liveCallback = null;
let startedVideo = null;

const snapshotMock = vi.hoisted(() => ({
  captureTargetFrom: vi.fn(() => true),
  captureTargetWhenReady: vi.fn(async () => true),
  setTargetFrom: vi.fn(),
  addTile: vi.fn(),
  getTarget: vi.fn(() => ({})),
  getTiles: vi.fn(() => []),
  hasEnough: vi.fn(() => false),
  reset: vi.fn(),
}));

vi.mock('../src/liveEmotion.js', () => ({
  startLiveEmotion: vi.fn(async ({ onEmotion } = {}) => {
    liveCallback = onEmotion;
    startedVideo = document.createElement('video');
    return startedVideo;
  }),
  stopLiveEmotion: vi.fn(),
  setFallback: vi.fn(),
}));

vi.mock('../src/snapshots.js', () => snapshotMock);

vi.mock('../src/debug.js', () => ({ updateDebug: vi.fn() }));
vi.mock('../src/sound.js', () => ({ enableSound: vi.fn(), playEmotionCue: vi.fn() }));
vi.mock('../src/videoMap.js', () => ({ SCENE_VIDEOS: {} }));

describe('live emotion display', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    liveCallback = null;
    startedVideo = null;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('captures the mosaic target photo only after the red photo button is clicked', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    document.querySelector('.intro-start-cam').click();

    await vi.waitFor(() => expect(document.querySelector('.photo-capture-btn')).toBeTruthy());
    expect(snapshotMock.captureTargetWhenReady).not.toHaveBeenCalled();
    expect(document.querySelector('.intro')).toBeTruthy();

    document.querySelector('.photo-capture-btn').click();

    await vi.waitFor(() => expect(snapshotMock.captureTargetWhenReady).toHaveBeenCalledWith(startedVideo));
    expect(document.querySelector('.intro')).toBeNull();
  });

  it('does not recolor the screen with the viewer current emotion', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    document.querySelector('.intro-start-cam').click();
    await vi.waitFor(() => expect(liveCallback).toBeTypeOf('function'));

    const tint = document.getElementById('tint');
    const sceneTint = tint.style.background;
    expect(sceneTint).toBe('transparent');
    expect(tint.style.opacity).toBe('0');

    liveCallback({ emotion: 'anger', detected: 'anger', faceFound: true });

    expect(tint.style.background).toBe(sceneTint);
    expect(tint.style.opacity).toBe('0');
    expect(tint.style.background).not.toContain('rgb(224, 49, 49)');
  });
});

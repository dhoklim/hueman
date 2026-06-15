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

  it('opens a separate camera capture screen instead of capturing on the intro', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('../src/main.js');
    document.querySelector('.intro-start-cam').click();

    await vi.waitFor(() => expect(document.querySelector('.camera-screen')).toBeTruthy());
    expect(snapshotMock.setTarget).not.toHaveBeenCalled();
    expect(document.querySelector('.intro')).toBeNull();
    expect(document.querySelector('.camera-shutter')).toBeTruthy();
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

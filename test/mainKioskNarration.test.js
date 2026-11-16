// @vitest-environment jsdom
// 영상이 자동으로 넘어가는 나레이션 장면을 보는 동안에는 관람자가 아무것도 누르지 않아도
// 무인 초기화 경고가 뜨면 안 된다. (전시 감사: 공부 몽타주 ~48초 동안 50초 경고가 떠서 리셋됨)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/liveEmotion.js', () => ({
  startLiveEmotion: vi.fn(),
  stopLiveEmotion: vi.fn(),
  setFallback: vi.fn(),
  startCalibration: vi.fn(),
  finishCalibration: vi.fn(() => null),
}));
vi.mock('../src/wallClient.js', () => ({ publishWallEmotion: vi.fn(() => Promise.resolve(false)) }));
vi.mock('../src/sound.js', () => ({ enableSound: vi.fn(), playEmotionCue: vi.fn() }));
// 모든 장면에 30초짜리 영상 구간을 붙인다 → 나레이션 장면은 입력 없이 자동 진행한다.
vi.mock('../src/videoMap.js', () => ({
  SCENE_VIDEOS: new Proxy({}, { get: (_t, id) => (typeof id === 'string' ? { file: `${id}.mp4`, start: 0, end: 30 } : undefined) }),
}));

describe('unattended timer during auto-advancing narration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    window.dispatchEvent(new Event('pagehide'));
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    vi.resetModules();
  });

  it('does not warn while narration videos keep advancing, but still warns at an unanswered choice', async () => {
    await import('../src/main.js');
    document.querySelector('.attract-activate').click();
    document.querySelector('.intro-start-plain').click();
    expect(document.querySelector('.scene-text')).toBeTruthy();

    // opening → infancy_milk → infancy_steps → infancy_doodle: 4개 나레이션 × (로드 대기 2.5초 + 30초)
    for (let second = 0; second < 4 * 32.6; second++) {
      await vi.advanceTimersByTimeAsync(1_000);
      expect(document.querySelector('.kiosk-reset-overlay')).toBeNull();
    }
    // 돌잡이 선택지에서 멈춘다. 여기서부터는 아무도 고르지 않으면 50초 뒤 경고가 뜬다.
    expect(document.querySelectorAll('.choices .choice-btn').length).toBeGreaterThan(1);
    await vi.advanceTimersByTimeAsync(50_000);
    expect(document.querySelector('.kiosk-reset-overlay')).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { renderIntro, renderScene, showResult, renderCameraCapture, setTint } from '../src/ui.js';

const mainCss = readFileSync(join(process.cwd(), 'styles', 'main.css'), 'utf8');

function zIndexFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = mainCss.match(new RegExp(`${escaped}\\s*\\{[^}]*z-index:\\s*(\\d+)`, 's'));
  return match ? Number(match[1]) : null;
}

describe('ui.setTint (실시간 감정 화면 틴트)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clears the tint when called with no emotion', () => {
    setTint('anger');
    setTint();
    const tint = document.getElementById('tint');
    expect(tint.style.background).toBe('transparent');
    expect(tint.style.opacity).toBe('0');
  });

  it('paints a subtle single-color overlay for one emotion', () => {
    setTint('anger');
    const tint = document.getElementById('tint');
    expect(tint.style.background).toContain('rgb(224, 49, 49)'); // anger #E03131
    const opacity = Number(tint.style.opacity);
    expect(opacity).toBeGreaterThanOrEqual(0.22);
    expect(opacity).toBeLessThanOrEqual(0.35);
  });

  it('blends two colors into a gradient overlay for two emotions', () => {
    setTint(['joy', 'sad']);
    const tint = document.getElementById('tint');
    expect(tint.style.background).toContain('linear-gradient');
    expect(tint.style.background).toContain('rgb(255, 210, 63)'); // joy
    expect(tint.style.background).toContain('rgb(59, 125, 216)'); // sad
    expect(Number(tint.style.opacity)).toBeGreaterThan(0);
  });
});

describe('ui tint layer order', () => {
  it('keeps the tint above the active background video and below the UI', () => {
    // setBgVideo raises the visible video buffer to z-index 1, so #tint must be
    // at least that high. #tint is inserted after videos, keeping it visually above them.
    expect(zIndexFor('#tint')).toBeGreaterThanOrEqual(1);
    expect(zIndexFor('#tint')).toBeLessThan(zIndexFor('#app'));
  });
});

describe('ui.renderIntro', () => {
  it('shows description and fires onStart with camera flag from each button', () => {
    const root = document.createElement('div');
    const onStart = vi.fn();
    renderIntro(root, { onStart });
    expect(root.textContent).toContain('hueman');
    expect(root.querySelector('.intro-start-cam')).toBeTruthy();
    expect(root.querySelector('.intro-start-plain')).toBeTruthy();
    root.querySelector('.intro-start-cam').click();
    expect(onStart).toHaveBeenCalledWith(true);
    root.querySelector('.intro-start-plain').click();
    expect(onStart).toHaveBeenCalledWith(false);
  });

  it('returns only setLoading (no intro capture button)', () => {
    const root = document.createElement('div');
    const intro = renderIntro(root, { onStart: vi.fn() });
    expect(typeof intro.setLoading).toBe('function');
    expect(intro.setCaptureReady).toBeUndefined();
    expect(root.querySelector('.photo-capture-btn')).toBeNull();
  });
});

describe('ui.renderCameraCapture', () => {
  it('shutter → 3·2·1 countdown → confirm preview → onConfirm(canvas)', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const onConfirm = vi.fn();
    renderCameraCapture(root, { stream: null, onConfirm });

    expect(root.querySelector('.camera-preview')).toBeTruthy();
    expect(root.querySelector('.face-guide')).toBeTruthy();
    const shutter = root.querySelector('.camera-shutter');
    expect(shutter).toBeTruthy();

    shutter.click();
    vi.advanceTimersByTime(2100); // 3 ticks × 700ms → 촬영

    const confirm = root.querySelector('.capture-confirm');
    expect(confirm.hidden).toBe(false);
    expect(root.querySelector('.capture-shot canvas')).toBeTruthy();

    root.querySelector('.confirm-start').click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toBeInstanceOf(window.HTMLCanvasElement);
    vi.useRealTimers();
  });

  it('retake returns to the live view', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    renderCameraCapture(root, { stream: null, onConfirm: vi.fn() });
    root.querySelector('.camera-shutter').click();
    vi.advanceTimersByTime(2100);
    expect(root.querySelector('.capture-confirm').hidden).toBe(false);

    root.querySelector('.confirm-retake').click();
    expect(root.querySelector('.capture-confirm').hidden).toBe(true);
    expect(root.querySelector('.camera-shutter').hidden).toBe(false);
    vi.useRealTimers();
  });
});

describe('ui.renderScene', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders narration text for a scene', () => {
    const root = document.createElement('div');
    renderScene(root, { type: 'scene', text: '안녕', emotion: 'joy' }, {});
    expect(root.textContent).toContain('안녕');
  });

  it('plays story background videos with their original audio enabled', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());

    const root = document.createElement('div');
    renderScene(root, { id: 'opening', type: 'scene', text: '안녕', emotion: 'joy' }, {});

    const videos = [...document.querySelectorAll('.bg-video')];
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.every((video) => video.muted === false)).toBe(true);
  });

  it('does not reset the live emotion tint when rendering a scene (no flicker)', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    // 웹캠이 이미 칠해 둔 실시간 틴트를 흉내낸다
    const tint = document.createElement('div');
    tint.id = 'tint';
    tint.style.background = 'rgb(224, 49, 49)';
    tint.style.opacity = '0.28';
    document.body.appendChild(tint);

    const root = document.createElement('div');
    renderScene(root, { id: 'opening', type: 'scene', text: '안녕', emotion: 'joy' }, {});

    // 장면 전환이 틴트를 지우면 색이 깜빡인다 — 웹캠이 칠한 색을 그대로 둬야 한다
    expect(tint.style.background).toBe('rgb(224, 49, 49)');
    expect(tint.style.opacity).toBe('0.28');
  });

  it('renders two buttons for a choice and fires onChoice', () => {
    const root = document.createElement('div');
    const onChoice = vi.fn();
    renderScene(root, {
      type: 'choice', text: '고르기', emotion: 'anxiety',
      choices: [{ label: '왼' }, { label: '오' }],
    }, { onChoice });
    const btns = root.querySelectorAll('.choice-btn');
    expect(btns).toHaveLength(2);
    btns[0].click();
    expect(onChoice).toHaveBeenCalledWith(0);
  });
});

describe('ui.showResult', () => {
  it('shows the closing headline, message, and mosaic placeholder', () => {
    const root = document.createElement('div');
    showResult(root, { topCategory: 'joy', isComposite: false, message: '메시지다' });
    expect(root.textContent).toContain('살아있었다는 증거');
    expect(root.textContent).toContain('메시지다');
    expect(root.textContent).toContain('모자이크');
  });

  it('shows timeline and result actions when a mosaic exists', () => {
    const root = document.createElement('div');
    const canvas = document.createElement('canvas');
    showResult(root, {
      topCategory: 'sad',
      isComposite: false,
      message: '메시지다',
      totals: { joy: 4000, sad: 6000 },
    }, canvas);

    expect(root.querySelectorAll('.timeline-segment')).toHaveLength(2);
    expect(root.textContent).toContain('결과 카드 저장');
    expect(root.textContent).toContain('갤러리에 남기기');
  });

  it('opens a zoom overlay for the completed mosaic', () => {
    const root = document.createElement('div');
    const canvas = document.createElement('canvas');
    showResult(root, { topCategory: 'joy', isComposite: false, message: '메시지다' }, canvas);

    const zoom = [...root.querySelectorAll('button')]
      .find((button) => button.textContent === '크게 보기');
    zoom.click();

    const overlay = document.querySelector('.mosaic-zoom-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.querySelector('canvas')).not.toBe(canvas);
  });

  it('shows the path receipt when choices were recorded', () => {
    const root = document.createElement('div');
    showResult(root, {
      topCategory: 'joy',
      isComposite: false,
      message: '메시지다',
      receipts: ['돌상에서 붓을 잡았다', '내가 원하는 길을 갔다'],
    });
    expect(root.querySelector('.receipt').textContent).toContain(
      '돌상에서 붓을 잡았다 · 내가 원하는 길을 갔다'
    );
  });

  it('omits the receipt block when no receipts exist', () => {
    const root = document.createElement('div');
    showResult(root, { topCategory: 'joy', isComposite: false, message: '메시지다' });
    expect(root.querySelector('.receipt')).toBeNull();
  });

  it('accepts a reveal handle, shows its canvas, and starts playback', async () => {
    const root = document.createElement('div');
    const handle = {
      canvas: document.createElement('canvas'),
      full: document.createElement('canvas'),
      play: vi.fn(),
    };
    showResult(root, { topCategory: 'joy', isComposite: false, message: '메시지다' }, handle);
    expect(root.querySelector('.mosaic-slot canvas')).toBe(handle.canvas);
    await new Promise((r) => requestAnimationFrame(r));
    expect(handle.play).toHaveBeenCalled();
  });

  it('shows the daily stats line when provided', () => {
    const root = document.createElement('div');
    showResult(root, {
      topCategory: 'joy',
      isComposite: false,
      message: '메시지다',
      statsText: '당신은 오늘 이 부스를 지나간 첫 번째 인생입니다.',
    });
    expect(root.querySelector('.daily-stats').textContent).toContain('첫 번째 인생');
  });
});

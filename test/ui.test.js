// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { renderIntro, renderScene, showResult } from '../src/ui.js';

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

  it('shows a red photo capture button when camera is ready', () => {
    const root = document.createElement('div');
    const onCapture = vi.fn();
    const intro = renderIntro(root, { onStart: vi.fn() });

    intro.setCaptureReady(onCapture);

    const button = root.querySelector('.photo-capture-btn');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('사진 찍기');
    button.click();
    expect(onCapture).toHaveBeenCalled();
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

  it('keeps mapped video scenes unobstructed by the tint overlay', () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const root = document.createElement('div');

    renderScene(root, { id: 'opening', type: 'scene', text: '안녕', emotion: 'joy' }, {});

    const tint = document.getElementById('tint');
    expect(tint.style.background).toBe('transparent');
    expect(tint.style.opacity).toBe('0');
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
  it('shows the dominant label, message, and mosaic placeholder', () => {
    const root = document.createElement('div');
    showResult(root, { topCategory: 'joy', isComposite: false, message: '메시지다' });
    expect(root.textContent).toContain('기쁨');
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

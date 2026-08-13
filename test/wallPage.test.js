// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountEmotionWall } from '../src/wall.js';

const API = 'https://transfer.example';
const EMPTY = {
  day: '2026-08-13',
  total: 0,
  counts: { joy: 0, sad: 0, anger: 0, numb: 0, anxiety: 0 },
  updatedAt: null,
};
const POPULATED = {
  day: '2026-08-13',
  total: 7,
  counts: { joy: 3, sad: 1, anger: 0, numb: 1, anxiety: 2 },
  updatedAt: 1760000000000,
};

function response(snapshot) {
  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function displayWindow({ reducedMotion = false } = {}) {
  return {
    devicePixelRatio: 1,
    matchMedia: vi.fn(() => ({ matches: reducedMotion })),
    requestAnimationFrame: vi.fn(() => 1),
    cancelAnimationFrame: vi.fn(),
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
  };
}

function canvasContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext());
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 450 });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('mountEmotionWall', () => {
  it('renders an ambient embed as a text-free background landscape', async () => {
    const root = document.createElement('main');
    const handle = mountEmotionWall(root, {
      apiUrl: API,
      fetchImpl: vi.fn().mockResolvedValue(response(POPULATED)),
      variant: 'ambient',
      windowRef: displayWindow(),
    });

    await handle.refresh();

    expect(root.classList.contains('emotion-wall--ambient')).toBe(true);
    expect(root.querySelector('canvas')).toBeTruthy();
    expect(root.querySelector('.wall-copy')).toBeNull();
    expect(root.textContent).not.toContain('오늘 전시를 지나간');
    expect(root.querySelectorAll('[data-emotion-count]')).toHaveLength(0);
    handle.stop();
  });

  it('renders a quiet empty beginning and five labeled category counts', async () => {
    const root = document.createElement('main');
    const handle = mountEmotionWall(root, {
      apiUrl: API,
      fetchImpl: vi.fn().mockResolvedValue(response(EMPTY)),
      windowRef: displayWindow(),
    });

    await handle.refresh();

    expect(root.textContent).toContain('아직 첫 감정이 도착하기 전입니다');
    expect(root.textContent).toContain('오늘 전시를 지나간 0개의 감정');
    expect(root.querySelectorAll('[data-emotion-count]')).toHaveLength(5);
    expect(root.querySelector('[data-emotion-count="joy"]').textContent).toBe('0');
    expect(root.querySelector('canvas')).toBeTruthy();
    handle.stop();
  });

  it('renders a refreshed aggregate total and every category count', async () => {
    const root = document.createElement('main');
    const fetchImpl = vi.fn().mockResolvedValue(response(POPULATED));
    const handle = mountEmotionWall(root, { apiUrl: API, fetchImpl, windowRef: displayWindow() });

    await handle.refresh();

    expect(fetchImpl).toHaveBeenCalledWith('https://transfer.example/v1/wall', { method: 'GET' });
    expect(root.textContent).toContain('오늘 전시를 지나간 7개의 감정');
    expect(root.querySelector('[data-emotion-count="joy"]').textContent).toBe('3');
    expect(root.querySelector('[data-emotion-count="anxiety"]').textContent).toBe('2');
    expect(root.dataset.state).toBe('ready');
    handle.stop();
  });

  it('keeps the last successful landscape visible when the next poll fails', async () => {
    const root = document.createElement('main');
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(POPULATED))
      .mockRejectedValueOnce(new Error('offline'));
    const handle = mountEmotionWall(root, { apiUrl: API, fetchImpl, windowRef: displayWindow() });

    await handle.refresh();
    await handle.refresh();

    expect(root.textContent).toContain('오늘 전시를 지나간 7개의 감정');
    expect(root.textContent).toContain('마지막 풍경을 유지하고 있습니다');
    expect(root.dataset.state).toBe('stale');
    handle.stop();
  });

  it('draws a static landscape without scheduling animation when reduced motion is requested', async () => {
    const root = document.createElement('main');
    const windowRef = displayWindow({ reducedMotion: true });
    const handle = mountEmotionWall(root, {
      apiUrl: API,
      fetchImpl: vi.fn().mockResolvedValue(response(POPULATED)),
      windowRef,
    });

    await handle.refresh();

    expect(windowRef.requestAnimationFrame).not.toHaveBeenCalled();
    handle.stop();
  });
});

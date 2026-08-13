import { getTransferApiUrl } from './photoTransfer.js';
import { WALL_EMOTIONS } from './wallClient.js';

const EMOTIONS = {
  joy: { label: '기쁨', color: '#FFD23F' },
  sad: { label: '슬픔', color: '#3B7DD8' },
  anger: { label: '분노', color: '#E03131' },
  numb: { label: '무감각', color: '#1A1A1A' },
  anxiety: { label: '불안', color: '#FF8C2B' },
};
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const POLL_MS = 4_000;

export function mountEmotionWall(
  root,
  {
    apiUrl = import.meta.env.VITE_QR_TRANSFER_API_URL,
    fetchImpl = typeof fetch === 'undefined' ? null : fetch,
    intervalMs = POLL_MS,
    windowRef = typeof window === 'undefined' ? null : window,
    variant = 'full',
  } = {},
) {
  if (!root) throw new Error('Emotion wall needs a root element');

  const ambient = variant === 'ambient';
  const endpoint = getTransferApiUrl(apiUrl);
  const reducedMotion = Boolean(windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  let snapshot = emptySnapshot();
  let state = endpoint ? 'loading' : 'offline';
  let frameId = null;
  let stopped = false;

  root.className = ambient ? 'emotion-wall emotion-wall--ambient' : 'emotion-wall';
  root.innerHTML = ambient ? `
    <section class="wall-frame" aria-label="공동 감정 벽">
      <canvas class="wall-canvas" aria-hidden="true"></canvas>
    </section>
  ` : `
    <section class="wall-frame" aria-labelledby="wall-title">
      <canvas class="wall-canvas" aria-hidden="true"></canvas>
      <div class="wall-copy">
        <p class="wall-kicker">hueman · 공동 감정 벽</p>
        <h1 id="wall-title">오늘 전시를 지나간 <span data-wall-total aria-live="polite">0</span>개의 감정</h1>
        <p class="wall-empty" data-wall-empty></p>
        <ul class="wall-legend" aria-label="오늘의 감정 합계"></ul>
        <p class="wall-status" data-wall-status aria-live="polite"></p>
      </div>
    </section>
  `;

  const canvas = root.querySelector('.wall-canvas');
  const totalEl = root.querySelector('[data-wall-total]');
  const emptyEl = root.querySelector('[data-wall-empty]');
  const legend = root.querySelector('.wall-legend');
  const statusEl = root.querySelector('[data-wall-status]');

  if (legend) {
    for (const emotion of WALL_EMOTIONS) {
      const item = document.createElement('li');
      item.className = `wall-legend-item emotion-${emotion}`;
      item.innerHTML = `<span class="wall-swatch" aria-hidden="true"></span><span>${EMOTIONS[emotion].label}</span><strong data-emotion-count="${emotion}">0</strong>`;
      legend.appendChild(item);
    }
  }

  function render() {
    root.dataset.state = state;
    if (totalEl) totalEl.textContent = String(snapshot.total);
    if (emptyEl) emptyEl.textContent = snapshot.total === 0 ? '아직 첫 감정이 도착하기 전입니다' : '';
    for (const emotion of WALL_EMOTIONS) {
      const countEl = root.querySelector(`[data-emotion-count="${emotion}"]`);
      if (countEl) countEl.textContent = String(snapshot.counts[emotion]);
    }
    if (statusEl) statusEl.textContent = connectionMessage(state, snapshot.day);
    drawLandscape(canvas, snapshot, 0, windowRef);
    if (!reducedMotion && frameId === null && !stopped) animate();
  }

  function animate() {
    frameId = windowRef?.requestAnimationFrame?.((time) => {
      frameId = null;
      if (stopped) return;
      drawLandscape(canvas, snapshot, time, windowRef);
      animate();
    }) ?? null;
  }

  async function refresh() {
    if (!endpoint || typeof fetchImpl !== 'function') {
      state = 'offline';
      render();
      return false;
    }

    try {
      const response = await fetchImpl(`${endpoint}/v1/wall`, { method: 'GET' });
      if (!response.ok) throw new Error('wall request failed');
      const next = normalizeSnapshot(await response.json());
      if (!next) throw new Error('invalid wall snapshot');
      snapshot = next;
      state = 'ready';
      render();
      return true;
    } catch {
      state = 'stale';
      render();
      return false;
    }
  }

  const intervalId = windowRef?.setInterval?.(() => { void refresh(); }, intervalMs);
  render();

  return {
    refresh,
    stop() {
      stopped = true;
      if (intervalId !== undefined && intervalId !== null) windowRef?.clearInterval?.(intervalId);
      if (frameId !== null) windowRef?.cancelAnimationFrame?.(frameId);
      frameId = null;
    },
  };
}

function emptySnapshot() {
  return {
    day: '',
    total: 0,
    counts: Object.fromEntries([...WALL_EMOTIONS].map((emotion) => [emotion, 0])),
    updatedAt: null,
  };
}

function normalizeSnapshot(value) {
  if (!value || !DAY_RE.test(value.day || '') || !Number.isInteger(value.total) || value.total < 0) return null;
  const counts = {};
  let sum = 0;
  for (const emotion of WALL_EMOTIONS) {
    const count = value.counts?.[emotion];
    if (!Number.isInteger(count) || count < 0) return null;
    counts[emotion] = count;
    sum += count;
  }
  if (sum !== value.total) return null;
  return { day: value.day, total: value.total, counts, updatedAt: value.updatedAt ?? null };
}

function connectionMessage(state, day) {
  if (state === 'ready') return `${day} KST의 익명 합계입니다`;
  if (state === 'stale') return '연결이 잠시 끊겼습니다. 마지막 풍경을 유지하고 있습니다.';
  if (state === 'offline') return '공동 감정 벽 연결이 아직 설정되지 않았습니다.';
  return '전시의 감정을 불러오는 중입니다.';
}

function drawLandscape(canvas, snapshot, time, windowRef) {
  const context = canvas?.getContext?.('2d');
  if (!context) return;
  const bounds = canvas.getBoundingClientRect?.() || {};
  const pixelRatio = Math.min(Number(windowRef?.devicePixelRatio) || 1, 2);
  const width = Math.max(1, Math.round((bounds.width || 1280) * pixelRatio));
  const height = Math.max(1, Math.round((bounds.height || 720) * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#11131c';
  context.fillRect(0, 0, width, height);
  const drift = time * 0.00008;

  for (const emotion of WALL_EMOTIONS) {
    const count = snapshot.counts[emotion];
    if (!count) continue;
    const particles = Math.min(22, Math.max(2, Math.ceil(Math.sqrt(count) * 2)));
    for (let index = 0; index < particles; index += 1) {
      const seed = stableNumber(`${snapshot.day}:${emotion}:${index}:${count}`);
      const x = width * (0.08 + 0.84 * fractional(seed * 5.17 + drift * (0.35 + seed)));
      const y = height * (0.08 + 0.84 * fractional(seed * 9.71 + drift * (0.21 + seed)));
      const radius = Math.max(28, Math.min(width, height) * (0.035 + seed * 0.065 + Math.log2(count + 1) * 0.012));
      const glow = context.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, rgba(EMOTIONS[emotion].color, 0.62));
      glow.addColorStop(0.5, rgba(EMOTIONS[emotion].color, 0.2));
      glow.addColorStop(1, rgba(EMOTIONS[emotion].color, 0));
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function stableNumber(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function fractional(value) {
  return value - Math.floor(value);
}

function rgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const wallRoot = typeof document === 'undefined' ? null : document.getElementById('wall-app');
if (wallRoot) {
  const variant = new URLSearchParams(window.location.search).get('embed') === 'ambient' ? 'ambient' : 'full';
  const wall = mountEmotionWall(wallRoot, { variant });
  void wall.refresh();
}

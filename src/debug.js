// 테스트 버전용 파라미터 패널. 실시간 내부 상태(현재 씬·감정·누적 flag·집계·경로)를 표시.
// D 키로 끄기/켜기. (e.code 사용 — 한글 입력기와 무관하게 물리 D 키 인식)
import { current } from './engine.js';
import { aggregate } from './experienceLog.js';
import { EMOTIONS } from './emotionColor.js';

let panel = null;
let visible = true;

function ensurePanel() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'debug-panel';
  document.body.appendChild(panel);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') {
      visible = !visible;
      panel.style.display = visible ? 'block' : 'none';
    }
  });
  return panel;
}

function flagsHtml(flags) {
  const keys = Object.keys(flags);
  if (keys.length === 0) return '<span class="dim">(아직 없음)</span>';
  return keys.map((k) => `<span class="flag">${k}: <b>${flags[k]}</b></span>`).join(' ');
}

export function updateDebug(engine, log, live = {}) {
  const el = ensurePanel();
  const scene = current(engine);
  const sceneEmo = EMOTIONS[scene.emotion] || {};
  const agg = aggregate(log);
  const trail = log.events.map((e) => e.sceneId);

  let camHtml;
  if (live.active) {
    const applied = EMOTIONS[live.emotion] || {};
    const det = live.detected ? (EMOTIONS[live.detected]?.label || live.detected) : '얼굴 없음';
    camHtml = `<span class="swatch" style="background:${applied.hex || '#888'}"></span> ${det} → <b>${applied.label || live.emotion}</b>`;
  } else {
    camHtml = '<span class="dim">OFF · 장면 색 사용</span>';
  }

  el.innerHTML = `
    <div class="dbg-head">🧪 TEST 패널 <span class="dim">· D 키로 끄기/켜기</span></div>
    <div class="dbg-row"><span class="dbg-k">현재 씬</span> <code>${scene.id}</code></div>
    <div class="dbg-row"><span class="dbg-k">단계 / 타입</span> ${scene.stage} / ${scene.type}</div>
    <div class="dbg-row"><span class="dbg-k">카메라 감정</span> ${camHtml}</div>
    <div class="dbg-row"><span class="dbg-k">모자이크</span> ${live.active ? `타깃 ${live.hasTarget ? '✓' : '–'} · 타일 ${live.tiles || 0}장` : '<span class="dim">–</span>'}</div>
    <div class="dbg-row"><span class="dbg-k">장면 감정</span> <span class="swatch" style="background:${sceneEmo.hex || '#888'}"></span> ${sceneEmo.label || scene.emotion}</div>
    <div class="dbg-row"><span class="dbg-k">누적 상태</span> ${flagsHtml(engine.flags)}</div>
    <div class="dbg-row"><span class="dbg-k">집계(실시간)</span> ${agg.topCategory}${agg.isComposite ? ' (복합)' : ''}</div>
    <div class="dbg-row dbg-trail"><span class="dbg-k">경로(${trail.length})</span> ${trail.join(' → ') || '-'}</div>
  `;
}

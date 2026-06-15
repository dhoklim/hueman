// 웹캠 프레임 캡처 → 게임 시작 전 타깃 얼굴 1장 + 표정 스냅샷 타일들 보관. (System C)
// 타일은 캡처 시점의 감정 색 필터를 입혀 저장한다.
import { hexFor } from './emotionColor.js';

const TARGET_SIZE = 480; // 타깃(얼굴) 해상도
const TILE_SAMPLE = 72;  // 타일 캡처 크기
const MAX_TILES = 240;   // 촘촘한 격자(88×88)에 맞춰 사진 다양성 확보
const MIN_TILES = 6;

let target = null;
let tiles = [];

// video 중앙 정사각 영역을 size×size 캔버스로 캡처(미리보기와 같게 좌우 반전)
function captureSquare(video, size) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return c;
}

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(resolve);
    else setTimeout(resolve, 16);
  });
}

export function captureTargetFrom(video) {
  if (target) return true;
  const c = captureSquare(video, TARGET_SIZE);
  if (!c) return false;
  target = c;
  return true;
}

// 비저장: 지금 프레임을 타깃 해상도 거울 정사각 캔버스로 즉시 캡처해 반환.
// (확인/다시찍기 흐름 — 확정 전까지 target 에 넣지 않는다. 프레임이 없으면 빈 캔버스.)
export function grabTargetCanvas(video) {
  return captureSquare(video, TARGET_SIZE) || blankCanvas(TARGET_SIZE);
}

function blankCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

// 외부(카메라 화면)에서 만든 캔버스를 모자이크 타깃으로 확정
export function setTarget(canvas) {
  if (canvas) target = canvas;
}

export async function captureTargetWhenReady(video, attempts = 24) {
  for (let i = 0; i < attempts; i++) {
    if (captureTargetFrom(video)) return true;
    await nextFrame();
  }
  return false;
}

export const setTargetFrom = captureTargetFrom;

export function addTile(video, emotion) {
  if (tiles.length >= MAX_TILES) return;
  const c = captureSquare(video, TILE_SAMPLE);
  if (!c) return;
  applyColorFilter(c, hexFor(emotion)); // 사진에 감정 색 필터
  tiles.push({ canvas: c, emotion });
}

// 사진의 명암은 살리면서 감정 색을 입히는 필터 (soft-light + 약한 틴트)
function applyColorFilter(canvas, hex) {
  const ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
}

export function getTarget() { return target; }
export function getTiles() { return tiles; }
export function hasEnough() { return !!target && tiles.length >= MIN_TILES; }
export function reset() { target = null; tiles = []; }

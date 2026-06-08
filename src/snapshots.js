// 웹캠 프레임 캡처 → 타깃 얼굴 1장 + 표정 스냅샷 타일들 보관. (System C)
// 타일은 캡처 시점의 감정 색 필터를 입혀 저장한다 (System B의 화면 색을 사진에도 반영).
import { hexFor } from './emotionColor.js';

const TARGET_SIZE = 480; // 타깃(얼굴) 해상도
const TILE_SAMPLE = 72;  // 타일 캡처 크기
const MAX_TILES = 64;
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

export function setTargetFrom(video) {
  if (target) return;
  const c = captureSquare(video, TARGET_SIZE);
  if (c) target = c;
}

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

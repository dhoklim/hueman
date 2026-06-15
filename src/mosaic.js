// 포토 모자이크 합성. (System C)

// 모자이크 격자: 한 변 GRID칸 × 칸당 CELL_PX 픽셀.
// 88×88=7744칸(이전 44×44의 4배로 더 촘촘 → 얼굴이 또렷)이고,
// 칸 16px로 출력은 88×16=1408×1408 유지. 리빌(mosaicReveal)도 CELL_PX로 칸 경계를 맞춘다.
export const GRID = 88;
export const CELL_PX = 16;

// 표준 휘도 (0..255)
export function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// 칸 인덱스 → 타일 인덱스 (순환). 타일이 없으면 -1.
export function pickTile(cellIndex, tileCount) {
  if (tileCount <= 0) return -1;
  return cellIndex % tileCount;
}

export function colorDistance(a, b) {
  return ((a.r - b.r) ** 2) + ((a.g - b.g) ** 2) + ((a.b - b.b) ** 2);
}

export function averageColor(canvas) {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

export function pickClosestTile(targetColor, tiles, cellIndex = 0) {
  if (!tiles.length) return -1;
  let best = pickTile(cellIndex, tiles.length);
  let bestScore = Infinity;

  tiles.forEach((tile, i) => {
    if (!tile.avgColor) return;
    const score = colorDistance(targetColor, tile.avgColor);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });

  return best;
}

// target(캔버스) + tiles([{canvas, emotion}]) → 모자이크 캔버스
export function buildMosaic(target, tiles, opts = {}) {
  const cols = opts.cols || GRID;
  const rows = opts.rows || GRID;
  const cellPx = opts.cellPx || CELL_PX;

  const out = document.createElement('canvas');
  out.width = cols * cellPx;
  out.height = rows * cellPx;
  const ctx = out.getContext('2d');

  // 타깃을 그리드 해상도로 줄여 칸별 평균색 샘플
  const sample = document.createElement('canvas');
  sample.width = cols;
  sample.height = rows;
  const sctx = sample.getContext('2d');
  sctx.drawImage(target, 0, 0, cols, rows);
  const data = sctx.getImageData(0, 0, cols, rows).data;
  const preparedTiles = tiles.map((tile) => ({
    ...tile,
    avgColor: tile.avgColor || averageColor(tile.canvas),
  }));

  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = (y * cols + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const dx = x * cellPx;
      const dy = y * cellPx;
      const targetColor = { r, g, b };

      const ti = pickClosestTile(targetColor, preparedTiles, i);
      const tile = ti >= 0 ? preparedTiles[ti] : null;

      if (tile) {
        // ① 타일 (이미 감정 색 필터가 입혀진 사진)
        ctx.drawImage(tile.canvas, dx, dy, cellPx, cellPx);
      } else {
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(dx, dy, cellPx, cellPx);
      }

      // ② 타깃 칸 색을 반투명으로 덮어 밝기/색 매칭 → 멀리서 얼굴로 읽힘
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(dx, dy, cellPx, cellPx);
      ctx.globalAlpha = 1;
      i++;
    }
  }
  return out;
}

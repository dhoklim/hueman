// 모자이크 타임랩스 리빌 — 완성된 모자이크를 빈 캔버스에 타일 단위로 차오르게 그린다.
// "내가 느낀 감정들이 모여 내 얼굴이 된다"를 시각 그 자체로 보여주는 연출.

// 칸이 흩어져 나타나도록 결정적(LCG) 셔플 순열을 만든다.
export function revealOrder(count, seed = 7) {
  const order = Array.from({ length: count }, (_, i) => i);
  let s = (seed >>> 0) || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// 전체 칸 수를 프레임별 그릴 개수로 균등 분할 (합 = total).
export function revealBatches(total, frames) {
  const n = Math.max(1, frames);
  const base = Math.floor(total / n);
  const extra = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

// 완성 모자이크(full) → { canvas(점점 채워짐), play(onDone), stop }.
// 저장/결과 카드는 항상 full 캔버스를 쓰므로 애니메이션 도중에도 완성본이 보장된다.
export function createReveal(full, opts = {}) {
  const cellPx = opts.cellPx || 16;
  const durationMs = opts.durationMs || 2800;
  const fps = opts.fps || 30;

  const canvas = document.createElement('canvas');
  canvas.width = full.width;
  canvas.height = full.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0e0e14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = Math.ceil(full.width / cellPx);
  const rows = Math.ceil(full.height / cellPx);
  const order = revealOrder(cols * rows);
  const batches = revealBatches(order.length, Math.max(1, Math.round(durationMs / (1000 / fps))));

  let timer = null;
  let cursor = 0;
  let frame = 0;

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function play(onDone) {
    stop();
    timer = setInterval(() => {
      for (let k = 0; k < batches[frame]; k++) {
        const cell = order[cursor++];
        const x = (cell % cols) * cellPx;
        const y = Math.floor(cell / cols) * cellPx;
        ctx.drawImage(full, x, y, cellPx, cellPx, x, y, cellPx, cellPx);
      }
      frame++;
      if (frame >= batches.length) {
        stop();
        ctx.drawImage(full, 0, 0); // 잔여 가장자리까지 완성본으로 마감
        if (onDone) onDone();
      }
    }, 1000 / fps);
  }

  return { canvas, play, stop };
}

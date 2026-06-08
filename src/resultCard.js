import { CATEGORY_LABELS } from './comfortMessages.js';

export function resultFilename(result) {
  const suffix = result.isComposite ? 'composite' : (result.topCategory || 'numb');
  return `hueman-result-${suffix}.png`;
}

export function resultSummaryLines(result) {
  const label = result.isComposite
    ? CATEGORY_LABELS.composite
    : (CATEGORY_LABELS[result.topCategory] || '감정');
  return [
    'hueman',
    `당신의 인생을 가장 많이 채운 감정: ${label}`,
    result.message,
  ];
}

export function createResultCardCanvas(result, mosaicCanvas) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  const lines = resultSummaryLines(result);

  ctx.fillStyle = '#111118';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '700 72px system-ui, sans-serif';
  ctx.fillText(lines[0], canvas.width / 2, 110);

  if (mosaicCanvas) {
    ctx.drawImage(mosaicCanvas, 160, 170, 640, 640);
  }

  ctx.font = '600 32px system-ui, sans-serif';
  wrapText(ctx, lines[1], canvas.width / 2, 900, 760, 46);
  ctx.font = '400 30px system-ui, sans-serif';
  wrapText(ctx, lines[2], canvas.width / 2, 1010, 760, 48);

  ctx.font = '400 22px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.fillText('불필요한 감정은 없었다. 그 모든 감정이, 너였다.', canvas.width / 2, 1220);
  return canvas;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

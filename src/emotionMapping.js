// face-api 표정 → hueman 감정 키 매핑 (순수 함수, 라이브러리 의존 없음 → 테스트 가능)
export const EXPRESSION_MAP = {
  happy: 'joy',
  sad: 'sad',
  angry: 'anger',
  disgusted: 'anger',
  fearful: 'anxiety',
  surprised: 'surprise',
  neutral: 'numb',
};

export const MIN_CONFIDENCE = 0.15;
// neutral이 1위여도 다른 감정이 이 값 이상이면 그쪽을 선택
const NEUTRAL_OVERRIDE = 0.15;

// expressions: { happy: 0.9, sad: 0.01, ... } → hueman 감정 키.
// 최고 확률이 임계치 미만이면 null(불확실 → 직전 값 유지).
// neutral이 1위여도 다른 감정이 NEUTRAL_OVERRIDE 이상이면 그쪽 우선.
export function expressionToEmotion(expressions, minConfidence = MIN_CONFIDENCE) {
  if (!expressions) return null;
  let top = null, topVal = -1;
  let bestOther = null, bestOtherVal = -1;
  for (const [expr, val] of Object.entries(expressions)) {
    if (val > topVal) { topVal = val; top = expr; }
    if (expr !== 'neutral' && val > bestOtherVal) { bestOtherVal = val; bestOther = expr; }
  }
  if (top == null || topVal < minConfidence) return null;
  if (top === 'neutral' && bestOther && bestOtherVal >= NEUTRAL_OVERRIDE) {
    return EXPRESSION_MAP[bestOther] || 'numb';
  }
  return EXPRESSION_MAP[top] || 'numb';
}

// 최근 감정 history(배열, null 포함 가능) → 평활화. 깜빡임 방지.
// numb은 60% 이상일 때만 승리 — 나머지 상황에서는 다른 감정 우선.
export function smooth(history) {
  const counts = {};
  let total = 0;
  for (const e of history) {
    if (!e) continue;
    counts[e] = (counts[e] || 0) + 1;
    total++;
  }
  if (total === 0) return null;

  // numb 비율이 60% 미만이면 numb 제외하고 가장 많은 감정 선택
  const numbRatio = (counts['numb'] || 0) / total;
  if (numbRatio < 0.6) {
    let best = null, bestN = 0;
    for (const [e, n] of Object.entries(counts)) {
      if (e !== 'numb' && n > bestN) { bestN = n; best = e; }
    }
    if (best) return best;
  }

  // numb 압도적 or 다른 감정 없음 → 전체 다수결
  let best = null, bestN = 0;
  for (const [e, n] of Object.entries(counts)) {
    if (n > bestN) { bestN = n; best = e; }
  }
  return best;
}

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

export const MIN_CONFIDENCE = 0.35;

// expressions: { happy: 0.9, sad: 0.01, ... } → hueman 감정 키.
// 최고 확률이 임계치 미만이면 null(불확실 → 직전 값 유지).
export function expressionToEmotion(expressions, minConfidence = MIN_CONFIDENCE) {
  if (!expressions) return null;
  let top = null;
  let topVal = -1;
  for (const [expr, val] of Object.entries(expressions)) {
    if (val > topVal) { topVal = val; top = expr; }
  }
  if (top == null || topVal < minConfidence) return null;
  return EXPRESSION_MAP[top] || 'numb';
}

// 최근 감정 history(배열, null 포함 가능) → 다수결 평활화. 깜빡임 방지.
// 전부 null 이면 null 반환.
export function smooth(history) {
  const counts = {};
  let best = null;
  let bestN = 0;
  for (const e of history) {
    if (!e) continue;
    counts[e] = (counts[e] || 0) + 1;
    if (counts[e] > bestN) { bestN = counts[e]; best = e; }
  }
  return best;
}

// 감정 키 → 색/카테고리. hueman 제안서 4장 표.
// aggregate=false 인 감정(놀람)은 위로 메시지 집계에서 제외한다.
// 결과 집계/타임라인/모자이크 색 분류에 사용한다. 화면 영상은 원본 색으로 둔다.
export const EMOTIONS = {
  joy:      { label: '기쁨',   hex: '#FFD23F', category: 'joy',      aggregate: true },
  sad:      { label: '슬픔',   hex: '#3B7DD8', category: 'sad',      aggregate: true },
  anger:    { label: '분노',   hex: '#E03131', category: 'anger',    aggregate: true },
  numb:     { label: '무감각', hex: '#1A1A1A', category: 'numb',     aggregate: true },
  anxiety:  { label: '불안',   hex: '#FF8C2B', category: 'anxiety',  aggregate: true },
  surprise: { label: '놀람',   hex: '#2FB873', category: 'surprise', aggregate: false },
};

export function hexFor(emotion) {
  return (EMOTIONS[emotion] || EMOTIONS.numb).hex;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `rgb(${r}, ${g}, ${b})`;
}

export function gradientFor(emotion) {
  const hex = hexFor(emotion);
  return `radial-gradient(circle at 50% 40%, ${hex} 0%, ${shade(hex, -70)} 60%, ${shade(hex, -120)} 100%)`;
}

// 실시간 화면 틴트(#tint)용 background 문자열.
// 감정 1개 → 단일 색, 2개 → 두 색을 섞은 linear-gradient, 없음 → null.
// 색 자체는 진하게 두고, 은은함은 #tint 의 opacity 로 조절한다(ui.setTint).
export function tintBackground(emotions) {
  const list = (Array.isArray(emotions) ? emotions : [emotions]).filter(Boolean);
  if (list.length === 0) return null;
  if (list.length === 1) return hexFor(list[0]);
  const [a, b] = list;
  return `linear-gradient(135deg, ${hexFor(a)} 0%, ${hexFor(b)} 100%)`;
}

// 비슷하게 감지된 정도 — 2위 빈도가 1위의 이 비율 이상이면 두 감정을 섞는다.
const TINT_BLEND_RATIO = 0.6;

// 최근 감정 표본(배열, falsy 포함 가능) → 화면 틴트용 감정 1~2개.
// 상위 2개가 비슷하게 감지되면 둘 다, 아니면 1위만, 표본이 없으면 [].
// experienceLog.aggregate()의 복합 로직은 결과 메시지용이므로, 실시간 화면용은 이 helper를 쓴다.
export function tintEmotionsFromHistory(history, ratio = TINT_BLEND_RATIO) {
  const counts = {};
  for (const e of history || []) {
    if (!e) continue;
    counts[e] = (counts[e] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return [];
  const [top, topN] = ranked[0];
  const second = ranked[1];
  if (second && second[1] / topN >= ratio) return [top, second[0]];
  return [top];
}

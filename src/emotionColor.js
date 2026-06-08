// 감정 키 → 색/카테고리. hueman 제안서 4장 표.
// aggregate=false 인 감정(놀람)은 위로 메시지 집계에서 제외한다.
// System B 는 나중에 실시간 웹캠 감정으로 이 색을 덮어쓴다.
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

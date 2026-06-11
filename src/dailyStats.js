// 오늘 하루의 익명 체험 통계 — 결과 화면의 "오늘 이 부스를 지나간 N번의 인생" 한 줄.
// 이미지/개인정보 없이 카테고리 카운트만 저장한다.
const DEFAULT_KEY = 'huemanDailyStats';

function localToday() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function createDailyStats(storage, opts = {}) {
  const key = opts.key || DEFAULT_KEY;
  const today = opts.today || localToday;

  function load() {
    try {
      const value = JSON.parse(storage.getItem(key));
      if (value && value.date === today() && value.counts) return value;
    } catch {
      // 손상된 저장값은 새 하루로 취급
    }
    return { date: today(), counts: {} };
  }

  function record(category) {
    const state = load();
    state.counts[category] = (state.counts[category] || 0) + 1;
    storage.setItem(key, JSON.stringify(state));
    return summary(category);
  }

  function summary(category) {
    const { counts } = load();
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return { total, same: counts[category] || 0 };
  }

  return { record, summary };
}

export function statsLine({ total, same }, label) {
  if (total <= 1) return '당신은 오늘 이 부스를 지나간 첫 번째 인생입니다.';
  return `오늘 이 부스를 지나간 ${total}번의 인생 중, 당신처럼 '${label}'의 색이 짙었던 인생은 ${same}번이었습니다.`;
}

export function browserDailyStats() {
  if (typeof localStorage === 'undefined') return null;
  return createDailyStats(localStorage);
}

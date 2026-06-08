// 선택의 effects 를 flags 에 누적 적용하고, 누적 상태로 다음 씬을 고른다.
// next 는 문자열(직선) 또는 { variants: [{ when, to }, ..., { default: true, to }] }.
export function applyEffects(flags, effects = {}) {
  const next = { ...flags };
  for (const [k, v] of Object.entries(effects)) {
    if (typeof v === 'number') next[k] = (next[k] || 0) + v;
    else next[k] = v;
  }
  return next;
}

function matchOne(flagValue, cond) {
  if (typeof cond === 'boolean') return Boolean(flagValue) === cond;
  if (typeof cond === 'number') return (flagValue || 0) === cond;
  const m = String(cond).match(/^(>=|<=|>|<|==)?\s*(-?\d+)$/);
  if (!m) return false;
  const op = m[1] || '==';
  const n = Number(m[2]);
  const fv = flagValue || 0;
  switch (op) {
    case '>=': return fv >= n;
    case '<=': return fv <= n;
    case '>':  return fv > n;
    case '<':  return fv < n;
    default:   return fv === n;
  }
}

export function matchesCondition(flags, when = {}) {
  return Object.entries(when).every(([k, c]) => matchOne(flags[k], c));
}

export function resolveNext(next, flags) {
  if (typeof next === 'string') return next;
  if (next && Array.isArray(next.variants)) {
    const fallback = next.variants.find((v) => v.default);
    for (const v of next.variants) {
      if (!v.default && matchesCondition(flags, v.when)) return v.to;
    }
    return fallback ? fallback.to : null;
  }
  return null;
}

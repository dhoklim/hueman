import { describe, it, expect } from 'vitest';
import { applyEffects, matchesCondition, resolveNext } from '../src/resolver.js';

describe('applyEffects', () => {
  it('adds numbers and sets booleans without mutating input', () => {
    const flags = { deviation: 1 };
    const next = applyEffects(flags, { deviation: 1, dating: true });
    expect(next).toEqual({ deviation: 2, dating: true });
    expect(flags).toEqual({ deviation: 1 });
  });
});

describe('matchesCondition', () => {
  it('supports numeric operators', () => {
    expect(matchesCondition({ deviation: 2 }, { deviation: '>=2' })).toBe(true);
    expect(matchesCondition({ deviation: 1 }, { deviation: '>=2' })).toBe(false);
  });
  it('supports booleans and requires all keys', () => {
    expect(matchesCondition({ dating: true, warmth: 2 }, { dating: true, warmth: '>=1' })).toBe(true);
    expect(matchesCondition({ dating: false }, { dating: true })).toBe(false);
  });
});

describe('resolveNext', () => {
  it('returns a string next as-is', () => {
    expect(resolveNext('youth_daily', {})).toBe('youth_daily');
  });
  it('picks the first matching variant, else default', () => {
    const next = { variants: [
      { when: { warmth: '>=2' }, to: 'ending_warm' },
      { default: true, to: 'ending_lonely' },
    ]};
    expect(resolveNext(next, { warmth: 3 })).toBe('ending_warm');
    expect(resolveNext(next, { warmth: 0 })).toBe('ending_lonely');
  });
  it('routes to bad_ending when deviation crosses threshold', () => {
    const next = { variants: [
      { when: { deviation: '>=2' }, to: 'bad_ending' },
      { default: true, to: 'adolescence_rejoin' },
    ]};
    expect(resolveNext(next, { deviation: 2 })).toBe('bad_ending');
    expect(resolveNext(next, { deviation: 1 })).toBe('adolescence_rejoin');
  });
});

import { describe, it, expect } from 'vitest';
import { createDailyStats, statsLine } from '../src/dailyStats.js';

function memoryStorage(seed = {}) {
  const state = { ...seed };
  return {
    getItem: (key) => state[key] || null,
    setItem: (key, value) => { state[key] = value; },
    removeItem: (key) => { delete state[key]; },
  };
}

describe('daily stats store', () => {
  it('counts finished lives per category for today', () => {
    const store = createDailyStats(memoryStorage(), { today: () => '2026-06-11' });

    store.record('joy');
    store.record('joy');
    store.record('sad');

    expect(store.summary('joy')).toEqual({ total: 3, same: 2 });
    expect(store.summary('sad')).toEqual({ total: 3, same: 1 });
    expect(store.summary('anger')).toEqual({ total: 3, same: 0 });
  });

  it('starts fresh when the stored date is not today', () => {
    const storage = memoryStorage();
    const yesterday = createDailyStats(storage, { today: () => '2026-06-10' });
    yesterday.record('numb');
    yesterday.record('numb');

    const todayStore = createDailyStats(storage, { today: () => '2026-06-11' });
    expect(todayStore.summary('numb')).toEqual({ total: 0, same: 0 });
    todayStore.record('joy');
    expect(todayStore.summary('joy')).toEqual({ total: 1, same: 1 });
  });

  it('recovers from invalid stored JSON', () => {
    const store = createDailyStats(memoryStorage({ huemanDailyStats: 'not json' }), {
      today: () => '2026-06-11',
    });
    expect(store.summary('joy')).toEqual({ total: 0, same: 0 });
  });
});

describe('statsLine', () => {
  it('greets the first life of the day', () => {
    expect(statsLine({ total: 1, same: 1 }, '기쁨')).toBe(
      '당신은 오늘 이 부스를 지나간 첫 번째 인생입니다.'
    );
  });

  it('relates this life to the other lives of the day', () => {
    expect(statsLine({ total: 23, same: 9 }, '기쁨')).toBe(
      "오늘 이 부스를 지나간 23번의 인생 중, 당신처럼 '기쁨'의 색이 짙었던 인생은 9번이었습니다."
    );
  });
});

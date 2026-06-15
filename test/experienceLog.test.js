import { describe, it, expect } from 'vitest';
import { createLog, record, aggregate, emotionTimeline, emotionRuns } from '../src/experienceLog.js';

function seed(events) {
  const log = createLog();
  for (const e of events) record(log, e);
  return log;
}

describe('experienceLog', () => {
  it('records events in order', () => {
    const log = seed([{ emotion: 'joy', durationMs: 100 }]);
    expect(log.events).toHaveLength(1);
  });

  it('picks the dominant category by total duration', () => {
    const log = seed([
      { emotion: 'joy', durationMs: 5000 },
      { emotion: 'sad', durationMs: 1000 },
    ]);
    const r = aggregate(log);
    expect(r.topCategory).toBe('joy');
    expect(r.isComposite).toBe(false);
    expect(r.message).toContain('행복할 자격');
  });

  it('excludes surprise from aggregation', () => {
    const log = seed([
      { emotion: 'surprise', durationMs: 9000 },
      { emotion: 'sad', durationMs: 1000 },
    ]);
    expect(aggregate(log).topCategory).toBe('sad');
  });

  it('returns composite when top two are close', () => {
    const log = seed([
      { emotion: 'joy', durationMs: 1000 },
      { emotion: 'sad', durationMs: 950 },
    ]);
    const r = aggregate(log);
    expect(r.isComposite).toBe(true);
    expect(r.message).toContain('뒤섞인 마음');
  });

  it('defaults to numb when nothing aggregable', () => {
    const log = seed([{ emotion: 'surprise', durationMs: 500 }]);
    expect(aggregate(log).topCategory).toBe('numb');
  });

  it('builds a display timeline from aggregable emotion events', () => {
    const log = seed([
      { sceneId: 'opening', emotion: 'joy', durationMs: 1000, timestamp: 1 },
      { sceneId: 'shock', emotion: 'surprise', durationMs: 2000, timestamp: 2 },
      { sceneId: 'elder', emotion: 'sad', durationMs: 3000, timestamp: 3 },
    ]);

    expect(emotionTimeline(log)).toEqual([
      { sceneId: 'opening', emotion: 'joy', category: 'joy', durationMs: 1000, percent: 25 },
      { sceneId: 'elder', emotion: 'sad', category: 'sad', durationMs: 3000, percent: 75 },
    ]);
  });

  it('emotionRuns keeps the chronological order (not sorted by duration)', () => {
    const log = seed([
      { emotion: 'sad', durationMs: 1000, timestamp: 1 },
      { emotion: 'joy', durationMs: 5000, timestamp: 2 },
      { emotion: 'anger', durationMs: 1000, timestamp: 3 },
    ]);
    // 가장 오래 느낀 joy가 앞으로 오는 정렬이 아니라, 느낀 순서 그대로(sad → joy → anger)
    expect(emotionRuns(log).map((r) => r.category)).toEqual(['sad', 'joy', 'anger']);
  });

  it('emotionRuns merges consecutive same-emotion ticks into one run with summed duration', () => {
    const log = seed([
      { emotion: 'joy', durationMs: 300, timestamp: 1 },
      { emotion: 'joy', durationMs: 300, timestamp: 2 },
      { emotion: 'sad', durationMs: 300, timestamp: 3 },
      { emotion: 'joy', durationMs: 300, timestamp: 4 },
    ]);
    const runs = emotionRuns(log);
    expect(runs.map((r) => r.category)).toEqual(['joy', 'sad', 'joy']);
    expect(runs[0].durationMs).toBe(600); // 연속된 joy 두 틱 병합
    expect(runs[2].durationMs).toBe(300); // 나중에 다시 나온 joy는 별도 구간
  });

  it('emotionRuns ignores non-aggregable emotions and returns [] when empty', () => {
    expect(emotionRuns(seed([{ emotion: 'surprise', durationMs: 500 }]))).toEqual([]);
    expect(emotionRuns(createLog())).toEqual([]);
  });
});

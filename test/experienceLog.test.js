import { describe, it, expect } from 'vitest';
import { createLog, record, aggregate, emotionTimeline } from '../src/experienceLog.js';

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
});

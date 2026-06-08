import { describe, it, expect } from 'vitest';
import { createEngine, current, choose, advance, isEnding } from '../src/engine.js';

const story = {
  start: 's0',
  scenes: {
    s0: { id: 's0', type: 'scene', text: '시작', emotion: 'joy', next: 's1' },
    s1: { id: 's1', type: 'choice', text: '고른다', emotion: 'anxiety', choices: [
      { label: '왼쪽', effects: { deviation: 2 }, next: { variants: [
        { when: { deviation: '>=2' }, to: 'bad' },
        { default: true, to: 'good' },
      ]}},
      { label: '오른쪽', effects: {}, next: 'good' },
    ]},
    good: { id: 'good', type: 'scene', text: '좋음', emotion: 'joy', next: 'fin' },
    bad:  { id: 'bad', type: 'scene', text: '나쁨', emotion: 'numb', next: 'fin' },
    fin:  { id: 'fin', type: 'ending', text: '끝', emotion: 'sad' },
  },
};

describe('engine', () => {
  it('starts at story.start', () => {
    const e = createEngine(story);
    expect(current(e).id).toBe('s0');
  });
  it('advance follows a scene next', () => {
    const e = createEngine(story);
    advance(e);
    expect(current(e).id).toBe('s1');
  });
  it('choose applies effects then routes by accumulated flags', () => {
    const e = createEngine(story);
    advance(e);            // s1
    choose(e, 0);          // deviation +2 -> bad
    expect(e.flags.deviation).toBe(2);
    expect(current(e).id).toBe('bad');
  });
  it('choose without effects routes to default target', () => {
    const e = createEngine(story);
    advance(e);
    choose(e, 1);
    expect(current(e).id).toBe('good');
  });
  it('isEnding detects ending scenes', () => {
    expect(isEnding({ type: 'ending' })).toBe(true);
    expect(isEnding({ type: 'scene' })).toBe(false);
  });
});

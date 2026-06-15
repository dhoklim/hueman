import { describe, it, expect } from 'vitest';
import {
  EMOTIONS,
  hexFor,
  gradientFor,
  tintBackground,
  tintEmotionsFromHistory,
} from '../src/emotionColor.js';

describe('emotionColor', () => {
  it('maps each emotion to the spec hex', () => {
    expect(EMOTIONS.joy.hex).toBe('#FFD23F');
    expect(EMOTIONS.sad.hex).toBe('#3B7DD8');
    expect(EMOTIONS.anger.hex).toBe('#E03131');
    expect(EMOTIONS.numb.hex).toBe('#1A1A1A');
    expect(EMOTIONS.anxiety.hex).toBe('#FF8C2B');
    expect(EMOTIONS.surprise.hex).toBe('#2FB873');
  });

  it('excludes surprise from aggregation', () => {
    expect(EMOTIONS.surprise.aggregate).toBe(false);
    expect(EMOTIONS.joy.aggregate).toBe(true);
  });

  it('hexFor falls back to numb for unknown', () => {
    expect(hexFor('joy')).toBe('#FFD23F');
    expect(hexFor('???')).toBe('#1A1A1A');
  });

  it('gradientFor returns a radial-gradient string containing the hex', () => {
    expect(gradientFor('anxiety')).toContain('#FF8C2B');
    expect(gradientFor('anxiety')).toContain('radial-gradient');
  });
});

describe('tintBackground (실시간 화면 틴트 색)', () => {
  it('returns the single emotion hex for one emotion', () => {
    expect(tintBackground('anger')).toBe('#E03131');
    expect(tintBackground(['joy'])).toBe('#FFD23F');
  });

  it('blends two emotions into a linear-gradient', () => {
    const bg = tintBackground(['joy', 'sad']);
    expect(bg).toContain('linear-gradient');
    expect(bg).toContain('#FFD23F'); // joy
    expect(bg).toContain('#3B7DD8'); // sad
  });

  it('returns null when there is no emotion to show', () => {
    expect(tintBackground(null)).toBeNull();
    expect(tintBackground([])).toBeNull();
    expect(tintBackground([null, undefined])).toBeNull();
  });
});

describe('tintEmotionsFromHistory (상위 1~2개 감정 선택)', () => {
  it('returns a single emotion when one dominates', () => {
    expect(tintEmotionsFromHistory(['joy', 'joy', 'joy', 'sad'])).toEqual(['joy']);
  });

  it('returns two emotions when the top two are detected similarly', () => {
    expect(tintEmotionsFromHistory(['joy', 'sad', 'joy', 'sad'])).toEqual(['joy', 'sad']);
  });

  it('ignores empty samples and returns [] when nothing was detected', () => {
    expect(tintEmotionsFromHistory([])).toEqual([]);
    expect(tintEmotionsFromHistory([null, undefined])).toEqual([]);
  });
});

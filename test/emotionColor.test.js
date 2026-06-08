import { describe, it, expect } from 'vitest';
import { EMOTIONS, hexFor, gradientFor } from '../src/emotionColor.js';

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

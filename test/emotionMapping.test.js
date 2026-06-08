import { describe, it, expect } from 'vitest';
import { expressionToEmotion, smooth } from '../src/emotionMapping.js';

describe('expressionToEmotion', () => {
  it('maps the argmax expression to a hueman emotion', () => {
    expect(expressionToEmotion({ happy: 0.9, neutral: 0.1 })).toBe('joy');
    expect(expressionToEmotion({ angry: 0.6, sad: 0.2 })).toBe('anger');
    expect(expressionToEmotion({ fearful: 0.7 })).toBe('anxiety');
    expect(expressionToEmotion({ neutral: 0.95 })).toBe('numb');
  });

  it('maps disgusted to anger', () => {
    expect(expressionToEmotion({ disgusted: 0.8, neutral: 0.2 })).toBe('anger');
  });

  it('returns null when below the confidence threshold', () => {
    expect(expressionToEmotion({ happy: 0.2, sad: 0.2, neutral: 0.2 })).toBe(null);
  });

  it('returns null for missing input', () => {
    expect(expressionToEmotion(null)).toBe(null);
  });
});

describe('smooth', () => {
  it('returns the majority emotion', () => {
    expect(smooth(['joy', 'joy', 'sad', 'joy'])).toBe('joy');
  });
  it('ignores nulls', () => {
    expect(smooth([null, 'anger', null, 'anger'])).toBe('anger');
  });
  it('returns null when history is empty or all null', () => {
    expect(smooth([])).toBe(null);
    expect(smooth([null, null])).toBe(null);
  });
});

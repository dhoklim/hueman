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
    // 최고 확률이 MIN_CONFIDENCE(0.15) 미만이면 불확실 → null
    expect(expressionToEmotion({ happy: 0.1, sad: 0.05, neutral: 0.1 })).toBe(null);
  });

  it('accepts a top expression at or above the threshold', () => {
    // 임계치(0.15)를 0.35→0.15로 낮춘 뒤의 기대 동작 — 0.2면 감정으로 인정
    expect(expressionToEmotion({ happy: 0.2, sad: 0.1, neutral: 0.15 })).toBe('joy');
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

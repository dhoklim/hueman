import { describe, it, expect } from 'vitest';
import {
  expressionToEmotion,
  smooth,
  computeBaseline,
  applyBaseline,
} from '../src/emotionMapping.js';

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

describe('computeBaseline', () => {
  it('averages the expression vectors', () => {
    const baseline = computeBaseline([
      { neutral: 0.6, sad: 0.4 },
      { neutral: 0.4, sad: 0.6 },
      { neutral: 0.5, sad: 0.5 },
    ]);
    expect(baseline.neutral).toBeCloseTo(0.5);
    expect(baseline.sad).toBeCloseTo(0.5);
  });

  it('treats missing expression keys as 0 in the average', () => {
    const baseline = computeBaseline([
      { neutral: 0.6, sad: 0.4 },
      { neutral: 1.0 }, // sad absent → counts as 0
      { neutral: 0.8, sad: 0.2 },
    ]);
    expect(baseline.sad).toBeCloseTo(0.2); // (0.4 + 0 + 0.2) / 3
  });

  it('ignores null / non-object samples', () => {
    const baseline = computeBaseline([
      { neutral: 0.5, sad: 0.5 },
      null,
      undefined,
      { neutral: 0.5, sad: 0.5 },
      { neutral: 0.5, sad: 0.5 },
    ]);
    expect(baseline.neutral).toBeCloseTo(0.5);
    expect(baseline.sad).toBeCloseTo(0.5);
  });

  it('returns null when there are fewer than the minimum valid samples', () => {
    expect(computeBaseline([{ neutral: 1 }, { neutral: 1 }])).toBe(null);
    expect(computeBaseline([])).toBe(null);
    expect(computeBaseline([null, null, null])).toBe(null);
  });
});

describe('applyBaseline', () => {
  it('passes expressions through unchanged when baseline is null', () => {
    const expr = { happy: 0.9, neutral: 0.1 };
    expect(applyBaseline(expr, null)).toEqual(expr);
  });

  it('returns null/undefined input unchanged', () => {
    expect(applyBaseline(null, { sad: 0.4 })).toBe(null);
  });

  it('subtracts the baseline, clamps at 0, and renormalizes to sum 1', () => {
    const adjusted = applyBaseline(
      { happy: 0.6, sad: 0.4 },
      { happy: 0.1, sad: 0.4 },
    );
    // happy: 0.6-0.1=0.5, sad: 0.4-0.4=0 → renormalized happy=1
    expect(adjusted.happy).toBeCloseTo(1);
    expect(adjusted.sad).toBeCloseTo(0);
    const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  it('returns neutral=1 when nothing rises above the baseline', () => {
    const adjusted = applyBaseline(
      { neutral: 0.6, sad: 0.4 },
      { neutral: 0.6, sad: 0.4 },
    );
    expect(adjusted.neutral).toBeCloseTo(1);
    expect(expressionToEmotion(adjusted)).toBe('numb');
  });

  it('a resting face that leaks sad reads numb after calibration', () => {
    const restingFace = { neutral: 0.55, sad: 0.45 };
    // 보정 전: sad 가 임계치 이상이라 슬픔으로 읽힘
    expect(expressionToEmotion(restingFace)).toBe('sad');
    // 그 사람의 무표정 기준값으로 보정하면 변화분이 없어 numb
    const baseline = computeBaseline([restingFace, restingFace, restingFace]);
    expect(expressionToEmotion(applyBaseline(restingFace, baseline))).toBe('numb');
  });

  it('still detects a genuine smile after calibration', () => {
    const baseline = computeBaseline([
      { neutral: 0.55, sad: 0.45 },
      { neutral: 0.55, sad: 0.45 },
      { neutral: 0.55, sad: 0.45 },
    ]);
    const smile = { happy: 0.8, neutral: 0.15, sad: 0.05 };
    expect(expressionToEmotion(applyBaseline(smile, baseline))).toBe('joy');
  });
});

import { describe, it, expect } from 'vitest';
import { resultFilename, resultSummaryLines } from '../src/resultCard.js';

describe('resultCard helpers', () => {
  it('creates a stable filename from the dominant emotion', () => {
    expect(resultFilename({ topCategory: 'joy' })).toBe('hueman-result-joy.png');
    expect(resultFilename({ topCategory: 'sad', isComposite: true })).toBe('hueman-result-composite.png');
  });

  it('builds concise result summary lines', () => {
    expect(resultSummaryLines({
      topCategory: 'anxiety',
      isComposite: false,
      message: '두려워하면서도 계속 나아갔다.',
    })).toEqual([
      'hueman',
      '당신의 인생을 가장 많이 채운 감정: 불안',
      '두려워하면서도 계속 나아갔다.',
    ]);
  });
});

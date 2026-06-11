import { describe, it, expect } from 'vitest';
import { resultFilename, resultSummaryLines, receiptLine } from '../src/resultCard.js';

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

  it('joins path receipts into one life-summary line', () => {
    expect(receiptLine(['돌상에서 붓을 잡았다', '넘어졌지만, 다시 일어났다'])).toBe(
      '돌상에서 붓을 잡았다 · 넘어졌지만, 다시 일어났다'
    );
  });

  it('returns an empty receipt line when there are no receipts', () => {
    expect(receiptLine([])).toBe('');
    expect(receiptLine(undefined)).toBe('');
  });
});

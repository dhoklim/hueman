import { describe, it, expect } from 'vitest';
import { messageFor, CATEGORY_LABELS } from '../src/comfortMessages.js';

describe('comfortMessages', () => {
  it('returns the joy message for joy', () => {
    expect(messageFor('joy')).toContain('행복할 자격');
  });
  it('returns the composite message for composite', () => {
    expect(messageFor('composite')).toContain('뒤섞인 마음');
  });
  it('falls back to composite for unknown category', () => {
    expect(messageFor('???')).toBe(messageFor('composite'));
  });
  it('has Korean labels for every category', () => {
    expect(CATEGORY_LABELS.numb).toBe('무감각');
    expect(CATEGORY_LABELS.composite).toBe('복합 감정');
  });
});

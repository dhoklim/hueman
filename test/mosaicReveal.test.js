import { describe, it, expect } from 'vitest';
import { revealOrder, revealBatches } from '../src/mosaicReveal.js';

describe('revealOrder', () => {
  it('returns a permutation of every cell index', () => {
    const order = revealOrder(100);
    expect(order).toHaveLength(100);
    expect([...order].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 100 }, (_, i) => i)
    );
  });

  it('scatters cells instead of scanning row by row', () => {
    const order = revealOrder(100);
    expect(order).not.toEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it('is deterministic for the same cell count', () => {
    expect(revealOrder(64)).toEqual(revealOrder(64));
  });

  it('handles empty and single-cell grids', () => {
    expect(revealOrder(0)).toEqual([]);
    expect(revealOrder(1)).toEqual([0]);
  });
});

describe('revealBatches', () => {
  it('splits all cells across frames with no remainder', () => {
    const batches = revealBatches(1936, 84);
    expect(batches).toHaveLength(84);
    expect(batches.reduce((s, n) => s + n, 0)).toBe(1936);
  });

  it('keeps frame sizes within one cell of each other', () => {
    const batches = revealBatches(100, 7);
    expect(Math.max(...batches) - Math.min(...batches)).toBeLessThanOrEqual(1);
  });

  it('handles fewer cells than frames', () => {
    const batches = revealBatches(3, 10);
    expect(batches).toHaveLength(10);
    expect(batches.reduce((s, n) => s + n, 0)).toBe(3);
  });
});

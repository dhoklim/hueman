import { describe, it, expect } from 'vitest';
import { colorDistance, luminance, pickClosestTile, pickTile } from '../src/mosaic.js';

describe('luminance', () => {
  it('is 0 for black and ~255 for white', () => {
    expect(luminance(0, 0, 0)).toBe(0);
    expect(Math.round(luminance(255, 255, 255))).toBe(255);
  });
  it('weights green most', () => {
    expect(luminance(0, 255, 0)).toBeGreaterThan(luminance(255, 0, 0));
    expect(luminance(255, 0, 0)).toBeGreaterThan(luminance(0, 0, 255));
  });
});

describe('pickTile', () => {
  it('cycles through tiles by cell index', () => {
    expect(pickTile(0, 3)).toBe(0);
    expect(pickTile(2, 3)).toBe(2);
    expect(pickTile(3, 3)).toBe(0);
    expect(pickTile(4, 3)).toBe(1);
  });
  it('returns -1 when there are no tiles', () => {
    expect(pickTile(0, 0)).toBe(-1);
  });
});

describe('color matching', () => {
  it('calculates squared RGB distance', () => {
    expect(colorDistance({ r: 0, g: 0, b: 0 }, { r: 3, g: 4, b: 0 })).toBe(25);
  });

  it('picks the tile closest to the target color with index fallback for ties', () => {
    const tiles = [
      { avgColor: { r: 240, g: 20, b: 20 } },
      { avgColor: { r: 20, g: 30, b: 230 } },
      { avgColor: { r: 30, g: 220, b: 40 } },
    ];

    expect(pickClosestTile({ r: 25, g: 35, b: 220 }, tiles, 7)).toBe(1);
  });
});

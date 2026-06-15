// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { grabTargetCanvas, setTarget, getTarget, reset } from '../src/snapshots.js';

describe('snapshots target capture', () => {
  beforeEach(() => reset());

  it('grabTargetCanvas returns a 480² canvas without storing it', () => {
    const video = document.createElement('video');
    const c = grabTargetCanvas(video);
    expect(c).toBeInstanceOf(window.HTMLCanvasElement);
    expect(c.width).toBe(480);
    expect(c.height).toBe(480);
    expect(getTarget()).toBeNull();
  });

  it('setTarget commits a canvas as the mosaic target', () => {
    const c = document.createElement('canvas');
    setTarget(c);
    expect(getTarget()).toBe(c);
  });

  it('setTarget ignores null', () => {
    setTarget(null);
    expect(getTarget()).toBeNull();
  });
});

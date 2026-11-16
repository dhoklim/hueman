import { describe, expect, it } from 'vitest';
import { isHandheldDevice } from '../src/device.js';

describe('isHandheldDevice', () => {
  it('treats iPad, iPhone and Android as handheld exhibition devices', () => {
    expect(isHandheldDevice({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' })).toBe(true);
    expect(isHandheldDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(true);
    expect(isHandheldDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X710)' })).toBe(true);
  });

  it('recognises iPadOS Safari that reports a desktop Macintosh user agent', () => {
    expect(isHandheldDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5 })).toBe(true);
  });

  it('treats Mac, Windows and touch-screen Windows laptops as laptops', () => {
    expect(isHandheldDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 0 })).toBe(false);
    expect(isHandheldDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', maxTouchPoints: 10 })).toBe(false);
    expect(isHandheldDevice(null)).toBe(false);
  });
});

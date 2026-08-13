// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKioskMode } from '../src/kioskMode.js';

const activeKiosks = [];

function createHarness() {
  const countdowns = [];
  let resets = 0;
  const kiosk = createKioskMode({
    documentRef: document,
    onCountdown: ({ seconds, onContinue }) => {
      const countdown = { seconds: [seconds], removed: false, onContinue };
      countdowns.push(countdown);
      return {
        setSeconds: (next) => countdown.seconds.push(next),
        remove: () => { countdown.removed = true; },
      };
    },
    onReset: () => { resets += 1; },
  });
  activeKiosks.push(kiosk);
  return { kiosk, countdowns, getResets: () => resets };
}

describe('unattended exhibition timer', () => {
  afterEach(() => {
    activeKiosks.splice(0).forEach((kiosk) => kiosk.destroy());
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('warns after 50 seconds of a session then resets ten seconds later', () => {
    vi.useFakeTimers();
    const { kiosk, countdowns, getResets } = createHarness();
    kiosk.setPhase('session');

    vi.advanceTimersByTime(50_000);
    expect(countdowns).toHaveLength(1);
    expect(countdowns[0].seconds).toEqual([10]);

    vi.advanceTimersByTime(3_000);
    expect(countdowns[0].seconds).toEqual([10, 9, 8, 7]);
    expect(getResets()).toBe(0);

    vi.advanceTimersByTime(7_000);
    expect(countdowns[0].seconds).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(getResets()).toBe(1);
  });

  it('gives a result viewer 110 seconds before showing the reset warning', () => {
    vi.useFakeTimers();
    const { kiosk, countdowns } = createHarness();
    kiosk.setPhase('result');

    vi.advanceTimersByTime(109_999);
    expect(countdowns).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(countdowns).toHaveLength(1);
    expect(countdowns[0].seconds).toEqual([10]);
  });

  it('keeps the attraction screen visible indefinitely without a reset warning', () => {
    vi.useFakeTimers();
    const { kiosk, countdowns, getResets } = createHarness();
    kiosk.setPhase('attract');

    vi.advanceTimersByTime(300_000);

    expect(countdowns).toEqual([]);
    expect(getResets()).toBe(0);
  });

  it.each(['pointerdown', 'touchstart', 'keydown'])('cancels the warning and restores a full session after %s', (type) => {
    vi.useFakeTimers();
    const { kiosk, countdowns, getResets } = createHarness();
    kiosk.setPhase('session');
    vi.advanceTimersByTime(50_000);

    document.dispatchEvent(new Event(type));
    expect(countdowns[0].removed).toBe(true);

    vi.advanceTimersByTime(49_999);
    expect(countdowns).toHaveLength(1);
    expect(getResets()).toBe(0);

    vi.advanceTimersByTime(1);
    expect(countdowns).toHaveLength(2);
    expect(countdowns[1].seconds).toEqual([10]);
  });

  it('removes timers and document activity listeners when destroyed', () => {
    vi.useFakeTimers();
    const { kiosk, countdowns, getResets } = createHarness();
    kiosk.setPhase('session');
    kiosk.destroy();

    vi.advanceTimersByTime(120_000);
    document.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(120_000);

    expect(countdowns).toEqual([]);
    expect(getResets()).toBe(0);
  });
});

export const SESSION_IDLE_MS = 60_000;
export const RESULT_IDLE_MS = 120_000;
export const RESET_COUNTDOWN_SECONDS = 10;

const IDLE_MS_BY_PHASE = {
  session: SESSION_IDLE_MS,
  result: RESULT_IDLE_MS,
};
const ACTIVITY_EVENTS = ['pointerdown', 'touchstart', 'keydown'];

export function createKioskMode({
  onCountdown = () => null,
  onReset = () => {},
  documentRef = typeof document === 'undefined' ? null : document,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
} = {}) {
  let phase = 'attract';
  let idleTimer = null;
  let countdownTimer = null;
  let countdown = null;
  let destroyed = false;
  let resetting = false;

  const onActivity = () => noteActivity();
  ACTIVITY_EVENTS.forEach((type) => documentRef?.addEventListener?.(type, onActivity));

  function clearIdleTimer() {
    if (idleTimer !== null) clearTimeoutImpl(idleTimer);
    idleTimer = null;
  }

  function clearCountdown() {
    if (countdownTimer !== null) clearTimeoutImpl(countdownTimer);
    countdownTimer = null;
    countdown?.remove?.();
    countdown = null;
  }

  function arm() {
    clearIdleTimer();
    clearCountdown();
    const idleMs = IDLE_MS_BY_PHASE[phase];
    if (!idleMs || destroyed || resetting) return;
    idleTimer = setTimeoutImpl(() => {
      idleTimer = null;
      beginCountdown();
    }, idleMs - RESET_COUNTDOWN_SECONDS * 1_000);
  }

  function beginCountdown() {
    if (destroyed || resetting || !IDLE_MS_BY_PHASE[phase]) return;
    const activePhase = phase;
    let seconds = RESET_COUNTDOWN_SECONDS;
    countdown = onCountdown({ seconds, onContinue: noteActivity }) || null;

    const tick = () => {
      if (destroyed || resetting || phase !== activePhase) return;
      seconds -= 1;
      countdown?.setSeconds?.(seconds);
      if (seconds === 0) {
        countdownTimer = null;
        countdown?.remove?.();
        countdown = null;
        resetting = true;
        onReset();
        return;
      }
      countdownTimer = setTimeoutImpl(tick, 1_000);
    };

    countdownTimer = setTimeoutImpl(tick, 1_000);
  }

  function setPhase(nextPhase) {
    phase = IDLE_MS_BY_PHASE[nextPhase] ? nextPhase : 'attract';
    resetting = false;
    arm();
  }

  function noteActivity() {
    if (destroyed || resetting || !IDLE_MS_BY_PHASE[phase]) return;
    arm();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    clearIdleTimer();
    clearCountdown();
    ACTIVITY_EVENTS.forEach((type) => documentRef?.removeEventListener?.(type, onActivity));
  }

  return { setPhase, noteActivity, destroy };
}

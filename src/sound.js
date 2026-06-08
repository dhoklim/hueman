const CUES = {
  joy: { frequency: 440, duration: 0.12 },
  sad: { frequency: 220, duration: 0.18 },
  anger: { frequency: 164, duration: 0.1 },
  numb: { frequency: 98, duration: 0.08 },
  anxiety: { frequency: 330, duration: 0.12 },
  surprise: { frequency: 523, duration: 0.08 },
  default: { frequency: 196, duration: 0.1 },
};

let audioCtx = null;
let enabled = false;

export function cueForEmotion(emotion) {
  return CUES[emotion] || CUES.default;
}

export function enableSound() {
  enabled = true;
}

export function playEmotionCue(emotion) {
  if (!enabled || typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  audioCtx = audioCtx || new AudioContext();
  const cue = cueForEmotion(emotion);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.frequency.value = cue.frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + cue.duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + cue.duration + 0.02);
}

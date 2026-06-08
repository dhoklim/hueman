// 컨트롤러: 일정 간격으로 표정을 감지해 평활화된 감정을 만들고, 콜백으로 흘려보낸다.
// 화면 틴트/로그 기록은 main 이 콜백에서 처리한다(이 모듈은 감지→감정에만 집중).
import { loadModels, startCamera, detectExpressions } from './faceEmotion.js';
import { expressionToEmotion, smooth } from './emotionMapping.js';

const TICK_MS = 700;
const HISTORY = 6;

let timer = null;
let stream = null;
let video = null;
let history = [];
let fallback = 'numb';
let onEmotionCb = null;

export function setFallback(emotion) {
  fallback = emotion || 'numb';
}

// 카메라 권한/모델 로드. 성공 시 감지 루프 시작 → 미리보기용 video 반환.
// 실패(권한 거부·미지원·로드 실패)하면 throw → 호출측이 fallback 처리.
export async function startLiveEmotion({ onEmotion } = {}) {
  onEmotionCb = onEmotion;

  video = document.createElement('video');
  video.id = 'cam-preview';
  video.setAttribute('playsinline', '');
  video.muted = true;
  document.body.appendChild(video);

  try {
    await loadModels('/models');
    stream = await startCamera(video);
  } catch (e) {
    stopLiveEmotion();
    throw e;
  }

  history = [];
  timer = setInterval(tick, TICK_MS);
  return video;
}

async function tick() {
  let detected = null;
  try {
    const expr = await detectExpressions(video);
    detected = expressionToEmotion(expr);
  } catch {
    detected = null;
  }
  history.push(detected);
  if (history.length > HISTORY) history.shift();

  const emotion = smooth(history) || fallback;
  if (onEmotionCb) {
    onEmotionCb({ emotion, detected, faceFound: detected != null });
  }
}

export function stopLiveEmotion() {
  if (timer) clearInterval(timer);
  timer = null;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  if (video && video.parentNode) video.parentNode.removeChild(video);
  video = null;
  history = [];
}

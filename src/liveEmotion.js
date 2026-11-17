// 컨트롤러: 일정 간격으로 표정을 감지해 평활화된 감정을 만들고, 콜백으로 흘려보낸다.
// 로그 기록/모자이크 수집은 main 이 콜백에서 처리한다(이 모듈은 감지→감정에만 집중).
import { loadModels, warmUp, startCamera, detectExpressions } from './faceEmotion.js';
import { expressionToEmotion, smooth, computeBaseline, applyBaseline } from './emotionMapping.js';

const TICK_MS = 300;
const HISTORY = 4;

let timer = null;
let stream = null;
let video = null;
let history = [];
let fallback = 'numb';
let onEmotionCb = null;
let detecting = false;

// 개인별 무표정 보정
let baseline = null;          // 적용 중인 기준값(없으면 보정 미적용)
let calibrating = false;      // 보정 중이면 tick이 원시 표정을 모은다
let calibrationSamples = [];

const MODEL_URL = `${import.meta.env.BASE_URL}models`;

// 대기 화면에서 미리 모델을 받고 인식 엔진을 데워 둔다. 카메라는 켜지 않는다.
// 실패해도(오프라인 등) 조용히 넘어가고, 카메라 시작 때 다시 시도한다.
export async function preloadEmotionModels() {
  try {
    await warmUp(MODEL_URL);
    return true;
  } catch {
    return false;
  }
}

export function setFallback(emotion) {
  fallback = emotion || 'numb';
}

export function setBaseline(b) { baseline = b || null; }
export function getBaseline() { return baseline; }

// 보정 시작/종료. startCalibration 후 tick이 원시 표정벡터를 모으고,
// finishCalibration이 기준값을 계산·적용하고 반환한다(샘플 부족 시 null).
export function startCalibration() {
  calibrating = true;
  calibrationSamples = [];
}

export function finishCalibration() {
  calibrating = false;
  baseline = computeBaseline(calibrationSamples);
  calibrationSamples = [];
  return baseline;
}

// 카메라 권한/모델 로드. 성공 시 감지 루프 시작 → 미리보기용 video 반환.
// 실패(권한 거부·미지원·로드 실패)하면 throw → 호출측이 fallback 처리.
export async function startLiveEmotion({ onEmotion } = {}) {
  stopLiveEmotion(); // 이전 세션(타이머·스트림·미리보기)이 남아 있으면 먼저 정리 — 중복 시작 누수 방지
  onEmotionCb = onEmotion;

  video = document.createElement('video');
  video.id = 'cam-preview';
  video.setAttribute('playsinline', '');
  video.muted = true;
  document.body.appendChild(video);

  // 모델 받기와 카메라 켜기를 동시에 진행한다(맥 카메라는 켜지는 데 1~2초 걸린다).
  // 한쪽이 실패해도 다른 쪽이 끝날 때까지 기다려, 켜진 카메라를 반드시 다시 끈다.
  const [models, camera] = await Promise.allSettled([
    loadModels(MODEL_URL),
    startCamera(video),
  ]);
  if (camera.status === 'fulfilled') stream = camera.value;
  if (models.status === 'rejected' || camera.status === 'rejected') {
    stopLiveEmotion();
    throw models.status === 'rejected' ? models.reason : camera.reason;
  }

  history = [];
  detecting = false;
  baseline = null;
  calibrating = false;
  calibrationSamples = [];
  timer = setInterval(tick, TICK_MS);
  return video;
}

async function tick() {
  if (detecting) return;
  detecting = true;
  let detected = null;
  try {
    const expr = await detectExpressions(video);
    if (calibrating && expr) calibrationSamples.push(expr);
    detected = expressionToEmotion(applyBaseline(expr, baseline));
  } catch {
    detected = null;
  } finally {
    detecting = false;
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
  detecting = false;
}

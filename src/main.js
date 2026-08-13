import story from '../content/story.json';
import { createEngine, current, choose, advance, isEnding, receipts } from './engine.js';
import {
  renderAttract,
  renderIntro,
  renderScene,
  showResult,
  renderCameraCapture,
  renderCalibration,
  renderKioskCountdown,
  setTint,
} from './ui.js';
import { tintEmotionsFromHistory } from './emotionColor.js';
import { createLog, record, aggregate, emotionRuns } from './experienceLog.js';
import { browserDailyStats, statsLine } from './dailyStats.js';
import { CATEGORY_LABELS } from './comfortMessages.js';
import { createReveal } from './mosaicReveal.js';
import { startLiveEmotion, stopLiveEmotion, setFallback, startCalibration, finishCalibration } from './liveEmotion.js';
import {
  captureTargetFrom,
  setTarget,
  addTile,
  getTarget,
  getTiles,
  hasEnough,
  reset as resetSnapshots,
} from './snapshots.js';
import { buildMosaic } from './mosaic.js';
import { resolveSceneText } from './storyText.js';
import { enableSound, playEmotionCue } from './sound.js';
import { openQrTransferModal } from './qrTransferModal.js';
import { publishWallEmotion } from './wallClient.js';
import { createKioskMode } from './kioskMode.js';

const root = document.getElementById('app');
const engine = createEngine(story);
const log = createLog();
let enteredAt = Date.now();
let webcamActive = false;
let camVideo = null;
let tickCount = 0;
let live = { active: false, emotion: null, detected: null, faceFound: false, tiles: 0, hasTarget: false };
let introSetLoading = null;
let starting = false; // begin() 재진입 가드 — 로딩 중 중복 시작 방지
let gameStarted = false;
let kiosk = null;
let kioskPhase = null;
let qrTransfer = null;
let activeReveal = null;
let calibrationTimer = null;
let resetting = false;

// 게임 중 코너 썸네일(#cam-preview)을 카메라 화면 동안엔 숨겼다 다시 보인다
function setCamPreviewHidden(hidden) {
  const v = document.getElementById('cam-preview');
  if (v) v.style.visibility = hidden ? 'hidden' : 'visible';
}

const WEBCAM_TICK_MS = 300;
const TINT_HISTORY = 2; // 화면 반응은 즉각적으로, 두 감정 혼합은 최근 2표본으로만 판단
let liveTintHistory = [];

const CALIBRATION_SECONDS = 3; // 무표정 보정 카운트다운 길이

// 같은 체험 단계의 화면 전환은 무입력 시간을 새로 주지 않는다. 관람자의 실제
// pointer/touch/key 입력은 kioskMode의 전역 listener가 별도로 타이머를 다시 건다.
function setKioskPhase(nextPhase) {
  if (kioskPhase === nextPhase) return;
  kioskPhase = nextPhase;
  kiosk?.setPhase(nextPhase);
}

// 자동 초기화와 '다시 하기'·Shift+R가 같은 경로를 사용한다. reload 직전에도
// 스트림·QR interval·모자이크 reveal을 먼저 닫아 iPad에서 다음 관람자가 바로 시작한다.
function resetExperience() {
  if (resetting) return;
  resetting = true;
  kiosk?.destroy();
  if (calibrationTimer !== null) {
    clearInterval(calibrationTimer);
    calibrationTimer = null;
  }
  qrTransfer?.close?.();
  qrTransfer = null;
  activeReveal?.stop?.();
  activeReveal = null;
  document.querySelector('.mosaic-zoom-overlay')?.remove();
  document.querySelector('.statement-overlay')?.remove();
  stopLiveEmotion();
  resetSnapshots();
  webcamActive = false;
  camVideo = null;
  live = { active: false, emotion: null, detected: null, faceFound: false, tiles: 0, hasTarget: false };
  window.location.reload();
}

// 사진 촬영 후, 게임 시작 전: 무표정을 잠깐 모아 개인 기준값을 잡는다.
// 카운트다운이 끝나면 보정값을 확정(샘플 부족 시 내부에서 null → 보정 미적용)하고 done().
function runCalibration(done) {
  startCalibration();
  const { setCount } = renderCalibration(root, { seconds: CALIBRATION_SECONDS });
  let remaining = CALIBRATION_SECONDS;
  calibrationTimer = setInterval(() => {
    remaining -= 1;
    if (remaining > 0) { setCount(remaining); return; }
    clearInterval(calibrationTimer);
    calibrationTimer = null;
    finishCalibration();
    done();
  }, 1000);
}

function logCurrent() {
  // 웹캠 ON 이면 실시간 감정 이벤트(handleEmotion)로 집계 → 장면 이벤트는 기록하지 않음
  if (webcamActive) { enteredAt = Date.now(); return; }
  const scene = current(engine);
  const now = Date.now();
  record(log, {
    sceneId: scene.id,
    emotion: scene.emotion,
    source: 'scene',
    durationMs: now - enteredAt,
    timestamp: now,
  });
  enteredAt = now;
}

// 웹캠 감지 콜백: 실제 감정 기록 + 모자이크 재료 수집 + 화면 감정 틴트 갱신.
// 게임 시작 전(인트로·사진 촬영 화면)에는 틴트를 칠하지 않는다.
function handleEmotion(info) {
  if (!gameStarted) {
    live = { active: true, ...info, tiles: getTiles().length, hasTarget: !!getTarget() };
    return;
  }

  record(log, {
    sceneId: current(engine).id,
    emotion: info.emotion,
    source: 'webcam',
    durationMs: WEBCAM_TICK_MS,
    timestamp: Date.now(),
  });

  if (camVideo) {
    if (!getTarget()) captureTargetFrom(camVideo);
    if (getTarget()) addTile(camVideo, info.emotion);
    tickCount++;
  }

  // 표정이 색이 되어 화면에 기록된다 — 화면은 raw detected 값을 우선해 빠르게 반응한다.
  // 상위 두 감정이 비슷하면 두 색이 섞인 그라디언트로 물든다.
  liveTintHistory.push(info.detected || info.emotion);
  if (liveTintHistory.length > TINT_HISTORY) liveTintHistory.shift();
  setTint(tintEmotionsFromHistory(liveTintHistory));

  live = { active: true, ...info, tiles: getTiles().length, hasTarget: !!getTarget() };
}

function show() {
  setKioskPhase('session');
  const scene = current(engine);
  setFallback(scene.emotion); // 얼굴 미검출 시 이 장면 색으로 fallback
  playEmotionCue(scene.emotion);
  const viewScene = { ...scene, text: resolveSceneText(scene, engine.flags) };

  if (isEnding(scene)) {
    // 작품 엔딩(공통) 내레이션 → 클릭하면 결과 화면 + 모자이크
    renderScene(root, viewScene, {
      onAdvance: () => {
        logCurrent();
        stopLiveEmotion();
        live = { ...live, active: false };
        const result = { ...aggregate(log), timeline: emotionRuns(log), receipts: receipts(engine) };
        // 오늘의 익명 통계에 이번 인생을 더하고, "N번째 인생" 문구 생성
        const statsCategory = result.isComposite ? 'composite' : result.topCategory;
        const stats = browserDailyStats();
        if (stats) result.statsText = statsLine(stats.record(statsCategory), CATEGORY_LABELS[statsCategory]);
        const full = hasEnough() ? buildMosaic(getTarget(), getTiles()) : null;
        activeReveal?.stop?.();
        activeReveal = full ? createReveal(full) : null;
        const mosaic = activeReveal ? { full, ...activeReveal } : null; // 타일이 차오르는 타임랩스 리빌
        void publishWallEmotion(result.topCategory);
        showResult(root, result, mosaic, {
          onReceivePhoto: ({ canvas, filename, trigger }) => {
            kiosk?.noteActivity();
            qrTransfer?.close?.();
            qrTransfer = openQrTransferModal({ canvas, filename, trigger });
          },
          onRestart: resetExperience,
        });
        setKioskPhase('result');
      },
    });
    return;
  }
  renderScene(root, viewScene, {
    onAdvance: () => { logCurrent(); advance(engine); show(); },
    onChoice: (i) => { logCurrent(); choose(engine, i); show(); },
  });
}

async function begin(withCamera) {
  if (starting) return; // 로딩 중 클릭/키 중복 진입 차단
  starting = true;
  setKioskPhase('session');
  enableSound();
  if (withCamera) {
    introSetLoading?.('카메라와 모델을 불러오는 중…');
    try {
      resetSnapshots();
      tickCount = 0;
      camVideo = await startLiveEmotion({ onEmotion: handleEmotion });
      webcamActive = true;
      live = { ...live, active: true, hasTarget: !!getTarget() };
      introSetLoading?.(null);
      setCamPreviewHidden(true); // 카메라 화면 동안 코너 썸네일 숨김
      // 별도 카메라 화면에서 기준 사진 촬영 → 확정 시 게임 시작
      renderCameraCapture(root, {
        stream: camVideo?.srcObject,
        onConfirm: (canvas) => {
          setTarget(canvas);
          setCamPreviewHidden(false);
          live = { ...live, hasTarget: !!getTarget() };
          // 사진 확정 → 무표정 보정 단계 → 보정 끝나면 게임 시작
          runCalibration(() => {
            gameStarted = true;
            enteredAt = Date.now();
            show();
            starting = false;
          });
        },
      });
      return;
    } catch (e) {
      console.warn('카메라 사용 불가 — 장면 색으로 진행합니다.', e);
      introSetLoading?.(null);
      webcamActive = false;
      camVideo = null;
    }
  }
  gameStarted = true;
  enteredAt = Date.now();
  show();
  starting = false;
}

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.code === 'KeyR') resetExperience();
});

function showIntro() {
  setKioskPhase('session');
  const { setLoading } = renderIntro(root, { onStart: begin });
  introSetLoading = setLoading;
}

function showAttract() {
  setKioskPhase('attract');
  renderAttract(root, { onActivate: showIntro });
}

kiosk = createKioskMode({
  onCountdown: renderKioskCountdown,
  onReset: resetExperience,
});

window.addEventListener('pagehide', () => kiosk?.destroy(), { once: true });
showAttract();

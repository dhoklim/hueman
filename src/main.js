import story from '../content/story.json';
import { createEngine, current, choose, advance, isEnding, receipts } from './engine.js';
import { renderIntro, renderScene, showResult, renderCameraCapture } from './ui.js';
import { createLog, record, aggregate, emotionTimeline } from './experienceLog.js';
import { browserDailyStats, statsLine } from './dailyStats.js';
import { CATEGORY_LABELS } from './comfortMessages.js';
import { createReveal } from './mosaicReveal.js';
import { startLiveEmotion, stopLiveEmotion, setFallback } from './liveEmotion.js';
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

// 게임 중 코너 썸네일(#cam-preview)을 카메라 화면 동안엔 숨겼다 다시 보인다
function setCamPreviewHidden(hidden) {
  const v = document.getElementById('cam-preview');
  if (v) v.style.visibility = hidden ? 'hidden' : 'visible';
}

const WEBCAM_TICK_MS = 700;

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

// 웹캠 감지 콜백: 실제 감정 기록 + 모자이크 재료 수집. 화면 영상은 원본 색으로 유지한다.
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

  live = { active: true, ...info, tiles: getTiles().length, hasTarget: !!getTarget() };
}

function show() {
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
        const result = { ...aggregate(log), timeline: emotionTimeline(log), receipts: receipts(engine) };
        // 오늘의 익명 통계에 이번 인생을 더하고, "N번째 인생" 문구 생성
        const statsCategory = result.isComposite ? 'composite' : result.topCategory;
        const stats = browserDailyStats();
        if (stats) result.statsText = statsLine(stats.record(statsCategory), CATEGORY_LABELS[statsCategory]);
        const full = hasEnough() ? buildMosaic(getTarget(), getTiles()) : null;
        const mosaic = full ? { full, ...createReveal(full) } : null; // 타일이 차오르는 타임랩스 리빌
        showResult(root, result, mosaic);
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
          gameStarted = true;
          enteredAt = Date.now();
          show();
          starting = false;
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
  if (e.shiftKey && e.code === 'KeyR') window.location.reload();
});

// 인트로(간단한 설명) → 카메라 켜고/없이 시작
const { setLoading } = renderIntro(root, { onStart: begin });
introSetLoading = setLoading;

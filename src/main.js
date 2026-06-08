import story from '../content/story.json';
import { createEngine, current, choose, advance, isEnding } from './engine.js';
import { renderIntro, renderScene, showResult, setTint } from './ui.js';
import { createLog, record, aggregate, emotionTimeline } from './experienceLog.js';
import { gradientFor } from './emotionColor.js';
import { startLiveEmotion, stopLiveEmotion, setFallback } from './liveEmotion.js';
import { setTargetFrom, addTile, getTarget, getTiles, hasEnough, reset as resetSnapshots } from './snapshots.js';
import { buildMosaic } from './mosaic.js';
import { updateDebug } from './debug.js';
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

// 웹캠 감지 콜백: 관람자 감정으로 화면을 물들이고, 실제 감정 기록 + 모자이크 재료 수집
function handleEmotion(info) {
  setTint(gradientFor(info.emotion));
  record(log, {
    sceneId: current(engine).id,
    emotion: info.emotion,
    source: 'webcam',
    durationMs: WEBCAM_TICK_MS,
    timestamp: Date.now(),
  });

  if (camVideo) {
    if (!getTarget()) setTargetFrom(camVideo); // 첫 프레임 = 타깃 얼굴
    else if (tickCount % 2 === 0) addTile(camVideo, info.emotion); // 이후 ~1.4초마다 타일
    tickCount++;
  }

  live = { active: true, ...info, tiles: getTiles().length, hasTarget: !!getTarget() };
  updateDebug(engine, log, live);
}

function show() {
  const scene = current(engine);
  setFallback(scene.emotion); // 얼굴 미검출 시 이 장면 색으로 fallback
  playEmotionCue(scene.emotion);
  updateDebug(engine, log, live);
  const viewScene = { ...scene, text: resolveSceneText(scene, engine.flags) };

  if (isEnding(scene)) {
    // 작품 엔딩(공통) 내레이션 → 클릭하면 결과 화면 + 모자이크
    renderScene(root, viewScene, {
      onAdvance: () => {
        logCurrent();
        stopLiveEmotion();
        live = { ...live, active: false };
        const mosaic = hasEnough() ? buildMosaic(getTarget(), getTiles()) : null;
        showResult(root, { ...aggregate(log), timeline: emotionTimeline(log) }, mosaic);
        updateDebug(engine, log, live);
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
  enableSound();
  if (withCamera) {
    try {
      resetSnapshots();
      tickCount = 0;
      camVideo = await startLiveEmotion({ onEmotion: handleEmotion });
      webcamActive = true;
      live.active = true;
    } catch (e) {
      console.warn('카메라 사용 불가 — 장면 색으로 진행합니다.', e);
      webcamActive = false;
      camVideo = null;
    }
  }
  enteredAt = Date.now();
  show();
}

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.code === 'KeyR') window.location.reload();
});

// 인트로(간단한 설명) → 카메라 켜고/없이 시작
renderIntro(root, { onStart: begin });

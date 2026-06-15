import { CATEGORY_LABELS } from './comfortMessages.js';
import { browserGalleryStore } from './gallery.js';
import { createResultCardCanvas, resultFilename, receiptLine } from './resultCard.js';
import { SCENE_VIDEOS } from './videoMap.js';
import { grabTargetCanvas } from './snapshots.js';

let keyHandler = null;
let bgVideoEl = null;
let currentVideoFile = null;
let bgTimer = null; // 구간 타이머 — 장면 전환 시 항상 취소
let pendingCanplay = null; // 로드 대기 중인 canplay 핸들러 — 장면 전환 시 함께 해제

// 진행 중인 구간 타이머·ended 핸들러·대기 중 canplay 리스너를 모두 해제
function clearBgTimer() {
  if (bgTimer !== null) { clearTimeout(bgTimer); bgTimer = null; }
  if (bgVideoEl) {
    bgVideoEl.onended = null;
    if (pendingCanplay) { bgVideoEl.removeEventListener('canplay', pendingCanplay); pendingCanplay = null; }
  }
}

// videoConfig: { file, start, end } | null
// opts.freeze  = true → 구간 끝에서 마지막 프레임 정지 (선택지 장면)
// opts.loop    = true → 구간 끝에서 구간 처음으로 반복
// opts.onEnded = fn   → 구간 1회 재생 후 자동 호출 (나레이션 장면 자동 진행)
function setBgVideo(videoConfig, opts = {}) {
  const { loop = false, freeze = false, onEnded = null } = opts;
  clearBgTimer();

  if (!videoConfig) {
    currentVideoFile = null;
    if (bgVideoEl) { bgVideoEl.style.display = 'none'; bgVideoEl.src = ''; }
    if (tintEl) tintEl.style.opacity = '0';
    return;
  }

  const { file, start = 0, end = null } = videoConfig;

  if (!bgVideoEl) {
    bgVideoEl = document.createElement('video');
    bgVideoEl.id = 'bg-video';
    bgVideoEl.muted = true;
    bgVideoEl.setAttribute('playsinline', '');
    bgVideoEl.setAttribute('webkit-playsinline', '');
    const tint = document.getElementById('tint');
    document.body.insertBefore(bgVideoEl, tint || document.body.firstChild);
  }

  bgVideoEl.loop = false; // 구간 루프는 bgTimer로 직접 관리
  bgVideoEl.style.display = 'block';
  if (tintEl) tintEl.style.opacity = '0';

  // 구간 시작 + 타이머 설정
  const beginSegment = () => {
    bgVideoEl.currentTime = start;
    bgVideoEl.play().catch(() => {});

    if (end !== null) {
      // setTimeout으로 구간 끝 감지 (timeupdate보다 정밀)
      const scheduleNext = () => {
        const remaining = Math.max(0, (end - bgVideoEl.currentTime) * 1000);
        bgTimer = setTimeout(() => {
          bgTimer = null;
          if (loop) {
            bgVideoEl.currentTime = start;
            bgVideoEl.play().catch(() => {});
            scheduleNext();
          } else if (freeze) {
            bgVideoEl.pause(); // 마지막 프레임에서 정지
          } else {
            onEnded?.();
          }
        }, remaining);
      };
      scheduleNext();
    } else {
      // end 없음: 파일 전체 끝날 때
      bgVideoEl.onended = loop
        ? () => { bgVideoEl.currentTime = 0; bgVideoEl.play().catch(() => {}); }
        : onEnded;
    }
  };

  if (file !== currentVideoFile) {
    currentVideoFile = file;
    bgVideoEl.src = `${import.meta.env.BASE_URL}video/${file}`;
    bgVideoEl.load();
    pendingCanplay = beginSegment;
    bgVideoEl.addEventListener('canplay', beginSegment, { once: true });
  } else {
    beginSegment();
  }
}

function clearKeys() {
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }
}

// 틴트 레이어는 호환성상 유지하지만, 영상/화면은 원본 색으로 보이도록 항상 투명하게 둔다.
let tintEl = null;
export function setTint() {
  if (!tintEl) {
    tintEl = document.getElementById('tint') || document.createElement('div');
    tintEl.id = 'tint';
    if (!tintEl.parentNode) document.body.insertBefore(tintEl, document.body.firstChild);
  }
  tintEl.style.background = 'transparent';
  tintEl.style.opacity = '0';
}

function mount(root, sceneEl) {
  clearKeys();
  root.innerHTML = '';
  sceneEl.classList.add('scene');
  root.appendChild(sceneEl);
  // 다음 프레임에 fade-in
  requestAnimationFrame(() => sceneEl.classList.add('show'));
}

// 영상이 있는 장면: 대사를 delay ms 후 페이드인
function delayedFadeIn(el, delay) {
  el.style.opacity = '0';
  setTimeout(() => {
    if (!document.body.contains(el)) return;
    el.style.transition = 'opacity 0.8s ease';
    el.style.opacity = '1';
  }, delay);
}

export function renderScene(root, scene, { onAdvance, onChoice } = {}) {
  const el = document.createElement('div');
  const videoConfig = SCENE_VIDEOS[scene.id] || null;

  // 구간 길이(ms)에 따라 텍스트 페이드인 딜레이 계산
  const segMs = videoConfig && videoConfig.end != null
    ? (videoConfig.end - videoConfig.start) * 1000
    : Infinity;
  const textDelay = segMs < 5000 ? 600 : segMs < 10000 ? 1000 : 1500;

  const text = document.createElement('div');
  text.className = 'scene-text';
  text.textContent = scene.text;
  el.appendChild(text);

  if (scene.type === 'choice') {
    const wrap = document.createElement('div');
    wrap.className = 'choices';
    scene.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `${c.label}<span class="choice-key">[${i + 1}]</span>`;
      btn.addEventListener('click', () => onChoice && onChoice(i));
      wrap.appendChild(btn);
    });
    el.appendChild(wrap);
    setTint();
    // 선택지: 구간 1회 재생 후 마지막 프레임 정지, 대사 → 버튼 순서로 페이드인
    setBgVideo(videoConfig, { freeze: true });
    mount(root, el);
    if (videoConfig) {
      delayedFadeIn(text, textDelay);
      delayedFadeIn(wrap, textDelay + 700);
    }

    keyHandler = (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= scene.choices.length) { onChoice && onChoice(n - 1); return; }
      if (e.key === 'ArrowLeft') onChoice && onChoice(0);
      else if (e.key === 'ArrowRight' && scene.choices.length >= 2) onChoice && onChoice(1);
    };
    document.addEventListener('keydown', keyHandler);
  } else {
    // 나레이션: 구간이 끝나면 자동 진행, 클릭/키도 여전히 동작
    // 클릭·키·영상 onEnded 세 경로가 같은 onAdvance 를 부르므로 한 번만 실행되도록 가드
    let advanced = false;
    const advanceOnce = () => { if (advanced) return; advanced = true; onAdvance && onAdvance(); };
    const hasVideo = !!videoConfig;
    if (!hasVideo) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = '클릭 · Space · Enter 로 계속';
      el.appendChild(hint);
    }
    el.addEventListener('click', advanceOnce);
    setTint();
    setBgVideo(videoConfig, { onEnded: hasVideo ? advanceOnce : null });
    mount(root, el);
    if (hasVideo) delayedFadeIn(text, textDelay);

    keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') advanceOnce();
    };
    document.addEventListener('keydown', keyHandler);
  }
}

export function showResult(root, result, mosaicCanvas) {
  clearKeys();
  // mosaicCanvas: 캔버스(완성본) 또는 리빌 핸들 { canvas(점점 채워짐), full(완성본), play }
  const mosaic = mosaicCanvas
    ? (mosaicCanvas.canvas ? mosaicCanvas : { canvas: mosaicCanvas, full: mosaicCanvas, play: null })
    : null;
  const el = document.createElement('div');
  el.className = 'scene result';
  const label = result.isComposite ? CATEGORY_LABELS.composite : (CATEGORY_LABELS[result.topCategory] || '감정');
  el.innerHTML = `
    <div class="label">당신의 인생을 가장 많이 채운 감정</div>
    <div class="top">${label}</div>
    <div class="message">${result.message}</div>
    <div class="timeline" aria-label="감정 타임라인"></div>
    <div class="mosaic-slot"></div>
    <div class="result-actions"></div>
  `;
  if (result.receipts && result.receipts.length) {
    const receipt = document.createElement('div');
    receipt.className = 'receipt';
    receipt.textContent = receiptLine(result.receipts);
    el.querySelector('.message').after(receipt);
  }
  if (result.statsText) {
    const stats = document.createElement('div');
    stats.className = 'daily-stats';
    stats.textContent = result.statsText;
    el.querySelector('.timeline').after(stats);
  }
  renderTimeline(el.querySelector('.timeline'), result.totals || {});
  const slot = el.querySelector('.mosaic-slot');
  const actions = el.querySelector('.result-actions');

  if (mosaic) {
    mosaic.canvas.className = 'mosaic-canvas';
    slot.appendChild(mosaic.canvas);

    const zoom = document.createElement('button');
    zoom.className = 'choice-btn save-btn';
    zoom.textContent = '크게 보기';
    zoom.addEventListener('click', () => openMosaicZoom(mosaic.full));
    actions.appendChild(zoom);

    const saveCard = document.createElement('button');
    saveCard.className = 'choice-btn save-btn';
    saveCard.textContent = '결과 카드 저장';
    saveCard.addEventListener('click', () => {
      const card = createResultCardCanvas(result, mosaic.full);
      downloadCanvas(card, resultFilename(result));
    });
    actions.appendChild(saveCard);

    const save = document.createElement('button');
    save.className = 'choice-btn save-btn';
    save.textContent = '모자이크만 저장';
    save.addEventListener('click', () => downloadCanvas(mosaic.full, `hueman-${result.topCategory}.png`));
    actions.appendChild(save);

    const gallery = document.createElement('button');
    gallery.className = 'text-link gallery-save';
    gallery.textContent = '갤러리에 남기기';
    gallery.addEventListener('click', () => {
      const store = browserGalleryStore();
      if (!store) return;
      const card = createResultCardCanvas(result, mosaic.full);
      store.add({
        image: card.toDataURL('image/png'),
        emotion: result.isComposite ? 'composite' : result.topCategory,
      });
      gallery.textContent = '갤러리에 남겼습니다';
    });
    actions.appendChild(gallery);
  } else {
    slot.innerHTML = '<div class="mosaic-placeholder">여기에 사진 모자이크가 들어갑니다 — 카메라를 켜고 체험하면 당신의 표정으로 채워집니다</div>';
  }

  const statement = document.createElement('button');
  statement.className = 'text-link result-statement';
  statement.textContent = '작가 노트 · Artist Statement';
  statement.addEventListener('click', () => openStatement());
  actions.appendChild(statement);

  setTint();
  setBgVideo(null); // 결과 화면에서는 배경 영상 없음
  mount(root, el);
  if (mosaic && mosaic.play) requestAnimationFrame(() => mosaic.play());
}

function cloneCanvas(canvas) {
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom')) return copy;
  const ctx = copy.getContext('2d');
  if (ctx) ctx.drawImage(canvas, 0, 0);
  return copy;
}

function openMosaicZoom(canvas) {
  const existing = document.querySelector('.mosaic-zoom-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'mosaic-zoom-overlay';
  overlay.innerHTML = `
    <button class="statement-close mosaic-zoom-close" aria-label="닫기">✕</button>
    <div class="mosaic-zoom-frame"></div>
  `;
  const zoomCanvas = cloneCanvas(canvas);
  zoomCanvas.className = 'mosaic-zoom-canvas';
  overlay.querySelector('.mosaic-zoom-frame').appendChild(zoomCanvas);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.querySelector('.mosaic-zoom-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  return overlay;
}

const TIMELINE_COLORS = {
  joy: '#FFD23F', sad: '#3B7DD8', anger: '#E03131',
  numb: '#c8c8dc', anxiety: '#FF8C2B', surprise: '#2FB873',
};

function renderTimeline(el, totals) {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  if (!entries.length) {
    el.innerHTML = '<div class="timeline-empty">감정 타임라인은 체험이 진행되면 채워집니다</div>';
    return;
  }
  const label = document.createElement('div');
  label.className = 'timeline-label';
  label.textContent = '감정 흐름';
  el.before(label);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  // Set bar background directly as a gradient — avoids flex-child height quirks
  let pos = 0;
  const stops = sorted.flatMap(([cat, dur]) => {
    const pct = Math.max(4, Math.round((dur / total) * 100));
    const color = TIMELINE_COLORS[cat] || '#888';
    const start = pos;
    pos = Math.min(pos + pct, 100);
    return [`${color} ${start}%`, `${color} ${pos}%`];
  });
  el.style.background = `linear-gradient(to right, ${stops.join(', ')})`;
  // Transparent spans kept for DOM structure (tests, tooltips)
  sorted.forEach(([cat, dur]) => {
    const pct = Math.max(4, Math.round((dur / total) * 100));
    const seg = document.createElement('span');
    seg.className = `timeline-segment emotion-${cat}`;
    seg.style.cssText = `width:${pct}%;background:transparent;`;
    seg.title = `${CATEGORY_LABELS[cat] || cat} ${pct}%`;
    el.appendChild(seg);
  });
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// 아티스트 스테이트먼트 (과제 요구: 무엇을·어떻게 플레이·뒤에 있는 생각·AI 사용)
const ARTIST_STATEMENT = `
  <h2>hueman <span>— 그 모든 감정이, 너였다</span></h2>

  <h3>무엇을 만들었나</h3>
  <p>hueman은 관람자가 한 인간의 일생(탄생→죽음)을 자신의 선택으로 따라가는
  인터랙티브 감정 체험입니다. 영상은 원본 그대로 흐르고,
  여정의 끝에서 ‘당신을 가장 많이 채운 감정’과 위로의 말을 마주합니다.</p>

  <h3>어떻게 플레이하나</h3>
  <p>화면을 클릭(또는 Space·Enter)해 장면을 넘기고, 갈림길에서는 두 개의 버튼
  (또는 1·2, ←·→)으로 선택합니다. 정답은 없습니다 — 어떤 선택도 틀리지 않고,
  다른 감정이 흐를 뿐입니다. 선택이 쌓여 인생의 톤이 바뀌고 때로는 배드엔딩으로도
  이어지지만, 마지막은 늘 같은 위로로 닫힙니다.</p>

  <h3>뒤에 있는 생각</h3>
  <p>빠른 시대 속에서 우리는 자신이 무엇을 느끼는지 돌아볼 틈을 잃고,
  부정적인 감정을 ‘쓸모없다’며 억누릅니다. hueman은 거창한 위로 대신,
  당신 스스로의 선택과 반응으로 만들어진 감정의 여정을 통해 말합니다 —
  <b>“불필요한 감정은 없다. 그 모든 감정이 모여 내가 된다.”</b>
  기쁨도 슬픔도 분노도 불안도 무감각도, 전부 당신이 살아있었다는 증거입니다.</p>

  <h3>AI·에이전트를 어떻게 썼나</h3>
  <p>이 작품은 에이전트형 AI(Claude Code)와의 ‘바이브 코딩’으로 만들어졌습니다.
  먼저 AI와 대화하며 컨셉을 구조화하고(브레인스토밍 → 설계 명세 → 구현 계획),
  분기 구조를 브라우저 목업으로 함께 설계했습니다. 이후 AI가 테스트 주도(TDD)로
  감정–색 매핑, 누적 분기 상태머신, 감정 집계·위로 메시지 모듈을 구현했고,
  저는 방향과 이야기·연출을 다듬었습니다. 사람은 ‘무엇을, 왜’를, AI는 ‘어떻게’를
  빠르게 채우는 협업이었습니다.</p>
`;

export function openStatement(host) {
  const mountTo = host || document.body;
  const existing = mountTo.querySelector('.statement-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'statement-overlay';
  overlay.innerHTML = `
    <div class="statement-card">
      <button class="statement-close" aria-label="닫기">✕</button>
      <div class="statement-body">${ARTIST_STATEMENT}</div>
    </div>
  `;
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.querySelector('.statement-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  mountTo.appendChild(overlay);
  return overlay;
}

export function renderIntro(root, { onStart } = {}) {
  const el = document.createElement('div');
  el.className = 'intro';
  el.innerHTML = `
    <div class="intro-title">hueman</div>
    <div class="intro-sub">hue + human · 모든 감정의 색</div>
    <div class="intro-desc">한 사람의 일생을 당신의 선택으로 따라갑니다.
영상은 원본 그대로 흐르고,
여정의 끝에서 당신을 가장 많이 채운 감정과 마주합니다.</div>
    <div class="privacy-note">카메라를 켜면 얼굴 표정은 이 브라우저 안에서만 임시로 쓰입니다.
결과 저장이나 갤러리 남기기는 마지막에 직접 선택할 수 있습니다.</div>
    <div class="intro-how">장면 넘기기 — 클릭 · Space · Enter
선택의 순간 — 버튼 · 1 / 2 (또는 ← / →)</div>
    <div class="intro-buttons">
      <button class="choice-btn intro-start-cam">카메라 켜고 시작</button>
      <button class="text-link intro-start-plain">카메라 없이 시작</button>
    </div>
    <div class="intro-loading" hidden></div>
    <button class="text-link intro-gallery">감정 갤러리 보기</button>
    <button class="text-link intro-statement">작가 노트 · Artist Statement</button>
    <div class="intro-test">카메라를 켜면 표정은 결과 기록과 모자이크 재료로만 사용됩니다</div>
  `;

  const camBtn = el.querySelector('.intro-start-cam');
  const plainBtn = el.querySelector('.intro-start-plain');
  const loadingEl = el.querySelector('.intro-loading');

  function setLoading(msg) {
    if (msg) {
      camBtn.disabled = true;
      plainBtn.disabled = true;
      loadingEl.textContent = msg;
      loadingEl.removeAttribute('hidden');
    } else {
      camBtn.disabled = false;
      plainBtn.disabled = false;
      loadingEl.textContent = '';
      loadingEl.setAttribute('hidden', '');
    }
  }

  camBtn.addEventListener('click', () => onStart && onStart(true));
  plainBtn.addEventListener('click', () => onStart && onStart(false));
  el.querySelector('.intro-gallery').addEventListener('click', () => openGallery());
  el.querySelector('.intro-statement').addEventListener('click', () => openStatement());
  setTint();
  setBgVideo(null);
  mount(root, el);

  keyHandler = (e) => {
    // 로딩 중(버튼 비활성)에는 키보드로도 재시작되지 않도록 가드
    if (camBtn.disabled) return;
    if (e.key === ' ' || e.key === 'Enter') onStart && onStart(true);
  };
  document.addEventListener('keydown', keyHandler);

  return { setLoading };
}

// 별도 카메라 화면: 라이브 미리보기(거울) + 원형 가이드 + 셔터 → 3·2·1 카운트다운 →
// 그 프레임 캡처 → 확인/다시찍기. "이대로 시작" 시 onConfirm(캡처 캔버스) 호출.
const COUNTDOWN_MS = 700;
export function renderCameraCapture(root, { stream, onConfirm } = {}) {
  const el = document.createElement('div');
  el.className = 'scene camera-screen';
  el.innerHTML = `
    <div class="camera-stage">
      <video class="camera-preview" muted playsinline webkit-playsinline></video>
      <div class="face-guide" aria-hidden="true"></div>
      <div class="camera-countdown" hidden></div>
      <div class="capture-shot" hidden></div>
    </div>
    <div class="camera-hint">얼굴을 원 안에 맞춰 주세요</div>
    <button class="camera-shutter" aria-label="사진 찍기"></button>
    <div class="capture-confirm" hidden>
      <button class="choice-btn confirm-start">이대로 시작</button>
      <button class="text-link confirm-retake">다시 찍기</button>
    </div>
  `;

  const previewVideo = el.querySelector('.camera-preview');
  const guide = el.querySelector('.face-guide');
  const countdownEl = el.querySelector('.camera-countdown');
  const shotSlot = el.querySelector('.capture-shot');
  const hint = el.querySelector('.camera-hint');
  const shutter = el.querySelector('.camera-shutter');
  const confirmBox = el.querySelector('.capture-confirm');
  const startBtn = el.querySelector('.confirm-start');
  const retakeBtn = el.querySelector('.confirm-retake');

  let shot = null;
  let timer = null;
  let counting = false;

  // muted/playsInline 을 프로퍼티로 확실히 지정해야 자동재생이 막히지 않는다(HTML 속성만으론 불안정)
  previewVideo.muted = true;
  previewVideo.autoplay = true;
  previewVideo.playsInline = true;
  const safePlay = () => { try { const p = previewVideo.play?.(); if (p && p.catch) p.catch(() => {}); } catch {} };

  function showLive() {
    if (timer) { clearTimeout(timer); timer = null; }
    counting = false;
    shot = null;
    shotSlot.hidden = true;
    shotSlot.innerHTML = '';
    countdownEl.hidden = true;
    confirmBox.hidden = true;
    guide.hidden = false;
    hint.hidden = false;
    shutter.hidden = false;
    shutter.disabled = false;
    previewVideo.style.visibility = 'visible';
    safePlay();
  }

  function snap() {
    shot = grabTargetCanvas(previewVideo);
    countdownEl.hidden = true;
    shutter.hidden = true;
    guide.hidden = true;
    hint.hidden = true;
    previewVideo.style.visibility = 'hidden';
    shot.className = 'shot-canvas';
    shotSlot.innerHTML = '';
    shotSlot.appendChild(shot);
    shotSlot.hidden = false;
    confirmBox.hidden = false;
    counting = false;
  }

  function startCountdown() {
    if (counting) return;
    counting = true;
    shutter.disabled = true;
    let n = 3;
    countdownEl.textContent = String(n);
    countdownEl.hidden = false;
    const step = () => {
      n -= 1;
      if (n >= 1) { countdownEl.textContent = String(n); timer = setTimeout(step, COUNTDOWN_MS); }
      else { timer = null; snap(); }
    };
    timer = setTimeout(step, COUNTDOWN_MS);
  }

  shutter.addEventListener('click', startCountdown);
  retakeBtn.addEventListener('click', showLive);
  startBtn.addEventListener('click', () => {
    if (timer) { clearTimeout(timer); timer = null; }
    previewVideo.srcObject = null; // 미리보기 비디오만 분리(스트림은 감지용으로 계속 사용)
    onConfirm && onConfirm(shot);
  });

  if (stream) previewVideo.srcObject = stream;
  // 메타데이터가 준비되면 재생 보장(스트림 부착 직후 play 가 무시되는 경우 대비)
  previewVideo.addEventListener('loadedmetadata', safePlay);
  setTint();
  setBgVideo(null);
  mount(root, el);
  safePlay();

  keyHandler = (e) => {
    if (!confirmBox.hidden) { if (e.key === 'Enter') startBtn.click(); return; }
    if (!counting && (e.key === ' ' || e.key === 'Enter')) startCountdown();
  };
  document.addEventListener('keydown', keyHandler);
}

export function openGallery(host) {
  const store = browserGalleryStore();
  const items = store ? store.list() : [];
  const mountTo = host || document.body;
  const overlay = document.createElement('div');
  overlay.className = 'statement-overlay gallery-overlay';
  overlay.innerHTML = `
    <div class="statement-card gallery-card">
      <button class="statement-close" aria-label="닫기">✕</button>
      <div class="statement-body">
        <h2>감정 갤러리 <span>— 우리가 남긴 색</span></h2>
        <div class="gallery-grid"></div>
      </div>
    </div>
  `;
  const grid = overlay.querySelector('.gallery-grid');
  if (items.length === 0) {
    grid.innerHTML = '<div class="gallery-empty">아직 남겨진 결과 카드가 없습니다.</div>';
  } else {
    for (const item of items) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = `hueman ${item.emotion}`;
      grid.appendChild(img);
    }
  }

  const close = () => overlay.remove();
  overlay.querySelector('.statement-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  mountTo.appendChild(overlay);
  return overlay;
}

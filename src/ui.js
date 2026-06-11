import { gradientFor } from './emotionColor.js';
import { CATEGORY_LABELS } from './comfortMessages.js';
import { browserGalleryStore } from './gallery.js';
import { createResultCardCanvas, resultFilename, receiptLine } from './resultCard.js';

let keyHandler = null;

function clearKeys() {
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }
}

// 모든 감정 색을 띠처럼 깐 인트로 배경
const INTRO_BG = 'radial-gradient(circle at 50% 35%, #2b2b3a 0%, #0e0e14 72%)';

// 항상 떠 있는 전체화면 틴트 레이어. System B 가 실시간 감정 색으로 매 틱 갱신한다.
let tintEl = null;
export function setTint(background) {
  if (!tintEl) {
    tintEl = document.getElementById('tint') || document.createElement('div');
    tintEl.id = 'tint';
    if (!tintEl.parentNode) document.body.insertBefore(tintEl, document.body.firstChild);
  }
  tintEl.style.background = background;
}

function mount(root, sceneEl) {
  clearKeys();
  root.innerHTML = '';
  sceneEl.classList.add('scene');
  root.appendChild(sceneEl);
  // 다음 프레임에 fade-in
  requestAnimationFrame(() => sceneEl.classList.add('show'));
}

export function renderScene(root, scene, { onAdvance, onChoice } = {}) {
  const el = document.createElement('div');

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
    setTint(gradientFor(scene.emotion));
    mount(root, el);

    keyHandler = (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= scene.choices.length) { onChoice && onChoice(n - 1); return; }
      if (e.key === 'ArrowLeft') onChoice && onChoice(0);
      else if (e.key === 'ArrowRight' && scene.choices.length >= 2) onChoice && onChoice(1);
    };
    document.addEventListener('keydown', keyHandler);
  } else {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = '클릭 · Space · Enter 로 계속';
    el.appendChild(hint);
    el.addEventListener('click', () => onAdvance && onAdvance());
    setTint(gradientFor(scene.emotion));
    mount(root, el);

    keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') onAdvance && onAdvance();
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
    <div class="mosaic-slot"></div>
    <div class="timeline" aria-label="감정 타임라인"></div>
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
  renderTimeline(el.querySelector('.timeline'), result.timeline || []);
  const slot = el.querySelector('.mosaic-slot');
  const actions = el.querySelector('.result-actions');

  if (mosaic) {
    mosaic.canvas.className = 'mosaic-canvas';
    slot.appendChild(mosaic.canvas);

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

  setTint(gradientFor(result.isComposite ? 'sad' : result.topCategory));
  mount(root, el);
  if (mosaic && mosaic.play) requestAnimationFrame(() => mosaic.play());
}

function renderTimeline(el, timeline) {
  if (!timeline.length) {
    el.innerHTML = '<div class="timeline-empty">감정 타임라인은 체험이 진행되면 채워집니다</div>';
    return;
  }

  timeline.forEach((item, i) => {
    const seg = document.createElement('span');
    seg.className = `timeline-segment emotion-${item.emotion}`;
    seg.style.width = `${Math.max(3, item.percent)}%`;
    seg.style.animationDelay = `${i * 80}ms`;
    seg.title = `${CATEGORY_LABELS[item.category] || item.emotion} ${item.percent}%`;
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
  인터랙티브 감정 체험입니다. 매 순간의 감정이 화면의 색이 되고,
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
매 순간의 감정이 화면의 색으로 물들고,
여정의 끝에서 당신을 가장 많이 채운 감정과 마주합니다.</div>
    <div class="privacy-note">카메라를 켜면 얼굴 표정은 이 브라우저 안에서만 임시로 쓰입니다.
결과 저장이나 갤러리 남기기는 마지막에 직접 선택할 수 있습니다.</div>
    <div class="intro-how">장면 넘기기 — 클릭 · Space · Enter
선택의 순간 — 버튼 · 1 / 2 (또는 ← / →)</div>
    <div class="intro-buttons">
      <button class="choice-btn intro-start-cam">카메라 켜고 시작</button>
      <button class="text-link intro-start-plain">카메라 없이 시작</button>
    </div>
    <button class="text-link intro-gallery">감정 갤러리 보기</button>
    <button class="text-link intro-statement">작가 노트 · Artist Statement</button>
    <div class="intro-test">테스트 버전 · 카메라를 켜면 당신의 표정이 실시간으로 화면 색을 물들입니다 · 우측 상단 패널(D 키)에서 내부 상태 확인</div>
  `;
  el.querySelector('.intro-start-cam').addEventListener('click', () => onStart && onStart(true));
  el.querySelector('.intro-start-plain').addEventListener('click', () => onStart && onStart(false));
  el.querySelector('.intro-gallery').addEventListener('click', () => openGallery());
  el.querySelector('.intro-statement').addEventListener('click', () => openStatement());
  setTint(INTRO_BG);
  mount(root, el);

  keyHandler = (e) => {
    if (e.key === ' ' || e.key === 'Enter') onStart && onStart(true);
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

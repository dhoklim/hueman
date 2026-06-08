# hueman System A — 텍스트 스토리 엔진 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 영상 대신 데이터(JSON) 기반 텍스트 장면 그래프를 재생하는 hueman System A 웹 엔진을, 오프닝→6단계 누적 분기→배드엔딩 포함→공통 작품 엔딩까지 끝까지 돌아가게 만든다.

**Architecture:** 순수 로직 모듈(emotionColor·comfortMessages·experienceLog·resolver·engine)을 TDD로 먼저 만들고, 그 위에 UI/흐름(ui·main)을 얹는다. 선택은 상태 flag만 바꾸고 resolver가 누적 상태로 다음 변형/분기를 고른다(C·하이브리드). B(웹캠 감정)·C(모자이크)가 끼워질 인터페이스는 emotionColor·experienceLog에 미리 비워둔다.

**Tech Stack:** Vite + 순수 JS, Vitest(+jsdom) 단위 테스트.

> **프로젝트 루트:** `/Users/dhoklim/Documents/A&T.TEAM/` (이하 모든 경로는 이 루트 기준). 앱 파일을 이 루트에 둔다.
>
> **Git 안내:** 이 폴더는 아직 git 저장소가 아니다. 버전 관리를 원하면 Task 1의 `git init`(선택)을 실행하고 각 Task 끝의 commit 단계를 따른다. 원치 않으면 **commit 단계를 모두 건너뛰고** 대신 테스트 통과로 체크포인트를 삼는다.

---

## 파일 구조

```
A&T.TEAM/
  index.html               # 앱 셸
  package.json
  vite.config.js           # vitest 설정 포함
  src/
    main.js                # 부팅 + 전체 흐름 제어
    engine.js              # 상태머신 (현재 씬 + flags)
    resolver.js            # 변형/배드엔딩 라우팅 (순수)
    ui.js                  # 장면 렌더 + 입력
    emotionColor.js        # 감정→색/그라데이션 (B 연동 지점)
    experienceLog.js       # 이벤트 기록 + 집계 (C 연동 지점)
    comfortMessages.js     # 위로 메시지 풀
  content/
    story.json             # 장면 그래프 + 분기표
  styles/
    main.css
  test/
    emotionColor.test.js
    comfortMessages.test.js
    experienceLog.test.js
    resolver.test.js
    engine.test.js
    content.test.js
    ui.test.js
```

---

## Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `styles/main.css`

- [ ] **Step 1: 디렉터리와 npm 초기화**

Run (프로젝트 루트에서):
```bash
mkdir -p src content styles test
npm init -y
npm install -D vite vitest jsdom
```
Expected: `node_modules/` 생성, `package.json`에 devDependencies 추가.

- [ ] **Step 2: `package.json` 스크립트/모듈 설정 덮어쓰기**

`package.json`을 아래로 수정(`devDependencies` 버전은 설치된 값 그대로 둠):
```json
{
  "name": "hueman",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```
(설치로 생긴 `devDependencies` 블록은 유지)

- [ ] **Step 3: `vite.config.js` 생성**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: `index.html` 생성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>hueman</title>
    <link rel="stylesheet" href="/styles/main.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: `styles/main.css` 생성 (시네마틱 기본)**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { height: 100%; }
body {
  font-family: system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif;
  background: #000; color: #fff; overflow: hidden;
}
#app { position: relative; }

.scene {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; padding: 6vh 8vw;
  transition: background 1.2s ease, opacity 0.8s ease;
  opacity: 0;
}
.scene.show { opacity: 1; }

.scene-text {
  font-size: clamp(20px, 3.2vw, 34px);
  line-height: 1.8; font-weight: 500; max-width: 760px;
  text-shadow: 0 2px 12px rgba(0,0,0,.55);
  white-space: pre-line;
}
.hint { margin-top: 28px; font-size: 14px; opacity: .55; }

.choices { display: flex; gap: 22px; margin-top: 44px; flex-wrap: wrap; justify-content: center; }
.choice-btn {
  background: rgba(255,255,255,.14); border: 1.5px solid rgba(255,255,255,.6);
  color: #fff; border-radius: 14px; padding: 16px 30px;
  font-size: 18px; font-weight: 600; cursor: pointer; backdrop-filter: blur(4px);
  transition: background .15s, transform .15s;
}
.choice-btn:hover { background: rgba(255,255,255,.26); transform: translateY(-2px); }
.choice-key { display: block; font-size: 12px; opacity: .6; margin-top: 5px; font-weight: 400; }

.result { gap: 6px; }
.result .label { font-size: 14px; letter-spacing: .12em; opacity: .8; }
.result .top { font-size: clamp(28px, 5vw, 52px); font-weight: 800; margin: 6px 0 14px; }
.result .message { font-size: clamp(16px, 2.4vw, 24px); line-height: 1.7; max-width: 640px; }
.result .mosaic-placeholder {
  margin-top: 26px; border: 1px dashed rgba(255,255,255,.7);
  border-radius: 10px; padding: 18px 26px; font-size: 14px; opacity: .85;
}

.light-dot {
  width: 16px; height: 16px; border-radius: 50%;
  background: #FFD23F; box-shadow: 0 0 50px 18px rgba(255,210,63,.55);
  margin-bottom: 26px;
}
```

- [ ] **Step 6: (선택) git 초기화 + 첫 커밋**

```bash
git init
printf "node_modules\ndist\n.superpowers\n" > .gitignore
git add -A
git commit -m "chore: scaffold hueman System A (Vite + Vitest)"
```
> git을 쓰지 않으면 이 단계와 이후 모든 commit 단계를 건너뛴다.

---

## Task 2: `emotionColor.js` — 감정→색 (B 연동 지점)

**Files:**
- Create: `src/emotionColor.js`
- Test: `test/emotionColor.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/emotionColor.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { EMOTIONS, hexFor, gradientFor } from '../src/emotionColor.js';

describe('emotionColor', () => {
  it('maps each emotion to the spec hex', () => {
    expect(EMOTIONS.joy.hex).toBe('#FFD23F');
    expect(EMOTIONS.sad.hex).toBe('#3B7DD8');
    expect(EMOTIONS.anger.hex).toBe('#E03131');
    expect(EMOTIONS.numb.hex).toBe('#1A1A1A');
    expect(EMOTIONS.anxiety.hex).toBe('#FF8C2B');
    expect(EMOTIONS.surprise.hex).toBe('#2FB873');
  });

  it('excludes surprise from aggregation', () => {
    expect(EMOTIONS.surprise.aggregate).toBe(false);
    expect(EMOTIONS.joy.aggregate).toBe(true);
  });

  it('hexFor falls back to numb for unknown', () => {
    expect(hexFor('joy')).toBe('#FFD23F');
    expect(hexFor('???')).toBe('#1A1A1A');
  });

  it('gradientFor returns a radial-gradient string containing the hex', () => {
    expect(gradientFor('anxiety')).toContain('#FF8C2B');
    expect(gradientFor('anxiety')).toContain('radial-gradient');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/emotionColor.test.js`
Expected: FAIL (`Cannot find module '../src/emotionColor.js'`)

- [ ] **Step 3: 구현**

`src/emotionColor.js`:
```js
// 감정 키 → 색/카테고리. hueman 제안서 4장 표.
// aggregate=false 인 감정(놀람)은 위로 메시지 집계에서 제외한다.
// System B 는 나중에 실시간 웹캠 감정으로 이 색을 덮어쓴다.
export const EMOTIONS = {
  joy:      { label: '기쁨',   hex: '#FFD23F', category: 'joy',      aggregate: true },
  sad:      { label: '슬픔',   hex: '#3B7DD8', category: 'sad',      aggregate: true },
  anger:    { label: '분노',   hex: '#E03131', category: 'anger',    aggregate: true },
  numb:     { label: '무감각', hex: '#1A1A1A', category: 'numb',     aggregate: true },
  anxiety:  { label: '불안',   hex: '#FF8C2B', category: 'anxiety',  aggregate: true },
  surprise: { label: '놀람',   hex: '#2FB873', category: 'surprise', aggregate: false },
};

export function hexFor(emotion) {
  return (EMOTIONS[emotion] || EMOTIONS.numb).hex;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `rgb(${r}, ${g}, ${b})`;
}

export function gradientFor(emotion) {
  const hex = hexFor(emotion);
  return `radial-gradient(circle at 50% 40%, ${hex} 0%, ${shade(hex, -70)} 60%, ${shade(hex, -120)} 100%)`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/emotionColor.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: (선택) 커밋**

```bash
git add src/emotionColor.js test/emotionColor.test.js
git commit -m "feat: emotion-color mapping with aggregation flags"
```

---

## Task 3: `comfortMessages.js` — 위로 메시지 풀

**Files:**
- Create: `src/comfortMessages.js`
- Test: `test/comfortMessages.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/comfortMessages.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { messageFor, CATEGORY_LABELS } from '../src/comfortMessages.js';

describe('comfortMessages', () => {
  it('returns the joy message for joy', () => {
    expect(messageFor('joy')).toContain('행복할 자격');
  });
  it('returns the composite message for composite', () => {
    expect(messageFor('composite')).toContain('뒤섞인 마음');
  });
  it('falls back to composite for unknown category', () => {
    expect(messageFor('???')).toBe(messageFor('composite'));
  });
  it('has Korean labels for every category', () => {
    expect(CATEGORY_LABELS.numb).toBe('무감각');
    expect(CATEGORY_LABELS.composite).toBe('복합 감정');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/comfortMessages.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

`src/comfortMessages.js`:
```js
// 제안서 6장 위로 메시지 풀. 집계 카테고리 = 기쁨/슬픔/불안/분노/무감각 + 복합.
export const COMFORT_MESSAGES = {
  joy:       '그 빛나는 순간들이 진짜였다. 당신은 충분히 행복할 자격이 있다.',
  sad:       '많이 울었던 만큼, 많이 사랑했던 거다. 그 눈물은 약함이 아니었다.',
  anxiety:   '두려워하면서도 계속 나아갔다. 그것만으로도 충분히 용감했다.',
  anger:     '화가 났다는 건 포기하지 않았다는 뜻이다. 그 열기가 당신을 여기까지 데려왔다.',
  numb:      '아무것도 느끼지 못하는 것도, 느끼는 것이다. 당신은 충분히 지쳐 있었다.',
  composite: '그 뒤섞인 마음들이 모두 당신이다. 복잡해도 괜찮다. 인생이 원래 그렇다.',
};

export const CATEGORY_LABELS = {
  joy: '기쁨', sad: '슬픔', anxiety: '불안', anger: '분노', numb: '무감각', composite: '복합 감정',
};

export function messageFor(category) {
  return COMFORT_MESSAGES[category] || COMFORT_MESSAGES.composite;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/comfortMessages.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: (선택) 커밋**

```bash
git add src/comfortMessages.js test/comfortMessages.test.js
git commit -m "feat: comfort message pool and category labels"
```

---

## Task 4: `experienceLog.js` — 이벤트 기록 + 집계 (C 연동 지점)

**Files:**
- Create: `src/experienceLog.js`
- Test: `test/experienceLog.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/experienceLog.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { createLog, record, aggregate } from '../src/experienceLog.js';

function seed(events) {
  const log = createLog();
  for (const e of events) record(log, e);
  return log;
}

describe('experienceLog', () => {
  it('records events in order', () => {
    const log = seed([{ emotion: 'joy', durationMs: 100 }]);
    expect(log.events).toHaveLength(1);
  });

  it('picks the dominant category by total duration', () => {
    const log = seed([
      { emotion: 'joy', durationMs: 5000 },
      { emotion: 'sad', durationMs: 1000 },
    ]);
    const r = aggregate(log);
    expect(r.topCategory).toBe('joy');
    expect(r.isComposite).toBe(false);
    expect(r.message).toContain('행복할 자격');
  });

  it('excludes surprise from aggregation', () => {
    const log = seed([
      { emotion: 'surprise', durationMs: 9000 },
      { emotion: 'sad', durationMs: 1000 },
    ]);
    expect(aggregate(log).topCategory).toBe('sad');
  });

  it('returns composite when top two are close', () => {
    const log = seed([
      { emotion: 'joy', durationMs: 1000 },
      { emotion: 'sad', durationMs: 950 },
    ]);
    const r = aggregate(log);
    expect(r.isComposite).toBe(true);
    expect(r.message).toContain('뒤섞인 마음');
  });

  it('defaults to numb when nothing aggregable', () => {
    const log = seed([{ emotion: 'surprise', durationMs: 500 }]);
    expect(aggregate(log).topCategory).toBe('numb');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/experienceLog.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

`src/experienceLog.js`:
```js
import { EMOTIONS } from './emotionColor.js';
import { messageFor } from './comfortMessages.js';

// 체험 이벤트 형식: { sceneId, emotion, source: 'scene'|'webcam', durationMs, timestamp }
// 지금은 source='scene' 만. System B 가 같은 형식으로 'webcam' 이벤트를 추가한다.
export function createLog() {
  return { events: [] };
}

export function record(log, event) {
  log.events.push(event);
  return log;
}

const COMPOSITE_THRESHOLD = 0.2; // 1·2위 차가 1위의 20% 미만이면 복합 감정

export function aggregate(log) {
  const totals = {};
  for (const e of log.events) {
    const info = EMOTIONS[e.emotion];
    if (!info || !info.aggregate) continue; // 놀람/미지 감정 제외
    totals[info.category] = (totals[info.category] || 0) + (e.durationMs || 0);
  }

  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    return { topCategory: 'numb', secondCategory: null, isComposite: false, message: messageFor('numb'), totals };
  }

  const [topCategory, topVal] = ranked[0];
  const second = ranked[1] || null;
  const isComposite = !!second && (topVal - second[1]) / topVal < COMPOSITE_THRESHOLD;
  const category = isComposite ? 'composite' : topCategory;

  return {
    topCategory,
    secondCategory: second ? second[0] : null,
    isComposite,
    message: messageFor(category),
    totals,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/experienceLog.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: (선택) 커밋**

```bash
git add src/experienceLog.js test/experienceLog.test.js
git commit -m "feat: experience log recording and emotion aggregation"
```

---

## Task 5: `resolver.js` — 변형/배드엔딩 라우팅 (순수)

**Files:**
- Create: `src/resolver.js`
- Test: `test/resolver.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/resolver.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { applyEffects, matchesCondition, resolveNext } from '../src/resolver.js';

describe('applyEffects', () => {
  it('adds numbers and sets booleans without mutating input', () => {
    const flags = { deviation: 1 };
    const next = applyEffects(flags, { deviation: 1, dating: true });
    expect(next).toEqual({ deviation: 2, dating: true });
    expect(flags).toEqual({ deviation: 1 });
  });
});

describe('matchesCondition', () => {
  it('supports numeric operators', () => {
    expect(matchesCondition({ deviation: 2 }, { deviation: '>=2' })).toBe(true);
    expect(matchesCondition({ deviation: 1 }, { deviation: '>=2' })).toBe(false);
  });
  it('supports booleans and requires all keys', () => {
    expect(matchesCondition({ dating: true, warmth: 2 }, { dating: true, warmth: '>=1' })).toBe(true);
    expect(matchesCondition({ dating: false }, { dating: true })).toBe(false);
  });
});

describe('resolveNext', () => {
  it('returns a string next as-is', () => {
    expect(resolveNext('youth_daily', {})).toBe('youth_daily');
  });
  it('picks the first matching variant, else default', () => {
    const next = { variants: [
      { when: { warmth: '>=2' }, to: 'ending_warm' },
      { default: true, to: 'ending_lonely' },
    ]};
    expect(resolveNext(next, { warmth: 3 })).toBe('ending_warm');
    expect(resolveNext(next, { warmth: 0 })).toBe('ending_lonely');
  });
  it('routes to bad_ending when deviation crosses threshold', () => {
    const next = { variants: [
      { when: { deviation: '>=2' }, to: 'bad_ending' },
      { default: true, to: 'adolescence_rejoin' },
    ]};
    expect(resolveNext(next, { deviation: 2 })).toBe('bad_ending');
    expect(resolveNext(next, { deviation: 1 })).toBe('adolescence_rejoin');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/resolver.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

`src/resolver.js`:
```js
// 선택의 effects 를 flags 에 누적 적용하고, 누적 상태로 다음 씬을 고른다.
// next 는 문자열(직선) 또는 { variants: [{ when, to }, ..., { default: true, to }] }.
export function applyEffects(flags, effects = {}) {
  const next = { ...flags };
  for (const [k, v] of Object.entries(effects)) {
    if (typeof v === 'number') next[k] = (next[k] || 0) + v;
    else next[k] = v;
  }
  return next;
}

function matchOne(flagValue, cond) {
  if (typeof cond === 'boolean') return Boolean(flagValue) === cond;
  if (typeof cond === 'number') return (flagValue || 0) === cond;
  const m = String(cond).match(/^(>=|<=|>|<|==)?\s*(-?\d+)$/);
  if (!m) return false;
  const op = m[1] || '==';
  const n = Number(m[2]);
  const fv = flagValue || 0;
  switch (op) {
    case '>=': return fv >= n;
    case '<=': return fv <= n;
    case '>':  return fv > n;
    case '<':  return fv < n;
    default:   return fv === n;
  }
}

export function matchesCondition(flags, when = {}) {
  return Object.entries(when).every(([k, c]) => matchOne(flags[k], c));
}

export function resolveNext(next, flags) {
  if (typeof next === 'string') return next;
  if (next && Array.isArray(next.variants)) {
    const fallback = next.variants.find((v) => v.default);
    for (const v of next.variants) {
      if (!v.default && matchesCondition(flags, v.when)) return v.to;
    }
    return fallback ? fallback.to : null;
  }
  return null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/resolver.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: (선택) 커밋**

```bash
git add src/resolver.js test/resolver.test.js
git commit -m "feat: branch resolver with flag effects and variant routing"
```

---

## Task 6: `engine.js` — 상태머신

**Files:**
- Create: `src/engine.js`
- Test: `test/engine.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/engine.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { createEngine, current, choose, advance, isEnding } from '../src/engine.js';

const story = {
  start: 's0',
  scenes: {
    s0: { id: 's0', type: 'scene', text: '시작', emotion: 'joy', next: 's1' },
    s1: { id: 's1', type: 'choice', text: '고른다', emotion: 'anxiety', choices: [
      { label: '왼쪽', effects: { deviation: 2 }, next: { variants: [
        { when: { deviation: '>=2' }, to: 'bad' },
        { default: true, to: 'good' },
      ]}},
      { label: '오른쪽', effects: {}, next: 'good' },
    ]},
    good: { id: 'good', type: 'scene', text: '좋음', emotion: 'joy', next: 'fin' },
    bad:  { id: 'bad', type: 'scene', text: '나쁨', emotion: 'numb', next: 'fin' },
    fin:  { id: 'fin', type: 'ending', text: '끝', emotion: 'sad' },
  },
};

describe('engine', () => {
  it('starts at story.start', () => {
    const e = createEngine(story);
    expect(current(e).id).toBe('s0');
  });
  it('advance follows a scene next', () => {
    const e = createEngine(story);
    advance(e);
    expect(current(e).id).toBe('s1');
  });
  it('choose applies effects then routes by accumulated flags', () => {
    const e = createEngine(story);
    advance(e);            // s1
    choose(e, 0);          // deviation +2 -> bad
    expect(e.flags.deviation).toBe(2);
    expect(current(e).id).toBe('bad');
  });
  it('choose without effects routes to default target', () => {
    const e = createEngine(story);
    advance(e);
    choose(e, 1);
    expect(current(e).id).toBe('good');
  });
  it('isEnding detects ending scenes', () => {
    expect(isEnding({ type: 'ending' })).toBe(true);
    expect(isEnding({ type: 'scene' })).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/engine.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

`src/engine.js`:
```js
import { applyEffects, resolveNext } from './resolver.js';

// engine = { story, currentId, flags }
export function createEngine(story) {
  return { story, currentId: story.start, flags: {} };
}

export function current(engine) {
  return engine.story.scenes[engine.currentId];
}

export function isEnding(scene) {
  return scene.type === 'ending';
}

export function advance(engine) {
  const scene = current(engine);
  engine.currentId = resolveNext(scene.next, engine.flags);
  return current(engine);
}

export function choose(engine, index) {
  const scene = current(engine);
  const choice = scene.choices[index];
  engine.flags = applyEffects(engine.flags, choice.effects);
  engine.currentId = resolveNext(choice.next, engine.flags);
  return current(engine);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/engine.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: (선택) 커밋**

```bash
git add src/engine.js test/engine.test.js
git commit -m "feat: story state machine (advance/choose)"
```

---

## Task 7: `content/story.json` — 장면 그래프 + 무결성 테스트

**Files:**
- Create: `content/story.json`
- Test: `test/content.test.js`

- [ ] **Step 1: 무결성 테스트 작성 (먼저)**

`test/content.test.js`:
```js
import { describe, it, expect } from 'vitest';
import story from '../content/story.json';
import { EMOTIONS } from '../src/emotionColor.js';
import { resolveNext } from '../src/resolver.js';

const ids = Object.keys(story.scenes);

function targetsOf(scene) {
  const out = [];
  if (scene.type === 'choice') {
    for (const c of scene.choices) out.push(...variantTargets(c.next));
  } else if (scene.type !== 'ending') {
    out.push(...variantTargets(scene.next));
  }
  return out;
}
function variantTargets(next) {
  if (typeof next === 'string') return [next];
  if (next && next.variants) return next.variants.map((v) => v.to);
  return [];
}

describe('story.json integrity', () => {
  it('has a valid start scene', () => {
    expect(story.scenes[story.start]).toBeTruthy();
  });

  it('every scene has id/type/text/emotion with a known emotion', () => {
    for (const id of ids) {
      const s = story.scenes[id];
      expect(s.id, `${id}.id`).toBe(id);
      expect(['scene', 'choice', 'ending'], `${id}.type`).toContain(s.type);
      expect(typeof s.text, `${id}.text`).toBe('string');
      expect(EMOTIONS[s.emotion], `${id}.emotion=${s.emotion}`).toBeTruthy();
    }
  });

  it('every next/choice target points to an existing scene', () => {
    for (const id of ids) {
      for (const t of targetsOf(story.scenes[id])) {
        expect(ids, `${id} -> ${t}`).toContain(t);
      }
    }
  });

  it('choice scenes have exactly two choices with labels', () => {
    for (const id of ids) {
      const s = story.scenes[id];
      if (s.type !== 'choice') continue;
      expect(s.choices.length, `${id}.choices`).toBe(2);
      for (const c of s.choices) expect(typeof c.label).toBe('string');
    }
  });

  it('walking from start with all-left and all-right choices both reach an ending', () => {
    for (const pick of [0, 1]) {
      let id = story.start;
      let flags = {};
      const seen = new Set();
      while (true) {
        expect(seen.has(id), `loop at ${id}`).toBe(false);
        seen.add(id);
        const s = story.scenes[id];
        if (s.type === 'ending') break;
        if (s.type === 'choice') {
          const c = s.choices[pick] || s.choices[0];
          flags = { ...flags };
          for (const [k, v] of Object.entries(c.effects || {})) {
            flags[k] = typeof v === 'number' ? (flags[k] || 0) + v : v;
          }
          id = resolveNext(c.next, flags);
        } else {
          id = resolveNext(s.next, flags);
        }
        expect(id, 'dangling next').toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/content.test.js`
Expected: FAIL (`Cannot find module '../content/story.json'`)

- [ ] **Step 3: `content/story.json` 작성**

> 내레이션은 초안 품질이며 이후 사용자와 함께 다듬는다. 구조(분기·effects·emotion)는 확정 분기표를 따른다.

```json
{
  "start": "opening",
  "scenes": {
    "opening": { "id": "opening", "stage": "opening", "type": "scene", "emotion": "joy",
      "text": "암흑 속, 작은 빛 한 점이 점점 커진다.\n갓난아기의 울음과 함께 세상이 노랗게 밝아온다.\n가족의 손들이 너를 감싼다." , "next": "infancy_daily" },

    "infancy_daily": { "id": "infancy_daily", "stage": "infancy", "type": "scene", "emotion": "joy",
      "text": "옹알이를 하고, 기어다니고, 소파에 처음으로 낙서를 한다.\n세상은 온통 처음이다.", "next": "infancy_cry_choice" },
    "infancy_cry_choice": { "id": "infancy_cry_choice", "stage": "infancy", "type": "choice", "emotion": "anxiety",
      "text": "넘어져 무릎이 까졌다. 울음이 차오른다.", "choices": [
        { "label": "운다", "effects": {}, "next": "infancy_cry_yes" },
        { "label": "참는다", "effects": {}, "next": "infancy_cry_no" }
      ]},
    "infancy_cry_yes": { "id": "infancy_cry_yes", "stage": "infancy", "type": "scene", "emotion": "joy",
      "text": "으앙— 울음을 터뜨리자 가족들이 달려와 안아준다.\n웃음과 박수가 쏟아진다.", "next": "childhood_daily" },
    "infancy_cry_no": { "id": "infancy_cry_no", "stage": "infancy", "type": "scene", "emotion": "numb",
      "text": "이를 악물고 울음을 삼킨다.\n아무도 모른 채 그 순간은 지나간다.", "next": "childhood_daily" },

    "childhood_daily": { "id": "childhood_daily", "stage": "childhood", "type": "scene", "emotion": "anxiety",
      "text": "엄마 손을 잡고 유치원에 가고, 받아쓰기 시험을 치고,\n드디어 체육대회 날이 밝았다.", "next": "childhood_fall_choice" },
    "childhood_fall_choice": { "id": "childhood_fall_choice", "stage": "childhood", "type": "choice", "emotion": "anxiety",
      "text": "달리기 결승선 직전, 발이 엉켜 넘어졌다. 무릎이 아리다.", "choices": [
        { "label": "손을 내민다", "effects": { "warmth": 1 }, "next": "childhood_fall_helped" },
        { "label": "혼자 일어선다", "effects": {}, "next": "childhood_fall_alone" }
      ]},
    "childhood_fall_helped": { "id": "childhood_fall_helped", "stage": "childhood", "type": "scene", "emotion": "joy",
      "text": "누군가 달려와 손을 잡아준다. 따뜻한 손.\n다시 일어나 함께 결승선을 넘는다.", "next": "adolescence_daily" },
    "childhood_fall_alone": { "id": "childhood_fall_alone", "stage": "childhood", "type": "scene", "emotion": "sad",
      "text": "아무에게도 기대지 않고 혼자 일어선다.\n텅 빈 운동장이 유난히 넓다.", "next": "adolescence_daily" },

    "adolescence_daily": { "id": "adolescence_daily", "stage": "adolescence", "type": "scene", "emotion": "joy",
      "text": "교실, 짝꿍, 졸린 오후 수업, 친구들과의 시끌벅적한 하교.", "next": "adolescence_confess_choice" },
    "adolescence_confess_choice": { "id": "adolescence_confess_choice", "stage": "adolescence", "type": "choice", "emotion": "anxiety",
      "text": "누군가 너에게 고백한다.\n\"나랑 사귈래?\"", "choices": [
        { "label": "사귄다", "effects": { "dating": true }, "next": "adolescence_dating" },
        { "label": "거절한다", "effects": {}, "next": "adolescence_single" }
      ]},
    "adolescence_dating": { "id": "adolescence_dating", "stage": "adolescence", "type": "scene", "emotion": "anxiety",
      "text": "설렘과 다툼이 오가는 첫 연애.\n교복을 입고 손을 잡고 걷는다.", "next": "adolescence_smoke_choice" },
    "adolescence_single": { "id": "adolescence_single", "stage": "adolescence", "type": "scene", "emotion": "numb",
      "text": "혼자 밥을 먹고, 독서실에 앉는다.\n덤덤한 나날이 흐른다.", "next": "adolescence_smoke_choice" },

    "adolescence_smoke_choice": { "id": "adolescence_smoke_choice", "stage": "adolescence", "type": "choice", "emotion": "anxiety",
      "text": "쉬는 시간, 친구가 슬그머니 담배를 내민다.\n\"한 대 할래?\"", "choices": [
        { "label": "받아들인다", "effects": { "deviation": 1 }, "next": "adolescence_deviant_1" },
        { "label": "거절한다", "effects": {}, "next": "adolescence_model_1" }
      ]},

    "adolescence_deviant_1": { "id": "adolescence_deviant_1", "stage": "adolescence", "type": "scene", "emotion": "anger",
      "text": "담배, 게임, 늦은 귀가가 쌓여간다.\n집과 부딪히는 날이 늘어난다.", "next": "adolescence_deviant_choice2" },
    "adolescence_deviant_choice2": { "id": "adolescence_deviant_choice2", "stage": "adolescence", "type": "choice", "emotion": "anger",
      "text": "부모님이 처음으로 크게 화를 냈다.\n더 멀리 나갈까, 여기서 멈출까.", "choices": [
        { "label": "집을 나간다", "effects": { "deviation": 1 }, "next": "adolescence_family_counsel" },
        { "label": "멈칫한다", "effects": {}, "next": "adolescence_family_counsel" }
      ]},
    "adolescence_family_counsel": { "id": "adolescence_family_counsel", "stage": "adolescence", "type": "scene", "emotion": "sad",
      "text": "결국 온 가족이 마주 앉아 상담을 받게 된다.",
      "next": { "variants": [
        { "when": { "deviation": ">=2" }, "to": "bad_ending" },
        { "default": true, "to": "adolescence_rejoin" }
      ]}},
    "adolescence_rejoin": { "id": "adolescence_rejoin", "stage": "adolescence", "type": "scene", "emotion": "sad",
      "text": "그날의 눈물 이후, 조금씩 마음을 다잡는다.", "next": "youth_daily" },

    "adolescence_model_1": { "id": "adolescence_model_1", "stage": "adolescence", "type": "scene", "emotion": "anxiety",
      "text": "야간자율학습, 모의고사, 그리고 수능.\n끝없는 공부의 터널.", "next": "adolescence_model_2" },
    "adolescence_model_2": { "id": "adolescence_model_2", "stage": "adolescence", "type": "scene", "emotion": "joy",
      "text": "대학 합격 발표. 입학식, 새 친구들, 첫 MT.", "next": "youth_daily" },

    "bad_ending": { "id": "bad_ending", "stage": "ending", "type": "scene", "emotion": "numb",
      "text": "이야기는 여기서 멈춘다.\n하지만 끝이 빠르다고 해서, 틀린 길이었던 것은 아니다.", "next": "art_ending" },

    "youth_daily": { "id": "youth_daily", "stage": "youth", "type": "scene", "emotion": "joy",
      "text": "대학과 군대, 연애와 첫 취업.\n술자리와 여행으로 가득한 청춘.", "next": "youth_conflict_choice" },
    "youth_conflict_choice": { "id": "youth_conflict_choice", "stage": "youth", "type": "choice", "emotion": "anger",
      "text": "진로를 두고 부모님과 크게 부딪힌다.\n내 길을 갈까, 부모님 뜻을 따를까.", "choices": [
        { "label": "내가 원하는 길", "effects": { "conflict": 1 }, "next": "youth_conflict" },
        { "label": "부모님이 원하는 길", "effects": { "adapt": 1 }, "next": "youth_adapt" }
      ]},
    "youth_conflict": { "id": "youth_conflict", "stage": "youth", "type": "scene", "emotion": "anger",
      "text": "내 고집대로 길을 간다.\n자유롭지만, 부모와는 멀어진다.", "next": "midlife_marriage_choice" },
    "youth_adapt": { "id": "youth_adapt", "stage": "youth", "type": "scene", "emotion": "sad",
      "text": "부모님 뜻을 따른다.\n안정되었지만 어딘가 조금 비어 있다.", "next": "midlife_marriage_choice" },

    "midlife_marriage_choice": { "id": "midlife_marriage_choice", "stage": "midlife", "type": "choice", "emotion": "anxiety",
      "text": "함께 늙어갈 사람을 만났다.\n같이 살아갈까, 혼자의 삶을 택할까.", "choices": [
        { "label": "결혼한다", "effects": { "warmth": 1 }, "next": "midlife_married" },
        { "label": "혼자 산다", "effects": {}, "next": "midlife_single" }
      ]},
    "midlife_married": { "id": "midlife_married", "stage": "midlife", "type": "scene", "emotion": "joy",
      "text": "결혼, 직장, 육아의 무게.\n웃음과 다툼이 뒤섞인 하루하루.", "next": "elder_entry" },
    "midlife_single": { "id": "midlife_single", "stage": "midlife", "type": "scene", "emotion": "numb",
      "text": "혼자의 삶을 택한다.\n자유롭지만, 집은 늘 고요하다.", "next": "elder_entry" },

    "elder_entry": { "id": "elder_entry", "stage": "elder", "type": "scene", "emotion": "sad",
      "text": "세월이 흐르고, 곁을 지키던 사람을 먼저 떠나보낸다.", "next": "elder_distance_choice" },
    "elder_distance_choice": { "id": "elder_distance_choice", "stage": "elder", "type": "choice", "emotion": "sad",
      "text": "자식과의 거리.\n함께 살까, 혼자 지낼까.", "choices": [
        { "label": "함께 산다", "effects": { "warmth": 1 }, "next": "elder_illness" },
        { "label": "혼자 지낸다", "effects": {}, "next": "elder_illness" }
      ]},
    "elder_illness": { "id": "elder_illness", "stage": "elder", "type": "scene", "emotion": "sad",
      "text": "어느 날, 몸속에서 암을 발견한다.", "next": "elder_death" },
    "elder_death": { "id": "elder_death", "stage": "elder", "type": "scene", "emotion": "numb",
      "text": "그리고 끝내, 죽음을 맞이한다.",
      "next": { "variants": [
        { "when": { "warmth": ">=2" }, "to": "ending_warm" },
        { "default": true, "to": "ending_lonely" }
      ]}},
    "ending_warm": { "id": "ending_warm", "stage": "ending", "type": "scene", "emotion": "joy",
      "text": "곁에는 사람들이 있었다.\n손을 잡힌 채, 천천히 눈을 감는다.", "next": "art_ending" },
    "ending_lonely": { "id": "ending_lonely", "stage": "ending", "type": "scene", "emotion": "sad",
      "text": "홀로, 조용한 방에서 눈을 감는다.", "next": "art_ending" },

    "art_ending": { "id": "art_ending", "stage": "ending", "type": "ending", "emotion": "joy",
      "text": "기뻤던 순간도, 두려웠던 순간도,\n슬프고 후회하고 멍했던 순간도.\n전부 다 네가 살아있었다는 뜻이다.\n불필요한 감정은 없었다. 그 모든 감정이, 너였다." }
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/content.test.js`
Expected: PASS (5 tests). 실패 시 메시지의 씬 id를 보고 dangling/잘못된 emotion 을 수정.

- [ ] **Step 5: (선택) 커밋**

```bash
git add content/story.json test/content.test.js
git commit -m "feat: System A story graph with branch table and integrity tests"
```

---

## Task 8: `ui.js` — 장면 렌더 + 입력

**Files:**
- Create: `src/ui.js`
- Test: `test/ui.test.js`

- [ ] **Step 1: 실패하는 테스트 작성 (jsdom)**

`test/ui.test.js`:
```js
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderScene, showResult } from '../src/ui.js';

describe('ui.renderScene', () => {
  it('renders narration text for a scene', () => {
    const root = document.createElement('div');
    renderScene(root, { type: 'scene', text: '안녕', emotion: 'joy' }, {});
    expect(root.textContent).toContain('안녕');
  });

  it('renders two buttons for a choice and fires onChoice', () => {
    const root = document.createElement('div');
    const onChoice = vi.fn();
    renderScene(root, {
      type: 'choice', text: '고르기', emotion: 'anxiety',
      choices: [{ label: '왼' }, { label: '오' }],
    }, { onChoice });
    const btns = root.querySelectorAll('.choice-btn');
    expect(btns).toHaveLength(2);
    btns[0].click();
    expect(onChoice).toHaveBeenCalledWith(0);
  });
});

describe('ui.showResult', () => {
  it('shows the dominant label, message, and mosaic placeholder', () => {
    const root = document.createElement('div');
    showResult(root, { topCategory: 'joy', isComposite: false, message: '메시지다' });
    expect(root.textContent).toContain('기쁨');
    expect(root.textContent).toContain('메시지다');
    expect(root.textContent).toContain('모자이크');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/ui.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

`src/ui.js`:
```js
import { gradientFor } from './emotionColor.js';
import { CATEGORY_LABELS } from './comfortMessages.js';

let keyHandler = null;

function clearKeys() {
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }
}

function mount(root, sceneEl, emotion) {
  clearKeys();
  root.innerHTML = '';
  sceneEl.classList.add('scene');
  sceneEl.style.background = gradientFor(emotion);
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
    const keys = [['1', '←'], ['2', '→']];
    scene.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `${c.label}<span class="choice-key">[${keys[i][0]}] 또는 ${keys[i][1]}</span>`;
      btn.addEventListener('click', () => onChoice && onChoice(i));
      wrap.appendChild(btn);
    });
    el.appendChild(wrap);
    mount(root, el, scene.emotion);

    keyHandler = (e) => {
      if (e.key === '1' || e.key === 'ArrowLeft') onChoice && onChoice(0);
      else if (e.key === '2' || e.key === 'ArrowRight') onChoice && onChoice(1);
    };
    document.addEventListener('keydown', keyHandler);
  } else {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = '클릭 · Space · Enter 로 계속';
    el.appendChild(hint);
    el.addEventListener('click', () => onAdvance && onAdvance());
    mount(root, el, scene.emotion);

    keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') onAdvance && onAdvance();
    };
    document.addEventListener('keydown', keyHandler);
  }
}

export function showResult(root, result) {
  clearKeys();
  const el = document.createElement('div');
  el.className = 'scene result';
  const label = result.isComposite ? CATEGORY_LABELS.composite : (CATEGORY_LABELS[result.topCategory] || '감정');
  el.innerHTML = `
    <div class="label">당신의 인생을 가장 많이 채운 감정</div>
    <div class="top">${label}</div>
    <div class="message">${result.message}</div>
    <div class="mosaic-placeholder">🖼 여기에 사진 모자이크가 들어갑니다 — System C</div>
  `;
  mount(root, el, result.isComposite ? 'sad' : result.topCategory);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/ui.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: (선택) 커밋**

```bash
git add src/ui.js test/ui.test.js
git commit -m "feat: scene/result renderer with keyboard and click input"
```

---

## Task 9: `main.js` — 흐름 제어 + 통합 실행

**Files:**
- Create: `src/main.js`

- [ ] **Step 1: 구현**

`src/main.js`:
```js
import story from '../content/story.json';
import { createEngine, current, choose, advance, isEnding } from './engine.js';
import { renderScene, showResult } from './ui.js';
import { createLog, record, aggregate } from './experienceLog.js';

const root = document.getElementById('app');
const engine = createEngine(story);
const log = createLog();
let enteredAt = Date.now();

function logCurrent() {
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

function show() {
  const scene = current(engine);
  if (isEnding(scene)) {
    // 작품 엔딩(공통) 내레이션을 먼저 보여주고, 클릭하면 결과 화면으로
    renderScene(root, scene, {
      onAdvance: () => {
        logCurrent();
        showResult(root, aggregate(log));
      },
    });
    return;
  }
  renderScene(root, scene, {
    onAdvance: () => { logCurrent(); advance(engine); show(); },
    onChoice: (i) => { logCurrent(); choose(engine, i); show(); },
  });
}

show();
```

- [ ] **Step 2: 전체 테스트 통과 확인**

Run: `npx vitest run`
Expected: PASS (모든 테스트: emotionColor 4, comfortMessages 4, experienceLog 5, resolver 5, engine 5, content 5, ui 3)

- [ ] **Step 3: 개발 서버로 수동 검증**

Run: `npm run dev` → 브라우저에서 표시된 localhost 열기.
다음을 눈으로 확인:
1. 오프닝(노란빛 그라데이션 + 텍스트)이 뜨고, 클릭/Space 로 다음 장면 진행.
2. 선택 장면에서 버튼 2개가 뜨고, 클릭과 `1`/`2`(또는 `←`/`→`) 둘 다 동작.
3. **모범 경로**(담배 거절)로 끝까지 → 작품 엔딩 내레이션 → 결과 카드(최빈 감정 + 위로 메시지 + 모자이크 자리).
4. **배드엔딩 경로**: 담배 받아들이기 → "집을 나간다" → 가족상담 후 곧바로 `bad_ending` → 작품 엔딩으로 동일하게 닫힘(서사는 짧지만 마무리 구조 동일).
5. 장면 전환 시 배경색이 해당 감정 색으로 부드럽게 바뀜.

- [ ] **Step 4: (선택) 커밋**

```bash
git add src/main.js
git commit -m "feat: wire flow controller — opening to common art ending"
```

---

## 자체 검토 결과 (작성자 확인)

- **Spec 커버리지:** 분기 모델 C(resolver+engine+story) ✓ / 감정-색상표(emotionColor) ✓ / 누적 분기·배드엔딩 임계치(resolver variants, story `family_counsel`) ✓ / 공통 작품 엔딩(`art_ending` + main) ✓ / 집계→위로 메시지(experienceLog+comfortMessages) ✓ / B·C 연동 자리(emotionColor의 source, experienceLog 이벤트 형식, 모자이크 placeholder) ✓ / Vite+Vitest ✓ / 콘텐츠 범위(오프닝+6단계+엔딩) ✓.
- **Placeholder 스캔:** 내레이션은 실제 한국어로 채워 실행 가능(이후 다듬기는 정상 작업). 모자이크 placeholder 는 System C 경계로 의도된 것.
- **타입 일관성:** `EMOTIONS`(key→{label,hex,category,aggregate}), `messageFor(category)`, `createLog/record/aggregate`, `applyEffects/matchesCondition/resolveNext`, `createEngine/current/choose/advance/isEnding`, `renderScene/showResult` — Task 간 시그니처·속성명 일치 확인.

## 향후 (이 계획 범위 밖)
- 사운드(아기 울음 등) placeholder → 실제 오디오.
- System B: 웹캠 표정 인식 → 실시간 색 필터(emotionColor.gradientFor 재사용) + `source:'webcam'` 이벤트 추가.
- System C: 입장 기준컷 촬영 + 표정 스냅샷 → 포토 모자이크 합성(결과 카드 placeholder 대체).
- 내레이션 톤·분량 다듬기.

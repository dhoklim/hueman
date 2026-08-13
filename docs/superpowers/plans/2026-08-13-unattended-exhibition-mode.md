# 무인 전시 모드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** hueman이 무인 iPad 전시에서 대기 화면을 유지하고, 관람자 입력이 없으면 카메라·QR·모자이크를 안전하게 정리해 다음 관람자용 첫 화면으로 돌아가게 한다.

**Architecture:** `src/kioskMode.js`는 전역 입력·idle 시간·10초 종료 카운트다운만 관리하는 순수한 브라우저 경계다. `src/ui.js`는 대기 화면과 카운트다운을 그리고, `src/main.js`는 현재 체험 단계를 `attract`·`session`·`result`로 알려 주며 timeout 때 스트림을 중지하고 새로고침한다. 대기 화면의 공동 감정 벽은 기존 `wall.html`을 pointer-events 없는 iframe으로 재사용한다.

**Tech Stack:** Vite 8, JavaScript ES modules, Vitest 4 + jsdom, 기존 Cloudflare 공동 감정 벽 정적 페이지.

**Status (2026-08-13):** 구현 및 병합 검증 완료 — `npm test` 248개와 `npm run build`를 순차 통과했고, production bundle에서 대기 화면과 초기화 안내 문구를 확인했다.

## Global Constraints

- `attract` 단계는 자동 종료하지 않는다. `session`은 60,000ms, `result`는 120,000ms 무입력 뒤에 종료 10초 전 안내를 시작한다.
- `pointerdown`, `touchstart`, `keydown` 중 하나가 있으면 남은 카운트다운을 취소하고 해당 단계의 전체 idle 시간을 다시 부여한다.
- 종료 시간에는 `stopLiveEmotion()`·`resetSnapshots()` 후 `window.location.reload()`를 호출한다. 이 경로는 결과의 `다시 하기`와 `Shift+R`에도 공유한다.
- 대기 화면은 작품 소개와 기존 `wall.html`을 보여 주되, 벽 연결 실패가 시작 동작을 막지 않으며 iframe은 입력을 가로채지 않는다.
- 모든 새 인터랙션은 iPad safe area와 최소 48px 터치 영역을 사용한다. 원본 얼굴·사진·선택 경로·식별자를 새로 전송하거나 저장하지 않는다.
- 테스트와 production build는 `dist/` 경합을 피하기 위해 순차로 실행한다.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/kioskMode.js` | phase별 idle timer, 전역 활동 감지, countdown lifecycle, cleanup |
| `test/kioskMode.test.js` | session/result duration, 취소·재시작, attract, destroy의 결정적 fake-timer 회귀 |
| `src/ui.js` | 대기 화면과 full-screen 자동 초기화 안내 UI |
| `styles/main.css` | 공동 감정 벽 배경, countdown card, iPad safe-area/touch layout |
| `test/ui.test.js` | 대기 화면 activate와 countdown UI contract |
| `src/main.js` | exhibition 단계 배선, camera cleanup + shared reset path |
| `test/mainLiveEmotion.test.js` | 실제 앱 초기 대기 화면, 60초 session, 120초 result wiring 회귀 |
| `docs/superpowers/specs/2026-08-13-unattended-exhibition-mode-design.md` | 승인된 관람 흐름 |

### Task 1: phase-aware kiosk timer를 TDD로 만든다

**Files:**

- Create: `src/kioskMode.js`
- Create: `test/kioskMode.test.js`

**Interfaces:**

```js
export const SESSION_IDLE_MS = 60_000;
export const RESULT_IDLE_MS = 120_000;
export const RESET_COUNTDOWN_SECONDS = 10;

export function createKioskMode({
  onCountdown,
  onReset,
  documentRef = document,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
} = {}) {
  return { setPhase(phase), noteActivity(), destroy() };
}
```

- [ ] **Step 1: fake timer 기반의 실패 테스트를 작성한다.**

`test/kioskMode.test.js`에서 `vi.useFakeTimers()`와 jsdom document를 쓰고, `onCountdown`이 `{ setSeconds, remove }`를 반환하는 real in-memory UI fake를 만든다. 다음 observer-visible behavior를 literal time으로 명시한다.

```js
it('warns after 50 seconds of a session then resets ten seconds later', () => {
  const { kiosk, countdowns, resets } = createHarness();
  kiosk.setPhase('session');

  vi.advanceTimersByTime(50_000);
  expect(countdowns).toEqual([10]);
  vi.advanceTimersByTime(10_000);

  expect(resets).toBe(1);
});

it('gives a QR/result viewer 110 seconds before the warning', () => {
  const { kiosk, countdowns } = createHarness();
  kiosk.setPhase('result');

  vi.advanceTimersByTime(109_999);
  expect(countdowns).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(countdowns).toEqual([10]);
});
```

같은 파일에 attract phase에서 5분이 지나도 안내·reset이 없는 테스트, `pointerdown`이 보이는 countdown을 제거하고 새 50초를 부여하는 테스트, `keydown`과 `touchstart`가 같은 contract를 따르는 parameterized 테스트, `destroy()` 뒤 timer와 document 입력이 아무 행동도 하지 않는 테스트를 추가한다.

- [ ] **Step 2: target test가 모듈 import 실패로 RED인지 확인한다.**

Run: `npm test -- test/kioskMode.test.js`

Expected: `Failed to resolve import "../src/kioskMode.js"`.

- [ ] **Step 3: 최소 timer controller를 구현한다.**

`src/kioskMode.js`에 세 상수를 export한다. `setPhase('attract')`는 timer와 기존 countdown을 제거한다. `setPhase('session')`와 `setPhase('result')`는 현재 countdown을 제거하고 각각 `idleMs - RESET_COUNTDOWN_SECONDS * 1000` 후 `onCountdown({ seconds: 10, onContinue: noteActivity })`를 호출한다. 이후 1초씩 `setSeconds(9)`부터 `setSeconds(0)`까지 갱신한 뒤 `onReset()`을 한 번 호출한다. `noteActivity()`와 document `pointerdown`·`touchstart`·`keydown` handler는 active phase의 timer를 처음부터 다시 arm한다. `destroy()`는 all timer, countdown UI, all three listeners를 제거한다.

- [ ] **Step 4: target test가 GREEN인지 확인한다.**

Run: `npm test -- test/kioskMode.test.js`

Expected: session/result boundary, activity reset, attract, destroy tests 모두 PASS.

- [ ] **Step 5: timer boundary를 커밋한다.**

```bash
git add src/kioskMode.js test/kioskMode.test.js
git commit -m "feat: add unattended exhibition timer"
```

### Task 2: 대기 화면과 reset countdown UI를 TDD로 만든다

**Files:**

- Modify: `src/ui.js`
- Modify: `styles/main.css`
- Modify: `test/ui.test.js`

**Interfaces:**

```js
export function renderAttract(root, { onActivate } = {});
export function renderKioskCountdown({ seconds, onContinue } = {});
// returns { setSeconds(number), remove() }
```

- [ ] **Step 1: 화면 contract의 실패 테스트를 추가한다.**

`test/ui.test.js`에 다음 동작을 추가한다.

```js
it('shows the artwork and the live wall behind a touch-to-begin attraction screen', () => {
  const root = document.createElement('div');
  let activations = 0;
  renderAttract(root, { onActivate: () => { activations += 1; } });

  expect(root.textContent).toContain('모든 감정의 색');
  expect(root.querySelector('.attract-wall').getAttribute('src')).toMatch(/wall\.html$/);
  root.querySelector('.attract-activate').click();
  expect(activations).toBe(1);
});

it('lets a visitor keep viewing by dismissing the reset countdown', () => {
  let continued = 0;
  const countdown = renderKioskCountdown({ seconds: 10, onContinue: () => { continued += 1; } });
  countdown.setSeconds(4);
  expect(document.body.textContent).toContain('4초 후 처음으로 돌아갑니다');
  document.querySelector('.kiosk-reset-continue').click();
  expect(continued).toBe(1);
});
```

추가로 countdown `remove()` 뒤에는 overlay가 document에서 제거되고, 새 countdown이 기존 overlay를 중복하지 않는지를 검사한다.

- [ ] **Step 2: UI test가 export 부재로 RED인지 확인한다.**

Run: `npm test -- test/ui.test.js`

Expected: `renderAttract is not a function` 또는 `renderKioskCountdown is not a function`.

- [ ] **Step 3: UI와 iPad styles를 최소 구현한다.**

`renderAttract`는 `attract scene`, `iframe.attract-wall`, artwork copy, `button.attract-activate`를 만들며 iframe에 `aria-hidden="true"`, `tabindex="-1"`, `src="${import.meta.env.BASE_URL}wall.html"`를 부여한다. foreground button click·Space·Enter는 `onActivate`를 once 호출한다. `renderKioskCountdown`는 기존 QR overlay보다 높은 z-index의 `.kiosk-reset-overlay`를 하나만 만들고, seconds label과 `.kiosk-reset-continue` button을 제공한다.

`styles/main.css`에는 `.attract-wall { pointer-events: none; }`, dark gradient veil, safe-area `padding`, countdown button `min-height: 48px`, 작은 화면의 readable type rule을 추가한다. 배경 wall iframe이 실패해도 foreground copy/button이 보이도록 opaque gradient를 둔다.

- [ ] **Step 4: UI test가 GREEN인지 확인한다.**

Run: `npm test -- test/ui.test.js`

Expected: 기존 결과/QR/camera 회귀와 새 대기·countdown tests 모두 PASS.

- [ ] **Step 5: visual UI boundary를 커밋한다.**

```bash
git add src/ui.js styles/main.css test/ui.test.js
git commit -m "feat: add exhibition attract and reset screens"
```

### Task 3: 앱 단계·카메라 cleanup·QR 결과 duration을 TDD로 연결한다

**Files:**

- Modify: `src/main.js`
- Modify: `test/mainLiveEmotion.test.js`

**Interfaces:**

- Consumes: `createKioskMode`, `renderAttract`, `renderKioskCountdown`, existing `stopLiveEmotion`, `resetSnapshots`, `renderIntro`, `showResult`, and `openQrTransferModal`.
- Produces: first page is attraction screen; 60-second active session and 120-second final result behavior; one shared `resetExperience()` path.

- [ ] **Step 1: real app wiring의 실패 테스트를 작성한다.**

`test/mainLiveEmotion.test.js`의 jsdom suite에 `activateIntro()` helper를 추가해 기존 intro-first tests가 대기 화면을 한 번 활성화한 뒤 같은 경로를 계속 검사하게 한다. `afterEach` 첫 부분에서는 `window.dispatchEvent(new Event('pagehide'))`로 이전 main module의 document-level kiosk listener를 정리한다. 이어서 fake timers를 사용하는 test를 추가한다. App import 직후 `.attract`와 `.attract-wall`이 보이고 activation 후 `.intro`가 보이는지 확인한다. 카메라 없이 시작해 story scene에 진입한 다음 50,000ms에서 `.kiosk-reset-overlay`가 보이는지 확인한다. 별도 test는 같은 flow로 result까지 진행해 109,999ms에는 overlay가 없고 1ms 뒤 overlay가 보이는지를 확인한다. Each test ends before 10-second countdown reaches zero so jsdom navigation is not involved.

- [ ] **Step 2: 새 app tests가 기존 intro-first rendering 때문에 RED인지 확인한다.**

Run: `npm test -- test/mainLiveEmotion.test.js`

Expected: initial `.attract` selector가 없거나 session/result idle overlay expectation이 FAIL.

- [ ] **Step 3: main orchestration을 구현한다.**

Add the imports and create a single `resetExperience()`:

```js
let kiosk = null;

function resetExperience() {
  kiosk?.destroy();
  stopLiveEmotion();
  resetSnapshots();
  window.location.reload();
}

kiosk = createKioskMode({
  onCountdown: renderKioskCountdown,
  onReset: resetExperience,
});
```

Create `showIntro()` that sets `session` then calls `renderIntro`, and `showAttract()` that sets `attract` then calls `renderAttract({ onActivate: showIntro })`. Start with `showAttract()` instead of direct `renderIntro`. Keep `session` active in `begin()` and `show()`, switch to `result` immediately after `showResult`, and call `kiosk.noteActivity()` before QR modal creation. Supply `resetExperience` to result `onRestart` and the existing `Shift+R` handler. Register a one-shot `pagehide` handler to `kiosk.destroy()` so module re-entry and navigation do not leave document listeners alive.

- [ ] **Step 4: main integration test가 GREEN인지 확인한다.**

Run: `npm test -- test/mainLiveEmotion.test.js`

Expected: camera capture/calibration/tint/wall publish regressions and new attract/session/result idle tests all PASS.

- [ ] **Step 5: app orchestration을 커밋한다.**

```bash
git add src/main.js test/mainLiveEmotion.test.js
git commit -m "feat: enable unattended exhibition resets"
```

### Task 4: full verification, iPad checklist, and release records

**Files:**

- Modify: `.agents/coordination/current-state.md`
- Modify: `.agents/coordination/inbox.md`
- Modify: `.agents/coordination/locks.md`
- Modify: `.agents/coordination/session-log.md`

- [ ] **Step 1: run static and full behavior verification sequentially.**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `npm test`

Expected: all test files, including build layout, PASS. Do not run `npm run build` at the same time because build layout uses the same `dist/` directory.

Run: `npm run build`

Expected: index, receiver, and wall pages emit successfully; the existing face-api chunk-size warning is allowed.

- [ ] **Step 2: inspect the local production bundle.**

Run: `rg -n -F '새 관람자를 위해' dist/assets`

Expected: compiled main bundle contains the countdown copy.

Run: `rg -n -F 'wall.html' dist/assets`

Expected: compiled main bundle retains the attraction wall URL.

- [ ] **Step 3: update records and release the coordination lock.**

Add only short project facts: the two idle durations, 10-second cancellable reset, shared camera cleanup, and attraction wall. Record the test/build evidence in `session-log.md`, add a resolved inbox note, and replace the lock with `_None_`.

- [ ] **Step 4: commit records, integrate, push, and check Pages.**

```bash
git add .agents/coordination docs/superpowers
git commit -m "chore: record unattended exhibition release"
git push origin main
```

After the GitHub Pages workflow reports success, request the public index and its current main JS asset with no-cache headers. Verify the loaded asset contains `새 관람자를 위해` and `wall.html`.

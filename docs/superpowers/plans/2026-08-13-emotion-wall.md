# 공동 감정 벽 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPad 체험의 최종 대표 감정 하나를 익명 일일 합계로 보내고, 별도 전시 화면에서 그 합계를 추상적인 색 풍경으로 보여 준다.

**Architecture:** 기존 QR Cloudflare Worker에 SQLite Durable Object `EmotionWall`을 선언한다. Worker만 KST 날짜를 결정하고, 한 날짜의 Object가 다섯 감정의 정수 합계만 직렬로 갱신한다. iPad는 결과 계산 뒤 무시 가능한 비동기 `POST`를 보내며, `wall.html`은 같은 Worker의 snapshot을 4초마다 읽어 마지막 성공 상태를 캔버스와 접근 가능한 텍스트로 렌더링한다.

**Tech Stack:** Vite 8, JavaScript ES modules, Vitest 4 + jsdom, Cloudflare Workers, Durable Objects SQLite, GitHub Pages.

## Global Constraints

- 공동 벽에는 `joy`, `sad`, `anger`, `numb`, `anxiety` 중 하나만 전송·저장한다. `surprise`, `composite`, 원본 표정 수치, 선택 경로, 사진, 캔버스, 토큰, 브라우저 식별자, 클라이언트 날짜·시간은 절대 보내지 않는다.
- Worker는 KST 날짜별로 독립된 Durable Object를 고르고, 각 snapshot은 `{ day, total, counts, updatedAt }`만 보유한다.
- 유효하지 않은 JSON, Content-Type, 감정은 400, 허용되지 않은 Origin은 403, Durable Object 실패는 503 `wall-unavailable`, 일일 10,000건 상한은 429 `wall-full`이다.
- 기존 사진 전송 API와 R2 만료 정리는 바꾸지 않는다. 1분 Cron은 KST 00:05에 여덟 일 전 snapshot 하나의 저장값만 삭제한다.
- iPad 결과·QR·모자이크 흐름은 벽 API 미설정, 네트워크 실패, HTTP 오류와 무관하게 계속 진행한다.
- `wall.html`은 `prefers-reduced-motion`을 존중하고, 0건·연결 실패 상태를 텍스트로 설명하며, 마지막 성공 풍경을 지우지 않는다.
- 모든 새 동작은 실제 공개 API 계약을 검증하는 Vitest 테스트를 먼저 작성하고, 실패를 확인한 뒤 최소 구현으로 통과시킨다.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `worker/src/wall.js` | 허용 감정, KST 날짜 계산, snapshot 정규화, Durable Object 내부 GET/POST/DELETE 처리 |
| `worker/src/transfer.js` | 기존 R2 전달 라우터에 공개 `/v1/wall` 경계, CORS, Durable Object 호출, Cron 보존 정리를 추가 |
| `worker/src/index.js` | 기본 Worker와 `EmotionWall` Durable Object class export |
| `worker/wrangler.jsonc` | `WALL` binding과 SQLite Durable Object declarative export |
| `src/wallClient.js` | iPad가 안전한 감정 하나만 fire-and-forget으로 전송하는 브라우저 경계 |
| `src/main.js` | 결과가 계산된 직후 공동 벽 전송을 시작하되 결과 UI를 기다리지 않음 |
| `wall.html`, `src/wall.js`, `styles/wall.css` | 독립적인 전시 화면, polling, 추상 캔버스, 반응형·reduced-motion UI |
| `vite.config.js` | `wall.html`을 Pages production build input에 포함 |
| `test/wall.test.js` | Durable Object 저장·일일 경계·상한·삭제의 실제 상태 전이 |
| `test/worker.test.js`, `test/workerEntry.test.js` | 공개 Worker route, CORS, 오류 매핑, config-compatible class export 회귀 |
| `test/wallClient.test.js` | iPad payload 최소화, URL 검증, 실패 무시 계약 |
| `test/wallPage.test.js` | 전시 화면의 빈 상태·합계·마지막 snapshot·reduced-motion DOM 계약 |
| `test/buildLayout.test.js` | Pages 빌드의 `wall.html`과 Worker endpoint 번들 회귀 |

### Task 1: Durable Object의 익명 일일 snapshot을 TDD로 만든다

**Files:**

- Create: `worker/src/wall.js`
- Create: `test/wall.test.js`

**Interfaces:**

- Consumes: `DurableObjectState`와 `state.storage.get`, `state.storage.put`, `state.storage.delete`; internal `Request` URL의 `day` query parameter.
- Produces:

```js
export const WALL_EMOTIONS = ['joy', 'sad', 'anger', 'numb', 'anxiety'];
export const WALL_DAILY_LIMIT = 10_000;
export const WALL_RETENTION_DAYS = 8;
export function isWallEmotion(emotion);
export function wallDayAt(timestamp);
export function wallCleanupDayAt(timestamp);
export function shouldCleanupWallAt(timestamp);
export class EmotionWall { constructor(state, env); fetch(request); }
```

- [ ] **Step 1: in-memory Durable Object storage를 가진 실패 테스트를 작성한다.**

`test/wall.test.js`에 `get`, `put`, `delete`를 가진 `Map` 기반 storage fake와 `EmotionWall` 인스턴스 helper를 만든다. 다음의 독립적인 실제 응답 행동을 명시한다.

```js
it('stores only the selected category in the KST daily snapshot', async () => {
  const wall = createWall();
  const response = await wall.fetch(jsonRequest('POST', '/events?day=2026-08-13', { emotion: 'joy' }));

  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toEqual({
    day: '2026-08-13',
    total: 1,
    counts: { joy: 1, sad: 0, anger: 0, numb: 0, anxiety: 0 },
    updatedAt: expect.any(Number),
  });
});

it.each(['surprise', 'composite', '', null])('rejects non-wall emotion %j without writing', async (emotion) => {
  const { wall, storage } = createWallWithStorage();
  const response = await wall.fetch(jsonRequest('POST', '/events?day=2026-08-13', { emotion }));

  expect(response.status).toBe(400);
  expect(storage.put).not.toHaveBeenCalled();
});
```

같은 파일에 `GET /snapshot`의 zero snapshot, 두 번의 다른 감정 누적, `Content-Type: application/json` 누락 및 깨진 JSON의 400, 10,000건 뒤 `wall-full` 429와 상태 불변, `DELETE /snapshot` 뒤 zero snapshot, KST 23:59→00:00 날짜와 KST 00:05 cleanup 대상(`2026-08-13`이면 `2026-08-05`)을 literal expectation으로 추가한다.

- [ ] **Step 2: 아직 모듈이 없어서 테스트가 실패하는지 확인한다.**

Run: `npm test -- test/wall.test.js`

Expected: `Failed to resolve import "../worker/src/wall.js"` 또는 `EmotionWall is not a constructor`로 FAIL.

- [ ] **Step 3: 최소 Durable Object 구현을 작성한다.**

`worker/src/wall.js`에서 고정 순서의 `WALL_EMOTIONS`와 zero counts를 사용한다. `wallDayAt()`은 `Intl.DateTimeFormat(..., { timeZone: 'Asia/Seoul' }).formatToParts()`로 `YYYY-MM-DD`를 만들며, `wallCleanupDayAt()`은 그 KST 날짜에서 정확히 8일을 UTC calendar day로 빼서 같은 형식으로 반환한다. `shouldCleanupWallAt()`은 KST `00:05`일 때만 true를 반환한다.

`EmotionWall.fetch()`는 다음만 처리한다.

```js
POST /events?day=YYYY-MM-DD     // JSON body: { emotion }
GET  /snapshot?day=YYYY-MM-DD
DELETE /snapshot?day=YYYY-MM-DD
```

POST는 content type과 body를 검사하고, storage의 `snapshot`을 읽어 day가 일치하는 zero-or-valid snapshot으로 정규화한다. `total >= WALL_DAILY_LIMIT`이면 write 없이 `{ error: 'wall-full' }` 429를 반환한다. 그렇지 않으면 해당 count와 total만 1 증가시키고 `updatedAt: Date.now()`를 넣어 `storage.put('snapshot', next)` 후 201 JSON을 반환한다. GET은 저장값이 없어도 zero snapshot 200을, DELETE는 `storage.delete('snapshot')` 후 204를 반환한다. internal URL 형식이 아닌 요청은 404 JSON으로 끝낸다.

- [ ] **Step 4: Durable Object 테스트가 통과하는지 확인한다.**

Run: `npm test -- test/wall.test.js`

Expected: 허용 감정, zero snapshot, 누적, 유효성 검사, 상한, 삭제, KST 날짜 테스트가 모두 PASS.

- [ ] **Step 5: 이 독립적인 저장 경계를 커밋한다.**

```bash
git add worker/src/wall.js test/wall.test.js
git commit -m "feat: add daily emotion wall durable object"
```

### Task 2: 기존 Worker에 공개 감정 벽 API와 보존 Cron을 연결한다

**Files:**

- Modify: `worker/src/transfer.js`
- Modify: `worker/src/index.js`
- Modify: `worker/wrangler.jsonc`
- Modify: `test/worker.test.js`
- Modify: `test/workerEntry.test.js`

**Interfaces:**

- Consumes: Task 1의 `EmotionWall`, `isWallEmotion`, `wallDayAt`, `wallCleanupDayAt`, `shouldCleanupWallAt`; `env.WALL.getByName(day).fetch(request)`.
- Produces: CORS-protected `POST /v1/wall/events`와 `GET /v1/wall`, 보존 cleanup을 포함한 default Worker.

- [ ] **Step 1: 공개 route의 실패 테스트와 WALL namespace fake를 추가한다.**

`test/worker.test.js`의 `createEnv()`에 다음 모양의 Wall binding을 추가한다.

```js
WALL: {
  getByName: vi.fn(() => ({
    fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })),
  })),
},
```

아래 공개 계약을 테스트한다.

```js
it('posts only one allowed emotion to today’s durable object', async () => {
  const response = await worker.fetch(new Request('https://transfer.example/v1/wall/events', {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json' },
    body: JSON.stringify({ emotion: 'joy' }),
  }), env, ctx);

  expect(response.status).toBe(201);
  expect(env.WALL.getByName).toHaveBeenCalledWith('2025-10-09');
  expect(await wallStub.fetch.mock.calls[0][0].json()).toEqual({ emotion: 'joy' });
});
```

`now: () => 1760000000000`을 KST 날짜에 맞는 fixed timestamp로 바꿔 assertion을 hand-check한다. 외국 Origin 403, 잘못된 JSON/content type/`surprise` 400, absent `WALL`와 stub throw 503 `wall-unavailable`, Durable Object 429 body passthrough, `GET /v1/wall` snapshot/CORS, OPTIONS가 `GET, POST, OPTIONS`인 회귀, KST 00:05 scheduled call이 `wallCleanupDayAt(now)` Object에 DELETE를 보내는 테스트를 추가한다. 기존 R2 cleanup test도 그대로 통과해야 한다.

- [ ] **Step 2: 새 route 테스트가 아직 404로 실패하는지 확인한다.**

Run: `npm test -- test/worker.test.js test/workerEntry.test.js`

Expected: `/v1/wall/events`와 `/v1/wall` assertion이 404 또는 `WALL` 미호출로 FAIL.

- [ ] **Step 3: Router와 Workers entry/config를 최소로 연결한다.**

`worker/src/transfer.js`는 기존 origin 검사 뒤 `/v1/wall/events`와 `/v1/wall`을 분기한다. POST는 request body에서 `{ emotion }`만 parse·validate하고, `new Request('https://emotion-wall.internal/events?day=<server-day>', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ emotion }) })`를 stub에 보낸다. GET은 `https://emotion-wall.internal/snapshot?day=<server-day>`만 요청한다. DO response body와 status를 CORS response로 복제하고, 400/429는 보존한다. binding 누락·fetch throw·5xx는 `{ error: 'wall-unavailable' }` 503으로 정규화한다.

기존 `scheduled()`는 먼저 R2 만료 정리를 그대로 수행한 뒤, `shouldCleanupWallAt(now()) && env.WALL?.getByName`이면 `wallCleanupDayAt(now())` Object에 `DELETE /snapshot?day=<cleanup-day>`를 한 번 보낸다. 실패는 Cron을 throw시키지 않는다.

`worker/src/index.js`는 class를 runtime entry에서 명시적으로 export한다.

```js
import { createTransferWorker } from './transfer.js';
import { EmotionWall } from './wall.js';

export { EmotionWall };
export default createTransferWorker();
```

`worker/wrangler.jsonc`에는 다음을 추가한다.

```jsonc
"durable_objects": {
  "bindings": [{ "name": "WALL", "class_name": "EmotionWall" }]
},
"exports": {
  "EmotionWall": { "type": "durable-object", "storage": "sqlite" }
}
```

`test/workerEntry.test.js`는 `default`와 `EmotionWall` export를 검사한다.

- [ ] **Step 4: Worker route와 entry 테스트를 통과시키고 config를 dry-run 한다.**

Run: `npm test -- test/wall.test.js test/worker.test.js test/workerEntry.test.js`

Expected: 신규 API와 기존 PNG transfer 전부 PASS.

Run: `npm run worker:deploy -- --dry-run`

Expected: Wrangler가 `WALL` Durable Object와 SQLite export를 포함한 배포 계획을 출력하고 exit 0.

- [ ] **Step 5: Worker API 변경을 커밋한다.**

```bash
git add worker/src/transfer.js worker/src/index.js worker/wrangler.jsonc test/worker.test.js test/workerEntry.test.js
git commit -m "feat: expose shared emotion wall api"
```

### Task 3: iPad 결과에서 익명 감정 하나만 비차단으로 발행한다

**Files:**

- Create: `src/wallClient.js`
- Modify: `src/main.js`
- Create: `test/wallClient.test.js`

**Interfaces:**

- Consumes: `getTransferApiUrl()` from `src/photoTransfer.js`, final `result.topCategory`, browser `fetch`.
- Produces:

```js
export const WALL_EMOTIONS = new Set(['joy', 'sad', 'anger', 'numb', 'anxiety']);
export function isWallEmotion(emotion);
export async function publishWallEmotion(emotion, { apiUrl, fetchImpl } = {});
```

- [ ] **Step 1: browser boundary의 실패 테스트를 작성한다.**

`test/wallClient.test.js`에서 fetch fake를 주입해 아래 실제 HTTP boundary를 명시한다.

```js
it('posts exactly one allowed final category without visitor metadata', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));

  await expect(publishWallEmotion('anxiety', {
    apiUrl: 'https://transfer.example/', fetchImpl,
  })).resolves.toBe(true);

  expect(fetchImpl).toHaveBeenCalledWith('https://transfer.example/v1/wall/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ emotion: 'anxiety' }),
  });
});
```

`surprise`, `composite`, empty category가 fetch 없이 false로 끝나는 테스트, empty/insecure API URL이 false로 끝나는 테스트, rejected fetch와 non-2xx response가 false로 끝나는 테스트를 추가한다. 이 테스트는 request body에 only `{ emotion }`이므로 metadata가 추가되면 실패한다.

- [ ] **Step 2: 모듈이 없어서 테스트가 실패하는지 확인한다.**

Run: `npm test -- test/wallClient.test.js`

Expected: `Failed to resolve import "../src/wallClient.js"`로 FAIL.

- [ ] **Step 3: 최소 client와 non-blocking app 연결을 작성한다.**

`src/wallClient.js`는 `getTransferApiUrl(apiUrl)`로 endpoint를 검증하고 allowed emotion이 아니거나 endpoint/fetch가 없으면 `false`를 resolve한다. 유효하면 `POST ${apiUrl}/v1/wall/events`에 `{ emotion }`만 JSON으로 보내며, network throw와 non-OK 모두 `false`로 resolve한다. UI용 error를 throw하거나 alert하지 않는다.

`src/main.js`의 ending result block에서 `showResult()` 호출 전에 다음 한 줄만 넣는다.

```js
void publishWallEmotion(result.topCategory);
```

이 호출은 `await`하지 않고, `result.isComposite`라 해도 aggregate가 제공한 단일 `topCategory`만 전달한다. QR modal, `browserDailyStats`, mosaic 생성과 result rendering 순서는 바꾸지 않는다.

- [ ] **Step 4: client 테스트를 통과시키고 핵심 result UI 회귀를 확인한다.**

Run: `npm test -- test/wallClient.test.js test/ui.test.js test/mainLiveEmotion.test.js`

Expected: allowed payload, ignored failure, 결과 카드 QR action, live emotion 흐름 전부 PASS.

- [ ] **Step 5: iPad 결과 발행 경계를 커밋한다.**

```bash
git add src/wallClient.js src/main.js test/wallClient.test.js
git commit -m "feat: publish final emotion to shared wall"
```

### Task 4: 전시용 `wall.html`을 만들고 production build에 포함한다

**Files:**

- Create: `wall.html`
- Create: `src/wall.js`
- Create: `styles/wall.css`
- Modify: `vite.config.js`
- Create: `test/wallPage.test.js`
- Modify: `test/buildLayout.test.js`

**Interfaces:**

- Consumes: `getTransferApiUrl()` from `src/photoTransfer.js`, `WALL_EMOTIONS` from `src/wallClient.js`, `GET /v1/wall` snapshot.
- Produces:

```js
export function mountEmotionWall(root, { apiUrl, fetchImpl, intervalMs, windowRef } = {});
// return { refresh, stop } so the page lifecycle can clean up its polling interval
```

- [ ] **Step 1: wall DOM의 실패 테스트와 build regression을 작성한다.**

`test/wallPage.test.js`를 jsdom environment로 만들고 `mountEmotionWall()`을 real root와 injected fetch로 호출한다. 다음 계약을 literal Korean copy와 accessible selectors로 검증한다.

```js
it('renders a quiet empty beginning and five labeled category counts', async () => {
  const handle = mountEmotionWall(root, { apiUrl: API, fetchImpl: snapshotFetch(EMPTY) });
  await handle.refresh();

  expect(root.textContent).toContain('아직 첫 감정이 도착하기 전입니다');
  expect(root.textContent).toContain('오늘 전시를 지나간 0개의 감정');
  expect(root.querySelectorAll('[data-emotion-count]')).toHaveLength(5);
  handle.stop();
});
```

합계 7 snapshot이 `오늘 전시를 지나간 7개의 감정`과 each count를 표시하는 테스트, fetch failure 뒤 이전 successful total/canvas를 유지하고 `마지막 풍경을 유지하고 있습니다`를 보이는 테스트, `window.matchMedia('(prefers-reduced-motion: reduce)')`가 true인 경우 canvas에 animation scheduling을 하지 않는 테스트를 추가한다. `test/buildLayout.test.js`에는 `dist/wall.html` 존재, page title `hueman 공동 감정 벽`, built JavaScript에 configured `https://transfer.example`가 포함되는 assertion을 넣는다.

- [ ] **Step 2: 새 page 테스트가 모듈과 HTML 부재로 실패하는지 확인한다.**

Run: `npm test -- test/wallPage.test.js test/buildLayout.test.js`

Expected: `Failed to resolve import "../src/wall.js"` 또는 `dist/wall.html` absent로 FAIL.

- [ ] **Step 3: 전시 화면·canvas renderer·build entry를 최소 구현한다.**

`wall.html`은 `<main id="wall-app"></main>`과 `/styles/wall.css`, `/src/wall.js`만 불러온다. `src/wall.js`는 API URL이 없으면 explicit disconnected state를 그리고, `refresh()`에서 only `GET ${apiUrl}/v1/wall` JSON을 받아 day, total, five counts가 모두 valid non-negative integer인 경우에만 current snapshot을 교체한다. 실패할 때는 existing snapshot을 유지하며 connection copy만 바꾼다. `setInterval(refresh, 4000)`은 mount 후 시작하고 returned `stop()`이 clear한다.

renderer는 fixed emotion color map (`joy #FFD23F`, `sad #3B7DD8`, `anger #E03131`, `numb #1A1A1A`, `anxiety #FF8C2B`)와 only aggregate count를 seed로 써 canvas의 soft particles and light blobs를 draw한다. DOM에는 H1, total `aria-live="polite"`, five legend/count entries, small connection message가 있어 canvas 없이도 상태를 이해할 수 있어야 한다. `prefers-reduced-motion`이면 one static draw만 하고 requestAnimationFrame loop를 만들지 않는다. normal motion도 DOM text를 animate하지 않는다.

`styles/wall.css`는 dark full-viewport installation composition, safe-area inset, large readable Korean total, contrast-safe legend, 768px 이하 portrait reflow를 제공한다. click target이나 user input은 만들지 않는다. `vite.config.js`의 rollup input에 `wall: resolve(process.cwd(), 'wall.html')`을 추가한다.

- [ ] **Step 4: page tests와 production build를 통과시킨다.**

Run: `npm test -- test/wallPage.test.js test/buildLayout.test.js`

Expected: empty/snapshot/failure/reduced-motion/build assertions 모두 PASS.

Run: `npm run build`

Expected: `dist/index.html`, `dist/receive.html`, `dist/wall.html`이 생성되고 Vite exit 0.

- [ ] **Step 5: 전시 화면을 커밋한다.**

```bash
git add wall.html src/wall.js styles/wall.css vite.config.js test/wallPage.test.js test/buildLayout.test.js
git commit -m "feat: add shared emotion wall exhibit page"
```

### Task 5: 전체 회귀·실제 배포·공개 전시 화면을 검증한다

**Files:**

- Modify: `.agents/coordination/current-state.md`
- Modify: `.agents/coordination/inbox.md`
- Modify: `.agents/coordination/session-log.md`
- Modify: `.agents/coordination/locks.md`

**Interfaces:**

- Consumes: Tasks 1–4, existing GitHub Pages workflow and `QR_TRANSFER_API_URL` repository variable.
- Produces: deployed Worker/Pages release with an evidence-backed handoff.

- [ ] **Step 1: full suite와 Worker config를 fresh run으로 검증한다.**

Run: `npm test`

Expected: exit 0 with every existing and new test passing.

Run: `npm run build`

Expected: Vite production build exit 0 and three HTML entries.

Run: `npm run worker:deploy -- --dry-run`

Expected: Wrangler accepts the R2 binding plus `EmotionWall` SQLite Durable Object config.

- [ ] **Step 2: diff와 privacy boundary를 review한다.**

Run: `git diff main...HEAD -- worker/src src/main.js wall.html styles/wall.css vite.config.js test`

Expected: no route accepts photo, raw detected values, selection data, token, client timestamp, color, or browser identifier for the wall; only `{ emotion }` is public payload.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 3: actual Worker와 Pages를 deploy한다.**

Run: `npm run worker:deploy`

Expected: existing `hueman-photo-transfer` Worker deploy output includes Durable Object migration/export and public Worker URL.

Run: `git push origin <feature-branch>` or merged `main`

Expected: GitHub Pages workflow starts using the existing `QR_TRANSFER_API_URL` variable and serves `wall.html`.

- [ ] **Step 4: public endpoint and public wall page를 수동 smoke test 한다.**

Use an allowed-Origin `POST https://hueman-photo-transfer.dhoklim-bdd.workers.dev/v1/wall/events` with `Content-Type: application/json` and `{ "emotion": "joy" }`, then allowed-Origin `GET /v1/wall`. Confirm POST returns 201, GET has the same KST day and an incremented `joy`/`total`. Open `https://dhoklim.github.io/hueman/wall.html` in Chromium and confirm its title, canvas, total, legend, and fresh count render. This intentionally creates one anonymous test count in the current day; no personal data is used.

- [ ] **Step 5: release notes를 기록하고 lock을 해제한다.**

`current-state.md`에 public URL, only-aggregate privacy boundary, Worker/Pages verification result를 한 bullet로 기록한다. `inbox.md`의 implementation note를 Resolved로 옮기고 `session-log.md`에 commands/results를 한 entry로 추가한다. `locks.md`의 active feature row를 remove하여 `_None_` row를 복구한다. 그 documentation change를 commit한다.

```bash
git add .agents/coordination
git commit -m "chore: record emotion wall release"
```

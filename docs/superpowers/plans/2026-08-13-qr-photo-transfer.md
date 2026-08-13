# QR 임시 사진 전달 및 iPad 대응 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전시용 iPad에서 만든 hueman 결과 카드 PNG를 QR로 휴대폰에 10분 동안 안전하게 전달하고, iPad Safari와 휴대폰 Safari에서 저장·공유할 수 있게 한다.

**Architecture:** 브라우저는 최종 결과 카드 Canvas만 PNG Blob으로 만들어 Cloudflare Worker에 올리고, Worker는 비공개 R2에 만료 시각과 UUID로 구성한 token을 저장한다. QR은 GitHub Pages의 가벼운 `receive.html#token`을 가리키며, 수신 페이지가 Worker에서 한 번만 이미지를 가져와 Web Share API 또는 다운로드로 저장한다.

**Tech Stack:** Vite 8, JavaScript ES modules, Vitest 4 + jsdom, `qrcode`, Cloudflare Workers, R2, GitHub Pages Actions.

## Global Constraints

- 전송 대상은 `createResultCardCanvas()`가 만든 최종 PNG 한 장뿐이며, 원본 카메라·타깃·스냅샷·감정 원시 데이터는 요청 본문에 넣지 않는다.
- Worker는 `image/png`만 받고 최대 크기는 정확히 8 MiB (`8 * 1024 * 1024`)다.
- 링크는 생성 후 정확히 10분 동안만 유효하고, `GET`은 만료 즉시 `410`을 돌려준다.
- QR token은 `<13자리 expiresAt>.<UUID>`이며, Pages URL fragment에만 둔다.
- R2 버킷은 공개하지 않고 Worker binding `TRANSFERS`로만 접근한다.
- 모든 Worker CORS 응답은 `ALLOWED_ORIGINS`의 정확한 Origin에만 `GET`, `POST`, `OPTIONS`를 허용한다.
- iPad 새 버튼은 최소 44×44 CSS px, `touch-action: manipulation`, `viewport-fit=cover`, safe-area inset, 세로·가로 레이아웃을 지원한다.
- 전송 API는 운영에서 HTTPS만 허용하고, 페이지 origin도 loopback인 개발 환경에서만 `http://localhost` 또는 `http://127.0.0.1`을 허용한다.
- 전송 API가 구성되지 않았거나 전송에 실패해도 기존 모자이크·결과 카드 저장·갤러리 행동은 유지한다.
- 구현 전부터 존재하는 `test/videoMap.test.js`의 추적되지 않은 `video/영상_장면_설명.txt` 의존성은 검증을 막으므로, 같은 보호 목적을 버전 관리되는 명시적 레거시 파일 목록으로 교체한다.

---

## File Structure

| 파일 | 책임 |
| --- | --- |
| `src/photoTransfer.js` | PNG Blob 변환, API URL 검증, 업로드·수신, URL 생성, 공유/다운로드 fallback의 순수 브라우저 경계 |
| `src/qrCode.js` | 로컬 `qrcode` 패키지로 QR Canvas를 렌더 |
| `src/qrTransferModal.js` | iPad 결과 화면의 업로드 상태, QR, 만료 카운트다운, 링크 복사, 재시도, 포커스 복원 |
| `src/receive.js` | `receive.html`의 token 검증, 이미지 수신·미리보기·저장/공유 상태 |
| `src/ui.js` | 결과 화면의 QR 행동 버튼과 기존 결과 카드 직접 저장의 공유 fallback 연결 |
| `src/main.js` | 결과 화면에 QR 모달 시작 함수를 주입 |
| `receive.html`, `styles/receive.css` | face-api를 불러오지 않는 휴대폰 수신 페이지와 전용 레이아웃 |
| `styles/main.css`, `index.html` | iPad 안전 영역, 동적 높이, 터치 전용 상태, QR 모달 스타일 |
| `worker/src/index.js` | CORS·PNG·크기 검증, R2 저장/수신, 만료·Cron 정리 API |
| `worker/wrangler.jsonc`, `worker/README.md` | R2 binding, 분당 Cron, Cloudflare·GitHub Actions 배포 절차 |
| `vite.config.js`, `.github/workflows/deploy.yml`, `package.json` | 다중 HTML 빌드, Pages API URL 주입, QR/Worker 명령 |
| `test/photoTransfer.test.js`, `test/qrTransferModal.test.js`, `test/receive.test.js`, `test/worker.test.js`, `test/buildLayout.test.js` | 새 기능의 단위·DOM·Worker·build 회귀 테스트 |
| `test/ui.test.js`, `test/videoMap.test.js`, `docs/manual-test-checklist.md` | 결과 UI 회귀, 테스트 fixture 복구, 실제 iPad QA |

### Task 1: 버전 관리되는 영상 맵 검증으로 기존 테스트 복구

**Files:**

- Modify: `test/videoMap.test.js:1-52`
- Test: `test/videoMap.test.js`

**Interfaces:**

- Consumes: `SCENE_VIDEOS`와 `public/video/`의 실제 파일.
- Produces: 추적되지 않은 `video/영상_장면_설명.txt` 없이 실행되는 영상 맵 무결성 테스트.

- [ ] **Step 1: 실패 원인을 재현한다.**

Run: `npm test -- test/videoMap.test.js`

Expected: `ENOENT: no such file or directory`와 `video/영상_장면_설명.txt`로 suite import가 실패한다.

- [ ] **Step 2: 문서 파일 의존을 레거시 파일 차단 목록 테스트로 바꾼다.**

`readFileSync` import와 `videoDescription` 상수를 제거하고, 테스트 파일 상단에 다음 상수를 둔다.

```js
const LEGACY_FALLBACK_FILES = new Set([
  'childhood.mp4',
  'teen.mp4',
  'no-date.mp4',
  'smoke-no.mp4',
  'startup.mp4',
]);
```

마지막 테스트는 다음처럼 바꾼다.

```js
it('does not use legacy fallback reels', () => {
  for (const [sceneId, config] of Object.entries(SCENE_VIDEOS)) {
    expect(
      LEGACY_FALLBACK_FILES.has(config.file),
      `${sceneId} uses legacy fallback ${config.file}`
    ).toBe(false);
  }
});
```

- [ ] **Step 3: 대상 테스트가 통과하는지 확인한다.**

Run: `npm test -- test/videoMap.test.js`

Expected: 5개 테스트 모두 PASS이고, 외부 `video/` 경로를 읽지 않는다.

- [ ] **Step 4: 이 독립 복구를 커밋한다.**

```bash
git add test/videoMap.test.js
git commit -m "test: remove ignored video manifest dependency"
```

### Task 2: 브라우저 전송 경계와 PNG 공유 fallback을 TDD로 만든다

**Files:**

- Create: `src/photoTransfer.js`
- Create: `test/photoTransfer.test.js`
- Modify: `package.json` (기존 스크립트는 건드리지 않음)

**Interfaces:**

- Consumes: `HTMLCanvasElement`, `fetch`, `navigator`, `document`, `URL`, `import.meta.env.VITE_QR_TRANSFER_API_URL`.
- Produces:

```js
export const MAX_TRANSFER_BYTES = 8 * 1024 * 1024;
export class TransferError extends Error { constructor(code, message, status = 0) }
export function getTransferApiUrl(raw = import.meta.env.VITE_QR_TRANSFER_API_URL, pageOrigin = window.location.origin)
export function buildReceiveUrl(token, { origin, base } = {})
export function canvasToPng(canvas)
export async function createTransfer(apiUrl, blob, { fetchImpl } = {})
export async function fetchTransfer(apiUrl, token, { fetchImpl } = {})
export async function sharePng(blob, filename, { navigatorRef, FileCtor } = {})
export function downloadBlob(blob, filename, { documentRef, urlRef } = {})
```

- [ ] **Step 1: 전송 유틸의 실패 테스트를 작성한다.**

`test/photoTransfer.test.js`에 fetch와 navigator를 주입해 다음 행동을 명시한다.

```js
it('normalizes HTTPS API URLs and rejects an absent or insecure production URL', () => {
  expect(getTransferApiUrl('https://transfer.example/')).toBe('https://transfer.example');
  expect(getTransferApiUrl('')).toBeNull();
  expect(getTransferApiUrl('http://transfer.example')).toBeNull();
  expect(getTransferApiUrl('http://localhost:8787', 'http://localhost:5173')).toBe('http://localhost:8787');
});

it('builds a GitHub Pages receiver URL with the bearer token only in the fragment', () => {
  expect(buildReceiveUrl('1760000000000.uuid', {
    origin: 'https://dhoklim.github.io', base: '/hueman/',
  })).toBe('https://dhoklim.github.io/hueman/receive.html#1760000000000.uuid');
});

it('posts a PNG and returns a valid token and expiration', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    token: '1760000000000.123e4567-e89b-42d3-a456-426614174000',
    expiresAt: 1760000000000,
  }), { status: 201, headers: { 'content-type': 'application/json' } }));
  const result = await createTransfer('https://worker.example', new Blob(['png'], { type: 'image/png' }), { fetchImpl });
  expect(result.expiresAt).toBe(1760000000000);
  expect(fetchImpl.mock.calls[0][0]).toBe('https://worker.example/v1/transfers');
});
```

같은 파일에 `410 → expired`, `404 → not-found`, `413 → too-large`, 네트워크 예외 →
`network`, PNG가 아닌 Blob → `invalid-file`, 8 MiB 초과 → `too-large`, 그리고
`navigator.share` 미지원 시 `sharePng()`이 `unavailable`을 반환하는 테스트를 추가한다.

- [ ] **Step 2: 테스트가 아직 모듈 부재로 실패하는지 확인한다.**

Run: `npm test -- test/photoTransfer.test.js`

Expected: `Failed to resolve import "../src/photoTransfer.js"` 또는 export 부재로 FAIL.

- [ ] **Step 3: 최소 전송 구현을 작성한다.**

```js
export const MAX_TRANSFER_BYTES = 8 * 1024 * 1024;
const TOKEN_RE = /^\d{13}\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class TransferError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function getTransferApiUrl(raw = import.meta.env.VITE_QR_TRANSFER_API_URL, pageOrigin = window.location.origin) {
  if (!raw) return null;
  try {
    const api = new URL(raw);
    const page = new URL(pageOrigin);
    const local = ['localhost', '127.0.0.1'].includes(page.hostname)
      && ['localhost', '127.0.0.1'].includes(api.hostname);
    if (api.protocol !== 'https:' && !(local && api.protocol === 'http:')) return null;
    return api.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function buildReceiveUrl(token, { origin = window.location.origin, base = import.meta.env.BASE_URL } = {}) {
  if (!TOKEN_RE.test(token)) throw new TransferError('invalid-token', 'Invalid transfer token');
  return `${origin}${base.endsWith('/') ? base : `${base}/`}receive.html#${encodeURIComponent(token)}`;
}
```

`createTransfer()`은 `POST ${apiUrl}/v1/transfers`에 Blob을 그대로 보내고
`Content-Type: image/png`을 붙인다. 성공 JSON의 token·expiresAt를 검사하고, HTTP 상태를
`expired`, `not-found`, `too-large`, `invalid-file`, `server` 중 하나의 `TransferError`로
바꾼다. `fetchTransfer()`은 같은 규칙으로 `${apiUrl}/v1/transfers/${encodeURIComponent(token)}`
에서 PNG Blob을 얻는다.

`canvasToPng()`은 `canvas.toBlob()`의 null 결과를 `TransferError('canvas')`로 바꾸고,
`sharePng()`은 `new File([blob], filename, { type: 'image/png' })`와
`navigator.canShare({ files: [file] })`를 확인한 후 `shared`, `unavailable`, `cancelled`,
`failed` 중 하나를 반환한다. `downloadBlob()`은 object URL을 만든 `<a download>` 클릭 뒤
다음 macrotask에 URL을 revoke한다.

- [ ] **Step 4: 유닛 테스트를 통과시킨다.**

Run: `npm test -- test/photoTransfer.test.js`

Expected: URL, 업로드, HTTP 오류, Blob 제한, 공유/다운로드 fallback 테스트가 PASS.

- [ ] **Step 5: 전송 경계를 커밋한다.**

```bash
git add src/photoTransfer.js test/photoTransfer.test.js
git commit -m "feat: add photo transfer client"
```

### Task 3: Cloudflare Worker의 비공개 R2 전송 API를 TDD로 구현한다

**Files:**

- Create: `worker/src/index.js`
- Create: `test/worker.test.js`

**Interfaces:**

- Consumes: Worker `Request`, `Response`, `crypto.randomUUID`, `env.TRANSFERS` (`put`, `get`, `list`, `delete`), `env.ALLOWED_ORIGINS`, fetch/scheduled execution context.
- Produces:

```js
export const TRANSFER_TTL_MS = 10 * 60 * 1000;
export const MAX_TRANSFER_BYTES = 8 * 1024 * 1024;
export function transferKey(expiresAt, id)
export function parseToken(token)
export function createTransferWorker({ now, createId } = {})
export default { fetch, scheduled }
```

- [ ] **Step 1: Worker API의 실패 테스트와 인메모리 R2를 작성한다.**

`test/worker.test.js`에 `Map` 기반 R2 fake를 만들고 다음 계약을 테스트한다.

```js
it('stores only a small PNG and returns a ten-minute token', async () => {
  const worker = createTransferWorker({ now: () => 1760000000000, createId: () => UUID });
  const response = await worker.fetch(new Request('https://worker.test/v1/transfers', {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'image/png' },
    body: new Uint8Array([137, 80, 78, 71]),
  }), env, ctx);
  expect(response.status).toBe(201);
  expect(env.TRANSFERS.put).toHaveBeenCalledWith(
    `transfers/1760000600000/${UUID}.png`, expect.anything(), expect.objectContaining({
      httpMetadata: expect.objectContaining({ contentType: 'image/png', cacheControl: 'no-store' }),
    })
  );
});

it.each([
  ['https://attacker.example', 'image/png', new Uint8Array([1]), 403],
  [ORIGIN, 'image/jpeg', new Uint8Array([1]), 415],
  [ORIGIN, 'image/png', new Uint8Array(MAX_TRANSFER_BYTES + 1), 413],
])('rejects invalid upload %s', async (origin, type, body, expected) => {
  const worker = createTransferWorker({ now: () => 1760000000000, createId: () => UUID });
  const response = await worker.fetch(new Request('https://worker.test/v1/transfers', {
    method: 'POST',
    headers: { origin, 'content-type': type },
    body,
  }), env, ctx);
  expect(response.status).toBe(expected);
});
```

또한 유효 `GET`의 `image/png`/`private, no-store`, 만료 GET의 `410`+삭제 예약, 없는 token의
`404`, malformed token의 `404`, OPTIONS CORS, `scheduled()`가 만료 키만 최대 1,000개까지
삭제하고 첫 미만료 키에서 멈추는 테스트를 추가한다.

- [ ] **Step 2: Worker 테스트가 모듈 부재로 실패하는지 확인한다.**

Run: `npm test -- test/worker.test.js`

Expected: `Failed to resolve import "../worker/src/index.js"`로 FAIL.

- [ ] **Step 3: Worker를 구현한다.**

```js
export const TRANSFER_TTL_MS = 10 * 60 * 1000;
export const MAX_TRANSFER_BYTES = 8 * 1024 * 1024;
const TOKEN_RE = /^(\d{13})\.([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function transferKey(expiresAt, id) {
  return `transfers/${String(expiresAt).padStart(13, '0')}/${id}.png`;
}

export function parseToken(token) {
  const match = TOKEN_RE.exec(token || '');
  return match ? { expiresAt: Number(match[1]), id: match[2] } : null;
}

function parseExpiresAtFromKey(key) {
  const match = /^transfers\/(\d{13})\//.exec(key);
  return match ? Number(match[1]) : null;
}
```

`createTransferWorker()`은 `fetch`에서 다음만 라우팅한다.

```js
if (request.method === 'OPTIONS') return corsPreflight(request, env);
if (!isAllowedOrigin(request.headers.get('origin'), env.ALLOWED_ORIGINS)) return json({ error: 'forbidden' }, 403);
if (request.method === 'POST' && url.pathname === '/v1/transfers') return create(request, env);
if (request.method === 'GET' && url.pathname.startsWith('/v1/transfers/')) return read(request, env, ctx);
return json({ error: 'not-found' }, 404);
```

`create()`은 `Content-Type`을 `;` 앞에서 비교하고, `Content-Length`가 이미 8 MiB를 넘으면
바로 `413`을 반환한다. 그 뒤 `await request.arrayBuffer()`의 실제 `byteLength`도 검사한다.
`expiresAt = now() + TRANSFER_TTL_MS`, `id = createId()`, `token = `${expiresAt}.${id}``를
만들고 R2에 `httpMetadata`(`contentType`, `contentDisposition`, `cacheControl`)와
`customMetadata.expiresAt`을 넣어 저장한다.

`read()`은 token에서 key를 만들고 `expiresAt <= now()`면 `ctx.waitUntil(bucket.delete(key))` 후
`410 { error: 'expired' }`를 반환한다. 아직 유효하면 R2 object body와
`Cache-Control: private, no-store`, `Content-Type: image/png`, 정확한 CORS 응답을 반환한다.

`scheduled()`은 `list({ prefix: 'transfers/', cursor, limit })`를 페이지 단위로 읽고,
내부 helper `parseExpiresAtFromKey(key)`가 읽은 `expiresAt <= now()`인 앞부분만 수집한다. 1,000개를 모으거나 첫 미만료 키를
만나면 `delete(keys)`를 한 번 호출한다. 각 응답에는 `Vary: Origin`을 넣는다.

- [ ] **Step 4: Worker 단위 테스트를 통과시킨다.**

Run: `npm test -- test/worker.test.js`

Expected: 업로드, 수신, 만료, CORS, Cron 정리 테스트가 PASS.

- [ ] **Step 5: Worker API를 커밋한다.**

```bash
git add worker/src/index.js test/worker.test.js
git commit -m "feat: add expiring R2 photo transfer worker"
```

### Task 4: Vite 다중 페이지·Cloudflare 배포 설정을 추가한다

**Files:**

- Create: `worker/wrangler.jsonc`
- Create: `worker/README.md`
- Modify: `vite.config.js`
- Modify: `.github/workflows/deploy.yml`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Consumes: `worker/src/index.js`, GitHub Repository Variable `QR_TRANSFER_API_URL`, Cloudflare R2 bucket `hueman-photo-transfers`.
- Produces: `npm run build`에 포함되는 `dist/receive.html`, `npm run worker:dev`, `npm run worker:deploy`.

- [ ] **Step 1: 다중 HTML build와 Worker 명령의 실패 검증을 작성한다.**

`test/buildLayout.test.js`를 만들고 저장소 파일을 읽어 `vite.config.js`에 `index.html`과
`receive.html`을 입력으로 지정하고, `package.json`에 정확한 Worker 스크립트가 있는지
검증한다.

```js
expect(viteConfigSource).toContain("receive: resolve(process.cwd(), 'receive.html')");
expect(pkg.scripts['worker:dev']).toBe('wrangler dev --config worker/wrangler.jsonc');
expect(pkg.scripts['worker:deploy']).toBe('wrangler deploy --config worker/wrangler.jsonc');
```

- [ ] **Step 2: 새 검증이 아직 실패하는지 확인한다.**

Run: `npm test -- test/buildLayout.test.js`

Expected: Vite 다중 입력과 Worker 스크립트가 없어서 FAIL.

- [ ] **Step 3: 빌드·배포 파일을 작성한다.**

`vite.config.js`에 다음 입력을 추가한다.

```js
import { resolve } from 'node:path';

build: {
  rollupOptions: {
    input: {
      index: resolve(process.cwd(), 'index.html'),
      receive: resolve(process.cwd(), 'receive.html'),
    },
  },
},
```

`package.json`에는 `qrcode`를 production dependency로, `wrangler`를 dev dependency로 추가하고
다음 스크립트를 넣는다.

```json
"worker:dev": "wrangler dev --config worker/wrangler.jsonc",
"worker:deploy": "wrangler deploy --config worker/wrangler.jsonc"
```

`worker/wrangler.jsonc`은 정확히 다음 binding과 Cron을 가진다.

```jsonc
{
  "name": "hueman-photo-transfer",
  "main": "src/index.js",
  "compatibility_date": "2026-08-13",
  "r2_buckets": [{
    "binding": "TRANSFERS",
    "bucket_name": "hueman-photo-transfers"
  }],
  "triggers": { "crons": ["* * * * *"] },
  "vars": { "ALLOWED_ORIGINS": "https://dhoklim.github.io" }
}
```

GitHub Pages build step에는 다음 환경 변수를 붙인다.

```yaml
- run: npm run build
  env:
    VITE_QR_TRANSFER_API_URL: ${{ vars.QR_TRANSFER_API_URL }}
```

`worker/README.md`에는 `npx wrangler login`, `npx wrangler r2 bucket create hueman-photo-transfers`,
`npm run worker:dev`, `npm run worker:deploy`, GitHub Repository Variable 설정, R2를 public으로
설정하지 않는 점, Cloudflare 대시보드에서 POST에 IP당 분당 10회 rate limit을 적용하는 절차를
적는다.

- [ ] **Step 4: 구성 테스트를 통과시킨다.**

Run: `npm test -- test/buildLayout.test.js`

Expected: 구성 테스트 PASS. `receive.html`은 Task 7에서 만들므로 실제 Vite 다중 페이지 build는 Task 8에서 검증한다.

- [ ] **Step 5: 배포 준비 구성을 커밋한다.**

```bash
git add vite.config.js package.json package-lock.json .github/workflows/deploy.yml worker/wrangler.jsonc worker/README.md test/buildLayout.test.js
git commit -m "build: configure QR receiver and worker deployment"
```

### Task 5: 로컬 QR 렌더러와 전송 모달을 TDD로 만든다

**Files:**

- Create: `src/qrCode.js`
- Create: `src/qrTransferModal.js`
- Create: `test/qrTransferModal.test.js`

**Interfaces:**

- Consumes: Task 2의 `canvasToPng`, `createTransfer`, `buildReceiveUrl`, `sharePng`, `downloadBlob`; `qrcode`; 결과 카드 Canvas와 버튼 element.
- Produces:

```js
export async function drawQr(canvas, value)
export function openQrTransferModal({
  canvas, filename, trigger, apiUrl, createPng, createRemoteTransfer,
  makeReceiveUrl, renderQr, shareImage, downloadImage, documentRef, now
})
// Returns: { element, ready: Promise<void>, close(): void }
```

- [ ] **Step 1: 모달의 전송·만료·실패 DOM 테스트를 작성한다.**

`test/qrTransferModal.test.js`에서 Task 2 함수와 QR 렌더러를 주입하고 다음을 검증한다.

```js
const API = 'https://worker.example';
const TOKEN = '1760000600000.123e4567-e89b-42d3-a456-426614174000';
const PNG = new Blob(['png'], { type: 'image/png' });
const canvas = document.createElement('canvas');
const modalOptions = (overrides = {}) => ({
  canvas,
  filename: 'hueman-result-joy.png',
  apiUrl: API,
  createPng: vi.fn().mockResolvedValue(PNG),
  createRemoteTransfer: vi.fn().mockResolvedValue({ token: TOKEN, expiresAt: Date.now() + 600000 }),
  makeReceiveUrl: (token) => `https://dhoklim.github.io/hueman/receive.html#${token}`,
  renderQr: vi.fn().mockResolvedValue(),
  shareImage: vi.fn().mockResolvedValue('shared'),
  downloadImage: vi.fn(),
  ...overrides,
});

it('uploads only after the QR button is chosen and draws a local receiver QR', async () => {
  const createRemoteTransfer = vi.fn().mockResolvedValue({ token: TOKEN, expiresAt: Date.now() + 600000 });
  const renderQr = vi.fn().mockResolvedValue();
  const modal = openQrTransferModal(modalOptions({ createRemoteTransfer, renderQr }));
  await modal.ready;
  expect(createRemoteTransfer).toHaveBeenCalledWith(API, expect.any(Blob));
  expect(renderQr).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), expect.stringContaining('receive.html#'));
  expect(document.body.textContent).toContain('10:00');
});

it('offers retry after network failure and restores focus when closed', async () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();
  const createRemoteTransfer = vi.fn()
    .mockRejectedValueOnce(new TransferError('network', 'offline'))
    .mockResolvedValueOnce({ token: TOKEN, expiresAt: Date.now() + 600000 });
  const modal = openQrTransferModal(modalOptions({ trigger, createRemoteTransfer }));
  await modal.ready;
  expect(modal.element.dataset.state).toBe('network');
  modal.element.querySelector('[data-action="retry"]').click();
  await vi.waitFor(() => expect(modal.element.dataset.state).toBe('ready'));
  modal.close();
  expect(document.activeElement).toBe(trigger);
});

it('changes to expired state and offers a new QR after expiresAt', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const createRemoteTransfer = vi.fn().mockResolvedValue({ token: TOKEN, expiresAt: 1000 });
  const modal = openQrTransferModal(modalOptions({ createRemoteTransfer, now: () => Date.now() }));
  await modal.ready;
  vi.setSystemTime(1000);
  await vi.advanceTimersByTimeAsync(1000);
  expect(modal.element.dataset.state).toBe('expired');
  modal.close();
  vi.useRealTimers();
});

it('copies the same receive URL and falls back from iPad sharing to PNG download', async () => {
  const writeText = vi.fn().mockResolvedValue();
  Object.assign(navigator, { clipboard: { writeText } });
  const shareImage = vi.fn().mockResolvedValue('unavailable');
  const downloadImage = vi.fn();
  const modal = openQrTransferModal(modalOptions({ shareImage, downloadImage }));
  await modal.ready;
  modal.element.querySelector('[data-action="copy"]').click();
  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('receive.html#')));
  modal.element.querySelector('[data-action="share"]').click();
  await vi.waitFor(() => expect(downloadImage).toHaveBeenCalledWith(expect.any(Blob), 'hueman-result-joy.png'));
});
```

- [ ] **Step 2: 테스트가 모듈 부재로 실패하는지 확인한다.**

Run: `npm test -- test/qrTransferModal.test.js`

Expected: `qrTransferModal.js` import 부재로 FAIL.

- [ ] **Step 3: QR 코드와 모달의 최소 구현을 작성한다.**

`src/qrCode.js`는 Task 4에서 설치한 production dependency를 사용해 외부 QR 서비스 없이 렌더한다.

```js
import QRCode from 'qrcode';

export async function drawQr(canvas, value) {
  await QRCode.toCanvas(canvas, value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#111118', light: '#ffffffff' },
  });
}
```

`openQrTransferModal()`은 `<div class="qr-transfer-overlay" role="presentation">` 안에
`role="dialog" aria-modal="true" aria-labelledby="qr-transfer-title"` 카드를 만들고,
열린 버튼을 저장한다. `ready` Promise에서 API가 없으면 `misconfigured` 상태와
`이 iPad에 저장` 행동을, API가 있으면 `uploading → ready`를 순서대로 렌더한다.

```js
async function upload() {
  setState('uploading');
  try {
    const png = await createPng(canvas);
    const { token, expiresAt } = await createRemoteTransfer(apiUrl, png);
    receiveUrl = makeReceiveUrl(token);
    await renderQr(qrCanvas, receiveUrl);
    setState('ready', { expiresAt });
  } catch (error) {
    setState(error.code === 'too-large' ? 'too-large' : 'network');
  }
}
```

`setInterval`은 남은 시간을 `Math.max(0, Math.ceil((expiresAt - now()) / 1000))`로
`10:00` 형식으로 표시하고 0에서 interval을 지운 뒤 `expired` 상태로 바꾼다. 닫기,
overlay 바깥 클릭, Escape는 모달을 제거하고 interval을 정리한 뒤 저장된 trigger에
`focus()`한다. `새 QR 만들기`는 같은 Canvas로 `upload()`을 다시 호출한다.

- [ ] **Step 4: 모달 테스트를 통과시킨다.**

Run: `npm test -- test/qrTransferModal.test.js`

Expected: QR 생성, 복사, 공유 fallback, 오류 재시도, 만료, 닫기/포커스 테스트가 PASS.

- [ ] **Step 5: QR 모달을 커밋한다.**

```bash
git add src/qrCode.js src/qrTransferModal.js test/qrTransferModal.test.js package.json package-lock.json
git commit -m "feat: show QR photo transfer modal"
```

### Task 6: 결과 화면과 iPad 저장 흐름을 연결한다

**Files:**

- Modify: `src/ui.js:1-430`
- Modify: `src/main.js:1-150`
- Modify: `index.html:1-12`
- Modify: `styles/main.css:1-330`
- Modify: `test/ui.test.js:1-290`
- Modify: `test/mainLiveEmotion.test.js:1-280`

**Interfaces:**

- Consumes: Task 2 `canvasToPng`, `sharePng`, `downloadBlob`; Task 5 `openQrTransferModal`.
- Produces:

```js
showResult(root, result, mosaicCanvas, { onReceivePhoto } = {})
onReceivePhoto({ canvas, filename, trigger })
```

- [ ] **Step 1: 결과 UI의 QR 행동과 iPad 공유 fallback 테스트를 작성한다.**

`test/ui.test.js`에 다음 테스트를 추가하고, Canvas Blob 변환은 모듈 mock으로 제어한다.

```js
it('shows QR photo transfer only for a completed mosaic and sends a result card payload', () => {
  const onReceivePhoto = vi.fn();
  showResult(root, result, document.createElement('canvas'), { onReceivePhoto });
  const button = [...root.querySelectorAll('button')].find((el) => el.textContent === 'QR로 사진 받기');
  button.click();
  expect(onReceivePhoto).toHaveBeenCalledWith(expect.objectContaining({
    filename: 'hueman-result-joy.png', trigger: button,
  }));
});

it('does not show QR transfer when no mosaic exists', () => {
  showResult(root, result, null, { onReceivePhoto: vi.fn() });
  expect(root.textContent).not.toContain('QR로 사진 받기');
});
```

`test/mainLiveEmotion.test.js`에는 결과 도달 시 main이 `openQrTransferModal`에
결과 Canvas와 클릭한 trigger를 전달하는 통합 mock 테스트를 추가한다.

- [ ] **Step 2: 새 결과 UI 테스트가 실패하는지 확인한다.**

Run: `npm test -- test/ui.test.js test/mainLiveEmotion.test.js`

Expected: `QR로 사진 받기` 버튼과 fourth options 인자가 없어 FAIL.

- [ ] **Step 3: 결과 행동과 main 배선을 구현한다.**

`showResult`의 signature를 다음처럼 확장한다.

```js
export function showResult(root, result, mosaicCanvas, { onReceivePhoto } = {}) {
```

모자이크가 있을 때 `결과 카드 저장` 다음에 `QR로 사진 받기` 버튼을 추가한다. 클릭 시
한 번만 만든 `createResultCardCanvas(result, mosaic.full)`과 `resultFilename(result)`, 버튼을
`onReceivePhoto`에 보낸다. 기존 `downloadCanvas`는 async `saveCanvas()`로 바꾸어
`canvasToPng → sharePng → downloadBlob` 순서로 실행한다. `sharePng` 결과가 `shared`가 아닌
경우에만 기존 다운로드를 실행한다.

`src/main.js`에는 다음 import와 callback을 넣는다.

```js
import { openQrTransferModal } from './qrTransferModal.js';

showResult(root, result, mosaic, {
  onReceivePhoto: ({ canvas, filename, trigger }) => openQrTransferModal({ canvas, filename, trigger }),
});
```

`index.html`의 viewport에는 `viewport-fit=cover`를 추가한다.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

`styles/main.css`에는 `100dvh`와 safe area를 기존 scene/result padding에 적용하고, QR
overlay를 추가한다.

```css
html, body, #app { height: 100dvh; min-height: 100%; }
.qr-transfer-overlay {
  position: fixed; inset: 0; z-index: 10002; overflow-y: auto;
  display: grid; place-items: center;
  padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right))
           max(24px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
  background: rgba(0, 0, 0, .82);
}
.qr-transfer-card { width: min(440px, 100%); min-height: 44px; }
```

기존 모든 `:hover` 규칙은 `@media (hover: hover) and (pointer: fine)` 안으로 옮기고,
새 행동 버튼에는 `min-height: 44px; touch-action: manipulation;`을 준다.

- [ ] **Step 4: 결과 UI 회귀 테스트를 통과시킨다.**

Run: `npm test -- test/ui.test.js test/mainLiveEmotion.test.js`

Expected: 기존 결과·카메라 테스트와 새 QR 배선 테스트가 PASS.

- [ ] **Step 5: iPad 결과 연결을 커밋한다.**

```bash
git add src/ui.js src/main.js index.html styles/main.css test/ui.test.js test/mainLiveEmotion.test.js
git commit -m "feat: connect result cards to QR transfer"
```

### Task 7: 휴대폰 수신 페이지와 저장/공유 UI를 TDD로 구현한다

**Files:**

- Create: `receive.html`
- Create: `src/receive.js`
- Create: `styles/receive.css`
- Create: `test/receive.test.js`

**Interfaces:**

- Consumes: Task 2 `getTransferApiUrl`, `fetchTransfer`, `sharePng`, `downloadBlob`; `window.location.hash`.
- Produces:

```js
export function tokenFromHash(hash)
export async function renderReceiver(root, {
  token, apiUrl, fetchImage, shareImage, downloadImage, documentRef
} = {})
export function startReceiverPage()
```

- [ ] **Step 1: 수신 페이지 상태와 저장 fallback 테스트를 작성한다.**

`test/receive.test.js`에서 `fetchImage`을 주입하고 다음을 검증한다.

```js
const API = 'https://worker.example';
const TOKEN = '1760000600000.123e4567-e89b-42d3-a456-426614174000';
const PNG = new Blob(['png'], { type: 'image/png' });

it('renders a received image and shares the PNG when the device supports it', async () => {
  const shareImage = vi.fn().mockResolvedValue('shared');
  await renderReceiver(root, { token: TOKEN, apiUrl: API, fetchImage: vi.fn().mockResolvedValue(PNG), shareImage, downloadImage: vi.fn() });
  expect(root.querySelector('img').src).toContain('blob:');
  root.querySelector('button').click();
  expect(shareImage).toHaveBeenCalledWith(PNG, 'hueman-result.png');
});

it('shows invalid-token and misconfigured initial states', async () => {
  await renderReceiver(root, { token: '', apiUrl: API, fetchImage: vi.fn(), shareImage: vi.fn(), downloadImage: vi.fn() });
  expect(root.dataset.state).toBe('invalid-token');
  await renderReceiver(root, { token: TOKEN, apiUrl: null, fetchImage: vi.fn(), shareImage: vi.fn(), downloadImage: vi.fn() });
  expect(root.dataset.state).toBe('misconfigured');
});

it('shows an expiry message for an expired Worker response', async () => {
  await renderReceiver(root, {
    token: TOKEN, apiUrl: API,
    fetchImage: vi.fn().mockRejectedValue(new TransferError('expired', 'expired', 410)),
    shareImage: vi.fn(), downloadImage: vi.fn(),
  });
  expect(root.dataset.state).toBe('expired');
  expect(root.textContent).toContain('링크가 만료되었습니다');
});

it('downloads after unavailable file sharing', async () => {
  const downloadImage = vi.fn();
  await renderReceiver(root, {
    token: TOKEN, apiUrl: API, fetchImage: vi.fn().mockResolvedValue(PNG),
    shareImage: vi.fn().mockResolvedValue('unavailable'), downloadImage,
  });
  root.querySelector('button').click();
  await vi.waitFor(() => expect(downloadImage).toHaveBeenCalledWith(PNG, 'hueman-result.png'));
});
```

- [ ] **Step 2: 수신 테스트가 모듈 부재로 실패하는지 확인한다.**

Run: `npm test -- test/receive.test.js`

Expected: `receive.js` import 부재로 FAIL.

- [ ] **Step 3: HTML·수신 모듈·전용 스타일을 구현한다.**

`receive.html`은 app entry와 분리한다.

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>hueman 결과 카드</title>
    <link rel="stylesheet" href="/styles/receive.css" />
  </head>
  <body><main id="receive-app"></main><script type="module" src="/src/receive.js"></script></body>
</html>
```

`tokenFromHash()`은 leading `#`을 제거하고 `decodeURIComponent` 후 Task 2와 같은 token
정규식으로 유효성을 검사한다. `renderReceiver()`는 API/token 오류를 먼저 보여 주고, 성공 시
`URL.createObjectURL(blob)`으로 `<img alt="hueman 결과 카드">`를 만든다. `사진 저장·공유`
버튼은 `shareImage(blob, 'hueman-result.png')`을 호출하며, 결과가 `shared`가 아니면
`downloadImage(blob, 'hueman-result.png')`을 호출하고 `이미지를 길게 눌러 사진 앱에 저장할 수도 있습니다.`
문구를 보인다. `TransferError` code별 문구는 다음처럼 고정한다.

모든 상태 전환에서 `root.dataset.state`를 `loading`, `ready`, `invalid-token`,
`misconfigured`, `expired`, `not-found`, `network` 중 하나로 설정한다.

```js
const MESSAGE = {
  expired: '링크가 만료되었습니다. iPad에서 새 QR을 요청해 주세요.',
  'not-found': '사진을 찾을 수 없습니다. QR을 다시 스캔해 주세요.',
  network: '연결을 확인한 뒤 다시 시도해 주세요.',
  misconfigured: '전송 서버가 아직 설정되지 않았습니다.',
  'invalid-token': '올바른 QR 링크가 아닙니다.',
};
```

`styles/receive.css`는 밝은 배경, 최대 720px 이미지, 44px 저장 버튼,
`min-height: 100dvh`, safe-area padding, 세로·가로에서도 자연스러운 스크롤을 제공한다.
모듈 맨 아래의 `startReceiverPage()`는 `#receive-app`이 있을 때만 실행해 단위 import를
부작용 없이 유지한다.

- [ ] **Step 4: 수신 페이지 테스트를 통과시킨다.**

Run: `npm test -- test/receive.test.js`

Expected: token, 성공 이미지, 만료/없는 파일/네트워크, Web Share fallback 테스트가 PASS.

- [ ] **Step 5: 휴대폰 수신 경험을 커밋한다.**

```bash
git add receive.html src/receive.js styles/receive.css test/receive.test.js
git commit -m "feat: add QR photo receiver page"
```

### Task 8: 문서·전체 검증·배포 전 iPad QA를 완료한다

**Files:**

- Modify: `docs/manual-test-checklist.md`
- Modify: `.agents/coordination/current-state.md`
- Modify: `.agents/coordination/inbox.md`
- Modify: `.agents/coordination/session-log.md`
- Modify: `.agents/coordination/locks.md`

**Interfaces:**

- Consumes: Tasks 1–7의 테스트, `worker/README.md` 배포 절차, 실제 iPad Safari와 Worker URL.
- Produces: 재현 가능한 전시 QA 체크리스트와 실제 검증 결과를 반영한 협업 상태.

- [ ] **Step 1: iPad/QR 수동 QA 항목을 문서에 추가한다.**

`docs/manual-test-checklist.md`에 `9. QR 사진 전달 / iPad` 섹션을 추가한다.

```markdown
## 9. QR 사진 전달 / iPad
- [ ] iPad Safari 세로·가로에서 결과 카드가 잘리지 않고 QR 버튼이 44px 이상으로 눌린다.
- [ ] 모자이크 결과에서만 **QR로 사진 받기**가 보이며, 카메라 없이 시작한 결과에는 없다.
- [ ] QR 생성 중 진행 상태가 보이고, 네트워크 실패 시 재시도와 iPad 직접 저장이 된다.
- [ ] 휴대폰 카메라로 QR을 스캔하면 `receive.html#token`이 열리고 이미지 미리보기가 보인다.
- [ ] iPhone/iPad 공유 시트에서 사진을 저장하거나, fallback 다운로드·길게 눌러 저장 안내가 보인다.
- [ ] 10분 후 수신 링크가 만료 안내를 보이고 Worker가 410을 돌려준다.
- [ ] Cloudflare R2 버킷이 public access 없이 Worker binding으로만 접근되는지 확인한다.
```

- [ ] **Step 2: 전체 자동 검증을 실행한다.**

Run: `npm test && npm run build && test -f dist/index.html && test -f dist/receive.html`

Expected: 모든 Vitest suite PASS, Vite build exit 0, 두 HTML 파일 존재. 기존 bundle size warning만 남을 수 있다.

- [ ] **Step 3: Worker 로컬 smoke test를 실행한다.**

Run: `npm run worker:dev -- --test-scheduled`

Expected: Wrangler가 R2 local simulation과 scheduled handler를 로드한다. 별도 터미널에서
`curl`로 `POST /v1/transfers`, `GET /v1/transfers/<token>`을 호출해 `201`과 `200 image/png`을 확인한다.

- [ ] **Step 4: 실제 iPad와 Cloudflare 배포 수동 검증을 기록한다.**

`worker/README.md` 순서로 비공개 R2 bucket, Worker, GitHub `QR_TRANSFER_API_URL` variable을
설정하고 Pages를 배포한다. 체크리스트 9의 항목을 실행해 iPad 세로/가로, QR 스캔,
사진 저장/공유, 네트워크 실패, 10분 `410`을 기록한다. 실제 Cloudflare 계정 권한이 없는
환경에서는 자동 검증만 완료로 표시하고, 수동 단계와 필요한 계정 작업을 session log에
명시한다.

- [ ] **Step 5: 협업 상태를 업데이트하고 최종 커밋한다.**

`current-state.md`의 QR 기능을 “구현 완료”로 바꾸고, `inbox.md`의 설계 검토 대기 메모를
Resolved로 옮긴다. `session-log.md`에는 테스트·build·Worker smoke·iPad 수동 QA 결과를
짧게 남긴다. `locks.md`의 QR 관련 lock을 해제한다.

```bash
git add docs/manual-test-checklist.md .agents/coordination
git commit -m "docs: add QR transfer iPad QA"
```

## Plan Self-Review

### Spec coverage

- QR 업로드/수신/10분 만료/삭제: Tasks 2, 3, 5, 7.
- 비공개 R2·8 MiB PNG·CORS·rate-limit 운영 안내: Tasks 3, 4.
- QR fragment token·외부 QR 서비스 미사용: Tasks 2, 5.
- iPad 공유·다운로드 fallback·safe area·회전·44px 터치: Tasks 2, 5, 6, 7, 8.
- GitHub Pages 다중 수신 페이지와 API build variable: Task 4.
- 기존 체험 회귀와 QR 오류 격리: Tasks 2, 6, 8.
- 자동/unit/Worker/수동 iPad QA: Tasks 1–8.
- 추적되지 않은 영상 설명 파일 때문에 발생한 현재 테스트 실패: Task 1.

### Placeholder scan

계획의 함수 이름, 요청 경로, R2 key, 오류 code, 명령, 커밋 범위는 모두 명시했다. 남겨 둔 구현 공백이나 모호한 오류 처리 지시는 없다.

### Type consistency

- Task 2의 `TransferError`, `canvasToPng`, `createTransfer`, `fetchTransfer`, `sharePng`, `downloadBlob`, `buildReceiveUrl`을 Tasks 5–7에서 동일 이름과 인자로 사용한다.
- Task 3의 `token = <expiresAt>.<UUID>`와 Task 2·5·7의 token regex/수신 URL 형식이 일치한다.
- Task 6의 `onReceivePhoto({ canvas, filename, trigger })` payload가 Task 5 `openQrTransferModal()`의 입력과 일치한다.

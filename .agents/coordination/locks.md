# Locks

Last updated: 2026-08-13 19:25 KST by Codex

## Active Locks

| Agent | Scope | Status | Since | Notes |
| --- | --- | --- | --- | --- |
| Codex | `docs/superpowers/{specs,plans}/2026-08-13-emotion-wall-*.md`, `worker/src/{index,transfer,wall}.js`, `worker/wrangler.jsonc`, `src/{main,wall,wallClient}.js`, `wall.html`, `styles/wall.css`, `vite.config.js`, `test/{wall,worker,workerEntry,wallClient,wallPage,buildLayout}.test.js`, `.agents/coordination/{current-state,inbox,session-log,locks}.md` | active | 2026-08-13 19:25 KST | Implement privacy-preserving shared emotion wall with a Cloudflare Durable Object and separate exhibit screen. |

## Lock Rules

- Take the smallest practical lock before editing shared files.
- Replace the `_None_` row with active locks when work starts.
- Release locks promptly after work completes.
- If a lock looks stale, ask in `inbox.md` before editing the same scope.

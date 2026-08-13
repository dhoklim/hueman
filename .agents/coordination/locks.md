# Locks

Last updated: 2026-08-13 14:35 KST by Codex

## Active Locks

| Agent | Scope | Status | Since | Notes |
| --- | --- | --- | --- | --- |
| Codex | `worker/**`, `.github/workflows/deploy.yml`, `test/buildLayout.test.js`, `.agents/coordination/{current-state,inbox,session-log,locks}.md` | active | 2026-08-13 14:35 KST | Verify and deploy QR transfer service, configure Pages build, record release. |

## Lock Rules

- Take the smallest practical lock before editing shared files.
- Replace the `_None_` row with active locks when work starts.
- Release locks promptly after work completes.
- If a lock looks stale, ask in `inbox.md` before editing the same scope.

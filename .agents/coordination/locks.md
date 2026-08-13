# Locks

Last updated: 2026-08-13 14:20 KST by Codex

## Active Locks

| Agent | Scope | Status | Since | Notes |
| --- | --- | --- | --- | --- |
| Codex | `main` integration; `.agents/coordination/*` | active | 2026-08-13 14:20 KST | 사용자 완료 요청에 따라 QR worktree를 main으로 로컬 통합 |

## Lock Rules

- Take the smallest practical lock before editing shared files.
- Replace the `_None_` row with active locks when work starts.
- Release locks promptly after work completes.
- If a lock looks stale, ask in `inbox.md` before editing the same scope.

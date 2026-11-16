# Locks

Last updated: 2026-11-16 23:27 KST by Claude Code

## Active Locks

| Agent | Scope | Status | Since | Notes |
| --- | --- | --- | --- | --- |
| Claude Code | `src/main.js`, `src/ui.js`, `src/qrTransferModal.js`, `src/gallery.js`, `src/videoMap.js`, `public/video/`, `test/` | active | 2026-11-16 23:27 KST | 전시 노트북 감사 후 버그 수정 (리셋·HEVC·노트북 문구·갤러리) |

## Lock Rules

- Take the smallest practical lock before editing shared files.
- Replace the `_None_` row with active locks when work starts.
- Release locks promptly after work completes.
- If a lock looks stale, ask in `inbox.md` before editing the same scope.

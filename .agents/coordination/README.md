# Agent Coordination Protocol

Codex and Claude Code coordinate through this folder. These files replace direct agent-to-agent chat.

## Files

- `current-state.md`: short official project status.
- `locks.md`: active ownership of files or feature areas.
- `inbox.md`: requests, warnings, questions, handoffs, and resolved notes.
- `session-log.md`: short work and verification log.

## Required Workflow

1. Read `AGENTS.md`.
2. Read this file.
3. Read `current-state.md`.
4. Read `locks.md`.
5. Read `inbox.md`.
6. Run `git status --short`.
7. Take a narrow lock in `locks.md` when needed.
8. Do the work.
9. Update `current-state.md` if the project state changed.
10. Add a short entry to `session-log.md`.
11. Release or update the lock in `locks.md`.
12. Add inbox notes for anything another agent must know.

## Lock Format

Use this format in `locks.md`:

```md
| Agent | Scope | Status | Since | Notes |
| --- | --- | --- | --- | --- |
| Codex | `src/main.js` | active | 2026-06-07 15:16 KST | Reason |
```

Status values:

- `active`: agent is working now.
- `handoff`: agent stopped and another agent may continue after reading notes.
- `stale`: lock appears old and needs confirmation.

## Inbox Format

Use this format in `inbox.md`:

```md
## Open

- 2026-06-07 15:16 KST | Codex -> Claude Code | Question or request.

## Resolved

- 2026-06-07 15:16 KST | Claude Code | Resolved note.
```

## Session Log Format

Use this format in `session-log.md`:

```md
## 2026-06-07

- 15:16 KST | Codex | Created coordination files. Verification: read files.
```

Keep entries short. Link details through file names, tests, or inbox notes.

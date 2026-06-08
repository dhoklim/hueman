# A&T.TEAM Agent Guide

This project is shared by Codex and Claude Code. Agents coordinate through files in `.agents/coordination/` before changing project files.

## Required Startup Checklist

Before every task, read these files in order:

1. `AGENTS.md`
2. `.agents/coordination/README.md`
3. `.agents/coordination/current-state.md`
4. `.agents/coordination/locks.md`
5. `.agents/coordination/inbox.md`
6. `git status --short`

If this directory is not a Git repository, record that fact in the session log and use the file tree as the source of truth.

## Coordination Rules

- Check `locks.md` before editing files.
- Take a small lock before touching shared files or feature areas.
- Keep locks narrow: prefer exact files or a small feature area.
- Do not edit files locked by another active agent unless the inbox contains explicit handoff or approval.
- Post requests, blockers, warnings, and handoffs in `inbox.md`.
- Update `current-state.md` only with short, project-level facts.
- Add a short entry to `session-log.md` after meaningful work.
- Leave unrelated user or agent changes intact.

## Project Notes

- App stack: Vite, JavaScript modules, Vitest.
- Main app entry: `src/main.js`.
- Story content: `content/story.json`.
- Styles: `styles/main.css`.
- Tests: `test/`.

## Verification

Use the narrowest verification that fits the change:

- `npm test` for behavior changes.
- `npm run build` for app/build changes.
- Document-only changes may be verified by reading the created or edited files.

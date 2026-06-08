# hueman Roadmap Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current hueman prototype into a stronger exhibition-ready build with safer camera handling, richer result artifacts, local gallery opt-in, improved mosaic matching, timeline reflection, story callbacks, basic sound, and git hygiene.

**Architecture:** Keep the existing Vite module structure. Add small focused modules for result-card generation, local gallery storage, story text resolution, and sound cues. Extend `experienceLog` and `mosaic` with tested pure helpers, then wire them through `main.js` and `ui.js`.

**Tech Stack:** Vite, JavaScript modules, Vitest/jsdom, browser Canvas/WebAudio/localStorage APIs.

---

### Task 1: TDD Coverage For New Behaviors

**Files:**
- Create: `test/liveEmotion.test.js`
- Create: `test/resultCard.test.js`
- Create: `test/gallery.test.js`
- Create: `test/storyText.test.js`
- Modify: `test/mosaic.test.js`
- Modify: `test/experienceLog.test.js`
- Modify: `test/ui.test.js`

- [ ] Write failing tests for camera cleanup on startup failure, timeline extraction, mosaic color matching, result-card button rendering, gallery storage limits, and story callback resolution.
- [ ] Run targeted tests and confirm they fail because the new APIs do not exist yet.

### Task 2: Core Pure Modules

**Files:**
- Create: `src/resultCard.js`
- Create: `src/gallery.js`
- Create: `src/storyText.js`
- Create: `src/sound.js`
- Modify: `src/experienceLog.js`
- Modify: `src/mosaic.js`
- Modify: `src/liveEmotion.js`

- [ ] Implement only enough code for the new tests to pass.
- [ ] Keep browser-only APIs guarded so jsdom tests can run.

### Task 3: UI Wiring

**Files:**
- Modify: `src/ui.js`
- Modify: `src/main.js`
- Modify: `content/story.json`
- Modify: `styles/main.css`

- [ ] Render consent/privacy language on intro.
- [ ] Pass resolved scene text through accumulated flags.
- [ ] Add emotion timeline and result-card save actions.
- [ ] Add local gallery opt-in and overlay.
- [ ] Add operator restart shortcut and compact result layout.
- [ ] Add restrained audio cue calls after user begins.

### Task 4: Project Hygiene

**Files:**
- Create: `.gitignore`
- Modify: `.agents/coordination/current-state.md`
- Modify: `.agents/coordination/session-log.md`
- Modify: `.agents/coordination/locks.md`

- [ ] Add `.gitignore`.
- [ ] Initialize Git if still missing.
- [ ] Run `npm test` and `npm run build`.
- [ ] Commit intended source/documentation changes with Conventional Commit messages.

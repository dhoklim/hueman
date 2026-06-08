# 10x Analysis: hueman
Session 1 | Date: 2026-06-08

## Current Value

`hueman` is an interactive emotion installation prototype. It already has three working systems:

- System A: branching life-story engine.
- System B: webcam expression to emotion color filter.
- System C: final face mosaic and comfort message.

Its strongest value is not technical novelty alone. The core value is the emotional loop: the participant makes life choices, sees the screen respond to their face, and leaves with a visual artifact that says every feeling was part of them.

## The Question

What would make this 10x more memorable as an artwork, not merely 10% more feature-rich?

---

## Massive Opportunities

### 1. Living Gallery Wall

**What**: After each participant finishes, their anonymized mosaic joins a projected gallery wall of prior participants. The wall slowly shifts by dominant emotion color.

**Why 10x**: It turns a solo experience into a collective artwork. The message expands from "all my emotions are me" to "all our emotions coexist."

**Unlocks**: Exhibition finale, social proof, stronger visual impact for judges/visitors, a reason to watch after finishing.

**Effort**: High

**Risk**: Privacy handling must be explicit. The participant must choose whether to contribute.

**Score**: 🔥 Must do for exhibition scale

### 2. Physical Installation Mode

**What**: Add a kiosk/exhibition mode with idle loop, guided start/end, hardware button mapping, camera readiness check, and reset-after-finish.

**Why 10x**: The current app is a strong browser prototype. Installation mode makes it feel like a finished artwork that can survive real visitors.

**Unlocks**: Reliable booth operation, easier demos, fewer operator interventions.

**Effort**: Medium to High

**Risk**: Hardware integration can absorb time if scope is not kept narrow.

**Score**: 🔥 Must do before a public showing

### 3. Sound and Breath Layer

**What**: Add scene-aware ambient audio, heartbeat/breath sounds, and a final sound swell when the mosaic appears.

**Why 10x**: The concept is bodily and emotional. Sound will make the color/filter system feel less like a UI and more like an embodied experience.

**Unlocks**: Stronger immersion without needing much more story content.

**Effort**: Medium

**Risk**: Bad sound design can feel melodramatic. Keep it restrained.

**Score**: 👍 Strong

---

## Medium Opportunities

### 1. Better Mosaic Algorithm

**What**: Choose tiles by brightness/color similarity instead of simple cycling, then apply target color/contrast more selectively.

**Why 10x**: The final artifact is the souvenir and emotional proof. If it reads clearly as a face from far away and as emotion tiles up close, the whole work lands harder.

**Impact**: Stronger final "wow" moment.

**Effort**: Medium

**Score**: 🔥 Must do

### 2. Emotion Timeline Result

**What**: Add a thin timeline under the result showing the participant's emotional journey across life stages.

**Why 10x**: It makes the invisible path legible. The participant can see not only the top emotion, but how their experience changed.

**Impact**: More reflective ending, better explanation during evaluation.

**Effort**: Low to Medium

**Score**: 🔥 Must do

### 3. Story Beats With Memory

**What**: Let earlier choices reappear as short callbacks in later scenes. Example: "You learned early to stand alone" changes a youth or elder line.

**Why 10x**: The current flags already support accumulated state. More callbacks would make choices feel emotionally remembered.

**Impact**: Deeper narrative agency without requiring a huge branch tree.

**Effort**: Medium

**Score**: 👍 Strong

### 4. Consent and Privacy Flow

**What**: Add a short clear consent screen before camera use and a delete/keep choice at the end.

**Why 10x**: Face data is sensitive. Trust increases the emotional safety of the piece.

**Impact**: Better ethics, easier presentation, fewer concerns from teachers/judges/visitors.

**Effort**: Low

**Score**: 🔥 Must do

---

## Small Gems

### 1. Camera Readiness Indicator

**What**: Before starting, show "face found / lighting okay / camera ready."

**Why powerful**: Prevents weak emotion detection and bad mosaics before the journey begins.

**Effort**: Low

**Score**: 🔥 Must do

### 2. Result Save Card

**What**: Save a composed result image with mosaic, dominant emotion, message, and title, not just the canvas.

**Why powerful**: The participant leaves with a complete artifact that explains itself.

**Effort**: Low to Medium

**Score**: 🔥 Must do

### 3. Restart Button Hidden From Main Flow

**What**: Add a small operator-only reset/restart shortcut for exhibition operation.

**Why powerful**: Real booths need fast reset after a participant leaves.

**Effort**: Low

**Score**: 👍 Strong

### 4. Mobile/Small Screen Safety

**What**: Allow result pages to scroll or compact when the mosaic is present.

**Why powerful**: Prevents the finale from clipping on laptops/tablets.

**Effort**: Low

**Score**: 🔥 Must do

### 5. Git Initialization

**What**: Initialize a repository, commit the current milestone, and stop relying only on the file tree.

**Why powerful**: It makes experimentation safer.

**Effort**: Low

**Score**: 🔥 Must do

---

## Recommended Priority

### Do Now

1. Fix exhibition reliability basics: Git initialization, camera failure cleanup, mobile/result overflow.
2. Add consent/privacy copy and final keep/delete language.
3. Improve the result artifact: composed save card plus emotion timeline.
4. Improve mosaic tile matching so the final face reads more clearly.

### Do Next

1. Add installation mode: idle screen, camera readiness, reset shortcut, hardware-button compatibility.
2. Add story callbacks from accumulated flags.
3. Add restrained sound design for key stages and the final reveal.

### Explore

1. Living Gallery Wall with explicit opt-in.
2. Heart-rate or simple arousal input if real hardware is available.
3. Multi-person exhibition dashboard for operators.

### Backlog

1. More story branches. Useful, but less important than making the existing journey land.
2. More emotion categories. Useful only after the current categories feel precise and explainable.
3. Heavy visual effects. Risky unless they reinforce the emotional theme.

## Next Steps

- Decide the target: classroom demo, portfolio piece, or public installation.
- If public installation is the target, prioritize reliability and consent first.
- If portfolio is the target, prioritize final artifact, screenshots/video capture, and a polished README.
- If classroom demo is the target, prioritize manual testing, presenter notes, and a short evaluation script.

import { describe, it, expect } from 'vitest';
import story from '../content/story.json';
import { EMOTIONS } from '../src/emotionColor.js';
import { resolveNext } from '../src/resolver.js';

const ids = Object.keys(story.scenes);

function variantTargets(next) {
  if (typeof next === 'string') return [next];
  if (next && next.variants) return next.variants.map((v) => v.to);
  return [];
}
function targetsOf(scene) {
  const out = [];
  if (scene.type === 'choice') {
    for (const c of scene.choices) out.push(...variantTargets(c.next));
  } else if (scene.type !== 'ending') {
    out.push(...variantTargets(scene.next));
  }
  return out;
}

describe('story.json integrity', () => {
  it('has a valid start scene', () => {
    expect(story.scenes[story.start]).toBeTruthy();
  });

  it('every scene has id/type/text/emotion with a known emotion', () => {
    for (const id of ids) {
      const s = story.scenes[id];
      expect(s.id, `${id}.id`).toBe(id);
      expect(['scene', 'choice', 'ending'], `${id}.type`).toContain(s.type);
      expect(typeof s.text, `${id}.text`).toBe('string');
      expect(EMOTIONS[s.emotion], `${id}.emotion=${s.emotion}`).toBeTruthy();
    }
  });

  it('every next/choice target points to an existing scene', () => {
    for (const id of ids) {
      for (const t of targetsOf(story.scenes[id])) {
        expect(ids, `${id} -> ${t}`).toContain(t);
      }
    }
  });

  it('choice scenes have 2 to 6 choices with labels', () => {
    for (const id of ids) {
      const s = story.scenes[id];
      if (s.type !== 'choice') continue;
      expect(s.choices.length, `${id}.choices`).toBeGreaterThanOrEqual(2);
      expect(s.choices.length, `${id}.choices`).toBeLessThanOrEqual(6);
      for (const c of s.choices) expect(typeof c.label).toBe('string');
    }
  });

  it('every choice carries a receipt line for the path summary', () => {
    for (const id of ids) {
      const s = story.scenes[id];
      if (s.type !== 'choice') continue;
      for (const c of s.choices) {
        expect(typeof c.receipt, `${id} "${c.label}".receipt`).toBe('string');
        expect(c.receipt.length, `${id} "${c.label}".receipt`).toBeGreaterThan(0);
      }
    }
  });

  it('walking from start with all-left and all-right choices both reach an ending', () => {
    for (const pick of [0, 1]) {
      let id = story.start;
      let flags = {};
      const seen = new Set();
      while (true) {
        expect(seen.has(id), `loop at ${id}`).toBe(false);
        seen.add(id);
        const s = story.scenes[id];
        if (s.type === 'ending') break;
        if (s.type === 'choice') {
          const c = s.choices[pick] || s.choices[0];
          flags = { ...flags };
          for (const [k, v] of Object.entries(c.effects || {})) {
            flags[k] = typeof v === 'number' ? (flags[k] || 0) + v : v;
          }
          id = resolveNext(c.next, flags);
        } else {
          id = resolveNext(s.next, flags);
        }
        expect(id, 'dangling next').toBeTruthy();
      }
    }
  });
});

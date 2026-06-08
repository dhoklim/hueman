import { applyEffects, resolveNext } from './resolver.js';

// engine = { story, currentId, flags }
export function createEngine(story) {
  return { story, currentId: story.start, flags: {} };
}

export function current(engine) {
  return engine.story.scenes[engine.currentId];
}

export function isEnding(scene) {
  return scene.type === 'ending';
}

export function advance(engine) {
  const scene = current(engine);
  engine.currentId = resolveNext(scene.next, engine.flags);
  return current(engine);
}

export function choose(engine, index) {
  const scene = current(engine);
  const choice = scene.choices[index];
  engine.flags = applyEffects(engine.flags, choice.effects);
  engine.currentId = resolveNext(choice.next, engine.flags);
  return current(engine);
}

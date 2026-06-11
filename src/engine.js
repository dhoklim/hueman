import { applyEffects, resolveNext } from './resolver.js';

// engine = { story, currentId, flags, path }
export function createEngine(story) {
  return { story, currentId: story.start, flags: {}, path: [] };
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
  const entry = { sceneId: scene.id, index, label: choice.label };
  if (choice.receipt) entry.receipt = choice.receipt;
  engine.path.push(entry);
  engine.flags = applyEffects(engine.flags, choice.effects);
  engine.currentId = resolveNext(choice.next, engine.flags);
  return current(engine);
}

// 갈림길에서 한 선택들을 한 줄 문구(영수증)로 — receipt 가 있는 선택만.
export function receipts(engine) {
  return engine.path.filter((p) => p.receipt).map((p) => p.receipt);
}

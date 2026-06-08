import { matchesCondition } from './resolver.js';

export function resolveSceneText(scene, flags = {}) {
  for (const variant of scene.textVariants || []) {
    if (matchesCondition(flags, variant.when || {})) return variant.text;
  }
  return scene.text;
}

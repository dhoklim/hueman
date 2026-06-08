import { describe, it, expect } from 'vitest';
import { resolveSceneText } from '../src/storyText.js';

describe('resolveSceneText', () => {
  it('returns the base text when no variant matches', () => {
    const scene = {
      text: '기본 문장',
      textVariants: [{ when: { warmth: '>=2' }, text: '따뜻한 문장' }],
    };

    expect(resolveSceneText(scene, { warmth: 1 })).toBe('기본 문장');
  });

  it('returns the first matching accumulated-choice variant', () => {
    const scene = {
      text: '기본 문장',
      textVariants: [
        { when: { conflict: '>=1' }, text: '너는 네 길을 고집했던 사람이다.' },
        { when: { adapt: '>=1' }, text: '너는 맞추며 버틴 사람이다.' },
      ],
    };

    expect(resolveSceneText(scene, { conflict: 1, adapt: 1 })).toBe('너는 네 길을 고집했던 사람이다.');
  });
});

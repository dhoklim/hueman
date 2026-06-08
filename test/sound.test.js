import { describe, it, expect } from 'vitest';
import { cueForEmotion } from '../src/sound.js';

describe('sound cue mapping', () => {
  it('maps scene emotions to restrained audio cues', () => {
    expect(cueForEmotion('joy')).toEqual({ frequency: 440, duration: 0.12 });
    expect(cueForEmotion('sad')).toEqual({ frequency: 220, duration: 0.18 });
    expect(cueForEmotion('unknown')).toEqual({ frequency: 196, duration: 0.1 });
  });
});

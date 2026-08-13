import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import story from '../content/story.json';
import { SCENE_VIDEOS } from '../src/videoMap.js';

const LEGACY_FALLBACK_FILES = new Set([
  'childhood.mp4',
  'teen.mp4',
  'no-date.mp4',
  'smoke-no.mp4',
  'startup.mp4',
]);

describe('video map integrity', () => {
  it('keeps video clips on required study scenes', () => {
    expect(SCENE_VIDEOS.study_2, 'study_2').toBeTruthy();
    expect(SCENE_VIDEOS.study_5, 'study_5').toBeTruthy();
  });

  it('maps only existing story scenes to existing video files', () => {
    for (const [sceneId, config] of Object.entries(SCENE_VIDEOS)) {
      expect(story.scenes[sceneId], sceneId).toBeTruthy();
      expect(
        existsSync(join(process.cwd(), 'public', 'video', config.file)),
        `${sceneId} -> ${config.file}`
      ).toBe(true);
    }
  });

  it('does not reuse one video clip for multiple scene texts', () => {
    const owners = new Map();

    for (const [sceneId, config] of Object.entries(SCENE_VIDEOS)) {
      const clipKey = `${config.file}#${config.start ?? 0}-${config.end ?? 'end'}`;
      const previous = owners.get(clipKey);
      expect(
        previous,
        `${clipKey} is used by both ${previous} and ${sceneId}`
      ).toBeUndefined();
      owners.set(clipKey, sceneId);
    }
  });

  it('does not use legacy fallback reels', () => {
    for (const [sceneId, config] of Object.entries(SCENE_VIDEOS)) {
      expect(
        LEGACY_FALLBACK_FILES.has(config.file),
        `${sceneId} uses legacy fallback ${config.file}`
      ).toBe(false);
    }
  });

  it('does not vary the dialog text for mapped video scenes', () => {
    for (const sceneId of Object.keys(SCENE_VIDEOS)) {
      expect(
        story.scenes[sceneId].textVariants,
        `${sceneId} has conditional text for one mapped video`
      ).toBeUndefined();
    }
  });
});

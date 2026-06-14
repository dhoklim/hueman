import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import story from '../content/story.json';
import { SCENE_VIDEOS } from '../src/videoMap.js';

const videoDescription = readFileSync(
  join(process.cwd(), 'video', '영상_장면_설명.txt'),
  'utf8'
);

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

  it('uses only documented per-scene video files, not legacy fallback reels', () => {
    for (const [sceneId, config] of Object.entries(SCENE_VIDEOS)) {
      expect(
        videoDescription.includes(config.file),
        `${sceneId} uses undocumented video ${config.file}`
      ).toBe(true);
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

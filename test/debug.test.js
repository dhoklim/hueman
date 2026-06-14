// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { updateDebug } from '../src/debug.js';

function engineAt(scene) {
  return {
    story: { scenes: { [scene.id]: scene } },
    currentId: scene.id,
    flags: {},
  };
}

describe('debug panel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not show the viewer current emotion as a color swatch', () => {
    updateDebug(
      engineAt({ id: 'opening', stage: 'infancy', type: 'scene', emotion: 'joy' }),
      { events: [] },
      { active: true, emotion: 'anger', detected: 'anger', tiles: 0, hasTarget: false }
    );

    const cameraRow = [...document.querySelectorAll('.dbg-row')]
      .find((row) => row.textContent.includes('카메라 감정'));

    expect(cameraRow.querySelector('.swatch')).toBeNull();
    expect(cameraRow.textContent).not.toContain('분노');
  });
});

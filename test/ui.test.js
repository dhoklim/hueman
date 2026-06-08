// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderIntro, renderScene, showResult } from '../src/ui.js';

describe('ui.renderIntro', () => {
  it('shows description and fires onStart with camera flag from each button', () => {
    const root = document.createElement('div');
    const onStart = vi.fn();
    renderIntro(root, { onStart });
    expect(root.textContent).toContain('hueman');
    expect(root.querySelector('.intro-start-cam')).toBeTruthy();
    expect(root.querySelector('.intro-start-plain')).toBeTruthy();
    root.querySelector('.intro-start-cam').click();
    expect(onStart).toHaveBeenCalledWith(true);
    root.querySelector('.intro-start-plain').click();
    expect(onStart).toHaveBeenCalledWith(false);
  });
});

describe('ui.renderScene', () => {
  it('renders narration text for a scene', () => {
    const root = document.createElement('div');
    renderScene(root, { type: 'scene', text: '안녕', emotion: 'joy' }, {});
    expect(root.textContent).toContain('안녕');
  });

  it('renders two buttons for a choice and fires onChoice', () => {
    const root = document.createElement('div');
    const onChoice = vi.fn();
    renderScene(root, {
      type: 'choice', text: '고르기', emotion: 'anxiety',
      choices: [{ label: '왼' }, { label: '오' }],
    }, { onChoice });
    const btns = root.querySelectorAll('.choice-btn');
    expect(btns).toHaveLength(2);
    btns[0].click();
    expect(onChoice).toHaveBeenCalledWith(0);
  });
});

describe('ui.showResult', () => {
  it('shows the dominant label, message, and mosaic placeholder', () => {
    const root = document.createElement('div');
    showResult(root, { topCategory: 'joy', isComposite: false, message: '메시지다' });
    expect(root.textContent).toContain('기쁨');
    expect(root.textContent).toContain('메시지다');
    expect(root.textContent).toContain('모자이크');
  });

  it('shows timeline and result actions when a mosaic exists', () => {
    const root = document.createElement('div');
    const canvas = document.createElement('canvas');
    showResult(root, {
      topCategory: 'sad',
      isComposite: false,
      message: '메시지다',
      timeline: [{ emotion: 'joy', percent: 40 }, { emotion: 'sad', percent: 60 }],
    }, canvas);

    expect(root.querySelectorAll('.timeline-segment')).toHaveLength(2);
    expect(root.textContent).toContain('결과 카드 저장');
    expect(root.textContent).toContain('갤러리에 남기기');
  });
});

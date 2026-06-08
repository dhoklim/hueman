// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { openStatement } from '../src/ui.js';

describe('ui.openStatement', () => {
  it('opens an overlay with the statement and AI section', () => {
    const host = document.createElement('div');
    const overlay = openStatement(host);
    expect(host.querySelector('.statement-overlay')).toBeTruthy();
    expect(overlay.textContent).toContain('hueman');
    expect(overlay.textContent).toContain('AI');
    expect(overlay.textContent).toContain('어떻게 플레이');
  });

  it('closes when the close button is clicked', () => {
    const host = document.createElement('div');
    openStatement(host);
    host.querySelector('.statement-close').click();
    expect(host.querySelector('.statement-overlay')).toBeNull();
  });
});

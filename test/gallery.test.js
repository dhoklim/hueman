import { describe, it, expect } from 'vitest';
import { createGalleryStore } from '../src/gallery.js';

function memoryStorage(seed = {}) {
  const state = { ...seed };
  return {
    getItem: (key) => state[key] || null,
    setItem: (key, value) => { state[key] = value; },
    removeItem: (key) => { delete state[key]; },
  };
}

describe('gallery store', () => {
  it('adds newest entries first and keeps a bounded gallery', () => {
    const store = createGalleryStore(memoryStorage(), { limit: 2, now: () => 123 });

    store.add({ image: 'one', emotion: 'joy' });
    store.add({ image: 'two', emotion: 'sad' });
    store.add({ image: 'three', emotion: 'anger' });

    expect(store.list()).toEqual([
      { image: 'three', emotion: 'anger', createdAt: 123 },
      { image: 'two', emotion: 'sad', createdAt: 123 },
    ]);
  });

  it('recovers from invalid stored JSON', () => {
    const store = createGalleryStore(memoryStorage({ huemanGallery: 'not json' }));
    expect(store.list()).toEqual([]);
  });
});

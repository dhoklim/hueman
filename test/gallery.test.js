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

  it('drops the oldest cards when the browser storage quota is full', () => {
    // 브라우저 localStorage(~5MB)처럼 한 키에 담을 수 있는 글자 수를 제한한다.
    const state = {};
    const quotaStorage = {
      getItem: (key) => state[key] || null,
      setItem: (key, value) => {
        if (value.length > 180) throw new DOMException('full', 'QuotaExceededError');
        state[key] = value;
      },
      removeItem: (key) => { delete state[key]; },
    };
    const store = createGalleryStore(quotaStorage, { now: () => 1 });

    store.add({ image: 'a'.repeat(40), emotion: 'joy' });
    store.add({ image: 'b'.repeat(40), emotion: 'sad' });
    const saved = store.add({ image: 'c'.repeat(40), emotion: 'anger' });

    expect(saved).toMatchObject({ emotion: 'anger' });
    expect(store.list().map((item) => item.emotion)).toEqual(['anger', 'sad']);
  });

  it('reports failure instead of throwing when even one card does not fit', () => {
    const store = createGalleryStore({
      getItem: () => null,
      setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
      removeItem: () => {},
    });

    expect(store.add({ image: 'x', emotion: 'joy' })).toBeNull();
  });

  it('recovers from invalid stored JSON', () => {
    const store = createGalleryStore(memoryStorage({ huemanGallery: 'not json' }));
    expect(store.list()).toEqual([]);
  });
});

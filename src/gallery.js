const DEFAULT_KEY = 'huemanGallery';
const DEFAULT_LIMIT = 24;

function safeParse(raw) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function createGalleryStore(storage, opts = {}) {
  const key = opts.key || DEFAULT_KEY;
  const limit = opts.limit || DEFAULT_LIMIT;
  const now = opts.now || (() => Date.now());

  function list() {
    return safeParse(storage.getItem(key));
  }

  function save(items) {
    storage.setItem(key, JSON.stringify(items.slice(0, limit)));
  }

  // 결과 카드는 장당 수백 KB라 브라우저 저장 공간(~5MB)이 금방 찬다. 가득 차면
  // 가장 오래된 카드부터 빼면서 다시 시도하고, 새 카드 한 장도 못 넣으면 null.
  function add(item) {
    let next = [{ ...item, createdAt: now() }, ...list()].slice(0, limit);
    while (next.length) {
      try {
        save(next);
        return next[0];
      } catch {
        next = next.slice(0, -1);
      }
    }
    return null;
  }

  function clear() {
    storage.removeItem(key);
  }

  return { list, add, clear };
}

export function browserGalleryStore() {
  if (typeof localStorage === 'undefined') return null;
  return createGalleryStore(localStorage);
}

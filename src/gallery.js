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

  function add(item) {
    const next = [{ ...item, createdAt: now() }, ...list()].slice(0, limit);
    save(next);
    return next[0];
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

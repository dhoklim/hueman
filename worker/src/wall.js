export const WALL_EMOTIONS = Object.freeze(['joy', 'sad', 'anger', 'numb', 'anxiety']);
export const WALL_DAILY_LIMIT = 10_000;
export const WALL_RETENTION_DAYS = 8;

const KOREA_TIME_ZONE = 'Asia/Seoul';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const KST_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: KOREA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function isWallEmotion(emotion) {
  return WALL_EMOTIONS.includes(emotion);
}

export function wallDayAt(timestamp) {
  const { year, month, day } = koreaTimeParts(timestamp);
  return `${year}-${month}-${day}`;
}

export function wallCleanupDayAt(timestamp) {
  const { year, month, day } = koreaTimeParts(timestamp);
  const cleanupDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) - WALL_RETENTION_DAYS));
  return cleanupDate.toISOString().slice(0, 10);
}

export function shouldCleanupWallAt(timestamp) {
  const { hour, minute } = koreaTimeParts(timestamp);
  return hour === '00' && minute === '05';
}

export class EmotionWall {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const day = url.searchParams.get('day');
    if (!DAY_RE.test(day || '')) return json({ error: 'not-found' }, 404);

    if (request.method === 'POST' && url.pathname === '/events') {
      return this.record(request, day);
    }
    if (request.method === 'GET' && url.pathname === '/snapshot') {
      return this.read(day);
    }
    if (request.method === 'DELETE' && url.pathname === '/snapshot') {
      await this.state.storage.delete('snapshot');
      return new Response(null, { status: 204 });
    }
    return json({ error: 'not-found' }, 404);
  }

  async record(request, day) {
    const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') return json({ error: 'invalid-event' }, 400);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'invalid-event' }, 400);
    }
    if (!isWallEmotion(payload?.emotion)) return json({ error: 'invalid-event' }, 400);

    const snapshot = await this.snapshot(day);
    if (snapshot.total >= WALL_DAILY_LIMIT) return json({ error: 'wall-full' }, 429);

    const next = {
      day,
      total: snapshot.total + 1,
      counts: { ...snapshot.counts, [payload.emotion]: snapshot.counts[payload.emotion] + 1 },
      updatedAt: Date.now(),
    };
    await this.state.storage.put('snapshot', next);
    return json(next, 201);
  }

  async read(day) {
    return json(await this.snapshot(day), 200);
  }

  async snapshot(day) {
    const stored = await this.state.storage.get('snapshot');
    return normalizeSnapshot(stored, day);
  }
}

function koreaTimeParts(timestamp) {
  const values = {};
  for (const part of KST_FORMATTER.formatToParts(new Date(timestamp))) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return values;
}

function emptySnapshot(day) {
  return {
    day,
    total: 0,
    counts: Object.fromEntries(WALL_EMOTIONS.map((emotion) => [emotion, 0])),
    updatedAt: null,
  };
}

function normalizeSnapshot(stored, day) {
  const empty = emptySnapshot(day);
  if (!stored || stored.day !== day || typeof stored !== 'object') return empty;

  const counts = Object.fromEntries(WALL_EMOTIONS.map((emotion) => {
    const value = stored.counts?.[emotion];
    return [emotion, Number.isInteger(value) && value >= 0 ? value : 0];
  }));
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return {
    day,
    total,
    counts,
    updatedAt: Number.isFinite(stored.updatedAt) ? stored.updatedAt : null,
  };
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

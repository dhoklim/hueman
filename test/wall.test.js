import { describe, expect, it, vi } from 'vitest';
import {
  EmotionWall,
  WALL_DAILY_LIMIT,
  isWallEmotion,
  shouldCleanupWallAt,
  wallCleanupDayAt,
  wallDayAt,
} from '../worker/src/wall.js';

const DAY = '2026-08-13';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get: vi.fn(async (key) => values.get(key)),
    put: vi.fn(async (key, value) => values.set(key, value)),
    delete: vi.fn(async (key) => values.delete(key)),
  };
}

function createWall(initial = {}) {
  const storage = createStorage(initial);
  return { wall: new EmotionWall({ storage }, {}), storage };
}

function jsonRequest(method, path, body) {
  return new Request(`https://emotion-wall.test${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function zeroCounts() {
  return { joy: 0, sad: 0, anger: 0, numb: 0, anxiety: 0 };
}

describe('emotion wall snapshot', () => {
  it('stores only the selected category in the daily snapshot', async () => {
    const { wall, storage } = createWall();

    const response = await wall.fetch(jsonRequest('POST', `/events?day=${DAY}`, { emotion: 'joy' }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      day: DAY,
      total: 1,
      counts: { joy: 1, sad: 0, anger: 0, numb: 0, anxiety: 0 },
      updatedAt: expect.any(Number),
    });
    expect(storage.values.get('snapshot')).toEqual({
      day: DAY,
      total: 1,
      counts: { joy: 1, sad: 0, anger: 0, numb: 0, anxiety: 0 },
      updatedAt: expect.any(Number),
    });
  });

  it('starts GET with an empty snapshot and accumulates different allowed emotions', async () => {
    const { wall } = createWall();

    const empty = await wall.fetch(jsonRequest('GET', `/snapshot?day=${DAY}`));
    const first = await wall.fetch(jsonRequest('POST', `/events?day=${DAY}`, { emotion: 'sad' }));
    const second = await wall.fetch(jsonRequest('POST', `/events?day=${DAY}`, { emotion: 'anxiety' }));

    await expect(empty.json()).resolves.toEqual({
      day: DAY,
      total: 0,
      counts: zeroCounts(),
      updatedAt: null,
    });
    expect((await first.json()).counts).toEqual({ joy: 0, sad: 1, anger: 0, numb: 0, anxiety: 0 });
    await expect(second.json()).resolves.toMatchObject({
      day: DAY,
      total: 2,
      counts: { joy: 0, sad: 1, anger: 0, numb: 0, anxiety: 1 },
    });
  });

  it.each([
    ['surprise', 'application/json'],
    ['composite', 'application/json'],
    ['', 'application/json'],
    [null, 'application/json'],
    ['joy', 'text/plain'],
  ])('rejects invalid event input %j without writing a snapshot', async (emotion, contentType) => {
    const { wall, storage } = createWall();
    const request = new Request(`https://emotion-wall.test/events?day=${DAY}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: JSON.stringify({ emotion }),
    });

    const response = await wall.fetch(request);

    expect(response.status).toBe(400);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON without writing a snapshot', async () => {
    const { wall, storage } = createWall();
    const request = new Request(`https://emotion-wall.test/events?day=${DAY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });

    const response = await wall.fetch(request);

    expect(response.status).toBe(400);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('keeps the existing snapshot unchanged at the daily event limit', async () => {
    const existing = {
      day: DAY,
      total: WALL_DAILY_LIMIT,
      counts: { joy: WALL_DAILY_LIMIT, sad: 0, anger: 0, numb: 0, anxiety: 0 },
      updatedAt: 1760000000000,
    };
    const { wall, storage } = createWall({ snapshot: existing });

    const response = await wall.fetch(jsonRequest('POST', `/events?day=${DAY}`, { emotion: 'sad' }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'wall-full' });
    expect(storage.put).not.toHaveBeenCalled();
    expect(storage.values.get('snapshot')).toEqual(existing);
  });

  it('clears an old daily snapshot through the internal delete route', async () => {
    const existing = {
      day: DAY,
      total: 1,
      counts: { joy: 1, sad: 0, anger: 0, numb: 0, anxiety: 0 },
      updatedAt: 1760000000000,
    };
    const { wall, storage } = createWall({ snapshot: existing });

    const deletion = await wall.fetch(jsonRequest('DELETE', `/snapshot?day=${DAY}`));
    const empty = await wall.fetch(jsonRequest('GET', `/snapshot?day=${DAY}`));

    expect(deletion.status).toBe(204);
    expect(storage.delete).toHaveBeenCalledWith('snapshot');
    await expect(empty.json()).resolves.toEqual({
      day: DAY,
      total: 0,
      counts: zeroCounts(),
      updatedAt: null,
    });
  });
});

describe('emotion wall time and category boundaries', () => {
  it('uses Korea time for a midnight day boundary and the eight-day cleanup target', () => {
    expect(wallDayAt(Date.parse('2026-08-13T14:59:00.000Z'))).toBe('2026-08-13');
    expect(wallDayAt(Date.parse('2026-08-13T15:00:00.000Z'))).toBe('2026-08-14');
    expect(wallCleanupDayAt(Date.parse('2026-08-12T15:05:00.000Z'))).toBe('2026-08-05');
    expect(shouldCleanupWallAt(Date.parse('2026-08-12T15:05:00.000Z'))).toBe(true);
    expect(shouldCleanupWallAt(Date.parse('2026-08-12T15:06:00.000Z'))).toBe(false);
  });

  it.each(['joy', 'sad', 'anger', 'numb', 'anxiety'])('accepts %s as a wall emotion', (emotion) => {
    expect(isWallEmotion(emotion)).toBe(true);
  });

  it.each(['surprise', 'composite', 'neutral', null])('does not accept %j as a wall emotion', (emotion) => {
    expect(isWallEmotion(emotion)).toBe(false);
  });
});

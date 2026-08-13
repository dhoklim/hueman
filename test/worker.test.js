import { describe, expect, it, vi } from 'vitest';
import {
  MAX_TRANSFER_BYTES,
  TRANSFER_TTL_MS,
  createTransferWorker,
  parseToken,
  transferKey,
} from '../worker/src/transfer.js';

const ORIGIN = 'https://dhoklim.github.io';
const UUID = '123e4567-e89b-42d3-a456-426614174000';
const NOW = 1760000000000;
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const WALL_DAY = '2025-10-09';
const WALL_SNAPSHOT = {
  day: WALL_DAY,
  total: 4,
  counts: { joy: 2, sad: 1, anger: 0, numb: 0, anxiety: 1 },
  updatedAt: NOW,
};

function wallResponse(body = WALL_SNAPSHOT, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function createEnv({ allowedOrigins = ORIGIN, response = wallResponse() } = {}) {
  const wallStub = { fetch: vi.fn().mockResolvedValue(response) };
  return {
    ALLOWED_ORIGINS: allowedOrigins,
    TRANSFERS: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    WALL: {
      getByName: vi.fn(() => wallStub),
    },
    wallStub,
  };
}

function createContext() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(promise);
    },
  };
}

function uploadRequest({ origin = ORIGIN, type = 'image/png', body = PNG_SIGNATURE } = {}) {
  return new Request('https://transfer.example/v1/transfers', {
    method: 'POST',
    headers: { origin, 'content-type': type },
    body,
  });
}

function token(expiresAt = NOW + TRANSFER_TTL_MS) {
  return `${expiresAt}.${UUID}`;
}

function wallEventRequest({ origin = ORIGIN, type = 'application/json', body = { emotion: 'joy' } } = {}) {
  return new Request('https://transfer.example/v1/wall/events', {
    method: 'POST',
    headers: { origin, 'content-type': type },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function wallSnapshotRequest({ origin = ORIGIN } = {}) {
  return new Request('https://transfer.example/v1/wall', { headers: { origin } });
}

describe('transfer token contract', () => {
  it('encodes a 10-minute expiry and random id into one R2 address', () => {
    expect(transferKey(NOW + TRANSFER_TTL_MS, UUID))
      .toBe(`transfers/1760000600000/${UUID}.png`);
    expect(parseToken(token())).toEqual({ expiresAt: NOW + TRANSFER_TTL_MS, id: UUID });
  });

  it('does not turn malformed bearer values into R2 keys', () => {
    expect(parseToken('1760000600000.not-a-uuid')).toBeNull();
  });
});

describe('POST /v1/transfers', () => {
  it('stores only a PNG result card and returns a ten-minute token', async () => {
    const env = createEnv();
    const ctx = createContext();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(uploadRequest(), env, ctx);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      token: token(),
      expiresAt: NOW + TRANSFER_TTL_MS,
    });
    expect(env.TRANSFERS.put).toHaveBeenCalledWith(
      transferKey(NOW + TRANSFER_TTL_MS, UUID),
      expect.any(ArrayBuffer),
      expect.objectContaining({
        httpMetadata: expect.objectContaining({
          contentType: 'image/png',
          cacheControl: 'no-store',
          contentDisposition: 'attachment; filename="hueman-result.png"',
        }),
        customMetadata: { expiresAt: String(NOW + TRANSFER_TTL_MS) },
      }),
    );
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it.each([
    ['foreign origin', uploadRequest({ origin: 'https://attacker.example' }), 403],
    ['JPEG body', uploadRequest({ type: 'image/jpeg' }), 415],
    ['non-PNG body marked as PNG', uploadRequest({ body: new Uint8Array([0, 1, 2, 3]) }), 415],
    ['oversized body', uploadRequest({ body: new Uint8Array(MAX_TRANSFER_BYTES + 1) }), 413],
  ])('rejects a %s before R2 write', async (_label, request, expectedStatus) => {
    const env = createEnv();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(request, env, createContext());

    expect(response.status).toBe(expectedStatus);
    expect(env.TRANSFERS.put).not.toHaveBeenCalled();
  });
});

describe('GET /v1/transfers/:token', () => {
  it('returns a private PNG for an unexpired token', async () => {
    const env = createEnv();
    env.TRANSFERS.get.mockResolvedValue({
      body: new Uint8Array([137, 80, 78, 71]).buffer,
      httpMetadata: { contentType: 'image/png' },
    });
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(new Request(`https://transfer.example/v1/transfers/${token()}`, {
      headers: { origin: ORIGIN },
    }), env, createContext());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it('blocks and schedules deletion of a token at its expiry', async () => {
    const env = createEnv();
    const ctx = createContext();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });
    const expiredToken = token(NOW);

    const response = await worker.fetch(new Request(`https://transfer.example/v1/transfers/${expiredToken}`, {
      headers: { origin: ORIGIN },
    }), env, ctx);

    expect(response.status).toBe(410);
    await Promise.all(ctx.pending);
    expect(env.TRANSFERS.delete).toHaveBeenCalledWith(transferKey(NOW, UUID));
  });

  it('reports malformed and missing tokens without exposing another result', async () => {
    const env = createEnv();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const malformed = await worker.fetch(new Request('https://transfer.example/v1/transfers/not-a-token', {
      headers: { origin: ORIGIN },
    }), env, createContext());
    const missing = await worker.fetch(new Request(`https://transfer.example/v1/transfers/${token()}`, {
      headers: { origin: ORIGIN },
    }), env, createContext());

    expect(malformed.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(env.TRANSFERS.get).toHaveBeenCalledTimes(1);
  });

  it('treats an invalid URL-encoded token as not found instead of throwing', async () => {
    const env = createEnv();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(new Request('https://transfer.example/v1/transfers/%E0%A4%A', {
      headers: { origin: ORIGIN },
    }), env, createContext());

    expect(response.status).toBe(404);
    expect(env.TRANSFERS.get).not.toHaveBeenCalled();
  });
});

describe('shared emotion wall API', () => {
  it('posts only one allowed emotion to the server-selected daily durable object', async () => {
    const env = createEnv({ response: wallResponse(WALL_SNAPSHOT, 201) });
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(wallEventRequest({ body: { emotion: 'joy', visitor: 'must-not-pass' } }), env, createContext());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(WALL_SNAPSHOT);
    expect(env.WALL.getByName).toHaveBeenCalledWith(WALL_DAY);
    const [request] = env.wallStub.fetch.mock.calls[0];
    expect(request.method).toBe('POST');
    expect(new URL(request.url)).toMatchObject({ pathname: '/events', search: `?day=${WALL_DAY}` });
    await expect(request.json()).resolves.toEqual({ emotion: 'joy' });
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it.each([
    ['foreign origin', wallEventRequest({ origin: 'https://attacker.example' })],
    ['wrong content type', wallEventRequest({ type: 'text/plain' })],
    ['malformed JSON', wallEventRequest({ body: '{' })],
    ['unsupported emotion', wallEventRequest({ body: { emotion: 'surprise' } })],
  ])('rejects a %s wall event before contacting the durable object', async (_label, request) => {
    const env = createEnv();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(request, env, createContext());

    expect(response.status).toBe(_label === 'foreign origin' ? 403 : 400);
    expect(env.WALL.getByName).not.toHaveBeenCalled();
  });

  it('returns the daily snapshot with the same CORS policy', async () => {
    const env = createEnv();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(wallSnapshotRequest(), env, createContext());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(WALL_SNAPSHOT);
    expect(env.WALL.getByName).toHaveBeenCalledWith(WALL_DAY);
    const [request] = env.wallStub.fetch.mock.calls[0];
    expect(request.method).toBe('GET');
    expect(new URL(request.url)).toMatchObject({ pathname: '/snapshot', search: `?day=${WALL_DAY}` });
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });

  it('passes the wall daily limit response through without changing the existing snapshot', async () => {
    const env = createEnv({ response: wallResponse({ error: 'wall-full' }, 429) });
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(wallEventRequest(), env, createContext());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'wall-full' });
  });

  it.each([
    ['has no durable object binding', (env) => { delete env.WALL; }],
    ['gets a durable object failure', (env) => { env.wallStub.fetch.mockRejectedValue(new Error('offline')); }],
    ['gets a durable object server error', (env) => { env.wallStub.fetch.mockResolvedValue(wallResponse({ error: 'broken' }, 500)); }],
  ])('maps wall unavailability when it %s', async (_label, mutate) => {
    const env = createEnv();
    mutate(env);
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const response = await worker.fetch(wallSnapshotRequest(), env, createContext());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'wall-unavailable' });
  });
});

describe('CORS and scheduled cleanup', () => {
  it('answers only an allowed origin preflight', async () => {
    const env = createEnv();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });

    const allowed = await worker.fetch(new Request('https://transfer.example/v1/transfers', {
      method: 'OPTIONS', headers: { origin: ORIGIN },
    }), env, createContext());
    const denied = await worker.fetch(new Request('https://transfer.example/v1/transfers', {
      method: 'OPTIONS', headers: { origin: 'https://attacker.example' },
    }), env, createContext());

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS');
    expect(denied.status).toBe(403);
  });

  it('deletes expired R2 keys and stops at the first unexpired key', async () => {
    const env = createEnv();
    const worker = createTransferWorker({ now: () => NOW, createId: () => UUID });
    const oldKey = transferKey(NOW - 1, UUID);
    const currentKey = transferKey(NOW, UUID);
    const futureKey = transferKey(NOW + 1, UUID);
    env.TRANSFERS.list.mockResolvedValue({
      objects: [{ key: oldKey }, { key: currentKey }, { key: futureKey }],
      truncated: false,
    });

    await worker.scheduled({}, env, createContext());

    expect(env.TRANSFERS.delete).toHaveBeenCalledWith([oldKey, currentKey]);
    expect(env.TRANSFERS.list).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'transfers/' }));
  });

  it('clears only the eight-day-old wall snapshot at 00:05 Korea time', async () => {
    const cleanupNow = Date.parse('2026-08-12T15:05:00.000Z');
    const env = createEnv();
    const worker = createTransferWorker({ now: () => cleanupNow, createId: () => UUID });

    await worker.scheduled({}, env, createContext());

    expect(env.WALL.getByName).toHaveBeenCalledWith('2026-08-05');
    const [request] = env.wallStub.fetch.mock.calls[0];
    expect(request.method).toBe('DELETE');
    expect(new URL(request.url)).toMatchObject({ pathname: '/snapshot', search: '?day=2026-08-05' });
  });
});

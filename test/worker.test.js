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

function createEnv({ allowedOrigins = ORIGIN } = {}) {
  return {
    ALLOWED_ORIGINS: allowedOrigins,
    TRANSFERS: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
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
});

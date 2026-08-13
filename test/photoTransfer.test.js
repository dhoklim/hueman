// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_TRANSFER_BYTES,
  TransferError,
  buildReceiveUrl,
  canvasToPng,
  createTransfer,
  downloadBlob,
  fetchTransfer,
  getTransferApiUrl,
  isTransferToken,
  sharePng,
} from '../src/photoTransfer.js';

const API = 'https://transfer.example';
const TOKEN = '1760000600000.123e4567-e89b-42d3-a456-426614174000';

function jsonResponse(body, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('getTransferApiUrl', () => {
  it('normalizes an HTTPS upload endpoint', () => {
    expect(getTransferApiUrl('https://transfer.example/', 'https://dhoklim.github.io')).toBe(API);
  });

  it('rejects a missing or insecure remote upload endpoint', () => {
    expect(getTransferApiUrl('', 'https://dhoklim.github.io')).toBeNull();
    expect(getTransferApiUrl('http://transfer.example', 'https://dhoklim.github.io')).toBeNull();
  });

  it('allows a local worker only when the page is also local', () => {
    expect(getTransferApiUrl('http://localhost:8787', 'http://localhost:5173')).toBe('http://localhost:8787');
    expect(getTransferApiUrl('http://localhost:8787', 'https://dhoklim.github.io')).toBeNull();
  });
});

describe('receiver URL and token validation', () => {
  it('keeps a valid bearer token in the GitHub Pages URL fragment', () => {
    expect(buildReceiveUrl(TOKEN, {
      origin: 'https://dhoklim.github.io',
      base: '/hueman/',
    })).toBe(`https://dhoklim.github.io/hueman/receive.html#${TOKEN}`);
  });

  it('rejects tokens that cannot address one R2 result card', () => {
    expect(isTransferToken(TOKEN)).toBe(true);
    expect(isTransferToken('1760000600000.not-a-uuid')).toBe(false);
    expect(() => buildReceiveUrl('bad-token', {
      origin: 'https://dhoklim.github.io',
      base: '/hueman/',
    })).toThrow(expect.objectContaining({ code: 'invalid-token' }));
  });
});

describe('canvasToPng', () => {
  it('resolves the PNG Blob produced by a result canvas', async () => {
    const png = new Blob(['result'], { type: 'image/png' });
    const canvas = { toBlob: (callback) => callback(png) };

    await expect(canvasToPng(canvas)).resolves.toBe(png);
  });

  it('turns an empty canvas conversion into a typed error', async () => {
    const canvas = { toBlob: (callback) => callback(null) };

    await expect(canvasToPng(canvas)).rejects.toMatchObject({ code: 'canvas' });
  });
});

describe('createTransfer', () => {
  it('uploads exactly one PNG and returns the Worker token', async () => {
    const png = new Blob(['result'], { type: 'image/png' });
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      token: TOKEN,
      expiresAt: 1760000600000,
    }));

    await expect(createTransfer(API, png, { fetchImpl })).resolves.toEqual({
      token: TOKEN,
      expiresAt: 1760000600000,
    });
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/v1/transfers`, expect.objectContaining({
      method: 'POST',
      headers: { 'content-type': 'image/png' },
      body: png,
    }));
  });

  it.each([
    [new Blob(['not-png'], { type: 'image/jpeg' }), 'invalid-file'],
    [new Blob([new Uint8Array(MAX_TRANSFER_BYTES + 1)], { type: 'image/png' }), 'too-large'],
  ])('rejects a client-side %s payload before it reaches the Worker', async (blob, code) => {
    const fetchImpl = vi.fn();

    await expect(createTransfer(API, blob, { fetchImpl })).rejects.toMatchObject({ code });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'forbidden'],
    [413, 'too-large'],
    [415, 'invalid-file'],
    [500, 'server'],
  ])('normalizes Worker HTTP %i into %s', async (status, code) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: code }, status));

    await expect(createTransfer(API, new Blob(['png'], { type: 'image/png' }), { fetchImpl }))
      .rejects.toMatchObject({ code, status });
  });

  it('normalizes a network failure without swallowing it as a server response', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('offline'));

    await expect(createTransfer(API, new Blob(['png'], { type: 'image/png' }), { fetchImpl }))
      .rejects.toMatchObject({ code: 'network', status: 0 });
  });

  it('rejects a malformed successful Worker response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ token: 'bad', expiresAt: 1 }));

    await expect(createTransfer(API, new Blob(['png'], { type: 'image/png' }), { fetchImpl }))
      .rejects.toMatchObject({ code: 'server' });
  });
});

describe('fetchTransfer', () => {
  it('downloads the transient PNG through the Worker route', async () => {
    const png = new Blob(['result'], { type: 'image/png' });
    const fetchImpl = vi.fn().mockResolvedValue(new Response(png, {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));

    await expect(fetchTransfer(API, TOKEN, { fetchImpl })).resolves.toEqual(png);
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/v1/transfers/${encodeURIComponent(TOKEN)}`, {
      method: 'GET',
    });
  });

  it('reports an expired QR link distinctly', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'expired' }, 410));

    await expect(fetchTransfer(API, TOKEN, { fetchImpl })).rejects.toMatchObject({
      code: 'expired',
      status: 410,
    });
  });
});

describe('sharePng', () => {
  it('shares a PNG file through the platform share sheet', async () => {
    const share = vi.fn().mockResolvedValue();
    const navigatorRef = {
      canShare: vi.fn().mockReturnValue(true),
      share,
    };

    await expect(sharePng(new Blob(['result'], { type: 'image/png' }), 'hueman-result.png', {
      navigatorRef,
      FileCtor: File,
    })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      files: [expect.objectContaining({ name: 'hueman-result.png', type: 'image/png' })],
    }));
  });

  it('returns unavailable when file sharing is unsupported', async () => {
    await expect(sharePng(new Blob(['result'], { type: 'image/png' }), 'hueman-result.png', {
      navigatorRef: {},
      FileCtor: File,
    })).resolves.toBe('unavailable');
  });

  it('distinguishes a user-cancelled share sheet', async () => {
    const navigatorRef = {
      canShare: vi.fn().mockReturnValue(true),
      share: vi.fn().mockRejectedValue(Object.assign(new Error('cancelled'), { name: 'AbortError' })),
    };

    await expect(sharePng(new Blob(['result'], { type: 'image/png' }), 'hueman-result.png', {
      navigatorRef,
      FileCtor: File,
    })).resolves.toBe('cancelled');
  });
});

describe('downloadBlob', () => {
  it('uses a temporary download link and revokes its object URL after clicking', () => {
    const click = vi.fn();
    const anchor = { href: '', download: '', click };
    const documentRef = {
      createElement: vi.fn().mockReturnValue(anchor),
      body: { append: vi.fn() },
    };
    const urlRef = {
      createObjectURL: vi.fn().mockReturnValue('blob:result-card'),
      revokeObjectURL: vi.fn(),
    };

    expect(downloadBlob(new Blob(['result'], { type: 'image/png' }), 'hueman-result.png', {
      documentRef,
      urlRef,
      setTimeoutImpl: (callback) => callback(),
    })).toBe(true);
    expect(anchor).toMatchObject({ href: 'blob:result-card', download: 'hueman-result.png' });
    expect(click).toHaveBeenCalledOnce();
    expect(urlRef.revokeObjectURL).toHaveBeenCalledWith('blob:result-card');
  });
});

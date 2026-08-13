// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { isWallEmotion, publishWallEmotion } from '../src/wallClient.js';

const API = 'https://transfer.example/';

describe('publishWallEmotion', () => {
  it.each(['joy', 'sad', 'anger', 'numb', 'anxiety'])('posts %s as the only visitor payload field', async (emotion) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));

    await expect(publishWallEmotion(emotion, { apiUrl: API, fetchImpl })).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledWith('https://transfer.example/v1/wall/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emotion }),
    });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ emotion });
  });

  it.each(['surprise', 'composite', 'neutral', '', null])('does not send non-wall category %j', async (emotion) => {
    const fetchImpl = vi.fn();

    await expect(publishWallEmotion(emotion, { apiUrl: API, fetchImpl })).resolves.toBe(false);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isWallEmotion(emotion)).toBe(false);
  });

  it('does not send when the transfer endpoint is absent or insecure', async () => {
    const fetchImpl = vi.fn();

    await expect(publishWallEmotion('joy', { apiUrl: '', fetchImpl })).resolves.toBe(false);
    await expect(publishWallEmotion('joy', { apiUrl: 'http://transfer.example', fetchImpl })).resolves.toBe(false);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('absorbs a network failure and a non-success response', async () => {
    const network = vi.fn().mockRejectedValue(new Error('offline'));
    const unavailable = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));

    await expect(publishWallEmotion('joy', { apiUrl: API, fetchImpl: network })).resolves.toBe(false);
    await expect(publishWallEmotion('joy', { apiUrl: API, fetchImpl: unavailable })).resolves.toBe(false);
  });
});

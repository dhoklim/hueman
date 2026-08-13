import { getTransferApiUrl } from './photoTransfer.js';

export const WALL_EMOTIONS = new Set(['joy', 'sad', 'anger', 'numb', 'anxiety']);

export function isWallEmotion(emotion) {
  return WALL_EMOTIONS.has(emotion);
}

export async function publishWallEmotion(
  emotion,
  {
    apiUrl = import.meta.env.VITE_QR_TRANSFER_API_URL,
    fetchImpl = typeof fetch === 'undefined' ? null : fetch,
  } = {},
) {
  const endpoint = getTransferApiUrl(apiUrl);
  if (!isWallEmotion(emotion) || !endpoint || typeof fetchImpl !== 'function') return false;

  try {
    const response = await fetchImpl(`${endpoint}/v1/wall/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emotion }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

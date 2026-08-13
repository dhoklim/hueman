export const MAX_TRANSFER_BYTES = 8 * 1024 * 1024;

const TOKEN_RE = /^\d{13}\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

export class TransferError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'TransferError';
    this.code = code;
    this.status = status;
  }
}

export function isTransferToken(token) {
  return TOKEN_RE.test(String(token || ''));
}

export function getTransferApiUrl(
  raw = import.meta.env.VITE_QR_TRANSFER_API_URL,
  pageOrigin = typeof window === 'undefined' ? '' : window.location.origin,
) {
  if (!raw) return null;

  try {
    const api = new URL(raw);
    const page = new URL(pageOrigin);
    const local = LOOPBACK_HOSTS.has(api.hostname) && LOOPBACK_HOSTS.has(page.hostname);
    if (api.protocol !== 'https:' && !(local && api.protocol === 'http:')) return null;
    return api.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function buildReceiveUrl(
  token,
  {
    origin = typeof window === 'undefined' ? '' : window.location.origin,
    base = import.meta.env.BASE_URL,
  } = {},
) {
  if (!isTransferToken(token)) {
    throw new TransferError('invalid-token', 'Invalid transfer token');
  }
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${origin}${normalizedBase}receive.html#${encodeURIComponent(token)}`;
}

export function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      reject(new TransferError('canvas', 'Result card cannot be converted to an image'));
      return;
    }

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new TransferError('canvas', 'Result card cannot be converted to an image'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    } catch {
      reject(new TransferError('canvas', 'Result card cannot be converted to an image'));
    }
  });
}

export async function createTransfer(apiUrl, blob, { fetchImpl = fetch } = {}) {
  validatePng(blob);
  const endpoint = transferEndpoint(apiUrl, '/v1/transfers');
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'image/png' },
      body: blob,
    });
  } catch {
    throw new TransferError('network', 'Unable to upload the result card');
  }

  if (!response.ok) throw await responseError(response);

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new TransferError('server', 'The transfer service returned an invalid response', response.status);
  }

  if (!isTransferToken(payload?.token) || !Number.isInteger(payload?.expiresAt)) {
    throw new TransferError('server', 'The transfer service returned an invalid response', response.status);
  }

  return { token: payload.token, expiresAt: payload.expiresAt };
}

export async function fetchTransfer(apiUrl, token, { fetchImpl = fetch } = {}) {
  if (!isTransferToken(token)) {
    throw new TransferError('invalid-token', 'Invalid transfer token');
  }
  const endpoint = transferEndpoint(apiUrl, `/v1/transfers/${encodeURIComponent(token)}`);
  let response;
  try {
    response = await fetchImpl(endpoint, { method: 'GET' });
  } catch {
    throw new TransferError('network', 'Unable to download the result card');
  }

  if (!response.ok) throw await responseError(response);
  const blob = await response.blob();
  if (blob.type !== 'image/png') {
    throw new TransferError('server', 'The transfer service returned an invalid image', response.status);
  }
  return blob;
}

export async function sharePng(
  blob,
  filename,
  {
    navigatorRef = typeof navigator === 'undefined' ? null : navigator,
    FileCtor = typeof File === 'undefined' ? null : File,
  } = {},
) {
  if (!navigatorRef?.share || !FileCtor) return 'unavailable';
  const file = new FileCtor([blob], filename, { type: 'image/png' });
  if (typeof navigatorRef.canShare === 'function' && !navigatorRef.canShare({ files: [file] })) {
    return 'unavailable';
  }

  try {
    await navigatorRef.share({ files: [file], title: 'hueman 결과 카드' });
    return 'shared';
  } catch (error) {
    return error?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

export function downloadBlob(
  blob,
  filename,
  {
    documentRef = typeof document === 'undefined' ? null : document,
    urlRef = typeof URL === 'undefined' ? null : URL,
    setTimeoutImpl = setTimeout,
  } = {},
) {
  if (!documentRef?.createElement || !urlRef?.createObjectURL || !urlRef?.revokeObjectURL) return false;
  const url = urlRef.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  documentRef.body?.append?.(anchor);
  anchor.click();
  anchor.remove?.();
  setTimeoutImpl(() => urlRef.revokeObjectURL(url), 0);
  return true;
}

function transferEndpoint(apiUrl, path) {
  const normalized = getTransferApiUrl(apiUrl);
  if (!normalized) {
    throw new TransferError('misconfigured', 'Photo transfer service is not configured');
  }
  return `${normalized}${path}`;
}

function validatePng(blob) {
  if (!blob || blob.type !== 'image/png') {
    throw new TransferError('invalid-file', 'Only PNG result cards can be transferred');
  }
  if (blob.size > MAX_TRANSFER_BYTES) {
    throw new TransferError('too-large', 'Result card is too large to transfer');
  }
}

async function responseError(response) {
  const code = {
    403: 'forbidden',
    404: 'not-found',
    410: 'expired',
    413: 'too-large',
    415: 'invalid-file',
  }[response.status] || 'server';
  let message = 'The transfer service could not complete the request';
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') message = body.error;
  } catch {
    // The status code is still enough to classify the failure.
  }
  return new TransferError(code, message, response.status);
}

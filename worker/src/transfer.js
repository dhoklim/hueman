export const TRANSFER_TTL_MS = 10 * 60 * 1000;
export const MAX_TRANSFER_BYTES = 8 * 1024 * 1024;

const TOKEN_RE = /^(\d{13})\.([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const MAX_CLEANUP_PER_RUN = 1000;
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export function transferKey(expiresAt, id) {
  return `transfers/${String(expiresAt).padStart(13, '0')}/${id}.png`;
}

export function parseToken(token) {
  const match = TOKEN_RE.exec(String(token || ''));
  return match ? { expiresAt: Number(match[1]), id: match[2] } : null;
}

export function createTransferWorker({
  now = () => Date.now(),
  createId = () => crypto.randomUUID(),
} = {}) {
  return {
    async fetch(request, env, ctx) {
      const origin = request.headers.get('origin');
      if (request.method === 'OPTIONS') {
        return isAllowedOrigin(origin, env.ALLOWED_ORIGINS)
          ? new Response(null, { status: 204, headers: corsHeaders(origin) })
          : json({ error: 'forbidden' }, 403);
      }
      if (!isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) {
        return json({ error: 'forbidden' }, 403);
      }

      const url = new URL(request.url);
      if (request.method === 'POST' && url.pathname === '/v1/transfers') {
        return create(request, env, origin, now, createId);
      }
      if (request.method === 'GET' && url.pathname.startsWith('/v1/transfers/')) {
        let token;
        try {
          token = decodeURIComponent(url.pathname.slice('/v1/transfers/'.length));
        } catch {
          return json({ error: 'not-found' }, 404, origin);
        }
        return read(token, env, origin, ctx, now);
      }
      return json({ error: 'not-found' }, 404, origin);
    },

    async scheduled(_controller, env) {
      const currentTime = now();
      const keys = [];
      let cursor;
      let stop = false;

      while (!stop && keys.length < MAX_CLEANUP_PER_RUN) {
        const page = await env.TRANSFERS.list({
          prefix: 'transfers/',
          limit: MAX_CLEANUP_PER_RUN - keys.length,
          ...(cursor ? { cursor } : {}),
        });

        for (const object of page.objects) {
          const expiresAt = parseExpiresAtFromKey(object.key);
          if (expiresAt === null || expiresAt > currentTime) {
            stop = true;
            break;
          }
          keys.push(object.key);
          if (keys.length === MAX_CLEANUP_PER_RUN) break;
        }

        if (stop || keys.length === MAX_CLEANUP_PER_RUN || !page.truncated) break;
        cursor = page.cursor;
      }

      if (keys.length) await env.TRANSFERS.delete(keys);
    },
  };
}

async function create(request, env, origin, now, createId) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'image/png') return json({ error: 'invalid-file' }, 415, origin);

  const declaredSize = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_TRANSFER_BYTES) {
    return json({ error: 'too-large' }, 413, origin);
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_TRANSFER_BYTES) {
    return json({ error: 'too-large' }, 413, origin);
  }
  if (!hasPngSignature(body)) return json({ error: 'invalid-file' }, 415, origin);

  const expiresAt = now() + TRANSFER_TTL_MS;
  const id = createId();
  await env.TRANSFERS.put(transferKey(expiresAt, id), body, {
    httpMetadata: {
      contentType: 'image/png',
      contentDisposition: 'attachment; filename="hueman-result.png"',
      cacheControl: 'no-store',
    },
    customMetadata: { expiresAt: String(expiresAt) },
  });

  return json({ token: `${expiresAt}.${id}`, expiresAt }, 201, origin);
}

async function read(token, env, origin, ctx, now) {
  const parsed = parseToken(token);
  if (!parsed) return json({ error: 'not-found' }, 404, origin);

  const key = transferKey(parsed.expiresAt, parsed.id);
  if (parsed.expiresAt <= now()) {
    const deletion = env.TRANSFERS.delete(key);
    if (ctx?.waitUntil) ctx.waitUntil(deletion);
    else await deletion;
    return json({ error: 'expired' }, 410, origin);
  }

  const object = await env.TRANSFERS.get(key);
  if (!object) return json({ error: 'not-found' }, 404, origin);

  const headers = corsHeaders(origin);
  headers.set('content-type', object.httpMetadata?.contentType || 'image/png');
  headers.set('cache-control', 'private, no-store');
  headers.set('content-disposition', 'attachment; filename="hueman-result.png"');
  return new Response(object.body, { status: 200, headers });
}

function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin || !allowedOrigins) return false;
  return String(allowedOrigins).split(',').map((value) => value.trim()).includes(origin);
}

function corsHeaders(origin) {
  return new Headers({
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    'vary': 'Origin',
  });
}

function json(body, status, origin) {
  const headers = origin ? corsHeaders(origin) : new Headers();
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers });
}

function parseExpiresAtFromKey(key) {
  const match = /^transfers\/(\d{13})\//.exec(key);
  return match ? Number(match[1]) : null;
}

function hasPngSignature(body) {
  const bytes = new Uint8Array(body);
  return bytes.length >= PNG_SIGNATURE.length
    && PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

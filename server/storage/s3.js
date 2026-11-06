import { Readable } from 'node:stream';

import { assertKey } from './keys.js';
import { EMPTY_SHA256, sha256Hex, signRequest } from './sigv4.js';

/**
 * S3-თავსებადი საცავი — Cloudflare R2 (`MEDIA_STORAGE=r2`, B0 #7). path-style მისამართი
 * (`<endpoint>/<bucket>/<key>`), SigV4 header-ით (`sigv4.js`), region `auto`. ოთხი ოპერაცია:
 * PutObject, GetObject, HeadObject, DeleteObject. საიდუმლო მხოლოდ env-შია (`R2_*`), ლოგში და
 * შეცდომის ტექსტში არ ხვდება — შეცდომა მხოლოდ ოპერაციას და HTTP სტატუსს ასახელებს.
 *
 * @param {{ endpoint: string, region: string, bucket: string, accessKeyId: string, secretAccessKey: string }} r2
 * @param {{ fetch?: typeof fetch, now?: () => number, timeoutMs?: number }} [options]
 * @returns {import('./index.js').Storage}
 */
export function createS3Storage(
  r2,
  { fetch: doFetch = globalThis.fetch, now = Date.now, timeoutMs = 30_000 } = {},
) {
  const base = new URL(r2.endpoint);

  /**
   * @param {'PUT' | 'GET' | 'HEAD' | 'DELETE'} method
   * @param {string} key
   * @param {{ body?: Buffer, headers?: Record<string, string> }} [options]
   */
  async function send(method, key, { body, headers = {} } = {}) {
    assertKey(key);
    const path = `${base.pathname.replace(/\/$/, '')}/${r2.bucket}/${key}`;
    const signed = signRequest({
      method,
      host: base.host,
      path,
      headers,
      payloadHash: body ? sha256Hex(body) : EMPTY_SHA256,
      date: new Date(now()),
      region: r2.region,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    });
    const url = new URL(base);
    url.pathname = path
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    return doFetch(url, {
      method,
      headers: body ? { ...signed.headers, 'content-length': String(body.length) } : signed.headers,
      body: body ? new Uint8Array(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  /**
   * @param {string} operation
   * @param {Response} response
   */
  async function fail(operation, response) {
    await response.body?.cancel().catch(() => {});
    return new Error(`storage: ${operation} → HTTP ${response.status}`);
  }

  /** @param {Response} response */
  const headOf = (response) => ({
    contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    size: Number(response.headers.get('content-length') ?? 0),
    etag: response.headers.get('etag') ?? '""',
  });

  return {
    kind: 'r2',
    async put(key, body, { contentType, cacheControl }) {
      const response = await send('PUT', key, {
        body,
        headers: {
          'content-type': contentType,
          ...(cacheControl && { 'cache-control': cacheControl }),
        },
      });
      if (!response.ok) throw await fail('PutObject', response);
      await response.body?.cancel().catch(() => {});
    },
    async get(key) {
      const response = await send('GET', key);
      if (response.status === 404) {
        await response.body?.cancel().catch(() => {});
        return null;
      }
      if (!response.ok || !response.body) throw await fail('GetObject', response);
      return {
        ...headOf(response),
        body: Readable.fromWeb(/** @type {any} */ (response.body)),
      };
    },
    async head(key) {
      const response = await send('HEAD', key);
      if (response.status === 404) return null;
      if (!response.ok) throw await fail('HeadObject', response);
      return headOf(response);
    },
    async delete(key) {
      const response = await send('DELETE', key);
      if (!response.ok && response.status !== 404) throw await fail('DeleteObject', response);
      await response.body?.cancel().catch(() => {});
    },
  };
}

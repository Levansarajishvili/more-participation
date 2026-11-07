import { createHttpAdminAdapter } from '@/admin/api/http.js';

/**
 * „ბრაუზერი“ frontend-ის HTTP adapter-ისთვის (B3 → B4): cookie jar (`Set-Cookie`-ის `__Host-` წესით,
 * `Max-Age=0` შლის), `document.cookie` — მხოლოდ httpOnly-ს გარეშე (`http.js` CSRF token-ს აქედან
 * კითხულობს), ყოველი პასუხი ↔ spec (`problems`).
 */

/**
 * @typedef {{ name: string, value: string, httpOnly: boolean }} JarCookie
 */

/**
 * Blob → ბაიტები (jsdom-ის Blob-საც: `arrayBuffer`, ძველზე — FileReader).
 * @param {Blob} blob
 * @returns {Promise<Uint8Array>}
 */
async function blobBytes(blob) {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(/** @type {ArrayBuffer} */ (reader.result)));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * B5: `FormData` → `multipart/form-data` (RFC 7578) ხელით. jsdom-ის FormData-ს Node-ის fetch ვერ
 * კითხულობს (`[object FormData]` გაიგზავნებოდა) — ორივე გარემოში ერთნაირი სხეული.
 * @param {FormData} form
 * @returns {Promise<{ body: Uint8Array, type: string }>}
 */
export async function encodeMultipart(form) {
  const boundary = `----mc-test-${Math.random().toString(16).slice(2)}`;
  const encoder = new TextEncoder();
  /** @type {Uint8Array[]} */
  const chunks = [];
  const quote = (/** @type {string} */ value) => value.replace(/"/g, '%22').replace(/\r|\n/g, ' ');
  for (const [name, value] of form.entries()) {
    if (typeof value === 'string') {
      chunks.push(
        encoder.encode(
          `--${boundary}\r\nContent-Disposition: form-data; name="${quote(name)}"\r\n\r\n${value}\r\n`,
        ),
      );
    } else {
      const file = /** @type {File} */ (value);
      chunks.push(
        encoder.encode(
          `--${boundary}\r\nContent-Disposition: form-data; name="${quote(name)}"; filename="${quote(file.name ?? 'blob')}"\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
        ),
        await blobBytes(file),
        encoder.encode('\r\n'),
      );
    }
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));
  const body = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return { body, type: `multipart/form-data; boundary=${boundary}` };
}

/**
 * @param {{ base: string, matcher: ReturnType<typeof import('./contract/spec-match.js').createMatcher> }} options
 *   `base` — `http://127.0.0.1:<port>/api/admin`
 */
export function createBrowser({ base, matcher }) {
  /** @type {Map<string, JarCookie>} */
  const jar = new Map();
  /** @type {string[]} */
  const problems = [];

  /** @type {typeof fetch} */
  const doFetch = async (url, init = {}) => {
    const headers = new Headers(/** @type {HeadersInit} */ (init.headers));
    if (jar.size) {
      headers.set('cookie', [...jar.values()].map((c) => `${c.name}=${c.value}`).join('; '));
    }
    let { body } = init;
    const form = /** @type {any} */ (body);
    if (form && typeof form.entries === 'function' && typeof form.append === 'function') {
      const encoded = await encodeMultipart(form);
      body = encoded.body;
      headers.set('content-type', encoded.type);
    }
    const response = await fetch(url, { ...init, headers, body });
    for (const line of response.headers.getSetCookie()) {
      const [pair, ...attributes] = line.split(/;\s*/);
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const lower = attributes.map((a) => a.toLowerCase());
      if (
        !lower.includes('secure') ||
        !lower.includes('path=/') ||
        lower.some((a) => a.startsWith('domain='))
      ) {
        problems.push(`${name}: __Host- წესი`);
      }
      if (lower.includes('max-age=0')) jar.delete(name);
      else
        jar.set(name, { name, value: pair.slice(index + 1), httpOnly: lower.includes('httponly') });
    }
    const pathname = new URL(String(url)).pathname;
    const hit = matcher.match(String(init.method ?? 'GET'), pathname);
    if (hit) {
      const data = await response
        .clone()
        .json()
        .catch(() => undefined);
      problems.push(
        ...matcher.checkResponse(hit.op, response.status, data).map((p) => `${pathname}: ${p}`),
      );
    } else problems.push(`spec-ში არ არის: ${init.method ?? 'GET'} ${pathname}`);
    return response;
  };

  return {
    jar,
    problems,
    /** B6: იგივე fetch საჯარო adapter-ისთვის (spec-ის შემოწმებით) */
    fetch: doFetch,
    adapter: createHttpAdminAdapter({ baseUrl: base, fetch: doFetch }),
    /** `document.cookie` — მხოლოდ httpOnly-ს გარეშე (ბრაუზერის წესი) */
    get cookie() {
      return [...jar.values()]
        .filter((c) => !c.httpOnly)
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
    },
  };
}

/**
 * `document.cookie` (`http.js`-ის `readCsrfToken`): აქტიური ბრაუზერის cookie. Node-ში — მინიმალური
 * `document`; jsdom-ში (რედაქტორის ტესტი) — `cookie` თვისება იმავე `document`-ზე.
 * @param {() => { cookie: string } | null} active
 * @returns {() => void}  აღდგენა
 */
export function installDocument(active) {
  const g = /** @type {any} */ (globalThis);
  if (g.document && typeof g.window !== 'undefined') {
    Object.defineProperty(g.document, 'cookie', {
      configurable: true,
      get: () => active()?.cookie ?? '',
      set: () => {},
    });
    return () => {
      delete g.document.cookie;
    };
  }
  const had = 'document' in g;
  const previous = g.document;
  g.document = {
    get cookie() {
      return active()?.cookie ?? '';
    },
    documentElement: { lang: 'ka' },
  };
  return () => {
    if (had) g.document = previous;
    else delete g.document;
  };
}

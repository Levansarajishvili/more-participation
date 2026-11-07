import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

/**
 * B7: frontend-ის build (`dist/`) მეხსიერებაში — `@fastify/static`-ის ნაცვლად (B0 #3 ამას
 * ითვალისწინებდა): HTML სერვერზე იწყობა (meta, რეალური 404), ფაილების რაოდენობა მცირეა (≈ 2 MB),
 * ხოლო `@fastify/static`-ის `glob` / `send` ჯაჭვი ≥ 14 დღის წესით ვერ ჩაიკეტება.
 *
 * - `index.html` — შაბლონი (ფაილად არ ემსახურება); მისი inline script-ების (mc-boot) sha256 — CSP-ისთვის.
 * - `assets/*` — სახელში hash-ია: `Cache-Control: public, max-age=31536000, immutable`.
 * - სხვა ფაილი (`favicon.svg`) — `public, max-age=0, must-revalidate` + ETag.
 * - წერტილით დაწყებული ფაილი / საქაღალდე (`.vite/manifest.json`, `.vite/modules.json`) არ ემსახურება.
 * - ტექსტური ფაილი ≥ 1 KB — brotli და gzip გაშვებისას (`Content-Encoding` მოთხოვნის მიხედვით).
 */

export const ASSET_CACHE = 'public, max-age=31536000, immutable';
export const FILE_CACHE = 'public, max-age=0, must-revalidate';
/** HTML სერვერზე იწყობა და კონტენტზეა დამოკიდებული — ბრაუზერი ყოველ ჯერზე ამოწმებს. */
export const HTML_CACHE = 'no-cache';

/** @type {Readonly<Record<string, string>>} */
export const CONTENT_TYPES = Object.freeze({
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
});

const COMPRESSIBLE = new Set(['.js', '.mjs', '.css', '.html', '.svg', '.json', '.txt', '.xml']);
const MIN_COMPRESS = 1024;

/**
 * @typedef {object} SiteFile
 * @property {string} path         URL-ის გზა (`/assets/index-abc.js`)
 * @property {string} type         Content-Type
 * @property {string} cache        Cache-Control
 * @property {string} etag
 * @property {Buffer} body
 * @property {Buffer | null} br
 * @property {Buffer | null} gzip
 */

/**
 * @typedef {object} Site
 * @property {string} dir
 * @property {string} template           `index.html`
 * @property {string[]} scriptHashes     inline script-ების CSP hash (`'sha256-…'`)
 * @property {Map<string, SiteFile>} files
 */

export class SiteError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'SiteError';
  }
}

/**
 * inline (src-ის გარეშე) script-ების CSP hash. ბრაუზერი hash-ს script-ის ტექსტზე ითვლის ზუსტად
 * ისე, როგორც HTML-შია — ამიტომ შაბლონის ამ ნაწილს სერვერი არ ცვლის.
 * @param {string} html
 * @returns {string[]}
 */
export function inlineScriptHashes(html) {
  const hashes = [];
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(attrs)) continue;
    hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return hashes;
}

/** @param {Buffer} body */
const etagOf = (body) => `"${createHash('sha256').update(body).digest('base64url').slice(0, 27)}"`;

/**
 * @param {string} dir
 * @returns {AsyncGenerator<string>}
 */
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

/**
 * @param {string} path
 * @param {Buffer} body
 * @returns {SiteFile}
 */
export function siteFile(path, body) {
  const ext = extname(path).toLowerCase();
  const compress = COMPRESSIBLE.has(ext) && body.length >= MIN_COMPRESS;
  const br = compress
    ? brotliCompressSync(body, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_SIZE_HINT]: body.length,
        },
      })
    : null;
  const gzip = compress ? gzipSync(body, { level: 9 }) : null;
  return {
    path,
    type: CONTENT_TYPES[ext] ?? 'application/octet-stream',
    cache: path.startsWith('/assets/') ? ASSET_CACHE : FILE_CACHE,
    etag: etagOf(body),
    body,
    br: br && br.length < body.length ? br : null,
    gzip: gzip && gzip.length < body.length ? gzip : null,
  };
}

/**
 * build-ის ჩატვირთვა. `index.html`-ის გარეშე → SiteError (წარმოებაში სერვისი არ ეშვება: build არ
 * შესრულებულა ან `SITE_DIR` არასწორია).
 * @param {string} dir
 * @returns {Promise<Site>}
 */
export async function loadSite(dir) {
  let template;
  try {
    template = await readFile(join(dir, 'index.html'), 'utf8');
  } catch {
    throw new SiteError(
      'SITE_DIR: index.html ვერ მოიძებნა — ჯერ `npm run build` (ან SITE_DIR მიუთითე)',
    );
  }
  if (!/<html\b[^>]*\blang="[^"]*"/.test(template) || !/<title>[\s\S]*?<\/title>/.test(template)) {
    throw new SiteError('SITE_DIR: index.html-ს `<html lang>` ან `<title>` აკლია');
  }
  /** @type {Map<string, SiteFile>} */
  const files = new Map();
  for await (const full of walk(dir)) {
    const path = `/${relative(dir, full).split(sep).join('/')}`;
    if (path === '/index.html') continue;
    files.set(path, siteFile(path, await readFile(full)));
  }
  return { dir, template, scriptHashes: inlineScriptHashes(template), files };
}

/**
 * `Accept-Encoding` → br | gzip | null (q=0 — უარი).
 * @param {unknown} header
 * @returns {'br' | 'gzip' | null}
 */
export function pickEncoding(header) {
  if (typeof header !== 'string' || !header) return null;
  /** @type {Map<string, number>} */
  const accepted = new Map();
  for (const part of header.toLowerCase().split(',')) {
    const [name, ...params] = part.trim().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    accepted.set(name.trim(), q ? Number(q.slice(2)) : 1);
  }
  const ok = (/** @type {string} */ name) =>
    (accepted.get(name) ?? (accepted.has('*') ? accepted.get('*') : 0)) > 0;
  if (ok('br')) return 'br';
  if (ok('gzip')) return 'gzip';
  return null;
}

/**
 * ფაილის პასუხი: ETag / 304, Content-Encoding, Vary. HEAD-ზე სხეულს Fastify არ აგზავნის.
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {SiteFile} file
 */
export function sendFile(request, reply, file) {
  reply.header('content-type', file.type).header('cache-control', file.cache);
  reply.header('etag', file.etag);
  if (file.br || file.gzip) reply.header('vary', 'Accept-Encoding');
  const match = request.headers['if-none-match'];
  if (typeof match === 'string' && match.split(',').some((tag) => tag.trim() === file.etag)) {
    return reply.code(304).send();
  }
  const encoding = pickEncoding(request.headers['accept-encoding']);
  const body = encoding === 'br' ? file.br : encoding === 'gzip' ? file.gzip : null;
  if (body) reply.header('content-encoding', encoding);
  return reply.send(body ?? file.body);
}

import { isSlug } from '@/content/slug.js';

import { NOINDEX, siteCsp } from '../site/headers.js';
import { HTML_CACHE, sendFile } from '../site/files.js';
import { renderIndex, resolveMeta } from '../site/meta.js';
import { SITEMAP_CACHE, robotsTxt, sitemapXml } from '../site/sitemap.js';

/**
 * B7: frontend-ი იმავე Fastify სერვისზე (B0 #3 — ერთი origin): `/assets/*`, `dist/`-ის სხვა ფაილები,
 * `robots.txt`, `sitemap.xml` და SPA fallback (`/`, `/en/*`, `/admin/*`, `/en/admin/*`, `/subscribe/*`)
 * სერვერის meta-თი და რეალური სტატუსით.
 *
 * - `/assets/<არარსებული>` → 404 (text/plain), არა index.html — ძველი chunk-ის მოთხოვნა (deploy-ის
 *   შემდეგ) ცარიელ HTML-ს JS-ად არ მიიღებს.
 * - `/api/*` და `/media/*`, რომელსაც route არ აქვს → API-ის 404 (JSON, `errors.js`).
 * - `/about/` → 301 `/about` (ერთი canonical მისამართი); `/index.html` → 301 `/`.
 * - HTML: `Cache-Control: no-cache`, CSP (mc-boot-ის hash), ადმინზე / 404-ზე / ბმულის გვერდზე
 *   `X-Robots-Tag: noindex, nofollow`.
 * - ბაზის შეცდომისას მასალის შემოწმება ჩერდება: გვერდი 200-ით და გვერდის ზოგადი meta-თი იხსნება
 *   (SPA თავის შეცდომის მდგომარეობას აჩვენებს), ლოგში — მხოლოდ მოვლენა.
 *
 * @param {import('fastify').FastifyInstance} app
 * @param {{ site: import('../site/files.js').Site }} options
 */
export function registerSite(app, { site }) {
  const { config } = app;
  const csp = siteCsp({ scriptHashes: site.scriptHashes });
  const origin = config.publicOrigin;
  const { indexing } = config.site;
  const rootFiles = new Map([...site.files].filter(([path]) => !path.startsWith('/assets/')));

  /** @param {string} collection @param {string} slug */
  const findItem = async (collection, slug) => {
    if (!app.repos || !isSlug(slug)) return null;
    return app.repos.content.publicItem(/** @type {any} */ (collection), slug, app.now());
  };

  app.get('/assets/*', { config: { site: true } }, async (request, reply) => {
    const file = site.files.get(request.url.split(/[?#]/)[0]);
    if (!file) return reply.code(404).type('text/plain; charset=utf-8').send('Not Found');
    return sendFile(request, reply, file);
  });

  app.get('/robots.txt', { config: { site: true } }, async (request, reply) =>
    reply
      .type('text/plain; charset=utf-8')
      .header('cache-control', SITEMAP_CACHE)
      .send(robotsTxt({ origin, indexing })),
  );

  app.get('/sitemap.xml', { config: { site: true } }, async (request, reply) => {
    if (!indexing || !app.repos) {
      return reply.code(404).type('text/plain; charset=utf-8').send('Not Found');
    }
    const at = app.now();
    const xml = await sitemapXml({
      origin,
      listItems: (collection) =>
        app.repos.content.publicItems(/** @type {any} */ (collection), { at }),
    });
    return reply
      .type('application/xml; charset=utf-8')
      .header('cache-control', SITEMAP_CACHE)
      .send(xml);
  });

  /** @type {import('fastify').RouteHandlerMethod} */
  const page = async (request, reply) => {
    const url = new URL(request.url, 'http://site.invalid');
    const { pathname } = url;
    if (/^\/(?:api|media)(?:\/|$)/.test(pathname)) return reply.callNotFound();
    const file = rootFiles.get(pathname);
    if (file) return sendFile(request, reply, file);
    if (pathname === '/index.html') return reply.redirect(`/${url.search}`, 301);
    if (pathname.length > 1 && pathname.endsWith('/')) {
      return reply.redirect(`${pathname.replace(/\/+$/, '') || '/'}${url.search}`, 301);
    }

    const meta = await resolveMeta({
      pathname,
      searchParams: url.searchParams,
      origin,
      indexing,
      findItem,
      onError: (error) => request.log.warn({ event: 'site.meta.failed', err: error }),
    });
    reply
      .code(meta.status)
      .type('text/html; charset=utf-8')
      .header('cache-control', HTML_CACHE)
      .header('content-security-policy', csp);
    if (!meta.index) reply.header('x-robots-tag', NOINDEX);
    return reply.send(renderIndex(site.template, meta));
  };

  app.get('/', { config: { site: true } }, page);
  app.get('/*', { config: { site: true } }, page);
}

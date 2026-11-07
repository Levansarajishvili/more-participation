import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { NOW } from '@/content/__tests__/scenarios/content-scenarios.js';
import { localize } from '@/content/localize.js';

import { seedSource } from '../../db/seed.js';
import { ASSET_CACHE, HTML_CACHE, loadSite, pickEncoding } from '../../site/files.js';
import { PERMISSIONS_POLICY, siteCsp } from '../../site/headers.js';
import { escapeHtml, renderIndex, resolveMeta } from '../../site/meta.js';
import { robotsTxt } from '../../site/sitemap.js';
import { FAKE_PRODUCTION_ENV, SITE_FIXTURE, captureLogs, makeApp } from '../helpers.js';
import { seededDatabase } from '../public/public-env.js';

/**
 * B7: frontend-ი იმავე სერვისზე — build-ის ფაილები, SPA fallback, სერვერის meta (prerender-ის
 * ნაცვლად), რეალური 404, CSP / Permissions-Policy / X-Robots-Tag, robots.txt, sitemap.xml.
 */

const ORIGIN = 'https://example.org';
/** ბაზა ტესტიდან გადაეცემა (`db`) — URI მხოლოდ config-ის სავალდებულო ველია */
const PRODUCTION = {
  ...FAKE_PRODUCTION_ENV,
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://127.0.0.1:1/x',
};
const ASSET = '/assets/index-Fx7Ab12C.js';

/** seed-ის საჯარო სტატია თარგმანით და თარგმანის გარეშე */
function seededArticles() {
  const articles = seedSource({ now: NOW }).records.filter(
    (record) => record.type === 'articles' && record.item.status === 'published',
  );
  const translated = articles.find((r) => localize(r.item, 'en').lang === 'en');
  const plain = articles.find((r) => localize(r.item, 'en').lang === 'ka');
  if (!translated || !plain) throw new Error('seed-ში სტატიის ორივე სახე უნდა იყოს');
  return { translated: translated.item, plain: plain.item };
}

/** @param {string} html @param {string} selector — `name|property|rel=value` */
function headTag(html, selector) {
  const [attr, value] = selector.split('=');
  const re = new RegExp(`<(?:meta|link) [^>]*${attr}="${value}"[^>]*>`, 'g');
  return html.match(re) ?? [];
}

/** @param {string} tag @param {string} attr */
const attrOf = (tag, attr) => tag.match(new RegExp(`${attr}="([^"]*)"`))?.[1] ?? null;

describe('build-ის ფაილები (site/files.js)', () => {
  it('index.html — შაბლონი, mc-boot-ის sha256; წერტილიანი საქაღალდე (.vite) არ ემსახურება', async () => {
    const site = await loadSite(SITE_FIXTURE);
    expect([...site.files.keys()].sort()).toEqual([
      '/assets/index-Fx7Ab12C.js',
      '/assets/index-Kp9Zq3Rt.css',
      '/favicon.svg',
    ]);
    const body = site.template.match(/<script id="mc-boot">([\s\S]*?)<\/script>/)?.[1] ?? '';
    const hash = createHash('sha256').update(body, 'utf8').digest('base64');
    expect(site.scriptHashes).toEqual([`'sha256-${hash}'`]);
    const js = /** @type {any} */ (site.files.get(ASSET));
    expect(js.cache).toBe(ASSET_CACHE);
    expect(brotliDecompressSync(js.br).equals(js.body)).toBe(true);
    expect(gunzipSync(js.gzip).equals(js.body)).toBe(true);
    // 1 KB-ზე მცირე — შეკუმშვის გარეშე
    expect(site.files.get('/assets/index-Kp9Zq3Rt.css')?.br).toBeNull();
  });

  it('index.html-ის გარეშე → SiteError (ტექსტში გზა არ არის)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mc-site-'));
    try {
      await expect(loadSite(dir)).rejects.toMatchObject({ name: 'SiteError' });
      await expect(loadSite(dir)).rejects.not.toThrow(dir);
      await writeFile(join(dir, 'index.html'), '<html><head></head></html>');
      await expect(loadSite(dir)).rejects.toThrow(/<html lang>/);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('Accept-Encoding: br > gzip, q=0 — უარი, * — ნებისმიერი', () => {
    expect(pickEncoding('gzip, deflate, br, zstd')).toBe('br');
    expect(pickEncoding('gzip')).toBe('gzip');
    expect(pickEncoding('br;q=0, gzip')).toBe('gzip');
    expect(pickEncoding('*')).toBe('br');
    expect(pickEncoding('identity')).toBeNull();
    expect(pickEncoding(undefined)).toBeNull();
  });
});

describe('CSP / Permissions-Policy / robots.txt', () => {
  it('CSP: unsafe-inline / eval არ არის; YouTube, mc-boot-ის hash', () => {
    const csp = siteCsp({ scriptHashes: ["'sha256-abc='"] });
    expect(csp).toContain("script-src 'self' 'sha256-abc=' https://www.youtube.com");
    expect(csp).toContain('frame-src https://www.youtube-nocookie.com');
    expect(csp).toContain("img-src 'self' data: https://i.ytimg.com");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/unsafe-(inline|eval)|fonts\.googleapis/);
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('Permissions-Policy: კამერა / მიკროფონი / მდებარეობა — არავის; autoplay — მხოლოდ YouTube-ის iframe-ს', () => {
    expect(PERMISSIONS_POLICY).toContain('camera=()');
    expect(PERMISSIONS_POLICY).toContain('microphone=()');
    expect(PERMISSIONS_POLICY).toContain('geolocation=()');
    expect(PERMISSIONS_POLICY).toContain('autoplay=(self "https://www.youtube-nocookie.com")');
    expect(PERMISSIONS_POLICY).toContain('fullscreen=(self)');
  });

  it('robots.txt: /admin და /api არ იწერება; რუკა მხოლოდ ინდექსაციისას', () => {
    const on = robotsTxt({ origin: ORIGIN, indexing: true });
    expect(on).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
    expect(on).not.toMatch(/admin|\/api|Disallow/);
    expect(robotsTxt({ origin: ORIGIN, indexing: false })).not.toMatch(/Sitemap|admin|Disallow/);
  });
});

describe('meta (site/meta.js)', () => {
  const base = {
    origin: ORIGIN,
    indexing: true,
    searchParams: new URLSearchParams(),
    findItem: async () => null,
  };

  it('escapeHtml და renderIndex: lang, title, mc-boot უცვლელია', async () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
    const site = await loadSite(SITE_FIXTURE);
    const meta = await resolveMeta({ ...base, pathname: '/en/about' });
    const html = renderIndex(site.template, meta);
    expect(html).toMatch(/<html lang="en">/);
    expect(html).toContain('<title>About us — More Participation</title>');
    expect(html).toContain(site.template.match(/<script id="mc-boot">[\s\S]*?<\/script>/)?.[0]);
  });

  it('ბაზის შეცდომა → გვერდის ზოგადი meta, 200 (არა 404 / 500)', async () => {
    /** @type {unknown[]} */
    const errors = [];
    const meta = await resolveMeta({
      ...base,
      pathname: '/articles/rame',
      findItem: async () => {
        throw new Error('db down');
      },
      onError: (error) => errors.push(error),
    });
    expect(meta.status).toBe(200);
    expect(meta.title).toBe('სტატიები — მეტი ჩართულობა');
    expect(errors).toHaveLength(1);
  });
});

describe('საიტი სერვერზე (production, seed-იანი ბაზა)', () => {
  /** @type {Awaited<ReturnType<typeof seededDatabase>>['database']} */
  let database;
  /** @type {import('fastify').FastifyInstance} */
  let app;
  /** @type {import('fastify').FastifyInstance} */
  let staging;
  const articles = seededArticles();
  const logs = captureLogs();

  beforeAll(async () => {
    ({ database } = await seededDatabase('site'));
    app = await makeApp({
      env: { ...PRODUCTION, SITE_INDEXING: 'on', LOG_LEVEL: 'info' },
      db: database.db,
      now: () => NOW,
      logStream: logs.stream,
    });
    staging = await makeApp({
      env: PRODUCTION,
      db: database.db,
      now: () => NOW,
    });
  });
  afterAll(async () => {
    await app?.close();
    await staging?.close();
    await database?.drop();
  });

  /** @param {string} url @param {Record<string, string>} [headers] */
  const get = (url, headers = {}) => app.inject({ url, headers });

  it('hash-იანი ფაილი: immutable, br / gzip / უშეკუმშავი, ETag → 304, HEAD; არარსებული → 404 (არა HTML)', async () => {
    const br = await get(ASSET, { 'accept-encoding': 'gzip, br' });
    expect(br.statusCode).toBe(200);
    expect(br.headers).toMatchObject({
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': ASSET_CACHE,
      'content-encoding': 'br',
      vary: 'Accept-Encoding',
    });
    const plain = await get(ASSET);
    expect(plain.headers['content-encoding']).toBeUndefined();
    expect(brotliDecompressSync(br.rawPayload).equals(plain.rawPayload)).toBe(true);
    expect((await get(ASSET, { 'accept-encoding': 'gzip' })).headers['content-encoding']).toBe(
      'gzip',
    );
    const again = await get(ASSET, { 'if-none-match': String(plain.headers.etag) });
    expect(again.statusCode).toBe(304);
    expect(again.rawPayload.length).toBe(0);
    const head = await app.inject({ method: 'HEAD', url: ASSET });
    expect(head.statusCode).toBe(200);
    expect(head.rawPayload.length).toBe(0);

    const missing = await get('/assets/index-OLD12345.js');
    expect(missing.statusCode).toBe(404);
    expect(missing.headers['content-type']).toMatch(/^text\/plain/);
    expect(missing.body).not.toContain('<html');

    const favicon = await get('/favicon.svg');
    expect(favicon.headers).toMatchObject({
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=0, must-revalidate',
    });
    const manifest = await get('/.vite/manifest.json');
    expect(manifest.statusCode).toBe(404);
    expect(manifest.body).not.toContain('isEntry');
  });

  it('მთავარი: HTML, no-cache, CSP mc-boot-ის hash-ით, Permissions-Policy, HSTS, hreflang, canonical', async () => {
    const res = await get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toBe(HTML_CACHE);
    expect(res.headers['content-security-policy']).toBe(
      siteCsp({ scriptHashes: app.site?.scriptHashes ?? [] }),
    );
    expect(res.headers['permissions-policy']).toBe(PERMISSIONS_POLICY);
    expect(res.headers['strict-transport-security']).toBe('max-age=31536000');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['x-robots-tag']).toBeUndefined();
    expect(res.body).toMatch(/<html lang="ka">/);
    expect(res.body).toContain('<title>მეტი ჩართულობა</title>');
    expect(headTag(res.body, 'rel=canonical').map((t) => attrOf(t, 'href'))).toEqual([
      `${ORIGIN}/`,
    ]);
    expect(
      headTag(res.body, 'rel=alternate').map((t) => [attrOf(t, 'hreflang'), attrOf(t, 'href')]),
    ).toEqual([
      ['ka', `${ORIGIN}/`],
      ['en', `${ORIGIN}/en`],
      ['x-default', `${ORIGIN}/`],
    ]);
    expect(attrOf(headTag(res.body, 'name=description')[0], 'content')).toMatch(
      /^სტატიები, სლაიდები/,
    );
    expect(headTag(res.body, 'name=robots')).toEqual([]);
  });

  it('ინგლისური სიის გვერდი: lang, სათაური, აღწერა, og:locale', async () => {
    const res = await get('/en/articles?category=career');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatch(/<html lang="en">/);
    expect(res.body).toContain('<title>Articles — More Participation</title>');
    expect(attrOf(headTag(res.body, 'rel=canonical')[0], 'href')).toBe(`${ORIGIN}/en/articles`);
    expect(attrOf(headTag(res.body, 'property=og:locale')[0], 'content')).toBe('en_GB');
  });

  it('სტატია თარგმანით: სათაური / აღწერა / og ორივე ენაზე, en ალტერნატივა', async () => {
    const { translated } = articles;
    const ka = await get(`/articles/${translated.slug}`);
    expect(ka.statusCode).toBe(200);
    expect(ka.body).toContain(`<title>${escapeHtml(translated.title)} — მეტი ჩართულობა</title>`);
    expect(attrOf(headTag(ka.body, 'property=og:type')[0], 'content')).toBe('article');
    const en = await get(`/en/articles/${translated.slug}`);
    expect(en.body).toContain(
      `<title>${escapeHtml(translated.translations.en.title)} — More Participation</title>`,
    );
    expect(attrOf(headTag(en.body, 'rel=canonical')[0], 'href')).toBe(
      `${ORIGIN}/en/articles/${translated.slug}`,
    );
    expect(headTag(en.body, 'rel=alternate').map((t) => attrOf(t, 'hreflang'))).toEqual([
      'ka',
      'en',
      'x-default',
    ]);
  });

  it('სტატია თარგმანის გარეშე: en-ის ალტერნატივა არ არის, /en-ის canonical — ქართული', async () => {
    const { plain } = articles;
    const en = await get(`/en/articles/${plain.slug}`);
    expect(en.statusCode).toBe(200);
    expect(attrOf(headTag(en.body, 'rel=canonical')[0], 'href')).toBe(
      `${ORIGIN}/articles/${plain.slug}`,
    );
    expect(headTag(en.body, 'rel=alternate').map((t) => attrOf(t, 'hreflang'))).toEqual([
      'ka',
      'x-default',
    ]);
  });

  it('რეალური 404: უცნობი გზა და უცნობი slug — noindex, SPA-ს HTML', async () => {
    for (const url of ['/ar-arsebuli', '/articles/ar-arsebuli-statia', '/en/news/ar-arsebuli']) {
      const res = await get(url);
      expect(res.statusCode, url).toBe(404);
      expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(res.body).toContain('<div id="root"></div>');
      expect(headTag(res.body, 'name=robots')).toHaveLength(1);
      expect(headTag(res.body, 'rel=canonical')).toEqual([]);
    }
    expect((await get('/en/ar-arsebuli')).body).toContain(
      '<title>Page not found — More Participation</title>',
    );
  });

  it('ვიდეოს / სერიის პარამეტრი: მასალის სათაური; უცნობი — სიის გვერდი (200)', async () => {
    const video = seedSource({ now: NOW }).records.find(
      (r) => r.type === 'videos' && r.item.status === 'published',
    );
    const res = await get(`/videos?video=${video?.item.slug}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain(`<title>${escapeHtml(video?.item.title)} — მეტი ჩართულობა</title>`);
    expect(attrOf(headTag(res.body, 'rel=canonical')[0], 'href')).toBe(
      `${ORIGIN}/videos?video=${video?.item.slug}`,
    );
    const unknown = await get('/videos?video=ar-arsebuli');
    expect(unknown.statusCode).toBe(200);
    expect(unknown.body).toContain('<title>ვიდეოები — მეტი ჩართულობა</title>');
  });

  it('ადმინი და ბმულის გვერდები: SPA fallback, X-Robots-Tag noindex', async () => {
    for (const url of ['/admin', '/admin/articles/a-001', '/en/admin/login?next=%2Fadmin']) {
      const res = await get(url);
      expect(res.statusCode, url).toBe(200);
      expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(headTag(res.body, 'rel=alternate')).toEqual([]);
    }
    const confirm = await get('/en/subscribe/confirm');
    expect(confirm.statusCode).toBe(200);
    expect(confirm.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(headTag(confirm.body, 'rel=canonical')).toEqual([]);
  });

  it('გადამისამართება: /about/ → /about, /index.html → /; API / media-ს 404 — JSON', async () => {
    const slash = await get('/about/?x=1');
    expect(slash.statusCode).toBe(301);
    expect(slash.headers.location).toBe('/about?x=1');
    expect((await get('/en/')).headers.location).toBe('/en');
    expect((await get('/index.html')).headers.location).toBe('/');
    for (const url of ['/api/ar-arsebuli', '/api/v1/ar', '/media/image/2026/ar.jpg']) {
      const res = await get(url);
      expect(res.statusCode, url).toBe(404);
      expect(res.headers['content-type'], url).toMatch(/^application\/json/);
      if (url.startsWith('/api/')) expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    }
    expect((await app.inject({ method: 'POST', url: '/about' })).statusCode).toBe(404);
  });

  it('sitemap.xml: სტატიკური გვერდები ka + en, მასალა; თარგმანის გარეშე — მხოლოდ ka', async () => {
    const res = await get('/sitemap.xml');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/xml; charset=utf-8');
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    const xml = res.body;
    expect(xml).toContain(`<loc>${ORIGIN}/about</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/en/about</loc>`);
    expect(xml).not.toMatch(/admin|subscribe|__kit/);
    const { translated, plain } = articles;
    expect(xml).toContain(`<loc>${ORIGIN}/en/articles/${translated.slug}</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/articles/${plain.slug}</loc>`);
    expect(xml).not.toContain(`<loc>${ORIGIN}/en/articles/${plain.slug}</loc>`);
    expect(xml).toMatch(/<loc>https:\/\/example\.org\/videos\?video=[a-z0-9-]+<\/loc>/);
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);
    // მონახაზი / დაგეგმილი (მომავალი) რუკაში არ არის
    const hidden = seedSource({ now: NOW }).records.filter(
      (r) => r.type === 'articles' && r.item.status === 'draft',
    );
    for (const record of hidden) expect(xml).not.toContain(`/articles/${record.item.slug}<`);
    expect((await get('/robots.txt')).body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it('staging (SITE_INDEXING=off): noindex ყველა პასუხზე, sitemap → 404, robots.txt რუკის გარეშე', async () => {
    for (const url of ['/', '/about', ASSET, '/favicon.svg', '/robots.txt', '/api/health']) {
      const res = await staging.inject({ url });
      expect(res.headers['x-robots-tag'], url).toBe('noindex, nofollow');
    }
    const home = await staging.inject({ url: '/' });
    expect(headTag(home.body, 'name=robots')).toHaveLength(1);
    expect(headTag(home.body, 'rel=canonical')).toEqual([]);
    expect((await staging.inject({ url: '/sitemap.xml' })).statusCode).toBe(404);
    expect((await staging.inject({ url: '/robots.txt' })).body).not.toContain('Sitemap');
  });

  it('ლოგში მხოლოდ route-ის შაბლონი — slug / query არა', () => {
    const text = logs.text();
    expect(text).not.toContain(articles.translated.slug);
    expect(text).not.toContain('category=career');
    expect(text).toMatch(/"route":"\/\*"/);
  });
});

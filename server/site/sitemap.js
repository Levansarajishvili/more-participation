import { publicItem } from '@/content/public.js';
import { SITE_PAGES, itemPath } from '@/content/seo.js';
import { localizePath } from '@/i18n/locale.js';

import { escapeHtml } from './meta.js';

/**
 * B7: `sitemap.xml` (ka + en, `xhtml:link rel="alternate"`) და `robots.txt`.
 *
 * - საიტის რუკა ბაზიდან ყოველ მოთხოვნაზე იწყობა (საჯაროდ ხილული მასალა — `publicItems`), ამიტომ
 *   გამოქვეყნება / წაშლა მაშინვე აისახება; ქეში — 1 საათი.
 * - ინგლისური მისამართი მხოლოდ თარგმნილ მასალას აქვს (`localize(…, 'en').lang === 'en'`) — თარგმანის
 *   გარეშე `/en/...` ქართული ტექსტის დუბლიკატია (canonical — ქართულზე, `meta.js`).
 * - `robots.txt`: `/admin` არ იწერება (§10 — მისამართს არ ავრცელებს; ადმინს `X-Robots-Tag` იცავს) და
 *   `/api` არ იბლოკება — Googlebot გვერდს `/api/v1`-ის პასუხებით ხატავს.
 * - `SITE_INDEXING=off` (staging): robots.txt რუკას არ ასახელებს, `/sitemap.xml` → 404.
 */

export const SITEMAP_CACHE = 'public, max-age=3600';
export const ITEM_COLLECTIONS = Object.freeze(['articles', 'news', 'videos', 'series']);

/**
 * @param {object} input
 * @param {string} input.origin
 * @param {(collection: string) => Promise<Record<string, any>[]>} input.listItems
 * @returns {Promise<string>}
 */
export async function sitemapXml({ origin, listItems }) {
  /** @type {{ path: string, en: boolean, lastmod?: string }[]} */
  const entries = SITE_PAGES.filter(
    (page) => page.sitemap !== false && page.index !== false && !page.item,
  ).map((page) => ({ path: page.path, en: true }));
  for (const collection of ITEM_COLLECTIONS) {
    for (const raw of await listItems(collection)) {
      if (typeof raw.slug !== 'string' || !raw.slug) continue;
      const lastmod = [raw.updatedAt, raw.publishedAt].find(
        (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value)),
      );
      entries.push({
        path: itemPath(/** @type {any} */ (collection), raw.slug),
        en: publicItem(collection, raw, 'en').lang === 'en',
        ...(lastmod && { lastmod }),
      });
    }
  }

  const loc = (/** @type {string} */ path, /** @type {'ka' | 'en'} */ locale) =>
    escapeHtml(`${origin}${localizePath(path, locale)}`);
  const urls = [];
  for (const entry of entries) {
    const links = [
      `<xhtml:link rel="alternate" hreflang="ka" href="${loc(entry.path, 'ka')}"/>`,
      ...(entry.en
        ? [`<xhtml:link rel="alternate" hreflang="en" href="${loc(entry.path, 'en')}"/>`]
        : []),
      `<xhtml:link rel="alternate" hreflang="x-default" href="${loc(entry.path, 'ka')}"/>`,
    ];
    for (const locale of entry.en
      ? /** @type {const} */ (['ka', 'en'])
      : /** @type {const} */ (['ka'])) {
      urls.push(
        [
          '  <url>',
          `    <loc>${loc(entry.path, locale)}</loc>`,
          ...(entry.lastmod ? [`    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>`] : []),
          ...links.map((link) => `    ${link}`),
          '  </url>',
        ].join('\n'),
      );
    }
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * @param {{ origin: string, indexing: boolean }} options
 * @returns {string}
 */
export function robotsTxt({ origin, indexing }) {
  return indexing
    ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
    : '# ინდექსაცია გამორთულია (SITE_INDEXING=off): ყველა პასუხს X-Robots-Tag: noindex, nofollow აქვს\nUser-agent: *\nAllow: /\n';
}

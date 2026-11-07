import { createHash } from 'node:crypto';

import { ContentError } from '@/content/errors.js';
import { localize } from '@/content/localize.js';
import { orgFromPage, publicItem } from '@/content/public.js';
import {
  findArticle,
  findNews,
  findSeries,
  findVideo,
  queryArticles,
  queryEvents,
  queryNews,
  querySeries,
  queryVideos,
} from '@/content/query.js';
import { isSlug } from '@/content/slug.js';

import { ABOUT_SLUG } from '../db/index.js';
import { searchFilter } from '../db/derive.js';
import { repositories } from '../lib/auth.js';
import { inLocale, requestLocale } from '../lib/i18n.js';
import { route } from '../lib/openapi.js';

/**
 * საჯარო წაკითხვა `/api/v1/*` (B6) — `ContentAdapter`-ის ყოველი GET. სემანტიკა mock adapter-ისაა
 * (`src/content/mock/index.js`), კოდიც საერთოა:
 *
 * 1. ბაზა: მხოლოდ საჯაროდ ხილული (`publicFilter` — `query.js`-ის `isPublic`), ჩასმის რიგით;
 *    სტატიებზე წინასწარი ფილტრი ინდექსით — `item.category`, `item.featured`, `searchText`
 *    (`searchFilter`; `searchText` ორივე ენის საძიებო ტექსტის ზესიმრავლეა — `derive.js`).
 * 2. საჯარო ხედი — `public.js` (`localize` + `readingMinutes` ენის ვერსიით; გუნდი — `orgFromPage`).
 * 3. ფილტრი, ზუსტი ძიება, დალაგება, `cursor` / `limit`, `years`, `not-found` / `bad-request` —
 *    `query.js` (mock-ის იგივე ფუნქციები), მოთხოვნის ენაზე (`inLocale`: კატეგორიის წარწერა ძიებაში,
 *    შეცდომის ტექსტი). ეს ნაწილი სინქრონულია — `await` მის შიგნით არ არის.
 *
 * ქეში: `ETag` (პასუხის sha256) + `Cache-Control: public, max-age=0, must-revalidate` — ბრაუზერი
 * ყოველ ჯერზე ამოწმებს (`If-None-Match` → 304 სხეულის გარეშე), ამიტომ ადმინში გამოქვეყნება, წაშლა ან
 * დაგეგმილი დროის დადგომა მომდევნო მოთხოვნაზე მაშინვე ჩანს; სერვერის ქეში არ არის (პასუხი ყოველ ჯერზე
 * ბაზიდან). შეცდომა (400 / 404) — `no-store` (`security.js`).
 */

/** @typedef {import('@/i18n/locale.js').Locale} Locale */

export const PUBLIC_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

/**
 * ძლიერი ETag: პასუხის სხეულის sha256 (base64url, 160 ბიტი).
 * @param {string} body
 * @returns {string}
 */
export function etagOf(body) {
  return `"${createHash('sha256').update(body).digest('base64url').slice(0, 27)}"`;
}

/**
 * `If-None-Match` (RFC 9110 §13.1.2): სუსტი შედარება, სია, `*`.
 * @param {unknown} header
 * @param {string} etag
 * @returns {boolean}
 */
export function matchesEtag(header, etag) {
  if (typeof header !== 'string' || !header.trim()) return false;
  if (header.trim() === '*') return true;
  const strip = (/** @type {string} */ tag) => tag.trim().replace(/^W\//, '');
  return header.split(',').some((tag) => strip(tag) === strip(etag));
}

/**
 * პასუხი ETag-ით; ემთხვევა → 304.
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 * @param {unknown} value
 */
function cached(request, reply, value) {
  const body = JSON.stringify(value);
  const etag = etagOf(body);
  reply.header('etag', etag).header('cache-control', PUBLIC_CACHE_CONTROL);
  if (matchesEtag(request.headers['if-none-match'], etag)) {
    reply.code(304);
    return reply.send();
  }
  reply.type('application/json; charset=utf-8');
  return reply.send(body);
}

/**
 * query → `query.js`-ის პარამეტრები (`lang`-ის გარეშე).
 * @param {Record<string, any>} query
 */
function paramsOf(query) {
  const { lang: _lang, ...params } = query ?? {};
  return params;
}

/**
 * @param {Record<string, any>[]} items
 * @param {string} collection
 * @param {Locale} locale
 */
const view = (items, collection, locale) =>
  items.map((item) => publicItem(collection, item, locale));

/** @param {import('fastify').FastifyInstance} app */
export function registerPublicRoutes(app) {
  const { spec } = app;
  const content = () => repositories(app).content;

  /**
   * GET route: ბაზა (async) → საჯარო ხედი და `query.js` (სინქრონულად, მოთხოვნის ენაზე) → ETag.
   * @template T
   * @param {string} operationId
   * @param {(request: any, at: number) => Promise<T>} load
   * @param {(data: T, request: any, at: number, locale: Locale) => unknown} produce
   */
  function get(operationId, load, produce) {
    route(app, spec, operationId, async (request, reply) => {
      const locale = requestLocale(request.query?.lang);
      const at = app.now();
      const data = await load(request, at);
      const value = inLocale(locale, () => produce(data, request, at, locale));
      return cached(request, reply, value);
    });
  }

  /**
   * მასალა slug-ით: არასწორი ფორმა → 404 ბაზის გარეშე (`query.js`-ის `find*`-ის წესი).
   * @param {import('@/admin/content-types.js').ContentType} type
   */
  const bySlug = (type) => async (/** @type {any} */ request, /** @type {number} */ at) => {
    const { slug } = request.params;
    if (!isSlug(slug)) return [];
    const item = await content().publicItem(type, slug, at);
    return item ? [item] : [];
  };

  /** @param {import('@/admin/content-types.js').ContentType} type */
  const all = (type) => (/** @type {any} */ _request, /** @type {number} */ at) =>
    content().publicItems(type, { at });

  /** „ჩვენ შესახებ“ გვერდი (გუნდი, პარტნიორები, ეტაპები) — mock-ის `setOrg`-ის წყარო. */
  const org = async () => orgFromPage((await content().findBySlug('pages', ABOUT_SLUG))?.item);

  get(
    'listArticles',
    (request, at) => {
      const { category, featured, q } = request.query;
      const search = typeof q === 'string' ? searchFilter(q) : null;
      return content().publicItems('articles', {
        at,
        where: {
          ...(category && { 'item.category': category }),
          ...(typeof featured === 'boolean' && { 'item.featured': featured }),
          ...search,
        },
      });
    },
    (items, request, at, locale) =>
      queryArticles(
        /** @type {any} */ (view(items, 'articles', locale)),
        paramsOf(request.query),
        at,
      ),
  );
  get('getArticle', bySlug('articles'), (items, request, at, locale) =>
    findArticle(/** @type {any} */ (view(items, 'articles', locale)), request.params.slug, at),
  );

  get('listSeries', all('series'), (items, request, at, locale) =>
    querySeries(/** @type {any} */ (view(items, 'series', locale)), paramsOf(request.query), at),
  );
  get('getSeries', bySlug('series'), (items, request, at, locale) =>
    findSeries(/** @type {any} */ (view(items, 'series', locale)), request.params.slug, at),
  );

  get('listVideos', all('videos'), (items, request, at, locale) =>
    queryVideos(/** @type {any} */ (view(items, 'videos', locale)), paramsOf(request.query), at),
  );
  get('getVideo', bySlug('videos'), (items, request, at, locale) =>
    findVideo(/** @type {any} */ (view(items, 'videos', locale)), request.params.slug, at),
  );

  get(
    'listNews',
    (request, at) => {
      const { type } = request.query;
      return content().publicItems('news', { at, where: type ? { 'item.type': type } : {} });
    },
    (items, request, at, locale) =>
      queryNews(/** @type {any} */ (view(items, 'news', locale)), paramsOf(request.query), at),
  );
  get('getNews', bySlug('news'), (items, request, at, locale) =>
    findNews(/** @type {any} */ (view(items, 'news', locale)), request.params.slug, at),
  );

  get('listEvents', all('events'), (items, request, at, locale) =>
    queryEvents(/** @type {any} */ (view(items, 'events', locale)), paramsOf(request.query), at),
  );

  get('getTeam', org, ({ team }, _request, _at, locale) =>
    team.map((member) => localize(member, locale)).sort((a, b) => a.order - b.order),
  );
  get('getPartners', org, ({ partners }, _request, _at, locale) =>
    partners.map((partner) => localize(partner, locale)),
  );
  get('getStages', org, ({ stages }) => stages);

  get(
    'getSettings',
    async () => (await repositories(app).settings.get())?.item ?? null,
    (site, _request, _at, locale) => {
      if (!site) throw new ContentError('not-found', { detail: 'settings' });
      return localize(site, locale);
    },
  );
}

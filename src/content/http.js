import { getLocale } from '@/i18n/locale.js';

import { ContentError, ERROR_CODES, normalizeError } from './errors.js';
import { isSubscribeToken, isUnsubscribeToken } from './forms.js';
import { QUERY_MAX } from './query.js';
import { isSlug } from './slug.js';

/**
 * B6: `ContentAdapter`-ის HTTP ვერსია — საჯარო API `/api/v1/*` (`server/openapi.yaml`, `x-adapter`).
 * ჩაირთვება `VITE_CONTENT_API`-ით (`adapter.js`); მის გარეშე mock რჩება ნაგულისხმევად.
 *
 * - ენა: ყოველ მოთხოვნას `lang` ახლავს (`getLocale()` — `ka` | `en`): პასუხი ამ ენაზეა
 *   (`localize`), ფორმის შეცდომის ტექსტიც (B6, ნაწილი ბ).
 * - query: `undefined` / `null` / `''` არ იგზავნება, მნიშვნელობა — `String(value)`; `q` — trim და
 *   `QUERY_MAX` (100) სიმბოლო (spec: ზედმეტი კლიენტზე იჭრება — mock-ის `cleanQuery`-ის იგივე).
 * - slug: არასწორი ფორმა → `not-found` მოთხოვნის გარეშე (`query.js`-ის `find*`-ის იგივე წესი);
 *   გამოწერის token-ის არასწორი ფორმა → `bad-request` მოთხოვნის გარეშე (mock-ის იგივე წესი).
 * - cookie არ იგზავნება (`credentials: 'omit'`): საჯარო პასუხი სესიაზე არ არის დამოკიდებული.
 *   HTTP ქეში ბრაუზერისაა (`ETag` → `If-None-Match` → 304); adapter-ი თავად არაფერს ინახავს.
 * - შეცდომა ყოველთვის `ContentError`: კოდი პასუხის `code`-იდან (ან სტატუსიდან), ტექსტი — მიმდინარე
 *   ენაზე (`errors.<code>`, mock-ის იგივე); 400 / 422 + `fields` → `validation`; fetch-ის
 *   ჩავარდნა → `network`.
 */

/** @typedef {import('./adapter.js').ContentAdapter} ContentAdapter */

export const DEFAULT_CONTENT_API = '/api/v1';

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function cleanQuery(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new ContentError('bad-request', { detail: `q: ${String(value)}` });
  }
  return value.trim().slice(0, QUERY_MAX);
}

/**
 * HTTP-ის შეცდომის პასუხი → `ContentError`.
 * @param {number} status
 * @param {any} data  პასუხის JSON (`{ code, message, fields? }`) ან null
 * @returns {ContentError}
 */
export function responseError(status, data) {
  if ((status === 422 || status === 400) && data?.fields && typeof data.fields === 'object') {
    return new ContentError('validation', { fields: data.fields });
  }
  const code = /** @type {any} */ (data?.code);
  if (ERROR_CODES.includes(code) && code !== 'network' && code !== 'unknown') {
    return new ContentError(code, { detail: `HTTP ${status}` });
  }
  return normalizeError(Object.assign(new Error(`HTTP ${status}`), { status }));
}

/**
 * @param {object} [options]
 * @param {string} [options.baseUrl]   ნაგულისხმევი `/api/v1` (ერთი origin, B0 #4)
 * @param {typeof fetch} [options.fetch]
 * @param {() => import('@/i18n/locale.js').Locale} [options.locale]  ნაგულისხმევი `getLocale`
 * @returns {ContentAdapter}
 */
export function createHttpContentAdapter({
  baseUrl = DEFAULT_CONTENT_API,
  fetch: doFetch = globalThis.fetch.bind(globalThis),
  locale = getLocale,
} = {}) {
  const root = baseUrl.replace(/\/$/, '');

  /**
   * @param {'GET' | 'POST'} method
   * @param {string} path
   * @param {{ query?: Record<string, unknown>, body?: unknown }} [options]
   */
  async function request(method, path, { query = {}, body } = {}) {
    try {
      const url = new URL(
        `${root}${path}`,
        typeof window === 'undefined' ? 'http://localhost' : window.location.href,
      );
      for (const [key, value] of Object.entries({ ...query, lang: locale() })) {
        if (value !== undefined && value !== null && value !== '')
          url.searchParams.set(key, String(value));
      }
      /** @type {Record<string, string>} */
      const headers = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await doFetch(url.toString(), {
        method,
        credentials: 'omit',
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw responseError(response.status, data);
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * @param {string} base
   * @param {unknown} slug
   */
  function bySlug(base, slug) {
    if (!isSlug(slug)) {
      return Promise.reject(new ContentError('not-found', { detail: `slug: ${String(slug)}` }));
    }
    return request('GET', `${base}/${encodeURIComponent(/** @type {string} */ (slug))}`);
  }

  return {
    source: 'http',
    listArticles: async (params = {}) =>
      request('GET', '/articles', { query: { ...params, q: cleanQuery(params.q) } }),
    getArticle: (slug) => bySlug('/articles', slug),
    listSeries: (params = {}) => request('GET', '/series', { query: { ...params } }),
    getSeries: (slug) => bySlug('/series', slug),
    listVideos: (params = {}) => request('GET', '/videos', { query: { ...params } }),
    getVideo: (slug) => bySlug('/videos', slug),
    listNews: (params = {}) => request('GET', '/news', { query: { ...params } }),
    getNews: (slug) => bySlug('/news', slug),
    listEvents: (params = {}) => request('GET', '/events', { query: { ...params } }),
    getTeam: () => request('GET', '/team'),
    getPartners: () => request('GET', '/partners'),
    getStages: () => request('GET', '/stages'),
    getSettings: () => request('GET', '/settings'),
    subscribe: (email) => request('POST', '/subscribe', { body: { email } }),
    confirmSubscription: (token) =>
      isSubscribeToken(token)
        ? request('POST', '/subscribe/confirm', { body: { token } })
        : Promise.reject(new ContentError('bad-request', { detail: 'token' })),
    unsubscribe: (token) =>
      isUnsubscribeToken(token)
        ? request('POST', '/subscribe/unsubscribe', { body: { token } })
        : Promise.reject(new ContentError('bad-request', { detail: 'token' })),
    sendContact: (payload) => request('POST', '/contact', { body: payload }),
  };
}

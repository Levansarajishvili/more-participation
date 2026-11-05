/**
 * საჯარო `ContentAdapter`-ის HTTP გეგმა (B1): ფუნქცია → მოთხოვნა. B6 HTTP adapter-ს
 * (`src/content/http.js`) ამ ცხრილით დაწერს და contract-ტესტი მაშინ რეალურ adapter-ზე გადავა
 * (როგორც ადმინის `createHttpAdminAdapter`). წესები http.js-ისაა: `undefined` / `null` / `''`
 * query-ში არ იგზავნება, მნიშვნელობა — `String(value)`, ენა — `lang` (`getLocale()`).
 */

export const PUBLIC_BASE = '/api/v1';

/**
 * @typedef {{ method: 'GET' | 'POST', url: string, headers: Record<string, string>, body?: string }} PlannedRequest
 */

/**
 * @param {'GET' | 'POST'} method
 * @param {string} path
 * @param {Record<string, unknown>} [query]
 * @param {unknown} [body]
 * @returns {PlannedRequest}
 */
function request(method, path, query = {}, body) {
  const url = new URL(`${PUBLIC_BASE}${path}`, 'http://localhost');
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value));
  }
  /** @type {Record<string, string>} */
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return {
    method,
    url: url.toString(),
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  };
}

const slugPath = (/** @type {string} */ base, /** @type {string} */ slug) =>
  `${base}/${encodeURIComponent(slug)}`;

/** @type {Record<string, (...args: any[]) => PlannedRequest>} */
export const PUBLIC_PLAN = {
  listArticles: (params = {}, lang = 'ka') => request('GET', '/articles', { ...params, lang }),
  getArticle: (slug, lang = 'ka') => request('GET', slugPath('/articles', slug), { lang }),
  listSeries: (params = {}, lang = 'ka') => request('GET', '/series', { ...params, lang }),
  getSeries: (slug, lang = 'ka') => request('GET', slugPath('/series', slug), { lang }),
  listVideos: (params = {}, lang = 'ka') => request('GET', '/videos', { ...params, lang }),
  getVideo: (slug, lang = 'ka') => request('GET', slugPath('/videos', slug), { lang }),
  listNews: (params = {}, lang = 'ka') => request('GET', '/news', { ...params, lang }),
  getNews: (slug, lang = 'ka') => request('GET', slugPath('/news', slug), { lang }),
  listEvents: (params = {}, lang = 'ka') => request('GET', '/events', { ...params, lang }),
  getTeam: (lang = 'ka') => request('GET', '/team', { lang }),
  getPartners: (lang = 'ka') => request('GET', '/partners', { lang }),
  getStages: (lang = 'ka') => request('GET', '/stages', { lang }),
  getSettings: (lang = 'ka') => request('GET', '/settings', { lang }),
  subscribe: (email) => request('POST', '/subscribe', {}, { email }),
  sendContact: (payload) => request('POST', '/contact', {}, payload),
};

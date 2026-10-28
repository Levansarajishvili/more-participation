import { ContentError } from '@/content/errors.js';

/**
 * რეალური API-ს adapter-ი (F8, backend-ის არჩევამდე — კონტრაქტი). ჩაირთვება `VITE_ADMIN_API`-ით.
 *
 * უსაფრთხოება:
 * - სესია httpOnly + Secure + SameSite=Lax cookie-შია: `credentials: 'include'`; token JS-ში და
 *   localStorage / sessionStorage-ში არასოდეს ინახება;
 * - CSRF — double-submit: სერვერი `mc-csrf` cookie-ს (არა httpOnly) აყენებს, ყოველი არა-GET
 *   მოთხოვნა მას `X-CSRF-Token` header-ით აბრუნებს;
 * - 401 → `unauthorized` (UI შესვლის გვერდზე გადადის `?next=`-ით), 403 → `forbidden`,
 *   409 → `conflict` (ვერსია), 422 + `{ fields }` → `validation`, 429 → `rate-limited`.
 *
 * TODO(backend): endpoint-ების სახელები ჩანაცვლებადია; rate limit შესვლაზე / რეგისტრაციაზე;
 * `X-Robots-Tag: noindex, nofollow` ყველა `/admin` პასუხზე; ფაილის ატვირთვის ზღვარი და ტიპები.
 */

/** @typedef {import('./adminAdapter.js').AdminAdapter} AdminAdapter */

export const CSRF_COOKIE = 'mc-csrf';
export const CSRF_HEADER = 'X-CSRF-Token';

/**
 * @param {string} [cookie]
 * @returns {string | null}
 */
export function readCsrfToken(cookie = typeof document === 'undefined' ? '' : document.cookie) {
  const match = cookie.split(/;\s*/).find((part) => part.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null;
}

/**
 * @param {object} options
 * @param {string} options.baseUrl
 * @param {typeof fetch} [options.fetch]
 * @returns {AdminAdapter}
 */
export function createHttpAdminAdapter({
  baseUrl,
  fetch: doFetch = globalThis.fetch.bind(globalThis),
}) {
  const root = baseUrl.replace(/\/$/, '');

  /**
   * @param {string} method
   * @param {string} path
   * @param {{ body?: unknown, query?: Record<string, unknown> }} [options]
   */
  async function request(method, path, { body, query } = {}) {
    const url = new URL(
      `${root}${path}`,
      typeof window === 'undefined' ? 'http://localhost' : window.location.href,
    );
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '')
        url.searchParams.set(key, String(value));
    }
    /** @type {Record<string, string>} */
    const headers = { Accept: 'application/json' };
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') {
      const token = readCsrfToken();
      if (token) headers[CSRF_HEADER] = token;
    }
    const response = await doFetch(url.toString(), {
      method,
      credentials: 'include',
      headers,
      body:
        body === undefined
          ? undefined
          : isForm
            ? /** @type {FormData} */ (body)
            : JSON.stringify(body),
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if ((response.status === 422 || response.status === 400) && data?.fields) {
        throw new ContentError('validation', { fields: data.fields, detail: data.detail });
      }
      throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
    }
    return data;
  }

  const get = (/** @type {string} */ path, /** @type {Record<string, unknown>} */ query) =>
    request('GET', path, { query });
  const post = (/** @type {string} */ path, /** @type {unknown} */ body) =>
    request('POST', path, { body });
  const patch = (/** @type {string} */ path, /** @type {unknown} */ body) =>
    request('PATCH', path, { body });
  const del = (/** @type {string} */ path) => request('DELETE', path);
  const id = (/** @type {string} */ value) => encodeURIComponent(value);

  return {
    source: 'http',
    auth: {
      login: (p) => post('/auth/login', p),
      register: (p) => post('/auth/register', p),
      logout: () => post('/auth/logout'),
      me: () => get('/auth/me'),
      extendSession: () => post('/auth/session'),
    },
    content: {
      list: ({ type, ...query }) => get(`/content/${id(type)}`, query),
      get: (itemId) => get(`/items/${id(itemId)}`),
      create: (type, data) => post(`/content/${id(type)}`, data),
      update: (itemId, data, { version, autosave }) =>
        patch(`/items/${id(itemId)}`, { data, version, autosave }),
      checkSlug: (type, slug, itemId) => get(`/content/${id(type)}/slug`, { slug, id: itemId }),
      remove: (itemId) => del(`/items/${id(itemId)}`),
      publish: (itemId, { version, data }) =>
        post(`/items/${id(itemId)}/publish`, { version, data }),
      schedule: (itemId, at, { version, data }) =>
        post(`/items/${id(itemId)}/schedule`, { at, version, data }),
      versions: (itemId) => get(`/items/${id(itemId)}/versions`),
      restoreVersion: (itemId, version) => post(`/items/${id(itemId)}/versions/${version}/restore`),
      search: (q) => get('/search', { q }),
    },
    media: {
      list: (query = {}) => get('/media', query),
      upload: (file, meta = {}) => {
        const form = new FormData();
        form.append('file', file);
        for (const [key, value] of Object.entries(meta)) form.append(key, String(value));
        return request('POST', '/media', { body: form });
      },
      updateAlt: (mediaId, alt) => patch(`/media/${id(mediaId)}`, { alt }),
      update: (mediaId, changes) => patch(`/media/${id(mediaId)}`, changes),
      remove: (mediaId) => del(`/media/${id(mediaId)}`),
      usage: (mediaId) => get(`/media/${id(mediaId)}/usage`),
    },
    users: {
      list: () => get('/users'),
      invite: (p) => post('/users/invites', p),
      setRole: (userId, role) => patch(`/users/${id(userId)}`, { role }),
      deactivate: (userId) => post(`/users/${id(userId)}/deactivate`),
    },
    settings: {
      get: () => get('/settings'),
      update: (changes) => patch('/settings', changes),
    },
    reports: {
      stats: () => get('/reports/stats'),
      a11yReport: () => get('/reports/a11y'),
    },
  };
}

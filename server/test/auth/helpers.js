import { CSRF_COOKIE, SESSION_COOKIE } from '../../lib/auth.js';
import { hashPassword } from '../../lib/password.js';
import { clock, freshDatabase } from '../db/helpers.js';
import { makeApp } from '../helpers.js';

/**
 * B3-ის ტესტების დამხმარე. საათი რეალური დროიდან იწყება: სესიისა და მოწვევის `expiresAt` მომავალშია,
 * ამიტომ ბაზის TTL monitor ტესტის შუაში არაფერს შლის (წარსულის საათით — წაშლიდა).
 */

/** ≥ 12 სიმბოლო, სიაში არ არის. */
export const PASSWORD = 'ცისფერი ზღვა მთვარე 2026';
export const ADMIN_EMAIL = 'admin@example.org';
export const EDITOR_EMAIL = 'editor@example.org';
export const ADMIN = '/api/admin';

/**
 * @param {string} label
 * @param {{ env?: Record<string, string>, logStream?: import('node:stream').Writable, extend?: (app: any) => void }} [options]
 */
export async function authApp(label, { env, logStream, extend } = {}) {
  const database = await freshDatabase(label);
  const clk = clock(Date.now());
  const app = /** @type {any} */ (
    await makeApp({ db: database.db, env, logStream, extend, now: clk.now })
  );
  return {
    app,
    database,
    clk,
    /** @type {import('../../db/index.js').Repositories} */
    repos: app.repos,
    async close() {
      await app.close();
      await database.drop();
    },
  };
}

/**
 * @param {import('../../db/index.js').Repositories} repos
 * @param {{ email: string, role?: 'admin' | 'editor', password?: string, name?: string }} user
 */
export async function addUser(repos, { email, role = 'editor', password = PASSWORD, name }) {
  return repos.users.insert({
    name: name ?? `[${role}]`,
    email,
    role,
    passwordHash: await hashPassword(password),
  });
}

/**
 * cookie jar-იანი კლიენტი `app.inject`-ზე: ბრაუზერივით ინახავს / აგზავნის cookie-ს, არა-GET-ზე
 * `X-CSRF-Token`-ს `__Host-mc-csrf`-იდან სვამს (როგორც `http.js`).
 * @param {any} app
 * @param {{ ip?: string }} [options]
 */
export function agent(app, { ip = '127.0.0.1' } = {}) {
  /** @type {Map<string, string>} */
  const jar = new Map();

  /**
   * @param {{ method?: string, url: string, payload?: unknown, headers?: Record<string, string>, csrf?: boolean }} options
   */
  async function request({ method = 'GET', url, payload, headers = {}, csrf = true }) {
    /** @type {Record<string, string>} */
    const sent = { ...headers };
    if (jar.size && !('cookie' in sent))
      sent.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (csrf && method !== 'GET' && jar.has(CSRF_COOKIE)) {
      sent['x-csrf-token'] = /** @type {string} */ (jar.get(CSRF_COOKIE));
    }
    const res = await app.inject({ method, url, payload, headers: sent, remoteAddress: ip });
    for (const cookie of res.cookies) {
      const gone =
        cookie.maxAge === 0 || (cookie.expires && new Date(cookie.expires).getTime() <= Date.now());
      if (gone) jar.delete(cookie.name);
      else jar.set(cookie.name, cookie.value);
    }
    return res;
  }

  return {
    jar,
    request,
    get: (/** @type {string} */ url) => request({ url }),
    post: (/** @type {string} */ url, /** @type {unknown} */ payload, options = {}) =>
      request({ method: 'POST', url, payload, ...options }),
    patch: (/** @type {string} */ url, /** @type {unknown} */ payload, options = {}) =>
      request({ method: 'PATCH', url, payload, ...options }),
    login: (/** @type {string} */ email, password = PASSWORD, extra = {}) =>
      request({
        method: 'POST',
        url: `${ADMIN}/auth/login`,
        payload: { email, password, ...extra },
      }),
    session: () => jar.get(SESSION_COOKIE),
    csrf: () => jar.get(CSRF_COOKIE),
  };
}

/** @param {number[]} values */
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

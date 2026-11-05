import fastifyCookie from '@fastify/cookie';

import { CSRF_COOKIE, CSRF_HEADER } from '@/admin/api/http.js';
import { can } from '@/admin/api/permissions.js';
import { ContentError } from '@/content/errors.js';

import { findOperation } from './openapi.js';
import { rateLimited } from './rate-limit.js';
import { TOKEN_PATTERN, hashToken, safeEqual } from './tokens.js';

/**
 * სესია, CSRF, როლი და rate limit — spec-იდან (B3). route ხელით guard-ს არ იწერს: `onRoute`
 * hook ოპერაციის `security`-ს, `x-permission`-სა და `x-rate-limit`-ს კითხულობს და route-ს
 * hook-ებს ადებს. B4–B6-ის route-ები იგივეს ავტომატურად იღებს.
 *
 * - `session` → `onRequest`: `__Host-mc-session` → sha256 → `sessions` (`expiresAt > now`) →
 *   აქტიური მომხმარებელი; არა → 401 და ორივე cookie სუფთავდება.
 * - `csrf` → იმავე hook-ში: `X-CSRF-Token` = `__Host-mc-csrf` (მუდმივი დროით) და
 *   sha256(token) = `sessions.csrfHash` (token სესიაზეა მიბმული — სხვისი ან ძველი წყვილი არ
 *   გადის); არა → 403.
 * - `x-permission` → `permissions.js`-ის `can()` (frontend-ის იგივე ცხრილი); არა → 403.
 * - `x-rate-limit` → `preHandler` (ვალიდაციის შემდეგ): `<operationId>:ip:<IP>`; ზღვარი → 429.
 *
 * guard სხეულის ვალიდაციამდე მუშაობს — სესიის გარეშე მოთხოვნა ველების შეცდომას ვერ ხედავს.
 */

/** სესიის cookie (httpOnly) — JS-ში არასოდეს ჩანს, ამიტომ მხოლოდ სერვერზეა. */
export const SESSION_COOKIE = '__Host-mc-session';
export { CSRF_COOKIE, CSRF_HEADER };

/**
 * `__Host-`: Secure, `Path=/`, Domain-ის გარეშე (host-only) — ბრაუზერი სხვაგვარ cookie-ს არ იღებს და
 * ქვედომენი მას ვერ ჩაანაცვლებს. `SameSite=Lax` — სხვა საიტიდან POST-ს cookie არ ახლავს.
 */
const BASE = Object.freeze({ path: '/', secure: true, sameSite: /** @type {const} */ ('lax') });
export const COOKIE_OPTIONS = Object.freeze({
  session: Object.freeze({ ...BASE, httpOnly: true }),
  csrf: Object.freeze({ ...BASE, httpOnly: false }),
});

/**
 * @param {import('fastify').FastifyReply} reply
 * @param {{ token: string, csrfToken: string, maxAge?: number }} values
 *   `maxAge` (წამი) — „დამიმახსოვრე“: cookie ბრაუზერის დახურვას გადაურჩება (`maxExpiresAt`-მდე)
 */
export function setSessionCookies(reply, { token, csrfToken, maxAge }) {
  const age = maxAge ? { maxAge } : {};
  reply.setCookie(SESSION_COOKIE, token, { ...COOKIE_OPTIONS.session, ...age });
  reply.setCookie(CSRF_COOKIE, csrfToken, { ...COOKIE_OPTIONS.csrf, ...age });
}

/** @param {import('fastify').FastifyReply} reply */
export function clearSessionCookies(reply) {
  reply.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS.session);
  reply.clearCookie(CSRF_COOKIE, COOKIE_OPTIONS.csrf);
}

/**
 * cookie-ს token — მხოლოდ სწორი ფორმის (სხვა მნიშვნელობა ბაზამდე არ მიდის).
 * @param {import('fastify').FastifyRequest} request
 * @returns {string | null}
 */
export function sessionToken(request) {
  const value = request.cookies?.[SESSION_COOKIE];
  return typeof value === 'string' && TOKEN_PATTERN.test(value) ? value : null;
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @returns {import('../db/index.js').Repositories}
 */
export function repositories(app) {
  if (!app.repos) throw new ContentError('server', { detail: 'ბაზა არ არის' });
  return app.repos;
}

/**
 * @typedef {object} Guards
 * @property {boolean} session
 * @property {boolean} csrf
 * @property {import('@/admin/api/permissions.js').Permission | null} permission
 * @property {'auth' | 'forms' | null} rateLimit
 */

/**
 * @param {any} spec
 * @param {string} operationId
 * @returns {Guards}
 */
export function guardsFor(spec, operationId) {
  const { operation } = findOperation(spec, operationId);
  const security = /** @type {object[]} */ (operation.security ?? spec.security ?? []);
  return {
    session: security.some((req) => 'session' in req),
    csrf: security.some((req) => 'csrf' in req),
    permission: operation['x-permission'] ?? null,
    rateLimit: operation['x-rate-limit'] ?? null,
  };
}

/**
 * @typedef {object} RequestAuth
 * @property {import('../db/sessions.js').SessionDoc} session
 * @property {import('../db/users.js').UserDoc} user
 */

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {Guards} guards
 * @returns {import('fastify').onRequestHookHandler}
 */
function authenticate(app, { csrf, permission }) {
  return async function guard(request, reply) {
    const { sessions, users } = repositories(app);
    const token = sessionToken(request);
    const session = token ? await sessions.findActive(token) : null;
    const user = session ? await users.findById(session.userId) : null;
    if (!session || !user || user.status !== 'active') {
      if (request.cookies?.[SESSION_COOKIE] !== undefined) clearSessionCookies(reply);
      throw new ContentError('unauthorized');
    }
    if (csrf) {
      const header = request.headers[CSRF_HEADER.toLowerCase()];
      const cookie = request.cookies?.[CSRF_COOKIE];
      const valid =
        typeof header === 'string' &&
        typeof cookie === 'string' &&
        safeEqual(header, cookie) &&
        safeEqual(hashToken(header), session.csrfHash);
      if (!valid) throw new ContentError('forbidden', { detail: 'csrf' });
    }
    if (permission && !can(user, permission)) {
      throw new ContentError('forbidden', { detail: permission });
    }
    request.auth = { session, user };
  };
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {'auth' | 'forms'} policy
 * @param {string} operationId
 * @returns {import('fastify').preHandlerHookHandler}
 */
function limit(app, policy, operationId) {
  return async function rateLimit(request, reply) {
    const wait = app.rateLimits[policy].consume(`${operationId}:ip:${request.ip}`);
    if (wait) throw rateLimited(reply, wait);
  };
}

/** @param {unknown} value @returns {any[]} */
const list = (value) => (value === undefined ? [] : [value].flat());

/**
 * cookie-ის parser + guard-ები. route-ების რეგისტრაციამდე უნდა გამოიძახო.
 * @param {import('fastify').FastifyInstance} app
 */
export async function registerAuth(app) {
  await app.register(fastifyCookie);
  app.decorateRequest('auth', null);
  app.addHook('onRoute', (routeOptions) => {
    const operationId = /** @type {any} */ (routeOptions.config)?.operationId;
    if (!operationId) return;
    const guards = guardsFor(app.spec, operationId);
    if (guards.session) {
      routeOptions.onRequest = [...list(routeOptions.onRequest), authenticate(app, guards)];
    }
    if (guards.rateLimit) {
      routeOptions.preHandler = [
        ...list(routeOptions.preHandler),
        limit(app, guards.rateLimit, operationId),
      ];
    }
  });
}

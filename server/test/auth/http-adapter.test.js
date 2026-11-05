import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as adminApi from '@/admin/api/adminAdapter.js';
import { CSRF_COOKIE, createHttpAdminAdapter } from '@/admin/api/http.js';
import { ContentError } from '@/content/errors.js';

import { SESSION_COOKIE } from '../../lib/auth.js';
import { loadSpec } from '../../lib/openapi.js';
import { createMatcher } from '../contract/spec-match.js';

import { ADMIN, ADMIN_EMAIL, EDITOR_EMAIL, PASSWORD, addUser, authApp } from './helpers.js';

/**
 * frontend-ის `createHttpAdminAdapter` რეალურ სერვერზე (listen, HTTP): `auth.*` და `users.*` —
 * adminAdapter-ის ფუნქციებით (`normalizeError` → კოდები), პასუხი ↔ spec. ბრაუზერის როლს ასრულებს
 * cookie jar: httpOnly cookie JS-ს (`document.cookie`) არ უჩანს, `Max-Age=0` შლის.
 */

const spec = loadSpec();
const matcher = createMatcher(spec);

/** @type {Awaited<ReturnType<typeof authApp>>} */
let ctx;
/** @type {string} */
let base;

/**
 * @typedef {{ name: string, value: string, httpOnly: boolean }} JarCookie
 */

/** ერთი „ბრაუზერი“: cookie jar + fetch + `document.cookie`. */
function browser() {
  /** @type {Map<string, JarCookie>} */
  const jar = new Map();
  /** @type {string[]} */
  const problems = [];
  let hideCsrf = false;

  /** @type {typeof fetch} */
  const doFetch = async (url, init = {}) => {
    const headers = new Headers(/** @type {HeadersInit} */ (init.headers));
    if (jar.size) {
      headers.set('cookie', [...jar.values()].map((c) => `${c.name}=${c.value}`).join('; '));
    }
    const response = await fetch(url, { ...init, headers });
    for (const line of response.headers.getSetCookie()) {
      const [pair, ...attributes] = line.split(/;\s*/);
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const lower = attributes.map((a) => a.toLowerCase());
      if (
        !lower.includes('secure') ||
        !lower.includes('path=/') ||
        lower.some((a) => a.startsWith('domain='))
      ) {
        problems.push(`${name}: __Host- წესი`);
      }
      if (lower.includes('max-age=0')) jar.delete(name);
      else
        jar.set(name, { name, value: pair.slice(index + 1), httpOnly: lower.includes('httponly') });
    }
    // პასუხი ↔ spec
    const pathname = new URL(String(url)).pathname;
    const hit = matcher.match(String(init.method ?? 'GET'), pathname);
    if (hit) {
      const data = await response
        .clone()
        .json()
        .catch(() => undefined);
      problems.push(...matcher.checkResponse(hit.op, response.status, data));
    }
    return response;
  };

  return {
    jar,
    problems,
    adapter: createHttpAdminAdapter({ baseUrl: `${base}${ADMIN}`, fetch: doFetch }),
    /** `document.cookie` — მხოლოდ httpOnly-ს გარეშე (ბრაუზერის წესი) */
    get cookie() {
      if (hideCsrf) return '';
      return [...jar.values()]
        .filter((c) => !c.httpOnly)
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
    },
    /** @param {boolean} value */
    hideCsrf(value) {
      hideCsrf = value;
    },
  };
}

/** @type {ReturnType<typeof browser> | null} */
let active = null;

/** @param {ReturnType<typeof browser>} b */
function use(b) {
  active = b;
  adminApi.setAdminAdapter(b.adapter);
  return b;
}

/** @param {Promise<unknown>} promise @returns {Promise<ContentError>} */
async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ContentError);
    return /** @type {ContentError} */ (error);
  }
  throw new Error('შეცდომა მოსალოდნელი იყო');
}

beforeAll(async () => {
  ctx = await authApp('auth_http', { env: { RATE_LIMIT_AUTH_MAX: '20' } });
  await addUser(ctx.repos, { email: ADMIN_EMAIL, role: 'admin' });
  await addUser(ctx.repos, { email: EDITOR_EMAIL, role: 'editor' });
  await ctx.app.listen({ host: '127.0.0.1', port: 0 });
  base = `http://127.0.0.1:${ctx.app.server.address().port}`;
  /** @type {any} */ (globalThis).document = {
    get cookie() {
      return active?.cookie ?? '';
    },
    documentElement: { lang: 'ka' },
  };
});

afterAll(async () => {
  adminApi.setAdminAdapter(null);
  delete (/** @type {any} */ (globalThis).document);
  await ctx.close();
});

describe('createHttpAdminAdapter ↔ სერვერი: auth', () => {
  it('login → me → extendSession → logout; httpOnly token JS-ს არ უჩანს', async () => {
    const b = use(browser());
    const session = await adminApi.auth.login({ email: ADMIN_EMAIL, password: PASSWORD });
    expect(session.user).toMatchObject({ email: ADMIN_EMAIL, role: 'admin' });
    expect(b.cookie).toMatch(new RegExp(`^${CSRF_COOKIE}=`));
    expect(b.cookie).not.toContain(SESSION_COOKIE);
    expect(b.jar.get(SESSION_COOKIE)?.httpOnly).toBe(true);

    expect(await adminApi.auth.me()).toEqual(session);
    ctx.clk.advance(60_000);
    const extended = await adminApi.auth.extendSession();
    expect(Date.parse(extended.expiresAt)).toBeGreaterThan(Date.parse(session.expiresAt));

    expect(await adminApi.auth.logout()).toEqual({ ok: true });
    expect(b.jar.size).toBe(0);
    expect((await failure(adminApi.auth.me())).code).toBe('unauthorized');
    expect(b.problems).toEqual([]);
  });

  it('ზოგადი შეცდომა: უცნობი ელფოსტა და არასწორი პაროლი — ერთი კოდი და ტექსტი', async () => {
    use(browser());
    const unknown = await failure(
      adminApi.auth.login({ email: 'nobody@example.org', password: PASSWORD }),
    );
    const wrong = await failure(
      adminApi.auth.login({ email: ADMIN_EMAIL, password: 'არასწორი პაროლი 1234' }),
    );
    expect(unknown.code).toBe('unauthorized');
    expect([wrong.code, wrong.message]).toEqual([unknown.code, unknown.message]);
  });

  it('CSRF header-ის გარეშე (cookie JS-ს არ უჩანს) → forbidden; სესია ცოცხალია', async () => {
    const b = use(browser());
    await adminApi.auth.login({ email: ADMIN_EMAIL, password: PASSWORD });
    b.hideCsrf(true);
    expect((await failure(adminApi.auth.extendSession())).code).toBe('forbidden');
    expect((await failure(adminApi.users.invite({ role: 'editor' }))).code).toBe('forbidden');
    b.hideCsrf(false);
    expect((await adminApi.auth.me()).user.email).toBe(ADMIN_EMAIL);
    await adminApi.auth.logout();
  });

  it('რეგისტრაცია მოწვევით; არასწორი კოდი → validation + fields.invite', async () => {
    use(browser());
    await adminApi.auth.login({ email: ADMIN_EMAIL, password: PASSWORD });
    const invite = await adminApi.users.invite({ role: 'editor', email: 'http@example.org' });
    await adminApi.auth.logout();

    const guest = use(browser());
    const bad = await failure(
      adminApi.auth.register({
        name: 'სტუმარი',
        email: 'http@example.org',
        invite: 'MC-WRONG',
        password: PASSWORD,
      }),
    );
    expect(bad.code).toBe('validation');
    expect(Object.keys(bad.fields ?? {})).toEqual(['invite']);
    const created = await adminApi.auth.register({
      name: 'სტუმარი',
      email: 'http@example.org',
      invite: invite.code,
      password: PASSWORD,
    });
    expect(created.user).toMatchObject({ role: 'editor', email: 'http@example.org' });
    expect((await adminApi.auth.me()).user.id).toBe(created.user.id);
    expect(guest.problems).toEqual([]);
    await adminApi.auth.logout();
  });
});

describe('createHttpAdminAdapter ↔ სერვერი: users', () => {
  it('ადმინისტრატორი: list, invite, setRole, deactivate; რედაქტორი — forbidden', async () => {
    const editorBrowser = use(browser());
    await adminApi.auth.login({ email: EDITOR_EMAIL, password: PASSWORD });
    expect((await failure(adminApi.users.list())).code).toBe('forbidden');

    const adminBrowser = use(browser());
    await adminApi.auth.login({ email: ADMIN_EMAIL, password: PASSWORD });
    const users = await adminApi.users.list();
    const editor = /** @type {any} */ (users.find((u) => u.email === EDITOR_EMAIL));
    const me = /** @type {any} */ (users.find((u) => u.email === ADMIN_EMAIL));

    const invite = await adminApi.users.invite({ role: 'admin' });
    expect(invite).toMatchObject({ role: 'admin', link: expect.stringContaining(invite.code) });

    expect((await adminApi.users.setRole(editor.id, 'admin')).role).toBe('admin');
    expect((await adminApi.users.setRole(editor.id, 'editor')).role).toBe('editor');
    expect((await failure(adminApi.users.setRole(me.id, 'editor'))).code).toBe('bad-request');
    expect((await failure(adminApi.users.deactivate(me.id))).code).toBe('bad-request');
    expect((await failure(adminApi.users.setRole('u-missing', 'editor'))).code).toBe('not-found');

    expect((await adminApi.users.deactivate(editor.id)).status).toBe('deactivated');
    use(editorBrowser);
    expect((await failure(adminApi.auth.me())).code).toBe('unauthorized');
    expect(editorBrowser.jar.size).toBe(0);
    expect(
      (await failure(adminApi.auth.login({ email: EDITOR_EMAIL, password: PASSWORD }))).code,
    ).toBe('unauthorized');

    use(adminBrowser);
    await adminApi.auth.logout();
    expect([...adminBrowser.problems, ...editorBrowser.problems]).toEqual([]);
  });
});

describe('createHttpAdminAdapter ↔ სერვერი: rate limit', () => {
  it('[N] მცდელობის შემდეგ → rate-limited (Retry-After); ფანჯრის შემდეგ — ისევ', async () => {
    use(browser());
    /** @type {string[]} */
    const codes = [];
    while (codes.at(-1) !== 'rate-limited' && codes.length < 25) {
      const error = await failure(
        adminApi.auth.login({ email: `rl${codes.length}@example.org`, password: PASSWORD }),
      );
      codes.push(error.code);
    }
    expect(codes.at(-1)).toBe('rate-limited');
    expect(new Set(codes.slice(0, -1))).toEqual(new Set(['unauthorized']));
    ctx.clk.advance(15 * 60_000);
    expect((await adminApi.auth.login({ email: ADMIN_EMAIL, password: PASSWORD })).user.role).toBe(
      'admin',
    );
  });
});

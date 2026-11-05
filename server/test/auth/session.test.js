import argon2 from 'argon2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { COLLECTION } from '../../db/collections.js';
import { createSessionsRepository } from '../../db/sessions.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../../lib/auth.js';
import { ARGON2_OPTIONS } from '../../lib/password.js';
import { loadSpec } from '../../lib/openapi.js';
import { TOKEN_PATTERN, hashToken } from '../../lib/tokens.js';
import { createMatcher } from '../contract/spec-match.js';
import { DAY, MINUTE } from '../db/helpers.js';

import {
  ADMIN,
  ADMIN_EMAIL,
  EDITOR_EMAIL,
  PASSWORD,
  addUser,
  agent,
  authApp,
  median,
} from './helpers.js';

/**
 * B3: შესვლა, სესია (TTL, გაგრძელება, გასვლა), CSRF, Fetch Metadata, header-ები.
 */

const spec = loadSpec();
const matcher = createMatcher(spec);
const HOUR = 60 * MINUTE;

/** @param {string} operationId @param {any} res */
function conforms(operationId, res) {
  const op = matcher.operations.find((o) => o.operationId === operationId);
  return matcher.checkResponse(op, res.statusCode, res.json());
}

/** @type {Awaited<ReturnType<typeof authApp>>} */
let ctx;

beforeAll(async () => {
  ctx = await authApp('auth_session');
  await addUser(ctx.repos, { email: ADMIN_EMAIL, role: 'admin' });
  await addUser(ctx.repos, { email: EDITOR_EMAIL, role: 'editor' });
});
afterAll(() => ctx.close());

/** @param {string} userId */
const sessionsOf = (userId) =>
  ctx.database.db.collection(COLLECTION.sessions).find({ userId }).toArray();

describe('შესვლა', () => {
  it('წარმატება: Session (spec), `__Host-` cookie-ები, ბაზაში მხოლოდ hash', async () => {
    const a = agent(ctx.app);
    const res = await a.login(ADMIN_EMAIL);
    expect(res.statusCode).toBe(200);
    expect(conforms('login', res)).toEqual([]);
    const body = res.json();
    expect(body.user).toMatchObject({ email: ADMIN_EMAIL, role: 'admin', status: 'active' });
    expect(Object.keys(body.user).sort()).toEqual(['email', 'id', 'name', 'role', 'status']);
    expect(Date.parse(body.expiresAt)).toBe(ctx.clk.now() + 30 * MINUTE);

    const raw = /** @type {string[]} */ (res.headers['set-cookie']);
    const session = raw.find((line) => line.startsWith(`${SESSION_COOKIE}=`));
    const csrf = raw.find((line) => line.startsWith(`${CSRF_COOKIE}=`));
    expect(session).toMatch(/; Path=\/; HttpOnly; Secure; SameSite=Lax$/);
    expect(csrf).toMatch(/; Path=\/; Secure; SameSite=Lax$/);
    for (const line of raw) {
      expect(line).not.toMatch(/Domain=|Max-Age|Expires/i);
    }
    const token = /** @type {string} */ (a.session());
    const csrfToken = /** @type {string} */ (a.csrf());
    expect(token).toMatch(TOKEN_PATTERN);
    expect(csrfToken).toMatch(TOKEN_PATTERN);
    expect(csrfToken).not.toBe(token);

    const [doc] = await sessionsOf(body.user.id);
    expect(doc._id).toBe(hashToken(token));
    expect(doc.csrfHash).toBe(hashToken(csrfToken));
    const stored = JSON.stringify(doc);
    expect(stored).not.toContain(token);
    expect(stored).not.toContain(csrfToken);
    expect(doc.maxExpiresAt.getTime() - doc.createdAt.getTime()).toBe(12 * HOUR);
    await a.post(`${ADMIN}/auth/logout`);
  });

  it('„დამიმახსოვრე“ → Max-Age სესიის მაქსიმუმამდე (12 სთ)', async () => {
    const a = agent(ctx.app);
    const res = await a.login(EDITOR_EMAIL, PASSWORD, { remember: true });
    expect(res.statusCode).toBe(200);
    for (const cookie of res.cookies) expect(cookie.maxAge).toBe(12 * 3600);
    await a.post(`${ADMIN}/auth/logout`);
  });

  it('ელფოსტა ჰარისა და რეგისტრის გარეშე; პაროლი — ზუსტად', async () => {
    expect((await agent(ctx.app).login('  Admin@Example.ORG ')).statusCode).toBe(200);
    expect((await agent(ctx.app).login(ADMIN_EMAIL, ` ${PASSWORD}`)).statusCode).toBe(401);
  });

  it('უცნობი ელფოსტა, არასწორი პაროლი, დეაქტივირებული — ერთი პასუხი და მსგავსი დრო', async () => {
    const off = await addUser(ctx.repos, { email: 'off@example.org' });
    await ctx.repos.users.deactivate(off._id);
    const attempt = async (/** @type {string} */ email, password = 'არასწორი პაროლი 1234') => {
      const started = process.hrtime.bigint();
      const res = await agent(ctx.app, { ip: `10.0.0.${Math.floor(Math.random() * 250)}` }).login(
        email,
        password,
      );
      return { res, ms: Number(process.hrtime.bigint() - started) / 1e6 };
    };
    const unknown = await attempt('nobody@example.org');
    const wrong = await attempt(ADMIN_EMAIL);
    const deactivated = await attempt('off@example.org', PASSWORD);
    for (const { res } of [unknown, wrong, deactivated]) {
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual(unknown.res.json());
      expect(res.json().code).toBe('unauthorized');
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(conforms('login', res)).toEqual([]);
    }

    // დრო: argon2id ორივე გზაზე — მედიანების ფარდობა 0.5–2 (sandbox-ში ≈ 1)
    /** @type {number[]} */ const unknownMs = [];
    /** @type {number[]} */ const wrongMs = [];
    for (let i = 0; i < 7; i += 1) {
      unknownMs.push((await attempt(`nobody${i}@example.org`)).ms);
      wrongMs.push((await attempt(EDITOR_EMAIL)).ms);
    }
    const ratio = median(unknownMs) / median(wrongMs);
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2);
    expect(median(unknownMs)).toBeGreaterThan(5); // hash მართლაც ითვლება
  });

  it('ველები: 422 `validateLogin`-ის კოდებით (sessions არ იქმნება)', async () => {
    const res = await agent(ctx.app).login('', '');
    expect(res.statusCode).toBe(422);
    expect(res.json().fields).toEqual({
      email: { code: 'required', message: expect.any(String) },
      password: { code: 'required', message: expect.any(String) },
    });
    expect((await agent(ctx.app).login('not-an-email')).json().fields.email.code).toBe('email');
    const unknownField = await agent(ctx.app).post(`${ADMIN}/auth/login`, {
      email: ADMIN_EMAIL,
      password: PASSWORD,
      role: 'admin',
    });
    expect(unknownField.statusCode).toBe(400);
  });

  it('შესვლა ძველ სესიას შლის (session fixation, ASVS 7.2.4)', async () => {
    const a = agent(ctx.app);
    const first = await a.login(EDITOR_EMAIL);
    const oldToken = a.session();
    const userId = first.json().user.id;
    const before = (await sessionsOf(userId)).length;
    await a.login(EDITOR_EMAIL);
    expect(a.session()).not.toBe(oldToken);
    const after = await sessionsOf(userId);
    expect(after.length).toBe(before);
    expect(after.some((s) => s._id === hashToken(/** @type {string} */ (oldToken)))).toBe(false);
    const stale = await a.request({
      url: `${ADMIN}/auth/me`,
      headers: { cookie: `${SESSION_COOKIE}=${oldToken}` },
    });
    expect(stale.statusCode).toBe(401);
  });

  it('ძველი პარამეტრების hash შესვლისას ახლდება', async () => {
    const user = await ctx.repos.users.insert({
      name: '[ძველი]',
      email: 'legacy@example.org',
      role: 'editor',
      passwordHash: await argon2.hash(PASSWORD, {
        ...ARGON2_OPTIONS,
        memoryCost: 9216,
        timeCost: 4,
      }),
    });
    expect((await agent(ctx.app).login('legacy@example.org')).statusCode).toBe(200);
    const fresh = await ctx.repos.users.findById(user._id);
    expect(fresh?.passwordHash).toMatch(/m=19456/);
    expect(fresh?.lastLoginAt).toBeInstanceOf(Date);
  });
});

describe('სესია: me, გაგრძელება, ვადა, გასვლა', () => {
  it('me: cookie-ის გარეშე → 401; ცრუ cookie → 401 და cookie-ები სუფთავდება', async () => {
    const none = await agent(ctx.app).get(`${ADMIN}/auth/me`);
    expect(none.statusCode).toBe(401);
    expect(none.headers['set-cookie']).toBeUndefined();
    const fake = await agent(ctx.app).request({
      url: `${ADMIN}/auth/me`,
      headers: { cookie: `${SESSION_COOKIE}=${'x'.repeat(43)}; ${CSRF_COOKIE}=y` },
    });
    expect(fake.statusCode).toBe(401);
    expect(fake.json().code).toBe('unauthorized');
    const cleared = /** @type {string[]} */ (fake.headers['set-cookie']);
    expect(cleared).toHaveLength(2);
    for (const line of cleared) expect(line).toMatch(/Max-Age=0; Path=\/; .*Secure/);
  });

  it('გაგრძელება: უმოქმედობის ვადა თავიდან, მაქსიმუმამდე; ამოწურული → 401', async () => {
    const a = agent(ctx.app);
    const start = ctx.clk.now();
    await a.login(EDITOR_EMAIL);
    ctx.clk.advance(20 * MINUTE);
    const me = await a.get(`${ADMIN}/auth/me`);
    expect(Date.parse(me.json().expiresAt)).toBe(start + 30 * MINUTE); // me ვადას არ ცვლის
    const extended = await a.post(`${ADMIN}/auth/session`);
    expect(extended.statusCode).toBe(200);
    expect(conforms('extendSession', extended)).toEqual([]);
    expect(Date.parse(extended.json().expiresAt)).toBe(ctx.clk.now() + 30 * MINUTE);

    // 12 სთ-მდე ყოველ 25 წუთში გაგრძელება → ბოლოს maxExpiresAt-ზე ჩერდება
    let last = extended.json().expiresAt;
    while (ctx.clk.now() + 25 * MINUTE < start + 12 * HOUR) {
      ctx.clk.advance(25 * MINUTE);
      const res = await a.post(`${ADMIN}/auth/session`);
      expect(res.statusCode).toBe(200);
      last = res.json().expiresAt;
    }
    expect(Date.parse(last)).toBe(start + 12 * HOUR);
    ctx.clk.advance(start + 12 * HOUR - ctx.clk.now());
    const over = await a.post(`${ADMIN}/auth/session`);
    expect(over.statusCode).toBe(401);
    expect(a.session()).toBeUndefined();
  });

  it('ვადაგასული სესია → 401, თუნდაც ბაზაში ჯერ იყოს (TTL monitor 60 წმ-ში ერთხელ შლის)', async () => {
    const a = agent(ctx.app);
    const login = await a.login(EDITOR_EMAIL);
    ctx.clk.advance(30 * MINUTE + 1);
    const res = await a.get(`${ADMIN}/auth/me`);
    expect(res.statusCode).toBe(401);
    expect(a.session()).toBeUndefined();

    // რეალური დროით უკვე ამოწურული ჩანაწერი (TTL ინდექსის ველი წარსულშია, დოკუმენტი ჯერ არსებობს)
    const past = createSessionsRepository(
      { db: ctx.database.db },
      { now: () => Date.now() - 2 * HOUR },
    );
    const { token, session } = await past.create(login.json().user.id);
    expect(session.expiresAt.getTime()).toBeLessThan(Date.now());
    const pastAgent = agent(ctx.app);
    const pastClock = ctx.clk.now();
    ctx.clk.advance(Date.now() - pastClock); // სერვერის საათი = რეალური დრო
    const stale = await pastAgent.request({
      url: `${ADMIN}/auth/me`,
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    });
    expect(stale.statusCode).toBe(401);
    const indexes = await ctx.database.db.collection(COLLECTION.sessions).indexes();
    expect(indexes.find((i) => i.name === 'expiresAt_ttl')?.expireAfterSeconds).toBe(0);
  });

  it('გასვლა: სესია ბაზიდან იშლება, cookie-ები სუფთავდება, me → 401', async () => {
    const a = agent(ctx.app);
    await a.login(ADMIN_EMAIL);
    const hash = hashToken(/** @type {string} */ (a.session()));
    const res = await a.post(`${ADMIN}/auth/logout`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(conforms('logout', res)).toEqual([]);
    expect(await ctx.database.db.collection(COLLECTION.sessions).findOne({ _id: hash })).toBeNull();
    expect(a.jar.size).toBe(0);
    const again = await a.request({
      url: `${ADMIN}/auth/me`,
      headers: { cookie: `${SESSION_COOKIE}=${hash}` },
    });
    expect(again.statusCode).toBe(401);
  });
});

describe('CSRF (double-submit, სესიაზე მიბმული)', () => {
  it('header-ის გარეშე / სხვა მნიშვნელობით / სხვა სესიის წყვილით → 403; სწორით → 200', async () => {
    const a = agent(ctx.app);
    const b = agent(ctx.app);
    await a.login(ADMIN_EMAIL);
    await b.login(EDITOR_EMAIL);

    const missing = await a.post(`${ADMIN}/auth/session`, undefined, { csrf: false });
    expect(missing.statusCode).toBe(403);
    expect(missing.json().code).toBe('forbidden');

    const mismatch = await a.request({
      method: 'POST',
      url: `${ADMIN}/auth/session`,
      csrf: false,
      headers: { 'x-csrf-token': 'x'.repeat(43) },
    });
    expect(mismatch.statusCode).toBe(403);

    // b-ს CSRF წყვილი (cookie = header) a-ს სესიით — token სხვა სესიისაა
    const foreign = await a.request({
      method: 'POST',
      url: `${ADMIN}/auth/session`,
      csrf: false,
      headers: {
        cookie: `${SESSION_COOKIE}=${a.session()}; ${CSRF_COOKIE}=${b.csrf()}`,
        'x-csrf-token': /** @type {string} */ (b.csrf()),
      },
    });
    expect(foreign.statusCode).toBe(403);

    // GET-ს CSRF არ სჭირდება
    expect((await a.get(`${ADMIN}/auth/me`)).statusCode).toBe(200);
    expect((await a.post(`${ADMIN}/auth/session`)).statusCode).toBe(200);
    // სესიის გარეშე — ჯერ 401 (CSRF-ზე ადრე)
    expect((await agent(ctx.app).post(`${ADMIN}/auth/logout`)).statusCode).toBe(401);
  });

  it('Fetch Metadata: cross-site / same-site POST → 403; same-origin / none / header-ის გარეშე — გადის', async () => {
    for (const site of ['cross-site', 'same-site']) {
      const res = await agent(ctx.app).post(
        `${ADMIN}/auth/login`,
        { email: ADMIN_EMAIL, password: PASSWORD },
        { headers: { 'sec-fetch-site': site } },
      );
      expect(res.statusCode, site).toBe(403);
      expect(res.headers['set-cookie']).toBeUndefined();
    }
    for (const site of ['same-origin', 'none']) {
      const res = await agent(ctx.app).post(
        `${ADMIN}/auth/login`,
        { email: ADMIN_EMAIL, password: PASSWORD },
        { headers: { 'sec-fetch-site': site } },
      );
      expect(res.statusCode, site).toBe(200);
    }
    // GET-ზე Fetch Metadata არ მოწმდება (ბმული სხვა საიტიდან)
    const get = await agent(ctx.app).request({
      url: `${ADMIN}/auth/me`,
      headers: { 'sec-fetch-site': 'cross-site' },
    });
    expect(get.statusCode).toBe(401);
  });

  it('JSON-ის გარდა სხეული არ მიიღება (preflight-ის გარეშე „მარტივი მოთხოვნა“ არ გადის)', async () => {
    for (const type of [
      'text/plain',
      'application/x-www-form-urlencoded',
      'multipart/form-data; boundary=x',
    ]) {
      const res = await ctx.app.inject({
        method: 'POST',
        url: `${ADMIN}/auth/login`,
        headers: { 'content-type': type },
        payload: `email=${ADMIN_EMAIL}&password=${PASSWORD}`,
      });
      expect(res.statusCode, type).toBe(400);
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });
});

describe('header-ები და CORS (ერთი origin)', () => {
  it('ავტორიზაციის პასუხი: no-store, noindex, JSON + charset, HSTS 1 წელი, CORS — არა', async () => {
    const a = agent(ctx.app);
    const responses = [
      await a.login(ADMIN_EMAIL, PASSWORD),
      await a.get(`${ADMIN}/auth/me`),
      await agent(ctx.app).login(ADMIN_EMAIL, 'არასწორი პაროლი 1234'),
      await ctx.app.inject({
        method: 'GET',
        url: `${ADMIN}/users`,
        headers: { origin: 'https://evil.example' },
      }),
    ];
    for (const res of responses) {
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(res.headers['strict-transport-security']).toBe('max-age=31536000');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(Object.keys(res.headers).filter((h) => h.startsWith('access-control-'))).toEqual([]);
    }
    const preflight = await ctx.app.inject({
      method: 'OPTIONS',
      url: `${ADMIN}/auth/login`,
      headers: {
        origin: 'https://evil.example',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, x-csrf-token',
      },
    });
    expect(preflight.statusCode).toBe(404);
    expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('ვადის დანარჩენი წესები', () => {
  it('სესიის ვადა config-იდან (SESSION_IDLE_MINUTES / SESSION_MAX_HOURS)', async () => {
    const other = await authApp('auth_session_cfg', {
      env: { SESSION_IDLE_MINUTES: '10', SESSION_MAX_HOURS: '1' },
    });
    try {
      await addUser(other.repos, { email: ADMIN_EMAIL, role: 'admin' });
      const res = await agent(other.app).login(ADMIN_EMAIL, PASSWORD, { remember: true });
      expect(Date.parse(res.json().expiresAt)).toBe(other.clk.now() + 10 * MINUTE);
      expect(res.cookies[0].maxAge).toBe(3600);
    } finally {
      await other.close();
    }
    expect(DAY).toBe(86_400_000);
  });
});

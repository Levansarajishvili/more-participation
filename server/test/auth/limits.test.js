import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { route } from '../../lib/openapi.js';
import { hashToken } from '../../lib/tokens.js';
import { FAKE_R2_ENV, captureLogs } from '../helpers.js';
import { MINUTE } from '../db/helpers.js';

import { ADMIN, ADMIN_EMAIL, EDITOR_EMAIL, PASSWORD, addUser, agent, authApp } from './helpers.js';

/**
 * B3: rate limit (429 + Retry-After, CAPTCHA-ს გარეშე) და ლოგი (პაროლი, token, სესიის id, ელფოსტა,
 * IP — არასოდეს).
 */

const WRONG = 'არასწორი პაროლი 1234';
const VALID_CONTACT = {
  name: 'სახელი',
  contact: '+995 555 12 34 56',
  topic: 'barrier',
  message: 'ტექსტი',
  support: '',
  replyVia: 'call',
  consent: true,
  website: '',
};

describe('rate limit', () => {
  /** @type {Awaited<ReturnType<typeof authApp>>} */
  let ctx;
  beforeAll(async () => {
    ctx = await authApp('auth_limits', {
      env: {
        RATE_LIMIT_AUTH_MAX: '3',
        RATE_LIMIT_AUTH_WINDOW_SECONDS: '600',
        RATE_LIMIT_FORMS_MAX: '2',
        RATE_LIMIT_FORMS_WINDOW_SECONDS: '60',
      },
      // B6-ის საჯარო ფორმა: guard spec-იდან (`x-rate-limit: forms`) route-ს ავტომატურად ედება
      extend: (app) => route(app, app.spec, 'sendContact', async () => ({ ok: true, id: 'test' })),
    });
    await addUser(ctx.repos, { email: ADMIN_EMAIL, role: 'admin' });
    await addUser(ctx.repos, { email: EDITOR_EMAIL });
  });
  afterAll(() => ctx.close());

  it('შესვლა, IP: [N] მცდელობის შემდეგ 429 + Retry-After; ფანჯრის შემდეგ — ისევ', async () => {
    const a = agent(ctx.app, { ip: '192.0.2.10' });
    const emails = ['x1@example.org', 'x2@example.org', 'x3@example.org'];
    for (const email of emails) expect((await a.login(email, WRONG)).statusCode).toBe(401);
    const blocked = await a.login(ADMIN_EMAIL, PASSWORD); // სწორი პაროლიც — IP ბლოკშია
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().code).toBe('rate-limited');
    expect(Number(blocked.headers['retry-after'])).toBe(600);
    ctx.clk.advance(5 * MINUTE);
    expect(Number((await a.login(ADMIN_EMAIL)).headers['retry-after'])).toBe(300);
    ctx.clk.advance(5 * MINUTE);
    expect((await a.login(ADMIN_EMAIL)).statusCode).toBe(200);
  });

  it('შესვლა, ანგარიში: წარუმატებელი მცდელობები სხვადასხვა IP-დან → ამ ელფოსტაზე 429; სხვა ელფოსტა — არა', async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await agent(ctx.app, { ip: `198.51.100.${i}` }).login(EDITOR_EMAIL, WRONG);
      expect(res.statusCode).toBe(401);
    }
    const fresh = agent(ctx.app, { ip: '198.51.100.200' });
    const blocked = await fresh.login(' Editor@Example.org ', PASSWORD);
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    // უცნობი და არსებული ელფოსტა ერთნაირად იბლოკება (ანგარიში არ მჟღავნდება)
    for (let i = 0; i < 3; i += 1) {
      await agent(ctx.app, { ip: `203.0.113.${i}` }).login('ghost@example.org', WRONG);
    }
    expect(
      (await agent(ctx.app, { ip: '203.0.113.200' }).login('ghost@example.org', WRONG)).statusCode,
    ).toBe(429);
    expect((await agent(ctx.app, { ip: '198.51.100.201' }).login(ADMIN_EMAIL)).statusCode).toBe(
      200,
    );
    // წარმატებული შესვლა ანგარიშის მრიცხველს არ ზრდის (ბოროტი დაბლოკვა — მხოლოდ წარუმატებლით)
    for (let i = 0; i < 5; i += 1) {
      const res = await agent(ctx.app, { ip: `192.0.2.${100 + i}` }).login(ADMIN_EMAIL);
      expect(res.statusCode).toBe(200);
    }
    ctx.clk.advance(10 * MINUTE);
    expect((await agent(ctx.app, { ip: '198.51.100.202' }).login(EDITOR_EMAIL)).statusCode).toBe(
      200,
    );
  });

  it('რეგისტრაცია და საჯარო ფორმა: IP-ით 429', async () => {
    const a = agent(ctx.app, { ip: '192.0.2.50' });
    const body = { name: 'სახელი', email: 'r@example.org', invite: 'MC-X', password: PASSWORD };
    for (let i = 0; i < 3; i += 1) {
      expect((await a.post(`${ADMIN}/auth/register`, body)).statusCode).toBe(422);
    }
    const reg = await a.post(`${ADMIN}/auth/register`, body);
    expect(reg.statusCode).toBe(429);
    expect(reg.headers['retry-after']).toBeDefined();

    const form = agent(ctx.app, { ip: '192.0.2.60' });
    expect((await form.post('/api/v1/contact', VALID_CONTACT)).statusCode).toBe(200);
    expect((await form.post('/api/v1/contact', VALID_CONTACT)).statusCode).toBe(200);
    const contact = await form.post('/api/v1/contact', VALID_CONTACT);
    expect(contact.statusCode).toBe(429);
    expect(Number(contact.headers['retry-after'])).toBe(60);
    expect(
      (await agent(ctx.app, { ip: '192.0.2.61' }).post('/api/v1/contact', VALID_CONTACT))
        .statusCode,
    ).toBe(200);
  });
});

describe('ლოგი: პაროლი, token, სესიის id, კოდი, ელფოსტა, IP — არასოდეს', () => {
  it('სრული ნაკადი production-ის ლოგით (info)', async () => {
    const logs = captureLogs();
    const ctx = await authApp('auth_logs', {
      logStream: logs.stream,
      env: {
        NODE_ENV: 'production',
        ...FAKE_R2_ENV,
        MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
        LOG_LEVEL: 'info',
        TRUST_PROXY: '1',
      },
    });
    try {
      await addUser(ctx.repos, { email: ADMIN_EMAIL, role: 'admin', name: 'ლევანი ადმინი' });
      const ip = '203.0.113.77';
      const admin = agent(ctx.app, { ip });
      await admin.login(ADMIN_EMAIL, PASSWORD, { remember: true });
      await admin.login(ADMIN_EMAIL, WRONG);
      await agent(ctx.app, { ip }).login('stranger@example.org', WRONG);
      await admin.login(ADMIN_EMAIL);
      const invite = (
        await admin.post(`${ADMIN}/users/invites`, { role: 'editor', email: 'guest@example.org' })
      ).json();
      const guest = agent(ctx.app, { ip });
      await guest.request({
        method: 'POST',
        url: `${ADMIN}/auth/register`,
        payload: {
          name: 'სტუმარი გვარი',
          email: 'guest@example.org',
          invite: invite.code,
          password: PASSWORD,
        },
        headers: { 'x-forwarded-for': '198.51.100.9' },
      });
      await guest.get(`${ADMIN}/auth/me`);
      await guest.post(`${ADMIN}/auth/session`);
      await guest.post(`${ADMIN}/auth/session`, undefined, { csrf: false });
      const secrets = [
        PASSWORD,
        WRONG,
        ADMIN_EMAIL,
        'stranger@example.org',
        'guest@example.org',
        'ლევანი',
        'სტუმარი',
        invite.code,
        hashToken(invite.code),
        /** @type {string} */ (admin.session()),
        /** @type {string} */ (admin.csrf()),
        hashToken(/** @type {string} */ (admin.session())),
        /** @type {string} */ (guest.session()),
        /** @type {string} */ (guest.csrf()),
        hashToken(/** @type {string} */ (guest.session())),
        ip,
        '198.51.100.9',
        '$argon2id',
      ];
      await guest.post(`${ADMIN}/auth/logout`);
      await ctx.close();

      const text = logs.text();
      for (const secret of secrets) expect(text, secret.slice(0, 12)).not.toContain(secret);
      const events = logs
        .lines()
        .filter((line) => line.msg === 'auth')
        .map((line) => line.event);
      expect(events).toEqual([
        'auth.login',
        'auth.login.failed',
        'auth.login.failed',
        'auth.login',
        'users.invite',
        'auth.register',
        'auth.logout',
      ]);
      for (const line of logs.lines()) {
        expect(Object.keys(line)).not.toEqual(expect.arrayContaining(['userId']));
      }
    } finally {
      await ctx.close().catch(() => {});
    }
  });
});

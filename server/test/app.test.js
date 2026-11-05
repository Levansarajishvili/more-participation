import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { ContentError } from '@/content/errors.js';
import { CONTACT_FIELDS, NAME_MAX } from '@/content/forms.js';

import { connectDb } from '../lib/db.js';
import { route } from '../lib/openapi.js';

import { captureLogs, makeApp } from './helpers.js';

const VALID_CONTACT = {
  name: 'ტესტი',
  contact: 'person@example.ge',
  topic: 'general',
  message: '',
  support: '',
  replyVia: 'email',
  consent: true,
  website: '',
};

/**
 * ტესტის route-ები: შეცდომის handler-ი და spec-ის სქემით ვალიდაცია რეალურ სქემაზე
 * (`sendContact` — B6-ის endpoint-ი, აქ მხოლოდ სქემის შესამოწმებლად, handler-ი ცარიელია).
 * @param {import('fastify').FastifyInstance} app
 */
function testRoutes(app) {
  route(app, app.spec, 'sendContact', async () => ({ ok: true, id: 'test' }));
  app.get('/api/test/throw/:code', async (request) => {
    throw new ContentError(/** @type {any} */ (request.params).code);
  });
  app.get('/api/test/crash', async () => {
    throw new Error('E11000 duplicate key — dup key: { email: "leak@example.ge" }');
  });
}

describe('health', () => {
  /** @type {import('../lib/db.js').Database} */
  let database;
  beforeAll(async () => {
    database = await connectDb({ uri: inject('mongoUri'), dbName: 'mc_test_app' });
  });
  afterAll(async () => {
    await database?.close();
  });

  it('ბაზით — 200 { status: ok, db: up }', async () => {
    const app = await makeApp({ db: database.db });
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', db: 'up' });
    await app.close();
  });

  it('ბაზის გარეშე — 503 { status: degraded, db: down }', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'degraded', db: 'down' });
    await app.close();
  });
});

describe('header-ები და CORS', () => {
  /** @type {import('fastify').FastifyInstance} */
  let app;
  beforeAll(async () => {
    app = await makeApp({ extend: testRoutes });
  });
  afterAll(() => app.close());

  it('უსაფრთხოების header-ები ყოველ პასუხზე', async () => {
    for (const url of ['/api/health', '/api/nope']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.headers['content-security-policy']).toBe(
        "default-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'",
      );
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['strict-transport-security']).toBe('max-age=31536000');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(res.headers['x-powered-by']).toBeUndefined();
    }
  });

  it('CORS არ არის: სხვა origin-ზე Access-Control-* არ იგზავნება, preflight → 404', async () => {
    const get = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'https://attacker.example' },
    });
    expect(Object.keys(get.headers).filter((h) => h.startsWith('access-control-'))).toEqual([]);
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/contact',
      headers: {
        origin: 'https://attacker.example',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    expect(preflight.statusCode).toBe(404);
    expect(Object.keys(preflight.headers).filter((h) => h.startsWith('access-control-'))).toEqual(
      [],
    );
  });

  it('text/plain სხეული (CSRF-ის „მარტივი მოთხოვნა“) არ მიიღება → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/contact',
      headers: { 'content-type': 'text/plain' },
      payload: JSON.stringify(VALID_CONTACT),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ code: 'bad-request', message: expect.any(String) });
  });
});

describe('შეცდომის handler', () => {
  /** @type {import('fastify').FastifyInstance} */
  let app;
  beforeAll(async () => {
    app = await makeApp({ extend: testRoutes, env: { BODY_LIMIT: '2048' } });
  });
  afterAll(() => app.close());

  it.each([
    ['bad-request', 400],
    ['unauthorized', 401],
    ['forbidden', 403],
    ['not-found', 404],
    ['conflict', 409],
    ['validation', 422],
    ['rate-limited', 429],
    ['server', 500],
    ['network', 500],
    ['unknown', 500],
  ])('ContentError(%s) → %i, { code, message }', async (code, status) => {
    const res = await app.inject({ method: 'GET', url: `/api/test/throw/${code}` });
    expect(res.statusCode).toBe(status);
    const body = res.json();
    expect(body.code).toBe(status === 500 ? 'server' : code);
    expect(body.message).toBe(new ContentError(body.code).message);
    expect(Object.keys(body).sort()).toEqual(['code', 'message']);
    if (status === 429) expect(res.headers['retry-after']).toBe('60');
  });

  it('მოულოდნელი შეცდომა → 500 server, ტექსტი არ ჟონავს', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/test/crash' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ code: 'server', message: new ContentError('server').message });
    expect(res.body).not.toContain('leak@example.ge');
  });

  it('უცნობი route → 404 not-found', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/health' });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('not-found');
  });

  it('სწორი სხეული spec-ის სქემით გადის', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/contact',
      payload: VALID_CONTACT,
    });
    expect(res.statusCode).toBe(200);
  });

  it('422: სავალდებულო, სიგრძე, ვარიანტი — ველის გზით', async () => {
    const big = await makeApp({ extend: testRoutes });
    const { name: _name, ...withoutName } = VALID_CONTACT;
    const res = await big.inject({
      method: 'POST',
      url: '/api/v1/contact',
      payload: { ...withoutName, topic: 'unknown-topic', contact: 'x'.repeat(121) },
    });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.code).toBe('validation');
    expect(body.fields).toEqual({
      name: { code: 'required', message: 'ეს ველი სავალდებულოა.' },
      contact: { code: 'tooLong', message: 'ტექსტი ძალიან გრძელია — მაქსიმუმ 120 სიმბოლო.' },
      topic: { code: 'option', message: 'აირჩიე ერთ-ერთი ვარიანტი.' },
    });
    // ველის სახელები frontend-ის ფორმისაა
    for (const key of Object.keys(body.fields)) expect(CONTACT_FIELDS).toContain(key);
    const long = await big.inject({
      method: 'POST',
      url: '/api/v1/contact',
      payload: { ...VALID_CONTACT, name: 'x'.repeat(NAME_MAX + 1) },
    });
    expect(long.json().fields.name.code).toBe('tooLong');
    await big.close();
  });

  it('უცნობი ველი, ტიპი, query, JSON, ზომა → 400 bad-request (fields-ის გარეშე)', async () => {
    const cases = [
      { payload: { ...VALID_CONTACT, isAdmin: true } },
      { payload: { ...VALID_CONTACT, consent: 'yes' } },
      { payload: { ...VALID_CONTACT }, url: '/api/v1/contact?debug=1' },
      { payload: '{"name": ', headers: { 'content-type': 'application/json' } },
      { payload: { ...VALID_CONTACT, message: 'x'.repeat(4000) } },
    ];
    for (const { payload, url = '/api/v1/contact', headers } of cases) {
      const res = await app.inject({ method: 'POST', url, payload, headers });
      expect(res.statusCode, JSON.stringify(payload).slice(0, 60)).toBe(400);
      expect(res.json()).toEqual({ code: 'bad-request', message: expect.any(String) });
    }
  });
});

describe('ლოგი — პერსონალური მონაცემის გარეშე', () => {
  it('IP, ელფოსტა, სახელი, cookie, query და შეცდომის ტექსტი ლოგში არ ხვდება', async () => {
    const logs = captureLogs();
    const app = await makeApp({
      extend: testRoutes,
      logStream: logs.stream,
      env: { NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:1/x', LOG_LEVEL: 'info' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/contact?ref=person%40example.ge',
      remoteAddress: '203.0.113.77',
      headers: { cookie: '__Host-mc-session=secret-token', 'x-forwarded-for': '198.51.100.9' },
      payload: { ...VALID_CONTACT, name: 'ნინო ბერიძე' },
    });
    await app.inject({ method: 'POST', url: '/api/v1/contact', payload: VALID_CONTACT });
    await app.inject({ method: 'GET', url: '/api/test/crash' });
    await app.close();

    const text = logs.text();
    for (const secret of [
      'person@example.ge',
      'person%40example.ge',
      'ნინო',
      'secret-token',
      '203.0.113.77',
      '198.51.100.9',
      'leak@example.ge',
      'E11000',
    ]) {
      expect(text).not.toContain(secret);
    }
    const requests = logs.lines().filter((line) => line.msg === 'request');
    expect(requests.length).toBe(3);
    expect(requests[0]).toMatchObject({
      method: 'POST',
      route: '/api/v1/contact',
      statusCode: 400,
      service: 'mc-api',
    });
    expect(Object.keys(requests[0]).sort()).toEqual(
      ['level', 'time', 'service', 'reqId', 'method', 'route', 'statusCode', 'ms', 'msg'].sort(),
    );
    const failure = logs.lines().find((line) => line.msg === 'request failed');
    expect(failure?.err).toMatchObject({ type: 'Error', stack: expect.any(Array) });
    expect(failure?.err.detail).toBeUndefined();
  });

  it('development-ში შეცდომის ტექსტი `detail`-შია (ლოკალური დებაგი)', async () => {
    const logs = captureLogs();
    const app = await makeApp({
      extend: testRoutes,
      logStream: logs.stream,
      env: { NODE_ENV: 'development', LOG_LEVEL: 'error' },
    });
    await app.inject({ method: 'GET', url: '/api/test/crash' });
    await app.close();
    expect(logs.lines()[0].err.detail).toMatch(/E11000/);
  });
});

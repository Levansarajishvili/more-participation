import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SUBSCRIBE_CONFIRM_DAYS } from '@/content/forms.js';
import en from '@/i18n/en.js';

import { COLLECTION } from '../../db/collections.js';
import { unsubscribeToken, verifyUnsubscribeToken } from '../../lib/subscriptions.js';
import { hashToken } from '../../lib/tokens.js';
import { captureLogs, makeApp } from '../helpers.js';
import { clock, freshDatabase } from '../db/helpers.js';

/**
 * B6, ნაწილი ბ — სერვერის მხარე, რასაც mock-ის parity ვერ ხედავს: წერილის შიგთავსი და header-ები,
 * ბაზის ჩანაწერი (token-ის მხოლოდ hash, TTL, დიაგნოზის ველი არ არის), rate limit, წერილის
 * ჩავარდნა, შეცდომის ენა, ლოგი პერსონალური მონაცემის გარეშე. CAPTCHA არცერთ route-ზე არ არის.
 */

const T0 = Date.parse('2026-11-07T10:00:00.000Z');
const DAY = 86_400_000;
const CONTACT = {
  name: 'ნინო ბერიძე',
  contact: 'nino.private@example.ge',
  topic: 'barrier',
  message: 'შენობის შესასვლელში პანდუსი არ არის.',
  support: 'წერილობითი პასუხი, მარტივი ენა',
  replyVia: 'email',
  consent: true,
  website: '',
};

/** @type {Awaited<ReturnType<typeof freshDatabase>>} */
let database;
/** @type {any} */
let app;
let clk = clock(T0);
const logs = captureLogs();

beforeAll(async () => {
  database = await freshDatabase('public_forms');
  clk = clock(T0);
  app = await makeApp({
    db: database.db,
    now: clk.now,
    logStream: logs.stream,
    env: {
      LOG_LEVEL: 'info',
      PUBLIC_ORIGIN: 'https://example.org',
      CONTACT_INBOX: 'inbox@example.org',
      SUBSCRIBE_SECRET: 'forms-test-secret-0123456789abcdefgh',
      RATE_LIMIT_FORMS_MAX: '50',
    },
  });
});
afterAll(async () => {
  await app?.close();
  await database?.drop();
});

/**
 * @param {string} url
 * @param {unknown} payload
 * @param {{ ip?: string, headers?: Record<string, string> }} [options]
 */
const post = (url, payload, { ip = '192.0.2.1', headers = {} } = {}) =>
  app.inject({ method: 'POST', url, payload, remoteAddress: ip, headers });

const outbox = () => app.mailer.outbox;
/** @param {string} text */
const tokenIn = (text) => decodeURIComponent(/#token=(\S+)/.exec(text)?.[1] ?? '');

describe('კონტაქტი', () => {
  it('შენახვა + წერილი inbox-ზე: სათაური მხოლოდ თემით, Reply-To ელფოსტით, სრული ტექსტი და მხარდაჭერა', async () => {
    const before = outbox().length;
    const res = await post('/api/v1/contact?lang=en', CONTACT);
    expect(res.statusCode).toBe(200);
    const { ok, id } = res.json();
    expect(ok).toBe(true);
    const mail = outbox()[before];
    expect(mail).toMatchObject({
      template: 'contact',
      to: 'inbox@example.org',
      from: 'no-reply@example.invalid',
      replyTo: 'nino.private@example.ge',
      subject: 'საიტიდან: ხელმისაწვდომობის ბარიერი',
    });
    expect(mail.subject).not.toMatch(/ნინო|nino/i);
    for (const part of [CONTACT.name, CONTACT.contact, CONTACT.message, CONTACT.support]) {
      expect(mail.text).toContain(part);
    }
    expect(mail.text).toContain('ფორმის ენა: ინგლისური');

    const doc = await database.db
      .collection(COLLECTION.messages)
      .findOne({ _id: new (await import('mongodb')).ObjectId(id) });
    expect(doc).toMatchObject({
      name: CONTACT.name,
      topic: 'barrier',
      support: CONTACT.support,
      consent: true,
      lang: 'en',
      createdAt: new Date(T0),
      sentAt: new Date(T0),
    });
    expect(doc).not.toHaveProperty('website');
  });

  it('ზარით პასუხი → Reply-To არ არის; ცარიელი მხარდაჭერა — ბაზაში ველი არ იწერება', async () => {
    const before = outbox().length;
    const res = await post('/api/v1/contact', {
      ...CONTACT,
      contact: '+995 555 12 34 56',
      replyVia: 'call',
      support: '   ',
    });
    expect(res.statusCode).toBe(200);
    expect(outbox()[before].replyTo).toBeUndefined();
    expect(outbox()[before].text).toContain('არ მიუთითებია');
    const doc = await database.db.collection(COLLECTION.messages).findOne({ replyVia: 'call' });
    expect(doc).not.toHaveProperty('support');
  });

  it('honeypot → 200 იგივე ფორმით, არც ბაზა, არც წერილი', async () => {
    const count = await app.repos.forms.countMessages();
    const before = outbox().length;
    const res = await post('/api/v1/contact', { ...CONTACT, website: 'https://spam.example' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, id: expect.stringMatching(/^[0-9a-f]{24}$/) });
    expect(await app.repos.forms.countMessages()).toBe(count);
    expect(outbox()).toHaveLength(before);
  });

  it('დიაგნოზის / უცნობი ველი → 400, არაფერი ინახება; TTL — createdAt-ზე (MESSAGES_TTL_DAYS)', async () => {
    const count = await app.repos.forms.countMessages();
    for (const extra of [{ diagnosis: 'x' }, { health: 'x' }, { disability: 'x' }]) {
      const res = await post('/api/v1/contact', { ...CONTACT, ...extra });
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe('bad-request');
    }
    expect(await app.repos.forms.countMessages()).toBe(count);
    const indexes = await database.db.collection(COLLECTION.messages).indexes();
    expect(indexes.find((i) => i.key.createdAt)).toMatchObject({ expireAfterSeconds: 30 * 86_400 });
  });

  it('წერილი ვერ წავიდა → 500, ჩანაწერი იშლება (ხელახლა ცდა დუბლიკატს არ ქმნის)', async () => {
    const count = await app.repos.forms.countMessages();
    app.mailer.failNext(new Error('smtp down: nino.private@example.ge'));
    const res = await post('/api/v1/contact?lang=en', CONTACT);
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ code: 'server', message: en.errors.server });
    expect(await app.repos.forms.countMessages()).toBe(count);
  });

  it('ველის შეცდომა მოთხოვნის ენაზე: სქემის ზღვარიც (422) და `validateContact`-იც', async () => {
    const long = await post('/api/v1/contact?lang=en', { ...CONTACT, name: 'x'.repeat(101) });
    expect(long.statusCode).toBe(422);
    expect(long.json()).toMatchObject({
      message: en.errors.validation,
      fields: {
        name: { code: 'tooLong', message: 'The text is too long — at most 100 characters.' },
      },
    });
    const ka = await post('/api/v1/contact', { ...CONTACT, consent: false });
    expect(ka.json().fields.consent.message).toMatch(/თანხმობა/);
  });
});

describe('გამოწერა', () => {
  it('pending: ბაზაში token-ის მხოლოდ sha256 და ვადა (7 დღე); ბმული — PUBLIC_ORIGIN + ენა + fragment', async () => {
    const before = outbox().length;
    const res = await post('/api/v1/subscribe?lang=en', { email: ' Reader@Example.ge ' });
    expect(res.json()).toEqual({ ok: true, status: 'pending' });
    const mail = outbox()[before];
    expect(mail).toMatchObject({
      template: 'subscribe-confirm',
      to: 'reader@example.ge',
      lang: 'en',
    });
    expect(mail.subject).toBe('Confirm your subscription — More Participation');
    expect(mail.text).toMatch(
      /https:\/\/example\.org\/en\/subscribe\/confirm#token=[A-Za-z0-9_-]{43}\n/,
    );
    const token = tokenIn(mail.text);
    const doc = await app.repos.forms.findSubscriber('reader@example.ge');
    expect(doc).toMatchObject({
      status: 'pending',
      tokenHash: hashToken(token),
      expiresAt: new Date(T0 + SUBSCRIBE_CONFIRM_DAYS * DAY),
      confirmedAt: null,
      source: 'site',
      lang: 'en',
    });
    expect(JSON.stringify(doc)).not.toContain(token);
    const indexes = await database.db.collection(COLLECTION.subscribers).indexes();
    expect(indexes.find((i) => i.name === 'expiresAt_ttl_pending')).toMatchObject({
      expireAfterSeconds: 0,
      partialFilterExpression: { status: 'pending' },
    });
  });

  it('დადასტურება → confirmed (token იშლება) + მისასალმებელი წერილი List-Unsubscribe-ით; გაუქმება იშლება', async () => {
    await post('/api/v1/subscribe', { email: 'confirm@example.ge' });
    const token = tokenIn(outbox().at(-1).text);
    const res = await post('/api/v1/subscribe/confirm', { token });
    expect(res.json()).toEqual({ ok: true, status: 'confirmed' });
    const doc = await app.repos.forms.findSubscriber('confirm@example.ge');
    expect(doc).toMatchObject({ status: 'confirmed', tokenHash: null, expiresAt: null });
    const welcome = outbox().at(-1);
    expect(welcome.template).toBe('subscribe-welcome');
    const link = `https://example.org/subscribe/unsubscribe#token=${encodeURIComponent(
      unsubscribeToken(app.config.subscriptions.secret, doc?._id.toHexString()),
    )}`;
    expect(welcome.text).toContain(link);
    expect(welcome.headers).toEqual({ 'List-Unsubscribe': `<${link}>` });

    // სხვა საიდუმლოთი ხელმოწერილი ბმული → 404
    const forged = unsubscribeToken('another-secret-0123456789abcdefghijk', doc?._id.toHexString());
    expect(verifyUnsubscribeToken(app.config.subscriptions.secret, forged)).toBeNull();
    const bad = await post('/api/v1/subscribe/unsubscribe?lang=en', { token: forged });
    expect(bad.statusCode).toBe(404);
    expect(bad.json().message).toBe(en.errors['not-found']);

    const ok = await post('/api/v1/subscribe/unsubscribe', { token: tokenIn(welcome.text) });
    expect(ok.json()).toEqual({ ok: true });
    expect(await app.repos.forms.findSubscriber('confirm@example.ge')).toBeNull();
  });

  it('დადასტურების წერილი ვერ წავიდა → 500 (ხელახლა ცდა — ახალი token); მისასალმებელი — დადასტურებას არ აფერხებს', async () => {
    app.mailer.failNext(new Error('down'));
    expect((await post('/api/v1/subscribe', { email: 'mailfail@example.ge' })).statusCode).toBe(
      500,
    );
    await post('/api/v1/subscribe', { email: 'mailfail@example.ge' });
    const token = tokenIn(outbox().at(-1).text);
    app.mailer.failNext(new Error('down'));
    const res = await post('/api/v1/subscribe/confirm', { token });
    expect(res.json()).toEqual({ ok: true, status: 'confirmed' });
  });

  it('ვადაგასული pending: TTL-მდეც უარყოფილია; ხელახლა გამოწერა იმავე ჩანაწერს ახალ token-ს აძლევს', async () => {
    await post('/api/v1/subscribe', { email: 'late@example.ge' });
    const first = await app.repos.forms.findSubscriber('late@example.ge');
    const token = tokenIn(outbox().at(-1).text);
    clk.advance(SUBSCRIBE_CONFIRM_DAYS * DAY + 1);
    expect((await post('/api/v1/subscribe/confirm', { token })).statusCode).toBe(404);
    await post('/api/v1/subscribe', { email: 'late@example.ge' });
    const again = await app.repos.forms.findSubscriber('late@example.ge');
    expect(again?._id).toEqual(first?._id);
    expect(again?.createdAt).toEqual(first?.createdAt);
    expect(again?.tokenHash).not.toBe(first?.tokenHash);
  });
});

describe('rate limit, CAPTCHA-ს გარეშე', () => {
  it('ფორმის ყოველი route: [N] მცდელობის შემდეგ 429 + Retry-After, ტექსტი მოთხოვნის ენაზე', async () => {
    const limited = await makeApp({
      db: database.db,
      env: { RATE_LIMIT_FORMS_MAX: '2', RATE_LIMIT_FORMS_WINDOW_SECONDS: '60' },
    });
    try {
      const routes = [
        ['/api/v1/subscribe', { email: 'x@example.ge' }],
        ['/api/v1/subscribe/confirm', { token: 'A'.repeat(43) }],
        ['/api/v1/subscribe/unsubscribe', { token: `${'0'.repeat(24)}.${'A'.repeat(43)}` }],
        ['/api/v1/contact', { ...CONTACT, website: 'bot' }],
      ];
      for (const [url, payload] of routes) {
        for (let i = 0; i < 2; i += 1) {
          const res = await limited.inject({
            method: 'POST',
            url,
            payload,
            remoteAddress: '198.51.100.7',
          });
          expect(res.statusCode, url).not.toBe(429);
        }
        const res = await limited.inject({
          method: 'POST',
          url: `${url}?lang=en`,
          payload,
          remoteAddress: '198.51.100.7',
        });
        expect(res.statusCode, url).toBe(429);
        expect(res.headers['retry-after']).toBe('60');
        expect(res.json()).toEqual({ code: 'rate-limited', message: en.errors['rate-limited'] });
      }
    } finally {
      await limited.close();
    }
  });

  it('სხვა საიტიდან (Sec-Fetch-Site: cross-site) → 403', async () => {
    const res = await post(
      '/api/v1/subscribe',
      { email: 'csrf@example.ge' },
      {
        headers: { 'sec-fetch-site': 'cross-site' },
      },
    );
    expect(res.statusCode).toBe(403);
    expect(await app.repos.forms.findSubscriber('csrf@example.ge')).toBeNull();
  });
});

describe('ლოგი', () => {
  it('მხოლოდ მოვლენა: ელფოსტა, სახელი, ტექსტი, token, id, IP არასოდეს', async () => {
    const text = logs.text();
    const events = logs
      .lines()
      .map((line) => line.event)
      .filter(Boolean);
    expect(new Set(events)).toEqual(
      new Set([
        'contact.received',
        'contact.dropped',
        'mail.sent',
        'mail.failed',
        'subscribe.requested',
        'subscribe.confirmed',
        'subscribe.removed',
      ]),
    );
    for (const secret of [
      'nino',
      'ნინო',
      'example.ge',
      'reader@',
      'პანდუსი',
      'მარტივი ენა',
      '192.0.2.1',
      'smtp down',
      '#token=',
    ]) {
      expect(text, secret).not.toContain(secret);
    }
  });
});

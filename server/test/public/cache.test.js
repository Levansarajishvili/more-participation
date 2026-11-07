import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { NOW } from '@/content/__tests__/scenarios/content-scenarios.js';

import { etagOf, matchesEtag, PUBLIC_CACHE_CONTROL } from '../../routes/public.js';
import { freshDatabase } from '../db/helpers.js';
import { makeApp } from '../helpers.js';

import { publicHttpEnv, seededDatabase } from './public-env.js';

/**
 * B6: საჯარო GET-ის ქეში — `ETag` (სხეულის sha256) + `Cache-Control: public, max-age=0,
 * must-revalidate`; `If-None-Match` → 304. ცვლილება (ადმინში გამოქვეყნება / წაშლა, დაგეგმილი დროის
 * დადგომა) მომდევნო მოთხოვნაზე მაშინვე ახალ ETag-ს და სხეულს იძლევა. შეცდომა — `no-store`.
 */

const DAY = 86_400_000;

/** @type {Awaited<ReturnType<typeof seededDatabase>>} */
let seeded;
/** @type {Awaited<ReturnType<typeof publicHttpEnv>>} */
let env;

beforeAll(async () => {
  seeded = await seededDatabase('public_cache', { start: NOW });
  env = await publicHttpEnv(seeded.database, { start: NOW });
});
afterAll(async () => {
  await env?.close();
  await seeded?.database.drop();
});

/**
 * @param {string} path
 * @param {Record<string, string>} [headers]
 * @param {string} [method]
 */
const get = (path, headers = {}, method = 'GET') =>
  fetch(`${env.origin}/api/v1${path}`, { method, headers });

describe('ETag და Cache-Control', () => {
  it('200: ETag + public, max-age=0, must-revalidate + noindex; იგივე მოთხოვნა — იგივე ETag', async () => {
    const first = await get('/articles?lang=ka');
    expect(first.status).toBe(200);
    expect(first.headers.get('cache-control')).toBe(PUBLIC_CACHE_CONTROL);
    expect(first.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(first.headers.get('content-type')).toBe('application/json; charset=utf-8');
    const etag = String(first.headers.get('etag'));
    expect(etag).toBe(etagOf(await first.text()));
    expect((await get('/articles?lang=ka')).headers.get('etag')).toBe(etag);
    expect((await get('/articles?lang=en')).headers.get('etag')).not.toBe(etag);
  });

  it('If-None-Match: ემთხვევა → 304 სხეულის გარეშე (ETag და Cache-Control რჩება); სხვა → 200', async () => {
    const etag = String((await get('/series')).headers.get('etag'));
    for (const header of [etag, `W/${etag}`, `"zzz", ${etag}`, '*']) {
      const response = await get('/series', { 'if-none-match': header });
      expect(response.status, header).toBe(304);
      expect(await response.text()).toBe('');
      expect(response.headers.get('etag')).toBe(etag);
      expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE_CONTROL);
    }
    expect((await get('/series', { 'if-none-match': '"other"' })).status).toBe(200);
  });

  it('HEAD: header-ები სხეულის გარეშე', async () => {
    const response = await get('/team', {}, 'HEAD');
    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toMatch(/^"[A-Za-z0-9_-]{27}"$/);
    expect(await response.text()).toBe('');
  });

  it('შეცდომა (404 / 400) — no-store, ETag-ის გარეშე; ადმინის API — no-store', async () => {
    for (const path of ['/articles/ar-arsebobs', '/articles?limit=500', '/news?year=26']) {
      const response = await get(path);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.headers.get('cache-control'), path).toBe('no-store');
      expect(response.headers.get('etag'), path).toBeNull();
    }
    const admin = await fetch(`${env.origin}/api/admin/auth/me`);
    expect(admin.status).toBe(401);
    expect(admin.headers.get('cache-control')).toBe('no-store');
  });

  it('ცვლილება ბაზაში (გამოქვეყნებულის ახალი ვერსია, წაშლა) → ახალი ETag მომდევნო მოთხოვნაზე', async () => {
    const { repos } = env.app;
    const record = (await repos.content.list('articles', { visibleAt: env.now() }))[0];
    const path = `/articles/${record.item.slug}`;
    const before = await get(path);
    const etag = String(before.headers.get('etag'));
    const list = String((await get('/articles')).headers.get('etag'));

    await repos.content.replace(record.id, { ...record.item, title: '[ახალი სათაური]' });
    const after = await get(path, { 'if-none-match': etag });
    expect(after.status).toBe(200);
    expect((await after.json()).title).toBe('[ახალი სათაური]');
    expect(after.headers.get('etag')).not.toBe(etag);
    const listAfter = await get('/articles', { 'if-none-match': list });
    expect(listAfter.status).toBe(200);

    await repos.content.remove(record.id);
    const gone = await get(path, { 'if-none-match': etag });
    expect(gone.status).toBe(404);
    expect(gone.headers.get('cache-control')).toBe('no-store');
  });

  it('დაგეგმილი მასალის დრო დადგა → ჩანაწერის გარეშეც ახალი ETag', async () => {
    const response = await get('/articles?limit=50');
    const etag = String(response.headers.get('etag'));
    const { total } = await response.json();
    env.advance(6 * DAY);
    const later = await get('/articles?limit=50', { 'if-none-match': etag });
    expect(later.status).toBe(200);
    expect((await later.json()).total).toBe(total + 1);
  });

  it('matchesEtag: სია, W/, *, ცარიელი', () => {
    expect(matchesEtag('"a", W/"b"', '"b"')).toBe(true);
    expect(matchesEtag(' * ', '"b"')).toBe(true);
    expect(matchesEtag('', '"b"')).toBe(false);
    expect(matchesEtag(undefined, '"b"')).toBe(false);
    expect(matchesEtag('"c"', '"b"')).toBe(false);
  });
});

describe('ცარიელი ბაზა (seed-ის გარეშე)', () => {
  it('სიები ცარიელია, გუნდი — [], პარამეტრები → 404 not-found', async () => {
    const database = await freshDatabase('public_empty');
    const app = await makeApp({ db: database.db, now: () => NOW });
    try {
      const articles = await app.inject({ url: '/api/v1/articles' });
      expect(articles.json()).toEqual({ items: [], nextCursor: null, total: 0 });
      expect((await app.inject({ url: '/api/v1/news' })).json()).toEqual({
        items: [],
        nextCursor: null,
        total: 0,
        years: [],
      });
      expect((await app.inject({ url: '/api/v1/team' })).json()).toEqual([]);
      const settings = await app.inject({ url: '/api/v1/settings?lang=en' });
      expect(settings.statusCode).toBe(404);
      expect(settings.json().code).toBe('not-found');
    } finally {
      await app.close();
      await database.drop();
    }
  });
});

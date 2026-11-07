import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MOCK_PASSWORD, createMockAdminAdapter } from '@/admin/api/mock.js';
import { CSRF_COOKIE, createHttpAdminAdapter } from '@/admin/api/http.js';
import { SCHEMAS } from '@/admin/schemas/index.js';
import * as contentAdapter from '@/content/adapter.js';
import { createHttpContentAdapter } from '@/content/http.js';
import { createMockStore } from '@/content/mock/store.js';
import { setLocale } from '@/i18n/locale.js';

import { loadSpec } from '../../lib/openapi.js';

import { createMatcher } from './spec-match.js';

/**
 * Contract (B1): frontend-ის HTTP adapter-ის ყოველი მოთხოვნა — მეთოდი, გზა, query, body, CSRF —
 * OpenAPI-ს შეესაბამება; spec-ის ყოველ ოპერაციას adapter-ის ფუნქცია იძახებს (ორივე მიმართულებით).
 * სერვერის ლოგიკა არ მონაწილეობს — მხოლოდ spec-ის ვალიდატორი.
 */

const spec = loadSpec();
const matcher = createMatcher(spec);
const NOW = Date.parse('2026-10-26T10:00:00+04:00');
const ADMIN_BASE = '/api/admin';
const CSRF = 'csrf-test-token';
const PUBLIC_BASE = '/api/v1';

/** @type {{ method: string, url: string, headers: Record<string, string>, body?: unknown }[]} */
const recorded = [];

/** @type {typeof fetch} */
const recordingFetch = async (url, init = {}) => {
  recorded.push({
    method: String(init.method ?? 'GET'),
    url: String(url),
    headers: /** @type {Record<string, string>} */ (init.headers ?? {}),
    body: init.body ?? undefined,
  });
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
};

/** @type {any} */
let mock;
/** @type {Record<string, any>} */
const fixture = {};

beforeAll(async () => {
  // http.js CSRF-ს `document.cookie`-დან კითხულობს (ბრაუზერი) — Node-ში ვაყალბებთ
  /** @type {any} */ (globalThis).document = {
    cookie: `other=1; ${CSRF_COOKIE}=${CSRF}`,
    documentElement: { lang: 'ka' },
  };
  mock = createMockAdminAdapter({ store: createMockStore({ now: () => NOW }) });
  await mock.auth.login({ email: 'admin@example.org', password: MOCK_PASSWORD });
  for (const type of ['articles', 'series', 'videos', 'news', 'events', 'pages']) {
    const { items } = await mock.content.list({ type, limit: 1 });
    fixture[type] = await mock.content.get(items[0].id);
  }
  fixture.media = (await mock.media.list({}))[0];
  fixture.settings = await mock.settings.get();
  fixture.users = await mock.users.list();
});

afterAll(() => {
  delete (/** @type {any} */ (globalThis).document);
});

/** ადმინის HTTP adapter-ის ყოველი ფუნქცია — რეალისტური არგუმენტებით (mock-ის მონაცემი). */
function adminCalls() {
  const article = fixture.articles;
  const video = fixture.videos;
  const page = fixture.pages;
  const user = fixture.users.find((/** @type {any} */ u) => u.role === 'editor');
  const file = new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' });
  const at = new Date(NOW + 86_400_000).toISOString();
  /** @type {[string, (a: any) => Promise<unknown>][]} */
  return [
    [
      'auth.login',
      (a) => a.auth.login({ email: 'admin@example.org', password: 'x'.repeat(14), remember: true }),
    ],
    ['auth.login', (a) => a.auth.login({ email: 'admin@example.org', password: 'x'.repeat(14) })],
    [
      'auth.register',
      (a) =>
        a.auth.register({
          name: 'სახელი',
          email: 'new@example.org',
          invite: 'MC-INVITE-0001',
          password: 'x'.repeat(14),
        }),
    ],
    ['auth.logout', (a) => a.auth.logout()],
    ['auth.me', (a) => a.auth.me()],
    ['auth.extendSession', (a) => a.auth.extendSession()],
    ['content.list', (a) => a.content.list({ type: 'all' })],
    [
      'content.list',
      (a) =>
        a.content.list({
          type: 'articles',
          status: 'draft',
          q: 'სტატია',
          page: 2,
          limit: 10,
          check: 'altMissing',
        }),
    ],
    ['content.list', (a) => a.content.list({ type: 'pages', status: null, q: '', check: null })],
    ['content.get', (a) => a.content.get(article.id)],
    ...['articles', 'series', 'videos', 'news', 'events'].map(
      (type) =>
        /** @type {[string, (a: any) => Promise<unknown>]} */ ([
          'content.create',
          (a) =>
            a.content.create(
              type,
              SCHEMAS[/** @type {keyof typeof SCHEMAS} */ (type)].defaults(NOW),
            ),
        ]),
    ),
    ...['articles', 'series', 'videos', 'news', 'events', 'pages'].map(
      (type) =>
        /** @type {[string, (a: any) => Promise<unknown>]} */ ([
          'content.update',
          (a) =>
            a.content.update(fixture[type].id, fixture[type].item, {
              version: fixture[type].version,
              autosave: true,
            }),
        ]),
    ),
    [
      'content.update',
      (a) => a.content.update(article.id, { ...article.item, status: 'draft' }, { version: 3 }),
    ],
    ['content.checkSlug', (a) => a.content.checkSlug('articles', article.item.slug, null)],
    ['content.checkSlug', (a) => a.content.checkSlug('videos', 'akhali-video', video.id)],
    ['content.checkYouTube', (a) => a.content.checkYouTube('dQw4w9WgXcQ', video.id)],
    ['content.checkYouTube', (a) => a.content.checkYouTube('dQw4w9WgXcQ')],
    ['content.remove', (a) => a.content.remove(article.id)],
    ['content.publish', (a) => a.content.publish(article.id, { version: 2, data: article.item })],
    ['content.publish', (a) => a.content.publish(page.id, { version: 1 })],
    ['content.schedule', (a) => a.content.schedule(video.id, at, { version: 4, data: video.item })],
    ['content.versions', (a) => a.content.versions(article.id)],
    ['content.restoreVersion', (a) => a.content.restoreVersion(article.id, 2)],
    ['content.search', (a) => a.content.search('ჩვევა')],
    ['content.search', (a) => a.content.search('')],
    ['media.list', (a) => a.media.list()],
    ['media.list', (a) => a.media.list({ kind: 'image', missingAlt: true })],
    ['media.upload', (a) => a.media.upload(file)],
    ['media.upload', (a) => a.media.upload(file, { title: 'ანგარიში', lang: 'ka', tagged: false })],
    ['media.updateAlt', (a) => a.media.updateAlt(fixture.media.id, '[ახალი alt]')],
    [
      'media.update',
      (a) => a.media.update('doc:s-001:pdf', { title: 'PDF', lang: 'en', tagged: true }),
    ],
    ['media.remove', (a) => a.media.remove(fixture.media.id)],
    ['media.usage', (a) => a.media.usage(fixture.media.id)],
    ['users.list', (a) => a.users.list()],
    ['users.invite', (a) => a.users.invite({ role: 'editor' })],
    ['users.invite', (a) => a.users.invite({ email: 'person@example.org', role: 'admin' })],
    ['users.setRole', (a) => a.users.setRole(user.id, 'admin')],
    ['users.deactivate', (a) => a.users.deactivate(user.id)],
    ['settings.get', (a) => a.settings.get()],
    [
      'settings.update',
      (a) =>
        a.settings.update({ site: fixture.settings.site, featured: fixture.settings.featured }),
    ],
    ['settings.update', (a) => a.settings.update({ featured: { weeklyVideo: video.id } })],
    ['reports.stats', (a) => a.reports.stats()],
    ['reports.a11yReport', (a) => a.reports.a11yReport()],
  ];
}

describe('ადმინის HTTP adapter (`createHttpAdminAdapter`) ↔ OpenAPI', () => {
  const http = createHttpAdminAdapter({ baseUrl: ADMIN_BASE, fetch: recordingFetch });

  it('ყოველი მოთხოვნა spec-ს შეესაბამება (მეთოდი, გზა, query, body, CSRF)', async () => {
    /** @type {string[]} */
    const failures = [];
    for (const [name, call] of adminCalls()) {
      recorded.length = 0;
      await call(http);
      expect(recorded, name).toHaveLength(1);
      const { op, problems } = matcher.checkRequest(recorded[0]);
      const label = `${name} → ${recorded[0].method} ${new URL(recorded[0].url).pathname}`;
      if (!op) failures.push(`${label}: ${problems.join('; ')}`);
      else {
        if (![op.operation['x-adapter']].flat().includes(name))
          failures.push(`${label}: x-adapter = ${op.operation['x-adapter']}`);
        if (!op.path.startsWith(ADMIN_BASE)) failures.push(`${label}: არა /api/admin`);
        for (const p of problems) failures.push(`${label}: ${p}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('დაფარვა: adapter-ის ყოველი ფუნქცია ↔ ადმინის ყოველი ოპერაცია', async () => {
    const adapterNames = Object.entries(http)
      .filter(([, group]) => group && typeof group === 'object')
      .flatMap(([group, fns]) => Object.keys(fns).map((fn) => `${group}.${fn}`))
      .sort();
    const called = [...new Set(adminCalls().map(([name]) => name))].sort();
    expect(called).toEqual(adapterNames);

    const specNames = matcher.operations
      .filter((op) => op.path.startsWith(ADMIN_BASE))
      .flatMap((op) => [op.operation['x-adapter']].flat())
      .sort();
    expect(specNames).toEqual(adapterNames);
  });
});

describe('საჯარო ContentAdapter-ის HTTP adapter-ი (`src/content/http.js`, B6) ↔ OpenAPI', () => {
  const http = createHttpContentAdapter({ baseUrl: PUBLIC_BASE, fetch: recordingFetch });
  const contact = {
    name: 'სახელი გვარი',
    contact: '+995 555 12 34 56',
    topic: 'barrier',
    message: 'ტექსტი',
    support: 'მარტივი ენა',
    replyVia: 'call',
    consent: true,
    website: '',
  };
  /** @type {[string, unknown[], ('ka' | 'en')?][]} */
  const calls = [
    ['listArticles', [{}]],
    [
      'listArticles',
      [
        {
          category: 'career',
          q: 'სამსახური',
          cursor: '6',
          limit: 6,
          sort: 'shortest',
          featured: false,
        },
      ],
      'en',
    ],
    ['listArticles', [{ category: null, q: '', cursor: null }]],
    ['getArticle', ['chveva-5-nabiji']],
    ['listSeries', [{ topic: 'flow', featured: true }]],
    ['getSeries', ['chveva-5-nabiji'], 'en'],
    ['listVideos', [{ category: 'sport' }]],
    ['getVideo', ['video-1']],
    ['listNews', [{ type: 'event', year: 2026, cursor: '6', limit: 6, featured: false }]],
    ['listNews', [{ type: null, year: null }], 'en'],
    ['getNews', ['siakhle-1']],
    ['listEvents', [{ upcoming: true }]],
    ['listEvents', [{}], 'en'],
    ['getTeam', []],
    ['getPartners', [], 'en'],
    ['getStages', []],
    ['getSettings', [], 'en'],
    ['subscribe', ['person@example.ge']],
    ['subscribe', ['person@example.ge'], 'en'],
    ['confirmSubscription', ['A'.repeat(43)]],
    ['confirmSubscription', ['b_-'.repeat(14) + 'c'], 'en'],
    ['unsubscribe', [`${'0123456789abcdef01234567'}.${'A'.repeat(43)}`]],
    ['sendContact', [contact]],
    ['sendContact', [{ ...contact, website: 'https://spam.example' }], 'en'],
  ];

  afterAll(() => setLocale('ka'));

  /**
   * @param {string} name
   * @param {unknown[]} args
   * @param {'ka' | 'en'} [locale]
   */
  async function record(name, args, locale = 'ka') {
    recorded.length = 0;
    setLocale(locale);
    try {
      await /** @type {any} */ (http)[name](...args);
    } catch {
      // ყალბი პასუხი ({}) ზოგჯერ შეცდომად ითარგმნება — მოთხოვნა მაინც ჩაიწერა
    } finally {
      setLocale('ka');
    }
    return [...recorded];
  }

  it('adapter-ი ContentAdapter-ის ყოველ ფუნქციას ფარავს (adapter.js-ის ექსპორტი)', () => {
    const exported = Object.entries(contentAdapter)
      .filter(
        ([name, value]) =>
          typeof value === 'function' && !['setContentAdapter', 'contentSource'].includes(name),
      )
      .map(([name]) => name)
      .sort();
    const { source, ...functions } = http;
    expect(source).toBe('http');
    expect(Object.keys(functions).sort()).toEqual(exported);
    expect([...new Set(calls.map(([name]) => name))].sort()).toEqual(exported);
  });

  it('ყოველი მოთხოვნა spec-ს შეესაბამება (მეთოდი, გზა, query + `lang`, body)', async () => {
    /** @type {string[]} */
    const failures = [];
    for (const [name, args, locale] of calls) {
      const requests = await record(name, args, locale);
      expect(requests, name).toHaveLength(1);
      const [request] = requests;
      const url = new URL(request.url);
      expect(url.searchParams.get('lang'), name).toBe(locale ?? 'ka');
      const { op, problems } = matcher.checkRequest(/** @type {any} */ (request));
      if (!op) failures.push(`${name}: ${problems.join('; ')}`);
      else {
        if (op.operation['x-adapter'] !== name)
          failures.push(`${name}: x-adapter = ${op.operation['x-adapter']}`);
        if (!op.path.startsWith('/api/v1/')) failures.push(`${name}: არა /api/v1`);
        for (const p of problems) failures.push(`${name}: ${p}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('spec-ის ყოველი საჯარო ოპერაცია adapter-შია', () => {
    const specNames = matcher.operations
      .filter((op) => op.path.startsWith('/api/v1/'))
      .map((op) => op.operation['x-adapter'])
      .sort();
    const { source: _source, ...functions } = http;
    expect(specNames).toEqual(Object.keys(functions).sort());
  });

  it('არასწორი მოთხოვნა spec-ის ვალიდატორს არ გადის (ტესტის თვითშემოწმება)', async () => {
    const bad = [
      ...(await record('listArticles', [{ category: 'politics' }])),
      ...(await record('listArticles', [{ limit: 500 }])),
      ...(await record('listNews', [{ year: 'last' }])),
      ...(await record('listArticles', [{ unknown: 1 }])),
      ...(await record('sendContact', [{ ...contact, diagnosis: 'x' }])),
      ...(await record('subscribe', [undefined])),
    ];
    expect(bad).toHaveLength(6);
    for (const request of bad)
      expect(matcher.checkRequest(/** @type {any} */ (request)).problems, request.url).not.toEqual(
        [],
      );
  });
});

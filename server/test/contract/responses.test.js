import { afterEach, describe, expect, it } from 'vitest';

import { MINIMAL_PDF } from '@/admin/__tests__/scenarios/admin-scenarios.js';
import { MOCK_INVITE, MOCK_PASSWORD, createMockAdminAdapter } from '@/admin/api/mock.js';
import { SCHEMAS } from '@/admin/schemas/index.js';
import { ContentError } from '@/content/errors.js';
import { createMockAdapter } from '@/content/mock/index.js';
import { createMockStore } from '@/content/mock/store.js';
import { setLocale } from '@/i18n/index.js';

import { statusForCode } from '../../lib/errors.js';
import { loadSpec } from '../../lib/openapi.js';

import { createMatcher, withSampleYouTubeIds } from './spec-match.js';

/**
 * Contract (B1): mock adapter-ების (frontend-ის კონტრაქტის ცოცხალი ნიმუში) პასუხი OpenAPI-ის
 * სქემას აკმაყოფილებს, შეცდომის კოდი კი ოპერაციის სტატუსებშია. B4 / B6-ის სერვერი იმავე სქემით
 * შემოწმდება — mock და სერვერი ერთ კონტრაქტზე დგას.
 */

const spec = loadSpec();
const matcher = createMatcher(spec);
const NOW = Date.parse('2026-10-26T10:00:00+04:00');

/** 2xx სტატუსი ოპერაციისთვის (201 — შექმნა). @param {any} op */
const successStatus = (op) => Number(Object.keys(op.operation.responses).find((s) => /^2/.test(s)));

/**
 * @param {string} adapterName
 * @param {unknown} data
 */
function expectConforms(adapterName, data) {
  const op = matcher.operationFor(adapterName);
  expect(op, adapterName).not.toBeNull();
  expect(
    matcher.checkResponse(op, successStatus(op), withSampleYouTubeIds(data)),
    adapterName,
  ).toEqual([]);
}

/**
 * @param {string} adapterName
 * @param {() => Promise<unknown>} call
 * @param {string} code
 */
async function expectError(adapterName, call, code) {
  const op = matcher.operationFor(adapterName);
  /** @type {unknown} */
  let caught = null;
  try {
    await call();
  } catch (error) {
    caught = error;
  }
  expect(caught, adapterName).toBeInstanceOf(ContentError);
  const error = /** @type {ContentError} */ (caught);
  expect(error.code).toBe(code);
  const status = statusForCode(error.code);
  expect(Object.keys(op.operation.responses), `${adapterName}: ${status}`).toContain(
    String(status),
  );
  expect(matcher.checkResponse(op, status, error.toJSON())).toEqual([]);
}

afterEach(() => setLocale('ka'));

describe.each(['ka', 'en'])('საჯარო mock (`createMockAdapter`) ↔ პასუხის სქემა — %s', (locale) => {
  it('ყოველი ფუნქცია', async () => {
    setLocale(/** @type {'ka' | 'en'} */ (locale));
    const api = createMockAdapter({ now: () => NOW });
    const articles = await api.listArticles({});
    expectConforms('listArticles', articles);
    expectConforms(
      'listArticles',
      await api.listArticles({ category: 'career', sort: 'shortest', limit: 2 }),
    );
    expectConforms('listArticles', await api.listArticles({ featured: true }));
    expectConforms('getArticle', await api.getArticle(articles.items[0].slug));

    const series = await api.listSeries({});
    expectConforms('listSeries', series);
    for (const s of series) expectConforms('getSeries', await api.getSeries(s.slug));

    const videos = await api.listVideos({});
    expectConforms('listVideos', videos);
    for (const v of videos) expectConforms('getVideo', await api.getVideo(v.slug));

    const news = await api.listNews({});
    expectConforms('listNews', news);
    expectConforms('listNews', await api.listNews({ type: 'event', limit: 3 }));
    expectConforms('getNews', await api.getNews(news.items[0].slug));

    expectConforms('listEvents', await api.listEvents({}));
    expectConforms('listEvents', await api.listEvents({ upcoming: true }));
    expectConforms('getTeam', await api.getTeam());
    expectConforms('getPartners', await api.getPartners());
    expectConforms('getStages', await api.getStages());
    expectConforms('getSettings', await api.getSettings());
    expectConforms('subscribe', await api.subscribe('person@example.ge'));
    const contact = {
      name: 'სახელი',
      contact: 'person@example.ge',
      topic: 'general',
      message: '',
      support: '',
      replyVia: 'email',
      consent: true,
    };
    expectConforms('sendContact', await api.sendContact(contact));
    expectConforms('sendContact', await api.sendContact({ ...contact, website: 'spam' }));
  });

  it('შეცდომის კოდი ოპერაციის სტატუსებშია', async () => {
    setLocale(/** @type {'ka' | 'en'} */ (locale));
    const api = createMockAdapter({ now: () => NOW });
    await expectError('getArticle', () => api.getArticle('ar-arsebobs'), 'not-found');
    await expectError('getVideo', () => api.getVideo('Bad_Slug'), 'not-found');
    await expectError(
      'listArticles',
      () => api.listArticles({ category: 'politics' }),
      'bad-request',
    );
    await expectError('listNews', () => api.listNews({ cursor: 'abc' }), 'bad-request');
    await expectError('subscribe', () => api.subscribe('not-an-email'), 'validation');
    await expectError('sendContact', () => api.sendContact(/** @type {any} */ ({})), 'validation');
  });
});

describe('ადმინის mock (`createMockAdminAdapter`) ↔ პასუხის სქემა', () => {
  it('ყოველი ფუნქცია', async () => {
    const admin = createMockAdminAdapter({ store: createMockStore({ now: () => NOW }) });
    expectConforms(
      'auth.login',
      await admin.auth.login({ email: 'admin@example.org', password: MOCK_PASSWORD }),
    );
    expectConforms('auth.me', await admin.auth.me());
    expectConforms('auth.extendSession', await admin.auth.extendSession());

    const all = await admin.content.list({ type: 'all', limit: 50 });
    expectConforms('content.list', all);
    expectConforms('content.list', await admin.content.list({ type: 'videos', status: 'draft' }));
    expectConforms('content.search', await admin.content.search('სტატია'));

    /** @type {Record<string, any>} */
    const records = {};
    for (const row of all.items) {
      const record = await admin.content.get(row.id);
      expectConforms('content.get', record);
      records[row.type] ??= record;
    }
    for (const type of ['articles', 'series', 'videos', 'news', 'events']) {
      const created = await admin.content.create(
        type,
        SCHEMAS[/** @type {keyof typeof SCHEMAS} */ (type)].defaults(NOW),
      );
      expectConforms('content.create', created);
    }
    const article = records.articles;
    const saved = await admin.content.update(
      article.id,
      { title: '[ახალი სათაური]' },
      { version: article.version, autosave: true },
    );
    expectConforms('content.update', saved);
    expect(saved.working).not.toBeNull();
    expectConforms(
      'content.checkSlug',
      await admin.content.checkSlug('articles', article.item.slug, null),
    );
    expectConforms('content.checkYouTube', await admin.content.checkYouTube('dQw4w9WgXcQ', null));
    const published = await admin.content.publish(article.id, { version: saved.version });
    expectConforms('content.publish', published);
    const scheduled = await admin.content.schedule(
      article.id,
      new Date(NOW + 86_400_000).toISOString(),
      {
        version: published.version,
      },
    );
    expectConforms('content.schedule', scheduled);
    const versions = await admin.content.versions(article.id);
    expectConforms('content.versions', versions);
    expectConforms(
      'content.restoreVersion',
      await admin.content.restoreVersion(article.id, versions[1].version),
    );
    expectConforms('content.remove', await admin.content.remove(records.news.id));

    const media = await admin.media.list({});
    expectConforms('media.list', media);
    expectConforms('media.list', await admin.media.list({ kind: 'image', missingAlt: true }));
    // B5: mock ტიპს შიგთავსით ამოწმებს (`files.js`) — ვალიდური PDF-ის სათავე
    const upload = await admin.media.upload(
      new File([MINIMAL_PDF], 'a.pdf', { type: 'application/pdf' }),
      { title: 'A' },
    );
    expectConforms('media.upload', upload);
    expectConforms('media.updateAlt', await admin.media.updateAlt(media[0].id, '[alt]'));
    expectConforms(
      'media.update',
      await admin.media.update(upload.id, { title: 'B', tagged: true }),
    );
    expectConforms('media.usage', await admin.media.usage(media[0].id));
    expectConforms('media.remove', await admin.media.remove(upload.id));

    const users = await admin.users.list();
    expectConforms('users.list', users);
    expectConforms(
      'users.invite',
      await admin.users.invite({ email: 'x@example.org', role: 'editor' }),
    );
    const editor = users.find((/** @type {any} */ u) => u.role === 'editor');
    expectConforms('users.setRole', await admin.users.setRole(editor.id, 'editor'));

    const settings = await admin.settings.get();
    expectConforms('settings.get', settings);
    expectConforms(
      'settings.update',
      await admin.settings.update({ featured: { weeklyVideo: records.videos.id } }),
    );
    expectConforms('reports.stats', await admin.reports.stats());
    expectConforms('reports.a11yReport', await admin.reports.a11yReport());
    expectConforms('users.deactivate', await admin.users.deactivate(editor.id));
    expectConforms('auth.logout', await admin.auth.logout());
    expectConforms(
      'auth.register',
      await admin.auth.register({
        name: 'ახალი',
        email: 'new@example.org',
        invite: MOCK_INVITE,
        password: 'x'.repeat(14),
      }),
    );
  });

  it('შეცდომის კოდი ოპერაციის სტატუსებშია', async () => {
    const admin = createMockAdminAdapter({ store: createMockStore({ now: () => NOW }) });
    await expectError('auth.me', () => admin.auth.me(), 'unauthorized');
    await expectError(
      'auth.login',
      () => admin.auth.login({ email: 'admin@example.org', password: 'wrong-password' }),
      'unauthorized',
    );
    await expectError(
      'auth.login',
      () => admin.auth.login({ email: '', password: '' }),
      'validation',
    );
    await expectError(
      'auth.register',
      () =>
        admin.auth.register({
          name: 'ა',
          email: 'a@example.org',
          invite: 'WRONG',
          password: 'x'.repeat(14),
        }),
      'validation',
    );
    await admin.auth.login({ email: 'editor@example.org', password: MOCK_PASSWORD });
    await expectError('users.list', () => admin.users.list(), 'forbidden');
    await expectError('settings.get', () => admin.settings.get(), 'forbidden');
    await expectError('content.get', () => admin.content.get('a-999'), 'not-found');
    const { items } = await admin.content.list({ type: 'articles', status: 'draft', limit: 50 });
    const draft = items.find((/** @type {any} */ r) => r.issues.errors > 0);
    const record = await admin.content.get(draft.id);
    await expectError(
      'content.update',
      () => admin.content.update(draft.id, {}, { version: record.version + 5 }),
      'conflict',
    );
    await expectError(
      'content.publish',
      () => admin.content.publish(draft.id, { version: record.version }),
      'validation',
    );
    await expectError(
      'content.schedule',
      () => admin.content.schedule(draft.id, '2000-01-01T00:00:00Z', { version: record.version }),
      'validation',
    );
    const [page] = (await admin.content.list({ type: 'pages', limit: 1 })).items;
    await expectError('content.remove', () => admin.content.remove(page.id), 'bad-request');
    await expectError(
      'content.create',
      () => admin.content.create(/** @type {any} */ ('pages'), {}),
      'bad-request',
    );
    await expectError(
      'content.checkYouTube',
      () => admin.content.checkYouTube('nope'),
      'bad-request',
    );
    const used = (await admin.media.list({})).find((/** @type {any} */ m) => m.usage.length);
    await expectError('media.remove', () => admin.media.remove(used.id), 'conflict');
    await expectError('media.usage', () => admin.media.usage('img:none'), 'not-found');
  });
});

describe('სქემის შემოწმების თვითტესტი', () => {
  it('დარღვეული პასუხი სქემას არ გადის', async () => {
    const api = createMockAdapter({ now: () => NOW });
    const article = await api.getArticle((await api.listArticles({})).items[0].slug);
    const op = matcher.operationFor('getArticle');
    const { lang: _lang, ...withoutLang } = article;
    const broken = [
      withoutLang,
      { ...article, internalNote: 'x' },
      { ...article, translations: { en: {} } },
      { ...article, excerpt: 'x'.repeat(161) },
      { ...article, cover: { ...article.cover, alt: undefined } },
      { ...article, body: [{ type: 'h1', text: 'x' }] },
    ];
    for (const data of broken) expect(matcher.checkResponse(op, 200, data)).not.toEqual([]);

    const video = await api.getVideo((await api.listVideos({})).at(0).slug);
    // mock-ის ჩანაცვლება (`[YouTube-ის id]`) ნამდვილი id არ არის — სქემა მას არ იღებს
    expect(matcher.checkResponse(matcher.operationFor('getVideo'), 200, video)).not.toEqual([]);
    expect(
      matcher.checkResponse(matcher.operationFor('getVideo'), 200, withSampleYouTubeIds(video)),
    ).toEqual([]);
    const summary = (await api.listArticles({})).items[0];
    expect(
      matcher.checkResponse(matcher.operationFor('listArticles'), 200, {
        items: [{ ...summary, body: [] }],
        nextCursor: null,
        total: 1,
      }),
    ).not.toEqual([]);
  });
});

import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { ta } from '@/admin/i18n/index.js';
import { ContentError } from '@/content/errors.js';
import { createMockData } from '@/content/mock/data.js';
import { normalizeSearch } from '@/content/text.js';

import { COLLECTION } from '../../db/collections.js';
import { createContentRepository, typeOfId } from '../../db/content.js';
import { mediaKeysOf, searchFilter, searchTextOf } from '../../db/derive.js';
import { createRepositories } from '../../db/index.js';

import { T0, caught, clock, freshDatabase, iso } from './helpers.js';

/**
 * B2: content repository — ჩაწერა, ვერსია / 409, slug, ისტორია, სამუშაო ასლი, წაშლა,
 * რჩეული (ტრანზაქცია + უნიკალური ინდექსი), ინდექსის გამოყენება.
 */

const data = createMockData({ now: T0 });
/** @param {number} i */
const article = (i, extra = {}) => ({
  ...structuredClone(data.articles[i]),
  featured: false,
  ...extra,
});

describe('content repository', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;
  /** @type {ReturnType<typeof clock>} */
  let clk;
  /** @type {ReturnType<typeof createRepositories>} */
  let repos;

  beforeAll(async () => {
    database = await freshDatabase('content');
    clk = clock();
    repos = createRepositories(database, { now: clk.now, keepVersions: 5 });
  });
  afterAll(() => database?.drop());

  const raw = (/** @type {string} */ id) =>
    database.db.collection(COLLECTION.content).findOne({ _id: /** @type {any} */ (id) });

  it('insert: ჩანაწერი, id, მეტა; ბაზაში — გამოთვლადი ველები', async () => {
    const item = article(1, { slug: 'insert-test' });
    const record = await repos.content.insert('articles', item, { by: 'u-001' });
    expect(record.id).toMatch(/^a-[0-9a-f]{24}$/);
    expect(typeOfId(record.id)).toBe('articles');
    expect(record).toMatchObject({
      type: 'articles',
      item,
      meta: { version: 1, createdAt: iso(T0), updatedAt: iso(T0), updatedBy: 'u-001' },
      working: null,
    });
    const doc = await raw(record.id);
    expect(doc?.slug).toBe('insert-test');
    expect(doc?.status).toBe('published');
    expect(doc?.publishedAt).toEqual(new Date(item.publishedAt));
    // B6: სტატიაზე + საჯარო ძიების ტექსტი ორივე ენაზე (ავტორი, კატეგორია, ტექსტი)
    expect(doc?.searchText).toBe(searchTextOf(item, 'articles'));
    expect(
      doc?.searchText.startsWith(
        normalizeSearch(
          [
            item.slug,
            item.title,
            item.excerpt,
            item.translations?.en?.title,
            item.translations?.en?.excerpt,
          ]
            .filter(Boolean)
            .join(' '),
        ),
      ),
    ).toBe(true);
    expect(doc?.searchText).toContain(normalizeSearch(item.author));
    expect(doc?.mediaKeys).toEqual([]);
  });

  it('slug: უნიკალური ტიპში (validation / slugDuplicate), სხვა ტიპში თავისუფალი, ცარიელი — რამდენიმე', async () => {
    const error = await caught(
      repos.content.insert('articles', article(2, { slug: 'insert-test' })),
    );
    expect(error).toBeInstanceOf(ContentError);
    expect(error.code).toBe('validation');
    expect(error.fields).toEqual({
      slug: { code: 'slugDuplicate', message: ta('fieldErrors.slugTaken') },
    });
    const news = await repos.content.insert('news', { ...data.news[3], slug: 'insert-test' });
    expect(news.id).toMatch(/^n-/);
    const a = await repos.content.insert('articles', article(3, { slug: '', status: 'draft' }));
    const b = await repos.content.insert('articles', article(4, { slug: '', status: 'draft' }));
    expect((await raw(a.id))?.slug).toBeUndefined();
    expect((await raw(b.id))?.slug).toBeUndefined();
    expect(await repos.content.findBySlug('articles', '')).toBeNull();

    // ჩანაცვლება დაკავებულ slug-ზე — იგივე შეცდომა, ვერსია და ისტორია უცვლელი
    const taken = await caught(
      repos.content.replace(a.id, { ...a.item, slug: 'insert-test' }, { version: 1 }),
    );
    expect(taken.code).toBe('validation');
    expect((await repos.content.find(a.id))?.meta.version).toBe(1);
    expect(await repos.content.versions(a.id)).toEqual([]);
  });

  it('replace: ისტორია, მეტა; ძველ ვერსიაზე — conflict ჩაწერის გარეშე', async () => {
    const created = await repos.content.insert('articles', article(5, { slug: 'versioned' }), {
      by: 'u-001',
    });
    clk.advance();
    const next = await repos.content.replace(
      created.id,
      { ...created.item, title: '[ახალი სათაური]' },
      { version: 1, by: 'u-002' },
    );
    expect(next.meta).toEqual({
      version: 2,
      createdAt: iso(T0),
      updatedAt: iso(clk.now()),
      updatedBy: 'u-002',
    });
    expect(await repos.content.versions(created.id)).toEqual([
      { version: 1, at: iso(T0), by: 'u-001', item: created.item },
    ]);

    const stale = await caught(
      repos.content.replace(created.id, { ...created.item, title: 'x' }, { version: 1 }),
    );
    expect(stale).toBeInstanceOf(ContentError);
    expect(stale.code).toBe('conflict');
    expect((await repos.content.find(created.id))?.item.title).toBe('[ახალი სათაური]');
    expect(await repos.content.versions(created.id)).toHaveLength(1);

    // ერთდროულად ერთ ვერსიაზე — ერთი იგებს, მეორე 409
    const results = await Promise.allSettled([
      repos.content.replace(created.id, { ...next.item, title: 'A' }, { version: 2 }),
      repos.content.replace(created.id, { ...next.item, title: 'B' }, { version: 2 }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = /** @type {PromiseRejectedResult} */ (
      results.find((r) => r.status === 'rejected')
    );
    expect(rejected.reason.code).toBe('conflict');
    expect(await repos.content.versions(created.id)).toHaveLength(2);
    expect((await repos.content.find(created.id))?.meta.version).toBe(3);

    expect((await caught(repos.content.replace('a-missing', {}))).code).toBe('not-found');
  });

  it('ვერსიების ჭრა: ბოლო keepVersions (5) — იმავე ტრანზაქციაში', async () => {
    const created = await repos.content.insert('articles', article(6, { slug: 'trim' }));
    let item = created.item;
    for (let i = 1; i <= 8; i += 1) {
      clk.advance();
      item = (await repos.content.replace(created.id, { ...item, title: `v${i + 1}` })).item;
    }
    const history = await repos.content.versions(created.id);
    expect(history.map((v) => v.version)).toEqual([8, 7, 6, 5, 4]);
    expect((await repos.content.find(created.id))?.meta.version).toBe(9);
  });

  it('restore: ძველი item ახალ ვერსიად; featured — მიმდინარე; უცნობი ვერსია → not-found', async () => {
    const created = await repos.content.insert('series', {
      ...structuredClone(data.series[1]),
      slug: 'restore',
      featured: false,
    });
    clk.advance();
    await repos.content.replace(created.id, { ...created.item, title: '[შეცვლილი]' });
    await repos.content.setFeatured('series', created.id);
    const restored = await repos.content.restore(created.id, 1, { by: 'u-001' });
    expect(restored.item.title).toBe(created.item.title);
    expect(restored.item.featured).toBe(true);
    expect(restored.meta).toMatchObject({ version: 4, updatedBy: 'u-001' });
    expect((await repos.content.versions(created.id)).map((v) => v.version)).toEqual([3, 2, 1]);
    expect((await caught(repos.content.restore(created.id, 99))).code).toBe('not-found');
    await repos.content.setFeatured('series', null);
  });

  it('saveWorking: ვერსია უცვლელი, mediaKeys სამუშაო ასლითაც; replace ასლს შლის; ძველ ვერსიაზე 409', async () => {
    const created = await repos.content.insert('articles', article(7, { slug: 'working' }));
    clk.advance();
    const draft = {
      ...created.item,
      cover: { ...created.item.cover, src: '/media/2026/11/new%20photo.jpg' },
    };
    const saved = await repos.content.saveWorking(created.id, draft, { by: 'u-002', version: 1 });
    expect(saved.meta.version).toBe(1);
    expect(saved.working).toEqual({ item: draft, at: iso(clk.now()), by: 'u-002' });
    expect((await raw(created.id))?.mediaKeys).toEqual(['2026/11/new photo.jpg']);
    expect((await repos.content.find(created.id))?.item).toEqual(created.item);
    expect((await caught(repos.content.saveWorking(created.id, draft, { version: 7 }))).code).toBe(
      'conflict',
    );

    const published = await repos.content.replace(created.id, draft, { version: 1 });
    expect(published.working).toBeNull();
    expect((await raw(created.id))?.working).toBeNull();
    expect((await raw(created.id))?.mediaKeys).toEqual(['2026/11/new photo.jpg']);
  });

  it('remove: მასალა და მისი ვერსიები ქრება; მეორედ — not-found', async () => {
    const created = await repos.content.insert('news', { ...data.news[2], slug: 'removed' });
    await repos.content.replace(created.id, { ...created.item, title: 'x' });
    const removed = await repos.content.remove(created.id);
    expect(removed.id).toBe(created.id);
    expect(await repos.content.find(created.id)).toBeNull();
    expect(
      await database.db.collection(COLLECTION.versions).countDocuments({ contentId: created.id }),
    ).toBe(0);
    expect((await caught(repos.content.remove(created.id))).code).toBe('not-found');
  });

  it('setFeatured: ერთი რჩეული ტიპზე; null ხსნის; სხვა ტიპის / უცნობი id → not-found', async () => {
    const a = await repos.content.insert('videos', {
      ...data.videos[1],
      slug: 'fa',
      featured: false,
    });
    const b = await repos.content.insert('videos', {
      ...data.videos[2],
      slug: 'fb',
      featured: false,
    });
    expect((await repos.content.setFeatured('videos', a.id)).map((r) => r.id)).toEqual([a.id]);
    const changed = await repos.content.setFeatured('videos', b.id, { by: 'u-001' });
    expect(changed.map((r) => [r.id, r.item.featured])).toEqual([
      [a.id, false],
      [b.id, true],
    ]);
    expect(await repos.content.setFeatured('videos', b.id)).toEqual([]);
    expect((await caught(repos.content.setFeatured('events', null))).code).toBe('bad-request');
    expect((await caught(repos.content.setFeatured('articles', b.id))).code).toBe('not-found');
    expect((await caught(repos.content.setFeatured('videos', 'v-missing'))).code).toBe('not-found');
    await repos.content.setFeatured('videos', null);
    expect(
      await database.db
        .collection(COLLECTION.content)
        .countDocuments({ type: 'videos', 'item.featured': true }),
    ).toBe(0);
  });

  it('type_featured_unique: მეორე რჩეული პირდაპირ ვერ ჩაიწერება — conflict', async () => {
    const a = await repos.content.insert('news', { ...data.news[4], slug: 'f1', featured: true });
    const error = await caught(
      repos.content.insert('news', { ...data.news[5], slug: 'f2', featured: true }),
    );
    expect(error.code).toBe('conflict');
    await repos.content.setFeatured('news', null);
    expect((await repos.content.find(a.id))?.item.featured).toBe(false);
  });

  it('setFeatured — 8 პარალელური გამოძახება: ბოლოს ზუსტად ერთი რჩეული, ისტორია უწყვეტი', async () => {
    await repos.content.setFeatured('articles', null);
    const ids = [];
    for (let i = 0; i < 8; i += 1) {
      ids.push((await repos.content.insert('articles', article(i, { slug: `race-${i}` }))).id);
    }
    // რჩეული ჯერ არ არის — ტრანზაქციები ერთმანეთის დოკუმენტებს არ ეხება (write skew-ის შემთხვევა)
    await Promise.all(ids.map((id) => repos.content.setFeatured('articles', id)));
    const docs = await database.db
      .collection(COLLECTION.content)
      .find({ _id: { $in: /** @type {any} */ (ids) } })
      .toArray();
    expect(docs.filter((doc) => doc.item.featured === true)).toHaveLength(1);
    expect(
      await database.db
        .collection(COLLECTION.content)
        .countDocuments({ type: 'articles', 'item.featured': true }),
    ).toBe(1);
    for (const doc of docs) {
      const history = await repos.content.versions(String(doc._id));
      expect(history.map((v) => v.version)).toEqual(
        Array.from({ length: doc.version - 1 }, (_, i) => doc.version - 1 - i),
      );
    }
  });

  it('setFeatured ატომურია: მეორე ჩაწერის ჩავარდნისას პირველიც უქმდება (failCommand)', async () => {
    const uri = inject('mongoUri');
    const client = new MongoClient(uri, { appName: 'mc-failpoint' });
    await client.connect();
    const failing = createContentRepository(
      { client, db: client.db(database.db.databaseName) },
      { now: clk.now },
    );
    const a = await repos.content.insert('articles', article(8, { slug: 'atomic-a' }));
    const b = await repos.content.insert('articles', article(9, { slug: 'atomic-b' }));
    await repos.content.setFeatured('articles', a.id);
    const before = await database.db.collection(COLLECTION.versions).countDocuments();
    const admin = client.db('admin');
    // პირველი update (A-ს მოხსნა) გადის, მეორე (B-ს მონიშვნა) ვარდება — არატრანზიენტული შეცდომა
    await admin.command({
      configureFailPoint: 'failCommand',
      mode: { skip: 1 },
      data: { failCommands: ['update'], errorCode: 2, appName: 'mc-failpoint' },
    });
    try {
      const error = await caught(failing.setFeatured('articles', b.id));
      expect(error.code).toBe(2);
    } finally {
      await admin.command({ configureFailPoint: 'failCommand', mode: 'off' });
      await client.close();
    }
    expect((await repos.content.find(a.id))?.item.featured).toBe(true);
    expect((await repos.content.find(b.id))?.item.featured).toBe(false);
    expect((await repos.content.find(a.id))?.meta.version).toBe(2);
    expect(await database.db.collection(COLLECTION.versions).countDocuments()).toBe(before);
    await repos.content.setFeatured('articles', null);
  });

  it('list: ჩასმის რიგი; visibleAt — isPublic (დაგეგმილი დროის შემდეგ), უახლესი პირველი', async () => {
    const scheduled = await repos.content.insert('series', {
      ...structuredClone(data.series[2]),
      slug: 'later',
      status: 'scheduled',
      publishedAt: '2026-11-10T11:00:00+04:00',
    });
    const all = await repos.content.list('series');
    expect(all.at(-1)?.id).toBe(scheduled.id);
    const before = await repos.content.list('series', { visibleAt: T0 });
    expect(before.map((r) => r.id)).not.toContain(scheduled.id);
    const after = await repos.content.list('series', {
      visibleAt: Date.parse('2026-11-10T08:00:00Z'),
    });
    expect(after[0].id).toBe(scheduled.id);
    const times = after.map((r) => Date.parse(r.item.publishedAt));
    expect(times).toEqual([...times].sort((x, y) => y - x));
    expect((await caught(repos.content.list(/** @type {any} */ ('posts')))).code).toBe(
      'bad-request',
    );
  });

  it('ინდექსის გამოყენება (explain): slug, საჯარო სია, ძიება, ფაილის გამოყენება', async () => {
    const content = database.db.collection(COLLECTION.content);
    /** @param {any} plan @returns {string[]} */
    const indexes = (plan) => {
      if (!plan || typeof plan !== 'object') return [];
      return [
        plan.indexName,
        ...Object.values(plan).flatMap((v) => (Array.isArray(v) ? v.flatMap(indexes) : indexes(v))),
      ].filter(Boolean);
    };
    /** @param {import('mongodb').FindCursor} cursor */
    const used = async (cursor) =>
      indexes((await cursor.explain('queryPlanner')).queryPlanner.winningPlan);
    expect(await used(content.find({ type: 'articles', slug: 'versioned' }))).toContain(
      'type_slug_unique',
    );
    expect(
      await used(content.find({ type: 'articles', status: 'published' }).sort({ publishedAt: -1 })),
    ).toContain('type_status_publishedAt');
    expect(await used(content.find(/** @type {any} */ (searchFilter('ზრდ'))))).toContain(
      'searchText',
    );
    expect(await used(content.find({ mediaKeys: '2026/11/new photo.jpg' }))).toContain('mediaKeys');
    expect(await used(content.find({}).sort({ updatedAt: -1 }))).toContain('updatedAt_desc');
  });

  it('ბაზის validator → validation + ველის გზა (item-ის მიმართ)', async () => {
    const ratio = await caught(
      repos.content.insert(
        'articles',
        article(10, { slug: 'bad-ratio', cover: { ...data.articles[10].cover, ratio: '2:1' } }),
      ),
    );
    expect(ratio.code).toBe('validation');
    expect(Object.keys(ratio.fields)).toContain('cover.ratio');
    const translated = await caught(
      repos.content.insert(
        'articles',
        article(11, { slug: 'bad-en', translations: { en: { status: 'draft' } } }),
      ),
    );
    expect(Object.keys(translated.fields)).toContain('translations.en.status');
    expect((await caught(repos.content.insert('articles', article(12), { id: 'n-1' }))).code).toBe(
      'bad-request',
    );
  });
});

describe('derive', () => {
  it('mediaKeysOf: მხოლოდ /media/-ის src, უნიკალური, დალაგებული', () => {
    expect(
      mediaKeysOf(
        {
          cover: { src: '/media/b.jpg?w=1' },
          body: [{ type: 'image', image: { src: '/media/a.jpg' } }],
        },
        {
          pdf: { src: '/media/b.jpg' },
          logo: { src: 'https://example.org/x.png' },
          captions: [{ src: null }],
        },
      ),
    ).toEqual(['a.jpg', 'b.jpg']);
  });

  it('searchFilter: ცარიელი → null; სიტყვები — AND, ფუძით', () => {
    expect(searchFilter('  [ ] ')).toBeNull();
    expect(searchFilter('ჩვევა Growth')).toEqual({
      $and: [{ searchText: { $regex: 'ჩვევ' } }, { searchText: { $regex: 'growth' } }],
    });
  });
});

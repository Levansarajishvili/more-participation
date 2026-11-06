import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MOCK_PASSWORD, createMockAdminAdapter } from '@/admin/api/mock.js';
import { CONTENT_TYPES } from '@/admin/content-types.js';
import { createMockData } from '@/content/mock/data.js';
import { createMockStore } from '@/content/mock/store.js';
import { byNewest, isPublic } from '@/content/query.js';
import { matchesQuery } from '@/content/text.js';

import { searchFilter, searchTextOf } from '../../db/derive.js';
import { COLLECTION } from '../../db/collections.js';
import { createRepositories } from '../../db/index.js';

import { DAY, T0, caught, clock, freshDatabase, iso, json } from './helpers.js';

/**
 * B2 parity: იმავე მონაცემზე და იმავე საათით repository-ის შედეგი mock-ის საცავის
 * (`src/content/mock/store.js`) და ადმინის mock-ის (`src/admin/api/mock.js` — ვერსია, სამუშაო ასლი,
 * წაშლა, რჩეული) შედეგს ემთხვევა. საწყისი მდგომარეობა — mock-ის ყველა ჩანაწერი (`adminState`-ის
 * გვერდებითა და დემო-მონახაზებით), ბაზაში `importRecords`-ით.
 *
 * ნორმალიზაცია: მეტას დრო ბაზიდან ISO UTC-ია (`Z`), mock-ში — როგორც ჩაიწერა (`+04:00`) → `iso()`;
 * „ჩვენ შესახებ“ გვერდს ბაზაში `stages` აქვს (B2), mock-ის გვერდს — არა.
 */

/** @param {any} record mock-ის `StoreRecord` */
const fromMock = (record) => ({
  id: record.id,
  item: json(record.item),
  meta: {
    ...record.meta,
    createdAt: iso(record.meta.createdAt),
    updatedAt: iso(record.meta.updatedAt),
  },
});
/** @param {any} record repository-ის `ContentRecord` */
const fromDb = (record) => {
  const { stages: _stages, ...item } = record.item;
  return {
    id: record.id,
    item: record.item.slug === 'about' && record.type === 'pages' ? item : record.item,
    meta: record.meta,
  };
};

describe('parity: repository ↔ mock', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;
  /** @type {ReturnType<typeof createRepositories>} */
  let repos;
  /** @type {ReturnType<typeof createMockStore>} */
  let store;
  /** @type {ReturnType<typeof createMockAdminAdapter>} */
  let admin;
  const clk = clock();
  const data = createMockData({ now: T0 });
  const BY = 'u-001';

  beforeAll(async () => {
    store = createMockStore({ now: clk.now, data: structuredClone(data) });
    admin = createMockAdminAdapter({ store });
    await admin.auth.login({ email: 'admin@example.org', password: MOCK_PASSWORD });
    database = await freshDatabase('parity');
    repos = createRepositories(database, { now: clk.now });
    const records = CONTENT_TYPES.flatMap((type) =>
      store.records(type).map((record) => ({
        id: record.id,
        type,
        item:
          type === 'pages' && /** @type {any} */ (record.item).slug === 'about'
            ? { ...record.item, stages: data.stages }
            : record.item,
        meta: record.meta,
      })),
    );
    await repos.content.importRecords(records);
    await repos.settings.put(store.snapshot().settings);
  });
  afterAll(() => database?.drop());

  it('list ↔ records (ჩასმის რიგი), find, findBySlug — ყველა ტიპი', async () => {
    for (const type of CONTENT_TYPES) {
      const mock = store.records(type).map(fromMock);
      expect((await repos.content.list(type)).map(fromDb), type).toEqual(mock);
      for (const record of store.records(type)) {
        expect(fromDb(await repos.content.find(record.id)), record.id).toEqual(fromMock(record));
        const slug = /** @type {any} */ (record.item).slug;
        expect(fromDb(await repos.content.findBySlug(type, slug)), slug).toEqual(
          fromMock(store.findBySlug(type, slug)),
        );
      }
    }
    expect(await repos.content.find('a-999')).toBe(store.find('articles', 'a-999'));
  });

  it('snapshot ↔ snapshot (გუნდი, პარტნიორები, „ჩვენი გზა“, პარამეტრები)', async () => {
    expect(await repos.snapshot()).toEqual(json(store.snapshot()));
  });

  it('საჯარო სია (visibleAt) ↔ query.js-ის isPublic + byNewest', async () => {
    for (const at of [T0, T0 + 10 * DAY]) {
      for (const type of ['articles', 'series', 'videos', 'news', 'events']) {
        const mock = store
          .records(/** @type {any} */ (type))
          .filter((record) => isPublic(/** @type {any} */ (record.item), at))
          .sort((a, b) => byNewest(/** @type {any} */ (a.item), /** @type {any} */ (b.item)))
          .map((record) => record.id);
        const db = (await repos.content.list(/** @type {any} */ (type), { visibleAt: at })).map(
          (r) => r.id,
        );
        expect(db, `${type} @ ${iso(at)}`).toEqual(mock);
      }
    }
  });

  it('ძიება: searchFilter ბაზაში ≡ matchesQuery(searchText) — ქართული, ფუძე, ინგლისური, slug', async () => {
    const queries = [
      'ზრდა',
      'ჩვევა',
      'პირველი გასაუბრება',
      'Growth',
      'web developer',
      'zrdis',
      'ფორუმ',
      'xyzxyz',
    ];
    const content = database.db.collection(COLLECTION.content);
    for (const q of queries) {
      const expected = CONTENT_TYPES.flatMap((type) => store.records(type))
        .filter((record) => matchesQuery(searchTextOf(/** @type {any} */ (record.item)), q))
        .map((record) => record.id)
        .sort();
      const found = (
        await content
          .find(/** @type {any} */ (searchFilter(q)))
          .project({ _id: 1 })
          .toArray()
      )
        .map((doc) => String(doc._id))
        .sort();
      expect(found, q).toEqual(expected);
      if (q !== 'xyzxyz') expect(found.length, q).toBeGreaterThan(0);
    }
  });

  it('store: insert / replace / ძველი ვერსია / remove — იგივე შედეგი და შეცდომის კოდი', async () => {
    clk.advance();
    const item = { ...json(data.articles[3]), slug: 'parity-insert', featured: false };
    const mock = store.insert('articles', item, { by: BY, id: 'a-500' });
    const db = await repos.content.insert('articles', item, { by: BY, id: 'a-500' });
    expect(fromDb(db)).toEqual(fromMock(mock));

    clk.advance();
    const next = { ...item, title: '[შეცვლილი]' };
    expect(fromDb(await repos.content.replace('a-500', next, { by: BY, version: 1 }))).toEqual(
      fromMock(store.replace('articles', 'a-500', next, { by: BY, version: 1 })),
    );
    let mockError;
    try {
      store.replace('articles', 'a-500', item, { version: 1 });
    } catch (error) {
      mockError = error;
    }
    const dbError = await caught(repos.content.replace('a-500', item, { version: 1 }));
    expect(dbError.code).toBe(/** @type {any} */ (mockError).code);
    expect(dbError.code).toBe('conflict');

    expect(fromDb(await repos.content.remove('a-500'))).toEqual(
      fromMock(store.remove('articles', 'a-500')),
    );
    expect(await repos.content.find('a-500')).toBeNull();
  });

  it('ადმინი: update (ვერსია + ისტორია), stale → 409, autosave → სამუშაო ასლი, შენახვა ასლს შლის', async () => {
    const id = 'a-002';
    const base = (await repos.content.find(id))?.item;
    clk.advance();
    const mock1 = await admin.content.update(id, { title: '[ახალი სათაური]' }, { version: 1 });
    const db1 = await repos.content.replace(
      id,
      { ...base, title: '[ახალი სათაური]' },
      { version: 1, by: BY },
    );
    expect(db1.item).toEqual(json(mock1.item));
    expect([db1.meta.version, db1.meta.updatedAt, db1.meta.updatedBy]).toEqual([
      mock1.version,
      iso(mock1.updatedAt),
      mock1.updatedBy?.id,
    ]);

    const mockStale = await caught(admin.content.update(id, { title: 'x' }, { version: 1 }));
    const dbStale = await caught(
      repos.content.replace(id, { ...db1.item, title: 'x' }, { version: 1 }),
    );
    expect([mockStale.code, dbStale.code]).toEqual(['conflict', 'conflict']);

    clk.advance();
    const mock2 = await admin.content.update(
      id,
      { title: '[სამუშაო]' },
      { version: 2, autosave: true },
    );
    const db2 = await repos.content.saveWorking(
      id,
      { ...db1.item, title: '[სამუშაო]' },
      { version: 2, by: BY },
    );
    expect(db2.meta.version).toBe(mock2.version);
    expect(db2.working?.item).toEqual(json(mock2.working?.item));
    expect([db2.working?.at, db2.working?.by]).toEqual([
      iso(mock2.working?.at ?? 0),
      mock2.working?.by?.id,
    ]);

    clk.advance();
    const mock3 = await admin.content.update(id, { excerpt: '[ახალი აღწერა]' }, { version: 2 });
    const db3 = await repos.content.replace(
      id,
      { ...db1.item, excerpt: '[ახალი აღწერა]' },
      { version: 2, by: BY },
    );
    expect(mock3.working).toBeNull();
    expect(db3.working).toBeNull();
    expect(db3.item).toEqual(json(mock3.item));

    const mockVersions = await admin.content.versions(id);
    const current = await repos.content.find(id);
    const dbVersions = [
      {
        version: current?.meta.version,
        at: current?.meta.updatedAt,
        by: current?.meta.updatedBy,
        title: current?.item.title,
        current: true,
      },
      ...(await repos.content.versions(id)).map((v) => ({
        version: v.version,
        at: v.at,
        by: v.by,
        title: v.item.title,
        current: false,
      })),
    ];
    expect(dbVersions).toEqual(
      mockVersions.map((v) => ({
        version: v.version,
        at: iso(v.at),
        by: v.by?.id ?? null,
        title: v.title,
        current: v.current,
      })),
    );
  });

  it('ადმინი: restoreVersion ↔ restore (ახალი ვერსია, ისტორია)', async () => {
    const id = 'a-002';
    clk.advance();
    const mock = await admin.content.restoreVersion(id, 1);
    const db = await repos.content.restore(id, 1, { by: BY });
    expect(db.item).toEqual(json(mock.item));
    expect([db.meta.version, db.meta.updatedAt]).toEqual([mock.version, iso(mock.updatedAt)]);
    expect((await repos.content.versions(id)).map((v) => [v.version, v.item.title])).toEqual(
      (await admin.content.versions(id)).filter((v) => !v.current).map((v) => [v.version, v.title]),
    );
  });

  it('ადმინი: რჩეული (settings.update) ↔ setFeatured — ყოველი ჩანაწერი, ვერსია, ისტორია', async () => {
    clk.advance();
    const bundle = await admin.settings.update({
      featured: { featuredArticle: 'a-003', weeklyVideo: null },
    });
    await repos.content.setFeatured('articles', 'a-003', { by: BY });
    await repos.content.setFeatured('videos', null, { by: BY });
    expect(bundle.featured.featuredArticle).toBe('a-003');
    expect(bundle.featured.weeklyVideo).toBeNull();
    for (const type of /** @type {const} */ (['articles', 'videos'])) {
      expect((await repos.content.list(type)).map(fromDb), type).toEqual(
        store.records(type).map(fromMock),
      );
      for (const record of store.records(type)) {
        expect((await repos.content.versions(record.id)).length, record.id).toBe(
          (await admin.content.versions(record.id)).length - 1,
        );
      }
    }
  });

  it('ადმინი: remove ↔ remove — მასალა, ვერსიები, სამუშაო ასლი', async () => {
    const id = 'a-002';
    await admin.content.remove(id);
    await repos.content.remove(id);
    expect(store.find('articles', id)).toBeNull();
    expect(admin.state.versions.has(id)).toBe(false);
    expect(await repos.content.find(id)).toBeNull();
    expect(
      await database.db.collection(COLLECTION.versions).countDocuments({ contentId: id }),
    ).toBe(0);
  });

  it('B4: restore მიმდინარე featured-ს ინახავს და setFeatured უცნობ id-ზე not-found-ს აბრუნებს — ორივე მხარეს (B2-ის გადახვევები დაიხურა)', async () => {
    // a-003 ახლა რჩეულია; ვერსია 1-ში — არა. B2-ში mock ძველ `featured`-ს აღადგენდა — B4-ში
    // `records.js`-ის `keepFeatured` ორივე მხარეს ერთი წესია
    clk.advance();
    const mock = await admin.content.restoreVersion('a-003', 1);
    const db = await repos.content.restore('a-003', 1, { by: BY });
    expect(mock.item.featured).toBe(true);
    expect(db.item.featured).toBe(true);
    // B4: უცნობი id-ზე mock-იც `not-found`-ს აბრუნებს ჩაწერამდე (`records.js`, `featuredChanges`)
    const featuredBefore = store
      .records('series')
      .filter((r) => /** @type {any} */ (r.item).featured);
    expect(
      (await caught(admin.settings.update({ featured: { featuredSeries: 's-404' } }))).code,
    ).toBe('not-found');
    expect(store.records('series').filter((r) => /** @type {any} */ (r.item).featured)).toEqual(
      featuredBefore,
    );
    expect((await caught(repos.content.setFeatured('series', 's-404'))).code).toBe('not-found');
  });
});

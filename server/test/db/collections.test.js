import { ObjectId } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMockData } from '@/content/mock/data.js';

import { COLLECTION, DAY_SECONDS, defineCollections } from '../../db/collections.js';
import { newContentId, toContentDoc } from '../../db/content.js';
import { loadSpec } from '../../lib/openapi.js';
import { countChanges, migrate } from '../../migrations/index.js';

import { DAY, T0, freshDatabase, iso } from './helpers.js';

/**
 * B2: მიგრაცია (კოლექციები, validator-ები, ინდექსები, TTL) და validator-ების ქცევა რეალურ
 * MongoDB 8.0-ზე (memory-server, replica set).
 */

const spec = loadSpec();
const HEX = 'a'.repeat(64);
const HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaGhhc2hoYXNoaGFzaA';
const now = new Date(T0);

/** მოსალოდნელი ინდექსები: სახელი → [key, unique, partial, TTL წამი]. */
const EXPECTED_INDEXES = {
  content: {
    type_slug_unique: [{ type: 1, slug: 1 }, true, { slug: { $exists: true } }, undefined],
    type_status_publishedAt: [{ type: 1, status: 1, publishedAt: -1 }, false, null, undefined],
    updatedAt_desc: [{ updatedAt: -1 }, false, null, undefined],
    searchText: [{ searchText: 1 }, false, null, undefined],
    type_createdAt: [{ type: 1, createdAt: 1, _id: 1 }, false, null, undefined],
    type_featured_unique: [{ type: 1 }, true, { 'item.featured': true }, undefined],
    mediaKeys: [{ mediaKeys: 1 }, false, null, undefined],
  },
  versions: {
    contentId_version: [{ contentId: 1, version: -1 }, true, null, undefined],
    // B5: წაშლილი ფაილის `src` ისტორიიდანაც
    mediaKeys: [{ mediaKeys: 1 }, false, null, undefined],
  },
  users: { email_unique: [{ email: 1 }, true, null, undefined] },
  sessions: {
    expiresAt_ttl: [{ expiresAt: 1 }, false, null, 0],
    userId: [{ userId: 1 }, false, null, undefined],
  },
  invites: { expiresAt_ttl: [{ expiresAt: 1 }, false, null, 0] },
  media: {
    key_unique: [{ key: 1 }, true, null, undefined],
    kind_createdAt: [{ kind: 1, createdAt: -1 }, false, null, undefined],
  },
  settings: {},
  messages: { createdAt_ttl: [{ createdAt: 1 }, false, null, 30 * DAY_SECONDS] },
  subscribers: {
    email_unique: [{ email: 1 }, true, null, undefined],
    tokenHash_unique: [{ tokenHash: 1 }, true, { tokenHash: { $type: 'string' } }, undefined],
    expiresAt_ttl_pending: [{ expiresAt: 1 }, false, { status: 'pending' }, 0],
  },
};

describe('მიგრაცია 001-init', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;
  /** @type {Awaited<ReturnType<typeof migrate>>} */
  let first;

  beforeAll(async () => {
    database = await freshDatabase('migrate', { migrate: false });
    first = await migrate(database.db);
  });
  afterAll(() => database?.drop());

  it('პირველი გაშვება: 9 კოლექცია შეიქმნა, validator — strict / error', async () => {
    // B5: 002 — `versions.mediaKeys` ძველ ჩანაწერებზე (ცარიელ ბაზაზე — არაფერი)
    expect(first.map((r) => r.id)).toEqual(['001-init', '002-version-media-keys']);
    expect(first[1].reports).toEqual([{ name: 'versions', collection: 'unchanged', indexes: [] }]);
    expect(first[0].reports.every((r) => r.collection === 'created')).toBe(true);
    const infos = await database.db.listCollections().toArray();
    const names = infos.map((info) => info.name).sort();
    expect(names).toEqual(Object.keys(EXPECTED_INDEXES).sort());
    for (const info of infos) {
      const options = /** @type {any} */ (info).options;
      expect(options.validationLevel, info.name).toBe('strict');
      expect(options.validationAction, info.name).toBe('error');
      expect(options.validator.$jsonSchema.bsonType, info.name).toBe('object');
    }
  });

  it('ინდექსები ზუსტად აღწერილია: key, unique, partial, TTL', async () => {
    for (const [name, wanted] of Object.entries(EXPECTED_INDEXES)) {
      const actual = (await database.db.collection(name).indexes()).filter(
        (i) => i.name !== '_id_',
      );
      expect(actual.map((i) => i.name).sort(), name).toEqual(Object.keys(wanted).sort());
      for (const index of actual) {
        const [key, unique, partial, ttl] = /** @type {any} */ (wanted)[String(index.name)];
        expect(index.key, `${name}.${index.name}`).toEqual(key);
        expect(Boolean(index.unique), `${name}.${index.name}`).toBe(unique);
        expect(index.partialFilterExpression ?? null, `${name}.${index.name}`).toEqual(partial);
        expect(index.expireAfterSeconds, `${name}.${index.name}`).toBe(ttl);
      }
    }
  });

  it('მეორე გაშვება — 0 ცვლილება, ყველაფერი unchanged', async () => {
    const second = await migrate(database.db);
    expect(countChanges(second)).toBe(0);
    for (const report of second[0].reports) {
      expect(report.collection, report.name).toBe('unchanged');
      expect(
        report.indexes.every((i) => i.change === 'unchanged'),
        report.name,
      ).toBe(true);
    }
    expect(countChanges(first)).toBe(9 + 19);
  });

  it('დრეიფი: TTL-ის ვადა (collMod index), validator, ინდექსის ფორმა, ხელით დამატებული ინდექსი', async () => {
    const db = database.db;
    const ttl = await migrate(db, { retention: { messagesDays: 7, versionsKeep: 30 } });
    const messages = ttl[0].reports.find((r) => r.name === 'messages');
    expect(messages?.indexes).toEqual([{ name: 'createdAt_ttl', change: 'updated' }]);
    expect(countChanges(ttl)).toBe(1);
    const index = (await db.collection('messages').indexes()).find(
      (i) => i.name === 'createdAt_ttl',
    );
    expect(index?.expireAfterSeconds).toBe(7 * DAY_SECONDS);

    await db.command({ collMod: 'content', validator: {} });
    await db.collection('sessions').dropIndex('userId');
    await db.collection('sessions').createIndex({ userId: 1 }, { name: 'userId', unique: true });
    await db.collection('media').createIndex({ title: 1 }, { name: 'manual_title' });

    const back = await migrate(db);
    const byName = Object.fromEntries(back[0].reports.map((r) => [r.name, r]));
    expect(byName.content.collection).toBe('updated');
    expect(byName.messages.indexes).toEqual([{ name: 'createdAt_ttl', change: 'updated' }]);
    expect(byName.sessions.indexes).toContainEqual({ name: 'userId', change: 'replaced' });
    expect(byName.media.indexes).toContainEqual({ name: 'manual_title', change: 'extra' });
    const sessionIndex = (await db.collection('sessions').indexes()).find(
      (i) => i.name === 'userId',
    );
    expect(sessionIndex?.unique).toBeUndefined();
    expect(countChanges(await migrate(db))).toBe(0);
  });
});

describe('validator-ები', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;
  const data = createMockData({ now: T0 });

  beforeAll(async () => {
    database = await freshDatabase('validators');
  });
  afterAll(() => database?.drop());

  /**
   * @param {string} name
   * @param {Record<string, any>} doc
   * @returns {Promise<'ok' | number>}
   */
  async function write(name, doc) {
    try {
      // structuredClone ObjectId-ს ჩვეულებრივ ობიექტად აქცევდა — ზედაპირული ასლი საკმარისია
      await database.db.collection(name).insertOne({ ...doc });
      await database.db.collection(name).deleteOne({ _id: doc._id });
      return 'ok';
    } catch (error) {
      return /** @type {any} */ (error).code;
    }
  }

  /** @param {string} type @param {Record<string, any>} item @param {string} [id] */
  const contentDoc = (type, item, id = newContentId(/** @type {any} */ (type))) =>
    toContentDoc({
      id,
      type: /** @type {any} */ (type),
      item,
      meta: { version: 1, createdAt: iso(T0), updatedAt: iso(T0), updatedBy: null },
    });

  const user = {
    _id: 'u-001',
    name: '[სახელი გვარი]',
    email: 'admin@example.org',
    passwordHash: HASH,
    role: 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  const session = {
    _id: HEX,
    userId: 'u-001',
    csrfHash: 'b'.repeat(64),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(T0 + 30 * 60_000),
    maxExpiresAt: new Date(T0 + 12 * 3_600_000),
  };
  const invite = {
    _id: HEX,
    role: 'editor',
    email: null,
    createdAt: now,
    createdBy: 'u-001',
    expiresAt: new Date(T0 + 7 * DAY),
    usedAt: null,
    usedBy: null,
  };
  const media = {
    _id: 'm-0001',
    kind: 'image',
    key: '2026/11/photo.jpg',
    mime: 'image/jpeg',
    size: 120_000,
    title: '',
    alt: '[ფოტოს აღწერა]',
    ratio: '3:2',
    width: 1200,
    height: 800,
    lang: null,
    tagged: null,
    createdAt: now,
    createdBy: 'u-001',
  };
  const settings = {
    _id: 'site',
    item: data.settings,
    version: 1,
    updatedAt: now,
    updatedBy: null,
  };
  const message = {
    _id: new ObjectId(),
    name: '[სახელი]',
    contact: 'person@example.org',
    topic: 'general',
    message: '[შეტყობინება]',
    support: '[მარტივი ენა]',
    replyVia: 'email',
    consent: true,
    lang: 'ka',
    createdAt: now,
    sentAt: null,
  };
  const pending = {
    _id: new ObjectId(),
    email: 'reader@example.org',
    status: 'pending',
    tokenHash: HEX,
    expiresAt: new Date(T0 + 7 * DAY),
    confirmedAt: null,
    source: 'footer',
    lang: 'ka',
    createdAt: now,
  };
  const confirmed = {
    ...pending,
    _id: new ObjectId(),
    status: 'confirmed',
    tokenHash: null,
    expiresAt: null,
    confirmedAt: now,
  };

  it('ვალიდური დოკუმენტი ყოველ კოლექციაში ჩაიწერება', async () => {
    expect(await write('users', user)).toBe('ok');
    expect(await write('sessions', session)).toBe('ok');
    expect(await write('invites', invite)).toBe('ok');
    expect(await write('media', media)).toBe('ok');
    expect(await write('settings', settings)).toBe('ok');
    expect(await write('messages', message)).toBe('ok');
    expect(await write('subscribers', pending)).toBe('ok');
    expect(await write('subscribers', confirmed)).toBe('ok');
    for (const type of /** @type {const} */ (['articles', 'series', 'videos', 'news', 'events'])) {
      expect(await write('content', contentDoc(type, data[type][0])), type).toBe('ok');
    }
    expect(
      await write('versions', {
        _id: new ObjectId(),
        contentId: 'a-001',
        type: 'articles',
        version: 1,
        item: data.articles[0],
        at: now,
        by: null,
        mediaKeys: [],
      }),
    ).toBe('ok');
  });

  /** @type {[string, string, Record<string, any>][]} */
  const INVALID = [
    ['users', 'bcrypt-ის hash (argon2id მხოლოდ)', { ...user, passwordHash: '$2b$12$abc' }],
    ['users', 'ნორმალიზებული ელფოსტა', { ...user, email: 'Admin@Example.org' }],
    ['users', 'უცნობი როლი', { ...user, role: 'owner' }],
    ['users', 'ღია პაროლი', { ...user, password: 'mc-dev-password' }],
    ['sessions', 'token hash-ის გარეშე', { ...session, _id: 'raw-session-token' }],
    ['sessions', 'ვადა სტრიქონია (TTL Date-ს ითხოვს)', { ...session, expiresAt: iso(T0) }],
    ['invites', 'კოდი ღიად', { ...invite, _id: 'MC-INVITE-0001' }],
    ['media', 'უცნობი სახე', { ...media, kind: 'video' }],
    ['media', 'ზომა მთელი არ არის', { ...media, size: 1.5 }],
    ['media', 'პროპორცია', { ...media, ratio: '2:1' }],
    ['settings', 'მეორე დოკუმენტი', { ...settings, _id: 'other' }],
    [
      'settings',
      'უცნობი სოციალური ქსელი',
      { ...settings, item: { ...data.settings, social: [{ network: 'myspace', url: null }] } },
    ],
    [
      'settings',
      'თარგმანში არატექსტური ველი (ელფოსტა)',
      {
        ...settings,
        item: { ...data.settings, translations: { en: { contacts: { email: 'x@y.z' } } } },
      },
    ],
    ['messages', 'honeypot არ ინახება', { ...message, website: 'http://spam' }],
    ['messages', 'თანხმობის გარეშე', { ...message, consent: false }],
    ['messages', 'დიაგნოზის ველი არ არსებობს', { ...message, diagnosis: '[x]' }],
    ['messages', 'უცნობი თემა', { ...message, topic: 'other' }],
    ['subscribers', 'pending ბმულის hash-ის გარეშე', { ...pending, tokenHash: null }],
    ['subscribers', 'confirmed ვადით (TTL წაშლიდა)', { ...confirmed, expiresAt: now }],
    ['subscribers', 'ელფოსტა ნორმალიზებული არ არის', { ...pending, email: 'Reader@Example.org' }],
    [
      'content',
      'id-ის პრეფიქსი ტიპს არ ემთხვევა',
      contentDoc('articles', data.articles[0], 'n-x1'),
    ],
    ['content', 'სიახლე სტატიის ტიპით', contentDoc('articles', data.news[0])],
    ['content', 'სტატუსი', contentDoc('articles', { ...data.articles[0], status: 'archived' })],
    [
      'content',
      'ფოტოს პროპორცია',
      contentDoc('articles', {
        ...data.articles[0],
        cover: { ...data.articles[0].cover, ratio: '2:1' },
      }),
    ],
    [
      'content',
      'თარგმანში სტატუსი',
      contentDoc('articles', { ...data.articles[0], translations: { en: { status: 'draft' } } }),
    ],
    ['content', 'ზედა დონის უცნობი ველი', { ...contentDoc('news', data.news[1]), extra: 1 }],
    [
      'content',
      'სამუშაო ასლი არასწორია',
      {
        ...contentDoc('videos', data.videos[1]),
        working: { item: { ...data.videos[1], youtube: 'abc' }, at: now, by: null },
      },
    ],
    [
      'versions',
      'ვერსიის item სხვა ტიპისაა',
      {
        _id: new ObjectId(),
        contentId: 'a-001',
        type: 'articles',
        version: 1,
        item: data.videos[0],
        at: now,
        by: null,
      },
    ],
  ];

  it.each(INVALID)('%s — უარყოფილია: %s', async (name, _label, doc) => {
    expect(await write(name, doc)).toBe(121);
  });
});

describe('TTL (MongoDB-ის ფონური წაშლა)', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;

  beforeAll(async () => {
    database = await freshDatabase('ttl');
    // ნაგულისხმევი 60 წმ — ტესტში 1 წმ (სერვერის პარამეტრი, მონაცემს არ ცვლის)
    await database.db.admin().command({ setParameter: 1, ttlMonitorSleepSecs: 1 });
  });
  afterAll(async () => {
    await database?.db.admin().command({ setParameter: 1, ttlMonitorSleepSecs: 60 });
    await database?.drop();
  });

  it('ვადაგასული სესია, მოწვევა, შეტყობინება და pending-გამოწერა იშლება; დანარჩენი რჩება', async () => {
    const db = database.db;
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + DAY);
    const base = { csrfHash: HEX, createdAt: past, lastSeenAt: past, maxExpiresAt: future };
    await db.collection(COLLECTION.sessions).insertMany([
      { _id: '1'.repeat(64), userId: 'u-001', ...base, expiresAt: past },
      { _id: '2'.repeat(64), userId: 'u-001', ...base, expiresAt: future },
    ]);
    const invite = {
      role: 'editor',
      email: null,
      createdAt: past,
      createdBy: null,
      usedAt: null,
      usedBy: null,
    };
    await db.collection(COLLECTION.invites).insertMany([
      { _id: '3'.repeat(64), ...invite, expiresAt: past },
      { _id: '4'.repeat(64), ...invite, expiresAt: future },
    ]);
    const message = {
      name: 'ა',
      contact: 'a@b.ge',
      topic: 'general',
      message: 'ბ',
      replyVia: 'email',
      consent: true,
      lang: 'ka',
      sentAt: null,
    };
    await db.collection(COLLECTION.messages).insertMany([
      { ...message, createdAt: new Date(Date.now() - 31 * DAY) },
      { ...message, createdAt: new Date() },
    ]);
    const subscriber = { source: 'footer', lang: 'ka', createdAt: past };
    await db.collection(COLLECTION.subscribers).insertMany([
      {
        email: 'old@example.org',
        status: 'pending',
        tokenHash: '5'.repeat(64),
        expiresAt: past,
        confirmedAt: null,
        ...subscriber,
      },
      {
        email: 'new@example.org',
        status: 'pending',
        tokenHash: '6'.repeat(64),
        expiresAt: future,
        confirmedAt: null,
        ...subscriber,
      },
      {
        email: 'yes@example.org',
        status: 'confirmed',
        tokenHash: null,
        expiresAt: null,
        confirmedAt: past,
        ...subscriber,
      },
    ]);

    const counts = async () => [
      await db.collection(COLLECTION.sessions).countDocuments(),
      await db.collection(COLLECTION.invites).countDocuments(),
      await db.collection(COLLECTION.messages).countDocuments(),
      await db.collection(COLLECTION.subscribers).countDocuments(),
    ];
    const until = Date.now() + 20_000;
    while (Date.now() < until && (await counts()).join() !== '1,1,1,2') {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    expect(await counts()).toEqual([1, 1, 1, 2]);
    const left = await db.collection(COLLECTION.subscribers).find().toArray();
    expect(left.map((s) => s.email).sort()).toEqual(['new@example.org', 'yes@example.org']);
  }, 30_000);
});

it('defineCollections: შეტყობინების TTL env-იდან (retention)', () => {
  const [messages] = defineCollections({
    spec,
    retention: { messagesDays: 3, versionsKeep: 30 },
  }).filter((c) => c.name === 'messages');
  expect(messages.indexes[0].expireAfterSeconds).toBe(3 * DAY_SECONDS);
});

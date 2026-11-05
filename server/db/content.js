import { ObjectId } from 'mongodb';

import { CONTENT_TYPES } from '@/admin/content-types.js';
import { ContentError } from '@/content/errors.js';
import { ID_PREFIX } from '@/content/mock/store.js';

import { COLLECTION, DEFAULT_RETENTION } from './collections.js';
import { derivedFields, plain } from './derive.js';
import { mapWriteError } from './errors.js';

/**
 * `content` + `versions` — repository (B2). სემანტიკა `src/content/mock/store.js`-ისა და
 * `src/admin/api/mock.js`-ის `save`-ისაა (parity-ტესტი: `test/db/parity.test.js`):
 *
 * | აქ | mock | შეცდომა |
 * |---|---|---|
 * | `list(type)` | `store.records(name)` (ჩასმის რიგი) | `bad-request` (უცნობი ტიპი) |
 * | `find(id)` / `findBySlug(type, slug)` | `store.find` / `store.findBySlug` | — (null) |
 * | `insert` | `store.insert` | `validation` (slug), `conflict` |
 * | `replace(id, item, { version })` | admin `save` (`store.replace` + ისტორია + სამუშაო ასლის წაშლა) | `not-found`, `conflict` |
 * | `saveWorking` | admin `update({ autosave })` → `state.working` | `not-found`, `conflict` |
 * | `remove` | `store.remove` + `state.versions` / `working` | `not-found` |
 * | `versions` / `restore` | `state.versions` / `restoreVersion` | `not-found` |
 * | `setFeatured` | admin `setFeatured` (settings) | `not-found`, `bad-request` (ტიპს რჩეული არ აქვს) |
 *
 * გადახვევები (დოკუმენტირებული, ტესტით): `restore` მიმდინარე `featured`-ს ინახავს (რჩეული
 * პარამეტრებიდან იმართება); `setFeatured` არარსებულ id-ზე `not-found`-ს აბრუნებს (mock ყველას
 * ხსნიდა); ვერსია ბოლო `keepVersions` ინახება (B0 #10); ცარიელი slug-ით `findBySlug` → null.
 *
 * ჩაწერა, რომელიც ისტორიასაც ცვლის, ტრანზაქციაშია (replica set; `withTransaction` WriteConflict-ზე
 * თავიდან ცდის). 409: `updateOne({ _id, version }, …)` → `matchedCount: 0` → `conflict`.
 */

/** @typedef {import('@/admin/content-types.js').ContentType} ContentType */

/**
 * @typedef {object} ContentMeta
 * @property {number} version
 * @property {string} createdAt   ISO (UTC)
 * @property {string} updatedAt   ISO (UTC)
 * @property {string | null} updatedBy
 */

/**
 * @typedef {object} WorkingCopy
 * @property {Record<string, any>} item
 * @property {string} at   ISO (UTC)
 * @property {string | null} by
 */

/**
 * @typedef {object} ContentRecord
 * @property {string} id
 * @property {ContentType} type
 * @property {Record<string, any>} item
 * @property {ContentMeta} meta
 * @property {WorkingCopy | null} working
 */

/**
 * @typedef {object} VersionEntry
 * @property {number} version
 * @property {string} at
 * @property {string | null} by
 * @property {Record<string, any>} item
 */

/** @typedef {{ version: number, at: string, by: string | null, item: Record<string, any> }} HistoryInput */

/**
 * ტიპები, რომლებსაც „რჩეული“ აქვს — ადმინის mock-ის `FEATURED` (`weeklyVideo`, `featuredArticle`,
 * `featuredSeries`, `featuredNews`); `*Draft`-ში `featured` მხოლოდ მათ აქვს (ტესტით).
 * @type {readonly ContentType[]}
 */
export const FEATURED_TYPES = Object.freeze(['articles', 'series', 'videos', 'news']);

/**
 * @param {ContentType} type
 * @returns {string}  `a-` + ObjectId (დროით დალაგებადი; seed — mock-ის `a-001`)
 */
export function newContentId(type) {
  return `${ID_PREFIX[type]}-${new ObjectId().toHexString()}`;
}

/**
 * @param {string} id
 * @returns {ContentType | null}
 */
export function typeOfId(id) {
  const prefix = String(id).split('-')[0];
  return CONTENT_TYPES.find((type) => ID_PREFIX[type] === prefix) ?? null;
}

/**
 * ჩანაწერი → ბაზის დოკუმენტი (გამოთვლადი ველებით).
 * @param {{ id: string, type: ContentType, item: object, meta: ContentMeta, working?: WorkingCopy | null }} record
 * @returns {Record<string, any>}
 */
export function toContentDoc({ id, type, item, meta, working = null }) {
  const value = plain(/** @type {Record<string, any>} */ (item));
  const work = working
    ? { item: plain(working.item), at: new Date(working.at), by: working.by ?? null }
    : null;
  const derived = derivedFields(value, work?.item ?? null);
  return {
    _id: id,
    type,
    ...(derived.slug !== null && { slug: derived.slug }),
    status: derived.status,
    publishedAt: derived.publishedAt,
    item: value,
    version: meta.version,
    createdAt: new Date(meta.createdAt),
    updatedAt: new Date(meta.updatedAt),
    updatedBy: meta.updatedBy ?? null,
    working: work,
    searchText: derived.searchText,
    mediaKeys: derived.mediaKeys,
  };
}

/**
 * @param {Record<string, any>} doc
 * @returns {ContentRecord}
 */
export function toContentRecord(doc) {
  return {
    id: doc._id,
    type: doc.type,
    item: doc.item,
    meta: {
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      updatedBy: doc.updatedBy ?? null,
    },
    working: doc.working
      ? { item: doc.working.item, at: doc.working.at.toISOString(), by: doc.working.by ?? null }
      : null,
  };
}

/**
 * საჯარო ხილვადობა — `query.js`-ის `isPublic`: გამოქვეყნებული ან დაგეგმილი, რომლის დრო დადგა.
 * @param {ContentType} type
 * @param {number} at  ms
 */
export function publicFilter(type, at) {
  return {
    type,
    $or: [{ status: 'published' }, { status: 'scheduled', publishedAt: { $lte: new Date(at) } }],
  };
}

/**
 * @param {import('mongodb').MongoClient} client
 * @param {(session: import('mongodb').ClientSession) => Promise<any>} work
 */
export async function inTransaction(client, work) {
  const session = client.startSession();
  try {
    /** @type {any} */
    let result;
    await session.withTransaction(
      async () => {
        result = await work(session);
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
    );
    return result;
  } catch (error) {
    throw mapWriteError(error);
  } finally {
    await session.endSession();
  }
}

/**
 * @typedef {object} ContentRepository
 * @property {(type: ContentType, options?: { visibleAt?: number }) => Promise<ContentRecord[]>} list
 *   ჩასმის რიგით; `visibleAt` — მხოლოდ საჯაროდ ხილული, უახლესი პირველი
 * @property {(id: string) => Promise<ContentRecord | null>} find
 * @property {(type: ContentType, slug: string) => Promise<ContentRecord | null>} findBySlug
 * @property {(type: ContentType, item: object, options?: { by?: string | null, id?: string }) => Promise<ContentRecord>} insert
 * @property {(records: { id: string, type: ContentType, item: object, meta: ContentMeta, working?: WorkingCopy | null }[], options?: { session?: import('mongodb').ClientSession }) => Promise<number>} importRecords
 *   seed / ტესტი: ჩანაწერი id-ით და მეტათი, როგორც არის
 * @property {(id: string, item: object, options?: { by?: string | null, version?: number }) => Promise<ContentRecord>} replace
 * @property {(id: string, item: object, options?: { by?: string | null, version?: number }) => Promise<ContentRecord>} saveWorking
 * @property {(id: string) => Promise<ContentRecord>} remove   აბრუნებს წაშლილს
 * @property {(id: string) => Promise<VersionEntry[]>} versions   ისტორია, უახლესი პირველი (მიმდინარის გარეშე)
 * @property {(id: string, version: number, options?: { by?: string | null }) => Promise<ContentRecord>} restore
 * @property {(type: ContentType, id: string | null, options?: { by?: string | null }) => Promise<ContentRecord[]>} setFeatured
 *   აბრუნებს შეცვლილ ჩანაწერებს
 */

/**
 * @param {{ client: import('mongodb').MongoClient, db: import('mongodb').Db }} database
 * @param {{ now?: () => number, keepVersions?: number }} [options]
 * @returns {ContentRepository}
 */
export function createContentRepository(
  { client, db },
  { now = Date.now, keepVersions = DEFAULT_RETENTION.versionsKeep } = {},
) {
  const content = db.collection(COLLECTION.content);
  const versions = db.collection(COLLECTION.versions);

  /** @param {unknown} type */
  function assertType(type) {
    if (!CONTENT_TYPES.includes(/** @type {ContentType} */ (type))) {
      throw new ContentError('bad-request', { detail: `content type: ${String(type)}` });
    }
  }

  /**
   * @param {string} id
   * @param {import('mongodb').ClientSession} [session]
   */
  async function required(id, session) {
    const doc = await content.findOne({ _id: /** @type {any} */ (id) }, { session });
    if (!doc) throw new ContentError('not-found', { detail: `content/${id}` });
    return doc;
  }

  /**
   * ვერსიის ისტორიის ჭრა: ბოლო `keepVersions` (B0 #10), იმავე ტრანზაქციაში.
   * @param {import('mongodb').ClientSession} session
   * @param {string} contentId
   */
  async function trimVersions(session, contentId) {
    if (!keepVersions) return;
    const cutoff = await versions
      .find({ contentId }, { session, projection: { version: 1 } })
      .sort({ version: -1 })
      .skip(keepVersions)
      .limit(1)
      .next();
    if (cutoff)
      await versions.deleteMany({ contentId, version: { $lte: cutoff.version } }, { session });
  }

  /**
   * ახალი ვერსია: წინა მდგომარეობა ისტორიაში, `item` იცვლება, სამუშაო ასლი იშლება
   * (ადმინის mock-ის `save`). ტრანზაქციის შიგნით.
   * @param {import('mongodb').ClientSession} session
   * @param {Record<string, any>} doc   მიმდინარე დოკუმენტი
   * @param {object} item
   * @param {string | null} by
   */
  async function writeNext(session, doc, item, by) {
    const at = new Date(now());
    const value = plain(/** @type {Record<string, any>} */ (item));
    const derived = derivedFields(value, null);
    const set = {
      status: derived.status,
      publishedAt: derived.publishedAt,
      item: value,
      updatedAt: at,
      updatedBy: by,
      working: null,
      searchText: derived.searchText,
      mediaKeys: derived.mediaKeys,
    };
    const update =
      derived.slug !== null
        ? { $set: { ...set, slug: derived.slug }, $inc: { version: 1 } }
        : { $set: set, $unset: { slug: '' }, $inc: { version: 1 } };
    const result = await content.updateOne({ _id: doc._id, version: doc.version }, update, {
      session,
    });
    if (result.matchedCount === 0) {
      throw new ContentError('conflict', { detail: `${doc._id}: version ${doc.version}` });
    }
    await versions.insertOne(
      {
        contentId: doc._id,
        type: doc.type,
        version: doc.version,
        item: doc.item,
        at: doc.updatedAt,
        by: doc.updatedBy ?? null,
      },
      { session },
    );
    await trimVersions(session, doc._id);
    const { slug: _slug, ...rest } = doc;
    return toContentRecord({
      ...rest,
      ...(derived.slug !== null && { slug: derived.slug }),
      ...set,
      version: doc.version + 1,
    });
  }

  return {
    async list(type, { visibleAt } = {}) {
      assertType(type);
      const cursor =
        visibleAt === undefined
          ? content.find({ type }).sort({ createdAt: 1, _id: 1 })
          : content.find(publicFilter(type, visibleAt)).sort({ publishedAt: -1, _id: 1 });
      return (await cursor.toArray()).map(toContentRecord);
    },

    async find(id) {
      const doc = await content.findOne({ _id: /** @type {any} */ (id) });
      return doc ? toContentRecord(doc) : null;
    },

    async findBySlug(type, slug) {
      assertType(type);
      if (typeof slug !== 'string' || !slug.trim()) return null;
      const doc = await content.findOne({ type, slug });
      return doc ? toContentRecord(doc) : null;
    },

    async insert(type, item, { by = null, id } = {}) {
      assertType(type);
      if (id !== undefined && typeOfId(id) !== type) {
        throw new ContentError('bad-request', { detail: `id ${id} ≠ ${type}` });
      }
      const at = new Date(now()).toISOString();
      const doc = toContentDoc({
        id: id ?? newContentId(type),
        type,
        item,
        meta: { version: 1, createdAt: at, updatedAt: at, updatedBy: by },
      });
      try {
        await content.insertOne(doc);
      } catch (error) {
        throw mapWriteError(error);
      }
      return toContentRecord(doc);
    },

    async importRecords(records, { session } = {}) {
      if (!records.length) return 0;
      for (const record of records) assertType(record.type);
      try {
        const result = await content.insertMany(records.map(toContentDoc), {
          session,
          ordered: true,
        });
        return result.insertedCount;
      } catch (error) {
        throw mapWriteError(error);
      }
    },

    replace(id, item, { by = null, version } = {}) {
      return inTransaction(client, async (session) => {
        const doc = await required(id, session);
        if (version !== undefined && version !== doc.version) {
          throw new ContentError('conflict', {
            detail: `${id}: version ${version} ≠ ${doc.version}`,
          });
        }
        return writeNext(session, doc, item, by);
      });
    },

    async saveWorking(id, item, { by = null, version } = {}) {
      const doc = await required(id);
      if (version !== undefined && version !== doc.version) {
        throw new ContentError('conflict', {
          detail: `${id}: version ${version} ≠ ${doc.version}`,
        });
      }
      const working = { item: plain(item), at: new Date(now()), by };
      try {
        const result = await content.updateOne(
          { _id: doc._id, version: doc.version },
          { $set: { working, mediaKeys: derivedFields(doc.item, working.item).mediaKeys } },
        );
        if (result.matchedCount === 0) {
          throw new ContentError('conflict', { detail: `${id}: changed during autosave` });
        }
      } catch (error) {
        throw mapWriteError(error);
      }
      return toContentRecord({ ...doc, working });
    },

    remove(id) {
      return inTransaction(client, async (session) => {
        const doc = await required(id, session);
        await content.deleteOne({ _id: doc._id }, { session });
        await versions.deleteMany({ contentId: doc._id }, { session });
        return toContentRecord(doc);
      });
    },

    async versions(id) {
      await required(id);
      const docs = await versions.find({ contentId: id }).sort({ version: -1 }).toArray();
      return docs.map((doc) => ({
        version: doc.version,
        at: doc.at.toISOString(),
        by: doc.by ?? null,
        item: doc.item,
      }));
    },

    restore(id, version, { by = null } = {}) {
      return inTransaction(client, async (session) => {
        const doc = await required(id, session);
        const old = await versions.findOne({ contentId: id, version }, { session });
        if (!old) throw new ContentError('not-found', { detail: `${id}: version ${version}` });
        const item = structuredClone(old.item);
        // რჩეული პარამეტრებიდან იმართება — ძველი ვერსიის აღდგენა მას არ ცვლის
        if ('featured' in doc.item) item.featured = doc.item.featured;
        else delete item.featured;
        return writeNext(session, doc, item, by);
      });
    },

    async setFeatured(type, id, { by = null } = {}) {
      assertType(type);
      if (!FEATURED_TYPES.includes(type)) {
        throw new ContentError('bad-request', { detail: `featured: ${type}` });
      }
      return inTransaction(client, async (session) => {
        if (id !== null) {
          const target = await content.findOne({ _id: /** @type {any} */ (id) }, { session });
          if (!target || target.type !== type) {
            throw new ContentError('not-found', { detail: `featured ${type}: ${id}` });
          }
        }
        const docs = await content
          .find(
            { type, $or: [{ 'item.featured': true }, ...(id !== null ? [{ _id: id }] : [])] },
            { session },
          )
          .sort({ createdAt: 1, _id: 1 })
          .toArray();
        /** @type {ContentRecord[]} */
        const changed = [];
        // ჯერ მოხსნა, მერე მონიშვნა — `type_featured_unique` ტრანზაქციის შიგნითაც მოქმედებს
        for (const doc of docs) {
          if (doc._id !== id && doc.item.featured === true) {
            changed.push(await writeNext(session, doc, { ...doc.item, featured: false }, by));
          }
        }
        const target = docs.find((doc) => doc._id === id);
        if (target && target.item.featured !== true) {
          changed.push(await writeNext(session, target, { ...target.item, featured: true }, by));
        }
        return changed;
      });
    },
  };
}

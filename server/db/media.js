import { ObjectId } from 'mongodb';

import { ContentError } from '@/content/errors.js';

import { mediaSrc } from '../storage/keys.js';

import { COLLECTION } from './collections.js';
import { inTransaction } from './content.js';
import { mapWriteError } from './errors.js';

/**
 * `media` — ატვირთული ფაილების რეესტრი (B5; B2-ის კოლექცია). ფაილი საცავშია (`storage`), აქ —
 * გასაღები, MIME, ზომა, სათაური, ატვირთვისას მიცემული alt (შემოთავაზება), პროპორცია, PDF-ის ენა /
 * tagged, VTT-ის `cues` / `end`. ავტორიტეტული alt მასალაშია (B2-ის გადაწყვეტილება); ბიბლიოთეკის
 * ხედი — `src/admin/api/library.js` (`FileRecord`).
 *
 * წაშლა ტრანზაქციაშია: გამოყენების შემოწმება (`content.mediaKeys`) → ჩანაწერი → ძველი ვერსიების
 * `src` → null. საცავიდან ფაილს route შლის ტრანზაქციის შემდეგ.
 */

/**
 * @typedef {object} MediaDoc
 * @property {string} _id
 * @property {'image' | 'document' | 'track'} kind
 * @property {string} key
 * @property {string} mime
 * @property {number} size
 * @property {string} title
 * @property {string} alt
 * @property {import('@/content/model.js').Ratio | null} ratio
 * @property {number | null} width
 * @property {number | null} height
 * @property {'ka' | 'en' | null} lang
 * @property {boolean | null} tagged
 * @property {number | null} cues
 * @property {number | null} end
 * @property {Date} createdAt
 * @property {string | null} createdBy
 */

/** @returns {string} */
export const newMediaId = () => `m-${new ObjectId().toHexString()}`;

/**
 * @param {MediaDoc} doc
 * @returns {import('@/admin/api/library.js').FileRecord & { key: string, mime: string }}
 */
export function toFileRecord(doc) {
  return {
    id: doc._id,
    kind: doc.kind,
    key: doc.key,
    mime: doc.mime,
    src: mediaSrc(doc.key),
    size: doc.size,
    title: doc.title ?? '',
    alt: doc.alt ?? '',
    ratio: doc.ratio ?? null,
    lang: doc.lang ?? null,
    tagged: doc.tagged ?? null,
    cues: doc.cues ?? null,
    end: doc.end ?? null,
  };
}

/**
 * @param {{ client: import('mongodb').MongoClient, db: import('mongodb').Db }} database
 * @param {{ now?: () => number, content: import('./content.js').ContentRepository }} options
 */
export function createMediaRepository({ client, db }, { now = Date.now, content }) {
  const media = /** @type {import('mongodb').Collection<MediaDoc>} */ (
    db.collection(COLLECTION.media)
  );

  return {
    /**
     * @param {Omit<MediaDoc, '_id' | 'createdAt'>} input
     * @returns {Promise<MediaDoc>}
     */
    async insert(input) {
      /** @type {MediaDoc} */
      const doc = { _id: newMediaId(), ...input, createdAt: new Date(now()) };
      try {
        await media.insertOne(doc);
      } catch (error) {
        throw mapWriteError(error);
      }
      return doc;
    },

    /** @param {string} id */
    find(id) {
      return media.findOne({ _id: id });
    },

    /** @param {string} key */
    findByKey(key) {
      return media.findOne({ key });
    },

    /** @param {string[]} keys */
    findByKeys(keys) {
      return keys.length ? media.find({ key: { $in: keys } }).toArray() : Promise.resolve([]);
    },

    /** ატვირთვის რიგით (mock-ის `uploads`). */
    list() {
      return media.find({}).sort({ createdAt: 1, _id: 1 }).toArray();
    },

    /**
     * @param {string} id
     * @param {Partial<Pick<MediaDoc, 'alt' | 'title' | 'lang' | 'tagged'>>} set
     */
    async update(id, set) {
      if (!Object.keys(set).length) return this.find(id);
      try {
        return await media.findOneAndUpdate(
          { _id: id },
          { $set: set },
          { returnDocument: 'after' },
        );
      } catch (error) {
        throw mapWriteError(error);
      }
    },

    /**
     * წაშლა ტრანზაქციაში: გამოყენებული → `conflict` (`inUse(count)`), ძველი ვერსიების `src` → null.
     * @param {string} id
     * @param {(count: number) => Error} inUse
     * @returns {Promise<{ doc: MediaDoc, scrubbed: number }>}
     */
    remove(id, inUse) {
      return inTransaction(client, async (session) => {
        const doc = await media.findOne({ _id: id }, { session });
        if (!doc) throw new ContentError('not-found', { detail: `media/${id}` });
        const used = await content.usageCount(doc.key, { session });
        if (used) throw inUse(used);
        await media.deleteOne({ _id: id }, { session });
        const scrubbed = await content.scrubHistory(doc.key, { session });
        return { doc, scrubbed };
      });
    },
  };
}

/** @typedef {ReturnType<typeof createMediaRepository>} MediaRepository */

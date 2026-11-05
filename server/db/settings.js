import { ContentError } from '@/content/errors.js';

import { COLLECTION, SETTINGS_ID } from './collections.js';
import { plain } from './derive.js';
import { mapWriteError } from './errors.js';

/**
 * `settings` — საიტის პარამეტრების ერთი დოკუმენტი (`_id: 'site'`): `item` = `SiteSettings`
 * (`translations.en`-ის ჩათვლით), ვერსია, დრო, ავტორი. რჩეული მასალა აქ არ ინახება — ის
 * `content`-ის `item.featured`-ია (`setFeatured`), როგორც mock-ის `settingsBundle`-ში.
 */

/**
 * @typedef {object} SettingsRecord
 * @property {Record<string, any>} item
 * @property {{ version: number, updatedAt: string, updatedBy: string | null }} meta
 */

/**
 * @param {Record<string, any>} item
 * @param {{ version: number, updatedAt: Date, updatedBy: string | null }} meta
 */
export function toSettingsDoc(item, { version, updatedAt, updatedBy }) {
  return { _id: SETTINGS_ID, item: plain(item), version, updatedAt, updatedBy };
}

/**
 * @param {{ db: import('mongodb').Db }} database
 * @param {{ now?: () => number }} [options]
 */
export function createSettingsRepository({ db }, { now = Date.now } = {}) {
  const settings = db.collection(COLLECTION.settings);

  /** @param {Record<string, any>} doc @returns {SettingsRecord} */
  const toRecord = (doc) => ({
    item: doc.item,
    meta: {
      version: doc.version,
      updatedAt: doc.updatedAt.toISOString(),
      updatedBy: doc.updatedBy ?? null,
    },
  });

  return {
    /** @returns {Promise<SettingsRecord | null>} */
    async get() {
      const doc = await settings.findOne({ _id: /** @type {any} */ (SETTINGS_ID) });
      return doc ? toRecord(doc) : null;
    },

    /**
     * მთლიანი ჩანაცვლება. `version` — ოპტიმისტური ბლოკი (ძველი → `conflict`); მის გარეშე
     * დოკუმენტი იქმნება, თუ არ არის.
     * @param {Record<string, any>} item
     * @param {{ by?: string | null, version?: number }} [options]
     * @returns {Promise<SettingsRecord>}
     */
    async put(item, { by = null, version } = {}) {
      const filter = { _id: SETTINGS_ID, ...(version !== undefined && { version }) };
      try {
        const doc = await settings.findOneAndUpdate(
          /** @type {any} */ (filter),
          {
            $set: { item: plain(item), updatedAt: new Date(now()), updatedBy: by },
            $inc: { version: 1 },
          },
          { upsert: version === undefined, returnDocument: 'after' },
        );
        if (!doc) throw new ContentError('conflict', { detail: `settings: version ${version}` });
        return toRecord(doc);
      } catch (error) {
        throw mapWriteError(error);
      }
    },
  };
}

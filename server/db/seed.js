import { adminState } from '@/admin/api/mock.js';
import { CONTENT_TYPES } from '@/admin/content-types.js';
import { createMockData } from '@/content/mock/data.js';
import { createMockStore } from '@/content/mock/store.js';
import { validateContent } from '@/content/validate.js';

import { COLLECTION } from './collections.js';
import { inTransaction } from './content.js';
import { ABOUT_SLUG, createRepositories } from './index.js';
import { toSettingsDoc } from './settings.js';

/**
 * Seed (B2): mock-ის მონაცემი ბაზაში — `createMockData()` (თარგმანებით) + ადმინის 7 გვერდი
 * (`adminState`-ის იგივე ჩანაწერები). id-ები და მეტა mock-ის საცავისაა (`a-001`, ვერსია 1),
 * ამიტომ dev-ის მისამართები და parity-ტესტი mock-ს ემთხვევა.
 *
 * - `adminState`-ის დემო-მონახაზები (ჩეკლისტის ხარვეზებით, ავტორი `u-002`) არ შედის: seed-ში
 *   მხოლოდ ავტორის გარეშე ჩანაწერებია (`updatedBy: null`), შედეგი — `validateContent` → 0.
 * - „ჩვენ შესახებ“ გვერდი: გუნდი და პარტნიორები (როგორც `adminState`-ში) + „ჩვენი გზა“ (`stages`).
 * - მომხმარებელი არ იქმნება — პირველი ადმინისტრატორი B3-ის სკრიპტით.
 * - `[YouTube-ის id]` და `[…]` ჩანაცვლებები რჩება (dev / staging); წარმოებაში seed არ ეშვება
 *   (`scripts/seed.js`), სერვერის გამოქვეყნების ბლოკერი ჩანაცვლებას შეცდომად თვლის — B4.
 */

/** @typedef {import('./content.js').ContentMeta} ContentMeta */

export class SeedError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'SeedError';
  }
}

/**
 * @param {{ now?: number }} [options]
 * @returns {{ records: { id: string, type: import('@/admin/content-types.js').ContentType, item: Record<string, any>, meta: ContentMeta }[], settings: Record<string, any> }}
 */
export function seedSource({ now = Date.now() } = {}) {
  const data = createMockData({ now });
  const store = createMockStore({ now: () => now, data });
  adminState(store);
  const records = [];
  for (const type of CONTENT_TYPES) {
    for (const record of store.records(type)) {
      if (record.meta.updatedBy !== null) continue;
      const item = /** @type {Record<string, any>} */ (record.item);
      records.push({
        id: record.id,
        type,
        item:
          type === 'pages' && item.slug === ABOUT_SLUG ? { ...item, stages: data.stages } : item,
        meta: record.meta,
      });
    }
  }
  return { records, settings: data.settings };
}

/**
 * @typedef {object} SeedResult
 * @property {Record<string, number>} counts   ტიპი → ჩანაწერი
 * @property {import('@/content/validate.js').Issue[]} issues   `validateContent` ბაზიდან წაკითხულზე
 */

/**
 * კონტენტი + პარამეტრები ერთ ტრანზაქციაში. კოლექციები უკვე უნდა არსებობდეს (`migrate`).
 * @param {{ client: import('mongodb').MongoClient, db: import('mongodb').Db }} database
 * @param {{ now?: number, reset?: boolean }} [options]  `reset` — კონტენტი, ვერსიები და
 *   პარამეტრები იშლება (მომხმარებლები, მედია, შეტყობინებები, გამომწერები — არა)
 * @returns {Promise<SeedResult>}
 */
export async function seedDatabase(database, { now = Date.now(), reset = false } = {}) {
  const { client, db } = database;
  const { records, settings } = seedSource({ now });
  const repos = createRepositories(database, { now: () => now });

  await inTransaction(client, async (session) => {
    const existing = await db.collection(COLLECTION.content).countDocuments({}, { session });
    if (existing > 0 && !reset) {
      throw new SeedError(
        `ბაზაში უკვე ${existing} მასალაა — seed არ გაეშვა (თავიდან: --reset; შლის კონტენტს, ვერსიებს, პარამეტრებს)`,
      );
    }
    if (reset) {
      for (const name of [COLLECTION.content, COLLECTION.versions, COLLECTION.settings]) {
        await db.collection(name).deleteMany({}, { session });
      }
    }
    await repos.content.importRecords(records, { session });
    await db
      .collection(COLLECTION.settings)
      .insertOne(
        /** @type {any} */ (
          toSettingsDoc(settings, { version: 1, updatedAt: new Date(now), updatedBy: null })
        ),
        { session },
      );
  });

  /** @type {Record<string, number>} */
  const counts = {};
  for (const record of records) counts[record.type] = (counts[record.type] ?? 0) + 1;
  const issues = validateContent(await repos.snapshot());
  return { counts, issues };
}

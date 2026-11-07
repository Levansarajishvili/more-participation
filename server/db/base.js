import { PAGE_DEFS, basePageItem } from '@/admin/api/pages.js';
import { createSettings } from '@/content/mock/org.js';

import { migrate } from '../migrations/index.js';

import { COLLECTION, SETTINGS_ID } from './collections.js';
import { ABOUT_SLUG, createRepositories } from './index.js';
import { toSettingsDoc } from './settings.js';

/**
 * B7: წარმოების საბაზისო ჩანაწერები — `npm run server:migrate`-ის ბოლო ნაბიჯი (და `MIGRATE_ON_START`).
 * seed წარმოებაში არ ეშვება (B2), ცარიელ ბაზაზე კი:
 * - 7 საჯარო გვერდი (`pages`) არ არსებობს — ადმინი მათ ვერ შეცვლის (გვერდი არ იქმნება / არ იშლება);
 * - პარამეტრები (`settings`) არ არსებობს — `GET /api/v1/settings` → 404 (B6 #7), ფუტერი / კონტაქტი ცარიელია.
 *
 * იქმნება მხოლოდ ის, რაც აკლია (slug / `_id`-ით) — არსებულს არ ეხება, განმეორებით გაშვება უსაფრთხოა.
 * შიგთავსი — ჩანაცვლებები `[ფრჩხილებში]` (ფაქტი არ არის გამოგონილი): გვერდის სათაური ადმინის
 * ლექსიკონიდან, ველები ცარიელი; პარამეტრები — `createSettings()`-ის `[ტელეფონი]`, `[ელფოსტა]`…, ბმულები
 * null. გაშვების ჩეკლისტი: ადმინისტრატორი პარამეტრებს რეალური მონაცემით ავსებს (`docs/deploy.md`).
 */

/**
 * @typedef {object} BaseResult
 * @property {string[]} pages   შექმნილი გვერდების slug-ები
 * @property {boolean} settings  პარამეტრები შეიქმნა
 */

/**
 * @param {{ client: import('mongodb').MongoClient, db: import('mongodb').Db }} database
 * @param {{ now?: number }} [options]
 * @returns {Promise<BaseResult>}
 */
export async function ensureBaseRecords(database, { now = Date.now() } = {}) {
  const repos = createRepositories(database, { now: () => now });
  const publishedAt = new Date(now).toISOString();
  /** @type {string[]} */
  const pages = [];
  for (const page of PAGE_DEFS) {
    if (await repos.content.findBySlug('pages', page.slug)) continue;
    const item = basePageItem(page, { publishedAt });
    await repos.content.insert('pages', page.slug === ABOUT_SLUG ? { ...item, stages: [] } : item);
    pages.push(page.slug);
  }
  const result = await database.db.collection(COLLECTION.settings).updateOne(
    { _id: /** @type {any} */ (SETTINGS_ID) },
    {
      $setOnInsert: toSettingsDoc(createSettings(), {
        version: 1,
        updatedAt: new Date(now),
        updatedBy: null,
      }),
    },
    { upsert: true },
  );
  return { pages, settings: result.upsertedCount === 1 };
}

/**
 * deploy-ის წინ (`server:migrate`, Render-ის pre-deploy) ან გაშვებისას (`MIGRATE_ON_START=1`):
 * მიგრაციები (კოლექციები, validator-ები, ინდექსები) → საბაზისო ჩანაწერები.
 * @param {{ client: import('mongodb').MongoClient, db: import('mongodb').Db }} database
 * @param {{ retention: import('../config.js').Config['retention'], now?: number }} options
 */
export async function prepareDatabase(database, { retention, now = Date.now() }) {
  const migrations = await migrate(database.db, { retention });
  const base = await ensureBaseRecords(database, { now });
  return { migrations, base };
}

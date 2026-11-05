import { CONTENT_TYPES } from '@/admin/content-types.js';

import { createContentRepository } from './content.js';
import { createSettingsRepository } from './settings.js';

/**
 * ბაზის ფენა (B2): repository-ები + მთელი ნაკრები (`ContentSnapshot`) — `validateContent`-ის
 * შესავალი და mock-ის `store.snapshot()`-ის ანალოგი. გუნდი, პარტნიორები და „ჩვენი გზა“ (`stages`)
 * „ჩვენ შესახებ“ გვერდის (`pages`, slug `about`) ჩანაწერშია — ადმინის mock-ის იგივე წყარო
 * (`setOrg`); `stages` — B2-ის დამატება (`PageDraft`).
 */

/** საჯარო ნაკრების ტიპები (გვერდების გარეშე). */
export const SNAPSHOT_TYPES = Object.freeze(CONTENT_TYPES.filter((type) => type !== 'pages'));
export const ABOUT_SLUG = 'about';

/**
 * @param {{ client: import('mongodb').MongoClient, db: import('mongodb').Db }} database
 * @param {{ now?: () => number, keepVersions?: number }} [options]
 */
export function createRepositories(database, options = {}) {
  const content = createContentRepository(database, options);
  const settings = createSettingsRepository(database, options);

  /**
   * სტატუსის ფილტრის გარეშე, როგორც mock-ის `snapshot()` (ხილვადობას `query.js` ფილტრავს).
   * @returns {Promise<import('@/content/model.js').ContentSnapshot>}
   */
  async function snapshot() {
    const lists = await Promise.all(SNAPSHOT_TYPES.map((type) => content.list(type)));
    const about = await content.findBySlug('pages', ABOUT_SLUG);
    const site = await settings.get();
    const items = Object.fromEntries(
      SNAPSHOT_TYPES.map((type, i) => [type, lists[i].map((record) => record.item)]),
    );
    return /** @type {any} */ ({
      ...items,
      team: about?.item.team ?? [],
      partners: about?.item.partners ?? [],
      stages: about?.item.stages ?? [],
      settings: site?.item ?? null,
    });
  }

  return { content, settings, snapshot };
}

export { createContentRepository, createSettingsRepository };

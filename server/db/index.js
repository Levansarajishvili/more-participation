import { CONTENT_TYPES } from '@/admin/content-types.js';

import { createContentRepository } from './content.js';
import { createInvitesRepository } from './invites.js';
import { createMediaRepository } from './media.js';
import { createSessionsRepository } from './sessions.js';
import { createSettingsRepository } from './settings.js';
import { createUsersRepository } from './users.js';

/**
 * ბაზის ფენა (B2): repository-ები + მთელი ნაკრები (`ContentSnapshot`) — `validateContent`-ის
 * შესავალი და mock-ის `store.snapshot()`-ის ანალოგი. გუნდი, პარტნიორები და „ჩვენი გზა“ (`stages`)
 * „ჩვენ შესახებ“ გვერდის (`pages`, slug `about`) ჩანაწერშია — ადმინის mock-ის იგივე წყარო
 * (`setOrg`); `stages` — B2-ის დამატება (`PageDraft`). B3: `users`, `sessions`, `invites`. B5: `media`.
 */

/** საჯარო ნაკრების ტიპები (გვერდების გარეშე). */
export const SNAPSHOT_TYPES = Object.freeze(CONTENT_TYPES.filter((type) => type !== 'pages'));
export const ABOUT_SLUG = 'about';

/**
 * @typedef {object} RepositoryOptions
 * @property {() => number} [now]
 * @property {number} [keepVersions]
 * @property {{ idleMs: number, maxMs: number }} [session]  B3 — `config.session`
 * @property {{ ttlMs: number }} [invites]                  B3 — `config.invites`
 */

/**
 * @param {{ client: import('mongodb').MongoClient, db: import('mongodb').Db }} database
 * @param {RepositoryOptions} [options]
 */
export function createRepositories(database, options = {}) {
  const { now } = options;
  const content = createContentRepository(database, options);
  const settings = createSettingsRepository(database, options);
  const users = createUsersRepository(database, { now });
  const sessions = createSessionsRepository(database, { now, ...options.session });
  const invites = createInvitesRepository(database, { now, ...options.invites });
  const media = createMediaRepository(database, { now, content });

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

  return { client: database.client, content, settings, users, sessions, invites, media, snapshot };
}

/** @typedef {ReturnType<typeof createRepositories>} Repositories */

export {
  createContentRepository,
  createInvitesRepository,
  createMediaRepository,
  createSessionsRepository,
  createSettingsRepository,
  createUsersRepository,
};

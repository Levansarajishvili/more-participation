import { ContentError } from '../errors.js';

import { createMockData } from './data.js';

/**
 * F8: mock-ის ერთი in-memory საცავი. საჯარო adapter-ი (`createMockAdapter`) და ადმინის adapter-ი
 * (`src/admin/api/mock.js`) ერთსა და იმავე საცავს კითხულობენ — ადმინში გამოქვეყნებული მასალა
 * იმავე სესიაში საიტზეც ჩანს. გვერდის გადატვირთვისას საცავი თავიდან იქმნება (backend-მდე).
 *
 * ჩანაწერი = `{ id, item, meta }`: `item` — მოდელის ობიექტი (Article, Video…) უცვლელი სახით,
 * `meta` — ადმინის მონაცემი (ვერსია, ავტორი, დრო), რომელიც საჯარო პასუხში არ ხვდება. წაშლილი
 * ჩანაწერი (`remove`) საცავიდან სრულად ქრება — საჯარო საიტიდანაც.
 * ჩანაწერი იცვლება მხოლოდ მთლიანად (immutable): ძველ ობიექტს არავინ ცვლის, ამიტომ პასუხის
 * ასლი (`structuredClone`) საკმარისია.
 */

/** @typedef {import('../model.js').ContentSnapshot} ContentSnapshot */

/**
 * რედაქტირებადი კოლექციები. `pages` (7 გვერდის ველები) ადმინის მოდულს შემოაქვს.
 * @typedef {'articles' | 'series' | 'videos' | 'news' | 'events' | 'pages'} CollectionName
 */

/**
 * @typedef {object} RecordMeta
 * @property {number} version       ოპტიმისტური ბლოკი: update-ს ძველი ვერსია → 409
 * @property {string} createdAt     ISO
 * @property {string} updatedAt     ISO
 * @property {string | null} updatedBy  მომხმარებლის id (seed-ის ჩანაწერზე null)
 */

/**
 * @template [T=Record<string, unknown>]
 * @typedef {object} StoreRecord
 * @property {string} id
 * @property {T} item
 * @property {RecordMeta} meta
 */

/** id-ის პრეფიქსი კოლექციის მიხედვით (`a-001` — სტატია). */
export const ID_PREFIX = Object.freeze({
  articles: 'a',
  series: 's',
  videos: 'v',
  news: 'n',
  events: 'e',
  pages: 'p',
});

/** @type {readonly CollectionName[]} */
export const COLLECTIONS = Object.freeze([
  'articles',
  'series',
  'videos',
  'news',
  'events',
  'pages',
]);

/**
 * @typedef {object} MockStore
 * @property {() => number} now
 * @property {(name: CollectionName) => StoreRecord[]} records      ჩასმის რიგით
 * @property {(name: CollectionName, id: string) => StoreRecord | null} find
 * @property {(name: CollectionName, slug: string) => StoreRecord | null} findBySlug
 * @property {(name: CollectionName, item: object, options?: { by?: string | null, id?: string }) => StoreRecord} insert
 * @property {(name: CollectionName, id: string, item: object, options?: { by?: string | null, version?: number }) => StoreRecord} replace
 * @property {(name: CollectionName, id: string, patch: Partial<RecordMeta>) => StoreRecord} setMeta
 * @property {(name: CollectionName, id: string) => StoreRecord} remove   სამუდამო წაშლა (აბრუნებს წაშლილს)
 * @property {() => ContentSnapshot} snapshot     საჯარო ნაკრები (სტატუსს query.js ფილტრავს)
 * @property {(settings: ContentSnapshot['settings']) => void} setSettings
 * @property {(org: { team?: ContentSnapshot['team'], partners?: ContentSnapshot['partners'] }) => void} setOrg
 * @property {Map<string, unknown>} extra         ადმინის მოდულის მდგომარეობა (მომხმარებლები, მედია…)
 * @property {(listener: () => void) => () => void} subscribe
 */

/**
 * @param {{ now?: () => number, data?: ContentSnapshot }} [options]
 * @returns {MockStore}
 */
export function createMockStore(options = {}) {
  const now = options.now ?? Date.now;
  const seed = options.data ?? createMockData({ now: now() });
  const created = new Date(now()).toISOString();

  /** @type {Map<CollectionName, StoreRecord[]>} */
  const collections = new Map();
  /** @type {Map<CollectionName, number>} */
  const counters = new Map();
  /** @type {Set<() => void>} */
  const listeners = new Set();
  let settings = seed.settings;
  let team = seed.team;
  let partners = seed.partners;
  /** @type {ContentSnapshot | null} */
  let cached = null;

  for (const name of COLLECTIONS) {
    const items = /** @type {object[]} */ (
      /** @type {Record<string, unknown>} */ (seed)[name] ?? []
    );
    collections.set(name, []);
    counters.set(name, 0);
    for (const item of items) {
      pushRecord(name, item, {
        version: 1,
        createdAt: created,
        updatedAt: /** @type {{ updatedAt?: string }} */ (item).updatedAt ?? created,
        updatedBy: null,
      });
    }
  }

  /**
   * @param {CollectionName} name
   * @param {object} item
   * @param {RecordMeta} meta
   * @param {string} [id]
   */
  function pushRecord(name, item, meta, id) {
    const next = (counters.get(name) ?? 0) + 1;
    counters.set(name, next);
    const record = {
      id: id ?? `${ID_PREFIX[name]}-${String(next).padStart(3, '0')}`,
      item,
      meta,
    };
    collections.get(name)?.push(record);
    return record;
  }

  function changed() {
    cached = null;
    for (const listener of listeners) listener();
  }

  /** @param {CollectionName} name @returns {StoreRecord[]} */
  function records(name) {
    const list = collections.get(name);
    if (!list) throw new ContentError('bad-request', { detail: `mock store: ${name}` });
    return list;
  }

  /** @param {CollectionName} name @param {string} id */
  function find(name, id) {
    return records(name).find((record) => record.id === id) ?? null;
  }

  /** @param {CollectionName} name @param {string} id */
  function required(name, id) {
    const record = find(name, id);
    if (!record) throw new ContentError('not-found', { detail: `${name}/${id}` });
    return record;
  }

  return {
    now,
    records,
    find,
    findBySlug: (name, slug) =>
      records(name).find(
        (record) => /** @type {{ slug?: string }} */ (record.item).slug === slug,
      ) ?? null,

    insert(name, item, { by = null, id } = {}) {
      const at = new Date(now()).toISOString();
      const record = pushRecord(
        name,
        item,
        { version: 1, createdAt: at, updatedAt: at, updatedBy: by },
        id,
      );
      changed();
      return record;
    },

    replace(name, id, item, { by = null, version } = {}) {
      const record = required(name, id);
      if (version !== undefined && version !== record.meta.version) {
        throw new ContentError('conflict', {
          detail: `${name}/${id}: version ${version} ≠ ${record.meta.version}`,
        });
      }
      const list = records(name);
      const index = list.indexOf(record);
      const next = {
        id,
        item,
        meta: {
          ...record.meta,
          version: record.meta.version + 1,
          updatedAt: new Date(now()).toISOString(),
          updatedBy: by,
        },
      };
      list[index] = next;
      changed();
      return next;
    },

    setMeta(name, id, patch) {
      const record = required(name, id);
      const list = records(name);
      const next = { ...record, meta: { ...record.meta, ...patch } };
      list[list.indexOf(record)] = next;
      changed();
      return next;
    },

    remove(name, id) {
      const record = required(name, id);
      const list = records(name);
      list.splice(list.indexOf(record), 1);
      changed();
      return record;
    },

    snapshot() {
      if (cached) return cached;
      /** @param {CollectionName} name */
      const visible = (name) => records(name).map((record) => record.item);
      cached = /** @type {ContentSnapshot} */ ({
        articles: visible('articles'),
        series: visible('series'),
        videos: visible('videos'),
        news: visible('news'),
        events: visible('events'),
        team,
        partners,
        stages: seed.stages,
        settings,
      });
      return cached;
    },

    setSettings(next) {
      settings = next;
      changed();
    },

    setOrg(next) {
      if (next.team) team = next.team;
      if (next.partners) partners = next.partners;
      changed();
    },

    extra: new Map(),

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** @type {MockStore | null} */
let shared = null;

/**
 * აპლიკაციის საერთო საცავი (საჯარო adapter.js + ადმინის adapter-ი). ტესტები, რომლებსაც
 * საკუთარი მონაცემი სჭირდება, `createMockStore()`-ს პირდაპირ ქმნის.
 * @returns {MockStore}
 */
export function getSharedMockStore() {
  shared ??= createMockStore();
  return shared;
}

/** ტესტებისთვის: საერთო საცავის ჩანაცვლება (`null` — შემდეგ გამოძახებაზე თავიდან). */
export function setSharedMockStore(/** @type {MockStore | null} */ store) {
  shared = store;
}

import { ContentError } from '../errors.js';
import { isHoneypotFilled, validateContact, validateSubscribe } from '../forms.js';
import {
  findArticle,
  findNews,
  findSeries,
  findVideo,
  queryArticles,
  queryEvents,
  queryNews,
  querySeries,
  queryVideos,
} from '../query.js';

import { createMockStore } from './store.js';

/** @typedef {import('../adapter.js').ContentAdapter} ContentAdapter */
/** @typedef {import('../model.js').ContentSnapshot} ContentSnapshot */
/** @typedef {import('../errors.js').ErrorCode} ErrorCode */

/**
 * @typedef {object} MockOptions
 * @property {() => number} [now]       საათი: ხილვადობა და „მომავალი ღონისძიებები“
 * @property {number} [delay=0]         ქსელის იმიტაცია, ms (dev-ში 300)
 * @property {ContentSnapshot} [data]   ნაგულისხმევად createMockData({ now: now() })
 * @property {import('./store.js').MockStore} [store]  F8: საერთო საცავი (adapter.js — getSharedMockStore());
 *                                      მის გარეშე adapter-ს საკუთარი საცავი აქვს `data`-დან
 * @property {ErrorCode | null} [fail]  ყოველი მოთხოვნა ამ შეცდომით მთავრდება (UI-ის შეცდომის მდგომარეობისთვის)
 */

/**
 * mock adapter: იგივე კონტრაქტი, რაც CMS-ს ექნება. პასუხი ყოველთვის ასლია — UI-მ
 * მონაცემი რომც შეცვალოს, mock-ის მდგომარეობა არ იცვლება.
 *
 * F8: მონაცემი საცავიდან იკითხება ყოველ მოთხოვნაზე (`store.snapshot()` — არქივის გარეშე), ამიტომ
 * ადმინში შენახული / გამოქვეყნებული მასალა იმავე სესიაში საჯარო გვერდზეც ჩანს.
 * @param {MockOptions} [options]
 * @returns {ContentAdapter & { readonly snapshot: ContentSnapshot, store: import('./store.js').MockStore, subscribers: ReadonlySet<string>, contacts: () => number }}
 */
export function createMockAdapter(options = {}) {
  const { delay = 0, fail = null } = options;
  const store = options.store ?? createMockStore({ now: options.now, data: options.data });
  const now = options.now ?? store.now;
  const data = () => store.snapshot();
  /** @type {Set<string>} */
  const subscribers = new Set();
  let contactCount = 0;
  let dropped = 0;

  /**
   * @template T
   * @param {() => T} produce
   * @returns {Promise<T>}
   */
  async function respond(produce) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    if (fail) throw new ContentError(fail, { detail: 'mock: fail' });
    return structuredClone(produce());
  }

  return {
    source: 'mock',
    get snapshot() {
      return data();
    },
    store,
    subscribers,
    /** მიღებული (honeypot-ის გარეშე) შეტყობინებების რაოდენობა — ტესტებისთვის. */
    contacts: () => contactCount,

    listArticles: (params = {}) => respond(() => queryArticles(data().articles, params, now())),
    getArticle: (slug) => respond(() => findArticle(data().articles, slug, now())),

    listSeries: (params = {}) => respond(() => querySeries(data().series, params, now())),
    getSeries: (slug) => respond(() => findSeries(data().series, slug, now())),

    listVideos: (params = {}) => respond(() => queryVideos(data().videos, params, now())),
    getVideo: (slug) => respond(() => findVideo(data().videos, slug, now())),

    listNews: (params = {}) => respond(() => queryNews(data().news, params, now())),
    getNews: (slug) => respond(() => findNews(data().news, slug, now())),
    listEvents: (params = {}) => respond(() => queryEvents(data().events, params, now())),

    getTeam: () => respond(() => [...data().team].sort((a, b) => a.order - b.order)),
    getPartners: () => respond(() => data().partners),
    getStages: () => respond(() => data().stages),
    getSettings: () => respond(() => data().settings),

    subscribe: (email) =>
      respond(() => {
        const fields = validateSubscribe(email);
        if (Object.keys(fields).length) throw new ContentError('validation', { fields });
        subscribers.add(email.trim().toLowerCase());
        return /** @type {const} */ ({ ok: true });
      }),

    sendContact: (payload) =>
      respond(() => {
        // honeypot: ბოტს ჩვეულებრივი წარმატება ხვდება, შეტყობინება კი არ ინახება
        if (isHoneypotFilled(payload ?? {})) {
          dropped += 1;
          return /** @type {const} */ ({ ok: true, id: `mock-dropped-${dropped}` });
        }
        const fields = validateContact(payload ?? {});
        if (Object.keys(fields).length) throw new ContentError('validation', { fields });
        contactCount += 1;
        return /** @type {const} */ ({ ok: true, id: `mock-${contactCount}` });
      }),
  };
}

export { createMockStore, getSharedMockStore, setSharedMockStore } from './store.js';

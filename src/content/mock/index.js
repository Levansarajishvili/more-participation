import { ContentError } from '../errors.js';
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

import { getLocale } from '@/i18n/locale.js';

import { publicSnapshot } from '../public.js';

import { createMockForms } from './forms.js';
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
 * B6: ფორმები — `forms.js` (double opt-in, honeypot); `subscribers` / `outbox` / `contacts()` — ტესტებისთვის.
 * @returns {ContentAdapter & { readonly snapshot: ContentSnapshot, store: import('./store.js').MockStore, subscribers: ReadonlyMap<string, import('./forms.js').MockSubscriber>, outbox: readonly import('./forms.js').MockMail[], contacts: () => number }}
 */
export function createMockAdapter(options = {}) {
  const { delay = 0, fail = null } = options;
  const store = options.store ?? createMockStore({ now: options.now, data: options.data });
  const now = options.now ?? store.now;
  // F9: პასუხი მიმდინარე ენაზე (`translations.<locale>` ზემოდან, თარგმანის გარეშე — ქართული);
  // B6: + გამოთვლადი ველები ენის ვერსიის ტექსტით — სერვერის იგივე `publicSnapshot` (`public.js`)
  /** @type {{ raw: unknown, locale: string, value: ContentSnapshot } | null} */
  let localized = null;
  const data = () => {
    const raw = store.snapshot();
    const locale = getLocale();
    if (!localized || localized.raw !== raw || localized.locale !== locale) {
      localized = { raw, locale, value: publicSnapshot(raw, locale) };
    }
    return localized.value;
  };
  const forms = createMockForms({ now, locale: getLocale });

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
    subscribers: forms.subscribers,
    outbox: forms.outbox,
    contacts: forms.contacts,

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

    subscribe: (email) => respond(() => forms.subscribe(email)),
    confirmSubscription: (token) => respond(() => forms.confirmSubscription(token)),
    unsubscribe: (token) => respond(() => forms.unsubscribe(token)),
    sendContact: (payload) => respond(() => forms.sendContact(payload)),
  };
}

export { createMockStore, getSharedMockStore, setSharedMockStore } from './store.js';

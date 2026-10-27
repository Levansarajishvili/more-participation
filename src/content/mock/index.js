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

import { createMockData } from './data.js';

/** @typedef {import('../adapter.js').ContentAdapter} ContentAdapter */
/** @typedef {import('../model.js').ContentSnapshot} ContentSnapshot */
/** @typedef {import('../errors.js').ErrorCode} ErrorCode */

/**
 * @typedef {object} MockOptions
 * @property {() => number} [now]       საათი: ხილვადობა და „მომავალი ღონისძიებები“
 * @property {number} [delay=0]         ქსელის იმიტაცია, ms (dev-ში 300)
 * @property {ContentSnapshot} [data]   ნაგულისხმევად createMockData({ now: now() })
 * @property {ErrorCode | null} [fail]  ყოველი მოთხოვნა ამ შეცდომით მთავრდება (UI-ის შეცდომის მდგომარეობისთვის)
 */

/**
 * mock adapter: იგივე კონტრაქტი, რაც CMS-ს ექნება. პასუხი ყოველთვის ასლია — UI-მ
 * მონაცემი რომც შეცვალოს, mock-ის მდგომარეობა არ იცვლება.
 * @param {MockOptions} [options]
 * @returns {ContentAdapter & { snapshot: ContentSnapshot, subscribers: ReadonlySet<string>, contacts: () => number }}
 */
export function createMockAdapter(options = {}) {
  const { now = Date.now, delay = 0, fail = null } = options;
  const snapshot = options.data ?? createMockData({ now: now() });
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
    snapshot,
    subscribers,
    /** მიღებული (honeypot-ის გარეშე) შეტყობინებების რაოდენობა — ტესტებისთვის. */
    contacts: () => contactCount,

    listArticles: (params = {}) => respond(() => queryArticles(snapshot.articles, params, now())),
    getArticle: (slug) => respond(() => findArticle(snapshot.articles, slug, now())),

    listSeries: (params = {}) => respond(() => querySeries(snapshot.series, params, now())),
    getSeries: (slug) => respond(() => findSeries(snapshot.series, slug, now())),

    listVideos: (params = {}) => respond(() => queryVideos(snapshot.videos, params, now())),
    getVideo: (slug) => respond(() => findVideo(snapshot.videos, slug, now())),

    listNews: (params = {}) => respond(() => queryNews(snapshot.news, params, now())),
    getNews: (slug) => respond(() => findNews(snapshot.news, slug, now())),
    listEvents: (params = {}) => respond(() => queryEvents(snapshot.events, params, now())),

    getTeam: () => respond(() => [...snapshot.team].sort((a, b) => a.order - b.order)),
    getPartners: () => respond(() => snapshot.partners),
    getStages: () => respond(() => snapshot.stages),
    getSettings: () => respond(() => snapshot.settings),

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

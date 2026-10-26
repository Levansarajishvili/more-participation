import { normalizeError } from './errors.js';

/**
 * კონტენტის ერთადერთი შესასვლელი. გვერდები და hook-ები მხოლოდ ამ ფუნქციებს იძახებენ;
 * რა დგას უკან — mock თუ CMS — აქ წყდება. ახლა: mock, ცალკე lazy chunk-ად.
 *
 * ყოველი ფუნქცია Promise-ს აბრუნებს; შეცდომა ყოველთვის ContentError-ია
 * (`{ code, message }`, ქართულად; ფორმაზე — `fields`).
 */

/** @typedef {import('./model.js').Article} Article */
/** @typedef {import('./model.js').ArticleSummary} ArticleSummary */
/** @typedef {import('./model.js').Series} Series */
/** @typedef {import('./model.js').SeriesSummary} SeriesSummary */
/** @typedef {import('./model.js').Video} Video */
/** @typedef {import('./model.js').VideoSummary} VideoSummary */
/** @typedef {import('./model.js').NewsPage} NewsPage */
/** @typedef {import('./model.js').Event} Event */
/** @typedef {import('./model.js').TeamMember} TeamMember */
/** @typedef {import('./model.js').Partner} Partner */
/** @typedef {import('./model.js').Stage} Stage */
/** @typedef {import('./model.js').SiteSettings} SiteSettings */
/** @typedef {import('./model.js').ContactPayload} ContactPayload */
/** @typedef {import('./model.js').ContactResult} ContactResult */
/** @typedef {import('./model.js').SubscribeResult} SubscribeResult */
/** @typedef {import('./query.js').ArticleQuery} ArticleQuery */
/** @typedef {import('./query.js').SeriesQuery} SeriesQuery */
/** @typedef {import('./query.js').VideoQuery} VideoQuery */
/** @typedef {import('./query.js').NewsQuery} NewsQuery */
/** @typedef {import('./query.js').EventQuery} EventQuery */
/**
 * @template T
 * @typedef {import('./model.js').Page<T>} Page
 */

/**
 * @typedef {object} ContentAdapter
 * @property {'mock' | 'cms'} source
 * @property {(params?: ArticleQuery) => Promise<Page<ArticleSummary>>} listArticles
 * @property {(slug: string) => Promise<Article>} getArticle
 * @property {(params?: SeriesQuery) => Promise<SeriesSummary[]>} listSeries
 * @property {(slug: string) => Promise<Series>} getSeries
 * @property {(params?: VideoQuery) => Promise<VideoSummary[]>} listVideos
 * @property {(slug: string) => Promise<Video>} getVideo
 * @property {(params?: NewsQuery) => Promise<NewsPage>} listNews
 * @property {(params?: EventQuery) => Promise<Event[]>} listEvents
 * @property {() => Promise<TeamMember[]>} getTeam
 * @property {() => Promise<Partner[]>} getPartners
 * @property {() => Promise<Stage[]>} getStages
 * @property {() => Promise<SiteSettings>} getSettings
 * @property {(email: string) => Promise<SubscribeResult>} subscribe
 * @property {(payload: ContactPayload) => Promise<ContactResult>} sendContact
 */

/** dev-ში ქსელის იმიტაცია: loading-მდგომარეობები ხილული უნდა იყოს. */
const DEV_DELAY = 300;

/** @type {Promise<ContentAdapter> | null} */
let current = null;

/** @returns {Promise<ContentAdapter>} */
function loadDefault() {
  return import('./mock/index.js').then(({ createMockAdapter }) => {
    const adapter = createMockAdapter({
      delay: import.meta.env.MODE === 'development' ? DEV_DELAY : 0,
    });
    if (import.meta.env.DEV) {
      // build-ში ეს ბლოკი და validate.js საერთოდ არ ხვდება (import.meta.env.DEV → false)
      import('./validate.js').then(({ validateContent, reportContentIssues }) =>
        reportContentIssues(validateContent(adapter.snapshot)),
      );
    }
    return adapter;
  });
}

/** @returns {Promise<ContentAdapter>} */
function getAdapter() {
  current ??= loadDefault();
  return current;
}

/**
 * adapter-ის ჩანაცვლება (ტესტები, მომავალი CMS). `null` — ნაგულისხმევზე დაბრუნება.
 * @param {ContentAdapter | null} adapter
 */
export function setContentAdapter(adapter) {
  current = adapter ? Promise.resolve(adapter) : null;
}

/**
 * @template {keyof Omit<ContentAdapter, 'source'>} K
 * @param {K} method
 * @param {Parameters<ContentAdapter[K]>} args
 * @returns {Promise<Awaited<ReturnType<ContentAdapter[K]>>>}
 */
async function call(method, ...args) {
  try {
    const adapter = await getAdapter();
    const fn = /** @type {(...a: unknown[]) => Promise<Awaited<ReturnType<ContentAdapter[K]>>>} */ (
      adapter[method]
    );
    return await fn(...args);
  } catch (error) {
    throw normalizeError(error);
  }
}

/**
 * სტატიები: ფილტრი, ძიება, cursor. ნაგულისხმევი `limit` — 6.
 * @param {ArticleQuery} [params]
 * @returns {Promise<Page<ArticleSummary>>}
 */
export function listArticles(params = {}) {
  return call('listArticles', params);
}

/**
 * @param {string} slug
 * @returns {Promise<Article>}  არარსებული ან გამოუქვეყნებელი → `not-found`
 */
export function getArticle(slug) {
  return call('getArticle', slug);
}

/**
 * რჩეული ჯერ, შემდეგ თემების რიგით.
 * @param {SeriesQuery} [params]
 * @returns {Promise<SeriesSummary[]>}
 */
export function listSeries(params = {}) {
  return call('listSeries', params);
}

/**
 * @param {string} slug
 * @returns {Promise<Series>}
 */
export function getSeries(slug) {
  return call('getSeries', slug);
}

/**
 * @param {VideoQuery} [params]
 * @returns {Promise<VideoSummary[]>}
 */
export function listVideos(params = {}) {
  return call('listVideos', params);
}

/**
 * @param {string} slug
 * @returns {Promise<Video>}
 */
export function getVideo(slug) {
  return call('getVideo', slug);
}

/**
 * @param {NewsQuery} [params]
 * @returns {Promise<NewsPage>}
 */
export function listNews(params = {}) {
  return call('listNews', params);
}

/**
 * @param {EventQuery} [params]
 * @returns {Promise<Event[]>}
 */
export function listEvents(params = {}) {
  return call('listEvents', params);
}

/** @returns {Promise<TeamMember[]>} */
export function getTeam() {
  return call('getTeam');
}

/** @returns {Promise<Partner[]>} */
export function getPartners() {
  return call('getPartners');
}

/** „ჩვენი გზა“. @returns {Promise<Stage[]>} */
export function getStages() {
  return call('getStages');
}

/** @returns {Promise<SiteSettings>} */
export function getSettings() {
  return call('getSettings');
}

/**
 * @param {string} email
 * @returns {Promise<SubscribeResult>}  არასწორი ელფოსტა → `validation` + `fields.email`
 */
export function subscribe(email) {
  return call('subscribe', email);
}

/**
 * @param {ContactPayload} payload
 * @returns {Promise<ContactResult>}  შეცდომისას → `validation` + `fields`
 */
export function sendContact(payload) {
  return call('sendContact', payload);
}

/** ამჟამინდელი წყარო (`mock` | `cms`) — dev-ბანერისთვის. @returns {Promise<ContentAdapter['source']>} */
export async function contentSource() {
  return (await getAdapter()).source;
}

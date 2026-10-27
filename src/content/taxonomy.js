import { t } from '@/i18n/index.js';

/**
 * ტაქსონომია: id-ები და მათი რიგი. id ლათინურია (URL-ის `?category=career`), წარწერა
 * i18n-შია (`taxonomy.<kind>.<id>`), რომ ინგლისურ ვერსიაში ითარგმნოს.
 * კონტენტის slug-ი (`chveva-5-nabiji`) ტრანსლიტერაციაა, ტაქსონომიის id — ინგლისური სიტყვა.
 */

/** @typedef {'growth' | 'career' | 'rights' | 'accessibility' | 'stories'} ArticleCategory */
/** @typedef {'newest' | 'shortest'} ArticleSort */
/** @typedef {'habit' | 'worldview' | 'character' | 'win-win' | 'flow' | 'time-priorities' | 'self-reflection'} SeriesTopic */
/** @typedef {'navy' | 'navy-deep' | 'petrol' | 'orange' | 'alt'} SeriesTone */
/** @typedef {'achievements' | 'career' | 'sport' | 'art' | 'everyday'} VideoCategory */
/** @typedef {'announcement' | 'event' | 'program' | 'media'} NewsType */
/** @typedef {'in-person' | 'online' | 'hybrid'} EventFormat */
/** @typedef {'yes' | 'no' | 'on-request' | 'not-applicable'} AccessLevel */
/** @typedef {'general' | 'programs' | 'volunteering' | 'partnership' | 'media' | 'barrier' | 'story'} ContactTopic */
/** @typedef {'email' | 'call' | 'message' | 'sign-video'} ReplyChannel */
/** @typedef {'entrance' | 'elevator' | 'restroom' | 'parking' | 'transit' | 'guide-dog'} OfficeFeature */
/** @typedef {'company' | 'donor' | 'organization'} PartnerKind */
/** @typedef {'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'tiktok'} SocialNetwork */

/** სტატიების 5 კატეგორია (§5, ArticlesPage). @type {readonly ArticleCategory[]} */
export const ARTICLE_CATEGORIES = Object.freeze([
  'growth',
  'career',
  'rights',
  'accessibility',
  'stories',
]);

/**
 * დალაგება (ArticlesPage). „ყველაზე წაკითხული“ ანალიტიკას საჭიროებს (§9.4) და ჯერ არ არის.
 * @type {readonly ArticleSort[]}
 */
export const ARTICLE_SORTS = Object.freeze(['newest', 'shortest']);

/**
 * პიროვნული განვითარების თემები: რჩეული „ჩვევა“ + §5-ის ექვსი სერია.
 * @type {readonly SeriesTopic[]}
 */
export const SERIES_TOPICS = Object.freeze([
  'habit',
  'worldview',
  'character',
  'win-win',
  'flow',
  'time-priorities',
  'self-reflection',
]);

/**
 * თემის წარწერის უცხოენოვანი დანართი: „დინება (flow)“ — `flow` ინგლისურია და
 * `<span lang="en">`-ით იხატება.
 * @type {Readonly<Partial<Record<SeriesTopic, { text: string, lang: 'en' }>>>}
 */
export const SERIES_TOPIC_TERMS = Object.freeze({ flow: { text: 'flow', lang: 'en' } });

/**
 * სერიის ყდის ფერი. მხოლოდ ტოკენები, რომლებსაც სხვა როლი არ აქვს: navy-800, navy-900,
 * petrol-600, orange-300, alt. ოქროსფერი (CTA) და მწვანე (ზრდა) ყდაზე არ გამოიყენება.
 * @type {readonly SeriesTone[]}
 */
export const SERIES_TONES = Object.freeze(['navy', 'navy-deep', 'petrol', 'orange', 'alt']);

/** ვიდეოს კატეგორიები (VideosPage). @type {readonly VideoCategory[]} */
export const VIDEO_CATEGORIES = Object.freeze([
  'achievements',
  'career',
  'sport',
  'art',
  'everyday',
]);

/** სიახლის ტიპები (NewsPage). @type {readonly NewsType[]} */
export const NEWS_TYPES = Object.freeze(['announcement', 'event', 'program', 'media']);

/** @type {readonly EventFormat[]} */
export const EVENT_FORMATS = Object.freeze(['in-person', 'online', 'hybrid']);

/** @type {readonly AccessLevel[]} */
export const ACCESS_LEVELS = Object.freeze(['yes', 'no', 'on-request', 'not-applicable']);

/**
 * კონტაქტის ფორმის თემები (ContactPage). F7: `story` — „გაგვიზიარე შენი ისტორია“
 * (VideosPage → `/contact?topic=story`).
 * @type {readonly ContactTopic[]}
 */
export const CONTACT_TOPICS = Object.freeze([
  'general',
  'programs',
  'volunteering',
  'partnership',
  'media',
  'barrier',
  'story',
]);

/** „როგორ გიპასუხოთ?“ (ContactPage). @type {readonly ReplyChannel[]} */
export const REPLY_CHANNELS = Object.freeze(['email', 'call', 'message', 'sign-video']);

/** ოფისის ხელმისაწვდომობის პუნქტები (ContactPage). @type {readonly OfficeFeature[]} */
export const OFFICE_FEATURES = Object.freeze([
  'entrance',
  'elevator',
  'restroom',
  'parking',
  'transit',
  'guide-dog',
]);

/** @type {readonly PartnerKind[]} */
export const PARTNER_KINDS = Object.freeze(['company', 'donor', 'organization']);

/** @type {readonly SocialNetwork[]} */
export const SOCIAL_NETWORKS = Object.freeze([
  'facebook',
  'instagram',
  'youtube',
  'linkedin',
  'tiktok',
]);

/** „ჩვენ შესახებ“: სამი მიმართულება და ექვსი ღირებულება (§1), ტექსტი — `about.*`. */
export const ORG_PILLARS = Object.freeze(['engagement', 'development', 'change']);
export const ORG_VALUES = Object.freeze([
  'confidence',
  'creativity',
  'courage',
  'perseverance',
  'curiosity',
  'growth',
]);

/**
 * @typedef {'articleCategory' | 'articleSort' | 'seriesTopic' | 'videoCategory' | 'newsType'
 *   | 'newsTypePlural' | 'eventFormat' | 'contactTopic' | 'replyChannel' | 'officeFeature'
 *   | 'partnerKind' | 'socialNetwork' | 'status'} TaxonomyKind
 */

/**
 * ტაქსონომიის წარწერა: `label('articleCategory', 'career')` → „კარიერა“.
 * @param {TaxonomyKind} kind
 * @param {string} id
 * @returns {string}
 */
export function label(kind, id) {
  return t(`taxonomy.${kind}.${id}`);
}

/**
 * ფილტრის ჩიპებისთვის: `[{ id, label }]`.
 * @template {string} T
 * @param {TaxonomyKind} kind
 * @param {readonly T[]} ids
 * @returns {{ id: T, label: string }[]}
 */
export function options(kind, ids) {
  return ids.map((id) => ({ id, label: label(kind, id) }));
}

/**
 * @template {string} T
 * @param {readonly T[]} list
 * @param {unknown} value
 * @returns {value is T}
 */
export function isOneOf(list, value) {
  return typeof value === 'string' && /** @type {readonly string[]} */ (list).includes(value);
}

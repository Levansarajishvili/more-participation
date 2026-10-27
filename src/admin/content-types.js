import { label } from '@/content/taxonomy.js';

import { ta } from './i18n/index.js';

/**
 * ადმინის კონტენტის ტიპები (`/admin/:type`). ერთი ჩანაწერი → სიის სვეტი „კატეგორია“, საჯარო
 * მისამართი („გადახედვა“, „საიტის ნახვა“), შექმნა / არქივი. რედაქტორის ველები — ნაწილ ბ-ში
 * (`admin/schemas/*.js`).
 */

/** @typedef {'articles' | 'series' | 'videos' | 'news' | 'events' | 'pages'} ContentType */
/** @typedef {import('@/content/validate.js').IssueEntity} IssueEntity */

/**
 * @typedef {object} ContentTypeConfig
 * @property {ContentType} id
 * @property {import('@/content/mock/store.js').CollectionName} collection
 * @property {IssueEntity | null} entity           validate.js-ის entity; გვერდებს შემოწმება არ აქვს
 * @property {(item: Record<string, any>) => string | null} category  სვეტის მნიშვნელობა (id)
 * @property {(id: string) => string} categoryLabel
 * @property {(item: Record<string, any>) => string} publicPath
 * @property {boolean} creatable
 * @property {boolean} archivable
 */

/** @type {readonly ContentType[]} */
export const CONTENT_TYPES = Object.freeze([
  'articles',
  'series',
  'videos',
  'news',
  'events',
  'pages',
]);

/** @type {Readonly<Record<ContentType, ContentTypeConfig>>} */
export const TYPE_CONFIG = Object.freeze({
  articles: {
    id: 'articles',
    collection: 'articles',
    entity: 'article',
    category: (item) => item.category ?? null,
    categoryLabel: (id) => label('articleCategory', id),
    publicPath: (item) => `/articles/${item.slug}`,
    creatable: true,
    archivable: true,
  },
  series: {
    id: 'series',
    collection: 'series',
    entity: 'series',
    category: (item) => item.topic ?? null,
    categoryLabel: (id) => label('seriesTopic', id),
    publicPath: (item) => `/development?series=${item.slug}`,
    creatable: true,
    archivable: true,
  },
  videos: {
    id: 'videos',
    collection: 'videos',
    entity: 'video',
    category: (item) => item.category ?? null,
    categoryLabel: (id) => label('videoCategory', id),
    publicPath: (item) => `/videos?video=${item.slug}`,
    creatable: true,
    archivable: true,
  },
  news: {
    id: 'news',
    collection: 'news',
    entity: 'news',
    category: (item) => item.type ?? null,
    categoryLabel: (id) => label('newsType', id),
    publicPath: (item) => `/news/${item.slug}`,
    creatable: true,
    archivable: true,
  },
  events: {
    id: 'events',
    collection: 'events',
    entity: 'event',
    category: (item) => item.accessibility?.format ?? null,
    categoryLabel: (id) => label('eventFormat', id),
    publicPath: () => '/news',
    creatable: true,
    archivable: true,
  },
  pages: {
    id: 'pages',
    collection: 'pages',
    entity: null,
    category: (item) => item.path ?? null,
    categoryLabel: (id) => id,
    publicPath: (item) => item.path ?? '/',
    creatable: false,
    archivable: false,
  },
});

/**
 * @param {unknown} value
 * @returns {value is ContentType}
 */
export function isContentType(value) {
  return typeof value === 'string' && CONTENT_TYPES.includes(/** @type {ContentType} */ (value));
}

/** @param {ContentType} type @param {'many' | 'one' | 'category'} [form='many'] */
export function typeLabel(type, form = 'many') {
  return ta(`types.${type}.${form}`);
}

/**
 * „ახალი მასალა“-ს ტიპი: მიმდინარე, თუ იქმნება; სხვაგან (დაფა, გვერდები, ბიბლიოთეკა) — სტატია.
 * @param {string | null | undefined} current
 * @returns {ContentType}
 */
export function newItemType(current) {
  return isContentType(current) && TYPE_CONFIG[current].creatable ? current : 'articles';
}

import { getYear } from '@/i18n/format.js';

import { ContentError } from './errors.js';
import { isSlug } from './slug.js';
import {
  ARTICLE_CATEGORIES,
  ARTICLE_SORTS,
  NEWS_TYPES,
  SERIES_TOPICS,
  VIDEO_CATEGORIES,
  isOneOf,
  label,
} from './taxonomy.js';
import {
  blocksToText,
  matchesQuery,
  normalizeSearch,
  readingMinutes,
  slidesToText,
} from './text.js';

/**
 * სუფთა ფუნქციები: ხილვადობა, ფილტრი, ძიება, cursor-ით დაყოფა. mock ამათზე დგას;
 * სტატიკური JSON-ის adapter-იც იგივეს გამოიყენებს, CMS კი სერვერზე გააკეთებს.
 */

/** @typedef {import('./model.js').Article} Article */
/** @typedef {import('./model.js').ArticleSummary} ArticleSummary */
/** @typedef {import('./model.js').Series} Series */
/** @typedef {import('./model.js').SeriesSummary} SeriesSummary */
/** @typedef {import('./model.js').Video} Video */
/** @typedef {import('./model.js').VideoSummary} VideoSummary */
/** @typedef {import('./model.js').NewsItem} NewsItem */
/** @typedef {import('./model.js').NewsSummary} NewsSummary */
/** @typedef {import('./model.js').NewsPage} NewsPage */
/** @typedef {import('./model.js').Event} Event */
/** @typedef {import('./taxonomy.js').ArticleCategory} ArticleCategory */
/** @typedef {import('./taxonomy.js').ArticleSort} ArticleSort */
/** @typedef {import('./taxonomy.js').SeriesTopic} SeriesTopic */
/** @typedef {import('./taxonomy.js').VideoCategory} VideoCategory */
/** @typedef {import('./taxonomy.js').NewsType} NewsType */
/**
 * @template T
 * @typedef {import('./model.js').Page<T>} Page
 */

export const DEFAULT_LIMIT = 6;
export const MAX_LIMIT = 50;
export const QUERY_MAX = 100;

/**
 * @typedef {object} ArticleQuery
 * @property {ArticleCategory | null} [category]
 * @property {string} [q]
 * @property {string | null} [cursor]
 * @property {number} [limit]          ნაგულისხმევი 6 (ბადე 3 × 2)
 * @property {ArticleSort} [sort]      ნაგულისხმევი `newest`
 * @property {boolean} [featured]      true — მხოლოდ რჩეული, false — რჩეულის გარეშე
 */

/**
 * @typedef {object} NewsQuery
 * @property {NewsType | null} [type]
 * @property {number | null} [year]
 * @property {string | null} [cursor]
 * @property {number} [limit]
 * @property {boolean} [featured]
 */

/**
 * @typedef {object} VideoQuery
 * @property {VideoCategory | null} [category]
 * @property {boolean} [featured]
 */

/**
 * @typedef {object} SeriesQuery
 * @property {SeriesTopic | null} [topic]
 * @property {boolean} [featured]
 */

/**
 * @typedef {object} EventQuery
 * @property {boolean} [upcoming]  true — დასრულებამდე (ზრდადობით), false — გასული (კლებადობით)
 */

/* ─── საერთო ─────────────────────────────────────────────────────────────── */

/**
 * საჯაროდ ჩანს: გამოქვეყნებული, ან დაგეგმილი, რომლის დროც დადგა.
 * @param {{ status: string, publishedAt: string }} item
 * @param {number} now
 * @returns {boolean}
 */
export function isPublic(item, now) {
  if (item.status === 'published') return true;
  if (item.status === 'scheduled') return Date.parse(item.publishedAt) <= now;
  return false;
}

/**
 * @param {{ publishedAt: string }} a
 * @param {{ publishedAt: string }} b
 * @returns {number}
 */
export function byNewest(a, b) {
  return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
}

/**
 * @param {string} detail
 * @returns {ContentError}
 */
function badRequest(detail) {
  return new ContentError('bad-request', { detail });
}

/**
 * @param {unknown} value
 * @param {readonly string[]} list
 * @param {string} name
 */
function assertOptionalOneOf(value, list, name) {
  if (value === undefined || value === null) return;
  if (!isOneOf(list, value)) throw badRequest(`${name}: ${String(value)}`);
}

/**
 * @param {unknown} value
 * @param {string} name
 */
function assertOptionalBoolean(value, name) {
  if (value !== undefined && typeof value !== 'boolean')
    throw badRequest(`${name}: ${String(value)}`);
}

/**
 * cursor — გაუმჭვირვალე სტრიქონი; mock-ში ეს offset-ია.
 * @template T
 * @param {T[]} list
 * @param {{ cursor?: string | null, limit?: number }} params
 * @returns {Page<T>}
 */
export function paginate(list, { cursor = null, limit = DEFAULT_LIMIT }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT)
    throw badRequest(`limit: ${limit}`);
  let offset = 0;
  if (cursor !== null && cursor !== undefined && cursor !== '') {
    if (!/^\d+$/.test(cursor)) throw badRequest(`cursor: ${cursor}`);
    offset = Number(cursor);
    if (offset > list.length) throw badRequest(`cursor: ${cursor}`);
  }
  const end = offset + limit;
  return {
    items: list.slice(offset, end),
    nextCursor: end < list.length ? String(end) : null,
    total: list.length,
  };
}

/**
 * @param {string | undefined} q
 * @returns {string}
 */
function cleanQuery(q) {
  if (q === undefined || q === null) return '';
  if (typeof q !== 'string') throw badRequest(`q: ${String(q)}`);
  return q.trim().slice(0, QUERY_MAX);
}

/* ─── სტატიები ───────────────────────────────────────────────────────────── */

/**
 * გამოთვლადი ველების შევსება (readingMinutes).
 * @param {Omit<Article, 'readingMinutes'> & { readingMinutes?: number }} article
 * @returns {Article}
 */
export function withArticleDerived(article) {
  return { ...article, readingMinutes: readingMinutes(blocksToText(article.body)) };
}

/**
 * @param {Article} article
 * @returns {ArticleSummary}
 */
export function toArticleSummary(article) {
  const { body: _body, audio, ...rest } = article;
  return { ...rest, hasAudio: Boolean(audio?.src) };
}

/** @type {WeakMap<Article, string>} */
const articleIndex = new WeakMap();

/**
 * @param {Article} article
 * @returns {string}
 */
function articleHaystack(article) {
  let text = articleIndex.get(article);
  if (text === undefined) {
    text = normalizeSearch(
      [
        article.title,
        article.excerpt,
        label('articleCategory', article.category),
        article.author,
        blocksToText(article.body),
      ].join(' '),
    );
    articleIndex.set(article, text);
  }
  return text;
}

/**
 * @param {Article[]} articles
 * @param {ArticleQuery} params
 * @param {number} now
 * @returns {Page<ArticleSummary>}
 */
export function queryArticles(articles, params, now) {
  const {
    category = null,
    cursor = null,
    limit = DEFAULT_LIMIT,
    sort = 'newest',
    featured,
  } = params;
  assertOptionalOneOf(category, ARTICLE_CATEGORIES, 'category');
  assertOptionalOneOf(sort, ARTICLE_SORTS, 'sort');
  assertOptionalBoolean(featured, 'featured');
  const q = cleanQuery(params.q);

  const list = articles
    .filter((a) => isPublic(a, now))
    .filter((a) => !category || a.category === category)
    .filter((a) => featured === undefined || a.featured === featured)
    .filter((a) => !q || matchesQuery(articleHaystack(a), q))
    .sort((a, b) =>
      sort === 'shortest' ? a.readingMinutes - b.readingMinutes || byNewest(a, b) : byNewest(a, b),
    );

  const page = paginate(list, { cursor, limit });
  return { ...page, items: page.items.map(toArticleSummary) };
}

/**
 * @param {Article[]} articles
 * @param {string} slug
 * @param {number} now
 * @returns {Article}
 */
export function findArticle(articles, slug, now) {
  if (!isSlug(slug)) throw new ContentError('not-found', { detail: `slug: ${String(slug)}` });
  const article = articles.find((a) => a.slug === slug && isPublic(a, now));
  if (!article) throw new ContentError('not-found', { detail: `article: ${slug}` });
  return article;
}

/* ─── სერიები ────────────────────────────────────────────────────────────── */

/**
 * @param {Omit<Series, 'readingMinutes'> & { readingMinutes?: number }} series
 * @returns {Series}
 */
export function withSeriesDerived(series) {
  return { ...series, readingMinutes: readingMinutes(slidesToText(series.slides)) };
}

/**
 * @param {Series} series
 * @returns {SeriesSummary}
 */
export function toSeriesSummary(series) {
  const { slides, ...rest } = series;
  return { ...rest, slideCount: slides.length };
}

/**
 * რჩეული ჯერ, შემდეგ თემების რიგით (SERIES_TOPICS).
 * @param {Series[]} series
 * @param {SeriesQuery} params
 * @param {number} now
 * @returns {SeriesSummary[]}
 */
export function querySeries(series, params, now) {
  const { topic = null, featured } = params;
  assertOptionalOneOf(topic, SERIES_TOPICS, 'topic');
  assertOptionalBoolean(featured, 'featured');
  return series
    .filter((s) => isPublic(s, now))
    .filter((s) => !topic || s.topic === topic)
    .filter((s) => featured === undefined || s.featured === featured)
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        SERIES_TOPICS.indexOf(a.topic) - SERIES_TOPICS.indexOf(b.topic) ||
        byNewest(a, b),
    )
    .map(toSeriesSummary);
}

/**
 * @param {Series[]} series
 * @param {string} slug
 * @param {number} now
 * @returns {Series}
 */
export function findSeries(series, slug, now) {
  if (!isSlug(slug)) throw new ContentError('not-found', { detail: `slug: ${String(slug)}` });
  const item = series.find((s) => s.slug === slug && isPublic(s, now));
  if (!item) throw new ContentError('not-found', { detail: `series: ${slug}` });
  return item;
}

/* ─── ვიდეოები ───────────────────────────────────────────────────────────── */

/**
 * @param {Video} video
 * @returns {VideoSummary}
 */
export function toVideoSummary(video) {
  const { sources: _s, captions, audioDescription, signLanguage, transcript: _t, ...rest } = video;
  return {
    ...rest,
    hasCaptions: captions.length > 0,
    hasSignLanguage: signLanguage !== null,
    hasAudioDescription: audioDescription !== null,
  };
}

/**
 * @param {Video[]} videos
 * @param {VideoQuery} params
 * @param {number} now
 * @returns {VideoSummary[]}
 */
export function queryVideos(videos, params, now) {
  const { category = null, featured } = params;
  assertOptionalOneOf(category, VIDEO_CATEGORIES, 'category');
  assertOptionalBoolean(featured, 'featured');
  return videos
    .filter((v) => isPublic(v, now))
    .filter((v) => !category || v.category === category)
    .filter((v) => featured === undefined || v.featured === featured)
    .sort(byNewest)
    .map(toVideoSummary);
}

/**
 * @param {Video[]} videos
 * @param {string} slug
 * @param {number} now
 * @returns {Video}
 */
export function findVideo(videos, slug, now) {
  if (!isSlug(slug)) throw new ContentError('not-found', { detail: `slug: ${String(slug)}` });
  const video = videos.find((v) => v.slug === slug && isPublic(v, now));
  if (!video) throw new ContentError('not-found', { detail: `video: ${slug}` });
  return video;
}

/* ─── სიახლეები და ღონისძიებები ─────────────────────────────────────────── */

/**
 * @param {NewsItem} item
 * @returns {NewsSummary}
 */
export function toNewsSummary(item) {
  const { body: _body, ...rest } = item;
  return rest;
}

/**
 * @param {NewsItem[]} news
 * @param {NewsQuery} params
 * @param {number} now
 * @returns {NewsPage}
 */
export function queryNews(news, params, now) {
  const { type = null, year = null, cursor = null, limit = DEFAULT_LIMIT, featured } = params;
  assertOptionalOneOf(type, NEWS_TYPES, 'type');
  assertOptionalBoolean(featured, 'featured');
  if (
    year !== null &&
    year !== undefined &&
    !(Number.isInteger(year) && year >= 1900 && year <= 2999)
  ) {
    throw badRequest(`year: ${String(year)}`);
  }

  const byType = news
    .filter((n) => isPublic(n, now))
    .filter((n) => !type || n.type === type)
    .filter((n) => featured === undefined || n.featured === featured)
    .sort(byNewest);

  const years = [...new Set(byType.map((n) => getYear(n.publishedAt)).filter((y) => y !== null))]
    .map(Number)
    .sort((a, b) => b - a);

  const list = year ? byType.filter((n) => getYear(n.publishedAt) === year) : byType;
  const page = paginate(list, { cursor, limit });
  return { ...page, items: page.items.map(toNewsSummary), years };
}

/**
 * @param {Event[]} events
 * @param {EventQuery} params
 * @param {number} now
 * @returns {Event[]}
 */
export function queryEvents(events, params, now) {
  const { upcoming } = params;
  assertOptionalBoolean(upcoming, 'upcoming');
  const visible = events.filter((e) => isPublic(e, now));
  if (upcoming === undefined)
    return visible.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return upcoming
    ? visible
        .filter((e) => Date.parse(e.end) >= now)
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    : visible
        .filter((e) => Date.parse(e.end) < now)
        .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
}

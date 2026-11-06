import { ContentError, fieldError } from '@/content/errors.js';
import { issueCounts, validateEntity } from '@/content/checks.js';
import { isPublic } from '@/content/query.js';
import { matchesQuery, normalizeSearch } from '@/content/text.js';

import { CONTENT_TYPES, TYPE_CONFIG } from '../content-types.js';

/**
 * ადმინის პასუხის ფორმა — ერთი კოდი ორ მხარეს (B4): ადმინის mock (`mock.js`) და სერვერი
 * (`server/routes/content.js`) ჩანაწერს ამ ფუნქციებით აქცევს სიის სტრიქონად (`ContentRow`) და
 * რედაქტორის ჩანაწერად (`ContentRecord`), ფილტრავს, ალაგებს და ყოფს გვერდებად. ასე parity
 * (`server/test/content/parity.test.js`) კონსტრუქციითაა დაცული — HTTP-ზე იგივე ველები და რიგი.
 *
 * შესავალი ჩანაწერი — `{ id, item, meta }` (mock-ის `StoreRecord` და repository-ის `ContentRecord`
 * ერთნაირი ფორმისაა); ავტორი — `editor(id)` (mock — მეხსიერებიდან, სერვერი — `users`-იდან).
 */

/** @typedef {import('../content-types.js').ContentType} ContentType */
/** @typedef {import('./adminAdapter.js').ContentRow} ContentRow */
/** @typedef {import('./adminAdapter.js').ContentRecord} ContentRecord */
/** @typedef {import('./adminAdapter.js').ListParams} ListParams */
/** @typedef {import('./adminAdapter.js').ListResult} ListResult */
/** @typedef {import('./adminAdapter.js').VersionInfo} VersionInfo */
/** @typedef {import('./adminAdapter.js').Editor} Editor */
/** @typedef {import('@/content/validate.js').Issue} Issue */

/**
 * @typedef {object} SourceRecord
 * @property {string} id
 * @property {Record<string, any>} item
 * @property {{ version: number, createdAt: string, updatedAt: string, updatedBy: string | null }} meta
 */

/** @typedef {(id: string | null) => Editor} EditorOf */

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 50;
/** ძიების შედეგის ზღვარი (`/search`). */
export const SEARCH_LIMIT = 50;

/**
 * საჯარო სტატიების slug-ები — ბმულის შემოწმება მხოლოდ საიტზე ხილულ მასალას ადარებს.
 * @param {SourceRecord[]} articles
 * @param {number} at  ms
 * @returns {Set<string>}
 */
export function publicSlugs(articles, at) {
  return new Set(
    articles.filter((r) => isPublic(/** @type {any} */ (r.item), at)).map((r) => r.item.slug),
  );
}

/**
 * მასალის შენიშვნები (ჩეკლისტის წესები, ქართული ვერსია) — `checks.js`-ის `validateEntity`.
 * @param {ContentType} type
 * @param {Record<string, any>} item
 * @param {Set<string>} slugs
 * @returns {Issue[]}
 */
export function issuesOf(type, item, slugs) {
  return validateEntity(type, item, slugs);
}

/**
 * @param {ContentType | 'all'} type
 * @returns {ContentType[]}
 */
export function typesFor(type) {
  const types = type === 'all' ? [...CONTENT_TYPES] : [type];
  if (!types.every((t) => CONTENT_TYPES.includes(t))) {
    throw new ContentError('bad-request', { detail: `type ${type}` });
  }
  return types;
}

/**
 * @param {ContentType} type
 * @param {SourceRecord} record
 * @param {{ slugs: Set<string>, editor: EditorOf }} context
 * @returns {ContentRow}
 */
export function toRow(type, record, { slugs, editor }) {
  const item = record.item;
  return {
    id: record.id,
    type,
    title: item.title ?? '',
    titleEn: item.translations?.en?.title?.trim() || null,
    slug: item.slug ?? '',
    status: item.status,
    publishedAt: item.publishedAt,
    category: TYPE_CONFIG[type].category(item),
    version: record.meta.version,
    updatedAt: record.meta.updatedAt,
    updatedBy: editor(record.meta.updatedBy),
    issues: issueCounts(issuesOf(type, item, slugs)),
  };
}

/**
 * @param {ContentType} type
 * @param {SourceRecord} record
 * @param {{ slugs: Set<string>, editor: EditorOf, working?: { item: Record<string, any>, at: string, by: string | null } | null }} context
 * @returns {ContentRecord}
 */
export function toRecord(type, record, { slugs, editor, working = null }) {
  return {
    id: record.id,
    type,
    item: record.item,
    version: record.meta.version,
    createdAt: record.meta.createdAt,
    updatedAt: record.meta.updatedAt,
    updatedBy: editor(record.meta.updatedBy),
    issues: issuesOf(type, record.item, slugs),
    working: working && { item: working.item, at: working.at, by: editor(working.by) },
  };
}

/** @param {ContentRow} row */
const haystack = (row) => normalizeSearch(`${row.title} ${row.slug}`);

/** @param {ContentRow} a @param {ContentRow} b */
const newestFirst = (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

/**
 * სიის გვერდი: სტატუსი, შემოწმების კოდი, ძიება (სათაური + slug), დალაგება `updatedAt`-ით
 * (კლებადობით, სტაბილური), გვერდი დიაპაზონს გარეთ → ბოლო გვერდი.
 * @param {ContentRow[]} rows   ტიპების რიგით, თითო ტიპში — ჩასმის რიგით
 * @param {Partial<ListParams>} [params]
 * @returns {ListResult}
 */
export function listRows(rows, params = {}) {
  const status = params.status ?? null;
  const check = params.check ?? null;
  const q = String(params.q ?? '');
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number(params.limit) || DEFAULT_LIMIT));
  let out = rows;
  if (status) out = out.filter((row) => row.status === status);
  if (check) out = out.filter((row) => row.issues.codes.includes(check));
  if (q.trim()) out = out.filter((row) => matchesQuery(haystack(row), q));
  out = [...out].sort(newestFirst);
  const total = out.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(Math.max(1, Math.floor(Number(params.page) || 1)), pages);
  return { items: out.slice((page - 1) * limit, page * limit), total, page, pages, limit };
}

/**
 * ძიება პანელში: სათაური და slug, ყველა ტიპი, უახლესი პირველი, ≤ 50; ცარიელი → `[]`.
 * @param {ContentRow[]} rows
 * @param {string | null | undefined} q
 * @returns {ContentRow[]}
 */
export function searchRows(rows, q) {
  if (!q?.trim()) return [];
  return rows
    .filter((row) => matchesQuery(haystack(row), q))
    .sort(newestFirst)
    .slice(0, SEARCH_LIMIT);
}

/**
 * ვერსიები: მიმდინარე ჯერ, შემდეგ ისტორია ახალიდან ძველისკენ.
 * @param {SourceRecord} record
 * @param {{ version: number, at: string, by: string | null, item: Record<string, any> }[]} history  უახლესი პირველი
 * @param {EditorOf} editor
 * @returns {VersionInfo[]}
 */
export function versionList(record, history, editor) {
  return [
    {
      version: record.meta.version,
      at: record.meta.updatedAt,
      by: editor(record.meta.updatedBy),
      title: record.item.title ?? '',
      current: true,
    },
    ...history.map((v) => ({
      version: v.version,
      at: v.at,
      by: editor(v.by),
      title: v.item.title ?? '',
      current: false,
    })),
  ];
}

/**
 * ახალი მასალა ყოველთვის მონახაზია (spec: `createContent`) — `data.status` არ გადაწერს.
 * @param {Record<string, any>} data
 * @returns {Record<string, any>}
 */
export function newDraft(data) {
  return { ...data, status: 'draft' };
}

/**
 * შენახვის ერთი წესი ორივე მხარეს (`updateItem`):
 * - `data.status` — მხოლოდ `draft` (საიტიდან მოხსნა) ან იგივე; `published` / `scheduled` — მხოლოდ
 *   `/publish` და `/schedule`-ით (ბლოკერის შემოწმება) → სხვაგვარად `validation` (`fields.status`);
 * - `featured` რედაქტორიდან არ იცვლება — მხოლოდ პარამეტრებიდან (`settings.update`, ერთ ტრანზაქციაში);
 *   რედაქტორი სრულ item-ს აგზავნის, ამიტომ მიმდინარე მნიშვნელობა რჩება (B2-ის ღია #3).
 * @param {Record<string, any>} current
 * @param {Record<string, any>} data
 * @returns {Record<string, any>}  merged
 */
export function mergeUpdate(current, data) {
  if (data.status !== undefined && data.status !== 'draft' && data.status !== current.status) {
    throw new ContentError('validation', { fields: { status: fieldError('option') } });
  }
  return keepFeatured(current, { ...current, ...data });
}

/**
 * მიმდინარე `featured` → ახალ item-ში (ვერსიის აღდგენა, შენახვა, გამოქვეყნება).
 * @param {Record<string, any>} current
 * @param {Record<string, any>} next
 * @returns {Record<string, any>}
 */
export function keepFeatured(current, next) {
  const out = { ...next };
  if ('featured' in current) out.featured = current.featured;
  else delete out.featured;
  return out;
}

/* ─── B4 ნაწილი ბ: ბიბლიოთეკა (ჩადგმული), სტატისტიკა, ანგარიში, რჩეული ─────────────────── */

/** @typedef {import('./adminAdapter.js').MediaItem} MediaItem */
/** @typedef {import('./adminAdapter.js').Stats} Stats */
/** @typedef {import('./adminAdapter.js').A11yReport} A11yReport */

/**
 * მასალაში ჩადგმული ფოტოები: `cover`, `photo`, ტექსტის `image` ბლოკები (B2: ფოტო — ჩადგმული ობიექტი).
 * @param {Record<string, any>} item
 * @returns {{ field: string, image: Record<string, any> }[]}
 */
export function imagesOf(item) {
  /** @type {{ field: string, image: Record<string, any> }[]} */
  const out = [];
  for (const field of ['cover', 'photo']) {
    if (item[field] && typeof item[field] === 'object' && 'alt' in item[field]) {
      out.push({ field, image: item[field] });
    }
  }
  (item.body ?? []).forEach((/** @type {any} */ block, /** @type {number} */ i) => {
    if (block?.type === 'image' && block.image)
      out.push({ field: `body[${i}].image`, image: block.image });
  });
  return out;
}

/**
 * ბიბლიოთეკის ჩანაწერები მასალიდან (ფოტო, PDF) — mock-ის `media.list`-ის და სტატისტიკის წყარო;
 * ატვირთული ფაილები (`media` კოლექცია) — B5.
 * @param {ContentType} type
 * @param {SourceRecord} record
 * @returns {MediaItem[]}
 */
export function embeddedMedia(type, record) {
  const item = record.item;
  /** @type {MediaItem[]} */
  const items = imagesOf(item).map(({ field, image }) => ({
    id: `img:${record.id}:${field}`,
    kind: /** @type {const} */ ('image'),
    src: image.src ?? null,
    alt: image.alt ?? '',
    title: image.credit ?? '',
    ratio: image.ratio ?? null,
    size: null,
    lang: null,
    tagged: null,
    usage: [{ type, id: record.id, title: item.title ?? '', field }],
  }));
  if (item.pdf) {
    items.push({
      id: `doc:${record.id}:pdf`,
      kind: 'document',
      src: item.pdf.src ?? null,
      alt: '',
      title: item.pdf.label ?? '',
      ratio: null,
      size: item.pdf.size ?? null,
      lang: item.pdf.lang ?? 'ka',
      tagged: item.pdf.tagged ?? false,
      usage: [{ type, id: record.id, title: item.title ?? '', field: 'pdf' }],
    });
  }
  return items;
}

/**
 * დაფის მრიცხველები. `rowsByType` — ყველა ტიპის სტრიქონი; სტატუსი და ხარვეზი გვერდების გარეშე
 * ითვლება, `counts` — გვერდებითაც.
 * @param {Record<ContentType, ContentRow[]>} rowsByType
 * @param {{ now: number, library: { images: number, documents: number } }} context
 * @returns {Stats}
 */
export function buildStats(rowsByType, { now, library }) {
  const rows = CONTENT_TYPES.filter((t) => t !== 'pages').flatMap((t) => rowsByType[t] ?? []);
  const scheduled = rows
    .filter((r) => r.status === 'scheduled' && Date.parse(r.publishedAt) > now)
    .map((r) => r.publishedAt)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  /** @type {Record<string, number>} */
  const counts = {};
  for (const type of CONTENT_TYPES) counts[type] = (rowsByType[type] ?? []).length;
  return {
    published: rows.filter((r) => r.status === 'published').length,
    draft: rows.filter((r) => r.status === 'draft').length,
    scheduled: rows.filter((r) => r.status === 'scheduled').length,
    nextScheduledAt: scheduled[0] ?? null,
    a11yIssues: rows.filter((r) => r.issues.errors > 0).length,
    counts: /** @type {any} */ (counts),
    library,
  };
}

/**
 * ხელმისაწვდომობის ანგარიში: მასალა შენიშვნებით + ჯგუფები კოდით (ბლოკერები ჯერ, მერე — რაოდენობით).
 * @param {Record<ContentType, SourceRecord[]>} recordsByType
 * @param {Set<string>} slugs
 * @returns {A11yReport}
 */
export function buildA11yReport(recordsByType, slugs) {
  /** @type {A11yReport['items']} */
  const items = [];
  for (const type of CONTENT_TYPES) {
    for (const record of recordsByType[type] ?? []) {
      const item = record.item;
      const issues = issuesOf(type, item, slugs);
      if (issues.length) {
        items.push({
          id: record.id,
          type,
          title: item.title ?? '',
          titleEn: item.translations?.en?.title?.trim() || null,
          status: item.status,
          issues,
        });
      }
    }
  }
  /** @type {Map<string, import('./adminAdapter.js').A11yGroup>} */
  const groups = new Map();
  for (const entry of items) {
    for (const issueCode of new Set(entry.issues.map((i) => i.code))) {
      const severity = entry.issues.find((i) => i.code === issueCode)?.severity ?? 'error';
      const group = groups.get(issueCode) ?? { code: issueCode, severity, count: 0, types: [] };
      group.count += 1;
      const bucket = group.types.find((b) => b.type === entry.type);
      if (bucket) bucket.count += 1;
      else group.types.push({ type: entry.type, count: 1 });
      groups.set(issueCode, group);
    }
  }
  const all = items.flatMap((i) => i.issues);
  return {
    totals: {
      errors: all.filter((i) => i.severity === 'error').length,
      warnings: all.filter((i) => i.severity === 'warning').length,
      items: items.length,
    },
    groups: [...groups.values()].sort(
      (a, b) =>
        Number(a.severity === 'warning') - Number(b.severity === 'warning') || b.count - a.count,
    ),
    items,
  };
}

/** რჩეულის გასაღები (პარამეტრები) → ტიპი. */
export const FEATURED = Object.freeze(
  /** @type {const} */ ({
    weeklyVideo: 'videos',
    featuredArticle: 'articles',
    featuredSeries: 'series',
    featuredNews: 'news',
  }),
);

/** @typedef {keyof typeof FEATURED} FeaturedKey */

/**
 * რჩეულის id-ები: თითო ტიპში პირველი `featured: true` (ჩასმის რიგით).
 * @param {Partial<Record<ContentType, SourceRecord[]>>} recordsByType
 * @returns {Record<FeaturedKey, string | null>}
 */
export function featuredIds(recordsByType) {
  /** @param {ContentType} type */
  const first = (type) => (recordsByType[type] ?? []).find((r) => r.item.featured)?.id ?? null;
  return {
    weeklyVideo: first('videos'),
    featuredArticle: first('articles'),
    featuredSeries: first('series'),
    featuredNews: first('news'),
  };
}

/**
 * `settings.update`-ის რჩეული: `[ტიპი, id | null]` (`undefined` — უცვლელი). id უნდა არსებობდეს
 * და იმავე ტიპის იყოს — სხვაგვარად `not-found` ჩაწერამდე (ორივე მხარე; B2-ში mock ყველას ხსნიდა).
 * @param {Partial<Record<FeaturedKey, string | null>> | undefined} patch
 * @param {(type: ContentType, id: string) => boolean} exists
 * @returns {[ContentType, string | null][]}
 */
export function featuredChanges(patch, exists) {
  /** @type {[ContentType, string | null][]} */
  const out = [];
  for (const [key, id] of Object.entries(patch ?? {})) {
    if (id === undefined) continue;
    const type = FEATURED[/** @type {FeaturedKey} */ (key)];
    if (id !== null && !exists(type, id)) {
      throw new ContentError('not-found', { detail: `featured ${type}: ${id}` });
    }
    out.push([type, id]);
  }
  return out;
}

/**
 * გამოქვეყნების / დაგეგმვის item: `data` → სამუშაო ასლი → შენახული მასალა; სტატუსი და თარიღი —
 * ოპერაციისა; `featured` — მიმდინარე (მხოლოდ პარამეტრებიდან იცვლება).
 * @param {Record<string, any>} current
 * @param {Record<string, any> | null | undefined} working
 * @param {Record<string, any> | undefined} data
 * @param {{ status: 'published' | 'scheduled', publishedAt: string }} target
 */
export function publishItem(current, working, data, target) {
  const base = data ?? working ?? current;
  return keepFeatured(current, { ...current, ...base, ...target });
}

/**
 * დაგეგმვის თარიღი მომავალში უნდა იყოს → სხვაგვარად `validation` (`fields.publishedAt`).
 * @param {string | undefined} at
 * @param {number} now
 * @param {string} message  ადმინის i18n (`fieldErrors.scheduleFuture`)
 */
export function assertFuture(at, now, message) {
  if (!at || Number.isNaN(Date.parse(at)) || Date.parse(at) <= now) {
    throw new ContentError('validation', {
      fields: { publishedAt: { code: /** @type {any} */ ('date'), message } },
    });
  }
}

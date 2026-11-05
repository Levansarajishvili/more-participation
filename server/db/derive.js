import { normalizeSearch, searchStem } from '@/content/text.js';

/**
 * `content`-ის ზედა დონის ველები, რომლებიც `item`-იდან ჩაწერისას ითვლება (B2). ბაზა მათ ინდექსით
 * კითხულობს; `item` უცვლელად რჩება. ერთადერთი ჩამწერი — repository (`content.js`).
 */

/** ფაილის საჯარო მისამართის პრეფიქსი (B0 #7: მიწოდება `/media/*`). */
export const MEDIA_PATH = '/media/';

/**
 * JSON-ის სემანტიკა: `undefined` ქრება, მასივის ნახვრეტი → `null`, არა-JSON მნიშვნელობა არ ინახება.
 * მოდელი JSON-ია (HTTP-დან მოდის), ბაზაში ზუსტად ის ინახება, რასაც API გადასცემს.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function plain(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

/**
 * `validate.js`-ის `validDate`-ის წესით: ISO (`YYYY-MM-DDT…`) და გარჩევადი → Date; სხვა → null.
 * @param {unknown} value
 * @returns {Date | null}
 */
export function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/**
 * საძიებო ტექსტი (MongoDB-ის text index ქართულ ფუძეს ვერ ცნობს, §12): `normalizeSearch`
 * ქართულ და ინგლისურ სათაურზე / სახელზე და აღწერაზე + slug (ადმინის ძიება slug-საც ეძებს).
 * @param {Record<string, any>} item
 * @returns {string}
 */
export function searchTextOf(item) {
  const en = item?.translations?.en ?? {};
  return normalizeSearch(
    [item.slug, item.title ?? item.name, item.excerpt, en?.title ?? en?.name, en?.excerpt]
      .filter((part) => typeof part === 'string')
      .join(' '),
  );
}

/**
 * ფაილები, რომლებსაც მასალა იყენებს: ყოველი `src`, რომელიც `/media/`-ით იწყება → საცავის
 * გასაღები. გამოყენების დათვლა და გამოყენებული ფაილის წაშლის ბლოკი (B5) — ინდექსით `mediaKeys`.
 * @param {...unknown} values  `item` და (თუ არის) სამუშაო ასლი
 * @returns {string[]}  დალაგებული, უნიკალური
 */
export function mediaKeysOf(...values) {
  /** @type {Set<string>} */
  const keys = new Set();
  /** @param {unknown} node */
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'src' && typeof value === 'string' && value.startsWith(MEDIA_PATH)) {
          const raw = value.slice(MEDIA_PATH.length).split(/[?#]/)[0];
          if (raw) keys.add(decodeURIComponent(raw));
        } else walk(value);
      }
    }
  };
  values.forEach(walk);
  return [...keys].sort();
}

/**
 * @typedef {object} Derived
 * @property {string | null} slug        null — ცარიელი (ზედა დონეზე არ იწერება)
 * @property {string | null} status
 * @property {Date | null} publishedAt
 * @property {string} searchText
 * @property {string[]} mediaKeys
 */

/**
 * @param {Record<string, any>} item
 * @param {Record<string, any> | null} [working]  სამუშაო ასლის `item`
 * @returns {Derived}
 */
export function derivedFields(item, working = null) {
  const slug = typeof item.slug === 'string' && item.slug.trim() ? item.slug : null;
  return {
    slug,
    status: typeof item.status === 'string' ? item.status : null,
    publishedAt: parseDate(item.publishedAt),
    searchText: searchTextOf(item),
    mediaKeys: mediaKeysOf(item, working),
  };
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * ძიების ფილტრი `searchText`-ზე — `text.js`-ის `matchesQuery`-ის სემანტიკა: ყოველი სიტყვა
 * (`normalizeSearch` → `searchStem`) ტექსტში ნაწილობრივ უნდა შედიოდეს (AND). ინდექსი `searchText`
 * — index scan დოკუმენტების წაკითხვის გარეშე.
 * @param {string} query
 * @returns {Record<string, unknown> | null}  null — ცარიელი მოთხოვნა
 */
export function searchFilter(query) {
  const terms = normalizeSearch(String(query ?? ''))
    .split(' ')
    .filter(Boolean)
    .map(searchStem);
  if (!terms.length) return null;
  return { $and: terms.map((term) => ({ searchText: { $regex: escapeRegex(term) } })) };
}

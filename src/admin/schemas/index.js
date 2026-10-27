import articles from './articles.js';
import events from './events.js';
import news from './news.js';
import pages from './pages.js';
import series from './series.js';
import videos from './videos.js';

/**
 * ველების კონფიგი თითო ტიპზე (F8) — ერთი `EntityEditor` ყველა ტიპს ხატავს.
 *
 * @typedef {'text' | 'slug' | 'textarea' | 'select' | 'radio' | 'richtext' | 'image' | 'file'
 *   | 'repeater' | 'datetime' | 'checkbox' | 'duration'} FieldKind
 *
 * @typedef {object} FieldSchema
 * @property {string} name              ველის გზა მოდელში (`person.name`, `accessibility.format`)
 * @property {FieldKind} kind
 * @property {string} label             ადმინის i18n-ის გასაღები
 * @property {string} [hint]
 * @property {boolean} [required]
 * @property {number} [max]             textarea: სიმბოლოების ზღვარი (მრიცხველი)
 * @property {number} [rows]
 * @property {string} [from]            slug: წყარო-ველი (ნაგულისხმევი `title`)
 * @property {import('@/content/taxonomy.js').TaxonomyKind} [taxonomy]
 * @property {readonly string[]} [ids]
 * @property {{ id: string, label: string }[]} [options]
 * @property {import('@/content/model.js').Ratio} [ratio]  image
 * @property {string} [accept]          file
 * @property {Record<string, unknown>} [template]  file: ატვირთვისას ობიექტის საწყისი ველები
 * @property {FieldSchema[]} [fields]   repeater
 * @property {(index: number) => object} [newItem]
 * @property {string} [itemLabel]       repeater: „სლაიდი {n}“
 * @property {string} [itemTitle]       repeater: ელემენტის ველი, რომელიც სათაურს ავსებს
 * @property {string} [addLabel]
 * @property {boolean} [importVtt]
 * @property {string} [inputType]
 * @property {string} [lang]
 *
 * @typedef {object} SectionSchema
 * @property {string} id
 * @property {string} title             i18n-ის გასაღები (h2)
 * @property {FieldSchema[]} fields
 *
 * @typedef {object} EntitySchema
 * @property {import('../content-types.js').ContentType} type
 * @property {SectionSchema[]} sections
 * @property {(now: number) => Record<string, any>} defaults  ახალი მასალის ველები
 * @property {string[]} rules           ჩეკლისტის წესები (checklist.js)
 * @property {string} [titleField]      ნაგულისხმევი `title`
 */

/** @type {Readonly<Record<import('../content-types.js').ContentType, EntitySchema>>} */
export const SCHEMAS = Object.freeze({ articles, series, videos, news, events, pages });

/** @param {import('../content-types.js').ContentType} type */
export function schemaFor(type) {
  return SCHEMAS[type];
}

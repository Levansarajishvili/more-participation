/**
 * mock-ის დამხმარეები. წესები (project-context §9):
 * - ადამიანისთვის წასაკითხი ყოველი ტექსტი `[ფრჩხილებშია]` და სიგრძით რეალურს ჰგავს;
 * - მედიის `src` და გარე URL — `null` (ფაილი/ბმული ჯერ არ არის);
 * - მანქანური მნიშვნელობები (ISO თარიღი, ხანგრძლივობა წამებში) სინთეზურია და `now`-ზეა
 *   მიბმული, რომ „მომავალი ღონისძიებები“ და წლის ფილტრი ყოველთვის მუშაობდეს.
 */

/** @typedef {import('../model.js').Image} Image */
/** @typedef {import('../model.js').Ratio} Ratio */
/** @typedef {import('../model.js').Inline} Inline */
/** @typedef {import('../model.js').Block} Block */

const DAY = 86_400_000;
/** თბილისი: UTC+4, საზაფხულო დროის გარეშე (2005 წლიდან). */
const TBILISI_OFFSET = 4 * 3_600_000;

/**
 * ISO სტრიქონი თბილისის დროით: `now`-დან `days` დღის შემდეგ (უარყოფითი — წინ), `time` საათზე.
 * @param {number} now
 * @param {number} days
 * @param {string} [time='10:00']
 * @returns {string}
 */
export function tbilisi(now, days, time = '10:00') {
  const local = new Date(now + days * DAY + TBILISI_OFFSET);
  return `${local.toISOString().slice(0, 10)}T${time}:00+04:00`;
}

/**
 * @param {string} text
 * @param {{ strong?: boolean, lang?: 'en' }} [options]
 * @returns {Inline}
 */
export function run(text, options = {}) {
  return { type: 'text', text, ...options };
}

/**
 * @param {string} text
 * @param {string} href
 * @returns {Inline}
 */
export function linkRun(text, href) {
  return { type: 'link', text, href };
}

/**
 * @param {string | Inline[]} content
 * @returns {Block}
 */
export function p(content) {
  return { type: 'p', content: typeof content === 'string' ? [run(content)] : content };
}

/** @param {string} text @returns {Block} */
export const h2 = (text) => ({ type: 'h2', text });

/** @param {string} text @returns {Block} */
export const h3 = (text) => ({ type: 'h3', text });

/**
 * @param {string[]} items
 * @param {boolean} [ordered=false]
 * @returns {Block}
 */
export function list(items, ordered = false) {
  return { type: 'list', ordered, items: items.map((item) => [run(item)]) };
}

/**
 * @param {string} text
 * @param {string} [cite]
 * @returns {Block}
 */
export function quote(text, cite) {
  return { type: 'quote', text, ...(cite && { cite }) };
}

/**
 * მედია ფაილის გარეშე: `src: null`, alt — ფრჩხილებში აღწერა.
 * @param {string} alt
 * @param {Ratio} ratio
 * @returns {Image}
 */
export function image(alt, ratio) {
  return { src: null, alt, ratio };
}

/**
 * @param {Image} img
 * @param {string} [caption]
 * @returns {Block}
 */
export function figure(img, caption) {
  return { type: 'image', image: img, ...(caption && { caption }) };
}

/**
 * @param {string} text
 * @param {string} href
 * @param {string} [description]
 * @returns {Block}
 */
export function linkBlock(text, href, description) {
  return { type: 'link', text, href, ...(description && { description }) };
}

/**
 * @param {number} n
 * @returns {string}
 */
export function pad2(n) {
  return String(n).padStart(2, '0');
}

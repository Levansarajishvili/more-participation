import { READING_WPM } from './model.js';

/** @typedef {import('./model.js').Block} Block */
/** @typedef {import('./model.js').Inline} Inline */
/** @typedef {import('./model.js').Slide} Slide */

/**
 * @param {Inline[]} runs
 * @returns {string}
 */
export function inlineText(runs) {
  return runs.map((run) => run.text).join('');
}

/**
 * ბლოკის წასაკითხი ტექსტი (ძიება, კითხვის დრო, აუდიო ვერსია).
 * @param {Block} block
 * @returns {string}
 */
export function blockText(block) {
  switch (block.type) {
    case 'p':
      return inlineText(block.content);
    case 'h2':
    case 'h3':
      return block.text;
    case 'list':
      return block.items.map(inlineText).join('\n');
    case 'quote':
      return [block.text, block.cite].filter(Boolean).join(' — ');
    case 'image':
      return block.caption ?? '';
    case 'link':
      return [block.text, block.description].filter(Boolean).join(' — ');
    default:
      return '';
  }
}

/**
 * @param {Block[]} blocks
 * @returns {string}
 */
export function blocksToText(blocks) {
  return blocks.map(blockText).filter(Boolean).join('\n\n');
}

/**
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/**
 * კითხვის დრო წუთებში (მინიმუმ 1).
 * @param {string} text
 * @returns {number}
 */
export function readingMinutes(text) {
  return Math.max(1, Math.round(countWords(text) / READING_WPM));
}

/**
 * სლაიდების „ტექსტური ვერსია“: სათაური — ტექსტი, სლაიდზე ერთი აბზაცი.
 * @param {Slide[]} slides
 * @returns {string}
 */
export function slidesToText(slides) {
  return slides.map((slide) => `${slide.title} — ${slide.body}`).join('\n\n');
}

/**
 * საძიებო ნორმალიზაცია: მთავრული → მხედრული, ლათინური → პატარა ასოები, ფრჩხილები,
 * ბრჭყალები და პუნქტუაცია → ჰარი, ზედმეტი ჰარები იკუმშება.
 * @param {string} text
 * @returns {string}
 */
export function normalizeSearch(text) {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * საძიებო სიტყვის ფუძე: ბრუნვისას სახელობითის ბოლო „ა/ი“ ხშირად იკარგება
 * („გასაუბრება“ → „გასაუბრებისთვის“, „ჩვევა“ → „ჩვევის“), ამიტომ 4+ ასოიან სიტყვას
 * ბოლო „ა“ ან „ი“ ეჭრება. ფუძის ცვლილებას (სინკოპა: „წყალი“ → „წყლის“) ეს არ ფარავს.
 * @param {string} term  ნორმალიზებული სიტყვა
 * @returns {string}
 */
export function searchStem(term) {
  return term.length >= 4 && /[აი]$/.test(term) ? term.slice(0, -1) : term;
}

/**
 * ყველა სიტყვა უნდა შედიოდეს ტექსტში (AND, ნაწილობრივი დამთხვევით: „ჩვევ“ → „ჩვევა“).
 * @param {string} haystack  უკვე ნორმალიზებული
 * @param {string} query
 * @returns {boolean}
 */
export function matchesQuery(haystack, query) {
  const terms = normalizeSearch(query).split(' ').filter(Boolean).map(searchStem);
  return terms.every((term) => haystack.includes(term));
}

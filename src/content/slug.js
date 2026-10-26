/**
 * slug: ქართული → ლათინური ეროვნული ტრანსლიტერაციით (2002), აპოსტროფების გარეშე
 * (project-context §10): „ჩვევა — 5 ნაბიჯი“ → `chveva-5-nabiji`.
 * მხედრული და მთავრული ორივე მუშავდება; ფრჩხილები, ბრჭყალები და პუნქტუაცია დეფისად იქცევა.
 */

/** @type {Readonly<Record<string, string>>} */
const MAP = Object.freeze({
  ა: 'a',
  ბ: 'b',
  გ: 'g',
  დ: 'd',
  ე: 'e',
  ვ: 'v',
  ზ: 'z',
  თ: 't',
  ი: 'i',
  კ: 'k',
  ლ: 'l',
  მ: 'm',
  ნ: 'n',
  ო: 'o',
  პ: 'p',
  ჟ: 'zh',
  რ: 'r',
  ს: 's',
  ტ: 't',
  უ: 'u',
  ფ: 'p',
  ქ: 'k',
  ღ: 'gh',
  ყ: 'q',
  შ: 'sh',
  ჩ: 'ch',
  ც: 'ts',
  ძ: 'dz',
  წ: 'ts',
  ჭ: 'ch',
  ხ: 'kh',
  ჯ: 'j',
  ჰ: 'h',
});

/** slug-ის ფორმატი: მხოლოდ a–z, 0–9 და ერთეული დეფისი შუაში. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** URL-ის slug-ის მაქსიმალური სიგრძე (სიმბოლო). */
export const SLUG_MAX = 80;

/**
 * @param {string} text
 * @returns {string}
 */
export function transliterate(text) {
  let out = '';
  // toLowerCase მთავრულს (U+1C90–1CBF) მხედრულად აქცევს
  for (const char of text.normalize('NFC').toLowerCase()) out += MAP[char] ?? char;
  return out;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  const slug = transliterate(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= SLUG_MAX) return slug;
  const cut = slug.slice(0, SLUG_MAX);
  return cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut;
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isSlug(value) {
  return typeof value === 'string' && value.length <= SLUG_MAX && SLUG_PATTERN.test(value);
}

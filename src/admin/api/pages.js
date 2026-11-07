import { adminDictionary, adminDictionaryEn } from '../i18n/index.js';

/**
 * 7 საჯარო გვერდი (§5) — `pages` ტიპის ჩანაწერები. ერთი წესი ადმინის mock-ისთვის (`adminState`) და
 * წარმოების საბაზისო ჩანაწერებისთვის (B7: `server/db/base.js` — `npm run server:migrate`): ცარიელ ბაზაზე
 * გვერდები seed-ის გარეშეც უნდა არსებობდეს, თორემ ადმინი მათ ვერ შეცვლის (გვერდი არ იქმნება და არ იშლება).
 */
export const PAGE_DEFS = Object.freeze([
  { slug: 'home', path: '/' },
  { slug: 'about', path: '/about' },
  { slug: 'articles', path: '/articles' },
  { slug: 'development', path: '/development' },
  { slug: 'videos', path: '/videos' },
  { slug: 'news', path: '/news' },
  { slug: 'contact', path: '/contact' },
]);

/**
 * გვერდის საწყისი ჩანაწერი: სათაური ორივე ენაზე (ადმინის ლექსიკონიდან), ცარიელი ველები.
 * „ჩვენ შესახებ“ — გუნდი და პარტნიორები (mock-ში საიტის საცავის ასლი, წარმოებაში — ცარიელი).
 * @param {{ slug: string, path: string }} page
 * @param {{ publishedAt: string, team?: unknown[], partners?: unknown[] }} options
 * @returns {Record<string, any>}
 */
export function basePageItem(page, { publishedAt, team = [], partners = [] }) {
  const slug = /** @type {keyof typeof adminDictionary.pageNames} */ (page.slug);
  return {
    slug: page.slug,
    // ქართული — ძირითადი ვერსია; ინგლისური — თარგმანი (F9; `ta()` მიმდინარე ენას დააბრუნებდა)
    title: adminDictionary.pageNames[slug],
    translations: { en: { title: adminDictionaryEn.pageNames[slug] } },
    path: page.path,
    status: 'published',
    publishedAt,
    fields: { heading: '', lead: '', description: '' },
    ...(page.slug === 'about' && {
      team: structuredClone(team),
      partners: structuredClone(partners),
    }),
  };
}

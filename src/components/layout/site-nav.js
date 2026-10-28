/**
 * გარსის ბმულები — ერთი წყარო SiteHeader-ისა და SiteFooter-ისთვის (project-context §5).
 * წარწერა i18n-ის გასაღებია (`t(label)`), URL ლათინურია.
 */

/**
 * @typedef {object} NavItem
 * @property {string} to
 * @property {string} label   i18n-ის გასაღები
 * @property {boolean} [end]  მხოლოდ ზუსტი დამთხვევა (მთავარი)
 */

/** ჰედერის 7 პუნქტი (SiteHeader დაფა: „განვითარება“ მოკლე ფორმითაა). @type {readonly NavItem[]} */
export const NAV_ITEMS = Object.freeze([
  { to: '/', label: 'nav.home', end: true },
  { to: '/about', label: 'nav.about' },
  { to: '/articles', label: 'nav.articles' },
  { to: '/development', label: 'nav.developmentShort' },
  { to: '/videos', label: 'nav.videos' },
  { to: '/news', label: 'nav.news' },
  { to: '/contact', label: 'nav.contact' },
]);

/**
 * CTA „ჩაერთე“. §5-ში ცალკე გვერდი არ არის — დროებით კონტაქტის გვერდი (ფორმაში თემა
 * „მოხალისეობა“ / „პარტნიორობა“). გადასაწყვეტია (progress.md, F4 ღია საკითხი 1).
 */
export const JOIN_HREF = '/contact';

/**
 * ფუტერის ბმული: `to` — შიდა როუტი; `setting` — `SiteSettings.links`-ის ველი
 * (null → „[ბმული მზადდება]“, ბმულის გარეშე).
 * @typedef {{ label: string, to?: string, setting?: keyof import('@/content/model.js').SiteSettings['links'] }} FooterLink
 */

/** @type {readonly FooterLink[]} */
export const FOOTER_MATERIALS = Object.freeze([
  { to: '/articles', label: 'nav.articles' },
  { to: '/development', label: 'nav.development' },
  { to: '/videos', label: 'nav.videos' },
  { to: '/news', label: 'nav.news' },
]);

/** გუნდი და პარტნიორები — AboutPage-ის სექციები (F5: `id="team"`, `id="partners"`). */
/** @type {readonly FooterLink[]} */
export const FOOTER_ORGANIZATION = Object.freeze([
  { to: '/about', label: 'nav.about' },
  { to: '/about#team', label: 'footer.team' },
  { to: '/about#partners', label: 'footer.partners' },
  { to: JOIN_HREF, label: 'nav.cta' },
]);

/** @type {readonly FooterLink[]} */
export const FOOTER_ACCESSIBILITY = Object.freeze([
  { setting: 'accessibilityStatement', label: 'footer.accessibilityStatement' },
  { to: '/contact?topic=barrier', label: 'footer.reportBarrier' },
]);

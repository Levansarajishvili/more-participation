/**
 * B7: საჯარო გვერდების მეტამონაცემის ერთი წყარო — სერვერი მას `index.html`-ში ჩასვამს (`<title>`,
 * description, `og:*`, canonical, hreflang, robots, რეალური 404 — prerender-ის ნაცვლად), საიტის რუკა
 * (`sitemap.xml`) მისგან იწყობა. `routes.jsx`-ის `handle.title` იგივე გასაღებებია — თანხვედრას
 * `src/content/seo.test.js` ამოწმებს.
 *
 * ტექსტი i18n-იდანაა (`ka.js` / `en.js`); გასაღები აქ ინახება, არა სტრიქონი. მასალის გვერდზე
 * (სტატია, სიახლე, ვიდეო, სერია) სათაური და აღწერა მასალისაა (`publicItem` — მოთხოვნის ენაზე).
 */

/** @typedef {import('@/i18n/locale.js').Locale} Locale */
/** @typedef {'articles' | 'news' | 'videos' | 'series'} ItemCollection */

/**
 * @typedef {object} SitePage
 * @property {string} path            React Router-ის გზა ენის პრეფიქსის გარეშე (`/articles/:slug`)
 * @property {string | null} title    i18n-ის გასაღები; null — მხოლოდ საიტის სახელი (მთავარი)
 * @property {string} [description]   i18n-ის გასაღები (მასალის გვერდზე — მასალის აღწერა)
 * @property {ItemCollection} [item]  `:slug` — ამ კოლექციის საჯარო მასალა; არ არსებობს → 404
 * @property {Record<string, ItemCollection>} [query]  `?video=` / `?series=` — მასალის ხედი სიის
 *   გვერდზე (არარსებული → სიის გვერდი, 200: სია ჩანს, ფლეიერი / სერია — არა)
 * @property {boolean} [index]        false — `noindex` (ბმულის გვერდები, ნავიგაციაში არ არის)
 * @property {boolean} [sitemap]      false — საიტის რუკაში არ შედის
 */

/** @type {readonly Readonly<SitePage>[]} */
export const SITE_PAGES = Object.freeze(
  [
    { path: '/', title: null, description: 'home.heroLead' },
    { path: '/about', title: 'nav.about', description: 'about.heroLead' },
    { path: '/articles', title: 'nav.articles', description: 'articles.lead' },
    { path: '/articles/:slug', title: 'nav.articles', item: 'articles', sitemap: false },
    {
      path: '/development',
      title: 'nav.development',
      description: 'development.lead',
      query: { series: 'series' },
    },
    {
      path: '/videos',
      title: 'nav.videos',
      description: 'videos.lead',
      query: { video: 'videos' },
    },
    { path: '/news', title: 'nav.news', description: 'news.lead' },
    { path: '/news/:slug', title: 'nav.news', item: 'news', sitemap: false },
    { path: '/contact', title: 'nav.contact', description: 'contact.lead' },
    {
      path: '/subscribe/confirm',
      title: 'subscription.confirmTitle',
      description: 'subscription.confirmLead',
      index: false,
      sitemap: false,
    },
    {
      path: '/subscribe/unsubscribe',
      title: 'subscription.unsubscribeTitle',
      description: 'subscription.unsubscribeLead',
      index: false,
      sitemap: false,
    },
  ].map((page) => Object.freeze(page)),
);

/**
 * ადმინის მისამართი: `/admin`, `/admin/…`, `/admin?…` (არა `/administration`) — router-ის lazy
 * discovery (`routes.jsx`) და სერვერის `noindex` ერთი წესით.
 */
export const ADMIN_PATH = /^\/admin(?:[/?#]|$)/;

/** არარსებული გვერდის სათაური (`NotFoundPage`, `routes.jsx`-ის `*`). */
export const NOT_FOUND_TITLE = 'shell.notFoundTitle';

/**
 * მასალის საჯარო მისამართი ენის პრეფიქსის გარეშე: სტატია / სიახლე — საკუთარი გვერდი, ვიდეო და
 * სერია — სიის გვერდის პარამეტრი (F7 / F6-ის მისამართები).
 * @param {ItemCollection} collection
 * @param {string} slug
 * @returns {string}
 */
export function itemPath(collection, slug) {
  const value = encodeURIComponent(slug);
  if (collection === 'videos') return `/videos?video=${value}`;
  if (collection === 'series') return `/development?series=${value}`;
  return `/${collection}/${value}`;
}

/**
 * გზა (ენის პრეფიქსის გარეშე, query-ს გარეშე) → გვერდი + slug. `/about/` (დახრილი ხაზით) არ
 * ემთხვევა — სერვერი მას `/about`-ზე გადაამისამართებს.
 * @param {string} pathname
 * @returns {{ page: Readonly<SitePage>, slug: string | null } | null}
 */
export function matchSitePage(pathname) {
  for (const page of SITE_PAGES) {
    if (!page.path.includes(':')) {
      if (page.path === pathname) return { page, slug: null };
      continue;
    }
    const prefix = page.path.slice(0, page.path.indexOf(':'));
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length);
    if (!rest || rest.includes('/')) continue;
    let slug;
    try {
      slug = decodeURIComponent(rest);
    } catch {
      return null;
    }
    return { page, slug };
  }
  return null;
}

/**
 * საძიებო სისტემისთვის განკუთვნილი მოკლე აღწერა: ცარიელი ადგილები შეკუმშულია, ≤ 200 სიმბოლო
 * (სიტყვის საზღვარზე, `…`-ით).
 * @param {unknown} text
 * @param {number} [max]
 * @returns {string}
 */
export function metaDescription(text, max = 200) {
  const clean = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

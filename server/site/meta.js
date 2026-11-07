import { publicItem } from '@/content/public.js';
import {
  ADMIN_PATH,
  NOT_FOUND_TITLE,
  itemPath,
  matchSitePage,
  metaDescription,
} from '@/content/seo.js';
import { youtubeThumbnail } from '@/content/youtube.js';
import { t } from '@/i18n/index.js';
import { localeFromPath, localizePath, stripLocale } from '@/i18n/locale.js';

import { inLocale } from '../lib/i18n.js';

/**
 * B7: სერვერის meta (prerender-ის ნაცვლად, B0 #3): `index.html`-ში `<html lang>`, `<title>`,
 * description, `og:*`, canonical, hreflang (ka / en / x-default), robots და HTTP სტატუსი (რეალური 404).
 * HTML JS-ის გარეშეც შეიცავს სწორ სათაურს, ენას და ალტერნატივებს; გვერდის შიგთავსს React ხატავს.
 *
 * - მასალის გვერდი (`/articles/:slug`, `/news/:slug`, `?video=`, `?series=`): სათაური / აღწერა /
 *   ფოტო — მასალისა მოთხოვნის ენაზე (`publicItem`); თარგმანის გარეშე მასალას ინგლისური ალტერნატივა არ
 *   აქვს და canonical ქართულ მისამართზეა (ინგლისურ საიტზე იგივე ქართული ტექსტი ჩანს — დუბლიკატი).
 * - არარსებული გზა ან მასალა → 404 + `noindex` (SPA თავის 404-ს ხატავს).
 * - ადმინი, ბმულის გვერდები (`/subscribe/*`), 404 და `SITE_INDEXING=off` → `noindex, nofollow`.
 * - ჩასმული `<link>` / `<meta>` — `data-mc-head`: კლიენტი hreflang-ის დუბლიკატს შლის (React-ის
 *   `AlternateLinks` გადასვლისას თავად ახლდება).
 */

/** @typedef {import('@/i18n/locale.js').Locale} Locale */

/**
 * @typedef {object} PageMeta
 * @property {number} status
 * @property {Locale} lang
 * @property {string} title          დოკუმენტის სათაური („{გვერდი} — მეტი ჩართულობა“)
 * @property {string} heading        `og:title` — გვერდის / მასალის სათაური
 * @property {string} description
 * @property {boolean} index
 * @property {string | null} canonical
 * @property {{ hreflang: 'ka' | 'en' | 'x-default', href: string }[]} alternates
 * @property {'website' | 'article'} type
 * @property {{ src: string, alt: string } | null} image
 * @property {boolean} admin
 */

const OG_LOCALE = Object.freeze({ ka: 'ka_GE', en: 'en_GB' });

/** @param {unknown} value */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {Record<string, any>} item  localized
 * @param {string} origin
 * @returns {{ src: string, alt: string } | null}
 */
function itemImage(item, origin) {
  const videoThumb = youtubeThumbnail(item.youtube?.id, 'hq');
  if (videoThumb) return { src: videoThumb, alt: '' };
  const src = item.cover?.src;
  if (typeof src !== 'string' || !src) return null;
  if (src.startsWith('/')) return { src: `${origin}${src}`, alt: String(item.cover.alt ?? '') };
  return /^https:\/\//.test(src) ? { src, alt: String(item.cover.alt ?? '') } : null;
}

/**
 * @param {object} input
 * @param {string} input.pathname   URL-ის გზა (query-ს გარეშე)
 * @param {URLSearchParams} input.searchParams
 * @param {string} input.origin     `PUBLIC_ORIGIN`
 * @param {boolean} input.indexing
 * @param {(collection: string, slug: string) => Promise<Record<string, any> | null>} input.findItem
 *   საჯარო მასალა (ნედლი, თარგმანით); null — არ არსებობს (404)
 * @param {(error: unknown) => void} [input.onError]  ბაზის შეცდომა: მასალა უცნობია → გვერდის ზოგადი
 *   meta, 200 (SPA თავის შეცდომის მდგომარეობას აჩვენებს)
 * @returns {Promise<PageMeta>}
 */
export async function resolveMeta({ pathname, searchParams, origin, indexing, findItem, onError }) {
  const lang = localeFromPath(pathname);
  const bare = stripLocale(pathname);
  const url = (/** @type {string} */ path, /** @type {Locale} */ locale) =>
    `${origin}${localizePath(path, locale)}`;

  /** @type {(fields: Partial<PageMeta> & { heading: string | null }) => PageMeta} */
  const make = ({ heading, ...fields }) =>
    inLocale(lang, () => ({
      status: 200,
      lang,
      title: heading ? t('meta.pageTitle', { title: heading }) : t('meta.siteName'),
      heading: heading ?? t('meta.siteName'),
      description: '',
      index: false,
      canonical: null,
      alternates: [],
      type: 'website',
      image: null,
      admin: false,
      ...fields,
    }));

  if (ADMIN_PATH.test(bare)) return make({ heading: null, admin: true });

  /** @returns {Promise<Record<string, any> | null | undefined>} undefined — შეცდომა, უცნობია */
  const lookup = async (/** @type {string} */ collection, /** @type {string} */ slug) => {
    try {
      return await findItem(collection, slug);
    } catch (error) {
      onError?.(error);
      return undefined;
    }
  };

  const notFound = () => make({ status: 404, heading: inLocale(lang, () => t(NOT_FOUND_TITLE)) });

  const match = matchSitePage(bare);
  if (!match) return notFound();
  const { page, slug } = match;

  /** @type {{ collection: string, slug: string, raw: Record<string, any> } | null} */
  let found = null;
  if (page.item && slug !== null) {
    const raw = await lookup(page.item, slug);
    if (raw === null) return notFound();
    if (raw) found = { collection: page.item, slug, raw };
  } else if (page.query) {
    for (const [key, collection] of Object.entries(page.query)) {
      const value = searchParams.get(key);
      if (!value) continue;
      const raw = await lookup(collection, value);
      if (raw) found = { collection, slug: value, raw };
      break;
    }
  }

  const index = indexing && page.index !== false;
  if (found) {
    const item = inLocale(lang, () => publicItem(found.collection, found.raw, lang));
    const translated = publicItem(found.collection, found.raw, 'en').lang === 'en';
    const path = itemPath(/** @type {any} */ (found.collection), found.slug);
    return make({
      heading: String(item.title ?? ''),
      description: metaDescription(item.excerpt),
      index,
      canonical: url(path, translated ? lang : 'ka'),
      alternates: translated
        ? [
            { hreflang: 'ka', href: url(path, 'ka') },
            { hreflang: 'en', href: url(path, 'en') },
            { hreflang: 'x-default', href: url(path, 'ka') },
          ]
        : [
            { hreflang: 'ka', href: url(path, 'ka') },
            { hreflang: 'x-default', href: url(path, 'ka') },
          ],
      type: page.item ? 'article' : 'website',
      image: itemImage(item, origin),
    });
  }

  return make({
    heading: page.title ? inLocale(lang, () => t(/** @type {string} */ (page.title))) : null,
    description: page.description
      ? metaDescription(inLocale(lang, () => t(/** @type {string} */ (page.description))))
      : '',
    index,
    canonical: url(bare, lang),
    alternates: [
      { hreflang: 'ka', href: url(bare, 'ka') },
      { hreflang: 'en', href: url(bare, 'en') },
      { hreflang: 'x-default', href: url(bare, 'ka') },
    ],
  });
}

/**
 * `index.html` + meta. inline script-ები (mc-boot — CSP-ის hash) უცვლელია.
 * @param {string} template
 * @param {PageMeta} meta
 * @returns {string}
 */
export function renderIndex(template, meta) {
  const tag = (/** @type {string} */ name, /** @type {Record<string, string>} */ attrs) =>
    `<${name} ${Object.entries(attrs)
      .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
      .join(' ')} data-mc-head />`;
  const head = [];
  if (meta.description) head.push(tag('meta', { name: 'description', content: meta.description }));
  if (!meta.index) head.push(tag('meta', { name: 'robots', content: 'noindex, nofollow' }));
  if (meta.index && meta.canonical)
    head.push(tag('link', { rel: 'canonical', href: meta.canonical }));
  if (!meta.admin && meta.status === 200) {
    for (const alt of meta.alternates) {
      head.push(tag('link', { rel: 'alternate', hreflang: alt.hreflang, href: alt.href }));
    }
    const siteName = inLocale(meta.lang, () => t('meta.siteName'));
    head.push(tag('meta', { property: 'og:site_name', content: siteName }));
    head.push(tag('meta', { property: 'og:title', content: meta.heading }));
    if (meta.description) {
      head.push(tag('meta', { property: 'og:description', content: meta.description }));
    }
    head.push(tag('meta', { property: 'og:type', content: meta.type }));
    if (meta.canonical) head.push(tag('meta', { property: 'og:url', content: meta.canonical }));
    head.push(tag('meta', { property: 'og:locale', content: OG_LOCALE[meta.lang] }));
    if (meta.alternates.some((alt) => alt.hreflang === 'en')) {
      const other = meta.lang === 'ka' ? 'en' : 'ka';
      head.push(tag('meta', { property: 'og:locale:alternate', content: OG_LOCALE[other] }));
    }
    if (meta.image) {
      head.push(tag('meta', { property: 'og:image', content: meta.image.src }));
      if (meta.image.alt) {
        head.push(tag('meta', { property: 'og:image:alt', content: meta.image.alt }));
      }
    }
    head.push(
      tag('meta', {
        name: 'twitter:card',
        content: meta.image ? 'summary_large_image' : 'summary',
      }),
    );
  }
  return template
    .replace(/<html\b([^>]*)\blang="[^"]*"/, `<html$1lang="${meta.lang}"`)
    .replace(
      /<title>[\s\S]*?<\/title>/,
      () => `<title>${escapeHtml(meta.title)}</title>\n    ${head.join('\n    ')}`,
    );
}

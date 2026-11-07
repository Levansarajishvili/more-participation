import { describe, expect, it } from 'vitest';

import { pageRoutes } from '@/routes.jsx';
import en from '@/i18n/en.js';
import ka from '@/i18n/ka.js';

import { NOT_FOUND_TITLE, SITE_PAGES, itemPath, matchSitePage, metaDescription } from './seo.js';

/** @param {Record<string, any>} dict @param {string} key */
const lookup = (dict, key) => key.split('.').reduce((node, part) => node?.[part], dict);

describe('SITE_PAGES (B7) ↔ routes.jsx', () => {
  const routes = pageRoutes
    .filter((route) => route.path !== '*' && route.path !== '__kit')
    .map((route) => ({
      path: route.index ? '/' : `/${route.path}`,
      title: /** @type {{ title?: string | null }} */ (route.handle)?.title ?? null,
    }));

  it('ყოველ საჯარო როუტს ცხრილში იგივე სათაურის გასაღები აქვს და პირიქით', () => {
    expect(SITE_PAGES.map(({ path, title }) => ({ path, title }))).toEqual(routes);
  });

  it('404-ის სათაური `*`-ის როუტისაა', () => {
    const notFound = pageRoutes.find((route) => route.path === '*');
    expect(/** @type {any} */ (notFound?.handle)?.title).toBe(NOT_FOUND_TITLE);
  });

  it('სათაურისა და აღწერის ყოველი გასაღები ორივე ლექსიკონშია (ტექსტი, ჩანაცვლების გარეშე)', () => {
    for (const page of SITE_PAGES) {
      for (const key of [page.title, page.description, NOT_FOUND_TITLE].filter(Boolean)) {
        for (const dict of [ka, en]) {
          const text = lookup(dict, /** @type {string} */ (key));
          expect(typeof text, `${key}`).toBe('string');
          expect(text).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });
});

describe('matchSitePage / itemPath / metaDescription', () => {
  it('სტატიკური და slug-იანი გზა; დახრილი ხაზი, ქვეგზა და უცნობი — არა', () => {
    expect(matchSitePage('/')?.page.path).toBe('/');
    expect(matchSitePage('/articles')).toMatchObject({ page: { path: '/articles' }, slug: null });
    expect(matchSitePage('/articles/zrda')).toMatchObject({
      page: { item: 'articles' },
      slug: 'zrda',
    });
    expect(matchSitePage('/news/a-b-c')?.slug).toBe('a-b-c');
    expect(matchSitePage('/articles/')).toBeNull();
    expect(matchSitePage('/articles/a/b')).toBeNull();
    expect(matchSitePage('/about/')).toBeNull();
    expect(matchSitePage('/ar-arsebuli')).toBeNull();
    expect(matchSitePage('/articles/%E0%A4%A')).toBeNull();
    expect(matchSitePage('/subscribe/confirm')?.page.index).toBe(false);
  });

  it('მასალის მისამართი — ვიდეო და სერია სიის პარამეტრით', () => {
    expect(itemPath('articles', 'zrda')).toBe('/articles/zrda');
    expect(itemPath('news', 'akhali')).toBe('/news/akhali');
    expect(itemPath('videos', 'sporti')).toBe('/videos?video=sporti');
    expect(itemPath('series', 'chveva')).toBe('/development?series=chveva');
  });

  it('აღწერა: ცარიელი ადგილები იკუმშება, გრძელი — სიტყვის საზღვარზე `…`-ით', () => {
    expect(metaDescription('  ა  ბ\n გ ')).toBe('ა ბ გ');
    expect(metaDescription(null)).toBe('');
    const long = metaDescription('სიტყვა '.repeat(60));
    expect(long.length).toBeLessThanOrEqual(200);
    expect(long.endsWith('სიტყვა…')).toBe(true);
  });
});

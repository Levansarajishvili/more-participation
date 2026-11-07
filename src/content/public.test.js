import { afterEach, describe, expect, it } from 'vitest';

import { t } from '@/i18n/index.js';
import { getLocale, setLocale, withLocale } from '@/i18n/locale.js';

import { createMockData } from './mock/data.js';
import { compactTranslation, orgFromPage, publicItem, publicSnapshot } from './public.js';
import { blocksToText, readingMinutes } from './text.js';

afterEach(() => setLocale('ka'));

const NOW = Date.parse('2026-10-26T12:00:00+04:00');

describe('B6: საჯარო ხედი (public.js)', () => {
  it('publicItem: localize + readingMinutes ენის ვერსიის ტექსტით; შენახული მნიშვნელობა არ გამოიყენება', () => {
    const data = createMockData({ now: NOW });
    const article = data.articles.find((a) => a.translations?.en?.body?.length);
    expect(article).toBeDefined();
    const stale = { ...article, readingMinutes: 1 };
    const ka = publicItem('articles', stale, 'ka');
    const en = publicItem('articles', stale, 'en');
    expect(ka.readingMinutes).toBe(readingMinutes(blocksToText(article.body)));
    expect(en.readingMinutes).toBe(
      readingMinutes(blocksToText(/** @type {any} */ (article).translations.en.body)),
    );
    expect(en).toMatchObject({ lang: 'en' });
    expect(en).not.toHaveProperty('translations');
    // მონახაზი ტექსტის გარეშე — არ ვარდება
    expect(publicItem('articles', { slug: 'x', title: '' }, 'ka')).toEqual({
      slug: 'x',
      title: '',
      lang: 'ka',
    });
  });

  it('publicSnapshot: სტატიებსა და სერიებს readingMinutes; დანარჩენი — localize', () => {
    const data = createMockData({ now: NOW });
    const view = publicSnapshot(data, 'en');
    expect(view.series.every((s) => s.readingMinutes >= 1)).toBe(true);
    expect(view.team[0]).toMatchObject({ lang: 'en', role: '[Founder]' });
    expect(view.stages).toBe(data.stages);
  });

  it('compactTranslation: ცარიელი სტრიქონი, ჰარი, null — ქრება; ცარიელი ობიექტი — undefined', () => {
    expect(compactTranslation({ name: '', role: ' x ', photo: { alt: '  ' }, bio: null })).toEqual({
      role: ' x ',
    });
    expect(compactTranslation({ name: '', photo: {} })).toBeUndefined();
    expect(compactTranslation([null, { a: '' }])).toBeUndefined();
    expect(compactTranslation([null, { a: 'b' }])).toEqual([null, { a: 'b' }]);
  });

  it('orgFromPage: გვერდის translations.en.team[i] წევრის თარგმანს ზემოდან ედება; ცარიელი სახელი არ ითვლება', () => {
    const page = {
      team: [
        { slug: 'a', name: 'ა', role: 'როლი', translations: { en: { role: '[Founder]' } } },
        { slug: 'b', name: 'ბ', role: 'როლი' },
        { slug: 'c', name: 'გ', role: 'როლი' },
      ],
      partners: [{ slug: 'p', name: 'პ' }],
      translations: {
        en: {
          title: 'About',
          team: [{ name: '', role: '[Director]', photo: { alt: '[Photo]' } }, null, { name: ' ' }],
          partners: [{ name: '[Partner]' }],
        },
      },
    };
    const { team, partners, stages } = orgFromPage(page);
    expect(team[0].translations.en).toEqual({ role: '[Director]', photo: { alt: '[Photo]' } });
    expect(team[1]).toBe(page.team[1]);
    expect(team[2]).toBe(page.team[2]);
    expect(partners[0].translations.en).toEqual({ name: '[Partner]' });
    expect(stages).toEqual([]);
    expect(orgFromPage(null)).toEqual({ team: [], partners: [], stages: [] });
  });
});

describe('B6: withLocale', () => {
  it('ფუნქცია მითითებულ ენაზე, შემდეგ ენა აღდგება (შეცდომისასაც); async → TypeError', () => {
    setLocale('ka');
    expect(withLocale('en', () => [getLocale(), t('errors.not-found')])).toEqual([
      'en',
      expect.not.stringMatching(/[\u10D0-\u10FF]/),
    ]);
    expect(getLocale()).toBe('ka');
    expect(() =>
      withLocale('en', () => {
        throw new Error('x');
      }),
    ).toThrow('x');
    expect(getLocale()).toBe('ka');
    expect(() => withLocale('en', async () => 1)).toThrow(TypeError);
    expect(getLocale()).toBe('ka');
    expect(withLocale(/** @type {any} */ ('de'), () => getLocale())).toBe('ka');
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '@/i18n/locale.js';

import { contentLang, isTranslated, localize, localizeSnapshot, overlay } from './localize.js';
import { createMockAdapter } from './mock/index.js';

afterEach(() => setLocale('ka'));

describe('F9: localize', () => {
  const item = {
    slug: 'x',
    title: 'ქართული',
    excerpt: 'აღწერა',
    cover: { src: '/a.jpg', alt: 'ქართული alt', ratio: '3:2' },
    body: [
      { type: 'p', content: [{ type: 'text', text: 'ა' }] },
      { type: 'h2', text: 'ბ' },
    ],
    slides: [
      { title: 'ს1', plain: 'მ1' },
      { title: 'ს2', plain: 'მ2' },
    ],
    translations: {
      en: {
        title: 'English',
        excerpt: '  ',
        cover: { alt: 'English alt' },
        body: [{ type: 'p', content: [{ type: 'text', text: 'A' }] }],
        slides: [{ title: 'S1' }],
      },
    },
  };

  it('თარგმანი ზემოდან: ცარიელი → ქართული, body იცვლება, მასივი ინდექსით, src უცვლელი; translations არ ჩანს', () => {
    const en = localize(item, 'en');
    expect(en).toMatchObject({ lang: 'en', title: 'English', excerpt: 'აღწერა' });
    expect(en.cover).toEqual({ src: '/a.jpg', alt: 'English alt', ratio: '3:2' });
    expect(en.body).toHaveLength(1);
    expect(en.slides).toEqual([
      { title: 'S1', plain: 'მ1' },
      { title: 'ს2', plain: 'მ2' },
    ]);
    expect(en).not.toHaveProperty('translations');
  });

  it('თარგმანის გარეშე / ქართულად — ქართული, lang: ka', () => {
    expect(localize({ ...item, translations: undefined }, 'en')).toMatchObject({
      lang: 'ka',
      title: 'ქართული',
    });
    expect(localize(item, 'ka')).toMatchObject({ lang: 'ka', title: 'ქართული' });
    expect(isTranslated({ translations: { en: { title: ' ' } } }, 'en')).toBe(false);
    expect(overlay([1, 2], [], 'body')).toEqual([1, 2]);
  });

  it('contentLang: lang მხოლოდ მაშინ, როცა გვერდის ენას არ ემთხვევა', () => {
    setLocale('en');
    expect(contentLang({ lang: 'ka' })).toBe('ka');
    expect(contentLang({ lang: 'en' })).toBeUndefined();
    setLocale('ka');
    expect(contentLang({ lang: 'ka' })).toBeUndefined();
  });

  it('mock adapter პასუხობს მიმდინარე ენაზე; ძიება ინგლისურ ტექსტში მუშაობს', async () => {
    const adapter = createMockAdapter();
    setLocale('en');
    const translated = await adapter.getArticle('rogor-vaktsiot-tsarumatebloba-stsavlad');
    expect(translated).toMatchObject({ lang: 'en', title: '[How to turn failure into learning]' });
    const list = await adapter.listArticles({ q: 'failure', limit: 20 });
    expect(list.items.map((a) => a.slug)).toContain('rogor-vaktsiot-tsarumatebloba-stsavlad');
    expect(list.items[0].lang).toBe('en');
    const untranslated = (await adapter.listArticles({ limit: 20 })).items.find(
      (a) => a.lang === 'ka',
    );
    expect(untranslated).toBeDefined();
    const settings = await adapter.getSettings();
    expect(settings.responseTime).toBe('[within 2 working days]');
    setLocale('ka');
    expect((await adapter.getArticle('rogor-vaktsiot-tsarumatebloba-stsavlad')).title).toBe(
      '[როგორ ვაქციოთ წარუმატებლობა სწავლად]',
    );
    expect(localizeSnapshot(adapter.store.snapshot(), 'en').team[0].role).toBe('[Founder]');
  });
});

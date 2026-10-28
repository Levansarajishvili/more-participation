import { getLocale } from '@/i18n/index.js';

/**
 * F9: მასალის სათაური პანელის ენაზე — ინგლისურ პანელში ინგლისური სათაური (`titleEn`), თუ თარგმანი
 * არის; თუ არა — ქართული `lang="ka"`-ით (WCAG 3.1.2). ქართულ პანელში — ქართული, `lang`-ის გარეშე.
 * @param {{ title: string, titleEn?: string | null }} row
 * @returns {{ text: string, lang: 'ka' | undefined }}
 */
export function rowTitle(row) {
  if (getLocale() !== 'en') return { text: row.title, lang: undefined };
  return row.titleEn ? { text: row.titleEn, lang: undefined } : { text: row.title, lang: 'ka' };
}

/** ძირითადი (ქართული) მასალის ტექსტის `lang` ინგლისურ პანელში. */
export function baseLang() {
  return getLocale() === 'en' ? 'ka' : undefined;
}

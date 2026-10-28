import { afterEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '@/content/errors.js';
import {
  ACCESS_LEVELS,
  ARTICLE_CATEGORIES,
  ARTICLE_SORTS,
  CONTACT_TOPICS,
  EVENT_FORMATS,
  NEWS_TYPES,
  OFFICE_FEATURES,
  ORG_PILLARS,
  ORG_VALUES,
  PARTNER_KINDS,
  REPLY_CHANNELS,
  SERIES_TOPICS,
  SOCIAL_NETWORKS,
  VIDEO_CATEGORIES,
  label,
} from '@/content/taxonomy.js';
import { STATUSES } from '@/content/model.js';

import en from './en.js';
import {
  alternatePath,
  createT,
  formatDate,
  formatDateParts,
  formatDuration,
  formatDurationLabel,
  formatTimeRange,
  getYear,
  localeFromPath,
  localizePath,
  setLocale,
  t,
  toDateAttribute,
} from './index.js';
import ka from './ka.js';

/**
 * @param {unknown} node
 * @param {string} [prefix]
 * @returns {Map<string, string>}
 */
function flatten(node, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(/** @type {object} */ (node))) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    // F9: მრავლობითი `{ one, other }` — ერთი გასაღებია (ფორმები — `other`-ით შედარება)
    else if (value && typeof value === 'object' && typeof value.other === 'string') {
      out.set(path, Object.values(value).join(' '));
    } else flatten(value, path, out);
  }
  return out;
}

const vars = (/** @type {string} */ s) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('ლექსიკონები', () => {
  const kaFlat = flatten(ka);
  const enFlat = flatten(en);

  it('en.js-ს ზუსტად იგივე გასაღებები აქვს, რაც ka.js-ს', () => {
    expect([...enFlat.keys()].sort()).toEqual([...kaFlat.keys()].sort());
  });

  it('F9: en.js თარგმნილია — [EN] placeholder არ არის, ცვლადები იგივეა (მრავლობითის ყველა ფორმაში)', () => {
    for (const [key, value] of enFlat) {
      expect(value.startsWith('[EN'), key).toBe(false);
      expect([...new Set(vars(value))], key).toEqual([
        ...new Set(vars(/** @type {string} */ (kaFlat.get(key)))),
      ]);
    }
  });

  it('ka.js-ში ცარიელი სტრიქონი არ არის', () => {
    expect([...kaFlat].filter(([, v]) => v.trim() === '')).toEqual([]);
  });

  it('ტაქსონომიის ყველა id-ს წარწერა აქვს', () => {
    /** @type {[import('@/content/taxonomy.js').TaxonomyKind, readonly string[]][]} */
    const lists = [
      ['articleCategory', ARTICLE_CATEGORIES],
      ['articleSort', ARTICLE_SORTS],
      ['seriesTopic', SERIES_TOPICS],
      ['videoCategory', VIDEO_CATEGORIES],
      ['newsType', NEWS_TYPES],
      ['newsTypePlural', NEWS_TYPES],
      ['eventFormat', EVENT_FORMATS],
      ['contactTopic', CONTACT_TOPICS],
      ['replyChannel', REPLY_CHANNELS],
      ['officeFeature', OFFICE_FEATURES],
      ['partnerKind', PARTNER_KINDS],
      ['socialNetwork', SOCIAL_NETWORKS],
      ['status', STATUSES],
    ];
    for (const [kind, ids] of lists) {
      for (const id of ids)
        expect(kaFlat.has(`taxonomy.${kind}.${id}`), `${kind}.${id}`).toBe(true);
    }
    for (const field of ['wheelchair', 'signInterpreter', 'captions']) {
      for (const level of ACCESS_LEVELS.filter((l) => l !== 'not-applicable')) {
        expect(kaFlat.has(`event.${field}.${level}`), `${field}.${level}`).toBe(true);
      }
    }
    for (const id of ORG_PILLARS) expect(kaFlat.has(`about.pillars.${id}.title`)).toBe(true);
    for (const id of ORG_VALUES) expect(kaFlat.has(`about.values.${id}.title`)).toBe(true);
    for (const code of ERROR_CODES) expect(kaFlat.has(`errors.${code}`)).toBe(true);
    expect(label('articleCategory', 'career')).toBe('კარიერა');
  });
});

describe('t()', () => {
  it('ჩასმა: რიცხვი ka-GE ფორმატით, არსებითი მხოლობითში', () => {
    expect(t('articles.found', { count: 5 })).toBe('ნაპოვნია 5 სტატია');
    // CLDR ka: ოთხნიშნა რიცხვი დაჯგუფების გარეშე, ხუთნიშნა — უწყვეტი ჰარით (U+00A0)
    expect(t('common.shownOf', { shown: 12, total: 1250 })).toBe('ნაჩვენებია 12 / 1250');
    expect(t('common.shownOf', { shown: 12, total: 12500 })).toBe('ნაჩვენებია 12 / 12\u00a0500');
    expect(t('articles.foundIn', { count: 3, filters: 'კარიერა' })).toBe(
      'ნაპოვნია 3 სტატია — კარიერა',
    );
    expect(t('common.loadedMore', { added: 6, shown: 12 })).toBe('დაემატა 6, სულ 12');
  });

  it('უცნობი გასაღები → თავად გასაღები + dev-გაფრთხილება ერთხელ', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tt = createT({ a: { b: 'ბ' } });
    expect(tt('a.b')).toBe('ბ');
    expect(tt('a.x.y')).toBe('a.x.y');
    expect(tt('a.x.y')).toBe('a.x.y');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('გამოტოვებული ცვლადი {name}-ად რჩება', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(t('saved.added', {})).toBe('შენახულია: {title}');
  });
});

describe('ფორმატირება (ka-GE, Asia/Tbilisi)', () => {
  const date = '2026-03-05T10:00:00+04:00';

  it('formatDate სტილებით', () => {
    expect(formatDate(date)).toBe('5 მარტი, 2026');
    expect(formatDate(date, 'weekday')).toBe('ხუთშაბათი, 5 მარტი');
    expect(formatDate(date, 'dayMonth')).toBe('5 მარტი');
    expect(formatDate('არა თარიღი')).toBe('');
    expect(formatDate(null)).toBe('');
  });

  it('თბილისის დრო: 31 დეკემბერი 21:00 UTC უკვე 1 იანვარია', () => {
    const instant = '2026-12-31T21:00:00Z';
    expect(getYear(instant)).toBe(2027);
    expect(toDateAttribute(instant)).toBe('2027-01-01');
  });

  it('formatDateParts — ბარათის ნიშანი', () => {
    expect(formatDateParts(date)).toEqual({
      day: '05',
      month: 'მარტი',
      monthShort: 'მარ',
      year: '2026',
    });
  });

  it('formatTimeRange', () => {
    expect(formatTimeRange(date, '2026-03-05T16:00:00+04:00')).toBe('10:00–16:00');
    expect(formatTimeRange(date)).toBe('10:00');
  });

  it('F6 (§9.7): ICU-ის ქართული ლოკალის გარეშეც — სრული ICU-ის ka-GE-ს სიმბოლოსიმბოლო ემთხვევა', () => {
    /** @param {Intl.DateTimeFormatOptions} options */
    const icu = (options) =>
      new Intl.DateTimeFormat('ka-GE', { timeZone: 'Asia/Tbilisi', ...options });
    const styles = {
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      weekday: { weekday: 'long', day: 'numeric', month: 'long' },
      monthYear: { month: 'long', year: 'numeric' },
      dayMonth: { day: 'numeric', month: 'long' },
      dateTime: {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    };
    // 12 თვე × 7 კვირის დღე × შუაღამის მახლობლად (თბილისი UTC+4)
    for (let i = 0; i < 84; i += 1) {
      const date = new Date(Date.UTC(2026, i % 12, 1 + (i % 28), (i * 5) % 24, (i * 7) % 60));
      for (const [style, options] of Object.entries(styles)) {
        expect(formatDate(date, /** @type {never} */ (style))).toBe(
          icu(/** @type {Intl.DateTimeFormatOptions} */ (options)).format(date),
        );
      }
      expect(formatDateParts(date)?.monthShort).toBe(icu({ month: 'short' }).format(date));
    }
  });

  it('formatDuration და formatDurationLabel', () => {
    expect(formatDuration(270)).toBe('04:30');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDurationLabel(270)).toBe('4 წუთი 30 წამი');
    expect(formatDurationLabel(120)).toBe('2 წუთი');
    expect(formatDurationLabel(0)).toBe('0 წამი');
    expect(formatDurationLabel(3600)).toBe('1 საათი');
  });
});

describe('F9: ინგლისური ენა', () => {
  afterEach(() => setLocale('ka'));

  it('t() მიმდინარე ენით; მრავლობითი count-ით; რიცხვი en-GB ფორმატით', () => {
    setLocale('en');
    expect(document.documentElement.lang).toBe('en');
    expect(t('articles.found', { count: 1 })).toBe('1 article found');
    expect(t('articles.found', { count: 5 })).toBe('5 articles found');
    expect(t('common.shownOf', { shown: 12, total: 12500 })).toBe('Showing 12 of 12,500');
    expect(formatDurationLabel(61)).toBe('1 minute 1 second');
    setLocale('ka');
    expect(t('articles.found', { count: 5 })).toBe('ნაპოვნია 5 სტატია');
  });

  it('თარიღი ინგლისურად (en-GB, თბილისის დრო)', () => {
    setLocale('en');
    const date = '2026-03-05T10:00:00+04:00';
    expect(formatDate(date)).toBe('5 March 2026');
    expect(formatDate(date, 'weekday')).toBe('Thursday, 5 March');
    expect(formatDate(date, 'monthYear')).toBe('March 2026');
    expect(formatDate(date, 'dateTime')).toBe('5 March 2026, 10:00');
    expect(formatDateParts(date)).toMatchObject({ month: 'March', monthShort: 'Mar' });
  });

  it('localizePath / alternatePath / localeFromPath', () => {
    expect(localeFromPath('/en')).toBe('en');
    expect(localeFromPath('/en/articles')).toBe('en');
    expect(localeFromPath('/english')).toBe('ka');
    expect(localizePath('/articles', 'en')).toBe('/en/articles');
    expect(localizePath('/', 'en')).toBe('/en');
    expect(localizePath('/en/articles', 'ka')).toBe('/articles');
    expect(localizePath('/en/articles?x=1', 'en')).toBe('/en/articles?x=1');
    expect(localizePath('/admin/articles', 'en')).toBe('/en/admin/articles');
    expect(localizePath('/en/admin/articles', 'ka')).toBe('/admin/articles');
    expect(localizePath('https://example.org/x', 'en')).toBe('https://example.org/x');
    expect(localizePath('#main', 'en')).toBe('#main');
    expect(alternatePath({ pathname: '/news', search: '?type=event', hash: '#top' }, 'en')).toBe(
      '/en/news?type=event#top',
    );
  });

  it('დაკარგული ინგლისური გასაღები → ქართული (სარეზერვო)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tt = createT({ a: 'A' }, { fallback: { a: 'ა', b: 'ბ' } });
    expect([tt('a'), tt('b')]).toEqual(['A', 'ბ']);
  });
});

import { describe, expect, it, vi } from 'vitest';

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
  createT,
  formatDate,
  formatDateParts,
  formatDuration,
  formatDurationLabel,
  formatTimeRange,
  getYear,
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
    else flatten(value, path, out);
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

  it('en.js — [EN] placeholder-ები იგივე ცვლადებით', () => {
    for (const [key, value] of enFlat) {
      expect(value.startsWith('[EN')).toBe(true);
      expect(vars(value)).toEqual(vars(/** @type {string} */ (kaFlat.get(key))));
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
    expect(t('articles.shownIn', { count: 3, category: 'კარიერა' })).toBe(
      'ნაჩვენებია 3 სტატია — კარიერა',
    );
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

  it('formatDuration და formatDurationLabel', () => {
    expect(formatDuration(270)).toBe('04:30');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDurationLabel(270)).toBe('4 წუთი 30 წამი');
    expect(formatDurationLabel(120)).toBe('2 წუთი');
    expect(formatDurationLabel(0)).toBe('0 წამი');
    expect(formatDurationLabel(3600)).toBe('1 საათი');
  });
});

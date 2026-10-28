import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '@/i18n/index.js';

import en from '../i18n/en.js';
import { ta } from '../i18n/index.js';
import ka from '../i18n/ka.js';

/** @param {unknown} node @param {string} [prefix] @param {Map<string, string>} [out] */
function flatten(node, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(/** @type {object} */ (node))) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else if (value && typeof value === 'object' && typeof value.other === 'string') {
      out.set(path, Object.values(value).join(' '));
    } else flatten(value, path, out);
  }
  return out;
}
const vars = (/** @type {string} */ s) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();

describe('F9: ადმინის ინგლისური ლექსიკონი', () => {
  afterEach(() => setLocale('ka'));
  const kaFlat = flatten(ka);
  const enFlat = flatten(en);

  it('იგივე გასაღებები და ცვლადები; [EN] placeholder არ არის', () => {
    expect([...enFlat.keys()].sort()).toEqual([...kaFlat.keys()].sort());
    for (const [key, value] of enFlat) {
      expect(value.startsWith('[EN'), key).toBe(false);
      expect(vars(value), key).toEqual(vars(/** @type {string} */ (kaFlat.get(key))));
    }
  });

  it('ta() მიმდინარე ენით, მრავლობითით', () => {
    expect(ta('list.found', { count: 3 })).toBe('ნაპოვნია 3 მასალა');
    setLocale('en');
    expect(ta('list.found', { count: 1 })).toBe('1 item found');
    expect(ta('list.found', { count: 3 })).toBe('3 items found');
    expect(ta('nav.dashboard')).toBe('Dashboard');
  });
});

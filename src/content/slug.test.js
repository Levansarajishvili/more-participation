import { describe, expect, it } from 'vitest';

import { SLUG_MAX, isSlug, slugify, transliterate } from './slug.js';

describe('slugify — ეროვნული ტრანსლიტერაცია (§10)', () => {
  it.each([
    ['ჩვევა — 5 ნაბიჯი', 'chveva-5-nabiji'],
    ['[ჩვევა — 5 ნაბიჯი]', 'chveva-5-nabiji'],
    ['„მსოფლხედვა“', 'msoplkhedva'],
    ['დინება (flow)', 'dineba-flow'],
    ['ჟურნალი, ღონე, ყური, შუქი', 'zhurnali-ghone-quri-shuki'],
    ['ცა, ძმა, წყალი, ჭადარი, ხე, ჯარი, ჰაერი', 'tsa-dzma-tsqali-chadari-khe-jari-haeri'],
    ['ᲛᲗᲐᲕᲠᲣᲚᲘ ᲡᲐᲗᲐᲣᲠᲘ', 'mtavruli-satauri'],
    ['CV, რომელიც უნარებზე ლაპარაკობს', 'cv-romelits-unarebze-laparakobs'],
    ['  --ორმაგი   ჰარი--  ', 'ormagi-hari'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('აპოსტროფი არ არის: კ/ქ, პ/ფ, ტ/თ, წ/ც, ჭ/ჩ ერთნაირად იწერება', () => {
    expect(transliterate('კქპფტთწცჭჩ')).toBe('kkpptttstschch');
  });

  it(`გრძელი სათაური სიტყვის საზღვარზე იჭრება (≤ ${SLUG_MAX})`, () => {
    const slug = slugify('ხელმისაწვდომობა '.repeat(10));
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX);
    expect(slug.endsWith('-')).toBe(false);
    expect(isSlug(slug)).toBe(true);
  });

  it('isSlug', () => {
    expect(isSlug('chveva-5-nabiji')).toBe(true);
    for (const bad of ['', 'Chveva', 'a--b', '-a', 'a-', 'ჩვევა', 'a b', '../x', null, 5]) {
      expect(isSlug(bad)).toBe(false);
    }
  });
});

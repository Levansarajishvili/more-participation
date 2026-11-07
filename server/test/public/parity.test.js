import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  CONTENT_SCENARIOS,
  FORM_SCENARIOS,
  NOW,
  mockContentEnv,
} from '@/content/__tests__/scenarios/content-scenarios.js';
import { publicItem } from '@/content/public.js';
import { articleSearchText, isPublic } from '@/content/query.js';
import { setLocale } from '@/i18n/locale.js';

import { publicHttpEnv, seededDatabase } from './public-env.js';

/**
 * B6 parity: frontend-ის კონტენტის ტესტები (`src/content/adapter.test.js` → საერთო
 * `content-scenarios.js`) ორ adapter-ზე — mock და HTTP (რეალური სერვერი + seed-იანი memory-server)
 * — ქართულად და ინგლისურად, იმავე საწყისი მონაცემით და საათით. ყოველი სცენარი ორივე გარემოში
 * საკუთარ `expect`-ებს გადის; კვალი (`notes` — სრული პასუხები) ერთნაირი უნდა იყოს; HTTP-ის ყოველი
 * მოთხოვნა / პასუხი spec-ს და ქეშის წესს აკმაყოფილებს (`problems`).
 *
 * B6, ნაწილი ბ: ფორმის სცენარები (`FORM_SCENARIOS`) — ვალიდაცია ორივე მხარეს ერთნაირი (სერვერის
 * ველის ტექსტი `lang`-ის ენაზე), double opt-in (წერილი — fake გადამცემი), honeypot.
 */

/** @type {Awaited<ReturnType<typeof seededDatabase>>} */
let seeded;

beforeAll(async () => {
  seeded = await seededDatabase('public_parity', { start: NOW });
});
afterAll(() => seeded?.database.drop());

describe('parity: საჯარო სცენარები — mock ↔ HTTP', () => {
  it('seed: ბაზიდან წაკითხულ ნაკრებზე validateContent — 0 შენიშვნა', () => {
    expect(seeded.issues).toEqual([]);
  });

  it('თვითშემოწმება: ქართულისა და ინგლისურის კვალი განსხვავდება (შედარება მართლა მუშაობს)', async () => {
    const scenario = CONTENT_SCENARIOS[0];
    const ka = mockContentEnv({ start: NOW });
    await scenario.run(ka, 'ka');
    setLocale('en');
    try {
      const en = await publicHttpEnv(seeded.database, { start: NOW });
      try {
        await scenario.run(en, 'en');
      } finally {
        await en.close();
      }
      expect(en.notes).not.toEqual(ka.notes);
    } finally {
      setLocale('ka');
    }
  });

  it('ძიება ბაზაში (`searchText`) არაფერს კარგავს: ყოველი სტატიის სიტყვით — ის შედეგშია (ka + en)', async () => {
    const http = await publicHttpEnv(seeded.database, { start: NOW });
    /** @type {string[]} */
    const missed = [];
    try {
      for (const locale of /** @type {const} */ (['ka', 'en'])) {
        setLocale(locale);
        const articles = http.data.articles
          .filter((a) => isPublic(a, NOW))
          .map((a) => /** @type {any} */ (publicItem('articles', a, locale)));
        for (const article of articles) {
          const words = articleSearchText(article).split(' ');
          const sample = [words[0], words[Math.floor(words.length / 2)], words.at(-1)];
          for (const word of sample) {
            const { items } = await http.adapter.listArticles({ q: String(word), limit: 50 });
            if (!items.some((a) => a.slug === article.slug))
              missed.push(`${locale} ${article.slug}: ${word}`);
          }
        }
      }
    } finally {
      setLocale('ka');
      await http.close();
    }
    expect(missed).toEqual([]);
    expect(http.problems).toEqual([]);
  });

  // B6: ფორმები — გამოწერა (double opt-in), კონტაქტი; ველის შეცდომის ტექსტი ორივე ენაზე
  for (const scenario of [...CONTENT_SCENARIOS, ...FORM_SCENARIOS]) {
    for (const locale of scenario.locales) {
      it(`[${locale}] ${scenario.name}`, async () => {
        setLocale(locale);
        try {
          const mock = mockContentEnv({ start: NOW });
          await scenario.run(mock, locale);
          expect(mock.notes.length).toBeGreaterThan(0);
          const http = await publicHttpEnv(seeded.database, { start: NOW });
          try {
            await scenario.run(http, locale);
          } finally {
            await http.close();
          }
          expect(http.problems).toEqual([]);
          expect(http.notes).toEqual(mock.notes);
        } finally {
          setLocale('ka');
        }
      });
    }
  }
});

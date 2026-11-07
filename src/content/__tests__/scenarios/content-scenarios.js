import { expect } from 'vitest';

import { t } from '@/i18n/index.js';

import { ContentError } from '../../errors.js';
import { createMockAdapter } from '../../mock/index.js';
import { createMockData } from '../../mock/data.js';
import { createMockStore } from '../../mock/store.js';
import { MESSAGE_MAX, NAME_MAX, SUPPORT_MAX } from '../../forms.js';
import { ARTICLE_CATEGORIES } from '../../taxonomy.js';

/**
 * საჯარო `ContentAdapter`-ის სცენარები (B6) — ერთი ნაკრები ორ adapter-ზე: mock (`adapter.test.js`,
 * jsdom) და HTTP (`server/test/public/parity.test.js` — რეალური სერვერი, seed-იანი memory-server).
 * სცენარი ერთ ენაზე ეშვება (`setLocale` გარემოს მხარეს): `ka` და `en`. ყოველი სცენარი `expect`-ით
 * თავად ამოწმებს შედეგს და `env.note()`-ით აგროვებს **სრულ პასუხებს** (JSON) — parity-ტესტი ორივე
 * გარემოს კვალს ადარებს, ანუ პასუხი ბაიტამდე ერთნაირი უნდა იყოს (და არა მხოლოდ რაოდენობა).
 *
 * წყარო: F2–F9-ის `adapter.test.js` და `localize.test.js` (mock-ის ტესტები) — ფორმები (B6 ნაწილი ბ)
 * და mock-ის ოფციები (`delay`, `fail`) `adapter.test.js`-შია.
 */

/** @typedef {import('../../adapter.js').ContentAdapter} ContentAdapter */
/** @typedef {import('@/i18n/locale.js').Locale} Locale */

/**
 * @typedef {object} ContentEnv
 * @property {'mock' | 'http'} kind
 * @property {ContentAdapter} adapter      პასუხი მიმდინარე ენაზე (`getLocale()`)
 * @property {import('../../model.js').ContentSnapshot} data   seed-ის წყარო (`createMockData`, ნედლი)
 * @property {() => number} now
 * @property {(ms: number) => void} advance   საათის გადაწევა (დაგეგმილი გამოქვეყნება)
 * @property {unknown[]} notes
 * @property {(...values: unknown[]) => void} note
 * @property {() => Promise<SentMail[]>} mails      B6: გაგზავნილი წერილები (mock — `outbox`, HTTP — fake transport)
 * @property {() => Promise<number>} contacts       B6: შენახული შეტყობინებების რაოდენობა
 * @property {(email: string) => Promise<{ status: string } | null>} subscriber  B6: გამომწერი (ნორმალიზებული ელფოსტით)
 */

/**
 * @typedef {object} SentMail
 * @property {string} template  `subscribe-confirm` | `subscribe-welcome` (კონტაქტის წერილი mock-ში არ არის)
 * @property {string} to
 * @property {string} token     ბმულის `#token=`
 */

/** F2-ის ტესტების საათი — მოსალოდნელი რაოდენობები (14 სტატია, 15 სიახლე…) მასზეა. */
export const NOW = Date.parse('2026-10-26T12:00:00+04:00');
export const DAY = 86_400_000;

/** JSON-ის ასლი: `undefined` ქრება — mock-ის ობიექტი და HTTP-ის პასუხი ერთნაირად შედარდება. */
export const plain = (/** @type {unknown} */ value) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

/**
 * @param {Promise<unknown>} promise
 * @returns {Promise<ContentError>}
 */
export async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ContentError);
    return /** @type {ContentError} */ (error);
  }
  throw new Error('Promise არ უარყოფილა');
}

/** შეცდომა კვალისთვის: კოდი და ტექსტი (მიმდინარე ენაზე). @param {ContentError} error */
const errorNote = (error) => ({ code: error.code, message: error.message });

/**
 * mock-ის გარემო: საცავი `createMockData({ now: start })`-იდან, მართვადი საათი.
 * @param {{ start?: number }} [options]
 * @returns {ContentEnv & { store: ReturnType<typeof createMockStore>, adapter: ReturnType<typeof createMockAdapter> }}
 */
export function mockContentEnv({ start = NOW } = {}) {
  let at = start;
  const data = createMockData({ now: start });
  const store = createMockStore({ now: () => at, data: structuredClone(data) });
  const adapter = createMockAdapter({ store, now: () => at });
  /** @type {unknown[]} */
  const notes = [];
  return {
    kind: 'mock',
    adapter,
    store,
    data,
    now: () => at,
    advance: (ms) => {
      at += ms;
    },
    notes,
    note: (...values) => notes.push(...values.map(plain)),
    mails: async () => adapter.outbox.map(({ template, to, token }) => ({ template, to, token })),
    contacts: async () => adapter.contacts(),
    subscriber: async (email) => {
      const found = adapter.subscribers.get(email);
      return found ? { status: found.status } : null;
    },
  };
}

/**
 * @typedef {object} ContentScenario
 * @property {string} name
 * @property {readonly Locale[]} locales
 * @property {(env: ContentEnv, locale: Locale) => Promise<void>} run
 */

const BOTH = /** @type {const} */ (['ka', 'en']);
const KA = /** @type {const} */ (['ka']);
const EN = /** @type {const} */ (['en']);

/** @type {ContentScenario[]} */
export const CONTENT_SCENARIOS = [
  // ─── სტატიები ──────────────────────────────────────────────────────────
  {
    name: 'listArticles: ნაგულისხმევად 6, უახლესი ჯერ, მხოლოდ საჯარო, total 14',
    locales: BOTH,
    async run(env, locale) {
      const page = await env.adapter.listArticles();
      expect(page.items).toHaveLength(6);
      expect(page.total).toBe(14);
      expect(page.nextCursor).not.toBeNull();
      const dates = page.items.map((a) => Date.parse(a.publishedAt));
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
      expect(page.items.every((a) => a.status === 'published')).toBe(true);
      expect(page.items.every((a) => a.lang === 'ka' || a.lang === locale)).toBe(true);
      expect(page.items.every((a) => !('translations' in a))).toBe(true);
      env.note(page);
    },
  },
  {
    name: 'listArticles: cursor ყველა გვერდს გადის დუბლიკატისა და გამოტოვების გარეშე',
    locales: BOTH,
    async run(env) {
      /** @type {string[]} */
      const slugs = [];
      /** @type {string | null} */
      let cursor = null;
      let pages = 0;
      do {
        const page = await env.adapter.listArticles({ cursor, limit: 6 });
        slugs.push(...page.items.map((a) => a.slug));
        env.note(page.nextCursor, page.total);
        cursor = page.nextCursor;
        pages += 1;
      } while (cursor);
      expect(pages).toBe(3);
      expect(slugs).toHaveLength(14);
      expect(new Set(slugs).size).toBe(14);
      env.note(slugs);
    },
  },
  {
    name: 'მონახაზი და მომავალში დაგეგმილი არ ჩანს; დაგეგმილი თავის დროზე ჩნდება',
    locales: BOTH,
    async run(env) {
      const draft = env.data.articles.find((a) => a.status === 'draft');
      const scheduled = env.data.articles.find((a) => a.status === 'scheduled');
      expect(draft && scheduled).toBeTruthy();
      const before = await env.adapter.listArticles({ limit: 50 });
      expect(before.items.map((a) => a.slug)).not.toContain(draft?.slug);
      expect(before.items.map((a) => a.slug)).not.toContain(scheduled?.slug);
      env.note(errorNote(await rejection(env.adapter.getArticle(String(scheduled?.slug)))));

      env.advance(6 * DAY);
      const after = await env.adapter.listArticles({ limit: 50 });
      expect(after.total).toBe(15);
      expect(after.items.map((a) => a.slug)).toContain(scheduled?.slug);
      expect(after.items.map((a) => a.slug)).not.toContain(draft?.slug);
      const article = await env.adapter.getArticle(String(scheduled?.slug));
      expect(article.status).toBe('scheduled');
      env.note(after.total, article);
    },
  },
  {
    name: 'კატეგორიის ფილტრი: ყოველი კატეგორია, ჯამი 14',
    locales: BOTH,
    async run(env) {
      let sum = 0;
      for (const category of ARTICLE_CATEGORIES) {
        const page = await env.adapter.listArticles({ category, limit: 50 });
        expect(page.items.every((a) => a.category === category)).toBe(true);
        sum += page.total;
        env.note(
          category,
          page.items.map((a) => a.slug),
        );
      }
      expect(sum).toBe(14);
    },
  },
  {
    name: 'ძიება (ქართული): ნაწილობრივი სიტყვა, AND, მთავრული, ბრჭყალები, ფუძე',
    locales: KA,
    async run(env) {
      const { adapter } = env;
      const title = '[პირველი გასაუბრება: როგორ ვისაუბროთ საჭიროებებზე]';
      const one = await adapter.listArticles({ q: 'გასაუბრ' });
      expect(one.items.map((a) => a.title)).toContain(title);
      const both = await adapter.listArticles({ q: '  „პირველი“   გასაუბრება ', limit: 50 });
      expect(both.items.map((a) => a.title)).toContain(title);
      expect((await adapter.listArticles({ q: 'გასაუბრება zzzz' })).total).toBe(0);
      const upper = await adapter.listArticles({ q: 'ᲒᲐᲡᲐᲣᲑᲠᲔᲑᲐ' });
      expect(upper.total).toBe(one.total);
      expect(one.total).toBe(2);
      const none = await adapter.listArticles({ q: 'zzzz-არარსებული' });
      expect(none).toEqual({ items: [], nextCursor: null, total: 0 });
      // ცარიელი / ჰარიანი ძიება — ფილტრის გარეშე
      expect((await adapter.listArticles({ q: '   ' })).total).toBe(14);
      env.note(one, both, upper.total, none);
    },
  },
  {
    name: 'ძიება სტატიის ტექსტშიც ეძებს და კატეგორიასთან ერთად მუშაობს; ავტორში და კატეგორიის წარწერაშიც',
    locales: BOTH,
    async run(env, locale) {
      const page = await env.adapter.listArticles({
        q: 'reasonable accommodation',
        category: 'career',
      });
      expect(page.total).toBeGreaterThan(0);
      expect(page.items.every((a) => a.category === 'career')).toBe(true);
      // კატეგორიის წარწერა მიმდინარე ენაზე (`label()`): „კარიერა“ / „Career“
      const word = t('taxonomy.articleCategory.career').split(/\s+/)[0];
      const byLabel = await env.adapter.listArticles({ q: word, limit: 50 });
      expect(byLabel.items.some((a) => a.category === 'career')).toBe(true);
      env.note(
        locale,
        page,
        byLabel.items.map((a) => a.slug),
      );
    },
  },
  {
    name: 'ძიება (ინგლისური): თარგმნილ ტექსტში; თარგმანის გარეშე მასალა ქართულად (lang: ka)',
    locales: EN,
    async run(env) {
      const list = await env.adapter.listArticles({ q: 'failure', limit: 20 });
      expect(list.items.map((a) => a.slug)).toContain('rogor-vaktsiot-tsarumatebloba-stsavlad');
      expect(list.items[0].lang).toBe('en');
      const untranslated = (await env.adapter.listArticles({ limit: 20 })).items.find(
        (a) => a.lang === 'ka',
      );
      expect(untranslated).toBeDefined();
      // ქართული სიტყვა ინგლისურ ვერსიაში: მხოლოდ თარგმანის გარეშე (ქართულად ნაჩვენები) მასალა
      const georgian = await env.adapter.listArticles({ q: 'გასაუბრ', limit: 20 });
      expect(georgian.items.every((a) => a.lang === 'ka')).toBe(true);
      env.note(list, untranslated?.slug, georgian);
    },
  },
  {
    name: 'რჩეული: featured=true მხოლოდ რჩეულს, false — დანარჩენს',
    locales: BOTH,
    async run(env) {
      const featured = await env.adapter.listArticles({ featured: true });
      expect(featured.total).toBe(1);
      const rest = await env.adapter.listArticles({ featured: false, limit: 50 });
      expect(rest.total).toBe(13);
      expect(rest.items.some((a) => a.featured)).toBe(false);
      env.note(
        featured,
        rest.items.map((a) => a.slug),
      );
    },
  },
  {
    name: 'დალაგება „მოკლე“: კითხვის დრო ზრდადობით (ენის ვერსიის ტექსტით)',
    locales: BOTH,
    async run(env) {
      const page = await env.adapter.listArticles({ sort: 'shortest', limit: 50 });
      const minutes = page.items.map((a) => a.readingMinutes);
      expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
      expect(new Set(minutes).size).toBeGreaterThan(1);
      env.note(page.items.map((a) => [a.slug, a.readingMinutes]));
    },
  },
  {
    name: 'სიის ელემენტს ტექსტი არ აქვს, აქვს readingMinutes და hasAudio',
    locales: BOTH,
    async run(env) {
      const [item] = (await env.adapter.listArticles({ featured: true })).items;
      expect(item).not.toHaveProperty('body');
      expect(item).not.toHaveProperty('audio');
      expect(item.readingMinutes).toBeGreaterThanOrEqual(1);
      expect(item.readingMinutes).toBeLessThanOrEqual(12);
      expect(item.hasAudio).toBe(false);
      env.note(item);
    },
  },
  {
    name: 'არასწორი პარამეტრი → bad-request მიმდინარე ენის ტექსტით',
    locales: BOTH,
    async run(env) {
      for (const params of [
        { category: 'unknown' },
        { cursor: 'abc' },
        { cursor: '999' },
        { limit: 0 },
        { limit: 51 },
        { sort: 'popular' },
      ]) {
        const error = await rejection(env.adapter.listArticles(/** @type {never} */ (params)));
        expect(error.code).toBe('bad-request');
        expect(error.message).toBe(t('errors.bad-request'));
        env.note(params, errorNote(error));
      }
    },
  },
  {
    name: 'getArticle: სრული ტექსტი ბლოკებით; არარსებული, მონახაზი, არასწორი slug → not-found',
    locales: BOTH,
    async run(env) {
      const [summary] = (await env.adapter.listArticles()).items;
      const article = await env.adapter.getArticle(summary.slug);
      expect(article.body.length).toBeGreaterThan(0);
      expect(article.readingMinutes).toBe(summary.readingMinutes);
      env.note(article);
      const draft = env.data.articles.find((a) => a.status === 'draft');
      for (const slug of ['ar-arsebobs', draft?.slug ?? '', '../etc', 'ჩვევა', 'a'.repeat(81)]) {
        const error = await rejection(env.adapter.getArticle(slug));
        expect(error.code).toBe('not-found');
        expect(error.message).toBe(t('errors.not-found'));
        env.note(slug, errorNote(error));
      }
    },
  },
  {
    name: 'პასუხი ასლია: მისი შეცვლა მომდევნო პასუხს არ ცვლის',
    locales: KA,
    async run(env) {
      const [summary] = (await env.adapter.listArticles()).items;
      const article = await env.adapter.getArticle(summary.slug);
      article.title = 'შეცვლილი';
      expect((await env.adapter.getArticle(summary.slug)).title).not.toBe('შეცვლილი');
      env.note(summary.slug);
    },
  },

  // ─── სერიები და ვიდეოები ───────────────────────────────────────────────
  {
    name: 'listSeries: რჩეული „ჩვევა — 5 ნაბიჯი“ ჯერ, შემდეგ 6 სერია თემების რიგით',
    locales: BOTH,
    async run(env) {
      const list = await env.adapter.listSeries();
      expect(list).toHaveLength(7);
      expect(list[0]).toMatchObject({ slug: 'chveva-5-nabiji', featured: true, slideCount: 6 });
      expect(list.slice(1).map((s) => s.topic)).toEqual([
        'worldview',
        'character',
        'win-win',
        'flow',
        'time-priorities',
        'self-reflection',
      ]);
      expect(list.slice(1).every((s) => s.slideCount === 5)).toBe(true);
      expect(list[0]).not.toHaveProperty('slides');
      env.note(list);
    },
  },
  {
    name: 'listSeries({ topic, featured }) და getSeries; არარსებული → not-found',
    locales: BOTH,
    async run(env) {
      const { adapter } = env;
      const flow = await adapter.listSeries({ topic: 'flow' });
      expect(flow).toHaveLength(1);
      const rest = await adapter.listSeries({ featured: false });
      expect(rest).toHaveLength(6);
      const series = await adapter.getSeries('chveva-5-nabiji');
      expect(series.slides.map((s) => s.kind)).toEqual([
        'cover',
        'step',
        'step',
        'step',
        'step',
        'step',
      ]);
      expect(series.slides.every((s) => s.plain.length > 0)).toBe(true);
      const missing = await rejection(adapter.getSeries('ar-arsebobs'));
      expect(missing.code).toBe('not-found');
      env.note(
        flow,
        rest.map((s) => s.slug),
        series,
        errorNote(missing),
      );
    },
  },
  {
    name: 'listVideos: კატეგორია, რჩეული, has*-ველები; getVideo — ტრანსკრიპტი და სუბტიტრი',
    locales: BOTH,
    async run(env) {
      const { adapter } = env;
      const all = await adapter.listVideos();
      expect(all).toHaveLength(6);
      expect(all.every((v) => v.hasCaptions && v.hasAudioDescription)).toBe(true);
      expect(all.every((v) => v.youtubeId === '[YouTube-ის id]')).toBe(true);
      expect(all[0]).not.toHaveProperty('transcript');
      expect(all[0]).not.toHaveProperty('youtube');
      expect(all[0]).not.toHaveProperty('hasSignLanguage');
      const art = await adapter.listVideos({ category: 'art' });
      expect(art).toHaveLength(2);
      const [weekly] = await adapter.listVideos({ featured: true });
      const video = await adapter.getVideo(weekly.slug);
      expect(video.transcript.length).toBeGreaterThan(0);
      expect(video.captions[0]).toMatchObject({ srclang: 'ka', default: true });
      const missing = await rejection(adapter.getVideo('ar-arsebobs'));
      env.note(
        all,
        art.map((v) => v.slug),
        video,
        errorNote(missing),
      );
    },
  },

  // ─── სიახლეები და ღონისძიებები ────────────────────────────────────────
  {
    name: 'listNews: years, წლის და ტიპის ფილტრი, cursor',
    locales: BOTH,
    async run(env) {
      const { adapter } = env;
      const page = await adapter.listNews();
      expect(page.years.length).toBeGreaterThanOrEqual(2);
      expect(page.years).toEqual([...page.years].sort((a, b) => b - a));
      expect(page.items).toHaveLength(6);
      expect(page.total).toBe(15);
      const [year] = page.years;
      const byYear = await adapter.listNews({ year, limit: 50 });
      expect(byYear.items.every((n) => n.publishedAt.startsWith(String(year)))).toBe(true);
      expect(byYear.years).toEqual(page.years);
      const events = await adapter.listNews({ type: 'event', limit: 50 });
      expect(events.items.every((n) => n.type === 'event')).toBe(true);
      expect(events.items[0]).not.toHaveProperty('body');
      const second = await adapter.listNews({ cursor: page.nextCursor });
      expect(second.items[0].slug).not.toBe(page.items[0].slug);
      env.note(page, byYear.total, events, second);
    },
  },
  {
    name: 'listNews: არასწორი წელი ან ტიპი → bad-request',
    locales: BOTH,
    async run(env) {
      const year = await rejection(env.adapter.listNews({ year: 26 }));
      const type = await rejection(env.adapter.listNews(/** @type {never} */ ({ type: 'x' })));
      expect(year.code).toBe('bad-request');
      expect(type.code).toBe('bad-request');
      env.note(errorNote(year), errorNote(type));
    },
  },
  {
    name: 'getNews: სრული ტექსტით; მონახაზი და არარსებული → not-found',
    locales: BOTH,
    async run(env) {
      const { adapter } = env;
      const item = await adapter.getNews('tsipruli-unarebis-akademiis-akhali-nakadi-ikhsneba');
      expect(item.body.length).toBeGreaterThan(0);
      for (const slug of ['monakhazi-gundis-akhali-tsevri', 'ar-arsebuli', '../x']) {
        const error = await rejection(adapter.getNews(slug));
        expect(error.code).toBe('not-found');
        env.note(slug, errorNote(error));
      }
      env.note(item);
    },
  },
  {
    name: 'listEvents: მომავალი ზრდადობით, გასული კლებადობით, ხელმისაწვდომობის ველებით',
    locales: BOTH,
    async run(env) {
      const { adapter } = env;
      const upcoming = await adapter.listEvents({ upcoming: true });
      expect(upcoming.length).toBeGreaterThanOrEqual(3);
      const starts = upcoming.map((e) => Date.parse(e.start));
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
      expect(starts.every((s) => s > env.now())).toBe(true);
      for (const event of upcoming) {
        expect(event.accessibility).toEqual(
          expect.objectContaining({
            wheelchair: expect.any(String),
            signInterpreter: expect.any(String),
            captions: expect.any(String),
            format: expect.any(String),
          }),
        );
      }
      const past = await adapter.listEvents({ upcoming: false });
      expect(past.length).toBeGreaterThanOrEqual(1);
      expect(past.every((e) => Date.parse(e.end) < env.now())).toBe(true);
      const all = await adapter.listEvents();
      expect(all).toHaveLength(upcoming.length + past.length);
      env.note(
        upcoming,
        past,
        all.map((e) => e.slug),
      );
    },
  },

  // ─── ორგანიზაცია ──────────────────────────────────────────────────────
  {
    name: 'გუნდი (8, რიგით), პარტნიორები (12), ეტაპები (4), პარამეტრები',
    locales: BOTH,
    async run(env, locale) {
      const { adapter } = env;
      const team = await adapter.getTeam();
      expect(team).toHaveLength(8);
      expect(team.map((m) => m.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      const partners = await adapter.getPartners();
      expect(partners).toHaveLength(12);
      const stages = await adapter.getStages();
      expect(stages).toHaveLength(4);
      const settings = await adapter.getSettings();
      expect(settings.officeAccessibility).toHaveLength(6);
      expect(settings.contacts.signVideo).toBeDefined();
      expect(settings).not.toHaveProperty('translations');
      if (locale === 'en') {
        expect(team[0]).toMatchObject({ lang: 'en', role: '[Founder]' });
        expect(team[7].lang).toBe('ka');
        expect(settings).toMatchObject({ lang: 'en', responseTime: '[within 2 working days]' });
      } else {
        expect(team.every((m) => m.lang === 'ka')).toBe(true);
      }
      env.note(team, partners, stages, settings);
    },
  },
  {
    name: 'თარგმნილი სტატია: lang en, ინგლისური სათაური, კითხვის დრო ინგლისური ტექსტით',
    locales: EN,
    async run(env) {
      const article = await env.adapter.getArticle('rogor-vaktsiot-tsarumatebloba-stsavlad');
      expect(article).toMatchObject({
        lang: 'en',
        title: '[How to turn failure into learning]',
      });
      expect(article).not.toHaveProperty('translations');
      env.note(article);
    },
  },
];

/* ─── B6: ფორმები ──────────────────────────────────────────────────────── */

/** შეცდომის ველები კვალისთვის: გზა → `{ code, message }`. @param {ContentError} error */
const fieldsNote = (error) => ({ code: error.code, fields: error.fields ?? null });

/** UI-ის ფორმის სხეული (`ContactForm`: ყველა ველი, ვარიანტი — ნაგულისხმევი). */
export const CONTACT_BASE = Object.freeze({
  name: '[სახელი გვარი]',
  contact: 'name@example.ge',
  topic: 'general',
  message: '[შეტყობინება]',
  support: '',
  replyVia: 'email',
  consent: true,
  website: '',
});

/**
 * ველის შეცდომის ტექსტი მიმდინარე ენაზე — სერვერის პასუხიც ამ ენაზე უნდა იყოს.
 * @param {Record<string, { code: string, message: string }> | undefined} fields
 * @param {Record<string, Record<string, number>>} [vars]
 */
function expectLocalized(fields, vars = {}) {
  for (const [path, field] of Object.entries(fields ?? {})) {
    expect(field.message, path).toBe(t(`fieldErrors.${field.code}`, vars[path]));
  }
}

/** @type {ContentScenario[]} */
export const FORM_SCENARIOS = [
  {
    name: 'subscribe: ვალიდაცია ორივე მხარეს ერთნაირია, ტექსტი მიმდინარე ენაზე',
    locales: BOTH,
    async run(env) {
      // > 120 სიმბოლო spec-ის სტრუქტურული ზღვარია (422 `tooLong`, B1) — ფორმა მას `email`-ით ადრე იჭერს
      for (const value of ['', '   ', 'name@', 'name@example', 'a@b.c', 'name @example.ge']) {
        const error = await rejection(env.adapter.subscribe(value));
        expect(error.code).toBe('validation');
        expect(Object.keys(error.fields ?? {})).toEqual(['email']);
        expectLocalized(error.fields);
        env.note(value, fieldsNote(error));
      }
      expect(await env.mails()).toEqual([]);
    },
  },
  {
    name: 'double opt-in: pending → წერილი → დადასტურება → გაუქმების ბმული → გაუქმება → თავიდან',
    locales: BOTH,
    async run(env, locale) {
      const { adapter } = env;
      const email = `opt-in-${locale}@example.ge`;
      expect(await adapter.subscribe(`  OPT-IN-${locale.toUpperCase()}@Example.ge `)).toEqual({
        ok: true,
        status: 'pending',
      });
      expect(await env.subscriber(email)).toEqual({ status: 'pending' });
      const [confirm] = await env.mails();
      expect(confirm).toMatchObject({ template: 'subscribe-confirm', to: email });

      expect(await adapter.confirmSubscription(confirm.token)).toEqual({
        ok: true,
        status: 'confirmed',
      });
      expect(await env.subscriber(email)).toEqual({ status: 'confirmed' });
      const welcome = (await env.mails())[1];
      expect(welcome).toMatchObject({ template: 'subscribe-welcome', to: email });

      // ბმული ერთჯერადია
      const reused = await rejection(adapter.confirmSubscription(confirm.token));
      expect(reused.code).toBe('not-found');
      expect(reused.message).toBe(t('errors.not-found'));

      // უკვე გამოწერილი: იგივე პასუხი, წერილის გარეშე, სტატუსი უცვლელი
      expect(await adapter.subscribe(email)).toEqual({ ok: true, status: 'pending' });
      expect(await env.mails()).toHaveLength(2);
      expect(await env.subscriber(email)).toEqual({ status: 'confirmed' });

      // გაუქმება ერთი ბმულით; განმეორება — იგივე პასუხი
      expect(await adapter.unsubscribe(welcome.token)).toEqual({ ok: true });
      expect(await env.subscriber(email)).toBeNull();
      expect(await adapter.unsubscribe(welcome.token)).toEqual({ ok: true });

      // გაუქმების შემდეგ — თავიდან, ახალი წერილით
      expect(await adapter.subscribe(email)).toEqual({ ok: true, status: 'pending' });
      const mails = await env.mails();
      expect(mails.map((m) => m.template)).toEqual([
        'subscribe-confirm',
        'subscribe-welcome',
        'subscribe-confirm',
      ]);
      expect(mails[2].token).not.toBe(confirm.token);
      env.note(
        errorNote(reused),
        mails.map(({ template, to }) => ({ template, to })),
      );
    },
  },
  {
    name: 'დადასტურების ბმული: ვადა 7 დღე; განმეორებითი გამოწერა ძველ ბმულს აუქმებს',
    locales: BOTH,
    async run(env, locale) {
      const { adapter } = env;
      const email = `expiry-${locale}@example.ge`;
      await adapter.subscribe(email);
      await adapter.subscribe(email);
      const [first, second] = await env.mails();
      expect(second.token).not.toBe(first.token);
      const stale = await rejection(adapter.confirmSubscription(first.token));
      expect(stale.code).toBe('not-found');

      env.advance(7 * DAY + 60_000);
      const expired = await rejection(adapter.confirmSubscription(second.token));
      expect(expired.code).toBe('not-found');
      expect(await env.subscriber(email)).toMatchObject({ status: 'pending' });

      await adapter.subscribe(email);
      const third = (await env.mails())[2];
      env.advance(7 * DAY - 60_000);
      expect(await adapter.confirmSubscription(third.token)).toEqual({
        ok: true,
        status: 'confirmed',
      });
      env.note(errorNote(stale), errorNote(expired), (await env.mails()).length);
    },
  },
  {
    name: 'token-ის ფორმა: არასწორი → bad-request; სწორი ფორმის უცნობი / ყალბი → not-found',
    locales: BOTH,
    async run(env) {
      const { adapter } = env;
      for (const token of ['', 'abc', 'A'.repeat(44), 'ჩ'.repeat(43)]) {
        const error = await rejection(adapter.confirmSubscription(token));
        expect(error.code).toBe('bad-request');
        env.note(token, errorNote(error));
      }
      const unknown = await rejection(adapter.confirmSubscription('A'.repeat(43)));
      expect(unknown.code).toBe('not-found');
      for (const token of [
        'abc',
        `${'0'.repeat(24)}.${'A'.repeat(42)}`,
        `${'G'.repeat(24)}.${'A'.repeat(43)}`,
      ]) {
        const error = await rejection(adapter.unsubscribe(token));
        expect(error.code).toBe('bad-request');
        env.note(token, errorNote(error));
      }
      const forged = await rejection(adapter.unsubscribe(`${'0'.repeat(24)}.${'A'.repeat(43)}`));
      expect(forged.code).toBe('not-found');
      expect(forged.message).toBe(t('errors.not-found'));
      env.note(errorNote(unknown), errorNote(forged));
    },
  },
  {
    name: 'კონტაქტი: ვალიდაცია ორივე მხარეს ერთნაირია (UI-ის ფორმის სხეული), ტექსტი მიმდინარე ენაზე',
    locales: BOTH,
    async run(env) {
      const cases = [
        [{ name: '', contact: '', consent: false }, {}],
        [{ name: '   ', contact: 'abc' }, {}],
        [{ contact: '+995 555 12 34 56', replyVia: 'email' }, {}],
        [{ contact: 'name@example.ge', replyVia: 'call' }, {}],
        [{ contact: '123' }, {}],
        [{ name: 'ა'.repeat(NAME_MAX + 1) }, { name: { max: NAME_MAX } }],
        [{ message: 'ა'.repeat(MESSAGE_MAX + 1) }, { message: { max: MESSAGE_MAX } }],
        [{ support: 'ა'.repeat(SUPPORT_MAX + 1) }, { support: { max: SUPPORT_MAX } }],
      ];
      const before = await env.contacts();
      for (const [patch, vars] of cases) {
        const error = await rejection(env.adapter.sendContact({ ...CONTACT_BASE, ...patch }));
        expect(error.code).toBe('validation');
        expectLocalized(error.fields, vars);
        env.note(fieldsNote(error));
      }
      expect(await env.contacts()).toBe(before);
    },
  },
  {
    name: 'კონტაქტი: სწორი → { ok, id } და ინახება; honeypot → იგივე პასუხი, არ ინახება',
    locales: BOTH,
    async run(env) {
      const before = await env.contacts();
      const ok = await env.adapter.sendContact({
        ...CONTACT_BASE,
        // მხარდაჭერის საჭიროება — თავისუფალი ტექსტი (დიაგნოზის ველი არ არსებობს)
        support: '[მარტივი ენა, წერილობითი პასუხი]',
      });
      expect(ok.ok).toBe(true);
      expect(typeof ok.id).toBe('string');
      expect(await env.contacts()).toBe(before + 1);
      const phone = await env.adapter.sendContact({
        ...CONTACT_BASE,
        contact: '+995 555 12 34 56',
        replyVia: 'message',
        message: '',
      });
      expect(phone.ok).toBe(true);
      const bot = await env.adapter.sendContact({
        ...CONTACT_BASE,
        website: 'https://spam.example',
      });
      expect(bot.ok).toBe(true);
      expect(typeof bot.id).toBe('string');
      // honeypot შევსებულია: ვალიდაცია არც კი ეშვება — ცარიელი ფორმაც „წარმატებაა“
      const emptyBot = await env.adapter.sendContact({
        ...CONTACT_BASE,
        name: '',
        consent: false,
        website: 'x',
      });
      expect(emptyBot.ok).toBe(true);
      expect(await env.contacts()).toBe(before + 2);
      env.note(Object.keys(ok), Object.keys(bot), (await env.contacts()) - before);
    },
  },
];

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { expect } from 'vitest';

import { setContentAdapter } from '@/content/adapter.js';
import { createMockData } from '@/content/mock/data.js';
import { createMockAdapter } from '@/content/mock/index.js';
import { SERIES_TOPIC_TERMS } from '@/content/taxonomy.js';
import ka from '@/i18n/ka.js';
import { createRoutes } from '@/routes.jsx';

/** ფიქსირებული „ახლა“ — mock-ის თარიღები მასზეა მიბმული (ui/__tests__/fixtures.jsx-ის მსგავსად). */
export const NOW = Date.parse('2026-10-26T10:00:00+04:00');

/** jsdom-ში განლაგება არ არის — კონტრასტს Chromium-ის axe ამოწმებს (gate). */
export const AXE = { rules: { 'color-contrast': { enabled: false } } };

/** @typedef {import('@/content/adapter.js').ContentAdapter} ContentAdapter */

/** adapter-ის ყველა მეთოდი (`source`-ის გარეშე). */
const METHODS = /** @type {const} */ ([
  'listArticles',
  'getArticle',
  'listSeries',
  'getSeries',
  'listVideos',
  'getVideo',
  'listNews',
  'listEvents',
  'getTeam',
  'getPartners',
  'getStages',
  'getSettings',
  'subscribe',
  'sendContact',
]);

/** ჩვეულებრივი mock (დაყოვნების გარეშე). */
export function okAdapter() {
  return createMockAdapter({ now: () => NOW });
}

/** ყოველი მოთხოვნა ქსელის შეცდომით მთავრდება. */
export function failingAdapter() {
  return createMockAdapter({ now: () => NOW, fail: 'network' });
}

/** საჯარო სიები ცარიელია (პარამეტრები რჩება — ფუტერისთვის). */
export function emptyAdapter() {
  const data = createMockData({ now: NOW });
  return createMockAdapter({
    now: () => NOW,
    data: {
      ...data,
      articles: [],
      series: [],
      videos: [],
      news: [],
      events: [],
      team: [],
      partners: [],
      stages: [],
    },
  });
}

/** პასუხი არასოდეს მოდის — ჩატვირთვის მდგომარეობა. @returns {ContentAdapter} */
export function pendingAdapter() {
  const never = () => new Promise(() => {});
  return /** @type {ContentAdapter} */ ({
    source: 'mock',
    ...Object.fromEntries(METHODS.map((method) => [method, never])),
  });
}

/**
 * გადასართავი adapter: ტესტი შუაში ცვლის, რა დგას უკან (შეცდომა → თავიდან ცდა → წარმატება).
 * @param {ContentAdapter} initial
 */
export function switchableAdapter(initial) {
  let active = initial;
  const adapter = /** @type {ContentAdapter} */ (
    new Proxy(
      {},
      {
        // მხოლოდ adapter-ის მეთოდები: `then` და სხვა გასაღები → undefined (თორემ Promise.resolve
        // proxy-ს thenable-ად ჩათვლიდა)
        get: (_, key) => {
          if (key === 'source') return 'mock';
          if (!METHODS.includes(/** @type {(typeof METHODS)[number]} */ (key))) return undefined;
          return (/** @type {unknown[]} */ ...args) =>
            /** @type {(...a: unknown[]) => unknown} */ (
              active[/** @type {keyof ContentAdapter} */ (key)]
            )(...args);
        },
      },
    )
  );
  return {
    adapter,
    /** @param {ContentAdapter} next */
    use(next) {
      active = next;
    },
  };
}

/**
 * გვერდის რენდერი სრული გარსით (createRoutes), საკუთარი adapter-ით.
 * @param {string} path
 * @param {ContentAdapter} [adapter]
 */
export async function renderPage(path, adapter = okAdapter()) {
  setContentAdapter(adapter);
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 });
  const main = /** @type {HTMLElement} */ (screen.getByRole('main'));
  return { ...view, router, user, main };
}

/** ყველა მონაცემიანი ბლოკი ჩაიტვირთა (`aria-busy` აღარ არის). @param {HTMLElement} main */
export async function settle(main) {
  await waitFor(() => expect(main.querySelector('[aria-busy="true"]')).toBeNull());
}

/**
 * სათაურების ხე `<main>`-ში: `[დონე, ტექსტი]`. aria-hidden ქვეხე (ჩონჩხი) გამოტოვებულია.
 * @param {HTMLElement} main
 * @returns {[number, string][]}
 */
export function headingTree(main) {
  return [...main.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter((h) => !h.closest('[aria-hidden="true"]'))
    .map((h) => [Number(h.tagName[1]), (h.textContent ?? '').replace(/\s+/g, ' ').trim()]);
}

/**
 * დონის გამოტოვება (h1 → h3, h2 → h4…): `[წინა, შემდეგი, ტექსტი]`.
 * @param {[number, string][]} tree
 */
export function skippedLevels(tree) {
  /** @type {[number, number, string][]} */
  const skips = [];
  let previous = 0;
  for (const [level, text] of tree) {
    if (level > previous + 1) skips.push([previous, level, text]);
    previous = level;
  }
  return skips;
}

/* ─── „ყველა ფაქტი ფრჩხილებშია“ ─────────────────────────────────────────── */

/** @param {unknown} node @param {string[]} [out] */
function leafStrings(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (node && typeof node === 'object')
    for (const value of Object.values(node)) leafStrings(value, out);
  return out;
}

/** ka.js-ის ყოველი სტრიქონი შაბლონად: `{count}` → ნებისმიერი ტექსტი. */
const TEMPLATES = leafStrings(ka).map(
  (text) =>
    new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '.+?')}$`),
);

const PUNCTUATION = /^[\s,.;:()/—–-]*$/;
const BRACKETED = /^\[[\s\S]*\]$/;
const DURATION_LABEL = /^(\d+ (საათი|წუთი|წამი)\s?)+$/;
const TERMS = new Set(Object.values(SERIES_TOPIC_TERMS).map((term) => term.text));

/**
 * გამოთვლილი მნიშვნელობა (და არა გამოგონილი ფაქტი): თარიღი `<time>`-ში (ISO — adapter-იდან),
 * ხანგრძლივობა კადრზე, მასალების რაოდენობა — მონაცემებიდან ითვლება.
 */
const COMPUTED = 'time, .mc-thumb-badge--time, .mc-entry__count';

/** @param {string} text */
function isUiOrBracketed(text) {
  if (PUNCTUATION.test(text) || BRACKETED.test(text) || TERMS.has(text)) return true;
  if (DURATION_LABEL.test(text)) return true;
  if (TEMPLATES.some((re) => re.test(text))) return true;
  // სიით აწყობილი წარწერა („სუბტიტრები, ჟესტური ენა, აუდიოაღწერა“)
  const parts = text.split(', ');
  return parts.length > 1 && parts.every((part) => isUiOrBracketed(part));
}

/**
 * ტექსტი `<main>`-ში, რომელიც არც i18n-ის (დაფის) სტრიქონია, არც `[ფრჩხილებშია]` და არც
 * გამოთვლილი მნიშვნელობა — ე. ი. გამოგონილი ფაქტი. ცარიელი მასივი = gate გავლილია.
 * @param {HTMLElement} main
 * @returns {string[]}
 */
export function unbracketedFacts(main) {
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  /** @type {string[]} */
  const found = [];
  const heroTitle = main.querySelector('.mc-hero-title');
  if (heroTitle && heroTitle.textContent?.trim() !== ka.home.heroTitle) {
    found.push(heroTitle.textContent ?? '');
  }
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    const parent = node.parentElement;
    if (!text || !parent) continue;
    if (parent.closest(COMPUTED) || parent.closest('.mc-hero-title')) continue;
    if (!isUiOrBracketed(text)) found.push(text);
  }
  return found;
}

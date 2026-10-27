import { describe, expect, it } from 'vitest';

import { getYear } from '@/i18n/format.js';

import { isPublic } from '../query.js';
import { inlineText } from '../text.js';

import { createMockData } from './data.js';

const NOW = Date.parse('2026-10-26T12:00:00+04:00');

/** ტექსტის ველები, რომლებიც ფაქტი არ არის: ენის / ბილიკის ტექნიკური სახელი. */
const UI_LABELS = new Set(['ქართული', 'აუდიოაღწერა']);
const GEORGIAN = /[\u10A0-\u10FF\u1C90-\u1CBF]/;

/**
 * ყველა წასაკითხი ტექსტი: აბზაცი და სიის პუნქტი მთლიანად (runs-ის გაერთიანებით),
 * დანარჩენი — ცალკე სტრიქონებად.
 * @param {unknown} node
 * @param {string} path
 * @param {[string, string][]} out
 * @returns {[string, string][]}
 */
function collectTexts(node, path, out = []) {
  if (typeof node === 'string') {
    if (GEORGIAN.test(node)) out.push([path, node]);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectTexts(child, `${path}[${i}]`, out));
    return out;
  }
  if (node && typeof node === 'object') {
    const record = /** @type {Record<string, unknown>} */ (node);
    if (record.type === 'p') {
      out.push([path, inlineText(/** @type {never} */ (record.content))]);
      return out;
    }
    if (record.type === 'list') {
      /** @type {never[][]} */ (record.items).forEach((item, i) =>
        out.push([`${path}.items[${i}]`, inlineText(item)]),
      );
      return out;
    }
    for (const [key, value] of Object.entries(record)) collectTexts(value, `${path}.${key}`, out);
  }
  return out;
}

/**
 * @param {unknown} node
 * @param {string} key
 * @param {unknown[]} out
 * @returns {unknown[]}
 */
function collectKey(node, key, out = []) {
  if (Array.isArray(node)) node.forEach((child) => collectKey(child, key, out));
  else if (node && typeof node === 'object') {
    for (const [k, value] of Object.entries(node)) {
      if (k === key) out.push(value);
      collectKey(value, key, out);
    }
  }
  return out;
}

describe('mock: რაოდენობები (Prompt 2)', () => {
  const data = createMockData({ now: NOW });
  const visible = (/** @type {{ status: string, publishedAt: string }[]} */ list) =>
    list.filter((item) => isPublic(item, NOW));

  it('≥ 12 საჯარო სტატია „მეტის ჩატვირთვისთვის“ + მონახაზი და დაგეგმილი', () => {
    expect(visible(data.articles).length).toBeGreaterThanOrEqual(12);
    expect(data.articles.some((a) => a.status === 'draft')).toBe(true);
    expect(data.articles.some((a) => a.status === 'scheduled')).toBe(true);
    expect(data.articles.filter((a) => a.featured)).toHaveLength(1);
  });

  it('6 სერია × 5 სლაიდი + რჩეული „ჩვევა — 5 ნაბიჯი“ (6 სლაიდი)', () => {
    const [habit, ...rest] = data.series;
    expect(habit).toMatchObject({ slug: 'chveva-5-nabiji', featured: true });
    expect(habit.slides).toHaveLength(6);
    expect(rest).toHaveLength(6);
    expect(rest.every((s) => s.slides.length === 5)).toBe(true);
    expect(data.series.flatMap((s) => s.slides).every((s) => s.plain && s.body && s.title)).toBe(
      true,
    );
  });

  it('6 ვიდეო ტრანსკრიპტით, სუბტიტრით, აუდიოაღწერით და ჟესტური ენით', () => {
    expect(data.videos).toHaveLength(6);
    for (const video of data.videos) {
      expect(video.transcript.length).toBeGreaterThanOrEqual(5);
      expect(video.transcript.some((line) => line.kind === 'description')).toBe(true);
      expect(video.captions).toHaveLength(1);
      expect(video.audioDescription).not.toBeNull();
      expect(video.signLanguage).not.toBeNull();
    }
    expect(data.videos.filter((v) => v.featured)).toHaveLength(1);
  });

  it('8 გუნდის წევრი, 12 პარტნიორი, 4 ეტაპი', () => {
    expect(data.team).toHaveLength(8);
    expect(data.partners).toHaveLength(12);
    expect(data.stages).toHaveLength(4);
  });

  it('სიახლეები ≥ 2 წელიწადზე, ოთხივე ტიპი; მომავალი ღონისძიებები ≥ 3', () => {
    const years = new Set(visible(data.news).map((n) => getYear(n.publishedAt)));
    expect(years.size).toBeGreaterThanOrEqual(2);
    expect(new Set(data.news.map((n) => n.type)).size).toBe(4);
    expect(data.events.filter((e) => Date.parse(e.start) > NOW).length).toBeGreaterThanOrEqual(3);
    expect(data.events.filter((e) => Date.parse(e.end) < NOW).length).toBeGreaterThanOrEqual(1);
  });

  it('სიახლეები სამ წელს მოიცავს `now`-ის ნებისმიერ თარიღზე (1 იანვარიც)', () => {
    const jan = createMockData({ now: Date.parse('2027-01-01T00:30:00+04:00') });
    expect(new Set(jan.news.map((n) => getYear(n.publishedAt))).size).toBeGreaterThanOrEqual(3);
  });
});

describe('mock: „რეალური მონაცემი არსად არ არის გამოგონილი“', () => {
  const data = createMockData({ now: NOW });

  it('ყოველი წასაკითხი ტექსტი ფრჩხილებშია (ჩანაცვლება)', () => {
    const texts = collectTexts(data, 'mock');
    expect(texts.length).toBeGreaterThan(500);
    const unbracketed = texts.filter(
      ([, text]) => !UI_LABELS.has(text) && !/\[[^\]]+\]/.test(text),
    );
    expect(unbracketed).toEqual([]);
  });

  it('მედიის src და გარე ბმულები null-ია — ფაილი და URL ჯერ არ არის', () => {
    expect(collectKey(data, 'src').every((src) => src === null)).toBe(true);
    for (const key of ['url', 'mapUrl', 'embedUrl', 'bookingUrl', 'registrationUrl']) {
      expect(collectKey(data, key).every((value) => value === null)).toBe(true);
    }
    expect(Object.values(data.settings.links).every((value) => value === null)).toBe(true);
  });

  it('შიდა ბმულები მხოლოდ არსებულ როუტებზე მიდის', () => {
    const routes = /^\/(contact|articles\/[a-z0-9-]+)$/;
    const hrefs = /** @type {string[]} */ (collectKey(data, 'href').filter(Boolean));
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.filter((href) => !routes.test(href))).toEqual([]);
  });

  it('დეტერმინისტულია და ყოველი გამოძახება დამოუკიდებელ ობიექტებს ქმნის', () => {
    const a = createMockData({ now: NOW });
    const b = createMockData({ now: NOW });
    expect(a).toEqual(b);
    a.events[0].accessibility.wheelchair = 'no';
    a.series[0].slides[0].title = 'x';
    a.articles[0].body.length = 0;
    expect(createMockData({ now: NOW })).toEqual(b);
  });
});

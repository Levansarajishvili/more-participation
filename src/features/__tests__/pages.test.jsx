import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { unbracketedFacts } from './page-helpers.jsx';

/** გვერდების CSS (F5). */
const PAGE_CSS = [
  'src/styles/sections.css',
  'src/features/home/home.css',
  'src/features/about/about.css',
  'src/features/about/pillars.css',
  // F6
  'src/features/articles/articles.css',
  'src/features/articles/reading.css',
  'src/features/news/news.css',
  'src/features/contact/contact.css',
  'src/features/subscribe/subscribe.css',
  // F7
  'src/features/development/development.css',
  'src/features/videos/videos.css',
];

/** @param {string} file */
const css = (file) => readFileSync(resolve(file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('გვერდების CSS', () => {
  it.each(PAGE_CSS)('%s: HEX არ არის — მხოლოდ --mc-* ტოკენები', (file) => {
    expect(css(file).match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
  });

  it.each(PAGE_CSS)('%s: ოქროსფერი (--mc-cta) გვერდის CSS-ში არ გამოიყენება', (file) => {
    expect(css(file)).not.toMatch(/var\(--mc-cta/);
  });

  it.each(PAGE_CSS)('%s: ანიმაცია / ციმციმი არ არის (ჩონჩხი სტატიკურია)', (file) => {
    expect(css(file)).not.toMatch(/animation|@keyframes/);
  });
});

describe('unbracketedFacts (gate-ის თვითშემოწმება)', () => {
  it('ფრჩხილების გარეშე ფაქტს იჭერს, i18n-ს და [placeholder]-ს — არა', () => {
    const main = document.createElement('main');
    main.innerHTML = `
      <h2>სტატიები</h2>
      <p>[ორგანიზაცია დაფუძნდა — პირველი ტრენინგები ქალაქში.]</p>
      <p>გუნდის [N] წევრი თავად არის შშმ პირი — გადაწყვეტილებებს ისინი იღებენ, ვისზეც ეს გადაწყვეტილებები მოქმედებს.</p>
      <p>ორგანიზაცია 2019 წელს დაარსდა.</p>
      <p>120 მონაწილე</p>
      <time datetime="2026-10-24">24 ოქტომბერი, 2026</time>`;
    expect(unbracketedFacts(main)).toEqual(['ორგანიზაცია 2019 წელს დაარსდა.', '120 მონაწილე']);
  });

  it('F6: რამდენიმე ფრაგმენტის ბლოკი მთლიანად მოწმდება (ბმული, მუქი, lang="en")', () => {
    const main = document.createElement('main');
    main.innerHTML = `
      <p>[ტექსტი <a href="/x">ბმული</a>, <strong>ტერმინი</strong> და <span lang="en">term</span>.]</p>
      <p>დაარსდა <a href="/x">ბმული</a> 2019 წელს.</p>`;
    expect(unbracketedFacts(main)).toEqual(['დაარსდა', 'ბმული', '2019 წელს.']);
  });
});

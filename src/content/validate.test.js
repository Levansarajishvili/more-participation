import { describe, expect, it, vi } from 'vitest';

import { createMockData } from './mock/data.js';
import { reportContentIssues, validateContent } from './validate.js';

const NOW = Date.parse('2026-10-26T12:00:00+04:00');

/** @returns {import('./model.js').ContentSnapshot} */
const fresh = () => createMockData({ now: NOW });

/**
 * @param {ReturnType<typeof validateContent>} issues
 * @returns {string[]}
 */
const codes = (issues) => issues.map((i) => `${i.severity}:${i.entity}:${i.field}:${i.code}`);

describe('validateContent', () => {
  it('Gate: mock-ზე 0 შენიშვნა', () => {
    expect(validateContent(fresh())).toEqual([]);
  });

  it('reportContentIssues: სუფთა მონაცემზე console-ში არაფერს წერს', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    reportContentIssues(validateContent(fresh()));
    expect(warn).not.toHaveBeenCalled();
  });

  it('alt-ის ნაკლებობა: ყდა, ტექსტის ფოტო, გუნდის ფოტო, ვიდეოს კადრი', () => {
    const data = fresh();
    data.articles[0].cover.alt = '  ';
    const figure = data.articles[0].body.findIndex((b) => b.type === 'image');
    const block = /** @type {import('./model.js').ImageBlock} */ (data.articles[0].body[figure]);
    block.image.alt = '';
    data.team[0].photo.alt = '';
    data.videos[0].poster.alt = '';
    const issues = validateContent(data);
    expect(codes(issues)).toEqual(
      expect.arrayContaining([
        'error:article:cover.alt:altMissing',
        `error:article:body[${figure}].image.alt:altMissing`,
        'error:team:photo.alt:altMissing',
        'error:video:poster.alt:altMissing',
      ]),
    );
    expect(issues[0].message).toBe('ფოტოს alt-ტექსტი შესავსებია (სავალდებულო)');
  });

  it('ვიდეო: სუბტიტრი, ტრანსკრიპტი, აუდიოაღწერა — ბლოკერი; ჟესტური ენა — გაფრთხილება', () => {
    const data = fresh();
    data.videos[0].captions = [];
    data.videos[1].transcript = [];
    data.videos[2].audioDescription = null;
    data.videos[3].signLanguage = null;
    data.videos[4].transcript[2].start = 99_999;
    data.videos[5].captions[0].default = false;
    expect(codes(validateContent(data))).toEqual([
      'error:video:captions:captionsMissing',
      'error:video:transcript:transcriptMissing',
      'error:video:audioDescription:audioDescriptionMissing',
      'warning:video:signLanguage:signLanguageMissing',
      'error:video:transcript:transcriptOrder',
      'warning:video:captions:captionsDefault',
    ]);
  });

  it('სტატიის ტექსტი: H3 H2-მდე, არააღწერითი ბმული, გატეხილი შიდა ბმული', () => {
    const data = fresh();
    const article = data.articles[1];
    article.body = [
      { type: 'h3', text: '[ქვეთავი]' },
      {
        type: 'p',
        content: [
          { type: 'text', text: '[ტექსტი] ' },
          { type: 'link', text: '[აქ]', href: '/contact' },
          { type: 'link', text: 'Read more', href: '/contact' },
          { type: 'link', text: '[სტატია]', href: '/articles/ar-arsebobs' },
        ],
      },
    ];
    expect(codes(validateContent(data))).toEqual([
      'error:article:body[0]:headingOrder',
      'error:article:body[1].content[1]:linkText',
      'error:article:body[1].content[2]:linkText',
      'error:article:body[1].content[3].href:linkBroken',
    ]);
  });

  it('მოკლე აღწერა > 160, slug-ის ფორმატი და დუბლიკატი, უცნობი კატეგორია', () => {
    const data = fresh();
    data.articles[0].excerpt = 'ა'.repeat(161);
    data.articles[1].slug = 'Bad Slug';
    data.articles[2].slug = data.articles[3].slug;
    data.articles[4].category = /** @type {never} */ ('sports');
    const issues = validateContent(data);
    expect(codes(issues)).toEqual(
      expect.arrayContaining([
        'error:article:excerpt:excerptLength',
        'error:article:slug:slug',
        'error:article:slug:slugDuplicate',
        'error:article:category:unknownValue',
      ]),
    );
    expect(issues.find((i) => i.code === 'excerptLength')?.message).toBe(
      'მოკლე აღწერა 161 სიმბოლოა — მაქსიმუმ 160',
    );
  });

  it('სლაიდს მარტივი ენის ვერსია სჭირდება; ღონისძიებას — ხელმისაწვდომობის ველები', () => {
    const data = fresh();
    data.series[0].slides[2].plain = '';
    data.events[0].accessibility.signInterpreter = /** @type {never} */ (undefined);
    data.events[1].end = data.events[1].start.replace(/T\d\d/, 'T01');
    expect(codes(validateContent(data))).toEqual([
      'error:series:slides[2].plain:plainMissing',
      'error:event:accessibility.signInterpreter:eventAccess',
      'error:event:end:eventTime',
    ]);
  });

  it('reportContentIssues: ჯამი + თითო შენიშვნა console.warn-ით', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = fresh();
    data.videos[0].captions = [];
    reportContentIssues(validateContent(data));
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toBe('[content] კონტენტის შემოწმება: 1 შენიშვნა');
    expect(warn.mock.calls[1][0]).toMatch(/video\/.+ · captions — ვიდეოს სუბტიტრები/);
  });
});

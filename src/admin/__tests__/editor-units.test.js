import { describe, expect, it } from 'vitest';

import { createMockData } from '@/content/mock/data.js';
import { slugify } from '@/content/slug.js';

import { buildChecklist, validateEntity } from '../editor/checklist.js';
import { fromClock, joinTbilisi, splitTbilisi, toClock } from '../editor/datetime.js';
import { getIn, parsePath, setIn } from '../editor/path.js';
import { blocksToDoc, docToBlocks, mergeRuns } from '../editor/serialize.js';
import { parseVtt } from '../editor/vtt.js';
import { SCHEMAS } from '../schemas/index.js';

const NOW = Date.parse('2026-10-26T10:00:00+04:00');
const ALPHABET = 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ';

describe('slug: ქართული → ლათინური (ეროვნული სისტემა, აპოსტროფების გარეშე)', () => {
  const CASES = [
    ['ჩვევა — 5 ნაბიჯი', 'chveva-5-nabiji'],
    ['მსოფლხედვა', 'msoplkhedva'],
    ['ქართული ენა', 'kartuli-ena'],
    ['ჟურნალისტი წყნეთიდან', 'zhurnalisti-tsqnetidan'],
    ['ღია კარის დღე', 'ghia-karis-dghe'],
    ['ყველაფერი ჰარმონიაშია', 'qvelaperi-harmoniashia'],
    ['ჭადრაკის ძიება', 'chadrakis-dzieba'],
    ['ჯგუფური ხელოვნება', 'jgupuri-khelovneba'],
    ['ცისფერი შაბათი', 'tsisperi-shabati'],
    ['„ციტატა“ და (ფრჩხილები)', 'tsitata-da-prchkhilebi'],
    ['ბუზი, ვაზი და თევზი', 'buzi-vazi-da-tevzi'],
    ['პოლიტიკა და უფლება', 'politika-da-upleba'],
  ];
  it.each(CASES)('„%s“ → %s', (input, slug) => {
    expect(slugify(input)).toBe(slug);
    expect(slug).not.toMatch(/['’`]/);
  });
  it('შემთხვევები ანბანის 33-ივე ასოს მოიცავს; ანბანი → აპოსტროფის გარეშე', () => {
    const used = new Set(CASES.map(([input]) => input).join(''));
    expect([...ALPHABET].filter((ch) => !used.has(ch))).toEqual([]);
    expect(slugify(ALPHABET)).toBe('abgdevztiklmnopzhrstupkghqshchtsdztschkhjh');
  });
});

describe('serializer: რედაქტორის JSON ↔ მოდელის ბლოკები', () => {
  /** @param {any[]} blocks */
  const normalize = (blocks) =>
    blocks.map((b) =>
      b.type === 'p'
        ? {
            ...b,
            content: mergeRuns(
              b.content.map((r) => ({ ...r, ...(r.strong === false && { strong: undefined }) })),
            ),
          }
        : b,
    );

  it('mock-ის ყველა სტატიისა და სიახლის ტექსტი round-trip-ს უძლებს', () => {
    const data = createMockData({ now: NOW });
    for (const item of [...data.articles, ...data.news]) {
      const body = JSON.parse(JSON.stringify(normalize(item.body ?? [])));
      expect(
        JSON.parse(JSON.stringify(docToBlocks(/** @type {any} */ (blocksToDoc(body))))),
      ).toEqual(body);
    }
  });

  it('სქემა: H2/H3, მუქი, ბმული, სია, ციტატა (cite), ფოტო (alt, ratio, caption), ბმული-ბლოკი, lang', () => {
    /** @type {any[]} */
    const blocks = [
      { type: 'h2', text: 'ა' },
      { type: 'h3', text: 'ბ' },
      {
        type: 'p',
        content: [
          { type: 'text', text: 'მუქი', strong: true },
          { type: 'text', text: ' ' },
          { type: 'link', text: 'სტატიები', href: '/articles' },
          { type: 'text', text: ' flow', lang: 'en' },
        ],
      },
      {
        type: 'list',
        ordered: true,
        items: [[{ type: 'text', text: 'ერთი' }], [{ type: 'text', text: 'ორი' }]],
      },
      { type: 'quote', text: 'ციტატა', cite: 'ავტორი' },
      { type: 'image', image: { src: null, alt: 'აღწერა', ratio: '3:2' }, caption: 'წარწერა' },
      { type: 'link', text: 'ბმული-ბლოკი', href: '/news', description: 'აღწერა' },
    ];
    const doc = blocksToDoc(blocks);
    expect(doc.content?.map((n) => n.type)).toEqual([
      'heading',
      'heading',
      'paragraph',
      'orderedList',
      'blockquote',
      'image',
      'linkCard',
    ]);
    expect(docToBlocks(doc)).toEqual(blocks);
  });

  it('ცარიელი აბზაცი იშლება, მეზობელი ერთნაირი ფრაგმენტი ერთიანდება; H1 არ არსებობს', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'ა' },
            { type: 'text', text: 'ბ' },
          ],
        },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'X' }] },
      ],
    };
    expect(docToBlocks(doc)).toEqual([
      { type: 'p', content: [{ type: 'text', text: 'აბ' }] },
      { type: 'h2', text: 'X' },
    ]);
    expect(blocksToDoc([])).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });
});

describe('ჩეკლისტი (validate.js-ის წესები)', () => {
  const data = createMockData({ now: NOW });
  const slugs = new Set(data.articles.map((a) => a.slug));

  it('სტატია: alt, სათაურების რიგი, „აქ“-ბმული → ბლოკავს; შეჯამება „n / total“', () => {
    const article = {
      ...data.articles[0],
      cover: { ...data.articles[0].cover, alt: '' },
      body: [
        { type: 'h3', text: 'ქვე' },
        { type: 'p', content: [{ type: 'link', text: 'აქ', href: '/articles' }] },
      ],
    };
    const result = buildChecklist(
      SCHEMAS.articles.rules,
      validateEntity('articles', article, slugs),
    );
    const state = Object.fromEntries(result.items.map((i) => [i.id, i.state]));
    expect(state).toMatchObject({
      required: 'ok',
      altMissing: 'fail',
      headingOrder: 'fail',
      linkText: 'fail',
      contrast: 'info',
      voice: 'info',
    });
    expect([result.done, result.total]).toEqual([1, 4]);
    expect(result.blocking.map((i) => i.field)).toEqual(
      expect.arrayContaining(['cover.alt', 'body[0]', 'body[1].content[0]']),
    );
  });

  it.each(['აქ', 'აქ დააჭირე', 'ბმული', 'მეტი'])('ბმულის ტექსტი „%s“ აკრძალულია', (text) => {
    const article = {
      ...data.articles[0],
      body: [{ type: 'p', content: [{ type: 'link', text, href: '/articles' }] }],
    };
    expect(validateEntity('articles', article, slugs).some((i) => i.code === 'linkText')).toBe(
      true,
    );
  });

  it('ვიდეო: სუბტიტრი / ტრანსკრიპტი / აუდიოაღწერა ბლოკავს; „ვიზუალური ინფორმაცია აუდიოშიცაა“ AD-ს ცვლის; ჟესტური — გაფრთხილება', () => {
    const video = {
      ...data.videos[0],
      captions: [],
      transcript: [],
      audioDescription: null,
      signLanguage: null,
    };
    const result = buildChecklist(SCHEMAS.videos.rules, validateEntity('videos', video, slugs));
    const state = Object.fromEntries(result.items.map((i) => [i.id, i.state]));
    expect(state).toMatchObject({
      captionsMissing: 'fail',
      transcriptMissing: 'fail',
      audioDescriptionMissing: 'fail',
      signLanguageMissing: 'warn',
    });
    const marked = buildChecklist(
      SCHEMAS.videos.rules,
      validateEntity('videos', { ...video, visualInAudio: true }, slugs),
    );
    expect(marked.items.find((i) => i.id === 'audioDescriptionMissing')?.state).toBe('ok');
  });

  it('სერია: ატვირთული PDF tagged-ის გარეშე — გაფრთხილება (გამოქვეყნებას არ ბლოკავს)', () => {
    const series = { ...data.series[0], pdf: { src: '/x.pdf', label: 'PDF', tagged: false } };
    const result = buildChecklist(SCHEMAS.series.rules, validateEntity('series', series, slugs));
    expect(result.items.find((i) => i.id === 'pdfUntagged')?.state).toBe('warn');
    expect(result.blocking).toEqual([]);
  });

  it('გვერდი „ჩვენ შესახებ“: გუნდის ფოტოს და პარტნიორის ლოგოს alt', () => {
    const page = {
      title: 'ჩვენ შესახებ',
      slug: 'about',
      team: [{ name: 'ა', role: 'ბ', photo: { alt: '' } }],
      partners: [{ name: 'გ', logo: { alt: '' } }],
    };
    expect(validateEntity('pages', page, slugs).map((i) => i.field)).toEqual([
      'team[0].photo.alt',
      'partners[0].logo.alt',
    ]);
  });
});

describe('დამხმარეები', () => {
  it('path: getIn / setIn (immutable) / parsePath', () => {
    const obj = { a: { b: [{ c: 1 }] } };
    const next = setIn(obj, 'a.b[0].c', 2);
    expect(getIn(next, 'a.b[0].c')).toBe(2);
    expect(obj.a.b[0].c).toBe(1);
    expect(parsePath('slides[2].plain')).toEqual(['slides', 2, 'plain']);
  });
  it('თარიღი Asia/Tbilisi-ით: ველი ↔ ISO +04:00, სტუმრის დროის სარტყლის გარეშე', () => {
    expect(joinTbilisi('2026-11-03', '10:30')).toBe('2026-11-03T10:30:00+04:00');
    expect(splitTbilisi('2026-11-03T06:30:00Z')).toEqual({ date: '2026-11-03', time: '10:30' });
    expect(joinTbilisi('2026-11-03', '')).toBeNull();
    expect([toClock(270), fromClock('04:30'), fromClock('1:00:05')]).toEqual(['04:30', 270, 3605]);
  });
  it('VTT → ტრანსკრიპტი: დრო, სპიკერი, ტეგების გარეშე', () => {
    const vtt =
      'WEBVTT\n\n00:00:01.500 --> 00:00:03.000\n<v ნინო>გამარჯობა, <b>მე</b> ვარ\n\n00:04.000 --> 00:06.000\nმეორე სტრიქონი\n';
    expect(parseVtt(vtt)).toEqual([
      { start: 1.5, kind: 'speech', text: 'გამარჯობა, მე ვარ', speaker: 'ნინო' },
      { start: 4, kind: 'speech', text: 'მეორე სტრიქონი' },
    ]);
  });
});

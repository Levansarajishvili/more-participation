import { describe, expect, it } from 'vitest';

import { localize } from '@/content/localize.js';

import { defineCollections, itemSchemas } from '../../db/collections.js';
import { FEATURED_TYPES } from '../../db/content.js';
import {
  TRANSLATION_REPLACE,
  canonicalJson,
  partialTextSchema,
  toBsonSchema,
} from '../../db/schema.js';
import { loadSpec } from '../../lib/openapi.js';

const spec = loadSpec();

/** MongoDB 8.0-ის `$jsonSchema`-ში აკრძალული / უცნობი (sandbox-ში შემოწმდა B2-ში). */
const FORBIDDEN = new Set([
  '$ref',
  'const',
  'format',
  'type',
  'unevaluatedProperties',
  'examples',
  'default',
  'if',
  'then',
  'else',
  'prefixItems',
  '$defs',
]);

/**
 * სქემის კვანძები (properties-ის სახელები keyword არ არის — მაგ. სიახლის ველი `type`).
 * @param {any} schema
 * @param {(node: Record<string, any>) => void} visit
 */
function walk(schema, visit) {
  if (!schema || typeof schema !== 'object') return;
  visit(schema);
  for (const child of Object.values(schema.properties ?? {})) walk(child, visit);
  for (const key of ['items', 'not', 'additionalProperties']) {
    if (schema[key] && typeof schema[key] === 'object') walk(schema[key], visit);
  }
  for (const key of ['oneOf', 'anyOf', 'allOf']) {
    for (const child of schema[key] ?? []) walk(child, visit);
  }
}

describe('OpenAPI → $jsonSchema', () => {
  it('გარდაქმნის წესები: integer, const, format, ანოტაციები, boolean, exclusiveMinimum', () => {
    expect(toBsonSchema({ type: 'integer', minimum: 0, description: 'x' }, spec)).toEqual({
      bsonType: 'number',
      minimum: 0,
      multipleOf: 1,
    });
    expect(toBsonSchema({ const: 'p' }, spec)).toEqual({ enum: ['p'] });
    expect(
      toBsonSchema({ type: ['string', 'null'], format: 'date-time', examples: ['a'] }, spec),
    ).toEqual({ bsonType: ['string', 'null'] });
    expect(toBsonSchema({ type: 'boolean' }, spec)).toEqual({ bsonType: 'bool' });
    expect(toBsonSchema({ type: 'number', exclusiveMinimum: 0 }, spec)).toEqual({
      bsonType: 'number',
      minimum: 0,
      exclusiveMinimum: true,
    });
    expect(toBsonSchema(false, spec)).toEqual({ not: {} });
  });

  it('$ref იხსნება; allOf + unevaluatedProperties → ერთი დახურული ობიექტი', () => {
    const local = {
      components: {
        schemas: {
          Props: { type: 'object', properties: { a: { type: 'string' } } },
          Draft: {
            type: 'object',
            allOf: [
              { $ref: '#/components/schemas/Props' },
              { type: 'object', properties: { b: { type: 'integer' } }, required: ['b'] },
            ],
            unevaluatedProperties: false,
          },
        },
      },
    };
    expect(toBsonSchema({ $ref: '#/components/schemas/Draft' }, local)).toEqual({
      bsonType: 'object',
      properties: { a: { bsonType: 'string' }, b: { bsonType: 'number', multipleOf: 1 } },
      required: ['b'],
      additionalProperties: false,
    });
  });

  it('მხარდაუჭერელი keyword და არარსებული $ref — შეცდომა (ჩუმად არ იკარგება)', () => {
    expect(() => toBsonSchema({ if: { type: 'string' } }, spec)).toThrow(/if/);
    expect(() => toBsonSchema({ $ref: '#/components/schemas/Nope' }, spec)).toThrow(/Nope/);
    expect(() => toBsonSchema({ type: 'date' }, spec)).toThrow(/date/);
  });

  it('9 კოლექციის validator-ში აკრძალული keyword არ არის; type → bsonType', () => {
    const collections = defineCollections({ spec });
    expect(collections.map((c) => c.name).sort()).toEqual(
      [
        'content',
        'versions',
        'users',
        'sessions',
        'invites',
        'media',
        'settings',
        'messages',
        'subscribers',
      ].sort(),
    );
    for (const { name, validator } of collections) {
      walk(validator, (node) => {
        for (const key of Object.keys(node)) {
          expect(FORBIDDEN.has(key), `${name}: ${key}`).toBe(false);
          expect(key.startsWith('x-'), `${name}: ${key}`).toBe(false);
        }
      });
      // root-ზე additionalProperties: false — `_id` properties-ში უნდა იყოს
      expect(validator.properties._id, name).toBeDefined();
      expect(validator.additionalProperties, name).toBe(false);
    }
  });

  it('item-ის სქემა `*Draft`-ია: დახურული, model.js-ის ველებით, ტიპის მიხედვით', () => {
    const items = itemSchemas(spec);
    expect(Object.keys(items)).toEqual(['articles', 'series', 'videos', 'news', 'events', 'pages']);
    for (const schema of Object.values(items)) expect(schema.additionalProperties).toBe(false);
    expect(Object.keys(items.articles.properties)).toEqual(
      expect.arrayContaining(['slug', 'title', 'excerpt', 'category', 'cover', 'body', 'audio']),
    );
    expect(items.videos.properties.youtube.properties.id.bsonType).toBe('string');
    expect(items.news.properties.type.enum).toEqual(['announcement', 'event', 'program', 'media']);
    expect(Object.keys(items.pages.properties)).toEqual(
      expect.arrayContaining(['team', 'partners', 'stages']),
    );
    // `featured` მხოლოდ რჩეულის ტიპებს აქვს (`setFeatured`)
    expect(
      Object.keys(items).filter(
        (type) => 'featured' in items[/** @type {'pages'} */ (type)].properties,
      ),
    ).toEqual([...FEATURED_TYPES]);
  });
});

describe('translations.en — ნაწილობრივი ტექსტური ასლი', () => {
  const items = itemSchemas(spec);
  /** @param {string} type */
  const en = (type) =>
    items[/** @type {'articles'} */ (type)].properties.translations.properties.en;

  it('სტატია: ტექსტი რჩება, სტრუქტურა / enum / თარიღი / ფაილი — არა', () => {
    const schema = en('articles');
    expect(Object.keys(schema.properties).sort()).toEqual(
      ['audio', 'author', 'body', 'cover', 'excerpt', 'title'].sort(),
    );
    expect(Object.keys(schema.properties.cover.properties).sort()).toEqual(['alt', 'credit']);
    expect(Object.keys(schema.properties.audio.properties)).toEqual(['label']);
    // body თარგმანში მთლიანად იცვლება — სრული სქემა (ბლოკის ტიპი enum-ით)
    expect(schema.properties.body.anyOf[1]).toEqual(items.articles.properties.body);
    expect(schema.additionalProperties).toBe(false);
  });

  it('ვიდეო, ღონისძიება, გვერდი, პარამეტრები: მხოლოდ ტექსტური ველები', () => {
    const video = en('videos').properties;
    expect(Object.keys(video).sort()).toEqual(
      ['captions', 'excerpt', 'person', 'title', 'transcript'].sort(),
    );
    expect(Object.keys(video.transcript.items.properties).sort()).toEqual(['speaker', 'text']);
    expect(video.youtube).toBeUndefined();
    const event = en('events').properties;
    expect(Object.keys(event.accessibility.properties)).toEqual(['notes']);
    expect(event.start).toBeUndefined();
    expect(event.registrationUrl).toBeUndefined();
    const page = en('pages').properties;
    expect(Object.keys(page.team.items.properties).sort()).toEqual(
      ['bio', 'name', 'photo', 'role'].sort(),
    );
    expect(page.partners.items.properties.url).toBeUndefined();
    const site = defineCollections({ spec }).find((c) => c.name === 'settings');
    const settings = site?.validator.properties.item.properties.translations.properties.en;
    expect(Object.keys(settings.properties.contacts.properties).sort()).toEqual(
      ['address', 'messenger', 'signVideo'].sort(),
    );
    expect(Object.keys(settings.properties.officeAccessibility.items.properties)).toEqual([
      'value',
    ]);
  });

  it('ყოველი კვანძი null-ს იღებს (რედაქტორის მასივის ნახვრეტი → null)', () => {
    walk(en('series'), (node) => {
      if (node.bsonType) expect([node.bsonType].flat(), canonicalJson(node)).toContain('null');
    });
  });

  it('`body` — localize.js-ის `overlay` მას მართლაც მთლიანად ცვლის; სხვა მასივი ინდექსით ერწყმის', () => {
    expect(TRANSLATION_REPLACE).toEqual(['body']);
    const item = {
      title: 'სათაური',
      body: [
        { type: 'p', content: [{ type: 'text', text: 'ა' }] },
        { type: 'p', content: [{ type: 'text', text: 'ბ' }] },
      ],
      slides: [{ title: '1' }, { title: '2' }],
      translations: {
        en: {
          title: 'Title',
          body: [{ type: 'p', content: [{ type: 'text', text: 'A' }] }],
          slides: [null, { title: 'Two' }],
        },
      },
    };
    const out = /** @type {any} */ (localize(item, 'en'));
    expect(out.body).toHaveLength(1);
    expect(out.slides.map((/** @type {any} */ s) => s.title)).toEqual(['1', 'Two']);
  });

  it('partialTextSchema: ტექსტის გარეშე ობიექტი თარგმანში არ შედის', () => {
    expect(
      partialTextSchema({
        bsonType: 'object',
        properties: { n: { bsonType: 'number' }, k: { enum: ['a'] } },
      }),
    ).toBeNull();
  });

  it('canonicalJson გასაღებების რიგს არ ითვალისწინებს', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(
      canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }),
    );
  });
});

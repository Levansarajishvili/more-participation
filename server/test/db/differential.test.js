import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { COLLECTION, DRAFT_SCHEMA } from '../../db/collections.js';
import { newContentId, toContentDoc } from '../../db/content.js';
import { seedSource } from '../../db/seed.js';
import { createAjv, loadSpec, schemaRef } from '../../lib/openapi.js';

import { T0, freshDatabase, iso, json } from './helpers.js';

/**
 * B2: გარდაქმნის სიზუსტე — ერთი და იგივე item-ი OpenAPI-ის `*Draft`-ით (ajv, API-ის ვალიდაცია) და
 * ბაზის `$jsonSchema`-ით (MongoDB) ერთნაირად უნდა შეფასდეს. seed-ის ყოველ ჩანაწერზე — ორიგინალი
 * (ორივე იღებს) და მუტაციები (ორივე უარყოფს). გამონაკლისი (დოკუმენტირებული) — `translations`:
 * API-ში თავისუფალი ობიექტია (B1), ბაზაში ნაწილობრივი ტექსტური ასლი (B2) — B4 გაათანაბრებს.
 */

const spec = loadSpec();
const ajv = createAjv(spec);

/** @type {[string, (item: Record<string, any>) => Record<string, any> | null][]} */
const MUTATIONS = [
  ['უცნობი ველი', (item) => ({ ...item, zzz: 1 })],
  ['უცნობი სტატუსი', (item) => ({ ...item, status: 'archived' })],
  ['სათაური რიცხვია', (item) => ({ ...item, title: 5 })],
  ['სათაური > 300', (item) => ({ ...item, title: 'ა'.repeat(301) })],
  ['publishedAt რიცხვია', (item) => ({ ...item, publishedAt: 0 })],
  ['featured სტრიქონია', (item) => ('featured' in item ? { ...item, featured: 'yes' } : null)],
  [
    'ფოტოს პროპორცია',
    (item) => (item.cover ? { ...item, cover: { ...item.cover, ratio: '2:1' } } : null),
  ],
  [
    'ფოტოს alt-ის გარეშე',
    (item) => (item.cover ? { ...item, cover: { src: null, ratio: item.cover.ratio } } : null),
  ],
  [
    'ფოტოს width 1.5',
    (item) => (item.cover ? { ...item, cover: { ...item.cover, width: 1.5 } } : null),
  ],
  [
    'ბლოკი h4',
    (item) =>
      item.body?.length ? { ...item, body: [{ type: 'h4', text: 'x' }, ...item.body] } : null,
  ],
  [
    'inline-ის უცნობი ტიპი',
    (item) =>
      item.body?.length
        ? { ...item, body: [{ type: 'p', content: [{ type: 'bold', text: 'x' }] }] }
        : null,
  ],
  ['კატეგორია', (item) => ('category' in item ? { ...item, category: 'misc' } : null)],
  ['YouTube-ის id-ის გარეშე', (item) => (item.youtube ? { ...item, youtube: { adId: '' } } : null)],
  [
    'სუბტიტრის cues 1.5',
    (item) =>
      item.captions?.length ? { ...item, captions: [{ ...item.captions[0], cues: 1.5 }] } : null,
  ],
  ['duration < 0', (item) => ('duration' in item ? { ...item, duration: -1 } : null)],
  [
    'ტრანსკრიპტის სახე',
    (item) =>
      item.transcript?.length
        ? { ...item, transcript: [{ ...item.transcript[0], kind: 'music' }] }
        : null,
  ],
  [
    'სლაიდის ცარიელი id',
    (item) => (item.slides?.length ? { ...item, slides: [{ ...item.slides[0], id: '' }] } : null),
  ],
  [
    'სლაიდის ნომერი 1.5',
    (item) =>
      item.slides?.length ? { ...item, slides: [{ ...item.slides[0], number: 1.5 }] } : null,
  ],
  [
    'ხელმისაწვდომობის დონე',
    (item) =>
      item.accessibility
        ? { ...item, accessibility: { ...item.accessibility, wheelchair: 'maybe' } }
        : null,
  ],
  ['გვერდის slug', (item) => ('fields' in item ? { ...item, slug: 'blog' } : null)],
  [
    'გუნდის წევრის order 1.5',
    (item) => (item.team?.length ? { ...item, team: [{ ...item.team[0], order: 1.5 }] } : null),
  ],
  [
    '„ჩვენი გზის“ ზედმეტი ველი',
    (item) =>
      item.stages?.length ? { ...item, stages: [{ ...item.stages[0], date: '2019' }] } : null,
  ],
];

describe('ajv (*Draft) ↔ MongoDB ($jsonSchema)', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;
  const { records } = seedSource({ now: T0 });

  beforeAll(async () => {
    database = await freshDatabase('differential');
  });
  afterAll(() => database?.drop());

  /**
   * @param {import('@/admin/content-types.js').ContentType} type
   * @param {Record<string, any>} item
   * @returns {Promise<boolean>}
   */
  async function mongoAccepts(type, item) {
    const doc = toContentDoc({
      id: newContentId(type),
      type,
      item,
      meta: { version: 1, createdAt: iso(T0), updatedAt: iso(T0), updatedBy: null },
    });
    const content = database.db.collection(COLLECTION.content);
    try {
      await content.insertOne(doc);
      await content.deleteOne({ _id: doc._id });
      return true;
    } catch (error) {
      if (/** @type {any} */ (error).code !== 121) throw error;
      return false;
    }
  }

  it('seed-ის ყოველი ჩანაწერი და მისი მუტაციები: ერთი და იგივე შეფასება', async () => {
    let checked = 0;
    for (const record of records) {
      const validate = ajv.compile(schemaRef(DRAFT_SCHEMA[record.type]));
      const cases = [['ორიგინალი', json(record.item)]];
      for (const [label, mutate] of MUTATIONS) {
        const mutated = mutate(json(record.item));
        if (mutated) cases.push([label, mutated]);
      }
      for (const [label, item] of cases) {
        const api = Boolean(validate(json(item)));
        const db = await mongoAccepts(record.type, /** @type {any} */ (item));
        expect(db, `${record.id} · ${label}: ajv ${api}, MongoDB ${db}`).toBe(api);
        expect(api, `${record.id} · ${label}`).toBe(label === 'ორიგინალი');
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(400);
  }, 60_000);

  it('დოკუმენტირებული სხვაობა: translations.en — API-ში თავისუფალი, ბაზაში მხოლოდ ტექსტი', async () => {
    const article = records.find((r) => r.type === 'articles');
    const item = { ...json(article?.item), translations: { en: { status: 'draft', title: 'T' } } };
    expect(ajv.validate(schemaRef('ArticleDraft'), json(item))).toBe(true);
    expect(await mongoAccepts('articles', item)).toBe(false);
    const text = {
      ...json(article?.item),
      translations: { en: { title: 'T', cover: { alt: 'A' } } },
    };
    expect(await mongoAccepts('articles', text)).toBe(true);
  });
});

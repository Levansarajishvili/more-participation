import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getIn, setIn } from '@/admin/editor/path.js';
import { isTranslatable } from '@/admin/editor/translation.js';
import { SCHEMAS } from '@/admin/schemas/index.js';
import { localize } from '@/content/localize.js';

import { createRepositories } from '../../db/index.js';
import { seedSource } from '../../db/seed.js';

import { T0, caught, freshDatabase, json } from './helpers.js';

/**
 * B2: ბაზის `translations.en` (ნაწილობრივი ტექსტური ასლი) რედაქტორის English ჩანართს
 * (`TranslationFields.jsx`) არ უნდა უარყოფდეს. ველები — ადმინის სქემებიდან (`isTranslatable`), გზები
 * — იგივე წესით (`image` → `.alt`, `repeater` → `[i].ქვეველი`; `track` — `captions`-შია, არა აქ);
 * repeater-ში მხოლოდ მე-3 ელემენტი ითარგმნება → მასივის ნახვრეტი JSON-ში `null` ხდება.
 */

/**
 * @param {import('@/admin/schemas/index.js').FieldSchema[]} fields
 * @param {string} [prefix]
 * @returns {{ path: string, kind: string }[]}
 */
function translatablePaths(fields, prefix = '') {
  /** @type {{ path: string, kind: string }[]} */
  const out = [];
  for (const field of fields) {
    if (!isTranslatable(field) || field.translate === 'track') continue;
    const path = `${prefix}${field.name}`;
    if (field.kind === 'image') out.push({ path: `${path}.alt`, kind: 'text' });
    else if (field.kind === 'repeater')
      out.push(...translatablePaths(field.fields ?? [], `${path}[2].`));
    else out.push({ path, kind: field.kind });
  }
  return out;
}

const BLOCKS = [
  { type: 'h2', text: '[Subheading]' },
  { type: 'p', content: [{ type: 'text', text: '[Paragraph in English.]' }] },
];

describe('translations.en: რედაქტორის English ჩანართი ↔ ბაზის validator', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;
  /** @type {ReturnType<typeof createRepositories>} */
  let repos;
  const { records } = seedSource({ now: T0 });

  beforeAll(async () => {
    database = await freshDatabase('translations');
    repos = createRepositories(database, { now: () => T0 });
  });
  afterAll(() => database?.drop());

  it.each(Object.keys(SCHEMAS))('%s: ყოველი თარგმნადი ველი ბაზაში ინახება', async (type) => {
    const schema = SCHEMAS[/** @type {keyof typeof SCHEMAS} */ (type)];
    const paths = translatablePaths(schema.sections.flatMap((section) => section.fields));
    expect(paths.length).toBeGreaterThan(0);
    /** @type {Record<string, any>} */
    let en = {};
    for (const { path, kind } of paths) {
      en = setIn(en, path, kind === 'richtext' ? BLOCKS : `[EN: ${path}]`);
    }
    en = json(en);
    const base = records.find(
      (r) => r.type === type && (type !== 'pages' || r.item.slug === 'about'),
    );
    const item = {
      ...json(base?.item),
      ...(type !== 'pages' && { slug: `en-${type}` }),
      translations: { en },
    };
    const saved =
      type === 'pages'
        ? await repos.content.insert('pages', item)
        : await repos.content.insert(/** @type {any} */ (type), item);
    expect(saved.item.translations.en).toEqual(en);
    // localize იგივე ველებს ხედავს
    const localized = /** @type {any} */ (localize(saved.item, 'en'));
    for (const { path, kind } of paths) {
      if (kind !== 'richtext' && getIn(item, path.replace(/\[2\]/g, '[0]')) !== undefined) {
        expect(getIn(localized, path) ?? null, path).not.toBeNull();
      }
    }
    await repos.content.remove(saved.id);
  });

  it.each([
    ['articles', { status: 'draft' }, 'translations.en.status'],
    ['articles', { slug: 'english-slug' }, 'translations.en.slug'],
    ['articles', { cover: { src: '/media/en.jpg' } }, 'translations.en.cover.src'],
    ['news', { type: 'media' }, 'translations.en.type'],
    ['videos', { youtube: { id: 'dQw4w9WgXcQ' } }, 'translations.en.youtube'],
    ['events', { start: '2026-12-01T10:00:00+04:00' }, 'translations.en.start'],
    ['series', { featured: true }, 'translations.en.featured'],
  ])('%s: არატექსტური ველი თარგმანში — უარყოფილია (%o)', async (type, en, field) => {
    const base = records.find((r) => r.type === type);
    const error = await caught(
      repos.content.insert(/** @type {any} */ (type), {
        ...json(base?.item),
        slug: `bad-${type}-${Object.keys(en)[0]}`,
        translations: { en },
      }),
    );
    expect(error.code).toBe('validation');
    expect(Object.keys(error.fields)).toContain(field);
  });
});

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { createMockData } from '@/content/mock/data.js';
import { validateContent } from '@/content/validate.js';

import { COLLECTION, DRAFT_SCHEMA } from '../../db/collections.js';
import { createRepositories } from '../../db/index.js';
import { searchTextOf } from '../../db/derive.js';
import { SeedError, seedDatabase, seedSource } from '../../db/seed.js';
import { countChanges, migrate } from '../../migrations/index.js';
import { createAjv, loadSpec, schemaRef } from '../../lib/openapi.js';

import { FAKE_PRODUCTION_ENV } from '../helpers.js';

import { T0, caught, freshDatabase, json } from './helpers.js';

/**
 * B2: seed mock-იდან → ბაზა → `validateContent` (0 შენიშვნა); CLI (`server:migrate`, `server:seed`).
 */

const COUNTS = { articles: 16, series: 7, videos: 6, news: 16, events: 6, pages: 7 };

describe('seed', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;
  /** @type {Awaited<ReturnType<typeof seedDatabase>>} */
  let result;

  beforeAll(async () => {
    database = await freshDatabase('seed');
    result = await seedDatabase(database, { now: T0 });
  });
  afterAll(() => database?.drop());

  it('ბაზიდან წაკითხულ ნაკრებზე validateContent — 0 შენიშვნა; რაოდენობები', async () => {
    expect(result.issues).toEqual([]);
    expect(result.counts).toEqual(COUNTS);
    const snapshot = await createRepositories(database).snapshot();
    expect(validateContent(snapshot)).toEqual([]);
    expect(await database.db.collection(COLLECTION.settings).countDocuments()).toBe(1);
    expect(await database.db.collection(COLLECTION.users).countDocuments()).toBe(0);
    expect(await database.db.collection(COLLECTION.versions).countDocuments()).toBe(0);
  });

  it('ნაკრები = createMockData() (თარგმანებით): მასალა, გუნდი, პარტნიორები, „ჩვენი გზა“, პარამეტრები', async () => {
    const snapshot = await createRepositories(database).snapshot();
    expect(snapshot).toEqual(json(createMockData({ now: T0 })));
    expect(snapshot.videos.every((video) => video.youtube.id === '[YouTube-ის id]')).toBe(true);
  });

  it('id-ები და მეტა — mock-ის საცავისა; გვერდები — adminState-ისა, დემო-მონახაზების გარეშე', async () => {
    const repos = createRepositories(database);
    const articles = await repos.content.list('articles');
    expect(articles.map((r) => r.id)).toEqual(
      Array.from({ length: 16 }, (_, i) => `a-${String(i + 1).padStart(3, '0')}`),
    );
    expect(articles.every((r) => r.meta.version === 1 && r.meta.updatedBy === null)).toBe(true);
    const pages = await repos.content.list('pages');
    expect(pages.map((r) => r.item.slug)).toEqual([
      'home',
      'about',
      'articles',
      'development',
      'videos',
      'news',
      'contact',
    ]);
    expect(await repos.content.findBySlug('articles', 'akhali-statia-monakhazi')).toBeNull();
    expect(await repos.content.findBySlug('videos', 'akhali-video-monakhazi')).toBeNull();
  });

  it('ყოველი seed-ის item აკმაყოფილებს OpenAPI-ის `*Draft`-ს (ajv) — spec ↔ ბაზა', () => {
    const ajv = createAjv(loadSpec());
    const { records, settings } = seedSource({ now: T0 });
    for (const record of records) {
      const validate = ajv.compile(schemaRef(DRAFT_SCHEMA[record.type]));
      expect(validate(json(record.item)), `${record.id}: ${ajv.errorsText(validate.errors)}`).toBe(
        true,
      );
    }
    expect(ajv.validate(schemaRef('SiteSettingsDraft'), json(settings))).toBe(true);
  });

  it('B6: მიგრაცია 003 — ძველი `searchText` ხელახლა ითვლება, მეორედ — არაფერი', async () => {
    const content = database.db.collection(COLLECTION.content);
    const before = /** @type {any} */ (
      await content.findOne({ _id: /** @type {any} */ ('a-001') })
    );
    expect(before.searchText).toBe(searchTextOf(before.item, 'articles'));
    expect(before.searchText.length).toBeGreaterThan(1000);
    await content.updateOne(
      { _id: /** @type {any} */ ('a-001') },
      { $set: { searchText: 'b2 ძველი ტექსტი' } },
    );
    const first = await migrate(database.db);
    expect(first.find((r) => r.id === '003-public-search')?.reports).toEqual([
      { name: 'content', collection: 'updated', indexes: [] },
    ]);
    const after = /** @type {any} */ (await content.findOne({ _id: /** @type {any} */ ('a-001') }));
    expect(after.searchText).toBe(before.searchText);
    expect(countChanges(await migrate(database.db))).toBe(0);
  });

  it('განმეორებით — SeedError (არაფერი იცვლება); --reset — იგივე შედეგი', async () => {
    const error = await caught(seedDatabase(database, { now: T0 }));
    expect(error).toBeInstanceOf(SeedError);
    expect(error.message).toMatch(/58 მასალა/);
    const again = await seedDatabase(database, { now: T0, reset: true });
    expect(again).toEqual(result);
    expect(await database.db.collection(COLLECTION.content).countDocuments()).toBe(58);
  });
});

/**
 * @param {string} script
 * @param {string[]} args
 * @param {Record<string, string>} env
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function run(script, args, env) {
  const file = fileURLToPath(new URL(`../../scripts/${script}`, import.meta.url));
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file, ...args], {
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('exit', (code) => resolve({ code, stdout, stderr }));
  });
}

describe('CLI: server:migrate / server:seed', () => {
  const dbName = `mc_cli_${Math.random().toString(36).slice(2, 8)}`;
  /** @type {Record<string, string>} */
  let env;

  beforeAll(() => {
    env = { NODE_ENV: 'development', MONGODB_URI: inject('mongoUri'), MONGODB_DB: dbName };
  });
  afterAll(async () => {
    const database = await freshDatabase('cleanup', { migrate: false });
    await database.client.db(dbName).dropDatabase();
    await database.drop();
  });

  it('migrate ორჯერ (მეორედ — 0 ცვლილება), seed, განმეორება, --reset, production', async () => {
    const first = await run('migrate.js', [], env);
    expect(first.code, first.stderr).toBe(0);
    expect(first.stdout).toMatch(/001-init · content: შეიქმნა; ინდექსები — 7 შეიქმნა/);
    expect(first.stdout).toMatch(/ცვლილება: 28/);
    // B7: საბაზისო ჩანაწერები — 7 გვერდი + პარამეტრები (მხოლოდ პირველად)
    expect(first.stdout).toMatch(
      /საბაზისო ჩანაწერები: გვერდი \+7 \(home, about, .*\), პარამეტრები \+1/,
    );

    const second = await run('migrate.js', [], env);
    expect(second.code, second.stderr).toBe(0);
    expect(second.stdout).toMatch(/ცვლილება: 0 — ბაზა უკვე განახლებულია/);
    expect(second.stdout).not.toMatch(/შეიქმნა|განახლდა/);
    expect(second.stdout).toMatch(/გვერდი \+0, პარამეტრები — უკვე არის/);

    const seed = await run('seed.js', [], env);
    expect(seed.code, seed.stderr).toBe(0);
    expect(seed.stdout).toMatch(/seed: 58 მასალა .*პარამეტრები 1, მომხმარებელი 0/);
    expect(seed.stdout).toMatch(/validateContent: 0 შენიშვნა/);

    const repeat = await run('seed.js', [], env);
    expect(repeat.code).toBe(1);
    expect(repeat.stderr).toMatch(/უკვე 58 მასალაა/);

    const reset = await run('seed.js', ['--reset'], env);
    expect(reset.code, reset.stderr).toBe(0);

    const unknown = await run('seed.js', ['--force'], env);
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toMatch(/უცნობი არგუმენტი/);

    const production = await run('seed.js', [], {
      ...env,
      ...FAKE_PRODUCTION_ENV,
      NODE_ENV: 'production',
    });
    expect(production.code).toBe(1);
    expect(production.stderr).toMatch(/წარმოების ბაზაზე არ ეშვება/);

    const noUri = await run('migrate.js', [], { NODE_ENV: 'development' });
    expect(noUri.code).toBe(1);
    expect(noUri.stderr).toMatch(/MONGODB_URI: სავალდებულოა/);

    for (const output of [first, second, seed, repeat, reset, production]) {
      expect(output.stdout + output.stderr).not.toContain(env.MONGODB_URI);
    }
  }, 120_000);
});

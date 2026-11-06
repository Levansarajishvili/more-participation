import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ADMIN_EMAIL, EDITOR_EMAIL } from '@/admin/__tests__/scenarios/admin-scenarios.js';
import { MOCK_PASSWORD } from '@/admin/api/mock.js';

import { COLLECTION } from '../../db/collections.js';
import { agent } from '../auth/helpers.js';
import { captureLogs } from '../helpers.js';

import { ADMIN, httpEnv } from './http-env.js';

/**
 * B4 ნაწილი ა — სერვერის საკუთარი წესები (mock მათ არ ამოწმებს): ვალიდაცია შენახული ტიპის
 * `*Draft`-ით (422 / 400), `translations.en` — ბაზის `$jsonSchema` (121 → 422 ველის გზით, სამუშაო
 * ასლზეც), guard-ები (სესია, CSRF, როლი), `updatedBy` ბაზაში, ლოგი პერსონალური მონაცემის გარეშე.
 */

/** @type {Awaited<ReturnType<typeof httpEnv>>} */
let env;
const logs = captureLogs();

beforeAll(async () => {
  env = await httpEnv('content_rules');
});
afterAll(() => env?.close());

/** @param {string} [email] */
async function signedIn(email = ADMIN_EMAIL) {
  const a = agent(env.app);
  const res = await a.login(email, MOCK_PASSWORD);
  expect(res.statusCode).toBe(200);
  return a;
}

describe('B4 ნაწილი ა: guard-ები', () => {
  it('სესიის გარეშე → 401; CSRF-ის გარეშე → 403; რედაქტორს content.write აქვს', async () => {
    const anonymous = agent(env.app);
    expect((await anonymous.get(`${ADMIN}/content/all`)).statusCode).toBe(401);
    expect((await anonymous.get(`${ADMIN}/items/a-001`)).statusCode).toBe(401);

    const editor = await signedIn(EDITOR_EMAIL);
    const record = (await editor.get(`${ADMIN}/items/a-001`)).json();
    const noCsrf = await editor.patch(
      `${ADMIN}/items/a-001`,
      { data: { title: '[x]' }, version: record.version },
      { csrf: false },
    );
    expect([noCsrf.statusCode, noCsrf.json().code]).toEqual([403, 'forbidden']);
    const ok = await editor.patch(`${ADMIN}/items/a-001`, {
      data: { title: '[რედაქტორის ცვლილება]' },
      version: record.version,
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().updatedBy).toMatchObject({ id: 'u-002' });
    const doc = await env.app.db.collection(COLLECTION.content).findOne({ _id: 'a-001' });
    expect(doc.updatedBy).toBe('u-002');
    expect(doc.version).toBe(record.version + 1);
  });

  it('არასწორი id / ტიპი / query → 400 (path და query spec-იდან)', async () => {
    const a = await signedIn();
    for (const url of [
      `${ADMIN}/items/x-001`,
      `${ADMIN}/content/nope`,
      `${ADMIN}/content/articles?limit=0`,
      `${ADMIN}/content/articles?unknown=1`,
      `${ADMIN}/content/videos/youtube?youtubeId=short`,
    ]) {
      const res = await a.get(url);
      expect([url, res.statusCode, res.json().code]).toEqual([url, 400, 'bad-request']);
    }
    const page = await a.post(`${ADMIN}/content/pages`, { title: '[x]' });
    expect(page.statusCode).toBe(400);
    expect((await a.get(`${ADMIN}/items/a-999`)).statusCode).toBe(404);
  });
});

describe('B4 ნაწილი ა: ვალიდაცია შენახული ტიპის სქემით', () => {
  it('სხვა ტიპის ველი (`fields` სტატიაში) → 400; ზედმეტად გრძელი სათაური → 422 `tooLong`', async () => {
    const a = await signedIn();
    const record = (await a.get(`${ADMIN}/items/a-002`)).json();
    // route-ის `ItemDraft` (anyOf) მას `PageDraft`-ად იღებს — handler `ArticleDraft`-ით უარყოფს
    const foreign = await a.patch(`${ADMIN}/items/a-002`, {
      data: { fields: { heading: '[x]' } },
      version: record.version,
    });
    expect([foreign.statusCode, foreign.json().code]).toEqual([400, 'bad-request']);
    // სრული item (რედაქტორი ასე აგზავნის): `anyOf`-ის სხვა ტიპები 400-ს მოგვცემდა — ტიპით 422
    const long = await a.patch(`${ADMIN}/items/a-002`, {
      data: { ...record.item, title: 'ა'.repeat(301) },
      version: record.version,
    });
    expect(long.statusCode).toBe(422);
    expect(long.json().fields).toEqual({ title: expect.objectContaining({ code: 'tooLong' }) });
    const missingVersion = await a.patch(`${ADMIN}/items/a-002`, { data: { title: '[x]' } });
    expect(missingVersion.json()).toMatchObject({ code: 'validation', fields: { version: {} } });
    const extra = await a.patch(`${ADMIN}/items/a-002`, {
      data: { title: '[x]' },
      version: record.version,
      force: true,
    });
    expect([extra.statusCode, extra.json().code]).toEqual([400, 'bad-request']);
    expect((await a.get(`${ADMIN}/items/a-002`)).json().version).toBe(record.version);
  });

  it('`translations.en` — მხოლოდ ტექსტი: slug თარგმანში → 422 `translations.en.slug` (შენახვა და სამუშაო ასლი)', async () => {
    const a = await signedIn();
    const record = (await a.get(`${ADMIN}/items/a-003`)).json();
    expect(record.item.status).toBe('published');
    const translations = { en: { ...record.item.translations?.en, slug: 'english-slug' } };
    for (const autosave of [false, true]) {
      const res = await a.patch(`${ADMIN}/items/a-003`, {
        data: { ...record.item, translations },
        version: record.version,
        autosave,
      });
      expect([autosave, res.statusCode]).toEqual([autosave, 422]);
      expect(Object.keys(res.json().fields)).toEqual(['translations.en.slug']);
    }
    const ok = await a.patch(`${ADMIN}/items/a-003`, {
      data: { ...record.item, translations: { en: { title: '[English title]' } } },
      version: record.version,
      autosave: true,
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().working.item.translations.en.title).toBe('[English title]');
  });

  it('შექმნა: სტატუსი იძულებით მონახაზია, `version` 1; ავტორი — სესიის მომხმარებელი', async () => {
    const a = await signedIn(EDITOR_EMAIL);
    const res = await a.post(`${ADMIN}/content/events`, {
      title: '[ღონისძიება]',
      status: 'scheduled',
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({ type: 'events', version: 1, working: null });
    expect(body.id).toMatch(/^e-[0-9a-f]{24}$/);
    expect(body.item.status).toBe('draft');
    expect(body.updatedBy).toMatchObject({ id: 'u-002' });
  });
});

describe('B4 ნაწილი ა: ლოგი', () => {
  it('კონტენტის მოთხოვნის ლოგში — მხოლოდ route-ის შაბლონი; id, სათაური, ელფოსტა — არა', async () => {
    const { makeApp } = await import('../helpers.js');
    const app = /** @type {any} */ (
      await makeApp({
        db: env.app.db,
        now: env.clk.now,
        logStream: logs.stream,
        env: { LOG_LEVEL: 'info' },
      })
    );
    const a = agent(app);
    await a.login(ADMIN_EMAIL, MOCK_PASSWORD);
    const record = (await a.get(`${ADMIN}/items/a-004`)).json();
    await a.patch(`${ADMIN}/items/a-004`, {
      data: { title: '[საიდუმლო სათაური]' },
      version: record.version,
    });
    await a.patch(`${ADMIN}/items/a-004`, { data: { title: 'ა'.repeat(301) }, version: 1 });
    await app.close();
    const text = logs.text();
    expect(text).toContain('/api/admin/items/:id');
    for (const secret of ['a-004', '[საიდუმლო სათაური]', 'ააააა', ADMIN_EMAIL, MOCK_PASSWORD]) {
      expect(text).not.toContain(secret);
    }
  });
});

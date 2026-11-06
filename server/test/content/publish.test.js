import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ADMIN_EMAIL, EDITOR_EMAIL } from '@/admin/__tests__/scenarios/admin-scenarios.js';
import { MOCK_PASSWORD } from '@/admin/api/mock.js';
import { ROLE_PERMISSIONS } from '@/admin/api/permissions.js';

import { listOperations, fastifyPath, loadSpec } from '../../lib/openapi.js';
import { agent } from '../auth/helpers.js';

import { ADMIN, httpEnv } from './http-env.js';

/**
 * B4 ნაწილი ბ — სერვერის წესები HTTP-ზე: გამოქვეყნების ბლოკერი სერვერზე (alt, სუბტიტრი,
 * `[ჩანაცვლება]` YouTube-ის id-ში → 422 + `fields`), რიგი (ბლოკერი → 409), უფლებების ცხრილი
 * (`x-permission` ↔ `permissions.js`), პარამეტრები (ჯერ შემოწმება, მერე ჩაწერა; `translations.en`).
 */

/** @type {Awaited<ReturnType<typeof httpEnv>>} */
let env;
beforeAll(async () => {
  env = await httpEnv('content_publish');
});
afterAll(() => env?.close());

/** @param {string} [email] */
async function signedIn(email = ADMIN_EMAIL) {
  const a = agent(env.app);
  expect((await a.login(email, MOCK_PASSWORD)).statusCode).toBe(200);
  return a;
}

/** სატესტო YouTube-ის id-ები (11 სიმბოლო, `isYouTubeId`). */
const YT = 'M7lc1UVf-VE';
const YT_AD = 'aqz-KE-bpKQ';

describe('B4: გამოქვეყნების ბლოკერი სერვერზე', () => {
  it('alt-ის გარეშე → 422 `cover.alt` (altMissing); მასალა, ვერსია და ისტორია უცვლელია', async () => {
    const a = await signedIn(EDITOR_EMAIL);
    const record = (await a.get(`${ADMIN}/items/a-002`)).json();
    expect(record.issues.filter((i) => i.severity === 'error')).toEqual([]);
    const res = await a.post(`${ADMIN}/items/a-002/publish`, {
      version: record.version,
      data: { ...record.item, cover: { ...record.item.cover, alt: '' } },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({
      code: 'validation',
      fields: { 'cover.alt': { code: 'altMissing' } },
    });
    // ინგლისურ ვერსიაში alt-ის თარგმანი არ არის → ქართული (ცარიელი) ჩანს — ინგლისური ბლოკერიც
    expect(Object.keys(res.json().fields)).toEqual(['cover.alt', 'translations.en.cover.alt']);
    const after = (await a.get(`${ADMIN}/items/a-002`)).json();
    expect(after.version).toBe(record.version);
    expect(after.item.cover.alt).toBe(record.item.cover.alt);
    expect((await a.get(`${ADMIN}/items/a-002/versions`)).json()).toHaveLength(1);
  });

  it('ქართული სუბტიტრის გარეშე → 422 `captions` (captionsMissing); სუბტიტრით — ქვეყნდება', async () => {
    const a = await signedIn(EDITOR_EMAIL);
    const record = (await a.get(`${ADMIN}/items/v-001`)).json();
    const youtube = { id: YT, adId: YT_AD };
    const res = await a.post(`${ADMIN}/items/v-001/publish`, {
      version: record.version,
      data: { ...record.item, youtube, captions: [] },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().fields).toEqual({
      captions: expect.objectContaining({ code: 'captionsMissing' }),
    });
    const ok = await a.post(`${ADMIN}/items/v-001/publish`, {
      version: record.version,
      data: { ...record.item, youtube },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({
      version: record.version + 1,
      item: { status: 'published', youtube },
    });
  });

  it('`[ჩანაცვლება]` YouTube-ის id-ში → 422 `youtubeInvalid` (სერვერი; mock dev-ში უშვებს)', async () => {
    const a = await signedIn();
    const record = (await a.get(`${ADMIN}/items/v-002`)).json();
    expect(record.item.youtube.id).toMatch(/^\[.*\]$/);
    const res = await a.post(`${ADMIN}/items/v-002/publish`, { version: record.version });
    expect(res.statusCode).toBe(422);
    expect(res.json().fields['youtube.id'].code).toBe('youtubeInvalid');
  });

  it('რიგი mock-ისაა: ბლოკერი ძველ ვერსიაზეც 422; ბლოკერის გარეშე ძველი ვერსია → 409', async () => {
    const a = await signedIn();
    const record = (await a.get(`${ADMIN}/items/a-005`)).json();
    await a.patch(`${ADMIN}/items/a-005`, {
      data: { title: '[სხვისი ცვლილება]' },
      version: record.version,
    });
    const blocked = await a.post(`${ADMIN}/items/a-005/publish`, {
      version: record.version,
      data: { ...record.item, cover: { ...record.item.cover, alt: '' } },
    });
    expect(blocked.statusCode).toBe(422);
    const stale = await a.post(`${ADMIN}/items/a-005/publish`, { version: record.version });
    expect([stale.statusCode, stale.json().code]).toEqual([409, 'conflict']);
    const past = await a.post(`${ADMIN}/items/a-005/schedule`, {
      version: record.version + 1,
      at: new Date(env.now() - 1000).toISOString(),
    });
    expect(past.statusCode).toBe(422);
    expect(past.json().fields.publishedAt.code).toBe('date');
    const badDate = await a.post(`${ADMIN}/items/a-005/schedule`, {
      version: record.version + 1,
      at: 'ხვალ',
    });
    expect(badDate.statusCode).toBe(400);
  });
});

describe('B4: უფლებები (`x-permission` ↔ `permissions.js`)', () => {
  const spec = loadSpec();
  const operations = listOperations(spec).filter((op) => op.operation['x-step'] === 'B4');

  /** @param {string} path */
  const concrete = (path) =>
    fastifyPath(path).replace(':type', 'articles').replace(':id', 'a-999').replace(':version', '1');

  it('ანონიმური → 401; რედაქტორი → 403 ზუსტად `settings.*`-ზე; ადმინისტრატორი — 403 არსად', async () => {
    const anonymous = agent(env.app);
    const editor = await signedIn(EDITOR_EMAIL);
    const admin = await signedIn(ADMIN_EMAIL);
    /** @type {string[]} */
    const forbidden = [];
    for (const op of operations) {
      const url = concrete(op.path);
      const method = op.method.toUpperCase();
      const payload =
        method === 'GET' || op.operationId === 'restoreVersion' ? undefined : { x: 1 };
      const request = (/** @type {ReturnType<typeof agent>} */ a) =>
        a.request({ method, url, payload });
      expect([op.operationId, (await request(anonymous)).statusCode]).toEqual([
        op.operationId,
        401,
      ]);
      const permission = op.operation['x-permission'];
      const editorStatus = (await request(editor)).statusCode;
      expect([op.operationId, editorStatus === 403]).toEqual([
        op.operationId,
        !ROLE_PERMISSIONS.editor.includes(permission),
      ]);
      if (editorStatus === 403) forbidden.push(op.operationId);
      expect([op.operationId, (await request(admin)).statusCode === 403]).toEqual([
        op.operationId,
        false,
      ]);
    }
    expect(forbidden.sort()).toEqual(['getAdminSettings', 'updateAdminSettings']);
  });
});

describe('B4: პარამეტრები', () => {
  it('უცნობი რჩეული → 404 და `site`-იც არ ინახება (ჯერ შემოწმება, მერე ჩაწერა)', async () => {
    const a = await signedIn();
    const before = (await a.get(`${ADMIN}/settings`)).json();
    const res = await a.patch(`${ADMIN}/settings`, {
      site: { ...before.site, responseTime: '[არ უნდა შეინახოს]' },
      featured: { weeklyVideo: 'v-404' },
    });
    expect(res.statusCode).toBe(404);
    expect((await a.get(`${ADMIN}/settings`)).json()).toEqual(before);
  });

  it('`site.translations.en` — მხოლოდ ტექსტი: არატექსტური ველი → 422 ველის გზით', async () => {
    const a = await signedIn();
    const before = (await a.get(`${ADMIN}/settings`)).json();
    const res = await a.patch(`${ADMIN}/settings`, {
      site: { ...before.site, translations: { en: { lang: 'en' } } },
    });
    expect(res.statusCode).toBe(422);
    expect(Object.keys(res.json().fields)).toEqual(['translations.en.lang']);
  });

  it('რჩეულის ცვლილება ვერსიას და ისტორიას ქმნის (ტრანზაქცია, ერთი ტიპზე)', async () => {
    const a = await signedIn();
    const before = (await a.get(`${ADMIN}/settings`)).json();
    const previous = before.featured.featuredSeries;
    const series = (await a.get(`${ADMIN}/content/series?status=published&limit=50`)).json();
    const next = series.items.find((/** @type {any} */ row) => row.id !== previous);
    const res = await a.patch(`${ADMIN}/settings`, { featured: { featuredSeries: next.id } });
    expect(res.json().featured.featuredSeries).toBe(next.id);
    const docs = await env.app.db
      .collection('content')
      .find({ type: 'series', 'item.featured': true })
      .toArray();
    expect(docs.map((d) => d._id)).toEqual([next.id]);
    if (previous) {
      const versions = (await a.get(`${ADMIN}/items/${previous}/versions`)).json();
      expect(versions[0]).toMatchObject({ current: true, by: { id: 'u-001' } });
      expect(versions).toHaveLength(2);
    }
  });
});

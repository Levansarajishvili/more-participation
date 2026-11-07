import { ObjectId } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createMockData } from '@/content/mock/data.js';

import { COLLECTION } from '../../db/collections.js';
import { migrate } from '../../migrations/index.js';
import { ADMIN, ADMIN_EMAIL, addUser, agent, authApp } from '../auth/helpers.js';

import { PDF, VTT, jpegWithGps, multipart, pngWithGps } from './fixtures.js';

/**
 * B5: ბიბლიოთეკა — ფაილი თავისი გამოყენებებით (გამოქვეყნებული ვერსია + სამუშაო ასლი), alt ყველა
 * გამოყენებაში, 409 „გამოიყენება N მასალაში“, წაშლა საცავიდან და ისტორიიდან (`src` → null),
 * `GET /media/*`, მიგრაცია 002.
 */

/** @type {Awaited<ReturnType<typeof authApp>>} */
let ctx;
/** @type {ReturnType<typeof agent>} */
let admin;
const data = createMockData({ now: Date.parse('2026-11-05T08:00:00Z') });

/**
 * @param {{ name: string, type?: string, data: Buffer | string }} file
 * @param {Record<string, string>} [fields]
 */
async function upload(file, fields) {
  const body = await multipart(file, fields);
  const res = await admin.request({ method: 'POST', url: `${ADMIN}/media`, ...body });
  expect(res.statusCode, res.body).toBe(201);
  return JSON.parse(res.body);
}

/** @param {string} [query] */
async function library(query = '') {
  const res = await admin.get(`${ADMIN}/media${query}`);
  expect(res.statusCode).toBe(200);
  return /** @type {any[]} */ (JSON.parse(res.body));
}

/** @param {string} id */
const item = async (id) => (await ctx.repos.content.find(id))?.item;

/**
 * სტატია: ყდა + ტექსტის ფოტო ერთი ფაილით.
 * @param {string} src
 * @param {string} slug
 */
async function articleWith(src, slug) {
  const base = structuredClone(data.articles[0]);
  const record = await ctx.repos.content.insert('articles', {
    ...base,
    slug,
    title: `[სტატია ${slug}]`,
    status: 'draft',
    featured: false,
    cover: { src, alt: '[ყდის alt]', ratio: '3:2' },
    body: [
      { type: 'p', content: [{ type: 'text', text: '[ტექსტი]' }] },
      { type: 'image', image: { src, alt: '[ტექსტის ფოტოს alt]', ratio: '3:2' } },
    ],
  });
  return record;
}

beforeAll(async () => {
  ctx = await authApp('media_library');
  await addUser(ctx.repos, { email: ADMIN_EMAIL, role: 'admin' });
  admin = agent(ctx.app);
  await admin.login(ADMIN_EMAIL);
});
afterAll(() => ctx?.close());

describe('ბიბლიოთეკა და გამოყენება', () => {
  it('ფაილი ერთ ბარათად, ყველა გამოყენებით; alt — ცარიელი, თუ ერთ გამოყენებას მაინც აკლია', async () => {
    const file = await upload({ name: 'a.jpg', type: 'image/jpeg', data: await jpegWithGps() });
    const article = await articleWith(file.src, 'gamoqeneba');
    const found = (await library()).find((m) => m.id === file.id);
    expect(found.usage).toEqual([
      { type: 'articles', id: article.id, title: '[სტატია gamoqeneba]', field: 'cover' },
      { type: 'articles', id: article.id, title: '[სტატია gamoqeneba]', field: 'body[1].image' },
    ]);
    expect(found.alt).toBe('[ყდის alt]');
    // ჩადგმული ბარათი ამ ფაილისთვის არ ჩნდება (დუბლი არ არის)
    expect((await library()).some((m) => m.id === `img:${article.id}:cover`)).toBe(false);
    const usage = await admin.get(`${ADMIN}/media/${file.id}/usage`);
    expect(JSON.parse(usage.body)).toEqual(found.usage);

    await ctx.repos.content.replace(article.id, {
      ...article.item,
      body: [{ type: 'image', image: { src: file.src, alt: '', ratio: '3:2' } }],
    });
    const missing = await library('?missingAlt=true');
    expect(missing.find((m) => m.id === file.id)?.alt).toBe('');
  });

  it('PATCH alt ფაილზე → ყველა გამოყენება (ახალი ვერსია); სამუშაო ასლი რჩება და იცვლება', async () => {
    const file = await upload({ name: 'b.png', type: 'image/png', data: await pngWithGps() });
    const article = await articleWith(file.src, 'alt-yvelgan');
    await ctx.repos.content.replace(article.id, { ...article.item, status: 'published' });
    const published = /** @type {any} */ (await ctx.repos.content.find(article.id));
    // გამოქვეყნებულის ავტოშენახვა (სხვა ცვლილებით) — სამუშაო ასლი
    await ctx.repos.content.saveWorking(
      article.id,
      { ...published.item, title: '[ახალი სათაური]' },
      {
        version: published.meta.version,
      },
    );
    const res = await admin.patch(`${ADMIN}/media/${file.id}`, { alt: '  [ახალი alt]  ' });
    expect(res.statusCode, res.body).toBe(200);
    expect(JSON.parse(res.body).alt).toBe('[ახალი alt]');
    const after = /** @type {any} */ (await ctx.repos.content.find(article.id));
    expect(after.meta.version).toBe(published.meta.version + 1);
    expect(after.item.cover.alt).toBe('[ახალი alt]');
    expect(after.item.body[1].image.alt).toBe('[ახალი alt]');
    expect(after.working?.item.title).toBe('[ახალი სათაური]');
    expect(after.working?.item.cover.alt).toBe('[ახალი alt]');
    expect((await ctx.repos.media.find(file.id))?.alt).toBe('[ახალი alt]');
    const history = await ctx.repos.content.versions(article.id);
    expect(history[0].item.cover.alt).toBe('[ყდის alt]');
  });

  it('ჩადგმული (`img:`) — ერთი ველი; ცარიელი alt → 422; უცნობი → 404', async () => {
    const article = await articleWith(null, 'chadgmuli');
    const id = `img:${article.id}:cover`;
    expect((await library()).some((m) => m.id === id)).toBe(true);
    const empty = await admin.patch(`${ADMIN}/media/${encodeURIComponent(id)}`, { alt: '   ' });
    expect(empty.statusCode).toBe(422);
    expect(JSON.parse(empty.body).fields.alt.code).toBe('required');
    const ok = await admin.patch(`${ADMIN}/media/${encodeURIComponent(id)}`, { alt: '[ყდა]' });
    expect(ok.statusCode).toBe(200);
    expect((await item(article.id))?.cover.alt).toBe('[ყდა]');
    expect((await item(article.id))?.body[1].image.alt).toBe('[ტექსტის ფოტოს alt]');
    expect((await admin.patch(`${ADMIN}/media/img:a-nope:cover`, { alt: 'x' })).statusCode).toBe(
      404,
    );
    const del = await admin.request({
      method: 'DELETE',
      url: `${ADMIN}/media/${encodeURIComponent(id)}`,
    });
    expect(del.statusCode).toBe(409);
  });

  it('დოკუმენტი: სათაური / ენა / tagged — რეესტრი და სერიის PDF ერთად', async () => {
    const pdf = await upload(
      { name: 'guide.pdf', type: 'application/pdf', data: PDF },
      { title: '[სახელმძღვანელო]' },
    );
    const series = await ctx.repos.content.insert('series', {
      ...structuredClone(data.series[0]),
      slug: 'pdf-seria',
      featured: false,
      pdf: { src: pdf.src, label: '[სახელმძღვანელო]', size: PDF.length, lang: 'ka', tagged: false },
    });
    const res = await admin.patch(`${ADMIN}/media/${pdf.id}`, {
      lang: 'en',
      tagged: true,
      title: '[Guide]',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      kind: 'document',
      lang: 'en',
      tagged: true,
      title: '[Guide]',
    });
    expect((await item(series.id))?.pdf).toMatchObject({
      label: '[Guide]',
      lang: 'en',
      tagged: true,
    });
    const docs = await library('?kind=document');
    expect(docs.every((m) => m.kind === 'document')).toBe(true);
    expect(docs.find((m) => m.id === pdf.id)?.usage).toEqual([
      { type: 'series', id: series.id, title: series.item.title, field: 'pdf' },
    ]);
  });
});

describe('წაშლა', () => {
  it('გამოყენებული → 409 „გამოიყენება N მასალაში“, ფაილი ადგილზეა; ამოღების შემდეგ — იშლება ყველგან', async () => {
    const file = await upload({ name: 'c.jpg', type: 'image/jpeg', data: await jpegWithGps() });
    const key = file.src.slice('/media/'.length);
    const one = await articleWith(file.src, 'washla-1');
    const two = await articleWith(file.src, 'washla-2');
    const blocked = await admin.request({ method: 'DELETE', url: `${ADMIN}/media/${file.id}` });
    expect(blocked.statusCode).toBe(409);
    expect(JSON.parse(blocked.body)).toMatchObject({
      code: 'conflict',
      message: 'გამოიყენება 2 მასალაში — ჯერ იქიდან მოხსენი.',
    });
    expect(await ctx.app.storage.head(key)).not.toBeNull();

    // ფოტო მასალიდან მოიხსნა; ძველ ვერსიებში ჯერ რჩება
    for (const record of [one, two]) {
      await ctx.repos.content.replace(record.id, {
        ...record.item,
        cover: { src: null, alt: '[ყდის alt]', ratio: '3:2' },
        body: [],
      });
    }
    const history = ctx.database.db.collection(COLLECTION.versions);
    expect(await history.countDocuments({ mediaKeys: key })).toBe(2);
    const ok = await admin.request({ method: 'DELETE', url: `${ADMIN}/media/${file.id}` });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(JSON.parse(ok.body)).toEqual({ ok: true });
    expect(await ctx.app.storage.head(key)).toBeNull();
    expect(await ctx.repos.media.find(file.id)).toBeNull();
    expect(await history.countDocuments({ mediaKeys: key })).toBe(0);
    // ისტორიაში src → null, alt რჩება; აღდგენა გატეხილ ბმულს არ აბრუნებს
    const [old] = await ctx.repos.content.versions(one.id);
    expect(old.item.cover).toEqual({ src: null, alt: '[ყდის alt]', ratio: '3:2' });
    expect(old.item.body[1].image.src).toBeNull();
    const restored = await admin.post(`${ADMIN}/items/${one.id}/versions/${old.version}/restore`);
    expect(restored.statusCode).toBe(200);
    expect(JSON.parse(restored.body).item.cover.src).toBeNull();
    expect((await ctx.app.inject({ url: file.src })).statusCode).toBe(404);
    expect(
      (await admin.request({ method: 'DELETE', url: `${ADMIN}/media/${file.id}` })).statusCode,
    ).toBe(404);
  });

  it('მხოლოდ სამუშაო ასლში გამოყენებულიც იბლოკება; VTT — სუბტიტრის ბილიკით', async () => {
    const file = await upload({ name: 'd.png', type: 'image/png', data: await pngWithGps() });
    const article = await articleWith(null, 'mushao-asli');
    await ctx.repos.content.replace(article.id, { ...article.item, status: 'published' });
    const published = /** @type {any} */ (await ctx.repos.content.find(article.id));
    await ctx.repos.content.saveWorking(
      article.id,
      { ...published.item, cover: { src: file.src, alt: '[ახალი]', ratio: '3:2' } },
      { version: published.meta.version },
    );
    const del = await admin.request({ method: 'DELETE', url: `${ADMIN}/media/${file.id}` });
    expect(del.statusCode).toBe(409);
    expect(JSON.parse(del.body).message).toMatch(/1 მასალაში/);

    const track = await upload({ name: 'ka.vtt', type: 'text/vtt', data: VTT });
    expect((await library()).some((m) => m.id === track.id)).toBe(false);
    await ctx.repos.content.insert('videos', {
      ...structuredClone(data.videos[0]),
      slug: 'vtt-gamoqeneba',
      featured: false,
      captions: [{ ...data.videos[0].captions[0], src: track.src }],
    });
    const usage = JSON.parse((await admin.get(`${ADMIN}/media/${track.id}/usage`)).body);
    expect(usage).toEqual([expect.objectContaining({ type: 'videos', field: 'captions[0]' })]);
    expect(
      (await admin.request({ method: 'DELETE', url: `${ADMIN}/media/${track.id}` })).statusCode,
    ).toBe(409);
  });
});

describe('GET /media/* — მიწოდება', () => {
  it('ფოტო: ტიპი, immutable, ETag / 304, nosniff, CSP sandbox, inline; HEAD — სხეულის გარეშე', async () => {
    const file = await upload({ name: 'e.jpg', type: 'image/jpeg', data: await jpegWithGps() });
    const res = await ctx.app.inject({ url: file.src });
    expect(res.statusCode).toBe(200);
    expect(res.headers).toMatchObject({
      'content-type': 'image/jpeg',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'cross-origin-resource-policy': 'same-origin',
      'content-disposition': 'inline',
      'content-length': String(file.size),
    });
    // B7: `SITE_INDEXING=off` (ნაგულისხმევი — staging / dev) ყველა პასუხს noindex-ს ადებს;
    // ინდექსაციისას (`on`) ფაილს X-Robots-Tag არ აქვს — `test/site/site.test.js`
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    const etag = String(res.headers.etag);
    expect(etag).toMatch(/^".+"$/);
    const again = await ctx.app.inject({ url: file.src, headers: { 'if-none-match': etag } });
    expect(again.statusCode).toBe(304);
    expect(again.rawPayload.length).toBe(0);
    const head = await ctx.app.inject({ method: 'HEAD', url: file.src });
    expect(head.statusCode).toBe(200);
    expect(head.headers['content-length']).toBe(String(file.size));
    expect(head.rawPayload.length).toBe(0);
  });

  it('PDF — attachment სათაურით (ქართული — filename*); VTT — text/vtt; charset=utf-8', async () => {
    const pdf = await upload(
      { name: 'x.pdf', type: 'application/pdf', data: PDF },
      { title: 'წლიური "ანგარიში" 2026' },
    );
    const res = await ctx.app.inject({ url: pdf.src });
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="2026.pdf"; filename*=UTF-8''${encodeURIComponent('წლიური "ანგარიში" 2026.pdf')}`,
    );
    const track = await upload({ name: 'ka.vtt', type: 'text/vtt', data: VTT });
    const vtt = await ctx.app.inject({ url: track.src });
    expect(vtt.headers['content-type']).toBe('text/vtt; charset=utf-8');
    expect(vtt.body).toBe(VTT);
  });

  it('უცნობი / არასწორი გასაღები → 404 (საქაღალდის გარეთ გასვლა შეუძლებელია)', async () => {
    for (const url of [
      '/media/image/2026/AAAAAAAAAAAAAAAAAAAAAA.jpg',
      '/media/image/2026/short.jpg',
      '/media/../package.json',
      '/media/%2e%2e/%2e%2e/server/config.js',
      '/media/image/2026/AAAAAAAAAAAAAAAAAAAAAA.svg',
      '/media/',
    ]) {
      const res = await ctx.app.inject({ url });
      expect(res.statusCode, url).toBe(404);
    }
  });

  it('stats.library ატვირთულსაც ითვლის (ჩადგმული + ფაილი; VTT — არა)', async () => {
    const stats = JSON.parse((await admin.get(`${ADMIN}/reports/stats`)).body);
    const all = await library();
    expect(stats.library).toEqual({
      images: all.filter((m) => m.kind === 'image').length,
      documents: all.filter((m) => m.kind === 'document').length,
    });
  });
});

describe('მიგრაცია 002 — `versions.mediaKeys` ძველ ჩანაწერებზე', () => {
  it('ველის გარეშე ვერსიას ავსებს; მეორე გაშვება — არაფერი', async () => {
    const versions = ctx.database.db.collection(COLLECTION.versions);
    const _id = new ObjectId();
    await versions.insertOne(
      {
        _id,
        contentId: 'a-legacy',
        type: 'articles',
        version: 1,
        item: {
          ...data.articles[0],
          cover: { src: '/media/image/2026/AAAAAAAAAAAAAAAAAAAAAA.jpg', alt: 'x', ratio: '3:2' },
        },
        at: new Date(),
        by: null,
      },
      { bypassDocumentValidation: true },
    );
    const first = await migrate(ctx.database.db);
    expect(first[1].reports[0].collection).toBe('updated');
    expect((await versions.findOne({ _id }))?.mediaKeys).toEqual([
      'image/2026/AAAAAAAAAAAAAAAAAAAAAA.jpg',
    ]);
    const second = await migrate(ctx.database.db);
    expect(second[1].reports[0].collection).toBe('unchanged');
    await versions.deleteOne({ _id });
  });
});

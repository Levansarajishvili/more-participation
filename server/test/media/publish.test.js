import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { seedDatabase } from '../../db/seed.js';
import { ADMIN, ADMIN_EMAIL, addUser, agent, authApp } from '../auth/helpers.js';

import { VTT, jpegWithGps, multipart } from './fixtures.js';

/**
 * B5-ის gate: ატვირთული ფოტო alt-ის გარეშე და ქართული VTT-ის გარეშე ვიდეო გამოქვეყნებას სერვერზე
 * ბლოკავს (422); `/media/` ფაილი რეესტრში უნდა იყოს (`fileMissing`); VTT-ის `cues` / `end` —
 * სერვერის `parseCaptions`-იდან, კლიენტის მნიშვნელობა არ ითვლება.
 */

/** @type {Awaited<ReturnType<typeof authApp>>} */
let ctx;
/** @type {ReturnType<typeof agent>} */
let admin;

/**
 * @param {{ name: string, type?: string, data: Buffer | string }} file
 */
async function upload(file) {
  const body = await multipart(file);
  const res = await admin.request({ method: 'POST', url: `${ADMIN}/media`, ...body });
  expect(res.statusCode, res.body).toBe(201);
  return JSON.parse(res.body);
}

/**
 * @param {string} id
 * @param {Record<string, any>} data
 */
async function publish(id, data) {
  const record = /** @type {any} */ (await ctx.repos.content.find(id));
  const res = await admin.post(`${ADMIN}/items/${id}/publish`, {
    version: record.meta.version,
    data,
  });
  return { status: res.statusCode, body: JSON.parse(res.body), before: record };
}

beforeAll(async () => {
  ctx = await authApp('media_publish');
  await seedDatabase(ctx.database, { now: ctx.clk.now() });
  await addUser(ctx.repos, { email: ADMIN_EMAIL, role: 'admin' });
  admin = agent(ctx.app);
  await admin.login(ADMIN_EMAIL);
});
afterAll(() => ctx?.close());

describe('გამოქვეყნება ატვირთული ფაილით', () => {
  it('ფოტო alt-ის გარეშე → 422 `cover.alt` (ქართ. და, თარგმანისას, ინგლ.); alt-ით — ქვეყნდება', async () => {
    const photo = await upload({
      name: 'cover.jpg',
      type: 'image/jpeg',
      data: await jpegWithGps(),
    });
    const blocked = await publish('a-001', { cover: { src: photo.src, alt: '', ratio: '3:2' } });
    expect(blocked.status).toBe(422);
    expect(blocked.body.code).toBe('validation');
    expect(blocked.body.fields['cover.alt'].code).toBe('altMissing');
    const after = /** @type {any} */ (await ctx.repos.content.find('a-001'));
    expect(after.meta.version).toBe(blocked.before.meta.version);
    expect(after.item.cover.src).toBeNull();

    const ok = await publish('a-001', {
      cover: { src: photo.src, alt: '[მონაწილე მენტორთან ერთად]', ratio: '3:2' },
    });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.item.cover.src).toBe(photo.src);
    const usage = JSON.parse((await admin.get(`${ADMIN}/media/${photo.id}/usage`)).body);
    expect(usage).toEqual([expect.objectContaining({ id: 'a-001', field: 'cover' })]);
  });

  it('რეესტრში არარსებული `/media/` ფაილი → 422 `fileMissing` (ველის გზით)', async () => {
    const res = await publish('a-002', {
      cover: { src: '/media/image/2026/AAAAAAAAAAAAAAAAAAAAAA.jpg', alt: '[ფოტო]', ratio: '3:2' },
    });
    expect(res.status).toBe(422);
    expect(res.body.fields.cover).toMatchObject({ code: 'fileMissing' });
    expect(res.body.fields.cover.message).toBe('ფაილი საცავში ვერ მოიძებნა — ატვირთე თავიდან.');
  });

  it('ვიდეო: ქართული VTT-ის გარეშე → 422 `captions`; VTT-ით — cues / end სერვერისაა', async () => {
    const youtube = { id: 'dQw4w9WgXcQ', adId: 'M7lc1UVf-VE' };
    const none = await publish('v-001', { youtube, captions: [] });
    expect(none.status).toBe(422);
    expect(none.body.fields.captions.code).toBe('captionsMissing');

    const track = await upload({ name: 'ka.vtt', type: 'text/vtt', data: VTT });
    const ok = await publish('v-001', {
      youtube,
      captions: [
        {
          kind: 'captions',
          srclang: 'ka',
          label: 'ქართული',
          src: track.src,
          default: true,
          // კლიენტის მნიშვნელობა — სერვერი ფაილიდან ითვლის
          cues: 999,
          end: 1,
        },
      ],
    });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.item.captions[0]).toMatchObject({ src: track.src, cues: 2, end: 7.25 });
    const stored = await ctx.repos.content.find('v-001');
    expect(stored?.item.captions[0]).toMatchObject({ cues: 2, end: 7.25 });
    const del = await admin.request({ method: 'DELETE', url: `${ADMIN}/media/${track.id}` });
    expect(del.statusCode).toBe(409);
  });
});

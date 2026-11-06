import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ADMIN, ADMIN_EMAIL, EDITOR_EMAIL, addUser, agent, authApp } from '../auth/helpers.js';
import { captureLogs } from '../helpers.js';

import {
  BAD_VTT,
  CAMERA,
  PDF,
  SECRET_NOTE,
  VTT,
  jpegWithGps,
  multipart,
  pngWithGps,
  webpWithExif,
} from './fixtures.js';

/**
 * B5: ატვირთვა — ტიპი შიგთავსით, გაფართოება ↔ შიგთავსი (400), ზომა (400), EXIF / GPS-ის წაშლა,
 * VTT / PDF, მეტა-ველები (422), უფლება / CSRF, ლოგი.
 */

const MB = 1024 * 1024;

/** @type {Awaited<ReturnType<typeof authApp>>} */
let ctx;
/** @type {ReturnType<typeof agent>} */
let admin;
const logs = captureLogs();

/**
 * @param {ReturnType<typeof agent>} who
 * @param {{ name: string, type?: string, data: Buffer | string } | null} file
 * @param {Record<string, string>} [fields]
 */
async function upload(who, file, fields) {
  const body = await multipart(file, fields);
  const res = await who.request({ method: 'POST', url: `${ADMIN}/media`, ...body });
  return { status: res.statusCode, body: JSON.parse(res.body) };
}

/** @param {string} src */
async function stored(src) {
  const res = await ctx.app.inject({ url: src });
  expect(res.statusCode).toBe(200);
  return res.rawPayload;
}

beforeAll(async () => {
  ctx = await authApp('media_upload', { logStream: logs.stream, env: { LOG_LEVEL: 'info' } });
  await addUser(ctx.repos, { email: ADMIN_EMAIL, role: 'admin' });
  await addUser(ctx.repos, { email: EDITOR_EMAIL, role: 'editor' });
  admin = agent(ctx.app);
  expect((await admin.login(ADMIN_EMAIL)).statusCode).toBe(200);
});
afterAll(() => ctx?.close());

describe('ფოტო: EXIF / GPS / XMP / ტექსტი იშლება, ორიენტაცია აისახება', () => {
  it('JPEG: GPS, მოწყობილობა, COM — არა; 300 × 200 Orientation 6 → 200 × 300', async () => {
    const original = await jpegWithGps();
    const before = await sharp(original).metadata();
    expect(before.exif).toBeDefined();
    expect(before.orientation).toBe(6);
    expect(original.includes(Buffer.from(CAMERA))).toBe(true);

    const { status, body } = await upload(
      admin,
      { name: 'ფოტო.jpg', type: 'image/jpeg', data: original },
      { alt: '  მონაწილე სცენაზე  ' },
    );
    expect(status).toBe(201);
    expect(body).toMatchObject({
      kind: 'image',
      alt: 'მონაწილე სცენაზე',
      title: 'ფოტო.jpg',
      ratio: null,
      lang: null,
      tagged: null,
      usage: [],
    });
    expect(body.id).toMatch(/^m-[0-9a-f]{24}$/);
    expect(body.src).toMatch(/^\/media\/image\/\d{4}\/[A-Za-z0-9_-]{22}\.jpg$/);

    const bytes = await stored(body.src);
    expect(bytes.length).toBe(body.size);
    const after = await sharp(bytes).metadata();
    expect(after).toMatchObject({ format: 'jpeg', width: 200, height: 300 });
    expect(after.exif).toBeUndefined();
    expect(after.xmp).toBeUndefined();
    expect(after.icc).toBeUndefined();
    expect(after.orientation).toBeUndefined();
    for (const trace of [CAMERA, SECRET_NOTE, 'Exif\0\0']) {
      expect(bytes.includes(Buffer.from(trace, 'latin1')), trace).toBe(false);
    }
    const doc = await ctx.repos.media.find(body.id);
    expect(doc).toMatchObject({ width: 200, height: 300, mime: 'image/jpeg', kind: 'image' });
  });

  it('PNG: eXIf და tEXt — არა; 16:9 პროპორცია ინახება (არ იჭრება)', async () => {
    const { status, body } = await upload(admin, {
      name: 'banner.png',
      type: 'image/png',
      data: await pngWithGps(),
    });
    expect(status).toBe(201);
    const bytes = await stored(body.src);
    const after = await sharp(bytes).metadata();
    expect(after.exif).toBeUndefined();
    expect(after.comments).toBeUndefined();
    // Orientation 6 → 90 × 160; პროპორცია ფაილისაა (9:16 RATIOS-ში არ არის → null), კადრი არ იჭრება
    expect([after.width, after.height]).toEqual([90, 160]);
    expect(body.ratio).toBeNull();
    for (const trace of ['eXIf', 'tEXt', CAMERA, SECRET_NOTE]) {
      expect(bytes.includes(Buffer.from(trace, 'latin1')), trace).toBe(false);
    }
  });

  it('WebP: EXIF და XMP — არა; 1:1 ავტომატურად; მეტა-ველის ratio ჭარბობს', async () => {
    const data = await webpWithExif();
    expect((await sharp(data).metadata()).xmp).toBeDefined();
    const auto = await upload(admin, { name: 'square.webp', type: 'image/webp', data });
    expect(auto.status).toBe(201);
    expect(auto.body.ratio).toBe('1:1');
    const bytes = await stored(auto.body.src);
    const after = await sharp(bytes).metadata();
    expect(after.exif).toBeUndefined();
    expect(after.xmp).toBeUndefined();
    expect(bytes.includes(Buffer.from(SECRET_NOTE, 'latin1'))).toBe(false);
    const framed = await upload(
      admin,
      { name: 'square.webp', type: 'image/webp', data },
      { ratio: '3:2' },
    );
    expect(framed.body.ratio).toBe('3:2');
  });
});

describe('ტიპი შიგთავსით: გაფართოება ≠ შიგთავსი → 400', () => {
  /** @type {[string, { name: string, type?: string, data: Buffer | string }, string][]} */
  const CASES = [
    [
      'JPEG .png-ად',
      { name: 'photo.png', type: 'image/png', data: Buffer.alloc(0) },
      'fileMismatch',
    ],
    ['PDF .jpg-ად', { name: 'photo.jpg', type: 'image/jpeg', data: PDF }, 'fileMismatch'],
    [
      'JPEG, გამოცხადებული application/pdf',
      { name: 'scan', type: 'application/pdf', data: Buffer.alloc(0) },
      'fileMismatch',
    ],
    [
      'SVG (XSS)',
      {
        name: 'logo.svg',
        type: 'image/svg+xml',
        data: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      },
      'fileType',
    ],
    ['SVG .jpg-ად', { name: 'logo.jpg', type: 'image/jpeg', data: '<svg></svg>' }, 'fileType'],
    ['GIF', { name: 'anim.gif', type: 'image/gif', data: 'GIF89a\x01\x00\x01\x00' }, 'fileType'],
    ['HTML', { name: 'page.jpg', data: '<!doctype html><script>alert(1)</script>' }, 'fileType'],
    [
      'MP4 (ვიდეო მხოლოდ YouTube-ია)',
      { name: 'clip.mp4', type: 'video/mp4', data: '\0\0\0\x18ftypmp42\0\0\0\0mp42isom' },
      'fileType',
    ],
    ['MP3', { name: 'voice.mp3', type: 'audio/mpeg', data: 'ID3\x04\0\0\0\0\0\0' }, 'fileType'],
    ['ცარიელი', { name: 'empty.jpg', type: 'image/jpeg', data: '' }, 'fileEmpty'],
    [
      'დაზიანებული JPEG',
      { name: 'broken.jpg', type: 'image/jpeg', data: Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]) },
      'fileDamaged',
    ],
    [
      'PDF %%EOF-ის გარეშე (შეწყვეტილი)',
      { name: 'cut.pdf', type: 'application/pdf', data: PDF.subarray(0, 60) },
      'fileDamaged',
    ],
    ['VTT .txt-ად', { name: 'ka.txt', type: 'text/plain', data: VTT }, 'fileMismatch'],
  ];

  beforeAll(async () => {
    const jpeg = await jpegWithGps();
    CASES[0][1].data = jpeg;
    CASES[2][1].data = jpeg;
  });

  it.each(CASES.map(([name, file, code]) => ({ name, file, code })))(
    '$name → 400 `$code`, არაფერი ინახება',
    async ({ file, code }) => {
      const before = await ctx.repos.media.list();
      const { status, body } = await upload(admin, file);
      expect(status).toBe(400);
      expect(body.code).toBe('bad-request');
      expect(body.fields.file.code).toBe(code);
      expect(body.message).toBe(body.fields.file.message);
      expect(await ctx.repos.media.list()).toHaveLength(before.length);
    },
  );

  it('VTT: დროის შეცდომა სტრიქონის ნომრით; `text/plain` + .vtt მიიღება', async () => {
    const bad = await upload(admin, { name: 'ka.vtt', type: 'text/vtt', data: BAD_VTT });
    expect(bad.status).toBe(400);
    expect(bad.body.fields.file.code).toBe('vttTiming');
    expect(bad.body.fields.file.message).toMatch(/სტრიქონი 3/);
    const header = await upload(admin, { name: 'ka.vtt', data: 'WEBVTTX\n' });
    expect(header.body.fields.file.code).toBe('fileType');
    const ok = await upload(admin, { name: 'ka.vtt', type: 'text/plain', data: `\uFEFF${VTT}` });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ kind: 'track', usage: [] });
    expect(ok.body.src).toMatch(/^\/media\/track\/\d{4}\/[A-Za-z0-9_-]{22}\.vtt$/);
    expect(await ctx.repos.media.find(ok.body.id)).toMatchObject({ cues: 2, end: 7.25 });
  });

  it('PDF: სათაური, ენა, tagged მეტა-ველებიდან; ბიბლიოთეკაში — დოკუმენტი', async () => {
    const { status, body } = await upload(
      admin,
      { name: 'report.pdf', type: 'application/pdf', data: PDF },
      { title: 'წლიური ანგარიში', lang: 'en', tagged: 'true' },
    );
    expect(status).toBe(201);
    expect(body).toMatchObject({
      kind: 'document',
      title: 'წლიური ანგარიში',
      lang: 'en',
      tagged: true,
      size: PDF.length,
      alt: '',
    });
    expect(Buffer.compare(await stored(body.src), PDF)).toBe(0);
  });
});

describe('მოთხოვნის ფორმა', () => {
  it('ფაილის გარეშე → 422 `file: required`; უცნობი ველი → 400; alt > 1000 → 422; ratio → 422', async () => {
    const none = await upload(admin, null, { alt: 'x' });
    expect(none.status).toBe(422);
    expect(none.body.fields.file.code).toBe('required');
    const png = { name: 'a.png', type: 'image/png', data: await pngWithGps() };
    expect((await upload(admin, png, { owner: 'x' })).status).toBe(400);
    const long = await upload(admin, png, { alt: 'ა'.repeat(1001) });
    expect(long.status).toBe(422);
    expect(long.body.fields.alt.code).toBe('tooLong');
    const ratio = await upload(admin, png, { ratio: '2:1' });
    expect(ratio.status).toBe(422);
    expect(ratio.body.fields.ratio.code).toBe('option');
  });

  it('JSON-ის სხეული → 400; ორი ფაილი → 400; სხვა ველში ფაილი → 400', async () => {
    const json = await admin.post(`${ADMIN}/media`, { file: 'x' });
    expect(json.statusCode).toBe(400);
    const form = new FormData();
    const jpeg = new File([new Uint8Array(await jpegWithGps())], 'a.jpg', { type: 'image/jpeg' });
    form.append('file', jpeg);
    form.append('file', jpeg);
    const { encodeMultipart } = await import('../browser.js');
    const two = await encodeMultipart(form);
    const res = await admin.request({
      method: 'POST',
      url: `${ADMIN}/media`,
      payload: Buffer.from(two.body),
      headers: { 'content-type': two.type },
    });
    expect(res.statusCode).toBe(400);
    const other = new FormData();
    other.append('photo', jpeg);
    const wrong = await encodeMultipart(other);
    const res2 = await admin.request({
      method: 'POST',
      url: `${ADMIN}/media`,
      payload: Buffer.from(wrong.body),
      headers: { 'content-type': wrong.type },
    });
    expect(res2.statusCode).toBe(400);
  });

  it('სესიის გარეშე → 401; CSRF-ის გარეშე → 403; სხვა საიტიდან → 403; რედაქტორი — 201', async () => {
    const body = await multipart({ name: 'a.pdf', type: 'application/pdf', data: PDF });
    const anonymous = await ctx.app.inject({ method: 'POST', url: `${ADMIN}/media`, ...body });
    expect(anonymous.statusCode).toBe(401);
    const noCsrf = await admin.request({
      method: 'POST',
      url: `${ADMIN}/media`,
      ...body,
      csrf: false,
    });
    expect(noCsrf.statusCode).toBe(403);
    const cross = await admin.request({
      method: 'POST',
      url: `${ADMIN}/media`,
      payload: body.payload,
      headers: { ...body.headers, 'sec-fetch-site': 'cross-site' },
    });
    expect(cross.statusCode).toBe(403);
    const editor = agent(ctx.app);
    await editor.login(EDITOR_EMAIL);
    expect(
      (await upload(editor, { name: 'a.pdf', type: 'application/pdf', data: PDF })).status,
    ).toBe(201);
  });

  it('ლოგში ფაილის სახელი, alt და გასაღები არ ჩანს — მხოლოდ სახე და ზომა', async () => {
    const name = 'ნინო-ბერიძე-სახლთან.jpg';
    const { body } = await upload(
      admin,
      { name, type: 'image/jpeg', data: await jpegWithGps() },
      { alt: 'ნინო ბერიძე თავის სახლთან' },
    );
    const text = logs.text();
    expect(text).not.toContain('ნინო');
    expect(text).not.toContain(body.src.split('/').pop());
    expect(logs.lines().some((l) => l.msg === 'media.upload' && l.kind === 'image')).toBe(true);
  });
});

describe('ზღვრები (env)', () => {
  /** @type {Awaited<ReturnType<typeof authApp>>} */
  let small;
  /** @type {ReturnType<typeof agent>} */
  let who;
  beforeAll(async () => {
    small = await authApp('media_limits', {
      env: { MEDIA_MAX_IMAGE_MB: '1', MEDIA_MAX_DOCUMENT_MB: '2', MEDIA_MAX_MEGAPIXELS: '1' },
    });
    await addUser(small.repos, { email: ADMIN_EMAIL, role: 'admin' });
    who = agent(small.app);
    await who.login(ADMIN_EMAIL);
  });
  afterAll(() => small?.close());

  /** @param {{ name: string, type?: string, data: Buffer }} file */
  async function send(file) {
    const body = await multipart(file);
    const res = await who.request({ method: 'POST', url: `${ADMIN}/media`, ...body });
    return { status: res.statusCode, body: JSON.parse(res.body) };
  }

  it('ფოტო > 1 MB → 400 `fileTooLarge` („1 MB“); PDF 1.5 MB — გადის (დოკუმენტის ზღვარი 2 MB)', async () => {
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(1.2 * MB)]);
    const image = await send({ name: 'big.jpg', type: 'image/jpeg', data: big });
    expect(image.status).toBe(400);
    expect(image.body.fields.file.code).toBe('fileTooLarge');
    expect(image.body.fields.file.message).toMatch(/1 MB/);
    const pdf = Buffer.concat([PDF.subarray(0, 9), Buffer.alloc(1.5 * MB, 0x20), PDF.subarray(9)]);
    expect((await send({ name: 'big.pdf', type: 'application/pdf', data: pdf })).status).toBe(201);
  });

  it('საერთო მაქსიმუმზე მეტი (2.5 MB) — ბოლომდე არ იკითხება → 400 `fileTooLarge`', async () => {
    const huge = Buffer.concat([PDF.subarray(0, 9), Buffer.alloc(2.5 * MB, 0x20), PDF.subarray(9)]);
    const res = await send({ name: 'huge.pdf', type: 'application/pdf', data: huge });
    expect(res.status).toBe(400);
    expect(res.body.fields.file.code).toBe('fileTooLarge');
    expect(res.body.fields.file.message).toMatch(/2 MB/);
  });

  it('სურათი > 1 მეგაპიქსელი → 400 `imageTooLarge` (დეკომპრესიის ბომბი)', async () => {
    const wide = await sharp({
      create: { width: 1250, height: 1000, channels: 3, background: '#FFFFFF' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(wide.length).toBeLessThan(MB);
    const res = await send({ name: 'wide.png', type: 'image/png', data: wide });
    expect(res.status).toBe(400);
    expect(res.body.fields.file.code).toBe('imageTooLarge');
    expect(res.body.fields.file.message).toMatch(/1 მეგაპიქსელი/);
  });
});

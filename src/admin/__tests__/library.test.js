import { describe, expect, it } from 'vitest';

import { createMockStore } from '@/content/mock/store.js';

import {
  buildLibrary,
  fileError,
  fileNodes,
  filterLibrary,
  findMediaItem,
  inUseError,
  normalizeMediaPatch,
  parseEmbeddedId,
  patchRecord,
  usageCount,
} from '../api/library.js';
import { createMockAdminAdapter, MOCK_PASSWORD } from '../api/mock.js';

/**
 * B5: ბიბლიოთეკის საერთო წესი (`library.js`) — mock და სერვერი ერთ კოდს იძახებენ.
 */

const SRC = '/media/image/2026/AAAAAAAAAAAAAAAAAAAAAA.jpg';

/** @type {import('../api/library.js').FileRecord} */
const FILE = {
  id: 'm-1',
  kind: 'image',
  src: SRC,
  size: 10,
  title: 'a.jpg',
  alt: '[შემოთავაზება]',
  ratio: null,
  lang: null,
  tagged: null,
};

const article = (/** @type {Record<string, any>} */ extra = {}) => ({
  title: '[სტატია]',
  cover: { src: SRC, alt: '[ყდა]', ratio: '3:2' },
  body: [
    { type: 'p', content: [] },
    { type: 'image', image: { src: SRC, alt: '[ტექსტი]', ratio: '3:2' } },
  ],
  translations: { en: { cover: { alt: '[cover]' } } },
  ...extra,
});

describe('fileNodes', () => {
  it('ყველა `src`-იანი ობიექტი ველის გზით; translations — არა', () => {
    const nodes = fileNodes({
      ...article(),
      team: [{ name: 'x', photo: { src: null, alt: '', ratio: '1:1' } }],
      captions: [{ kind: 'captions', srclang: 'ka', src: null }],
      pdf: { src: null, label: '', lang: 'ka', tagged: false },
      audio: { src: null, type: 'audio/mpeg' },
    });
    expect(nodes.map((n) => [n.path, n.kind])).toEqual([
      ['cover', 'image'],
      ['body[1].image', 'image'],
      ['team[0].photo', 'image'],
      ['captions[0]', 'track'],
      ['pdf', 'document'],
      ['audio', 'other'],
    ]);
  });
});

describe('buildLibrary', () => {
  it('ფაილი — ერთი ბარათი ყველა გამოყენებით; ჩადგმული (src რეესტრში არ არის) — თითო ველზე', () => {
    const records = {
      articles: [
        { id: 'a-1', item: article() },
        { id: 'a-2', item: { title: '[მეორე]', cover: { src: null, alt: '', ratio: '3:2' } } },
      ],
    };
    const items = buildLibrary(records, [FILE]);
    expect(items.map((m) => m.id)).toEqual(['img:a-2:cover', 'm-1']);
    expect(items[1]).toMatchObject({
      alt: '[ყდა]',
      usage: [
        { type: 'articles', id: 'a-1', title: '[სტატია]', field: 'cover' },
        { type: 'articles', id: 'a-1', title: '[სტატია]', field: 'body[1].image' },
      ],
    });
    expect(usageCount(items[1].usage)).toBe(1);
    expect(filterLibrary(items, { missingAlt: true }).map((m) => m.id)).toEqual(['img:a-2:cover']);
  });

  it('alt: ერთ გამოყენებას თუ აკლია → ""; სამუშაო ასლიც ითვლება; გამოუყენებელი — შემოთავაზება', () => {
    const records = {
      articles: [
        {
          id: 'a-1',
          item: { title: '[x]', cover: { src: null, alt: 'x', ratio: '3:2' } },
          working: { item: { title: '[x]', cover: { src: SRC, alt: '', ratio: '3:2' } } },
        },
      ],
    };
    const [, file] = buildLibrary(records, [FILE]);
    expect(file).toMatchObject({ alt: '', usage: [{ id: 'a-1', field: 'cover' }] });
    expect(buildLibrary({}, [FILE])[0].alt).toBe('[შემოთავაზება]');
    expect(buildLibrary({}, [{ ...FILE, kind: 'track' }])).toEqual([]);
    expect(findMediaItem({}, [{ ...FILE, kind: 'track' }], 'm-1').kind).toBe('track');
    expect(() => findMediaItem({}, [], 'm-404')).toThrow(
      expect.objectContaining({ code: 'not-found' }),
    );
  });
});

describe('patchRecord', () => {
  it('ფაილი: ყველა კვანძი იმავე src-ით (ცოცხალი + სამუშაო ასლი); თარგმანი ხელუხლებელია', () => {
    const item = article();
    const working = { ...article(), title: '[ახალი]' };
    const next = patchRecord(item, working, { src: SRC, kind: 'image' }, { alt: '[ახალი alt]' });
    expect(next.item?.cover.alt).toBe('[ახალი alt]');
    expect(next.item?.body[1].image.alt).toBe('[ახალი alt]');
    expect(next.item?.translations.en.cover.alt).toBe('[cover]');
    expect(next.working?.title).toBe('[ახალი]');
    expect(next.working?.cover.alt).toBe('[ახალი alt]');
    expect(item.cover.alt).toBe('[ყდა]');
  });

  it('ჩადგმული: ერთი ველი; სამუშაო ასლში — მხოლოდ იგივე ფაილი; უცვლელი → null', () => {
    const item = article();
    const working = { ...article(), cover: { src: '/media/other.jpg', alt: 'y', ratio: '3:2' } };
    const next = patchRecord(item, working, { path: 'cover', kind: 'image' }, { alt: '[z]' });
    expect(next.item?.cover.alt).toBe('[z]');
    expect(next.item?.body[1].image.alt).toBe('[ტექსტი]');
    expect(next.working).toBeNull();
    expect(
      patchRecord(item, null, { path: 'cover', kind: 'image' }, { alt: '[ყდა]' }).item,
    ).toBeNull();
  });

  it('დოკუმენტი: სათაური → label, ენა, tagged', () => {
    const item = {
      title: '[სერია]',
      pdf: { src: SRC, label: '[ძველი]', lang: 'ka', tagged: false },
    };
    const next = patchRecord(
      item,
      null,
      { path: 'pdf', kind: 'document' },
      { title: '[ახალი]', lang: 'en', tagged: true },
    );
    expect(next.item?.pdf).toEqual({ src: SRC, label: '[ახალი]', lang: 'en', tagged: true });
  });
});

describe('შეცდომები', () => {
  it('ცარიელი alt → validation `alt`; ფაილი → bad-request + `fields.file`; 409 — „N მასალაში“', () => {
    expect(() => normalizeMediaPatch('image', { alt: '  ' })).toThrow(
      expect.objectContaining({
        code: 'validation',
        fields: { alt: expect.objectContaining({ code: 'required' }) },
      }),
    );
    expect(normalizeMediaPatch('image', { alt: ' x ' }).alt).toBe('x');
    const file = fileError('fileTooLarge', { max: 10 * 1024 * 1024 });
    expect(file.code).toBe('bad-request');
    expect(file.fields?.file).toEqual({
      code: 'fileTooLarge',
      message: 'ფაილი ძალიან დიდია — მაქსიმუმ 10 MB.',
    });
    expect(file.message).toBe(file.fields?.file.message);
    expect(fileError('vttTiming', { line: 7 }).message).toMatch(/სტრიქონი 7/);
    expect(inUseError(3).message).toBe('გამოიყენება 3 მასალაში — ჯერ იქიდან მოხსენი.');
    expect(parseEmbeddedId('img:a-001:body[2].image')).toEqual({
      kind: 'image',
      recordId: 'a-001',
      path: 'body[2].image',
    });
    expect(parseEmbeddedId('m-1')).toBeNull();
  });
});

describe('mock adapter (ეტალონი) — სერვერის წესით', () => {
  async function adapter() {
    const store = createMockStore({ now: () => Date.parse('2026-11-05T08:00:00Z') });
    const admin = createMockAdminAdapter({ store });
    await admin.auth.login({ email: 'admin@example.org', password: MOCK_PASSWORD });
    return admin;
  }

  it('ატვირთვა: შიგთავსით მოწმდება; VTT — track, ბიბლიოთეკაში არ ჩანს', async () => {
    const admin = await adapter();
    const svg = new File(['<svg/>'], 'logo.jpg', { type: 'image/jpeg' });
    await expect(admin.media.upload(svg)).rejects.toMatchObject({
      code: 'bad-request',
      fields: { file: { code: 'fileType' } },
    });
    const vtt = new File(['WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nა\n'], 'ka.vtt', {
      type: 'text/vtt',
    });
    const track = await admin.media.upload(vtt);
    expect(track.kind).toBe('track');
    expect((await admin.media.list()).some((m) => m.id === track.id)).toBe(false);
    const bad = new File(['WEBVTT\n\nx --> y\n'], 'ka.vtt', { type: 'text/vtt' });
    await expect(admin.media.upload(bad)).rejects.toMatchObject({
      fields: { file: { code: 'vttTiming' } },
    });
  });

  it('alt-ის შეცვლა სამუშაო ასლს აღარ შლის (F8-ის ხარვეზი)', async () => {
    const admin = await adapter();
    const record = await admin.content.get('a-001');
    await admin.content.update(
      'a-001',
      { title: '[ავტოშენახული]' },
      { version: record.version, autosave: true },
    );
    expect((await admin.content.get('a-001')).working).not.toBeNull();
    await admin.media.updateAlt('img:a-001:cover', '[ახალი alt]');
    const after = await admin.content.get('a-001');
    expect(after.item.cover.alt).toBe('[ახალი alt]');
    expect(after.working?.item.title).toBe('[ავტოშენახული]');
    expect(after.working?.item.cover.alt).toBe('[ახალი alt]');
  });
});

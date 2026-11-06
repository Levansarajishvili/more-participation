import { expect } from 'vitest';

import { ContentError, normalizeError } from '@/content/errors.js';
import { createMockAdapter, createMockStore } from '@/content/mock/index.js';

import { MOCK_INVITE, MOCK_PASSWORD, createMockAdminAdapter } from '../../api/mock.js';
import { CONTENT_TYPES } from '../../content-types.js';
import { schemaFor } from '../../schemas/index.js';

/**
 * ადმინის adapter-ის სცენარები — ერთი ნაკრები ორ adapter-ზე (B4): mock (`api.test.js`, jsdom) და
 * HTTP (`server/test/content/parity.test.js` — რეალური სერვერი + memory-server). ყოველი სცენარი
 * `expect`-ით თავად ამოწმებს შედეგს და `env.note()`-ით აგროვებს ნორმალიზებულ კვალს; parity-ტესტი
 * ერთსა და იმავე სცენარს ორივე გარემოში უშვებს და კვალს ადარებს — „ერთნაირი შედეგი“ ზუსტად.
 *
 * კვალში მხოლოდ ის შედის, რაც ორივე მხარეს ერთნაირი უნდა იყოს: შეცდომის კოდი, ველის გზა, seed-ის
 * id, სათაური, ვერსია, სტატუსი, ავტორი. არა — ახალი მასალის id (`a-004` ↔ `a-<ObjectId>`) და დროის
 * სტრიქონის ფორმა (`+04:00` ↔ `Z`).
 *
 * `step` — ნაბიჯი, რომლიდანაც სცენარი HTTP-ზე მუშაობს (`B3`, `B4a`, `B4b`, `B5`).
 */

/** @typedef {import('../../api/adminAdapter.js').AdminAdapter} AdminAdapter */
/** @typedef {import('../../content-types.js').ContentType} ContentType */

/**
 * @typedef {object} PublicView
 * @property {(slug: string) => Promise<any>} getArticle
 * @property {(params?: object) => Promise<any>} listArticles
 * @property {() => Promise<any[]>} getTeam
 * @property {() => Promise<any>} getSettings
 */

/**
 * @typedef {object} AdminEnv
 * @property {'mock' | 'http'} kind
 * @property {AdminAdapter} admin            შეცდომა — ყოველთვის `ContentError` (`normalizeError`)
 * @property {PublicView} pub                საჯარო ხედი (HTTP-ზე B6-მდე — ბაზის snapshot → mock adapter)
 * @property {(email?: string) => Promise<any>} login
 * @property {(id: string) => Promise<Record<string, any> | null>} item   საცავის item (საიტის წყარო)
 * @property {(type: ContentType, slug: string) => Promise<{ id: string, item: Record<string, any> } | null>} bySlug
 * @property {(type: ContentType) => Promise<string[]>} ids   ჩასმის რიგით
 * @property {() => number} now
 * @property {(ms: number) => void} advance   საათის გადაწევა (დაგეგმილი გამოქვეყნება)
 * @property {boolean} media                 B5-დან ორივე გარემოში `true`
 * @property {unknown[]} notes
 * @property {(...values: unknown[]) => void} note
 */

/** B5: 3 × 2 PNG (sharp-ით შექმნილი) — სერვერი მას ხელახლა კოდირებს, mock მხოლოდ ტიპს ამოწმებს. */
export const PNG_3X2 = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWPgVnWFIAY4CwAaJAK/21JenwAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
);
export const MINIMAL_PDF =
  '%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n';
export const CAPTIONS = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.500\nსატესტო სუბტიტრი\n';

export const ADMIN_EMAIL = 'admin@example.org';
export const EDITOR_EMAIL = 'editor@example.org';
/** ≥ 12 და ცნობილი პაროლების სიაში (B3, სერვერი) არ არის. */
export const NEW_PASSWORD = 'ცისფერი ზღვა მთვარე 2026';

/** JSON-ის ასლი: `undefined` ქრება — mock-ის ობიექტი და HTTP-ის პასუხი ერთნაირად შედარდება. */
export const plain = (/** @type {unknown} */ value) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

/**
 * adapter-ის შეცდომა → `ContentError` (adminAdapter.js-ის `call`-ის იგივე `normalizeError`).
 * @param {AdminAdapter} adapter
 * @returns {AdminAdapter}
 */
export function normalized(adapter) {
  /** @type {any} */
  const out = { source: adapter.source };
  for (const group of /** @type {const} */ ([
    'auth',
    'content',
    'media',
    'users',
    'settings',
    'reports',
  ])) {
    out[group] = Object.fromEntries(
      Object.entries(adapter[group]).map(([name, fn]) => [
        name,
        async (/** @type {unknown[]} */ ...args) => {
          try {
            return await /** @type {any} */ (fn)(...args);
          } catch (error) {
            throw normalizeError(error);
          }
        },
      ]),
    );
  }
  return out;
}

/**
 * @param {Promise<unknown>} promise
 * @returns {Promise<string>}  `ok` ან შეცდომის კოდი
 */
export async function code(promise) {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return /** @type {ContentError} */ (error).code;
  }
}

/**
 * @param {Promise<unknown>} promise
 * @returns {Promise<ContentError>}
 */
export async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ContentError);
    return /** @type {ContentError} */ (error);
  }
  throw new Error('შეცდომა მოსალოდნელი იყო');
}

/** სიის სტრიქონი კვალისთვის (დროის სტრიქონის გარეშე). @param {any} row */
const rowNote = (row) => {
  const { updatedAt: _updatedAt, ...rest } = row;
  return plain(rest);
};

/**
 * mock-ის გარემო: საერთო საცავი, ადმინის და საჯარო adapter-ი, მართვადი საათი.
 * @param {{ start?: number }} [options]  parity — HTTP-ის გარემოს იგივე საწყისი დრო
 * @returns {AdminEnv & { store: ReturnType<typeof createMockStore> }}
 */
export function mockEnv({ start = Date.now() } = {}) {
  let t = start;
  const store = createMockStore({ now: () => t });
  const pub = createMockAdapter({ store });
  const admin = normalized(createMockAdminAdapter({ store }));
  /** @type {unknown[]} */
  const notes = [];
  return {
    kind: 'mock',
    store,
    admin,
    pub,
    media: true,
    notes,
    note: (...values) => notes.push(...values.map(plain)),
    now: store.now,
    advance: (ms) => {
      t += ms;
    },
    login: (email = ADMIN_EMAIL) => admin.auth.login({ email, password: MOCK_PASSWORD }),
    item: async (id) =>
      /** @type {any} */ (CONTENT_TYPES.map((type) => store.find(type, id)).find(Boolean))?.item ??
      null,
    bySlug: async (type, slug) => {
      const record = store.findBySlug(type, slug);
      return record ? { id: record.id, item: /** @type {any} */ (record.item) } : null;
    },
    ids: async (type) => store.records(type).map((r) => r.id),
  };
}

/**
 * @typedef {object} Scenario
 * @property {string} name
 * @property {'B3' | 'B4a' | 'B4b' | 'B5'} step
 * @property {(env: AdminEnv) => Promise<void>} run
 */

/** @type {Scenario[]} */
export const SCENARIOS = [
  {
    name: 'ადმინში გამოქვეყნებული მასალა საჯარო ხედში ჩანს; წაშლილი — ქრება',
    step: 'B4b',
    async run(env) {
      const { admin, pub } = env;
      await env.login();
      const draft = (await admin.content.list({ type: 'articles', status: 'draft' })).items.find(
        (row) => row.issues.errors === 0,
      );
      expect(draft).toBeDefined();
      const id = /** @type {string} */ (draft?.id);
      const slug = /** @type {string} */ (draft?.slug);
      env.note(id, await code(pub.getArticle(slug)));
      const record = await admin.content.get(id);
      const published = await admin.content.publish(id, { version: record.version });
      expect(published.item.status).toBe('published');
      expect((await pub.getArticle(slug)).slug).toBe(slug);
      await admin.content.update(
        id,
        { title: '[ვერსია 2]' },
        { version: (await admin.content.get(id)).version },
      );
      await admin.content.remove(id);
      const after = [
        await code(admin.content.versions(id)),
        await code(pub.getArticle(slug)),
        await code(admin.content.get(id)),
      ];
      expect(after).toEqual(['not-found', 'not-found', 'not-found']);
      env.note(published.version, after);
    },
  },

  {
    name: 'წაშლა: 7 საჯარო გვერდი არ იშლება; სესიის გარეშე — unauthorized; ვერსიები ქრება',
    step: 'B4a',
    async run(env) {
      const { admin } = env;
      env.note(await code(admin.content.remove('a-001')));
      await env.login();
      const pages = await env.ids('pages');
      expect(pages).toHaveLength(7);
      expect(await code(admin.content.remove(pages[0]))).toBe('bad-request');
      const before = env.media
        ? (await admin.media.list({ kind: 'image' })).filter((m) => m.usage[0]?.id === 'a-001')
        : [];
      if (env.media) expect(before.length).toBeGreaterThan(0);
      // ისტორია — ერთი ვერსია წაშლამდე
      const record = await admin.content.get('a-001');
      await admin.content.update('a-001', { title: '[ვერსია 2]' }, { version: record.version });
      expect(await admin.content.remove('a-001')).toEqual({ ok: true });
      if (env.media) {
        expect(
          (await admin.media.list({ kind: 'image' })).some((m) => m.usage[0]?.id === 'a-001'),
        ).toBe(false);
      }
      const after = [
        await env.item('a-001'),
        await code(admin.content.remove('a-001')),
        await code(admin.content.versions('a-001')),
        await code(admin.content.get('a-001')),
      ];
      expect(after).toEqual([null, 'not-found', 'not-found', 'not-found']);
      env.note(after, await env.item(pages[0]).then((item) => item?.slug));
    },
  },

  {
    name: 'ძველი ვერსიით შენახვა → conflict (409); ვერსიების ისტორია და აღდგენა',
    step: 'B4a',
    async run(env) {
      const { admin } = env;
      await env.login();
      const [row] = (await admin.content.list({ type: 'news' })).items;
      const first = await admin.content.update(
        row.id,
        { title: '[ახალი სათაური]' },
        { version: row.version },
      );
      expect(first.version).toBe(row.version + 1);
      expect(
        await code(admin.content.update(row.id, { title: '[სხვა]' }, { version: row.version })),
      ).toBe('conflict');
      const versions = await admin.content.versions(row.id);
      expect(versions[0]).toMatchObject({ current: true, title: '[ახალი სათაური]' });
      expect(versions.map((v) => v.current)).toEqual([true, false]);
      const restored = await admin.content.restoreVersion(row.id, row.version);
      expect(restored.item.title).toBe(row.title);
      expect(restored.version).toBe(row.version + 2);
      expect(await code(admin.content.restoreVersion(row.id, 99))).toBe('not-found');
      const history = await admin.content.versions(row.id);
      env.note(
        row.id,
        versions.map(({ version, title, current, by }) => ({ version, title, current, by })),
        history.map(({ version, title, current }) => ({ version, title, current })),
        restored.working,
        restored.updatedBy,
      );
    },
  },

  {
    name: 'გამოქვეყნება ბლოკერით (alt, H3 H2-მდე, „აქ“) → validation + ველის გზები',
    step: 'B4b',
    async run(env) {
      const { admin } = env;
      await env.login();
      const draft = /** @type {{ id: string }} */ (
        await env.bySlug('articles', 'akhali-statia-monakhazi')
      );
      const error = await failure(admin.content.publish(draft.id, { version: 1 }));
      expect(error.code).toBe('validation');
      expect(Object.keys(error.fields ?? {})).toEqual(
        expect.arrayContaining(['cover.alt', 'body[0]', 'body[1].content[1]']),
      );
      expect(await env.item(draft.id)).toMatchObject({ status: 'draft' });
      env.note(error.code, error.fields);
    },
  },

  {
    name: 'უფლებები: რედაქტორს მომხმარებლები / პარამეტრები — forbidden; სესიის გარეშე — unauthorized',
    step: 'B4b',
    async run(env) {
      const { admin } = env;
      const anonymous = await code(admin.content.list({ type: 'articles' }));
      await env.login(EDITOR_EMAIL);
      const codes = [
        anonymous,
        await code(admin.users.list()),
        await code(admin.settings.get()),
        await code(admin.settings.update({ featured: { featuredArticle: null } })),
        await code(admin.content.list({ type: 'articles' })),
        await code(admin.reports.stats()),
        await code(admin.reports.a11yReport()),
      ];
      expect(codes).toEqual([
        'unauthorized',
        'forbidden',
        'forbidden',
        'forbidden',
        'ok',
        'ok',
        'ok',
      ]);
      if (env.media) expect(await code(admin.media.list())).toBe('ok');
      env.note(codes);
    },
  },

  {
    name: 'შესვლა: უცნობი ელფოსტა და არასწორი პაროლი ერთნაირ შეცდომას აბრუნებს; დეაქტივირებული — იგივე',
    step: 'B3',
    async run(env) {
      const { admin } = env;
      const a = await failure(
        admin.auth.login({ email: 'x@example.org', password: MOCK_PASSWORD }),
      );
      const b = await failure(admin.auth.login({ email: ADMIN_EMAIL, password: 'nope-nope-nope' }));
      expect([a.code, b.code]).toEqual(['unauthorized', 'unauthorized']);
      expect(a.message).toBe(b.message);
      await env.login();
      await admin.users.deactivate('u-002');
      const c = await failure(admin.auth.login({ email: EDITOR_EMAIL, password: MOCK_PASSWORD }));
      expect(c.code).toBe('unauthorized');
      env.note([a.code, b.code, c.code], a.message === c.message);
    },
  },

  {
    name: 'მოწვევა → რეგისტრაცია (როლი მოწვევისაა), კოდი ერთჯერადია',
    step: 'B3',
    async run(env) {
      const { admin } = env;
      await env.login();
      const invite = await admin.users.invite({ email: 'new@example.org', role: 'admin' });
      expect(invite.link).toBe(`/admin/login?tab=register&invite=${invite.code}`);
      const values = {
        name: '[სახელი]',
        email: 'new@example.org',
        invite: invite.code,
        password: NEW_PASSWORD,
      };
      const session = await admin.auth.register(values);
      expect(session.user.role).toBe('admin');
      const reuse = await code(admin.auth.register({ ...values, email: 'other@example.org' }));
      const short = await code(
        admin.auth.register({
          ...values,
          invite: MOCK_INVITE,
          email: 'third@example.org',
          password: 'short',
        }),
      );
      expect([reuse, short]).toEqual(['validation', 'validation']);
      env.note(session.user.role, session.user.email, reuse, short);
    },
  },

  {
    name: 'რჩეული ერთია: settings.update ახალ რჩეულს ნიშნავს და წინას ხსნის',
    step: 'B4b',
    async run(env) {
      const { admin, pub } = env;
      await env.login();
      const before = await admin.settings.get();
      const other = (
        await admin.content.list({ type: 'articles', status: 'published' })
      ).items.find((row) => row.id !== before.featured.featuredArticle);
      const after = await admin.settings.update({
        featured: { featuredArticle: other?.id ?? null },
      });
      expect(after.featured.featuredArticle).toBe(other?.id);
      const featured = await pub.listArticles({ featured: true, limit: 5 });
      expect(featured.items.map((/** @type {any} */ a) => a.slug)).toEqual([other?.slug]);
      env.note(before.featured, after.featured);
    },
  },

  {
    name: 'მედია: alt-ის გარეშე ფაილი ფილტრდება; alt-ის შეცვლა მასალაში აისახება; გამოყენებული არ იშლება',
    step: 'B5',
    async run(env) {
      const { admin } = env;
      await env.login();
      const missing = await admin.media.list({ missingAlt: true });
      expect(missing.length).toBeGreaterThan(0);
      const item = missing[0];
      await admin.media.updateAlt(item.id, '[ფოტო: თვალის დონე — ახალი აღწერა]');
      const [, recordId] = item.id.split(':');
      expect(await env.item(recordId)).toMatchObject({
        cover: { alt: '[ფოტო: თვალის დონე — ახალი აღწერა]' },
      });
      const removed = await code(admin.media.remove(item.id));
      expect(removed).toBe('conflict');
      env.note(item.id, removed);
    },
  },

  {
    name: 'მედია: ტიპი შიგთავსით (400 `fields.file`); ატვირთული ფაილი — გამოყენება, alt ყველგან, 409, წაშლა',
    step: 'B5',
    async run(env) {
      const { admin } = env;
      await env.login();
      const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'photo.png', {
        type: 'image/png',
      });
      const mismatch = new File([PNG_3X2], 'photo.jpg', { type: 'image/jpeg' });
      const rejected = [];
      for (const file of [svg, mismatch]) {
        const error = await failure(admin.media.upload(file));
        // http.js: 400 + `fields` → `validation`; mock — `bad-request` (ორივე ველს აჩვენებს)
        expect(['validation', 'bad-request']).toContain(error.code);
        rejected.push(error.fields?.file?.code);
      }
      expect(rejected).toEqual(['fileType', 'fileMismatch']);

      const file = await admin.media.upload(
        new File([PNG_3X2], 'photo.png', { type: 'image/png' }),
        {
          ratio: '3:2',
        },
      );
      expect(file).toMatchObject({ kind: 'image', alt: '', title: 'photo.png', usage: [] });
      expect((await admin.media.list({ missingAlt: true })).some((m) => m.id === file.id)).toBe(
        true,
      );

      const draft = (await admin.content.list({ type: 'articles', status: 'draft' })).items[0];
      const record = await admin.content.get(draft.id);
      const used = await admin.content.update(
        draft.id,
        { cover: { src: file.src, alt: '[ყდა — ატვირთული]', ratio: '3:2' } },
        { version: record.version },
      );
      const listed = (await admin.media.list({ kind: 'image' })).find((m) => m.id === file.id);
      expect(listed?.usage).toEqual([
        { type: 'articles', id: draft.id, title: draft.title, field: 'cover' },
      ]);
      expect(listed?.alt).toBe('[ყდა — ატვირთული]');
      expect(
        (await admin.media.list({ kind: 'image' })).some((m) => m.id === `img:${draft.id}:cover`),
      ).toBe(false);

      const patched = await admin.media.updateAlt(file.id, '[ახალი alt — ყველგან]');
      expect(patched.alt).toBe('[ახალი alt — ყველგან]');
      expect((await env.item(draft.id))?.cover.alt).toBe('[ახალი alt — ყველგან]');
      const blocked = await code(admin.media.remove(file.id));
      expect(blocked).toBe('conflict');
      const usage = await admin.media.usage(file.id);

      const current = await admin.content.get(draft.id);
      await admin.content.update(
        draft.id,
        { cover: { src: null, alt: '', ratio: '3:2' } },
        { version: current.version },
      );
      expect(await admin.media.remove(file.id)).toEqual({ ok: true });
      expect((await admin.media.list()).some((m) => m.id === file.id)).toBe(false);
      expect(await code(admin.media.usage(file.id))).toBe('not-found');
      env.note(rejected, used.version, listed?.usage, patched.alt, blocked, usage);
    },
  },

  {
    name: 'მედია: დოკუმენტი (PDF) — სათაური / ენა / tagged; VTT — track, ბიბლიოთეკაში არ ჩანს',
    step: 'B5',
    async run(env) {
      const { admin } = env;
      await env.login();
      const pdf = await admin.media.upload(
        new File([MINIMAL_PDF], 'report.pdf', { type: 'application/pdf' }),
        { title: '[ანგარიში]', lang: 'en' },
      );
      expect(pdf).toMatchObject({
        kind: 'document',
        title: '[ანგარიში]',
        lang: 'en',
        tagged: false,
      });
      const updated = await admin.media.update(pdf.id, { tagged: true, title: '[ანგარიში 2026]' });
      expect(updated).toMatchObject({ tagged: true, title: '[ანგარიში 2026]', lang: 'en' });
      const docs = await admin.media.list({ kind: 'document' });
      expect(docs.find((m) => m.id === pdf.id)?.usage).toEqual([]);
      const track = await admin.media.upload(new File([CAPTIONS], 'ka.vtt', { type: 'text/vtt' }));
      expect(track.kind).toBe('track');
      expect((await admin.media.list()).some((m) => m.id === track.id)).toBe(false);
      const broken = await failure(
        admin.media.upload(new File(['WEBVTT\n\nx --> y\n'], 'bad.vtt', { type: 'text/vtt' })),
      );
      expect(await admin.media.remove(pdf.id)).toEqual({ ok: true });
      env.note(
        [pdf.kind, pdf.lang, pdf.tagged],
        [updated.title, updated.tagged],
        track.kind,
        broken.fields?.file?.code,
      );
    },
  },

  {
    name: 'stats / a11yReport: საცავიდან ითვლება, ხარვეზი წესების მიხედვით ჯგუფდება',
    step: 'B4b',
    async run(env) {
      const { admin } = env;
      await env.login();
      const stats = await admin.reports.stats();
      expect(stats.a11yIssues).toBe(2);
      expect(stats.counts.pages).toBe(7);
      const report = await admin.reports.a11yReport();
      const codes = report.groups.map((g) => g.code);
      expect(codes).toEqual(
        expect.arrayContaining([
          'altMissing',
          'headingOrder',
          'linkText',
          'captionsMissing',
          'audioDescriptionMissing',
          'youtubeMissing',
        ]),
      );
      expect(report.groups.find((g) => g.code === 'youtubeMissing')?.severity).toBe('error');
      expect(codes).not.toContain('signLanguageMissing');
      env.note(stats, report);
    },
  },

  /* ─── B4: ნაწილი ა — წერა ────────────────────────────────────────────── */

  {
    name: 'სია: ტიპი / all, სტატუსი, შემოწმების კოდი, ძიება, გვერდი, დალაგება',
    step: 'B4a',
    async run(env) {
      const { admin } = env;
      await env.login();
      const all = await admin.content.list({ type: 'all', limit: 50 });
      expect(all.items.length).toBe(Math.min(50, all.total));
      const times = all.items.map((row) => Date.parse(row.updatedAt));
      expect(times).toEqual([...times].sort((a, b) => b - a));
      const drafts = await admin.content.list({ type: 'articles', status: 'draft' });
      expect(drafts.items.every((row) => row.status === 'draft' && row.type === 'articles')).toBe(
        true,
      );
      const alt = await admin.content.list({ type: 'all', check: 'altMissing', limit: 50 });
      const demo = /** @type {{ id: string }} */ (
        await env.bySlug('articles', 'akhali-statia-monakhazi')
      );
      expect(alt.items.map((row) => row.id)).toContain(demo.id);
      expect(alt.items.every((row) => row.issues.codes.includes('altMissing'))).toBe(true);
      const [first] = (await admin.content.list({ type: 'articles', limit: 50 })).items;
      const word = first.title.replace(/[[\]]/g, '').split(/\s+/)[0];
      const found = await admin.content.list({ type: 'articles', q: word, limit: 50 });
      expect(found.items.map((row) => row.id)).toContain(first.id);
      const bySlug = await admin.content.list({ type: 'all', q: first.slug });
      expect(bySlug.items.map((row) => row.id)).toContain(first.id);
      const last = await admin.content.list({ type: 'all', page: 999, limit: 5 });
      expect(last.page).toBe(last.pages);
      const empty = await admin.content.list({ type: 'events', q: 'ზზზზზზზზ' });
      expect(empty).toEqual({ items: [], total: 0, page: 1, pages: 1, limit: 10 });
      const unknown = await code(
        admin.content.list({ type: /** @type {any} */ ('nope'), limit: 5 }),
      );
      expect(unknown).toBe('bad-request');
      env.note(
        { total: all.total, pages: all.pages, limit: all.limit },
        all.items.map(rowNote),
        drafts.items.map((row) => row.id),
        alt.items.map((row) => row.id),
        found.items.map((row) => row.id),
        bySlug.total,
        { page: last.page, pages: last.pages, ids: last.items.map((row) => row.id) },
        unknown,
      );
    },
  },

  {
    name: 'შექმნა: ყოველთვის მონახაზი; დაკავებული slug → validation; გვერდი — bad-request; slug-ის შემოწმება',
    step: 'B4a',
    async run(env) {
      const { admin } = env;
      await env.login(EDITOR_EMAIL);
      const defaults = schemaFor('news').defaults(env.now());
      const created = await admin.content.create('news', {
        ...defaults,
        title: '[ახალი სიახლე]',
        slug: 'akhali-siakhle-b4',
        status: 'published',
      });
      expect(created).toMatchObject({ type: 'news', version: 1, working: null });
      expect(created.item.status).toBe('draft');
      expect(created.id).toMatch(/^n-/);
      const [existing] = (await admin.content.list({ type: 'news', status: 'published' })).items;
      const duplicate = await failure(
        admin.content.create('news', { ...defaults, slug: existing.slug }),
      );
      expect(duplicate.code).toBe('validation');
      expect(Object.keys(duplicate.fields ?? {})).toEqual(['slug']);
      const page = await code(admin.content.create(/** @type {any} */ ('pages'), {}));
      const slugs = [
        await admin.content.checkSlug('news', existing.slug),
        await admin.content.checkSlug('news', existing.slug, existing.id),
        await admin.content.checkSlug('news', 'akhali-siakhle-b4', created.id),
        await admin.content.checkSlug('news', 'tavisufali-slug-b4'),
        await admin.content.checkSlug('articles', 'akhali-siakhle-b4'),
      ];
      expect(slugs.map((s) => s.available)).toEqual([false, true, true, true, true]);
      const row = (await admin.content.list({ type: 'news', q: 'akhali-siakhle-b4' })).items[0];
      expect(row?.id).toBe(created.id);
      env.note(
        created.item.status,
        created.updatedBy,
        created.issues.map((i) => i.code),
        duplicate.fields?.slug.code,
        page,
        slugs,
        rowNote({ ...row, id: null }),
      );
    },
  },

  {
    name: 'ავტოშენახვა: გამოქვეყნებული → სამუშაო ასლი (საიტი უცვლელი); შენახვა და მონახაზი — პირდაპირ',
    step: 'B4a',
    async run(env) {
      const { admin, pub } = env;
      await env.login();
      const [row] = (await admin.content.list({ type: 'articles', status: 'published' })).items;
      const record = await admin.content.get(row.id);
      const auto = await admin.content.update(
        row.id,
        { ...record.item, title: '[ავტოშენახვა]' },
        { version: record.version, autosave: true },
      );
      expect(auto.version).toBe(record.version);
      expect(auto.item.title).toBe(row.title);
      expect(auto.working?.item.title).toBe('[ავტოშენახვა]');
      expect((await pub.getArticle(row.slug)).title).toBe(row.title);
      const reopened = await admin.content.get(row.id);
      expect(reopened.working?.item.title).toBe('[ავტოშენახვა]');
      // ავტოშენახვა ვერსიას არ ზრდის — იგივე ვერსიით კიდევ ერთხელ
      await admin.content.update(
        row.id,
        { ...record.item, title: '[ავტოშენახვა 2]' },
        { version: record.version, autosave: true },
      );
      const saved = await admin.content.update(
        row.id,
        { ...record.item, title: '[შენახული]' },
        { version: record.version },
      );
      expect(saved).toMatchObject({ version: record.version + 1, working: null });
      expect((await pub.getArticle(row.slug)).title).toBe('[შენახული]');

      const demo = /** @type {{ id: string }} */ (
        await env.bySlug('articles', 'akhali-statia-monakhazi')
      );
      const draft = await admin.content.get(demo.id);
      const direct = await admin.content.update(
        demo.id,
        { ...draft.item, title: '[მონახაზი — ავტოშენახვა]' },
        { version: draft.version, autosave: true },
      );
      expect(direct).toMatchObject({ version: draft.version + 1, working: null });
      expect(direct.item.title).toBe('[მონახაზი — ავტოშენახვა]');
      env.note(
        [auto.version, auto.item.title, auto.working?.item.title, auto.working?.by],
        reopened.working?.item.title,
        [saved.version, saved.item.title, saved.updatedBy],
        [direct.version, direct.item.title, direct.issues.map((i) => i.code)],
      );
    },
  },

  {
    name: 'სტატუსი და რჩეული: published მხოლოდ /publish-ით; featured რედაქტორიდან არ იცვლება; მონახაზად შენახვა საიტიდან ხსნის',
    step: 'B4a',
    async run(env) {
      const { admin, pub } = env;
      await env.login();
      const demo = /** @type {{ id: string }} */ (
        await env.bySlug('articles', 'akhali-statia-monakhazi')
      );
      const status = await failure(
        admin.content.update(demo.id, { status: 'published' }, { version: 1 }),
      );
      expect(status.code).toBe('validation');
      expect(Object.keys(status.fields ?? {})).toEqual(['status']);
      const published = (
        await admin.content.list({ type: 'articles', status: 'published', limit: 50 })
      ).items;
      const ids = published.map((row) => row.id);
      const items = await Promise.all(ids.map((id) => env.item(id)));
      const plainIndex = items.findIndex((item) => item?.featured === false);
      const featuredIndex = items.findIndex((item) => item?.featured === true);
      expect(plainIndex).toBeGreaterThanOrEqual(0);
      expect(featuredIndex).toBeGreaterThanOrEqual(0);
      const target = published[plainIndex];
      const kept = await admin.content.update(
        target.id,
        { featured: true, title: '[რჩეული არა]' },
        { version: target.version },
      );
      expect(kept.item).toMatchObject({ featured: false, title: '[რჩეული არა]' });
      const featured = published[featuredIndex];
      const stays = await admin.content.update(
        featured.id,
        { featured: false },
        { version: featured.version },
      );
      expect(stays.item.featured).toBe(true);
      const unpublished = await admin.content.update(
        target.id,
        { status: 'draft' },
        { version: kept.version },
      );
      expect(unpublished.item.status).toBe('draft');
      expect(await code(pub.getArticle(target.slug))).toBe('not-found');
      env.note(
        status.fields?.status.code,
        [target.id, kept.item.featured, kept.version],
        [featured.id, stays.item.featured],
        unpublished.item.status,
      );
    },
  },

  {
    name: 'YouTube-ის id-ის დუბლიკატი: მთავარი, აუდიოაღწერა, სამუშაო ასლი; არასწორი id — bad-request',
    step: 'B4a',
    async run(env) {
      const { admin } = env;
      await env.login();
      const [first, second] = (await admin.content.list({ type: 'videos', status: 'published' }))
        .items;
      const one = await admin.content.get(first.id);
      await admin.content.update(
        first.id,
        { youtube: { id: 'aaaaaaaaaaa', adId: 'bbbbbbbbbbb' } },
        { version: one.version },
      );
      const two = await admin.content.get(second.id);
      await admin.content.update(
        second.id,
        { youtube: { id: 'ccccccccccc' } },
        { version: two.version, autosave: true },
      );
      const results = [
        await admin.content.checkYouTube('aaaaaaaaaaa'),
        await admin.content.checkYouTube('aaaaaaaaaaa', first.id),
        await admin.content.checkYouTube('bbbbbbbbbbb', second.id),
        await admin.content.checkYouTube('ccccccccccc', first.id),
        await admin.content.checkYouTube('ddddddddddd'),
      ];
      expect(results.map((r) => r.available)).toEqual([false, true, false, false, true]);
      expect(results[0].usedBy?.id).toBe(first.id);
      expect(results[3].usedBy?.id).toBe(second.id);
      const invalid = await code(admin.content.checkYouTube('არ-არის-id'));
      expect(invalid).toBe('bad-request');
      env.note(results, invalid);
    },
  },

  {
    name: '„ჩვენ შესახებ“: გუნდი და პარტნიორები საჯარო წყაროში იწერება შენახვისას (ავტოშენახვისას — არა)',
    step: 'B4a',
    async run(env) {
      const { admin, pub } = env;
      await env.login();
      const about = /** @type {{ id: string }} */ (await env.bySlug('pages', 'about'));
      const record = await admin.content.get(about.id);
      expect(record.item.status).toBe('published');
      const team = record.item.team.map((/** @type {any} */ member, /** @type {number} */ i) =>
        i === 0 ? { ...member, name: '[ახალი სახელი გვარი]' } : member,
      );
      const before = (await pub.getTeam())[0].name;
      await admin.content.update(about.id, { team }, { version: record.version, autosave: true });
      const afterAutosave = (await pub.getTeam())[0].name;
      expect(afterAutosave).toBe(before);
      const saved = await admin.content.update(about.id, { team }, { version: record.version });
      const afterSave = (await pub.getTeam())[0].name;
      expect(afterSave).toBe('[ახალი სახელი გვარი]');
      expect(saved.issues).toEqual([]);
      env.note(before, afterAutosave, afterSave, saved.version);
    },
  },
  /* ─── B4: ნაწილი ბ — გამოქვეყნება, ძიება, პარამეტრები ─────────────────── */

  {
    name: 'გამოქვეყნება სამუშაო ასლიდან: ავტოშენახული ცვლილება საიტზე „გამოქვეყნებით“ გადის',
    step: 'B4b',
    async run(env) {
      const { admin, pub } = env;
      await env.login();
      const [row] = (await admin.content.list({ type: 'articles', status: 'published' })).items;
      const record = await admin.content.get(row.id);
      await admin.content.update(
        row.id,
        { ...record.item, title: '[სამუშაო ასლი → საიტი]' },
        { version: record.version, autosave: true },
      );
      expect((await pub.getArticle(row.slug)).title).toBe(row.title);
      const published = await admin.content.publish(row.id, { version: record.version });
      expect(published).toMatchObject({ version: record.version + 1, working: null });
      expect(published.item).toMatchObject({
        title: '[სამუშაო ასლი → საიტი]',
        status: 'published',
      });
      expect((await pub.getArticle(row.slug)).title).toBe('[სამუშაო ასლი → საიტი]');
      const stale = await code(admin.content.publish(row.id, { version: record.version }));
      expect(stale).toBe('conflict');
      env.note(row.id, published.version, published.item.title, published.updatedBy, stale);
    },
  },

  {
    name: 'დაგეგმვა: წარსული თარიღი → validation (`publishedAt`); მომავალი — საიტზე დროის დადგომისას ჩანს',
    step: 'B4b',
    async run(env) {
      const { admin, pub } = env;
      await env.login();
      const draft = (await admin.content.list({ type: 'articles', status: 'draft' })).items.find(
        (row) => row.issues.errors === 0,
      );
      const id = /** @type {string} */ (draft?.id);
      const slug = /** @type {string} */ (draft?.slug);
      const past = await failure(
        admin.content.schedule(id, new Date(env.now() - 60_000).toISOString(), {
          version: /** @type {number} */ (draft?.version),
        }),
      );
      expect(past.code).toBe('validation');
      expect(Object.keys(past.fields ?? {})).toEqual(['publishedAt']);
      const at = new Date(env.now() + 5 * 60_000).toISOString();
      const scheduled = await admin.content.schedule(id, at, {
        version: /** @type {number} */ (draft?.version),
      });
      expect(scheduled.item).toMatchObject({ status: 'scheduled', publishedAt: at });
      const before = await code(pub.getArticle(slug));
      const stats = await admin.reports.stats();
      expect(stats.nextScheduledAt).toBe(at);
      env.advance(10 * 60_000);
      const after = (await pub.getArticle(slug)).slug;
      expect([before, after]).toEqual(['not-found', slug]);
      env.note(id, past.fields?.publishedAt.code, scheduled.version, before, after);
    },
  },

  {
    name: 'ინგლისური ვერსიის ბლოკერი: თარგმანის სათაურების რიგი → validation (`translations.en.*`)',
    step: 'B4b',
    async run(env) {
      const { admin } = env;
      await env.login();
      const draft = (await admin.content.list({ type: 'articles', status: 'draft' })).items.find(
        (row) => row.issues.errors === 0,
      );
      const record = await admin.content.get(/** @type {string} */ (draft?.id));
      const error = await failure(
        admin.content.publish(record.id, {
          version: record.version,
          data: {
            ...record.item,
            translations: {
              en: { title: '[English title]', body: [{ type: 'h3', text: '[English H3]' }] },
            },
          },
        }),
      );
      expect(error.code).toBe('validation');
      const keys = Object.keys(error.fields ?? {});
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.every((key) => key.startsWith('translations.en.'))).toBe(true);
      expect(await env.item(record.id)).toMatchObject({ status: 'draft' });
      env.note(error.fields);
    },
  },

  {
    name: 'ვიდეო სუბტიტრის და წყაროს გარეშე არ ქვეყნდება → validation (`youtube.id`, `captions`)',
    step: 'B4b',
    async run(env) {
      const { admin } = env;
      await env.login(EDITOR_EMAIL);
      const draft = /** @type {{ id: string }} */ (
        await env.bySlug('videos', 'akhali-video-monakhazi')
      );
      const error = await failure(admin.content.publish(draft.id, { version: 1 }));
      expect(error.code).toBe('validation');
      expect(Object.keys(error.fields ?? {})).toEqual(
        expect.arrayContaining(['youtube.id', 'captions']),
      );
      expect(error.fields?.captions.code).toBe('captionsMissing');
      expect(await env.item(draft.id)).toMatchObject({ status: 'draft' });
      env.note(error.fields);
    },
  },

  {
    name: 'ძიება: სათაური და slug, ყველა ტიპი, უახლესი პირველი; ცარიელი → []',
    step: 'B4b',
    async run(env) {
      const { admin } = env;
      await env.login(EDITOR_EMAIL);
      const [first] = (await admin.content.list({ type: 'series', limit: 50 })).items;
      const word = first.title.replace(/[[\]]/g, '').split(/\s+/)[0];
      const results = await admin.content.search(word);
      expect(results.map((row) => row.id)).toContain(first.id);
      expect(results.length).toBeLessThanOrEqual(50);
      const bySlug = await admin.content.search(first.slug);
      expect(bySlug.map((row) => row.id)).toContain(first.id);
      expect(await admin.content.search('')).toEqual([]);
      expect(await admin.content.search('   ')).toEqual([]);
      env.note(
        results.map(rowNote),
        bySlug.map((row) => row.id),
      );
    },
  },

  {
    name: 'პარამეტრები: site (+ translations.en) საჯარო საიტზე აისახება; რჩეული — უცნობი / სხვა ტიპის id → not-found, არაფერი იცვლება',
    step: 'B4b',
    async run(env) {
      const { admin, pub } = env;
      await env.login();
      const before = await admin.settings.get();
      const site = {
        ...before.site,
        responseTime: '[1 სამუშაო დღეში]',
        translations: {
          ...before.site.translations,
          en: { ...before.site.translations?.en, responseTime: '[within 1 working day]' },
        },
      };
      const saved = await admin.settings.update({ site });
      expect(saved.site.responseTime).toBe('[1 სამუშაო დღეში]');
      expect(saved.site.translations?.en?.responseTime).toBe('[within 1 working day]');
      expect((await pub.getSettings()).responseTime).toBe('[1 სამუშაო დღეში]');
      const unknown = await code(admin.settings.update({ featured: { featuredSeries: 's-404' } }));
      const foreign = await code(admin.settings.update({ featured: { featuredArticle: 'v-001' } }));
      expect([unknown, foreign]).toEqual(['not-found', 'not-found']);
      expect((await admin.settings.get()).featured).toEqual(before.featured);
      const cleared = await admin.settings.update({ featured: { featuredNews: null } });
      expect(cleared.featured).toEqual({ ...before.featured, featuredNews: null });
      env.note(saved.site.responseTime, unknown, foreign, before.featured, cleared.featured);
    },
  },
];

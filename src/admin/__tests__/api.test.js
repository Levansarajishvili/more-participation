import { describe, expect, it, vi } from 'vitest';

import { ContentError } from '@/content/errors.js';
import { createMockAdapter, createMockStore } from '@/content/mock/index.js';
import { ADMIN_PATH, createRouterOptions } from '@/routes.jsx';

import { CSRF_HEADER, createHttpAdminAdapter, readCsrfToken } from '../api/http.js';
import { MOCK_INVITE, MOCK_PASSWORD, createMockAdminAdapter } from '../api/mock.js';
import { ROLES, ROLE_PERMISSIONS, can } from '../api/permissions.js';
import {
  PASSWORD_MIN,
  loginHref,
  passwordStrength,
  safeNext,
  validateLogin,
  validateRegister,
} from '../auth/auth-forms.js';
import { initials } from '../shell/initials.js';

function env() {
  const store = createMockStore();
  const pub = createMockAdapter({ store });
  const admin = createMockAdminAdapter({ store });
  return { store, pub, admin };
}

/** @param {ReturnType<typeof createMockAdminAdapter>} admin @param {string} [email] */
const login = (admin, email = 'admin@example.org') =>
  admin.auth.login({ email, password: MOCK_PASSWORD });

/** @param {Promise<unknown>} promise */
async function code(promise) {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return /** @type {ContentError} */ (error).code;
  }
}

describe('mock adminAdapter + საერთო საცავი', () => {
  it('ადმინში გამოქვეყნებული მასალა იმავე სესიაში საჯარო adapter-ში ჩანს; წაშლილი — ქრება', async () => {
    const { pub, admin } = env();
    await login(admin);
    const draft = (await admin.content.list({ type: 'articles', status: 'draft' })).items.find(
      (row) => row.issues.errors === 0,
    );
    expect(draft).toBeDefined();
    const id = /** @type {string} */ (draft?.id);
    const slug = /** @type {string} */ (draft?.slug);
    expect(await code(pub.getArticle(slug))).toBe('not-found');
    const record = await admin.content.get(id);
    await admin.content.publish(id, { version: record.version });
    expect((await pub.getArticle(slug)).slug).toBe(slug);
    await admin.content.update(
      id,
      { title: '[ვერსია 2]' },
      { version: (await admin.content.get(id)).version },
    );
    await admin.content.remove(id);
    expect(await code(admin.content.versions(id))).toBe('not-found');
    expect(await code(pub.getArticle(slug))).toBe('not-found');
    expect(await code(admin.content.get(id))).toBe('not-found');
  });

  it('წაშლა: 7 საჯარო გვერდი არ იშლება; სესიის გარეშე — unauthorized; წაშლილი ფოტო მედიიდანაც ქრება', async () => {
    const { admin, store } = env();
    expect(await code(admin.content.remove('a-001'))).toBe('unauthorized');
    await login(admin);
    const page = store.records('pages')[0];
    expect(await code(admin.content.remove(page.id))).toBe('bad-request');
    const before = (await admin.media.list({ kind: 'image' })).filter(
      (m) => m.usage[0]?.id === 'a-001',
    );
    expect(before.length).toBeGreaterThan(0);
    await admin.content.remove('a-001');
    expect(
      (await admin.media.list({ kind: 'image' })).some((m) => m.usage[0]?.id === 'a-001'),
    ).toBe(false);
    expect(await code(admin.content.remove('a-001'))).toBe('not-found');
  });

  it('ძველი ვერსიით შენახვა → conflict (409); ვერსიების ისტორია და აღდგენა', async () => {
    const { admin } = env();
    await login(admin);
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
    const restored = await admin.content.restoreVersion(row.id, row.version);
    expect(restored.item.title).toBe(row.title);
  });

  it('გამოქვეყნება ბლოკერით (alt, H3 H2-მდე, „აქ“) → validation + ველის გზები', async () => {
    const { admin, store } = env();
    await login(admin);
    const record = store.findBySlug('articles', 'akhali-statia-monakhazi');
    const id = /** @type {string} */ (record?.id);
    const error = await admin.content.publish(id, { version: 1 }).catch((e) => e);
    expect(error).toBeInstanceOf(ContentError);
    expect(error.code).toBe('validation');
    expect(Object.keys(error.fields)).toEqual(
      expect.arrayContaining(['cover.alt', 'body[0]', 'body[1].content[1]']),
    );
    expect(store.find('articles', id)?.item).toMatchObject({ status: 'draft' });
  });

  it('უფლებები: რედაქტორს მომხმარებლები / პარამეტრები — forbidden; სესიის გარეშე — unauthorized', async () => {
    const { admin } = env();
    expect(await code(admin.content.list({ type: 'articles' }))).toBe('unauthorized');
    await login(admin, 'editor@example.org');
    expect(await code(admin.users.list())).toBe('forbidden');
    expect(await code(admin.settings.update({}))).toBe('forbidden');
    expect(await code(admin.content.list({ type: 'articles' }))).toBe('ok');
    expect(await code(admin.media.list())).toBe('ok');
  });

  it('შესვლა: უცნობი ელფოსტა და არასწორი პაროლი ერთნაირ შეცდომას აბრუნებს; დეაქტივირებული — იგივე', async () => {
    const { admin } = env();
    const a = await admin.auth
      .login({ email: 'x@example.org', password: MOCK_PASSWORD })
      .catch((e) => e);
    const b = await admin.auth
      .login({ email: 'admin@example.org', password: 'nope-nope-nope' })
      .catch((e) => e);
    expect([a.code, b.code]).toEqual(['unauthorized', 'unauthorized']);
    expect(a.message).toBe(b.message);
    await login(admin);
    await admin.users.deactivate('u-002');
    const c = await admin.auth
      .login({ email: 'editor@example.org', password: MOCK_PASSWORD })
      .catch((e) => e);
    expect(c.code).toBe('unauthorized');
  });

  it('მოწვევა → რეგისტრაცია (როლი მოწვევისაა), კოდი ერთჯერადია', async () => {
    const { admin } = env();
    await login(admin);
    const invite = await admin.users.invite({ email: 'new@example.org', role: 'admin' });
    expect(invite.link).toBe(`/admin/login?tab=register&invite=${invite.code}`);
    const values = {
      name: '[სახელი]',
      email: 'new@example.org',
      invite: invite.code,
      password: 'x'.repeat(PASSWORD_MIN),
    };
    const session = await admin.auth.register(values);
    expect(session.user.role).toBe('admin');
    expect(await code(admin.auth.register({ ...values, email: 'other@example.org' }))).toBe(
      'validation',
    );
    expect(
      await code(
        admin.auth.register({
          ...values,
          invite: MOCK_INVITE,
          email: 'third@example.org',
          password: 'short',
        }),
      ),
    ).toBe('validation');
  });

  it('რჩეული ერთია: settings.update ახალ რჩეულს ნიშნავს და წინას ხსნის', async () => {
    const { admin, pub } = env();
    await login(admin);
    const before = await admin.settings.get();
    const other = (await admin.content.list({ type: 'articles', status: 'published' })).items.find(
      (row) => row.id !== before.featured.featuredArticle,
    );
    const after = await admin.settings.update({ featured: { featuredArticle: other?.id ?? null } });
    expect(after.featured.featuredArticle).toBe(other?.id);
    const featured = await pub.listArticles({ featured: true, limit: 5 });
    expect(featured.items.map((a) => a.slug)).toEqual([other?.slug]);
  });

  it('მედია: alt-ის გარეშე ფაილი ფილტრდება; alt-ის შეცვლა მასალაში აისახება; გამოყენებული არ იშლება', async () => {
    const { admin, store } = env();
    await login(admin);
    const missing = await admin.media.list({ missingAlt: true });
    expect(missing.length).toBeGreaterThan(0);
    const item = missing[0];
    await admin.media.updateAlt(item.id, '[ფოტო: თვალის დონე — ახალი აღწერა]');
    const [, recordId] = item.id.split(':');
    expect(store.find('articles', recordId)?.item).toMatchObject({
      cover: { alt: '[ფოტო: თვალის დონე — ახალი აღწერა]' },
    });
    expect(await code(admin.media.remove(item.id))).toBe('conflict');
  });

  it('stats / a11yReport: საცავიდან ითვლება, ხარვეზი წესების მიხედვით ჯგუფდება', async () => {
    const { admin } = env();
    await login(admin);
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
        'signLanguageMissing',
      ]),
    );
    expect(report.groups.find((g) => g.code === 'signLanguageMissing')?.severity).toBe('warning');
  });
});

describe('როლები', () => {
  it('ადმინისტრატორი — ყველაფერი; რედაქტორი — კონტენტი და მედია', () => {
    expect(ROLES).toEqual(['admin', 'editor']);
    expect(can({ role: 'admin' }, 'users.manage')).toBe(true);
    expect(can({ role: 'editor' }, 'users.manage')).toBe(false);
    expect(can({ role: 'editor' }, 'settings.manage')).toBe(false);
    expect(can({ role: 'editor' }, 'content.publish')).toBe(true);
    expect(can({ role: 'editor' }, 'media.write')).toBe(true);
    expect(can(null, 'content.read')).toBe(false);
    expect(ROLE_PERMISSIONS.editor).not.toContain('users.manage');
  });
});

describe('ფორმის წესები', () => {
  it('safeNext: მხოლოდ /admin-ის შიდა გზა (open redirect-ის გარეშე)', () => {
    expect(safeNext('/admin/articles?status=draft')).toBe('/admin/articles?status=draft');
    for (const bad of [
      '//evil.example',
      'https://evil.example/admin',
      '/administration',
      '/admin\\..',
      '/',
      null,
      '/admin/login?next=x',
    ]) {
      expect(safeNext(bad)).toBe('/admin');
    }
    expect(loginHref('/admin/media', 'expired')).toBe(
      '/admin/login?next=%2Fadmin%2Fmedia&reason=expired',
    );
    expect(loginHref('/admin')).toBe('/admin/login');
  });

  it('პაროლი: ერთადერთი მკაცრი წესი ≥ 12; სიმტკიცე რჩევაა', () => {
    expect(
      validateRegister({ name: 'ა', email: 'a@example.org', invite: 'X', password: 'a'.repeat(11) })
        .password.code,
    ).toBe('passwordShort');
    expect(
      validateRegister({
        name: 'ა',
        email: 'a@example.org',
        invite: 'X',
        password: 'a'.repeat(12),
      }),
    ).toEqual({});
    // შესვლაზე სიგრძე არ მოწმდება — შეცდომა ზოგადი რჩება
    expect(validateLogin({ email: 'a@example.org', password: 'x' })).toEqual({});
    expect(passwordStrength('').key).toBe('empty');
    expect(passwordStrength('მოკლე').key).toBe('weak');
    expect(passwordStrength('aaaaaaaaaaaa').key).toBe('weak');
    expect(passwordStrength('ზღვა-მთა-ქარი').key).toBe('fair');
    expect(passwordStrength('ერთი ორი სამი ოთხი 2026').key).toBe('strong');
  });

  it('ინიციალები ფრჩხილების გარეშე', () => {
    expect(initials('[სახელი გვარი]')).toBe('სგ');
    expect(initials('Nino')).toBe('N');
  });
});

describe('HTTP adapter-ი', () => {
  it('credentials: include, CSRF header არა-GET მოთხოვნაზე, 401 → unauthorized, 422 → validation', async () => {
    document.cookie = 'mc-csrf=tok%2B1';
    expect(readCsrfToken()).toBe('tok+1');
    const calls = /** @type {{ url: string, init: RequestInit }[]} */ ([]);
    const responses = [
      new Response(JSON.stringify({ user: {}, expiresAt: 'x' }), { status: 200 }),
      new Response(null, { status: 401 }),
      new Response(JSON.stringify({ fields: { title: { code: 'required', message: '…' } } }), {
        status: 422,
      }),
    ];
    const fetchMock = vi.fn(async (url, init) => {
      calls.push({ url, init });
      return /** @type {Response} */ (responses.shift());
    });
    const api = createHttpAdminAdapter({
      baseUrl: 'https://api.example.org/admin/',
      fetch: fetchMock,
    });
    await api.auth.login({ email: 'a@example.org', password: 'x' });
    expect(calls[0].init.credentials).toBe('include');
    expect(/** @type {Record<string, string>} */ (calls[0].init.headers)[CSRF_HEADER]).toBe(
      'tok+1',
    );
    await expect(api.auth.me()).rejects.toMatchObject({ status: 401 });
    expect(
      /** @type {Record<string, string>} */ (calls[1].init.headers)[CSRF_HEADER],
    ).toBeUndefined();
    await expect(api.content.update('a-001', {}, { version: 1 })).rejects.toMatchObject({
      code: 'validation',
    });
    expect(calls.map((c) => c.url)).toEqual([
      'https://api.example.org/admin/auth/login',
      'https://api.example.org/admin/auth/me',
      'https://api.example.org/admin/items/a-001',
    ]);
    expect(JSON.stringify(window.localStorage)).not.toContain('tok');
    document.cookie = 'mc-csrf=; max-age=0';
  });
});

describe('lazy route discovery', () => {
  it('ADMIN_PATH: /admin, /admin/…, /admin?… — არა /administration', () => {
    for (const ok of ['/admin', '/admin/', '/admin/articles', '/admin?x=1'])
      expect(ADMIN_PATH.test(ok)).toBe(true);
    for (const no of ['/administration', '/articles/admin', '/'])
      expect(ADMIN_PATH.test(no)).toBe(false);
  });

  it('ადმინის როუტები ერთხელ ემატება, საჯარო გზაზე — არა', async () => {
    const { patchRoutesOnNavigation } = createRouterOptions();
    const patch = vi.fn();
    await patchRoutesOnNavigation(/** @type {any} */ ({ path: '/articles/x', patch }));
    expect(patch).not.toHaveBeenCalled();
    await Promise.all([
      patchRoutesOnNavigation(/** @type {any} */ ({ path: '/admin', patch })),
      patchRoutesOnNavigation(/** @type {any} */ ({ path: '/admin/articles', patch })),
    ]);
    await patchRoutesOnNavigation(/** @type {any} */ ({ path: '/admin/media', patch }));
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch.mock.calls[0][0]).toBeNull();
    expect(patch.mock.calls[0][1][0].path).toBe('/admin');
  });
});

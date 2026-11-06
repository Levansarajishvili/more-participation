import { describe, expect, it, vi } from 'vitest';

import { ContentError } from '@/content/errors.js';
import { createMockStore } from '@/content/mock/index.js';
import { ADMIN_PATH, createRouterOptions } from '@/routes.jsx';

import { CSRF_COOKIE, CSRF_HEADER, createHttpAdminAdapter, readCsrfToken } from '../api/http.js';
import { MOCK_PASSWORD, createMockAdminAdapter } from '../api/mock.js';
import { ROLES, ROLE_PERMISSIONS, can } from '../api/permissions.js';
import {
  loginHref,
  passwordStrength,
  safeNext,
  validateLogin,
  validateRegister,
} from '../auth/auth-forms.js';
import { initials } from '../shell/initials.js';

import { SCENARIOS, mockEnv } from './scenarios/admin-scenarios.js';

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

// B4: სცენარები საერთოა — იგივე ნაკრები HTTP adapter-ზე (`server/test/content/parity.test.js`)
describe('mock adminAdapter + საერთო საცავი (საერთო სცენარები)', () => {
  for (const scenario of SCENARIOS) {
    it(`[${scenario.step}] ${scenario.name}`, async () => {
      const env = mockEnv();
      await scenario.run(env);
      expect(env.notes.length).toBeGreaterThan(0);
    });
  }
});

describe('mock adminAdapter: სერვერის იგივე წესები (B4)', () => {
  it('შექმნა სტატუსს არ იღებს (მონახაზი); შენახვა `featured`-ს და `published`-ს არ ცვლის', async () => {
    const env = mockEnv();
    await env.login();
    const row = (await env.admin.content.list({ type: 'articles', status: 'draft' })).items[0];
    const error = await env.admin.content
      .update(row.id, { status: 'scheduled' }, { version: row.version })
      .catch((e) => e);
    expect(error).toBeInstanceOf(ContentError);
    expect(error.fields.status.code).toBe('option');
    const record = await env.admin.content.update(
      row.id,
      { featured: true },
      { version: row.version },
    );
    expect(record.item.featured).toBe(false);
  });
});

describe('F9: mock-ის სესია ენის გადართვისას', () => {
  it('persist: სესიის ჩანაწერი (id + ვადა) sessionStorage-ში — ახალი adapter-ი (გადატვირთვა) აღადგენს; გასვლა შლის', async () => {
    window.sessionStorage.clear();
    const first = createMockAdminAdapter({ store: createMockStore(), persist: true });
    await login(first);
    expect(
      JSON.parse(window.sessionStorage.getItem('mc-admin-mock-session') ?? 'null'),
    ).toMatchObject({ userId: 'u-001' });
    const second = createMockAdminAdapter({ store: createMockStore(), persist: true });
    expect((await second.auth.me()).user.id).toBe('u-001');
    await second.auth.logout();
    expect(window.sessionStorage.getItem('mc-admin-mock-session')).toBeNull();
    const third = createMockAdminAdapter({ store: createMockStore(), persist: true });
    expect(await code(third.auth.me())).toBe('unauthorized');
    // persist-ის გარეშე (ტესტები, ნაგულისხმევი) — არაფერი ინახება
    const plain = createMockAdminAdapter({ store: createMockStore() });
    await login(plain);
    expect(window.sessionStorage.getItem('mc-admin-mock-session')).toBeNull();
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
    document.cookie = `${CSRF_COOKIE}=tok%2B1; Secure; Path=/`;
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
    document.cookie = `${CSRF_COOKIE}=; Secure; Path=/; max-age=0`;
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

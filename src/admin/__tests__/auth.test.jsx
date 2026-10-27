import { act, screen, waitFor, within } from '@testing-library/react';
import { computeAccessibleName } from 'dom-accessibility-api';
import { Outlet } from 'react-router';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import PreferencesProvider from '@/features/a11y/PreferencesProvider.jsx';

import { setAdminAdapter } from '../api/adminAdapter.js';
import AuthProvider from '../auth/AuthProvider.jsx';
import { createAdminRoutes } from '../routes.jsx';

import { AXE, EDITOR, fillLogin, renderAdmin, setupAdmin, signInDirect } from './admin-helpers.jsx';

// ადმინის როუტების chunk (lazy discovery) ცივ გაშვებაზე > 1 წმ იტვირთება — წინასწარ
beforeAll(() => import('../routes.jsx'), 20_000);

afterEach(() => {
  setAdminAdapter(null);
  setContentAdapter(null);
});

describe('შესვლა / რეგისტრაცია (AdminAuth)', () => {
  it('სესიის გარეშე → /admin/login?next=…; შესვლის შემდეგ იმავე ეკრანზე, ფოკუსი h1-ზე', async () => {
    setupAdmin();
    const { router, user } = renderAdmin('/admin/articles?status=draft');
    await screen.findByRole('heading', { level: 1, name: 'შესვლა პანელში' }, { timeout: 5000 });
    expect(router.state.location.pathname).toBe('/admin/login');
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Farticles%3Fstatus%3Ddraft');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );

    await fillLogin(user);
    // პარალელურ გაშვებაზე lazy chunk-ები ნელა იტვირთება — დიდი timeout
    const h1 = await screen.findByRole(
      'heading',
      { level: 1, name: 'სტატიები' },
      { timeout: 8000 },
    );
    expect(router.state.location.pathname).toBe('/admin/articles');
    expect(router.state.location.search).toBe('?status=draft');
    await waitFor(() => expect(h1).toHaveFocus(), { timeout: 3000 });
  });

  it('ჩანართები: ← → Home End, roving tabindex, aria-controls, URL-ში', async () => {
    setupAdmin();
    const { router, user } = renderAdmin('/admin/login');
    const login = await screen.findByRole('tab', { name: 'შესვლა' });
    const register = screen.getByRole('tab', { name: 'რეგისტრაცია' });
    expect(login).toHaveAttribute('aria-selected', 'true');
    expect(login).toHaveAttribute('tabindex', '0');
    expect(register).toHaveAttribute('tabindex', '-1');
    expect(login).toHaveAttribute('aria-controls', 'auth-panel-login');

    login.focus();
    await user.keyboard('{ArrowRight}');
    expect(register).toHaveFocus();
    expect(register).toHaveAttribute('aria-selected', 'true');
    expect(router.state.location.search).toBe('?tab=register');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ანგარიშის შექმნა');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'auth-panel-register');

    await user.keyboard('{ArrowRight}');
    expect(login).toHaveFocus();
    await user.keyboard('{End}');
    expect(register).toHaveFocus();
    await user.keyboard('{Home}');
    expect(login).toHaveFocus();
    expect(router.state.location.search).toBe('');
    // Tab ჩანართების ჯგუფიდან პანელში გადადის (არჩეულ ჩანართზე მხოლოდ ერთი გაჩერება)
    await user.tab();
    expect(screen.getByRole('textbox', { name: /^ელფოსტა/ })).toHaveFocus();
  });

  it('უცნობი ელფოსტა და არასწორი პაროლი — ერთი და იგივე ზოგადი შეცდომა', async () => {
    setupAdmin();
    const { user } = renderAdmin('/admin/login');
    await fillLogin(user, { email: 'nobody@example.org', password: 'whatever-123456' });
    const first = await screen.findByRole('alert');
    expect(first).toHaveTextContent('ელფოსტა ან პაროლი არასწორია.');

    await fillLogin(user, { password: 'wrong-password-1' });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('ელფოსტა ან პაროლი არასწორია.'),
    );
    expect(screen.getByRole('alert').textContent).toBe(first.textContent);
  });

  it('ცარიელი ფორმა → შეცდომების ჯამი (role="alert", ფოკუსი) + ბმული ველზე; CAPTCHA არ არის', async () => {
    setupAdmin();
    const { user } = renderAdmin('/admin/login');
    await fillLogin(user, { email: '', password: '' });
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveTextContent('ფორმაში 2 შეცდომაა');
    await user.click(within(summary).getByRole('link', { name: /^ელფოსტა:/ }));
    expect(screen.getByRole('textbox', { name: /^ელფოსტა/ })).toHaveFocus();
    expect(screen.getByRole('textbox', { name: /^ელფოსტა/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(document.querySelector('iframe, [class*="captcha" i]')).toBeNull();
  });

  it('autocomplete, ჩასმა, „პაროლის ჩვენება“ (aria-pressed, მუდმივი სახელი)', async () => {
    setupAdmin();
    const { user } = renderAdmin('/admin/login');
    const email = await screen.findByRole('textbox', { name: /^ელფოსტა/ });
    expect(email).toHaveAttribute('autocomplete', 'username');
    const password = /** @type {HTMLInputElement} */ (document.getElementById('login-password'));
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    password.focus();
    await user.paste('pasted-password-123');
    expect(password.value).toBe('pasted-password-123');
    const toggle = screen.getAllByRole('button', { name: 'პაროლის ჩვენება' })[0];
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAccessibleName('პაროლის ჩვენება');
    expect(password).toHaveAttribute('type', 'text');
  });

  it('რეგისტრაცია: ?tab=register&invite=… ავსებს კოდს; < 12 სიმბოლო — შეცდომა; სიმტკიცე რჩევაა', async () => {
    const { admin } = setupAdmin();
    const { router, user } = renderAdmin('/admin/login?tab=register&invite=MC-INVITE-0001');
    const invite = await screen.findByRole('textbox', { name: /^მოწვევის კოდი/ });
    expect(invite).toHaveValue('MC-INVITE-0001');
    await user.type(screen.getByRole('textbox', { name: /^სახელი და გვარი/ }), 'ახალი რედაქტორი');
    await user.type(screen.getByRole('textbox', { name: /^სამუშაო ელფოსტა/ }), 'new@example.org');
    const password = /** @type {HTMLInputElement} */ (document.getElementById('register-password'));
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    await user.type(password, 'short');
    expect(screen.getByText(/პაროლის სიმტკიცე:/)).toHaveTextContent('სუსტი');
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }));
    expect(await screen.findAllByText(/მინიმუმ 12 სიმბოლო უნდა იყოს — ახლა 5/)).toHaveLength(2);

    await user.clear(password);
    await user.type(password, 'ერთი ორი სამი ოთხი 2026');
    expect(screen.getByText(/პაროლის სიმტკიცე:/)).toHaveTextContent('ძლიერი');
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }));
    await screen.findByRole('heading', { level: 1, name: 'დაფა' });
    expect(router.state.location.pathname).toBe('/admin');
    expect(admin.state.users.find((u) => u.email === 'new@example.org')?.role).toBe('editor');
  });

  it('axe: შესვლა და რეგისტრაცია', async () => {
    setupAdmin();
    const { container, user } = renderAdmin('/admin/login');
    await screen.findByRole('tab', { name: 'შესვლა' });
    expect(await axe(container, AXE)).toHaveNoViolations();
    await user.click(screen.getByRole('tab', { name: 'რეგისტრაცია' }));
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('როლები და სესია', () => {
  it('RequireRole: რედაქტორი /admin/users-ზე — 403 გარსის შიგნით, მენიუში ადმინისტრირება არ ჩანს', async () => {
    const { admin } = setupAdmin();
    signInDirect(admin, 'editor');
    const { router } = renderAdmin('/admin/users');
    await screen.findByRole('heading', { level: 1, name: 'წვდომა არ გაქვს' });
    expect(router.state.location.pathname).toBe('/admin/users');
    const nav = screen.getByRole('navigation', { name: 'პანელის მენიუ' });
    expect(within(nav).queryByRole('link', { name: /მომხმარებლები/ })).toBeNull();
    await waitFor(() => expect(nav.querySelector('.mc-admin-nav__count')).not.toBeNull());
    const names = within(nav)
      .getAllByRole('link')
      .map((a) => computeAccessibleName(a));
    expect(names).toContain('სტატიები, 17 მასალა');
  });

  it('ადმინისტრატორი ადმინისტრირების ჯგუფს ხედავს და /admin/users-ზე 403 არ არის', async () => {
    const { admin } = setupAdmin();
    signInDirect(admin, 'admin');
    renderAdmin('/admin/users');
    await screen.findByRole('heading', { level: 1, name: 'მომხმარებლები' });
    const nav = screen.getByRole('navigation', { name: 'პანელის მენიუ' });
    const link = within(nav).getByRole('link', { name: 'მომხმარებლები' });
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('გასვლა → შესვლის გვერდი „გამოხვედი“ შეტყობინებით, next-ის გარეშე', async () => {
    const { admin } = setupAdmin();
    signInDirect(admin, 'editor');
    const { router, user } = renderAdmin('/admin/articles');
    await screen.findByRole('heading', { level: 1, name: 'სტატიები' });
    await user.click(screen.getByRole('button', { name: 'გასვლა' }));
    await screen.findByText('გამოხვედი ანგარიშიდან.');
    expect(router.state.location.search).toBe('?reason=logged-out');
    expect(admin.state.session).toBeNull();
  });

  /** AuthProvider-ის ტაიმერის მოკლე მნიშვნელობებით (warning 2 წთ → აქ ms). */
  function sessionRoutes({ warningMs = 900 } = {}) {
    const [root] = createAdminRoutes();
    root.Component = function TestRoot() {
      return (
        <PreferencesProvider>
          <AuthProvider warningMs={warningMs} expireMarginMs={0}>
            <Outlet />
          </AuthProvider>
        </PreferencesProvider>
      );
    };
    return [root];
  }

  it('ვადამდე: role="alertdialog" „გაგრძელება“ → სესია გრძელდება, დიალოგი იხურება', async () => {
    const { admin } = setupAdmin({ sessionTtl: 1000 });
    admin.state.session = { userId: 'u-002', expiresAt: Date.now() + 1000 };
    const { user } = renderAdmin('/admin', { routes: sessionRoutes() });
    await screen.findByRole('heading', { level: 1, name: 'დაფა' });
    const dialog = await screen.findByRole('alertdialog', { name: 'სესია მალე ამოიწურება' });
    const extend = within(dialog).getByRole('button', { name: 'გაგრძელება' });
    expect(extend).toHaveFocus();
    expect(dialog).toHaveAccessibleDescription(/ამოიწურება/);
    // სესიას 30 წუთი ვაძლევთ, რომ ტესტში ხელახლა არ ამოიწუროს
    admin.state.session.expiresAt = Date.now() + 1000;
    await user.click(extend);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByText(/სესია გაგრძელდა/)).toBeInTheDocument();
  });

  it('ამოწურვისას → შესვლა ?next=…&reason=expired; ხელახალი შესვლის შემდეგ იმავე ეკრანზე', async () => {
    const { admin } = setupAdmin({ sessionTtl: 60_000 });
    admin.state.session = { userId: 'u-002', expiresAt: Date.now() + 400 };
    const { router, user } = renderAdmin('/admin/articles?status=draft', {
      routes: sessionRoutes({ warningMs: 100 }),
    });
    await screen.findByRole('heading', { level: 1, name: 'სტატიები' });
    await screen.findByRole('heading', { level: 1, name: 'შესვლა პანელში' }, { timeout: 3000 });
    expect(router.state.location.search).toBe(
      '?next=%2Fadmin%2Farticles%3Fstatus%3Ddraft&reason=expired',
    );
    expect(screen.getByText(/სესია ამოიწურა/)).toBeInTheDocument();
    await act(async () => {
      await fillLogin(user, { email: EDITOR });
    });
    await screen.findByRole('heading', { level: 1, name: 'სტატიები' });
    expect(router.state.location.search).toBe('?status=draft');
  });
});

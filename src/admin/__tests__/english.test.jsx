import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import { setLocale } from '@/i18n/locale.js';
import { createRouterOptions, createRoutes } from '@/routes.jsx';

import { setAdminAdapter } from '../api/adminAdapter.js';

import { AXE, setupAdmin, signInDirect } from './admin-helpers.jsx';

beforeAll(async () => {
  await import('../routes.jsx');
  await import('../editor/EditorPage.jsx');
  await import('../editor/RichTextEditor.jsx');
}, 30_000);

afterEach(() => {
  setLocale('ka');
  setAdminAdapter(null);
  setContentAdapter(null);
});

/** @param {string} path */
function renderEn(path) {
  setLocale('en');
  const router = createMemoryRouter(createRoutes(), {
    ...createRouterOptions(),
    basename: '/en',
    initialEntries: [path],
  });
  const user = userEvent.setup();
  return { router, user, ...render(<RouterProvider router={router} />) };
}

describe('F9: ადმინი ინგლისურად (/en/admin)', () => {
  it('შესვლის გვერდი ინგლისურად; „ქართული“ იმავე გვერდზე გადაჰყავს', async () => {
    setupAdmin();
    const { container } = renderEn('/en/admin/articles');
    await screen.findByRole(
      'heading',
      { level: 1, name: 'Sign in to the panel' },
      { timeout: 8000 },
    );
    expect(screen.getByRole('tab', { name: 'Register' })).toBeInTheDocument();
    const toKa = screen.getByRole('link', { name: 'ქართული' });
    expect(toKa).toHaveAttribute('href', '/admin/login?next=%2Fadmin%2Farticles');
    expect(toKa).toHaveAttribute('lang', 'ka');
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('დაფა და მენიუ ინგლისურად, მრავლობითით', async () => {
    const { admin } = setupAdmin();
    signInDirect(admin, 'admin');
    renderEn('/en/admin/articles');
    await screen.findByRole('heading', { level: 1, name: 'Articles' }, { timeout: 8000 });
    expect(await screen.findByText(/^\d+ items found$/)).toHaveAttribute('role', 'status');
    const nav = screen.getByRole('navigation', { name: 'Panel menu' });
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/en/admin',
    );
    expect(screen.getByRole('link', { name: 'New item: Article' })).toHaveAttribute(
      'href',
      '/en/admin/articles/new',
    );
  });

  it('რედაქტორი: „Georgian / English“ ჩანართები; ინგლისური ველები translations.en-ზე; EN ბლოკერი აჩერებს გამოქვეყნებას', async () => {
    const { admin, store } = setupAdmin();
    signInDirect(admin, 'editor');
    const id = /** @type {string} */ (
      store.findBySlug('articles', 'rogor-vaktsiot-tsarumatebloba-stsavlad')?.id
    );
    const { user, container } = renderEn(`/en/admin/articles/${id}`);
    await screen.findByRole('heading', { level: 2, name: 'Publishing' }, { timeout: 8000 });
    const tabs = screen.getByRole('tablist', { name: 'Content language' });
    const georgian = within(tabs).getByRole('tab', { name: 'Georgian' });
    expect(georgian).toHaveAttribute('aria-selected', 'true');
    georgian.focus();
    await user.keyboard('{ArrowRight}');
    const english = within(tabs).getByRole('tab', { name: 'English' });
    expect(english).toHaveFocus();
    expect(english).toHaveAttribute('aria-selected', 'true');
    const enTitle = /** @type {HTMLInputElement} */ (
      document.getElementById('f-translations-en-title')
    );
    expect(enTitle).toHaveValue('[How to turn failure into learning]');
    expect(enTitle).toHaveAttribute('lang', 'en');
    expect(screen.getByText(/^Has an English translation/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Address \(slug\)/ })).toBeNull();

    const enExcerpt = /** @type {HTMLTextAreaElement} */ (
      document.getElementById('f-translations-en-excerpt')
    );
    await user.clear(enExcerpt);
    enExcerpt.focus();
    await user.paste('x'.repeat(170));
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('(English)');
    await user.click(within(summary).getByRole('link', { name: /Short description \(English\)/ }));
    expect(enExcerpt).toHaveFocus();
    expect(store.find('articles', id)?.item).toMatchObject({ status: 'published' });
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('ქართულ ადმინში ენის გადამრთველი /en/admin-ზე მიდის (იმავე გვერდზე, query-ით)', async () => {
    setLocale('ka');
    const { admin } = setupAdmin();
    signInDirect(admin, 'editor');
    const router = createMemoryRouter(createRoutes(), {
      ...createRouterOptions(),
      initialEntries: ['/admin/articles?status=draft'],
    });
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading', { level: 1, name: 'სტატიები' }, { timeout: 8000 });
    const toEn = screen.getByRole('link', { name: 'English' });
    expect(toEn).toHaveAttribute('href', '/en/admin/articles?status=draft');
    expect(toEn).toHaveAttribute('lang', 'en');
  });

  it('ინგლისურ სიაში თარგმნილი მასალა ინგლისური სათაურით, დანარჩენი — ქართულად lang="ka"', async () => {
    const { admin } = setupAdmin();
    signInDirect(admin, 'editor');
    renderEn('/en/admin/articles?q=rogor');
    expect(
      await screen.findByText(
        '[How to turn failure into learning]',
        { selector: '.mc-admin-table__title' },
        { timeout: 15_000 },
      ),
    ).not.toHaveAttribute('lang');
    const georgian = document.querySelectorAll('.mc-admin-table__title[lang="ka"]');
    expect(georgian.length).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Edit: [How to turn failure into learning]' }),
    ).toBeInTheDocument();
  }, 20_000);
});

import { readFileSync } from 'node:fs';

import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import { listArticles } from '@/content/adapter.js';

import { setAdminAdapter } from '../api/adminAdapter.js';

import { AXE, renderAdmin, setupAdmin, signInDirect } from './admin-helpers.jsx';

// ადმინის როუტების chunk (lazy discovery) ცივ გაშვებაზე > 1 წმ იტვირთება — წინასწარ
beforeAll(() => import('../routes.jsx'), 20_000);

afterEach(() => {
  setAdminAdapter(null);
  setContentAdapter(null);
});

/** @param {string} path @param {{ role?: 'admin' | 'editor', width?: number }} [o] */
async function open(path, { role = 'editor', width = 1440 } = {}) {
  const env = setupAdmin({ width });
  signInDirect(env.admin, role);
  const view = renderAdmin(path);
  await screen.findByRole('main');
  await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull());
  return { ...env, ...view };
}

describe('AdminShell', () => {
  it('1440: sidebar (nav სამი ჯგუფით), header-ში h1, ბილიკი „გზა“, საიტის ნახვა ახალ ჩანართში', async () => {
    await open('/admin/articles', { role: 'admin' });
    const nav = screen.getByRole('navigation', { name: 'პანელის მენიუ' });
    expect(within(nav).getAllByRole('list')).toHaveLength(4); // 3 ჯგუფი + ღონისძიებების ქვესია
    expect(within(nav).getByRole('link', { name: /^სტატიები/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'დაფა' })).not.toHaveAttribute('aria-current');
    const crumbs = screen.getByRole('navigation', { name: 'გზა' });
    expect(within(crumbs).getByRole('link', { name: 'ადმინი' })).toHaveAttribute('href', '/admin');
    const site = screen.getByRole('link', { name: /^საიტის ნახვა/ });
    expect(site).toHaveAttribute('target', '_blank');
    expect(site).toHaveAccessibleName('საიტის ნახვა (იხსნება ახალ ჩანართში)');
    expect(screen.getByRole('button', { name: 'თავსებადობის მენიუ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'მუქი რეჟიმი' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const cta = screen.getByRole('link', { name: 'ახალი მასალა: სტატია' });
    expect(cta).toHaveAttribute('href', '/admin/articles/new');
    expect(cta).toHaveClass('mc-btn--cta');
    // jsdom-ს `<search>`-ის როლი არ აქვს — ელემენტით
    expect(document.querySelector('search[aria-label="ძიება პანელში"]')).not.toBeNull();
    expect(document.title).toBe('სტატიები — ადმინი — მეტი ჩართულობა');
  });

  it('< 1200px: მენიუ disclosure-ად — aria-expanded, Esc ხურავს და ფოკუსი ღილაკზე ბრუნდება, main inert', async () => {
    const { user } = await open('/admin', { width: 390 });
    expect(screen.queryByRole('navigation', { name: 'პანელის მენიუ' })).toBeNull();
    const toggle = screen.getByRole('button', { name: 'პანელის მენიუ' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const nav = screen.getByRole('navigation', { name: 'პანელის მენიუ' });
    expect(document.getElementById('main')).toHaveAttribute('inert');
    expect(within(nav).getByRole('link', { name: 'დაფა' })).toBeInTheDocument();
    // Tab-ის ციკლი: პანელის ბოლო ელემენტიდან Tab → მენიუს ღილაკი (jsdom-ს inert არ აქვს — ციკლი JS-ისაა)
    const focusables = document.querySelectorAll(
      '.mc-admin-menu__panel a[href], .mc-admin-menu__panel button',
    );
    /** @type {HTMLElement} */ (focusables[focusables.length - 1]).focus();
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    expect(document.getElementById('main')).not.toHaveAttribute('inert');
  });

  it('რედაქტორის ეკრანზე „ახალი მასალა“ secondary-ა (ერთადერთი CTA — „გამოქვეყნება“)', async () => {
    await open('/admin/articles/a-001');
    expect(screen.getByRole('link', { name: 'ახალი მასალა: სტატია' })).toHaveClass(
      'mc-btn--secondary',
    );
  });

  it('უცნობი ტიპი → 404 გარსის შიგნით', async () => {
    await open('/admin/unknown-type');
    expect(
      screen.getByRole('heading', { level: 1, name: 'ეკრანი ვერ მოიძებნა' }),
    ).toBeInTheDocument();
  });
});

describe('დაფა', () => {
  it('4 მაჩვენებელი <ul>-ად, ბოლო ცვლილებები — table + caption + scope, ხარვეზები ბმულებით', async () => {
    const { container } = await open('/admin');
    const stats = screen.getByRole('list', { name: 'მაჩვენებლები' });
    expect(within(stats).getAllByRole('listitem')).toHaveLength(4);
    expect(within(stats).getByText('ხელმისაწვდომობის ხარვეზი')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'ბოლო ცვლილებები' });
    expect(table.querySelector('caption h2')).toHaveTextContent('ბოლო ცვლილებები');
    for (const th of within(table).getAllByRole('columnheader'))
      expect(th).toHaveAttribute('scope', 'col');
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    const alt = screen.getByRole('link', { name: /^სტატიები — 1: ფოტოს alt-ტექსტი აკლია/ });
    expect(alt).toHaveAttribute('href', '/admin/articles?check=altMissing');
    expect(screen.getByRole('link', { name: 'სრული ანგარიში' })).toHaveAttribute(
      'href',
      '/admin/a11y',
    );
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('სია', () => {
  it('სტატუსის ჩიპი → URL + role="status", ფოკუსი ჩიპზე რჩება; ძიება URL-ში', async () => {
    const { router, user } = await open('/admin/articles');
    const status = await screen.findByText(/^ნაპოვნია \d+ მასალა$/);
    expect(status).toHaveAttribute('role', 'status');
    const chip = screen.getByRole('button', { name: 'მონახაზი' });
    await user.click(chip);
    expect(router.state.location.search).toBe('?status=draft');
    await waitFor(() => expect(status).toHaveTextContent(/^ნაპოვნია 2 მასალა — მონახაზი$/));
    expect(chip).toHaveFocus();
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.type(screen.getByRole('searchbox', { name: 'ძიება სათაურში' }), 'მონახაზი');
    await user.click(
      within(
        /** @type {HTMLElement} */ (document.querySelector('search[aria-label="ძიება სათაურში"]')),
      ).getByRole('button', {
        name: 'ძიება',
      }),
    );
    expect(router.state.location.search).toBe(
      '?status=draft&q=%E1%83%9B%E1%83%9D%E1%83%9C%E1%83%90%E1%83%AE%E1%83%90%E1%83%96%E1%83%98',
    );
    await waitFor(() =>
      expect(status).toHaveTextContent(/^ნაპოვნია \d+ მასალა — მონახაზი, „მონახაზი“$/),
    );
  });

  it('ცხრილი: სქროლვადი რეგიონი caption-ით, მოქმედების სახელში სათაური, პაგინაცია', async () => {
    const { container, user, router } = await open('/admin/articles');
    const region = screen.getByRole('region', { name: 'სტატიები: სია' });
    expect(region).toHaveAttribute('tabindex', '0');
    const table = within(region).getByRole('table', { name: 'სტატიები: სია' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['სათაური', 'კატეგორია', 'სტატუსი', 'განახლდა', 'მოქმედება']);
    expect(within(table).getAllByRole('link', { name: /^რედაქტირება: / })).toHaveLength(10);
    expect(screen.getByText(/^ნაჩვენებია 10 \/ 17/)).toBeInTheDocument();
    const pager = screen.getByRole('navigation', { name: 'გვერდები' });
    await user.click(within(pager).getByRole('link', { name: /შემდეგი/ }));
    expect(router.state.location.search).toBe('?page=2');
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'სტატიები: სია' })).toHaveFocus(),
    );
    expect(screen.getByText(/^ნაჩვენებია 7 \/ 17/)).toBeInTheDocument();
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('წაშლა: <dialog> დადასტურებით (ფოკუსი „გაუქმებაზე“); მასალა სამუდამოდ ქრება — საჯარო საიტიდანაც', async () => {
    const { user, store } = await open('/admin/articles?status=published');
    const before = (await listArticles({ limit: 50 })).total;
    const first = (await screen.findAllByRole('button', { name: /^წაშლა: / }))[0];
    const title = first.textContent?.replace(/^წაშლა: ?/, '') ?? '';
    await user.click(first);
    const dialog = screen.getByRole('dialog', { name: `წაშლა: „${title}“` });
    expect(dialog).toHaveAccessibleDescription(/სამუდამოდ წაიშლება/);
    expect(within(dialog).getByRole('button', { name: 'გაუქმება' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'გაუქმება' }));
    expect(first).toHaveFocus();
    expect(store.records('articles').some((r) => r.item.title === title)).toBe(true);

    await user.click(first);
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'სამუდამოდ წაშლა' }),
    );
    await screen.findByText(`„${title}“ წაიშალა.`);
    await waitFor(() =>
      expect(screen.queryByText(title, { selector: '.mc-admin-table__title' })).toBeNull(),
    );
    expect(store.records('articles').some((r) => r.item.title === title)).toBe(false);
    expect((await listArticles({ limit: 50 })).total).toBe(before - 1);
  });

  it('?check=altMissing — მხოლოდ ხარვეზიანი მასალა, ფილტრის მოხსნა', async () => {
    const { user, router } = await open('/admin/articles?check=altMissing');
    expect(screen.getByText('ფილტრი: ფოტოს alt-ტექსტი აკლია')).toBeInTheDocument();
    expect(screen.getAllByText(/^ხარვეზი: \d+$/)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'ფილტრის მოხსნა' }));
    expect(router.state.location.search).toBe('');
  });

  it('გვერდები: 7 ფიქსირებული, წაშლის ღილაკის გარეშე', async () => {
    await open('/admin/pages');
    expect(screen.getAllByRole('link', { name: /^რედაქტირება: / })).toHaveLength(7);
    expect(screen.queryByRole('button', { name: /^წაშლა/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'ახალი მასალა: სტატია' })).toBeInTheDocument();
  });
});

describe('ანგარიში და ძიება', () => {
  it('/admin/a11y: ბლოკერი და გაფრთხილება ცალკე ცხრილებში, ბმული რედაქტორზე', async () => {
    const { container } = await open('/admin/a11y');
    expect(screen.getByText(/^\d+ ბლოკერი, \d+ გაფრთხილება/)).toHaveAttribute('role', 'status');
    const blocking = screen.getByRole('table', { name: 'გამოქვეყნებას ბლოკავს' });
    expect(within(blocking).getAllByText('ფოტოს alt-ტექსტი აკლია').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('table', { name: 'გაფრთხილება — გამოქვეყნება გადის' }),
    ).toBeInTheDocument();
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('/admin/search?q= — შედეგი ყველა ტიპიდან, რაოდენობა role="status"', async () => {
    await open(
      '/admin/search?q=%E1%83%9B%E1%83%9D%E1%83%9C%E1%83%90%E1%83%AE%E1%83%90%E1%83%96%E1%83%98',
    );
    const found = await screen.findByText(/^ნაპოვნია \d+ მასალა$/);
    expect(found).toHaveAttribute('role', 'status');
    expect(screen.getByRole('link', { name: '[სტატიის სათაური — მონახაზი]' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '[ვიდეოს სათაური — მონახაზი]' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ძიება: „მონახაზი“');
    expect(screen.getByRole('searchbox', { name: 'ძიება პანელში' })).toHaveValue('მონახაზი');
  });
});

describe('admin.css', () => {
  const css = readFileSync('src/admin/admin.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('HEX არ არის, ოქროსფერი (--mc-cta) არ გამოიყენება', () => {
    expect(css.match(/#[0-9a-f]{3,8}\b/gi)).toBeNull();
    expect(css).not.toMatch(/--mc-cta\b/);
  });
  it('გადაადგილება მხოლოდ reduced-motion-ის გარეშე: transition reduce-ში ითიშება', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});

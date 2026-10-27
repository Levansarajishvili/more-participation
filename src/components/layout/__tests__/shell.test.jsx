import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { createRoutes } from '@/routes.jsx';
import { installMatchMedia } from '@/test/media.js';

/** jsdom-ში განლაგება არ არის — კონტრასტს Chromium-ის axe ამოწმებს (gate). */
const AXE = { rules: { 'color-contrast': { enabled: false } } };

/** @type {ReturnType<typeof installMatchMedia> | null} */
let media = null;
afterEach(() => {
  media?.restore();
  media = null;
});

/**
 * @param {string} path
 * @param {{ width?: number, dark?: boolean }} [env]
 */
async function renderApp(path, { width = 390, dark = false } = {}) {
  media = installMatchMedia({ width, dark });
  const router = createMemoryRouter(createRoutes(), { initialEntries: [path] });
  const user = userEvent.setup();
  const view = render(<RouterProvider router={router} />);
  await screen.findByRole('heading', { level: 1 });
  return { ...view, router, user };
}

/** ფოკუსირებული ელემენტის მოკლე აღწერა Tab-ის თანმიმდევრობისთვის. */
function describeFocus() {
  const el = /** @type {HTMLElement} */ (document.activeElement);
  const name =
    el.getAttribute('aria-label') ||
    (el.getAttribute('role') === 'switch'
      ? el.querySelector('.mc-switch__label')?.textContent
      : '') ||
    el.textContent?.replace(/\s+/g, ' ').trim();
  return name ?? '';
}

describe('skip-link', () => {
  it('პირველი Tab-გაჩერებაა და ფოკუსს <main>-ზე გადაიტანს', async () => {
    const { user } = await renderApp('/about', { width: 1440 });
    await user.tab();
    const skip = screen.getByRole('link', { name: 'გადასვლა შინაარსზე' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#main');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('compact-ში ვიზუალურად დამალულია, მაგრამ მაინც პირველია', async () => {
    const { user } = await renderApp('/');
    await user.tab();
    expect(screen.getByRole('link', { name: 'გადასვლა შინაარსზე' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'გადასვლა შინაარსზე' })).toHaveClass('mc-skip--hidden');
  });
});

describe('ჰედერი 1440', () => {
  it('Tab-ის თანმიმდევრობა', async () => {
    const { user } = await renderApp('/', { width: 1440 });
    const order = [];
    for (let i = 0; i < 13; i += 1) {
      await user.tab();
      order.push(describeFocus());
    }
    expect(order).toEqual([
      'გადასვლა შინაარსზე',
      'თავსებადობის მენიუ',
      'English',
      'მეტი ჩართულობა — მთავარი',
      'მთავარი',
      'ჩვენ შესახებ',
      'სტატიები',
      'განვითარება',
      'ვიდეოები',
      'სიახლეები',
      'კონტაქტი',
      'მუქი რეჟიმი',
      'ჩაერთე',
    ]);
  });

  it.each([
    ['/articles', 'page'],
    ['/articles/chveva-5-nabiji', 'true'],
  ])('aria-current: %s → %s', async (path, value) => {
    await renderApp(path, { width: 1440 });
    const nav = screen.getByRole('navigation', { name: 'მთავარი ნავიგაცია' });
    expect(within(nav).getByRole('link', { name: 'სტატიები' })).toHaveAttribute(
      'aria-current',
      value,
    );
    expect(within(nav).getByRole('link', { name: 'მთავარი' })).not.toHaveAttribute('aria-current');
  });

  it('English: lang="en" და hreflang="en"', async () => {
    await renderApp('/', { width: 1440 });
    const english = screen.getByRole('link', { name: 'English' });
    expect(english).toHaveAttribute('lang', 'en');
    expect(english).toHaveAttribute('hreflang', 'en');
  });

  it('რეჟიმის გადამრთველი: aria-pressed, <html data-theme>, საცავი', async () => {
    const { user } = await renderApp('/', { width: 1440 });
    const toggle = screen.getByRole('button', { name: 'მუქი რეჟიმი' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(JSON.parse(localStorage.getItem('mc-a11y') ?? '{}')).toMatchObject({ theme: 'dark' });
  });

  it('axe: ჰედერი და ფუტერი, მენიუ გახსნილი', async () => {
    const { container, user } = await renderApp('/about', { width: 1440 });
    await user.click(screen.getByRole('button', { name: 'თავსებადობის მენიუ' }));
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('ჰედერი 390 (compact)', () => {
  it('Tab-ის თანმიმდევრობა დახურული მენიუთი', async () => {
    const { user } = await renderApp('/');
    const order = [];
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      order.push(describeFocus());
    }
    expect(order).toEqual([
      'გადასვლა შინაარსზე',
      'თავსებადობის მენიუ',
      'English',
      'მეტი ჩართულობა — მთავარი',
      'მუქი რეჟიმი',
      'მენიუ',
    ]);
    expect(screen.queryByRole('navigation', { name: 'მთავარი ნავიგაცია' })).toBeNull();
  });

  it('ჰამბურგერი: aria-expanded, aria-controls, ფონი inert, Tab-ის ციკლი, Esc', async () => {
    const { user, container } = await renderApp('/about');
    const burger = screen.getByRole('button', { name: 'მენიუ' });
    expect(burger).toHaveAttribute('aria-expanded', 'false');
    const panel = /** @type {HTMLElement} */ (
      container.querySelector(`#${CSS.escape(burger.getAttribute('aria-controls') ?? '')}`)
    );
    expect(panel).not.toBeVisible();

    await user.click(burger);
    expect(burger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert');
    expect(container.querySelector('footer')).toHaveAttribute('inert');
    expect(container.querySelector('.mc-topbar')).toHaveAttribute('inert');
    expect(container.querySelector('.mc-brand')).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'მუქი რეჟიმი', hidden: true })).toHaveAttribute(
      'inert',
    );

    // ციკლი: ჰამბურგერი → 7 ბმული → CTA → ჰამბურგერი
    const visited = [];
    for (let i = 0; i < 9; i += 1) {
      await user.tab();
      visited.push(describeFocus());
    }
    expect(visited).toEqual([
      'მთავარი',
      'ჩვენ შესახებ',
      'სტატიები',
      'განვითარება',
      'ვიდეოები',
      'სიახლეები',
      'კონტაქტი',
      'ჩაერთე',
      'მენიუ',
    ]);
    expect(burger).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(panel).getByRole('link', { name: 'ჩაერთე' })).toHaveFocus();
    expect(within(panel).getByRole('link', { name: 'ჩვენ შესახებ' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.keyboard('{Escape}');
    expect(burger).toHaveAttribute('aria-expanded', 'false');
    expect(burger).toHaveFocus();
    expect(panel).not.toBeVisible();
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
  });

  it('ბმული პანელში: პანელი იხურება, ფოკუსი ახალი გვერდის h1-ზე, სათაური იცვლება', async () => {
    const { user, router } = await renderApp('/');
    const burger = screen.getByRole('button', { name: 'მენიუ' });
    await user.click(burger);
    const panel = /** @type {HTMLElement} */ (
      document.getElementById(burger.getAttribute('aria-controls') ?? '')
    );
    await user.click(within(panel).getByRole('link', { name: 'სიახლეები' }));
    const heading = await screen.findByRole('heading', { level: 1, name: 'სიახლეები' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(router.state.location.pathname).toBe('/news');
    expect(screen.getByRole('button', { name: 'მენიუ' })).toHaveAttribute('aria-expanded', 'false');
    expect(document.title).toBe('სიახლეები — მეტი ჩართულობა');
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('axe: გახსნილი ჰამბურგერ-პანელი', async () => {
    const { container, user } = await renderApp('/contact');
    await user.click(screen.getByRole('button', { name: 'მენიუ' }));
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('PageShell', () => {
  it('პირველ ჩატვირთვაზე ფოკუსი არ გადაიტანება', async () => {
    await renderApp('/about');
    expect(document.body).toHaveFocus();
  });

  it('მხოლოდ query-ის ცვლილება (ფილტრი) ფოკუსს და სათაურს არ ცვლის', async () => {
    const { router } = await renderApp('/articles');
    const before = document.activeElement;
    await act(() => router.navigate('/articles?category=career'));
    expect(document.activeElement).toBe(before);
    expect(document.title).toBe('სტატიები — მეტი ჩართულობა');
  });

  it('hash-ით გადასვლა ფოკუსს სამიზნეზე გადაიტანს, თუ ის არსებობს', async () => {
    const { router } = await renderApp('/');
    await act(() => router.navigate('/about#main'));
    await screen.findByRole('heading', {
      level: 1,
      name: 'ვანგრევთ ბარიერებს. ვაძლიერებთ პოტენციალს.',
    });
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });

  it('404 გარსშია: ჰედერი, ფუტერი, სათაური', async () => {
    await renderApp('/ar-arsebuli');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('გვერდი ვერ მოიძებნა');
    expect(document.title).toBe('გვერდი ვერ მოიძებნა — მეტი ჩართულობა');
  });
});

describe('ფუტერი', () => {
  it('ბლოკები, ხილული სოციალური სახელები, placeholder-ი ბმულად არ იქცევა', async () => {
    await renderApp('/', { width: 1440 });
    const footer = screen.getByRole('contentinfo');
    for (const name of ['მასალები', 'ორგანიზაცია', 'კონტაქტი', 'ხელმისაწვდომობა']) {
      expect(within(footer).getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(within(footer).getByRole('navigation', { name: 'მასალები' })).toBeInTheDocument();
    expect(await within(footer).findByText('[ტელეფონი]')).not.toHaveAttribute('href');
    expect(within(footer).getByText('[ელფოსტა]').closest('a')).toBeNull();
    for (const network of ['Facebook', 'Instagram', 'YouTube']) {
      expect(within(footer).getByText(network)).toBeVisible();
    }
    expect(within(footer).getByText('© [წელი] მეტი ჩართულობა')).toBeInTheDocument();
    expect(
      within(footer).getByRole('link', { name: 'შეგხვდა ბარიერი? შეგვატყობინე' }),
    ).toHaveAttribute('href', '/contact?topic=barrier');
  });
});

describe('layout.css', () => {
  it('HEX არ არის — მხოლოდ --mc-* ტოკენები', () => {
    const css = readFileSync(resolve('src/styles/layout.css'), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    expect(css.match(/#[0-9a-f]{3,8}\b/gi) ?? []).toEqual([]);
    expect(css).not.toMatch(/var\(--mc-cta\)/);
  });
});

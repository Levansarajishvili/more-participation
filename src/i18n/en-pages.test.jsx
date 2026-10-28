import { render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import { createMockAdapter } from '@/content/mock/index.js';
import { createRouterOptions, createRoutes } from '@/routes.jsx';
import { installMatchMedia } from '@/test/media.js';

import { setLocale } from './locale.js';

const AXE = { rules: { 'color-contrast': { enabled: false } } };

/** @param {string} path */
function renderEn(path) {
  const router = createMemoryRouter(createRoutes(), {
    ...createRouterOptions(),
    basename: '/en',
    initialEntries: [path],
  });
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  installMatchMedia({ width: 1440 });
  setLocale('en');
  setContentAdapter(createMockAdapter());
});
afterEach(() => {
  setLocale('ka');
  setContentAdapter(null);
});

describe('F9: ინგლისური საიტი (/en)', () => {
  it('სტატიები: ინტერფეისი ინგლისურად, html lang=en; თარგმნილი — ინგლისურად, დანარჩენი — lang="ka" + „In Georgian“', async () => {
    const { container } = renderEn('/en/articles');
    await screen.findByRole('heading', { level: 1, name: 'Articles' });
    expect(document.documentElement.lang).toBe('en');
    expect(
      await screen.findByText(
        /^\d+ articles in total$|^\d+ articles found$|^Showing \d+ articles$/,
      ),
    ).toBeInTheDocument();
    const translated = await screen.findByRole('link', {
      name: '[How to turn failure into learning]',
    });
    expect(translated.closest('[lang="ka"]')).toBeNull();
    const badges = screen.getAllByText('In Georgian');
    expect(badges.length).toBeGreaterThan(0);
    const card = /** @type {HTMLElement} */ (badges[0].closest('.mc-card'));
    expect(card.querySelector('.mc-card__title')).toHaveAttribute('lang', 'ka');
    expect(card.querySelector('.mc-card__text')).toHaveAttribute('lang', 'ka');
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('ენის გადამრთველი: „ქართული“ lang="ka" hreflang, იგივე გვერდი ქართულად; შიდა ბმული /en-ით', async () => {
    renderEn('/en/news?type=event');
    await screen.findByRole('heading', { level: 1, name: 'News' });
    const banner = screen.getAllByRole('banner')[0];
    const toKa = within(banner).getByRole('link', { name: 'ქართული' });
    expect(toKa).toHaveAttribute('lang', 'ka');
    expect(toKa).toHaveAttribute('hreflang', 'ka');
    expect(toKa).toHaveAttribute('href', '/news?type=event');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Articles' })).toHaveAttribute(
      'href',
      '/en/articles',
    );
    await waitFor(() =>
      expect(
        document.head.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href'),
      ).toMatch(/\/en\/news\?type=event$/),
    );
  });

  it('სტატიის გვერდი თარგმანის გარეშე: სათაური და ტექსტი lang="ka", შესავალში „In Georgian“', async () => {
    const adapter = createMockAdapter();
    setContentAdapter(adapter);
    const slug = (await adapter.listArticles({ limit: 20 })).items.find(
      (a) => a.lang === 'ka',
    )?.slug;
    const { container } = renderEn(`/en/articles/${slug}`);
    const h1 = await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(h1.querySelector('[lang="ka"]')).not.toBeNull());
    expect(screen.getAllByText('In Georgian').length).toBeGreaterThan(0);
    expect(container.querySelector('.mc-prose')).toHaveAttribute('lang', 'ka');
    expect(screen.getByRole('button', { name: /Listen|Read/ })).toBeInTheDocument();
  });

  it('თარგმნილი სტატიის გვერდი: სათაური და ტექსტი ინგლისურად, lang-ის გარეშე', async () => {
    const { container } = renderEn('/en/articles/rogor-vaktsiot-tsarumatebloba-stsavlad');
    await screen.findByRole('heading', { level: 1, name: '[How to turn failure into learning]' });
    await waitFor(() => expect(container.querySelector('.mc-prose')).not.toBeNull());
    expect(container.querySelector('.mc-prose')).not.toHaveAttribute('lang');
    expect(screen.queryByText('In Georgian', { selector: '.mc-reading__lead *' })).toBeNull();
  });
});

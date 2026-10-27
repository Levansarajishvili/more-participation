import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import { createMockData } from '@/content/mock/data.js';
import {
  AXE,
  NOW,
  emptyAdapter,
  failingAdapter,
  headingTree,
  okAdapter,
  pendingAdapter,
  renderPage,
  settle,
  skippedLevels,
  switchableAdapter,
  unbracketedFacts,
} from '@/features/__tests__/page-helpers.jsx';

const data = createMockData({ now: NOW });
const HABIT = /** @type {import('@/content/model.js').Series} */ (
  data.series.find((series) => series.featured)
);
const WORLDVIEW = /** @type {import('@/content/model.js').Series} */ (
  data.series.find((series) => series.topic === 'worldview')
);

beforeEach(() => localStorage.clear());
afterEach(() => setContentAdapter(null));

/** @param {HTMLElement} main */
const deck = (main) => within(main).getByRole('region', { name: HABIT.title });

describe('პიროვნული განვითარება: სტრუქტურა', () => {
  it('h1, რჩეული სერია სლაიდერში (6 სლაიდი), 6 სხვა სერია → ?series=', async () => {
    const { main } = await renderPage('/development');
    await settle(main);
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent(
      'პიროვნული განვითარება',
    );
    const region = deck(main);
    expect(within(region).getByText('რჩეული სერია')).toBeInTheDocument();
    const slider = within(region).getByRole('region', { name: `სლაიდები: ${HABIT.title}` });
    expect(slider).toHaveAttribute('aria-roledescription', 'კარუსელი');
    expect(within(slider).getByRole('group', { name: '1 / 6' })).toBeInTheDocument();
    expect(within(region).getByText('6 სლაიდი')).toBeInTheDocument();

    const others = within(main).getByRole('region', { name: 'სხვა სერიები' });
    const links = within(others).getAllByRole('link');
    expect(links).toHaveLength(6);
    expect(links.map((link) => link.getAttribute('href'))).toContain(
      `/development?series=${WORLDVIEW.slug}`,
    );
    expect(links.map((link) => link.getAttribute('href'))).not.toContain(
      `/development?series=${HABIT.slug}`,
    );
  });

  it('PDF: მიუწვდომელია (src: null) — ფოკუსს იღებს, „PDF მზადდება“, ზომა [00 KB]; გაზიარება', async () => {
    const { main } = await renderPage('/development');
    await settle(main);
    const pdf = within(main).getByRole('button', { name: /PDF-ის გადმოწერა/ });
    expect(pdf).toHaveTextContent('(PDF, [00 KB])');
    expect(pdf).toHaveAttribute('aria-disabled', 'true');
    expect(pdf).not.toBeDisabled();
    expect(pdf).toHaveAccessibleDescription('PDF მზადდება');
    expect(within(main).getByRole('button', { name: /გაზიარება|ბმულის კოპირება/ })).toBeVisible();
  });

  it('PDF ფაილით: ბმული download-ით და ზომით (240 KB)', async () => {
    const custom = createMockData({ now: NOW });
    const featured = /** @type {any} */ (custom.series.find((series) => series.featured));
    featured.pdf = { src: '/files/habit.pdf', label: '[PDF]', size: 245_760 };
    const { createMockAdapter } = await import('@/content/mock/index.js');
    const { main } = await renderPage(
      '/development',
      createMockAdapter({ now: () => NOW, data: custom }),
    );
    await settle(main);
    const link = within(main).getByRole('link', { name: /PDF-ის გადმოწერა/ });
    expect(link).toHaveAttribute('href', '/files/habit.pdf');
    expect(link).toHaveAttribute('download');
    expect(link).toHaveTextContent('(PDF, 240 KB)');
  });

  it('ტექსტური ვერსია: აკორდეონი (h3, aria-expanded) → <ol>, ყველა სლაიდი მარტივი ენით', async () => {
    const { main, user } = await renderPage('/development');
    await settle(main);
    const trigger = within(main).getByRole('button', { name: 'ტექსტური ვერსია' });
    expect(trigger.closest('h3')).not.toBeNull();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const items = within(deck(main))
      .getAllByRole('listitem')
      .filter((li) => li.closest('ol'));
    const texts = items.map((li) => li.textContent);
    expect(texts).toHaveLength(HABIT.slides.length);
    HABIT.slides.forEach((slide, i) => {
      expect(texts[i]).toContain(slide.title);
      expect(texts[i]).toContain(slide.plain);
    });
  });

  it('?series=:slug → ეს სერია სლაიდერშია, ბადეში აღარ არის; ბარათზე → ფოკუსი h2-ზე', async () => {
    const { main, user } = await renderPage('/development');
    await settle(main);
    const others = within(main).getByRole('region', { name: 'სხვა სერიები' });
    await user.click(within(others).getByRole('link', { name: WORLDVIEW.title }));
    const heading = await within(main).findByRole('heading', { level: 2, name: WORLDVIEW.title });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(
      within(main).getByRole('region', { name: `სლაიდები: ${WORLDVIEW.title}` }),
    ).toBeInTheDocument();
    expect(main.querySelector('.mc-deck__eyebrow')).toHaveTextContent('მსოფლხედვა');
    const links = within(within(main).getByRole('region', { name: 'სხვა სერიები' })).getAllByRole(
      'link',
    );
    expect(links.map((link) => link.getAttribute('href'))).toContain(
      `/development?series=${HABIT.slug}`,
    );
  });

  it('არარსებული სერია → „სერია ვერ მოიძებნა“ + დაბრუნება რჩეულზე', async () => {
    const { main } = await renderPage('/development?series=ar-arsebuli');
    await within(main).findByRole('heading', { level: 2, name: 'სერია ვერ მოიძებნა' });
    expect(within(main).getByRole('link', { name: 'რჩეულ სერიაზე დაბრუნება' })).toHaveAttribute(
      'href',
      '/development',
    );
  });

  it('სათაურების ხე დონის გამოტოვების გარეშე; ყველა ფაქტი ფრჩხილებშია; axe', async () => {
    const { main, container, user } = await renderPage('/development');
    await settle(main);
    await user.click(within(main).getByRole('button', { name: 'ტექსტური ვერსია' }));
    const tree = headingTree(main);
    expect(tree[0]).toEqual([1, 'პიროვნული განვითარება']);
    expect(skippedLevels(tree)).toEqual([]);
    expect(unbracketedFacts(main)).toEqual([]);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('პიროვნული განვითარება: მდგომარეობები', () => {
  it('ჩატვირთვა: h1 და h2 „სერია იტვირთება…“, ჩონჩხი', async () => {
    const { main } = await renderPage('/development', pendingAdapter());
    expect(
      within(main).getByRole('heading', { level: 2, name: 'სერია იტვირთება…' }),
    ).toBeInTheDocument();
    expect(main.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('ქსელის შეცდომა → „თავიდან ცდა“ → წარმატება', async () => {
    const { adapter, use } = switchableAdapter(failingAdapter());
    const { main, user } = await renderPage('/development', adapter);
    await within(main).findByRole('heading', { level: 2, name: 'სერია ვერ ჩაიტვირთა' });
    use(okAdapter());
    await user.click(within(main).getAllByRole('button', { name: /თავიდან ცდა/ })[0]);
    await within(main).findByRole('region', { name: `სლაიდები: ${HABIT.title}` });
  });

  it('სერია არ არის → ცარიელი მდგომარეობის ტექსტი', async () => {
    const { main } = await renderPage('/development', emptyAdapter());
    await settle(main);
    expect(
      within(main).getByText('სერია ჯერ არ გამოქვეყნებულა. ახალი თემები აქ გამოჩნდება.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /^სლაიდები:/ })).toBeNull();
  });
});

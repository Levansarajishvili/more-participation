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
  pendingAdapter,
  renderPage,
  settle,
  skippedLevels,
  unbracketedFacts,
} from '@/features/__tests__/page-helpers.jsx';

const data = createMockData({ now: NOW });
const WEEKLY = /** @type {import('@/content/model.js').Video} */ (
  data.videos.find((video) => video.featured)
);
const SPORT = /** @type {import('@/content/model.js').Video} */ (
  data.videos.find((video) => video.category === 'sport')
);

beforeEach(() => localStorage.clear());
afterEach(() => setContentAdapter(null));

/** @param {HTMLElement} main */
const grid = (main) => within(main).getByRole('region', { name: 'ყველა ისტორია' });
/** @param {HTMLElement} main */
const gridStatus = (main) =>
  within(grid(main))
    .getAllByRole('status')
    .map((node) => node.textContent)
    .find(Boolean) ?? '';

describe('ვიდეოები: სტრუქტურა', () => {
  it('h1, კვირის ვიდეო ფლეიერში (ავტოდაკვრის გარეშე), ინფორმაცია, 6 ბარათი, ისტორიის ზოლი', async () => {
    const { main } = await renderPage('/videos');
    await settle(main);
    expect(within(main).getByRole('heading', { level: 1 })).toHaveTextContent('ვიდეო-ისტორიები');
    expect(within(main).getByRole('heading', { level: 2, name: WEEKLY.title })).toBeInTheDocument();
    const player = within(main).getByRole('region', { name: `ვიდეოფლეიერი: ${WEEKLY.title}` });
    // mock-ში ფაილი არ არის — ჩართვა მიუწვდომელია, ტრანსკრიპტი იკითხება
    expect(within(player).getByRole('button', { name: 'ჩართვა' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(main).getByRole('region', { name: 'ტრანსკრიპტი' })).toBeVisible();
    expect(
      within(main).getByText('ვიდეო თავისით არ ირთვება. ხმა და სუბტიტრები შენ მართავ.'),
    ).toBeInTheDocument();
    expect(within(grid(main)).getAllByRole('link', { name: /./ })).toHaveLength(6);
    expect(gridStatus(main)).toBe('ნაჩვენებია 6 ვიდეო');
    const current = within(grid(main)).getByRole('link', { name: WEEKLY.title });
    expect(current).toHaveAttribute('aria-current', 'true');
    expect(within(main).getByRole('link', { name: 'ისტორიის გაზიარება' })).toHaveAttribute(
      'href',
      '/contact?topic=story',
    );
  });

  it('კატეგორია → ?category=sport, სტატუსი „ნაჩვენებია 1 ვიდეო — სპორტი“, ფოკუსი ჩიპზე რჩება', async () => {
    const { main, user, router } = await renderPage('/videos');
    await settle(main);
    const chip = within(grid(main)).getByRole('button', { name: 'სპორტი' });
    await user.click(chip);
    await waitFor(() => expect(gridStatus(main)).toBe('ნაჩვენებია 1 ვიდეო — სპორტი'));
    expect(router.state.location.search).toBe('?category=sport');
    expect(chip).toHaveFocus();
    expect(within(grid(main)).getByRole('link', { name: SPORT.title })).toHaveAttribute(
      'href',
      `/videos?category=sport&video=${SPORT.slug}`,
    );
  });

  it('ბარათზე → ?video=, ფლეიერში ეს ვიდეო, ფოკუსი ფლეიერზე', async () => {
    const { main, user, router } = await renderPage('/videos');
    await settle(main);
    await user.click(within(grid(main)).getByRole('link', { name: SPORT.title }));
    const player = await within(main).findByRole('region', {
      name: `ვიდეოფლეიერი: ${SPORT.title}`,
    });
    await waitFor(() => expect(player).toHaveFocus());
    expect(router.state.location.search).toBe(`?video=${SPORT.slug}`);
    expect(within(grid(main)).getByRole('link', { name: SPORT.title })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('?v=:slug (prompt) → replace ?video=:slug', async () => {
    const { main, router } = await renderPage(`/videos?v=${SPORT.slug}`);
    await within(main).findByRole('region', { name: `ვიდეოფლეიერი: ${SPORT.title}` });
    await waitFor(() => expect(router.state.location.search).toBe(`?video=${SPORT.slug}`));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('არარსებული ვიდეო → „ვიდეო ვერ მოიძებნა“ + კვირის ვიდეოზე დაბრუნება', async () => {
    const { main } = await renderPage('/videos?video=ar-arsebuli');
    await within(main).findByRole('heading', { level: 2, name: 'ვიდეო ვერ მოიძებნა' });
    expect(within(main).getByRole('link', { name: 'კვირის ვიდეოზე დაბრუნება' })).toHaveAttribute(
      'href',
      '/videos',
    );
  });

  it('„ისტორიის გაზიარება“ → კონტაქტის ფორმაში თემა „ისტორიის გაზიარება“', async () => {
    const { main, user } = await renderPage('/videos');
    await settle(main);
    await user.click(within(main).getByRole('link', { name: 'ისტორიის გაზიარება' }));
    const topic = await screen.findByRole('combobox', { name: /თემა/ });
    expect(topic).toHaveValue('story');
  });

  it('სათაურების ხე, ფაქტები ფრჩხილებში, axe', async () => {
    const { main, container } = await renderPage('/videos');
    await settle(main);
    const tree = headingTree(main);
    expect(tree[0]).toEqual([1, 'ვიდეო-ისტორიები']);
    expect(skippedLevels(tree)).toEqual([]);
    expect(unbracketedFacts(main)).toEqual([]);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('ვიდეოები: მდგომარეობები', () => {
  it('ჩატვირთვა: h2 „ვიდეო იტვირთება…“', async () => {
    const { main } = await renderPage('/videos', pendingAdapter());
    expect(
      within(main).getByRole('heading', { level: 2, name: 'ვიდეო იტვირთება…' }),
    ).toBeInTheDocument();
  });

  it('ქსელის შეცდომა → „ვიდეო ვერ ჩაიტვირთა“ + თავიდან ცდა', async () => {
    const { main } = await renderPage('/videos', failingAdapter());
    await within(main).findByRole('heading', { level: 2, name: 'ვიდეო ვერ ჩაიტვირთა' });
    expect(within(main).getAllByRole('button', { name: /თავიდან ცდა/ }).length).toBeGreaterThan(0);
  });

  it('ვიდეო არ არის → ცარიელი მდგომარეობა', async () => {
    const { main } = await renderPage('/videos', emptyAdapter());
    await settle(main);
    expect(
      within(main).getAllByText('ვიდეო-ისტორია ჯერ არ გამოქვეყნებულა.').length,
    ).toBeGreaterThan(0);
  });
});

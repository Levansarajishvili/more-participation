import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import {
  AXE,
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

afterEach(() => setContentAdapter(null));

/** სექციები დაფის რიგით: სათაური (h1 / h2). */
const SECTIONS = [
  'ისწავლე. შთაგონდი. გაიზარდე.',
  'ვანგრევთ ბარიერებს. ვაძლიერებთ პოტენციალს.',
  'სტატიები',
  'პიროვნული განვითარება',
  'ვიდეო-ისტორიები',
  'სიახლეები',
];

describe('მთავარი: სტრუქტურა', () => {
  it('სექციები რიგით, ყოველი <section aria-labelledby> → h1/h2', async () => {
    const { main } = await renderPage('/');
    await settle(main);
    const sections = [...main.querySelectorAll(':scope > section')];
    expect(sections).toHaveLength(SECTIONS.length);
    sections.forEach((section, i) => {
      const id = section.getAttribute('aria-labelledby') ?? '';
      const heading = document.getElementById(id);
      expect(heading?.tagName).toBe(i === 0 ? 'H1' : 'H2');
      expect(heading).toHaveTextContent(SECTIONS[i]);
      expect(section).toContainElement(heading);
      expect(within(main).getByRole('region', { name: SECTIONS[i] })).toBe(section);
    });
  });

  it('სათაურების ხე: h1 → h2 → h3, დონე არ გამოტოვებულა', async () => {
    const { main } = await renderPage('/');
    await settle(main);
    const tree = headingTree(main);
    expect(skippedLevels(tree)).toEqual([]);
    expect(tree.filter(([level]) => level === 1)).toHaveLength(1);
    expect(tree.map(([level, text]) => (level < 3 ? `h${level} ${text}` : null)).filter(Boolean))
      .toMatchInlineSnapshot(`
      [
        "h1 ისწავლე. შთაგონდი. გაიზარდე.",
        "h2 [სახელი: როგორ გავხდი ვებ-დეველოპერი]",
        "h2 ვანგრევთ ბარიერებს. ვაძლიერებთ პოტენციალს.",
        "h2 სტატიები",
        "h2 პიროვნული განვითარება",
        "h2 ვიდეო-ისტორიები",
        "h2 სიახლეები",
      ]
    `);
    // h3: 3 მიმართულება + 3 სტატია + 4 სერია + 3 ვიდეო + 3 სიახლე
    expect(tree.filter(([level]) => level === 3)).toHaveLength(16);
  });

  it('ჰერო: CTA „ჩაერთე“, სამი შესასვლელი რაოდენობით, კვირის ვიდეო ბმულია (ავტოდაკვრის გარეშე)', async () => {
    const { main } = await renderPage('/');
    await settle(main);
    const hero = within(main).getByRole('region', { name: SECTIONS[0] });
    expect(within(hero).getByRole('link', { name: 'ჩაერთე' })).toHaveAttribute('href', '/contact');
    const entries = within(hero).getByRole('navigation', { name: 'მასალების ტიპები' });
    const links = within(entries).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/articles',
      '/development',
      '/videos',
    ]);
    expect(links[0]).toHaveAccessibleName(/^სტატიები, \d+ მასალა$/);
    const weekly = within(hero).getByRole('link', { name: /როგორ გავხდი ვებ-დეველოპერი/ });
    expect(weekly.getAttribute('href')).toMatch(/^\/videos\?video=[a-z0-9-]+$/);
    expect(main.querySelector('video, iframe, [autoplay]')).toBeNull();
  });

  it('ვიდეო-ისტორიები კვირის ვიდეოს არ იმეორებს; სტატიები — 3 უახლესი', async () => {
    const { main } = await renderPage('/');
    await settle(main);
    const weekly = within(main).getAllByRole('link', { name: /როგორ გავხდი ვებ-დეველოპერი/ });
    expect(weekly).toHaveLength(1);
    const videos = within(main).getByRole('region', { name: 'ვიდეო-ისტორიები' });
    expect(within(videos).getAllByRole('heading', { level: 3 })).toHaveLength(3);
    const articles = within(main).getByRole('region', { name: 'სტატიები' });
    const dates = within(articles)
      .getAllByRole('article')
      .map((card) => card.querySelector('time')?.getAttribute('datetime') ?? '');
    expect(dates).toHaveLength(3);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(within(articles).getByRole('link', { name: 'ყველა სტატია' })).toHaveAttribute(
      'href',
      '/articles',
    );
  });

  it('ყველა ფაქტი ფრჩხილებშია (ტექსტი — დაფებიდან/i18n ან [placeholder])', async () => {
    const { main } = await renderPage('/');
    await settle(main);
    expect(unbracketedFacts(main)).toEqual([]);
  });

  it('axe (jsdom, კონტრასტის გარეშე)', async () => {
    const { container, main } = await renderPage('/');
    await settle(main);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('მთავარი: მდგომარეობები', () => {
  it('ჩატვირთვა: h1 მაშინვე ჩანს, ჩონჩხი დამალულია, ეკრანის მკითხველს „იტვირთება“ ესმის', async () => {
    const { main, container } = await renderPage('/', pendingAdapter());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(SECTIONS[0]);
    expect(main.querySelectorAll('[aria-busy="true"]')).toHaveLength(5);
    expect(main.querySelectorAll('.mc-skeleton').length).toBeGreaterThan(0);
    for (const skeleton of main.querySelectorAll('.mc-skeleton')) {
      expect(skeleton.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(screen.getByText('იტვირთება: სტატიები')).toBeInTheDocument();
    expect(screen.getByText('იტვირთება: კვირის ვიდეო')).toBeInTheDocument();
    // ჩონჩხი არ ციმციმებს: ანიმაციის კლასი არ აქვს
    expect(
      main.querySelector('.mc-skeleton [class*="animate"], .mc-skeleton.animate-pulse'),
    ).toBeNull();
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('შეცდომა: ტექსტი + „თავიდან ცდა“ ყოველ სექციაში; ცდა → შიგთავსი, ფოკუსი h2-ზე', async () => {
    const source = switchableAdapter(failingAdapter());
    const { main, user, container } = await renderPage('/', source.adapter);
    await settle(main);
    const retries = within(main).getAllByRole('button', { name: /^თავიდან ცდა: / });
    expect(retries.map((button) => button.textContent?.replace('თავიდან ცდა: ', ''))).toEqual([
      'კვირის ვიდეო',
      'სტატიები',
      'პიროვნული განვითარება',
      'ვიდეო-ისტორიები',
      'სიახლეები',
    ]);
    expect(within(main).getAllByText(/კავშირი ვერ დამყარდა/)).toHaveLength(5);
    expect(retries[1]).toHaveAccessibleDescription(/კავშირი ვერ დამყარდა/);
    expect(await axe(container, AXE)).toHaveNoViolations();

    source.use(okAdapter());
    await user.click(retries[1]);
    const heading = within(main).getByRole('heading', { level: 2, name: 'სტატიები' });
    await waitFor(() => expect(heading).toHaveFocus());
    const articles = within(main).getByRole('region', { name: 'სტატიები' });
    expect(within(articles).getAllByRole('article')).toHaveLength(3);
  });

  it('განმეორებითი შეცდომა: ღილაკი ფოკუსს ინარჩუნებს, შეცდომა ცხადდება', async () => {
    const { main, user } = await renderPage('/', failingAdapter());
    await settle(main);
    const retry = within(main).getByRole('button', { name: 'თავიდან ცდა: სიახლეები' });
    await user.click(retry);
    await settle(main);
    expect(within(main).getByRole('button', { name: 'თავიდან ცდა: სიახლეები' })).toHaveFocus();
    const region = within(main).getByRole('region', { name: 'სიახლეები' });
    await waitFor(() =>
      expect(within(region).getByRole('status')).toHaveTextContent(/კავშირი ვერ დამყარდა/),
    );
  });

  it('ცარიელი: ყოველ სექციაში ახსნა, ბარათი არ არის', async () => {
    const { main, container } = await renderPage('/', emptyAdapter());
    await settle(main);
    for (const text of [
      'კვირის ვიდეო ჯერ არ არის არჩეული.',
      'სტატია ჯერ არ გამოქვეყნებულა. ახალი სტატიები აქ გამოჩნდება.',
      'სერია ჯერ არ გამოქვეყნებულა. ახალი თემები აქ გამოჩნდება.',
      'სხვა ვიდეო-ისტორია ჯერ არ გამოქვეყნებულა.',
      'სიახლე ჯერ არ გამოქვეყნებულა.',
    ]) {
      expect(within(main).getByText(text)).toBeInTheDocument();
    }
    expect(main.querySelectorAll('.mc-card--link')).toHaveLength(0);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('ერთი სექციის შეცდომა დანარჩენს არ აჩერებს', async () => {
    const ok = okAdapter();
    const broken = { ...ok, listNews: failingAdapter().listNews };
    const { main } = await renderPage('/', broken);
    await settle(main);
    expect(
      within(main).getByRole('button', { name: 'თავიდან ცდა: სიახლეები' }),
    ).toBeInTheDocument();
    const articles = within(main).getByRole('region', { name: 'სტატიები' });
    expect(within(articles).getAllByRole('article')).toHaveLength(3);
    await act(async () => {});
  });
});

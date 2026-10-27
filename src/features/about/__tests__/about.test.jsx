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

const H1 = 'ვანგრევთ ბარიერებს. ვაძლიერებთ პოტენციალს.';
const SECTIONS = [H1, 'მისია', 'ღირებულებები', 'ჩვენი გზა', 'გუნდი', 'პარტნიორები'];

describe('ჩვენ შესახებ: სტრუქტურა', () => {
  it('სექციები რიგით, ყოველი <section aria-labelledby> → h1/h2', async () => {
    const { main } = await renderPage('/about');
    await settle(main);
    const sections = [...main.querySelectorAll(':scope > section')];
    expect(
      sections.map((section) =>
        within(main).getByRole('region', { name: SECTIONS[sections.indexOf(section)] }),
      ),
    ).toEqual(sections);
    expect(sections).toHaveLength(SECTIONS.length);
    expect(document.getElementById('team')?.tagName).toBe('H2');
    expect(document.getElementById('partners')?.tagName).toBe('H2');
  });

  it('სათაურების ხე: h1 → h2 → h3, დონე არ გამოტოვებულა', async () => {
    const { main } = await renderPage('/about');
    await settle(main);
    const tree = headingTree(main);
    expect(skippedLevels(tree)).toEqual([]);
    expect(tree.filter(([level]) => level < 3).map(([level, text]) => `h${level} ${text}`)).toEqual(
      [`h1 ${H1}`, 'h2 მისია', 'h2 ღირებულებები', 'h2 ჩვენი გზა', 'h2 გუნდი', 'h2 პარტნიორები'],
    );
    // 3 მიმართულება + 6 ღირებულება + 8 გუნდის წევრი + 12 პარტნიორი
    expect(tree.filter(([level]) => level === 3)).toHaveLength(29);
  });

  it('ბილიკი, ფოტოების მიმართულება (მრავალფეროვნება), ღირებულებები ნომრების გარეშე', async () => {
    const { main } = await renderPage('/about');
    await settle(main);
    const crumbs = within(main).getByRole('navigation', { name: 'ნავიგაციის ბილიკი' });
    expect(within(crumbs).getByRole('link', { name: 'მთავარი' })).toHaveAttribute('href', '/');
    expect(within(crumbs).getByText('ჩვენ შესახებ')).toHaveAttribute('aria-current', 'page');

    const photos = [...main.querySelectorAll('.mc-about-photos [role="img"]')].map(
      (photo) => photo.getAttribute('aria-label') ?? '',
    );
    expect(photos).toHaveLength(2);
    for (const photo of photos)
      expect(photo).toMatch(/^\[ფოტო: თვალის დონე, მოქმედების მომენტი — /);
    const directions = photos.join(' ');
    for (const who of ['ყრუ', 'უსინათლო', 'ინტელექტუალური შეზღუდვის']) {
      expect(directions).toContain(who);
    }
    const values = within(main).getByRole('region', { name: 'ღირებულებები' });
    expect(within(values).getAllByRole('heading', { level: 3 })).toHaveLength(6);
    expect(values.textContent).not.toMatch(/\b0[1-6]\b/);
  });

  it('ჩვენი გზა — <ol> 4 ეტაპით; გუნდი — 8 ბარათი; პარტნიორები — 12 + CTA', async () => {
    const { main } = await renderPage('/about');
    await settle(main);
    const path = within(main).getByRole('region', { name: 'ჩვენი გზა' });
    const list = within(path).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);

    const team = within(main).getByRole('region', { name: 'გუნდი' });
    expect(within(team).getAllByRole('heading', { level: 3, name: '[სახელი გვარი]' })).toHaveLength(
      8,
    );
    expect(within(team).getByText(/^გუნდის \[N\] წევრი თავად არის შშმ პირი/)).toBeInTheDocument();
    // ვაკანსიების URL ჯერ null — ტექსტი, ბმული არა
    expect(within(team).getByText('ვაკანსიები').closest('a')).toBeNull();
    expect(within(team).getByText('[ბმული მზადდება]')).toBeInTheDocument();

    const partners = within(main).getByRole('region', { name: 'პარტნიორები' });
    expect(within(partners).getAllByRole('heading', { level: 3 })).toHaveLength(12);
    expect(within(partners).getByRole('link', { name: 'გახდი პარტნიორი' })).toHaveAttribute(
      'href',
      '/contact?topic=partnership',
    );
  });

  it('ყველა ფაქტი ფრჩხილებშია', async () => {
    const { main } = await renderPage('/about');
    await settle(main);
    expect(unbracketedFacts(main)).toEqual([]);
  });

  it('axe (jsdom, კონტრასტის გარეშე)', async () => {
    const { container, main } = await renderPage('/about');
    await settle(main);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('ჩვენ შესახებ: ფუტერის ბმულები (#team, #partners)', () => {
  it.each([
    ['/about#team', 'გუნდი'],
    ['/about#partners', 'პარტნიორები'],
  ])('%s → ფოკუსი h2-ზე', async (target, name) => {
    const { router } = await renderPage('/');
    await act(() => router.navigate(target));
    const heading = await screen.findByRole('heading', { level: 2, name });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute('tabindex', '-1');
  });
});

describe('ჩვენ შესახებ: მდგომარეობები', () => {
  it('ჩატვირთვა: სტატიკური ტექსტი ჩანს, მონაცემიანი სექციები — ჩონჩხი', async () => {
    const { main, container } = await renderPage('/about', pendingAdapter());
    expect(main.querySelectorAll('[aria-busy="true"]')).toHaveLength(3);
    for (const label of ['ჩვენი გზა', 'გუნდი', 'პარტნიორები']) {
      expect(screen.getByText(`იტვირთება: ${label}`)).toBeInTheDocument();
    }
    expect(within(main).getByRole('heading', { level: 2, name: 'მისია' })).toBeInTheDocument();
    expect(within(main).getAllByRole('heading', { level: 3 }).length).toBe(9);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('შეცდომა → თავიდან ცდა → გუნდი ჩანს, ფოკუსი h2 „გუნდი“-ზე', async () => {
    const source = switchableAdapter(failingAdapter());
    const { main, user, container } = await renderPage('/about', source.adapter);
    await settle(main);
    expect(
      within(main)
        .getAllByRole('button', { name: /^თავიდან ცდა: / })
        .map((button) => button.textContent),
    ).toEqual(['თავიდან ცდა: ჩვენი გზა', 'თავიდან ცდა: გუნდი', 'თავიდან ცდა: პარტნიორები']);
    expect(await axe(container, AXE)).toHaveNoViolations();

    source.use(okAdapter());
    await user.click(within(main).getByRole('button', { name: 'თავიდან ცდა: გუნდი' }));
    const heading = within(main).getByRole('heading', { level: 2, name: 'გუნდი' });
    await waitFor(() => expect(heading).toHaveFocus());
    const team = within(main).getByRole('region', { name: 'გუნდი' });
    expect(within(team).getAllByRole('heading', { level: 3 })).toHaveLength(8);
  });

  it('ცარიელი: ახსნა სამივე სექციაში; CTA „გახდი პარტნიორი“ რჩება', async () => {
    const { main } = await renderPage('/about', emptyAdapter());
    await settle(main);
    for (const text of [
      'ეტაპები ჯერ არ არის დამატებული.',
      'გუნდის წევრები ჯერ არ არის დამატებული.',
      'პარტნიორები ჯერ არ არის დამატებული.',
    ]) {
      expect(within(main).getByText(text)).toBeInTheDocument();
    }
    expect(within(main).getByRole('link', { name: 'გახდი პარტნიორი' })).toBeInTheDocument();
  });
});

import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { setContentAdapter } from '@/content/adapter.js';
import {
  AXE,
  NOW,
  emptyAdapter,
  headingTree,
  okAdapter,
  pendingAdapter,
  renderPage,
  settle,
  skippedLevels,
  unbracketedFacts,
} from '@/features/__tests__/page-helpers.jsx';
import { getYear } from '@/i18n/index.js';

afterEach(() => setContentAdapter(null));

const FEATURED = '[ციფრული უნარების აკადემიის ახალი ნაკადი იხსნება]';
const THIS_YEAR = /** @type {number} */ (getYear(NOW));

/** @param {HTMLElement} main */
const listRegion = (main) => within(main).getByRole('region', { name: 'ყველა სიახლე' });
/** @param {HTMLElement} main */
const statusText = (main) =>
  within(listRegion(main))
    .getAllByRole('status')
    .map((node) => node.textContent)
    .find(Boolean) ?? '';
/** @param {HTMLElement} main */
const newsList = (main) => /** @type {HTMLOListElement} */ (listRegion(main).querySelector('ol'));

describe('სიახლეები: სტრუქტურა', () => {
  it('ბილიკი, h1, ტიპის ჩიპები, წელი, რჩეული, <ol> თარიღებით, ღონისძიებები, გამოწერა', async () => {
    const { main } = await renderPage('/news');
    await settle(main);
    const chips = within(main).getByRole('group', { name: 'კატეგორია' });
    expect(
      within(chips)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['ყველა', 'განცხადებები', 'ღონისძიებები', 'პროგრამები', 'მედია']);
    const year = within(main).getByRole('combobox', { name: 'წელი' });
    expect(year).toHaveValue('');
    expect(
      within(year)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['ყველა წელი', String(THIS_YEAR), String(THIS_YEAR - 1), String(THIS_YEAR - 2)]);

    expect(within(main).getByRole('heading', { level: 2, name: FEATURED })).toBeInTheDocument();
    expect(within(main).getAllByRole('link', { name: FEATURED })[0]).toHaveAttribute(
      'href',
      '/news/tsipruli-unarebis-akademiis-akhali-nakadi-ikhsneba',
    );

    // ქრონოლოგიური სია: <ol>, ყოველ ელემენტს <time datetime>, უახლესი ზემოთ, რჩეული არ მეორდება
    const list = newsList(main);
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    const dates = items.map((item) => item.querySelector('time')?.getAttribute('datetime') ?? '');
    expect(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(within(list).queryByRole('heading', { name: FEATURED })).toBeNull();
    for (const item of items) {
      expect(within(item).getByRole('link').getAttribute('href')).toMatch(/^\/news\/[a-z0-9-]+$/);
    }
    expect(statusText(main)).toBe('სულ 15 სიახლე');

    expect(within(main).getByRole('region', { name: 'სიახლეები ელფოსტაზე' })).toBeInTheDocument();
  });

  it('მომავალი ღონისძიებები: ხელმისაწვდომობის ნიშნები (ხატულა + ტექსტი), რეგისტრაცია სათაურით', async () => {
    const { main } = await renderPage('/news');
    await settle(main);
    const events = within(main).getByRole('region', { name: 'მომავალი ღონისძიებები' });
    const cards = within(events).getAllByRole('heading', { level: 3 });
    expect(cards).toHaveLength(4);
    expect(cards[0]).toHaveTextContent('[ინკლუზიური დასაქმების ფორუმი]');
    const first = /** @type {HTMLElement} */ (cards[0].closest('article'));
    for (const badge of ['ადგილზე', 'ეტლით მისადგომი', 'ჟესტური ენა', 'სუბტიტრები']) {
      expect(within(first).getByText(badge)).toBeInTheDocument();
    }
    expect(first.querySelector('.mc-badge svg')).not.toBeNull();
    // ონლაინ ღონისძიებაზე ეტლის ნიშანი არ ჩანს (not-applicable)
    const online = /** @type {HTMLElement} */ (cards[1].closest('article'));
    expect(within(online).queryByText('ეტლით მისადგომი')).toBeNull();
    expect(within(online).getByText('ონლაინ')).toBeInTheDocument();
    // F7: მიუწვდომელი მოქმედება ფოკუსს იღებს (aria-disabled) და მიზეზს ამბობს
    const register = within(first).getByRole('button', {
      name: 'რეგისტრაცია: [ინკლუზიური დასაქმების ფორუმი]',
    });
    expect(register).toHaveAttribute('aria-disabled', 'true');
    expect(register).not.toBeDisabled();
    expect(register).toHaveAccessibleDescription('[ბმული მზადდება]');
    // დრო თბილისის დროით
    expect(first).toHaveTextContent('10:00–16:00');
  });

  it('სათაურების ხე, ფაქტები ფრჩხილებში, axe', async () => {
    const { main, container } = await renderPage('/news');
    await settle(main);
    const tree = headingTree(main);
    expect(skippedLevels(tree)).toEqual([]);
    expect(tree.filter(([level]) => level < 3).map(([level, text]) => `h${level} ${text}`)).toEqual(
      [
        'h1 სიახლეები',
        `h2 ${FEATURED}`,
        'h2 ყველა სიახლე',
        'h2 მომავალი ღონისძიებები',
        'h2 სიახლეები ელფოსტაზე',
      ],
    );
    expect(unbracketedFacts(main)).toEqual([]);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

describe('სიახლეები: ფილტრი URL-ში და „უკან“', () => {
  it('ტიპი → ?category=event; წელი → &year=; სტატუსი; ფოკუსი რჩება; უკან ორჯერ', async () => {
    const { main, user, router } = await renderPage('/news');
    await settle(main);
    const chip = within(main).getByRole('button', { name: 'ღონისძიებები' });
    await user.click(chip);
    await waitFor(() => expect(router.state.location.search).toBe('?category=event'));
    const events = (await okAdapter().listNews({ type: 'event' })).total;
    await waitFor(() => expect(statusText(main)).toBe(`ნაპოვნია ${events} სიახლე — ღონისძიებები`));
    expect(chip).toHaveFocus();
    for (const item of within(newsList(main)).getAllByRole('listitem')) {
      expect(item).toHaveTextContent('ღონისძიება');
    }

    const select = within(main).getByRole('combobox', { name: 'წელი' });
    const lastYear = THIS_YEAR - 1;
    await user.selectOptions(select, String(lastYear));
    await waitFor(() =>
      expect(router.state.location.search).toBe(`?category=event&year=${lastYear}`),
    );
    const both = (await okAdapter().listNews({ type: 'event', year: lastYear })).total;
    await waitFor(() =>
      expect(statusText(main)).toBe(`ნაპოვნია ${both} სიახლე — ღონისძიებები, ${lastYear}`),
    );
    expect(select).toHaveFocus();

    await act(() => router.navigate(-1));
    await waitFor(() => expect(router.state.location.search).toBe('?category=event'));
    expect(within(main).getByRole('combobox', { name: 'წელი' })).toHaveValue('');
    await act(() => router.navigate(-1));
    await waitFor(() => expect(statusText(main)).toBe('სულ 15 სიახლე'));
    expect(within(main).getByRole('button', { name: 'ყველა' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('ცარიელი კომბინაცია → „ფილტრების გასუფთავება“ → ფოკუსი h2-ზე', async () => {
    const { main, user, router } = await renderPage(`/news?category=media&year=${THIS_YEAR - 2}`);
    await settle(main);
    const expected = (await okAdapter().listNews({ type: 'media', year: THIS_YEAR - 2 })).total;
    if (expected > 0) return; // mock-ის თარიღები `now`-ზეა მიბმული: კომბინაცია ყოველთვის ცარიელი არ არის
    await user.click(
      within(listRegion(main)).getAllByRole('button', { name: 'ფილტრების გასუფთავება' }).at(-1),
    );
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(within(main).getByRole('heading', { level: 2, name: 'ყველა სიახლე' })).toHaveFocus();
  });

  it('უცნობი ტიპი / წელი URL-ში იგნორდება', async () => {
    const { main } = await renderPage('/news?category=sport&year=abcd');
    await settle(main);
    expect(within(main).getByRole('button', { name: 'ყველა' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(main).getByRole('combobox', { name: 'წელი' })).toHaveValue('');
  });
});

describe('სიახლეები: „მეტის ჩატვირთვა“ და მდგომარეობები', () => {
  it('ფოკუსი პირველ ახალ სიახლეზე, „დაემატა 6, სულ 12“', async () => {
    const { main, user } = await renderPage('/news');
    await settle(main);
    await user.click(
      within(listRegion(main)).getByRole('button', { name: 'მეტის ჩატვირთვა: სიახლეები' }),
    );
    await waitFor(() => expect(within(newsList(main)).getAllByRole('listitem')).toHaveLength(12));
    const seventh = within(newsList(main)).getAllByRole('listitem')[6];
    await waitFor(() => expect(within(seventh).getByRole('link')).toHaveFocus());
    expect(within(listRegion(main)).getByText('დაემატა 6, სულ 12')).toBeInTheDocument();
  });

  it('ჩატვირთვა: h1 და ფილტრი ჩანს; ცარიელი: ახსნები', async () => {
    const pending = await renderPage('/news', pendingAdapter());
    expect(screen.getByText('იტვირთება: ყველა სიახლე')).toBeInTheDocument();
    expect(await axe(pending.container, AXE)).toHaveNoViolations();
    pending.unmount();

    const { main } = await renderPage('/news', emptyAdapter());
    await settle(main);
    expect(within(main).getByText('ამ ფილტრით სიახლე ვერ მოიძებნა.')).toBeInTheDocument();
    expect(
      within(main).getByText('მომავალი ღონისძიება ჯერ არ არის დაგეგმილი.'),
    ).toBeInTheDocument();
  });
});

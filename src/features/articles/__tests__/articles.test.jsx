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

const FEATURED = '[ზრდის აზროვნება: რატომ არის „ჯერ“ ყველაზე ძლიერი სიტყვა]';

/** @param {HTMLElement} main */
const listRegion = (main) => within(main).getByRole('region', { name: 'ყველა სტატია' });
/** @param {HTMLElement} main */
const statusText = (main) =>
  within(listRegion(main))
    .getAllByRole('status')
    .map((node) => node.textContent)
    .find(Boolean) ?? '';
/** @param {HTMLElement} region */
const cards = (region) => /** @type {HTMLElement} */ (region.querySelector('ul.mc-grid'));

describe('სტატიები: სტრუქტურა', () => {
  it('ბილიკი, h1, ძიება (<search>), ჩიპები, დალაგება, რჩეული, 6 ბარათი, გამოწერა', async () => {
    const { main } = await renderPage('/articles');
    await settle(main);
    const crumbs = within(main).getByRole('navigation', { name: 'ნავიგაციის ბილიკი' });
    expect(within(crumbs).getByText('სტატიები')).toHaveAttribute('aria-current', 'page');

    const search = within(main).getByRole('search', { name: 'სტატიების ძიება' });
    expect(search.tagName).toBe('SEARCH');
    expect(within(search).getByLabelText('ძიება სტატიებში')).toHaveAttribute('type', 'search');

    const chips = within(main).getByRole('group', { name: 'კატეგორია' });
    expect(
      within(chips)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['ყველა', 'პიროვნული ზრდა', 'კარიერა', 'უფლებები', 'ხელმისაწვდომობა', 'ისტორიები']);
    expect(within(chips).getByRole('button', { name: 'ყველა' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(main).getByRole('combobox', { name: 'დალაგება' })).toHaveValue('newest');

    // რჩეული — h2, სიაში არ მეორდება
    expect(within(main).getByRole('heading', { level: 2, name: FEATURED })).toBeInTheDocument();
    const region = listRegion(main);
    expect(within(cards(region)).getAllByRole('listitem')).toHaveLength(6);
    expect(within(region).queryByRole('heading', { name: FEATURED })).toBeNull();
    // 13 + რჩეული
    expect(statusText(main)).toBe('სულ 14 სტატია');
    expect(within(region).getByText('ნაჩვენებია 6 / 13')).toBeInTheDocument();
    expect(
      within(main).getByRole('region', { name: 'ახალი სტატიები — ელფოსტაზე' }),
    ).toBeInTheDocument();
  });

  it('სათაურების ხე, ყველა ფაქტი ფრჩხილებშია, axe', async () => {
    const { main, container } = await renderPage('/articles');
    await settle(main);
    const tree = headingTree(main);
    expect(skippedLevels(tree)).toEqual([]);
    expect(tree.filter(([level]) => level < 3).map(([level, text]) => `h${level} ${text}`)).toEqual(
      ['h1 სტატიები', `h2 ${FEATURED}`, 'h2 ყველა სტატია', 'h2 ახალი სტატიები — ელფოსტაზე'],
    );
    expect(unbracketedFacts(main)).toEqual([]);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('რჩეულის „მოუსმინე“ სტატიის მოსმენის ღილაკზე მიდის (#listen)', async () => {
    const { main } = await renderPage('/articles');
    await settle(main);
    const listen = within(main).getByRole('link', { name: `მოუსმინე: ${FEATURED}` });
    expect(listen.getAttribute('href')).toMatch(/^\/articles\/[a-z0-9-]+#listen$/);
  });
});

describe('სტატიები: ფილტრი URL-ში და „უკან“', () => {
  it('ჩიპი → ?category=, სტატუსი ცხადდება ფოკუსის გადატანის გარეშე; უკან → წინა ფილტრი', async () => {
    const { main, user, router } = await renderPage('/articles');
    await settle(main);
    const chip = within(main).getByRole('button', { name: 'კარიერა' });
    await user.click(chip);

    await waitFor(() => expect(router.state.location.search).toBe('?category=career'));
    await waitFor(() => expect(statusText(main)).toBe('ნაპოვნია 3 სტატია — კარიერა'));
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveFocus(); // ფოკუსი არ გადავიდა
    // ფილტრისას რჩეული ბლოკი არ ჩანს; სათაური და დოკუმენტის სათაური უცვლელია
    expect(within(main).queryByRole('heading', { level: 2, name: FEATURED })).toBeNull();
    expect(document.title).toBe('სტატიები — მეტი ჩართულობა');
    const region = listRegion(main);
    expect(within(cards(region)).getAllByRole('listitem')).toHaveLength(3);
    for (const item of within(cards(region)).getAllByRole('listitem')) {
      expect(item).toHaveTextContent('კარიერა');
    }

    await act(() => router.navigate(-1));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(() => expect(statusText(main)).toBe('სულ 14 სტატია'));
    expect(within(main).getByRole('button', { name: 'ყველა' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(main).getByRole('heading', { level: 2, name: FEATURED })).toBeInTheDocument();
  });

  it('URL-იდან ჩატვირთვა: ?category=rights&sort=shortest — ჩიპი და დალაგება არჩეულია', async () => {
    const { main } = await renderPage('/articles?category=rights&sort=shortest');
    await settle(main);
    expect(within(main).getByRole('button', { name: 'უფლებები' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(main).getByRole('combobox', { name: 'დალაგება' })).toHaveValue('shortest');
    await waitFor(() => expect(statusText(main)).toBe('ნაპოვნია 2 სტატია — უფლებები, მოკლე'));
  });

  it('დალაგება → ?sort=shortest (push), უკან → უახლესი', async () => {
    const { main, user, router } = await renderPage('/articles');
    await settle(main);
    await user.selectOptions(within(main).getByRole('combobox', { name: 'დალაგება' }), 'shortest');
    await waitFor(() => expect(router.state.location.search).toBe('?sort=shortest'));
    await act(() => router.navigate(-1));
    await waitFor(() =>
      expect(within(main).getByRole('combobox', { name: 'დალაგება' })).toHaveValue('newest'),
    );
  });

  it('ძიება: 300ms debounce → ?q= (replace); Enter — მყისიერად; შედეგი = adapter-ის total', async () => {
    const expected = (await okAdapter().listArticles({ q: 'გასაუბრება', featured: undefined }))
      .total;
    const { main, user, router } = await renderPage('/articles');
    await settle(main);
    const field = within(main).getByLabelText('ძიება სტატიებში');
    await user.type(field, 'გასაუბრება');
    await waitFor(() => expect(router.state.location.search).toBe(`?q=${encodeURI('გასაუბრება')}`));
    await waitFor(() =>
      expect(statusText(main)).toBe(`ნაპოვნია ${expected} სტატია — „გასაუბრება“`),
    );
    expect(field).toHaveFocus();
    // replace: „უკან“ ძიების ყოველ ასოზე არ ბრუნდება — ისტორიაში ერთი ჩანაწერია
    expect(router.state.historyAction).toBe('REPLACE');

    await user.clear(field);
    await user.type(field, 'CV{Enter}');
    await waitFor(() => expect(router.state.location.search).toBe('?q=CV'));
  });

  it('ცარიელი შედეგი → ახსნა + „ფილტრების გასუფთავება“ → სია ბრუნდება, ფოკუსი h2-ზე', async () => {
    const { main, user, router } = await renderPage('/articles?q=zzzqqq');
    await settle(main);
    const region = listRegion(main);
    expect(
      within(region).getByText(
        'ამ ფილტრით სტატია ვერ მოიძებნა. სცადე სხვა კატეგორია ან საძიებო სიტყვა.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(statusText(main)).toBe('ნაპოვნია 0 სტატია — „zzzqqq“'));
    const resets = within(region).getAllByRole('button', { name: 'ფილტრების გასუფთავება' });
    await user.click(resets.at(-1));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    const heading = within(main).getByRole('heading', { level: 2, name: 'ყველა სტატია' });
    expect(heading).toHaveFocus();
    await waitFor(() => expect(within(cards(region)).getAllByRole('listitem')).toHaveLength(6));
    expect(within(main).getByLabelText('ძიება სტატიებში')).toHaveValue('');
  });
});

describe('სტატიები: „მეტის ჩატვირთვა“', () => {
  it('ფოკუსი პირველ ახალ ბარათზე, სტატუსი „დაემატა 6, სულ 12“; ბოლოს — „ყველა ნაჩვენებია“', async () => {
    const { main, user } = await renderPage('/articles');
    await settle(main);
    const region = listRegion(main);
    await user.click(within(region).getByRole('button', { name: 'მეტის ჩატვირთვა: სტატიები' }));

    await waitFor(() => expect(within(cards(region)).getAllByRole('listitem')).toHaveLength(12));
    const seventh = within(cards(region)).getAllByRole('listitem')[6];
    await waitFor(() => expect(within(seventh).getAllByRole('link')[0]).toHaveFocus());
    expect(within(region).getByText('დაემატა 6, სულ 12')).toHaveAttribute('role', 'status');
    expect(within(region).getByText('ნაჩვენებია 12 / 13')).toBeInTheDocument();

    await user.click(within(region).getByRole('button', { name: 'მეტის ჩატვირთვა: სტატიები' }));
    await waitFor(() => expect(within(cards(region)).getAllByRole('listitem')).toHaveLength(13));
    const last = within(cards(region)).getAllByRole('listitem')[12];
    await waitFor(() => expect(within(last).getAllByRole('link')[0]).toHaveFocus());
    expect(within(region).getByText('დაემატა 1, სულ 13')).toBeInTheDocument();
    expect(within(region).queryByRole('button', { name: /^მეტის ჩატვირთვა/ })).toBeNull();
    expect(within(region).getByText('ყველა ნაჩვენებია')).toBeInTheDocument();
  });

  it('„მეტის“ შეცდომა სიას არ შლის: შეტყობინება + თავიდან ცდა იგივე ღილაკით', async () => {
    const source = switchableAdapter(okAdapter());
    const { main, user } = await renderPage('/articles', source.adapter);
    await settle(main);
    const region = listRegion(main);
    source.use(failingAdapter());
    await user.click(within(region).getByRole('button', { name: 'მეტის ჩატვირთვა: სტატიები' }));
    const alert = await within(region).findByRole('alert');
    expect(alert).toHaveTextContent('კავშირი ვერ დამყარდა');
    expect(within(cards(region)).getAllByRole('listitem')).toHaveLength(6);

    source.use(okAdapter());
    await user.click(within(region).getByRole('button', { name: 'მეტის ჩატვირთვა: სტატიები' }));
    await waitFor(() => expect(within(cards(region)).getAllByRole('listitem')).toHaveLength(12));
  });
});

describe('სტატიები: მდგომარეობები', () => {
  it('ჩატვირთვა: h1 და ძიება ჩანს, სიები — ჩონჩხი', async () => {
    const { main, container } = await renderPage('/articles', pendingAdapter());
    expect(within(main).getByRole('heading', { level: 1, name: 'სტატიები' })).toBeInTheDocument();
    expect(within(main).getByRole('search')).toBeInTheDocument();
    expect(screen.getByText('იტვირთება: ყველა სტატია')).toBeInTheDocument();
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('შეცდომა → თავიდან ცდა → სია ჩანს', async () => {
    const source = switchableAdapter(failingAdapter());
    const { main, user } = await renderPage('/articles', source.adapter);
    await settle(main);
    source.use(okAdapter());
    await user.click(within(main).getByRole('button', { name: 'თავიდან ცდა: ყველა სტატია' }));
    const region = listRegion(main);
    await waitFor(() => expect(within(cards(region)).getAllByRole('listitem')).toHaveLength(6));
  });

  it('ცარიელი (სტატია ჯერ არ არის): ახსნა, გასუფთავების ღილაკის გარეშე; რჩეული არ ჩანს', async () => {
    const { main } = await renderPage('/articles', emptyAdapter());
    await settle(main);
    const region = listRegion(main);
    expect(within(region).getByText(/^ამ ფილტრით სტატია ვერ მოიძებნა/)).toBeInTheDocument();
    expect(within(region).queryByRole('button', { name: 'ფილტრების გასუფთავება' })).toBeNull();
    expect(within(main).queryByText('რჩეული სტატია')).toBeNull();
  });
});

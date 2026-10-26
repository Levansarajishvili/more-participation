import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ARTICLE_CATEGORIES, ARTICLE_SORTS } from '@/content/taxonomy.js';

import { useUrlFilters } from './useUrlFilters.js';

/** @type {import('./useUrlFilters.js').UrlFilters} */
let filters;

function Probe() {
  const value = useUrlFilters({ categories: ARTICLE_CATEGORIES, sorts: ARTICLE_SORTS });
  useEffect(() => {
    filters = value;
  });
  return null;
}

/**
 * @param {string} url
 */
function setup(url) {
  const router = createMemoryRouter([{ path: '/articles', Component: Probe }], {
    initialEntries: [url],
  });
  render(<RouterProvider router={router} />);
  const search = () => new URLSearchParams(router.state.location.search);
  return { router, search };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useUrlFilters', () => {
  it('URL-იდან კითხულობს და არასწორ მნიშვნელობას null-ად აქცევს', () => {
    setup(
      '/articles?category=career&q=%20%20ჩვევა%20%20&year=2025&series=chveva-5-nabiji&sort=shortest',
    );
    expect(filters).toMatchObject({
      category: 'career',
      q: 'ჩვევა',
      query: 'ჩვევა',
      year: 2025,
      series: 'chveva-5-nabiji',
      sort: 'shortest',
      active: true,
    });

    setup('/articles?category=sport&year=25&series=Bad%20Slug&sort=popular');
    expect(filters).toMatchObject({
      category: null,
      year: null,
      series: null,
      sort: null,
      q: '',
      active: false,
    });
  });

  it('ჩიპი მყისიერად იწერება (push) და სხვა პარამეტრს ინარჩუნებს; „უკან“ წინა ფილტრს აბრუნებს', async () => {
    const { router, search } = setup('/articles?q=abc&utm=x');
    await act(async () => filters.setCategory('rights'));
    expect(search().get('category')).toBe('rights');
    expect(search().get('q')).toBe('abc');
    expect(search().get('utm')).toBe('x');
    expect(filters.category).toBe('rights');

    await act(async () => filters.setCategory(null));
    expect(search().has('category')).toBe(false);

    await act(async () => router.navigate(-1));
    expect(filters.category).toBe('rights');
  });

  it('ძიება: 300ms debounce, replace (ისტორია არ ივსება), აკრეფისას ჰარი არ იშლება', async () => {
    vi.useFakeTimers();
    const { router, search } = setup('/articles');
    const historyBefore = router.state.historyAction;

    act(() => filters.setQuery('ჩვევა '));
    expect(filters.query).toBe('ჩვევა ');
    expect(filters.q).toBe('');

    await act(async () => vi.advanceTimersByTime(299));
    expect(search().has('q')).toBe(false);

    await act(async () => vi.advanceTimersByTime(1));
    expect(search().get('q')).toBe('ჩვევა');
    expect(filters.q).toBe('ჩვევა');
    expect(filters.query).toBe('ჩვევა ');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(historyBefore).toBe('POP');

    act(() => filters.setQuery('ჩვევა და'));
    await act(async () => vi.advanceTimersByTime(150));
    act(() => filters.setQuery('ჩვევა და მოტ'));
    await act(async () => vi.advanceTimersByTime(299));
    expect(search().get('q')).toBe('ჩვევა');
    await act(async () => vi.advanceTimersByTime(1));
    expect(search().get('q')).toBe('ჩვევა და მოტ');
  });

  it('submitQuery დაუყოვნებლივ წერს; reset ყველა ფილტრს შლის', async () => {
    vi.useFakeTimers();
    const { search } = setup('/articles?category=career&year=2025&utm=x');
    act(() => filters.setQuery('  გასაუბრება '));
    await act(async () => filters.submitQuery());
    expect(search().get('q')).toBe('გასაუბრება');

    await act(async () => filters.reset());
    expect(search().toString()).toBe('utm=x');
    expect(filters).toMatchObject({ category: null, q: '', query: '', year: null, active: false });
    await act(async () => vi.advanceTimersByTime(1000));
    expect(search().has('q')).toBe(false);
  });

  it('URL-ის გარე ცვლილება (უკან) ველის მნიშვნელობას განაახლებს და მომლოდინე ჩაწერას აუქმებს', async () => {
    vi.useFakeTimers();
    const { router, search } = setup('/articles?q=ერთი');
    await act(async () => router.navigate('/articles?q=ორი'));
    expect(filters.query).toBe('ორი');

    act(() => filters.setQuery('სამი'));
    await act(async () => router.navigate(-1));
    expect(filters.query).toBe('ერთი');
    await act(async () => vi.advanceTimersByTime(1000));
    expect(search().get('q')).toBe('ერთი');
  });

  it('setYear და setSeries', async () => {
    const { search } = setup('/articles');
    await act(async () => filters.setYear(2025));
    await act(async () => filters.setSeries('msoplkhedva'));
    expect(search().get('year')).toBe('2025');
    expect(filters).toMatchObject({ year: 2025, series: 'msoplkhedva' });
    await act(async () => filters.setYear(null));
    expect(search().has('year')).toBe(false);
  });
});

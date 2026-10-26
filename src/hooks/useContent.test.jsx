import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ContentError } from '@/content/errors.js';
import { createMockAdapter } from '@/content/mock/index.js';

import { useContent } from './useContent.js';
import { useLoadMore } from './useLoadMore.js';

const NOW = Date.parse('2026-10-26T12:00:00+04:00');

/**
 * ხელით მართული Promise: პასუხის თანმიმდევრობის შესამოწმებლად.
 * @template T
 */
function deferred() {
  /** @type {(value: T) => void} */
  let resolve = () => {};
  /** @type {(error: unknown) => void} */
  let reject = () => {};
  /** @type {Promise<T>} */
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useContent', () => {
  it('loading → success; reload ხელახლა ტვირთავს', async () => {
    const fn = vi.fn(() => Promise.resolve('მონაცემი'));
    const { result } = renderHook(() => useContent(() => fn(), []));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe('მონაცემი');
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => result.current.reload());
    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBe('მონაცემი');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('enabled: false → idle, მოთხოვნა არ იგზავნება; ჩართვისას იტვირთება', async () => {
    const fn = vi.fn(() => Promise.resolve(1));
    const { result, rerender } = renderHook(
      ({ enabled }) => useContent(() => fn(), [], { enabled }),
      { initialProps: { enabled: false } },
    );
    expect(result.current).toMatchObject({ status: 'idle', data: undefined, error: null });
    expect(fn).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 1 }));
  });

  it('შეცდომა ნორმალიზდება ContentError-ად', async () => {
    const { result } = renderHook(() =>
      useContent(() => Promise.reject(new TypeError('Failed to fetch')), []),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(ContentError);
    expect(result.current.error?.code).toBe('network');
  });

  it('deps-ის შეცვლისას ძველი, დაგვიანებული პასუხი იგნორდება', async () => {
    /** @type {Record<string, ReturnType<typeof deferred<string>>>} */
    const pending = { a: deferred(), b: deferred() };
    const { result, rerender } = renderHook(
      ({ slug }) => useContent(() => pending[slug].promise, [slug]),
      {
        initialProps: { slug: 'a' },
      },
    );
    rerender({ slug: 'b' });
    await act(async () => pending.b.resolve('ბ'));
    await act(async () => pending.a.resolve('ა'));
    expect(result.current).toMatchObject({ status: 'success', data: 'ბ' });
  });
});

describe('useLoadMore', () => {
  const adapter = createMockAdapter({ now: () => NOW });

  it('პირველი გვერდი → loadMore → ბოლომდე; firstNewIndex ახალ ბარათზე', async () => {
    const { result } = renderHook(() =>
      useLoadMore((cursor) => adapter.listArticles({ cursor, limit: 6 }), []),
    );
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.items).toHaveLength(6);
    expect(result.current).toMatchObject({ total: 14, hasMore: true, firstNewIndex: -1 });

    act(() => result.current.loadMore());
    expect(result.current.status).toBe('loading-more');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.items).toHaveLength(12);
    expect(result.current.firstNewIndex).toBe(6);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(14));
    expect(result.current).toMatchObject({ hasMore: false, firstNewIndex: 12 });
    expect(new Set(result.current.items.map((a) => a.slug)).size).toBe(14);
  });

  it('enabled: false → idle, loadMore არაფერს აკეთებს', () => {
    const fetchPage = vi.fn(() => adapter.listArticles());
    const { result } = renderHook(() => useLoadMore(() => fetchPage(), [], { enabled: false }));
    act(() => result.current.loadMore());
    expect(result.current).toMatchObject({ status: 'idle', items: [], hasMore: false });
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('ფილტრის შეცვლა სიას თავიდან იწყებს; meta (years) ხელმისაწვდომია', async () => {
    const { result, rerender } = renderHook(
      ({ type }) => useLoadMore((cursor) => adapter.listNews({ type, cursor }), [type]),
      { initialProps: { type: /** @type {'event' | null} */ (null) } },
    );
    await waitFor(() => expect(result.current.status).toBe('success'));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(12));
    expect(result.current.meta?.years.length).toBeGreaterThanOrEqual(2);

    rerender({ type: 'event' });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.items.every((n) => n.type === 'event')).toBe(true);
    expect(result.current.firstNewIndex).toBe(-1);
  });

  it('„მეტის“ შეცდომისას სია რჩება, ხელახლა ცდა მუშაობს', async () => {
    let failNext = false;
    const { result } = renderHook(() =>
      useLoadMore((cursor) => {
        if (cursor && failNext) {
          failNext = false;
          return Promise.reject(new ContentError('server'));
        }
        return adapter.listArticles({ cursor });
      }, []),
    );
    await waitFor(() => expect(result.current.status).toBe('success'));
    failNext = true;
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.items).toHaveLength(6);
    expect(result.current.error?.code).toBe('server');
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(12));
    expect(result.current.error).toBeNull();
  });

  it('ფილტრის შეცვლის შემდეგ ძველი „მეტის“ პასუხი იგნორდება', async () => {
    /** @type {ReturnType<typeof deferred<import('@/content/model.js').Page<string>>>} */
    const slowMore = deferred();
    const { result, rerender } = renderHook(
      ({ key }) =>
        useLoadMore(
          (cursor) =>
            cursor
              ? slowMore.promise
              : Promise.resolve({ items: [`${key}-1`], nextCursor: '1', total: 2 }),
          [key],
        ),
      { initialProps: { key: 'a' } },
    );
    await waitFor(() => expect(result.current.items).toEqual(['a-1']));
    act(() => result.current.loadMore());
    rerender({ key: 'b' });
    await waitFor(() => expect(result.current.items).toEqual(['b-1']));
    await act(async () => slowMore.resolve({ items: ['a-2'], nextCursor: null, total: 2 }));
    expect(result.current.items).toEqual(['b-1']);
  });
});

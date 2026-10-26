import { useCallback, useEffect, useRef, useState } from 'react';

import { normalizeError } from '@/content/errors.js';

import { sameDeps } from './useContent.js';

/** @typedef {import('@/content/errors.js').ContentError} ContentError */
/** @typedef {'idle' | 'loading' | 'loading-more' | 'success' | 'error'} LoadMoreStatus */

/**
 * @template T
 * @typedef {{ items: T[], nextCursor: string | null, total: number }} PageLike
 */

/**
 * @template T
 * @template {PageLike<T>} P
 * @typedef {object} LoadMoreState
 * @property {T[]} items                   ყველა ჩატვირთული გვერდი ერთად; ფილტრის შეცვლისას ახალი
 *                                         პასუხის მოსვლამდე წინა სია რჩება (status `loading`)
 * @property {number} total
 * @property {LoadMoreStatus} status       `loading` — პირველი გვერდი, `loading-more` — შემდეგი
 * @property {ContentError | null} error   „მეტის“ შეცდომისას items რჩება, loadMore ხელახლა ცდის
 * @property {boolean} hasMore
 * @property {() => void} loadMore
 * @property {() => void} reload           პირველი გვერდიდან
 * @property {number} firstNewIndex        ბოლოს დამატებული გვერდის პირველი ელემენტი — ფოკუსი
 *                                         აქ გადადის (ContentKit); -1, თუ „მეტი“ ჯერ არ დაჭერილა
 * @property {Omit<P, 'items'> | null} meta ბოლო პასუხი items-ის გარეშე (მაგ. `years` სიახლეებში)
 */

/**
 * „მეტის ჩატვირთვა“ cursor-ით. `deps`-ის შეცვლისას (ფილტრი, ძიება) სია თავიდან იწყება.
 *
 * @example
 * const list = useLoadMore((cursor) => listArticles({ category, q, cursor }), [category, q]);
 *
 * @template T
 * @template {PageLike<T>} [P=PageLike<T>]
 * @param {(cursor: string | null) => Promise<P>} fetchPage
 * @param {import('react').DependencyList} [deps=[]]
 * @param {{ enabled?: boolean }} [options]  `enabled: false` → `idle`
 * @returns {LoadMoreState<T, P>}
 */
export function useLoadMore(fetchPage, deps = [], { enabled = true } = {}) {
  const [token, setToken] = useState(0);
  const key = [enabled, token, ...deps];

  const [state, setState] = useState(
    /**
     * @type {{ key: unknown[] | null, items: T[], meta: Omit<P, 'items'> | null,
     *   error: ContentError | null, more: boolean, firstNewIndex: number }}
     */ ({ key: null, items: [], meta: null, error: null, more: false, firstNewIndex: -1 }),
  );

  // თაობა: ყოველი ახალი პირველი გვერდი ზრდის; ძველი თაობის პასუხი (მათ შორის „მეტი“) იგნორდება
  const generation = useRef(0);
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  useEffect(
    () => {
      const gen = ++generation.current;
      if (!enabled) return;
      const requestKey = key;
      Promise.resolve()
        .then(() => fetchPage(null))
        .then(
          (page) => {
            if (gen !== generation.current) return;
            const { items, ...meta } = page;
            setState({ key: requestKey, items, meta, error: null, more: false, firstNewIndex: -1 });
          },
          (error) => {
            if (gen !== generation.current) return;
            setState({
              key: requestKey,
              items: [],
              meta: null,
              error: normalizeError(error),
              more: false,
              firstNewIndex: -1,
            });
          },
        );
    },
    // deps გამომძახებლისაა; fetchPage ყოველ რენდერზე ახალია და შეგნებულად არ შედის
    // eslint-disable-next-line react-hooks/exhaustive-deps
    key,
  );

  const settled = enabled && sameDeps(state.key, key);
  const nextCursor = settled ? (state.meta?.nextCursor ?? null) : null;
  const busy = state.more;

  const loadMore = useCallback(() => {
    const fetchFn = fetchRef.current;
    if (!nextCursor || busy) return;
    const gen = generation.current;
    setState((s) => ({ ...s, more: true, error: null }));
    Promise.resolve()
      .then(() => fetchFn(nextCursor))
      .then(
        (page) => {
          if (gen !== generation.current) return;
          const { items, ...meta } = page;
          setState((s) => ({
            ...s,
            items: [...s.items, ...items],
            meta,
            more: false,
            firstNewIndex: s.items.length,
          }));
        },
        (error) => {
          if (gen !== generation.current) return;
          setState((s) => ({ ...s, more: false, error: normalizeError(error) }));
        },
      );
  }, [nextCursor, busy]);

  const reload = useCallback(() => setToken((n) => n + 1), []);

  if (!enabled) {
    return {
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      hasMore: false,
      loadMore,
      reload,
      firstNewIndex: -1,
      meta: null,
    };
  }

  /** @type {LoadMoreStatus} */
  let status = 'success';
  if (!settled) status = 'loading';
  else if (state.more) status = 'loading-more';
  else if (state.error) status = 'error';

  return {
    items: state.items,
    total: state.meta?.total ?? 0,
    status,
    error: settled ? state.error : null,
    hasMore: nextCursor !== null,
    loadMore,
    reload,
    firstNewIndex: settled ? state.firstNewIndex : -1,
    meta: state.meta,
  };
}

import { useCallback, useEffect, useState } from 'react';

import { normalizeError } from '@/content/errors.js';

/** @typedef {import('@/content/errors.js').ContentError} ContentError */
/** @typedef {'idle' | 'loading' | 'success' | 'error'} ContentStatus */

/**
 * @template T
 * @typedef {object} ContentState
 * @property {T | undefined} data       ჩატვირთვისას წინა შედეგი რჩება (ფილტრის შეცვლისას სია არ ქრება)
 * @property {ContentStatus} status     `idle` — `enabled: false` (მოთხოვნა გათიშულია)
 * @property {ContentError | null} error
 * @property {() => void} reload
 */

/**
 * @param {readonly unknown[] | null} a
 * @param {readonly unknown[]} b
 * @returns {boolean}
 */
export function sameDeps(a, b) {
  return a !== null && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
}

/**
 * adapter-ის ერთი მოთხოვნა. `deps`-ის შეცვლისას თავიდან იტვირთება (useEffect-ის მსგავსად;
 * ESLint `exhaustive-deps` ამ hook-საც ამოწმებს). ძველი მოთხოვნის პასუხი იგნორდება.
 *
 * @example
 * const { data, status, error, reload } = useContent(() => getArticle(slug), [slug]);
 * // პირობითი მოთხოვნა: fn ყოველთვის inline რჩება, რომ ESLint-მა deps შეამოწმოს
 * const team = useContent(() => getTeam(), [], { enabled: open });
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {import('react').DependencyList} [deps=[]]
 * @param {{ enabled?: boolean }} [options]
 * @returns {ContentState<T>}
 */
export function useContent(fn, deps = [], { enabled = true } = {}) {
  const [token, setToken] = useState(0);
  const key = [enabled, token, ...deps];

  const [result, setResult] = useState(
    /** @type {{ key: unknown[] | null, data: T | undefined, error: ContentError | null }} */ ({
      key: null,
      data: undefined,
      error: null,
    }),
  );

  useEffect(
    () => {
      if (!enabled) return undefined;
      let active = true;
      const requestKey = key;
      Promise.resolve()
        .then(fn)
        .then(
          (data) => {
            if (active) setResult({ key: requestKey, data, error: null });
          },
          (error) => {
            if (active) {
              setResult((prev) => ({
                key: requestKey,
                data: prev.data,
                error: normalizeError(error),
              }));
            }
          },
        );
      return () => {
        active = false;
      };
    },
    // deps გამომძახებლისაა (როგორც useEffect-ში); fn ყოველ რენდერზე ახალია და შეგნებულად არ შედის
    // eslint-disable-next-line react-hooks/exhaustive-deps
    key,
  );

  const reload = useCallback(() => setToken((n) => n + 1), []);

  if (!enabled) return { data: undefined, status: 'idle', error: null, reload };
  const settled = sameDeps(result.key, key);
  return {
    data: result.data,
    status: !settled ? 'loading' : result.error ? 'error' : 'success',
    error: settled ? result.error : null,
    reload,
  };
}

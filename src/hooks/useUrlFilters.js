import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { QUERY_MAX } from '@/content/query.js';
import { isSlug } from '@/content/slug.js';

/**
 * ფილტრები URL-ში (`/articles?category=career&q=ჩვევა`): ბმული გაზიარებადია, „უკან“ ღილაკი
 * წინა ფილტრს აბრუნებს. ძიება 300ms debounce-ით იწერება (`replace`, ისტორია არ ივსება),
 * ჩიპი/წელი/სერია — მყისიერად (`push`). არასწორი მნიშვნელობა URL-იდან null-ად იკითხება.
 */

export const FILTER_PARAMS = Object.freeze(['category', 'q', 'year', 'series', 'sort']);
export const SEARCH_DEBOUNCE = 300;

/**
 * @typedef {object} UrlFiltersOptions
 * @property {readonly string[]} [categories]  დასაშვები `category` (ნაგულისხმევად — ნებისმიერი slug)
 * @property {readonly string[]} [sorts]       დასაშვები `sort`
 * @property {number} [debounce=300]
 */

/**
 * @typedef {object} UrlFilters
 * @property {string | null} category
 * @property {string} q                ჩაწერილი (debounced) საძიებო სტრიქონი — ამით იტვირთება სია
 * @property {string} query            ველის მიმდინარე მნიშვნელობა (`<input value>`)
 * @property {number | null} year
 * @property {string | null} series
 * @property {string | null} sort
 * @property {boolean} active          რომელიმე ფილტრი ჩართულია
 * @property {(value: string | null) => void} setCategory
 * @property {(value: string) => void} setQuery     debounce-ით
 * @property {() => void} submitQuery               მყისიერად (Enter / „ძიება“)
 * @property {(value: number | null) => void} setYear
 * @property {(value: string | null) => void} setSeries
 * @property {(value: string | null) => void} setSort
 * @property {() => void} reset
 */

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeQuery(value) {
  return value.replace(/\s+/g, ' ').trim().slice(0, QUERY_MAX);
}

/**
 * @param {string | null} raw
 * @param {readonly string[] | undefined} allowed
 * @returns {string | null}
 */
function readChoice(raw, allowed) {
  if (!raw) return null;
  if (allowed) return allowed.includes(raw) ? raw : null;
  return isSlug(raw) ? raw : null;
}

/**
 * @param {string | null} raw
 * @returns {number | null}
 */
function readYear(raw) {
  if (!raw || !/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  return year >= 1900 && year <= 2999 ? year : null;
}

/** @type {Parameters<ReturnType<typeof useSearchParams>[1]>[1]} */
const PUSH = { preventScrollReset: true };
/** @type {Parameters<ReturnType<typeof useSearchParams>[1]>[1]} */
const REPLACE = { preventScrollReset: true, replace: true };

/**
 * @param {UrlFiltersOptions} [options]
 * @returns {UrlFilters}
 */
export function useUrlFilters(options = {}) {
  const { categories, sorts, debounce = SEARCH_DEBOUNCE } = options;
  const [params, setParams] = useSearchParams();

  const category = readChoice(params.get('category'), categories);
  const series = readChoice(params.get('series'), undefined);
  const sort = readChoice(params.get('sort'), sorts ?? []);
  const year = readYear(params.get('year'));
  const q = normalizeQuery(params.get('q') ?? '');

  // ველის მნიშვნელობა: URL-ის გარე ცვლილებისას (უკან/წინ, ბმული) სინქრონდება,
  // მაგრამ საკუთარ ჩაწერაზე აკრეფილ ჰარს არ შლის
  const [query, setQueryState] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    if (normalizeQuery(query) !== q) setQueryState(q);
  }

  /**
   * @param {Record<string, string | null>} changes
   * @param {typeof PUSH} navigate
   */
  const write = useCallback(
    (changes, navigate) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [name, value] of Object.entries(changes)) {
          if (value === null || value === '') next.delete(name);
          else next.set(name, value);
        }
        return next;
      }, navigate);
    },
    [setParams],
  );

  useEffect(() => {
    const value = normalizeQuery(query);
    if (value === q) return undefined;
    const id = setTimeout(() => write({ q: value }, REPLACE), debounce);
    return () => clearTimeout(id);
  }, [query, q, write, debounce]);

  return useMemo(
    () => ({
      category,
      q,
      query,
      year,
      series,
      sort,
      active: Boolean(category || q || year || series || sort),
      setCategory: (value) => write({ category: value }, PUSH),
      setQuery: (value) => setQueryState(value),
      submitQuery: () => write({ q: normalizeQuery(query) }, REPLACE),
      setYear: (value) => write({ year: value === null ? null : String(value) }, PUSH),
      setSeries: (value) => write({ series: value }, PUSH),
      setSort: (value) => write({ sort: value }, PUSH),
      reset: () => {
        setQueryState('');
        write(Object.fromEntries(FILTER_PARAMS.map((name) => [name, null])), PUSH);
      },
    }),
    [category, q, query, year, series, sort, write],
  );
}

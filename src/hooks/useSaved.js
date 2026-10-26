import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { isSlug } from '@/content/slug.js';

/**
 * შენახული სტატიები: `localStorage['mc-saved']` = JSON მასივი slug-ებისა, ახალი — თავში.
 * ერთ ჩანართში ყველა კომპონენტი ერთ მდგომარეობას ხედავს (useSyncExternalStore), სხვა
 * ჩანართთან სინქრონი `storage` event-ითაა. localStorage თუ მიუწვდომელია (პირადი რეჟიმი,
 * გათიშული საცავი), სია სესიის ბოლომდე მეხსიერებაში ინახება.
 */

export const SAVED_STORAGE_KEY = 'mc-saved';
export const SAVED_MAX = 200;

/** @type {readonly string[]} */
const EMPTY = Object.freeze([]);

/** @type {Set<() => void>} */
const listeners = new Set();
/** @type {string | null} localStorage-ის გარეშე */
let memory = null;
/** @type {string | null | undefined} */
let cachedRaw;
/** @type {readonly string[]} */
let cachedList = EMPTY;

/** @returns {string | null} */
function readRaw() {
  try {
    return window.localStorage.getItem(SAVED_STORAGE_KEY);
  } catch {
    return memory;
  }
}

/** @param {string} raw */
function writeRaw(raw) {
  try {
    window.localStorage.setItem(SAVED_STORAGE_KEY, raw);
  } catch {
    memory = raw;
  }
}

/**
 * ნედლი სტრიქონი → გასუფთავებული სია (მხოლოდ slug-ები, დუბლიკატის გარეშე, ≤ SAVED_MAX).
 * @param {string | null} raw
 * @returns {readonly string[]}
 */
export function parseSaved(raw) {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return Object.freeze([...new Set(data.filter(isSlug))].slice(0, SAVED_MAX));
  } catch {
    return EMPTY;
  }
}

/** @returns {readonly string[]} */
function getSnapshot() {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parseSaved(raw);
  }
  return cachedList;
}

/** @returns {readonly string[]} */
function getServerSnapshot() {
  return EMPTY;
}

/**
 * @param {() => void} callback
 * @returns {() => void}
 */
function subscribeStore(callback) {
  listeners.add(callback);
  /** @param {StorageEvent} event */
  const onStorage = (event) => {
    if (event.key === SAVED_STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
  };
}

/** @param {(list: readonly string[]) => string[]} update */
function commit(update) {
  writeRaw(JSON.stringify(update(getSnapshot()).slice(0, SAVED_MAX)));
  listeners.forEach((listener) => listener());
}

/**
 * @typedef {object} SavedApi
 * @property {readonly string[]} slugs
 * @property {number} count
 * @property {(slug: string) => boolean} isSaved
 * @property {(slug: string) => boolean} toggle   აბრუნებს ახალ მდგომარეობას (true — შენახულია)
 * @property {(slug: string) => void} save
 * @property {(slug: string) => void} remove
 * @property {() => void} clear
 */

/** @returns {SavedApi} */
export function useSaved() {
  const slugs = useSyncExternalStore(subscribeStore, getSnapshot, getServerSnapshot);

  const save = useCallback((/** @type {string} */ slug) => {
    if (!isSlug(slug)) return;
    commit((list) => [slug, ...list.filter((s) => s !== slug)]);
  }, []);

  const remove = useCallback((/** @type {string} */ slug) => {
    commit((list) => list.filter((s) => s !== slug));
  }, []);

  const toggle = useCallback(
    (/** @type {string} */ slug) => {
      const saved = getSnapshot().includes(slug);
      if (saved) remove(slug);
      else save(slug);
      return !saved && isSlug(slug);
    },
    [save, remove],
  );

  const clear = useCallback(() => commit(() => []), []);

  return useMemo(
    () => ({
      slugs,
      count: slugs.length,
      isSaved: (slug) => slugs.includes(slug),
      toggle,
      save,
      remove,
      clear,
    }),
    [slugs, toggle, save, remove, clear],
  );
}

import { useCallback, useSyncExternalStore } from 'react';

import { RATES } from './native-controller.js';

/**
 * ფლეიერის არჩევანი ვიდეოებს შორის და სესიებს შორის ინახება: `localStorage['mc-player']` =
 * `{ captions, sign, audioDescription, rate }`. ნაგულისხმევი — სუბტიტრები და ჟესტური ენა ჩართულია
 * (ContentKit / VideosPage), აუდიოაღწერა გამორთულია, სიჩქარე 1×. ხმა არ ინახება.
 */
export const PLAYER_STORAGE_KEY = 'mc-player';

/** @typedef {{ captions: boolean, sign: boolean, audioDescription: boolean, rate: number }} PlayerPrefs */

/** @type {PlayerPrefs} */
export const DEFAULT_PLAYER_PREFS = Object.freeze({
  captions: true,
  sign: true,
  audioDescription: false,
  rate: 1,
});

/**
 * @param {string | null} raw
 * @returns {PlayerPrefs}
 */
export function parsePlayerPrefs(raw) {
  if (!raw) return DEFAULT_PLAYER_PREFS;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return DEFAULT_PLAYER_PREFS;
    /** @param {string} key */
    const bool = (key) =>
      typeof value[key] === 'boolean'
        ? value[key]
        : DEFAULT_PLAYER_PREFS[/** @type {keyof PlayerPrefs} */ (key)];
    return {
      captions: /** @type {boolean} */ (bool('captions')),
      sign: /** @type {boolean} */ (bool('sign')),
      audioDescription: /** @type {boolean} */ (bool('audioDescription')),
      rate: RATES.includes(value.rate) ? value.rate : 1,
    };
  } catch {
    return DEFAULT_PLAYER_PREFS;
  }
}

/** @type {Set<() => void>} */
const listeners = new Set();
let lastRaw = /** @type {string | null | undefined} */ (undefined);
let cache = DEFAULT_PLAYER_PREFS;

function readRaw() {
  try {
    return window.localStorage.getItem(PLAYER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** @returns {PlayerPrefs} */
function snapshot() {
  const raw = readRaw();
  if (raw !== lastRaw) {
    lastRaw = raw;
    cache = parsePlayerPrefs(raw);
  }
  return cache;
}

/** @param {() => void} listener */
function subscribe(listener) {
  listeners.add(listener);
  /** @param {StorageEvent} event */
  const onStorage = (event) => {
    if (event.key === null || event.key === PLAYER_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * @returns {[PlayerPrefs, (patch: Partial<PlayerPrefs>) => void]}
 */
export function usePlayerPrefs() {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PLAYER_PREFS);
  const update = useCallback((/** @type {Partial<PlayerPrefs>} */ patch) => {
    const next = { ...snapshot(), ...patch };
    try {
      window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // საცავის გარეშე — მხოლოდ მეხსიერებაში
      lastRaw = JSON.stringify(next);
      cache = next;
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [prefs, update];
}

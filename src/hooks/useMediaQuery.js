import { useCallback, useSyncExternalStore } from 'react';

/**
 * media query-ის მიმდინარე მნიშვნელობა; იცვლება `change` event-ზე (OS-ის თემა, ფანჯრის ზომა).
 * matchMedia-ს გარეშე გარემოში (ძველი ბრაუზერი, SSR) — `false`.
 *
 * შენიშვნა: media query-ის `rem` ბრაუზერის საწყის შრიფტს უდრის და არა `<html>`-ის ზომას,
 * ამიტომ თავსებადობის მენიუს შრიფტის მასშტაბს ავტომატურად არ მიჰყვება — ასეთ ზღვარს
 * გამომძახებელი თავად ამრავლებს (`useShellLayout`).
 *
 * @param {string} query  მაგ. '(prefers-color-scheme: dark)', '(min-width: 75rem)'
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (/** @type {() => void} */ notify) => {
      const list = getList(query);
      if (!list) return () => {};
      list.addEventListener?.('change', notify);
      return () => list.removeEventListener?.('change', notify);
    },
    [query],
  );
  const getSnapshot = () => getList(query)?.matches ?? false;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * @param {string} query
 * @returns {MediaQueryList | null}
 */
function getList(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

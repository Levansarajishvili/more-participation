import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useMediaQuery } from '@/hooks/useMediaQuery.js';

import {
  A11Y_STORAGE_KEY,
  applyRootAttributes,
  DEFAULT_PREFS,
  parsePrefs,
  readStoredPrefs,
  stepFontSize,
  writeStoredPrefs,
} from './prefs.js';
import { PreferencesContext } from './usePreferences.js';

/** თემის გადართვისას ფერების გადასვლა (§7: 200ms); ატრიბუტი გადასვლის ბოლოს იხსნება. */
const THEME_SWITCH_MS = 260;

/**
 * თავსებადობის პარამეტრების წყარო: `localStorage['mc-a11y']` → state → `<html>`-ის
 * `data-theme` / `data-size` / `data-spacing` + `<meta name="color-scheme">`.
 *
 * - პირველ რენდერამდე იგივე ატრიბუტებს index.html-ის mc-boot სვამს, ამიტომ აქ ციმციმი არ არის.
 * - სანამ თემა ხელით არ არის არჩეული (`prefs.theme === null`), თემა `prefers-color-scheme`-ს
 *   მიჰყვება — სესიის შუაშიც (matchMedia `change`).
 * - სხვა ჩანართში შეცვლილი პარამეტრები `storage` event-ით აქაც აისახება.
 * - თემის გადართვისას `<html data-theme-switching>` 260ms-ით რთავს ფერების გადასვლას
 *   (motion.css; reduced-motion-ში — მყისიერად).
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export default function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(readStoredPrefs);
  const prefsRef = useRef(prefs);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = prefs.theme ?? (prefersDark ? 'dark' : 'light');

  useLayoutEffect(() => {
    applyRootAttributes(document.documentElement, prefs, prefersDark);
  }, [prefs, prefersDark]);

  const previousTheme = useRef(theme);
  useLayoutEffect(() => {
    if (previousTheme.current === theme) return undefined;
    previousTheme.current = theme;
    const root = document.documentElement;
    root.setAttribute('data-theme-switching', '');
    const timer = window.setTimeout(
      () => root.removeAttribute('data-theme-switching'),
      THEME_SWITCH_MS,
    );
    return () => {
      window.clearTimeout(timer);
      root.removeAttribute('data-theme-switching');
    };
  }, [theme]);

  useEffect(() => {
    /** @param {StorageEvent} event */
    function onStorage(event) {
      if (event.key !== A11Y_STORAGE_KEY && event.key !== null) return;
      const next = parsePrefs(event.key === null ? null : event.newValue);
      prefsRef.current = next;
      setPrefs(next);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((/** @type {Partial<import('./prefs.js').A11yPrefs>} */ patch) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    writeStoredPrefs(next);
    setPrefs(next);
    return next;
  }, []);

  const api = useMemo(
    () => ({
      prefs,
      theme,
      systemTheme: /** @type {'light' | 'dark'} */ (prefersDark ? 'dark' : 'light'),
      fontScale: prefs.size / 100,
      setTheme: (/** @type {import('./prefs.js').Theme | null} */ value) =>
        update({ theme: value }),
      setSize: (/** @type {import('./prefs.js').FontSize} */ size) => update({ size }),
      stepSize: (/** @type {1 | -1} */ direction) =>
        update({ size: stepFontSize(prefsRef.current.size, direction) }).size,
      setSpacing: (/** @type {boolean} */ spacing) => update({ spacing }),
      setVoice: (/** @type {boolean} */ voice) => update({ voice }),
      reset: () => update({ ...DEFAULT_PREFS }),
    }),
    [prefs, theme, prefersDark, update],
  );

  return <PreferencesContext.Provider value={api}>{children}</PreferencesContext.Provider>;
}

import { createContext, useContext } from 'react';

/** @typedef {import('./prefs.js').A11yPrefs} A11yPrefs */
/** @typedef {import('./prefs.js').Theme} Theme */
/** @typedef {import('./prefs.js').FontSize} FontSize */

/**
 * @typedef {object} PreferencesApi
 * @property {A11yPrefs} prefs              შენახული პარამეტრები (`theme: null` — OS-ს მიჰყვება)
 * @property {Theme} theme                  მოქმედი თემა: ხელით არჩეული ან prefers-color-scheme
 * @property {'light' | 'dark'} systemTheme  OS-ის თემა
 * @property {number} fontScale             size / 100 (1 … 2)
 * @property {(theme: Theme | null) => void} setTheme       null — დაბრუნება OS-ის თემაზე
 * @property {(size: FontSize) => void} setSize
 * @property {(direction: 1 | -1) => FontSize} stepSize      ახალი ზომა (ზღვარზე უცვლელი)
 * @property {(spacing: boolean) => void} setSpacing
 * @property {(voice: boolean) => void} setVoice
 * @property {() => void} reset             ნაგულისხმევი; `mc-a11y` საცავიდან იშლება
 */

/** @type {import('react').Context<PreferencesApi | null>} */
export const PreferencesContext = createContext(/** @type {PreferencesApi | null} */ (null));

/**
 * თავსებადობის პარამეტრები და მათი შეცვლა. მუშაობს მხოლოდ `PreferencesProvider`-ის შიგნით.
 * @returns {PreferencesApi}
 */
export function usePreferences() {
  const api = useContext(PreferencesContext);
  if (!api) throw new Error('usePreferences: PreferencesProvider არ არის');
  return api;
}

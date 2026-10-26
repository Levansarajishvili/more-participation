/**
 * თავსებადობის პარამეტრების კონტრაქტი: localStorage-ის გასაღები, დასაშვები მნიშვნელობები
 * და <html>-ის ატრიბუტები. index.html-ის inline script იგივე ლოგიკას ES5-ზე იმეორებს
 * (bundle-მდე იმპორტი შეუძლებელია); თანხვედრას src/theme-boot.test.js ამოწმებს.
 * თავსებადობის მენიუ (F4) მხოლოდ ამ მოდულით კითხულობს და წერს პარამეტრებს:
 * React-ში — `PreferencesProvider` / `usePreferences()`.
 */

export const A11Y_STORAGE_KEY = 'mc-a11y';

/** @typedef {'light' | 'dark' | 'contrast'} Theme */
/** @typedef {100 | 125 | 150 | 175 | 200} FontSize */

/**
 * @typedef {object} A11yPrefs
 * @property {Theme | null} theme  null — ხელით არჩეული არ არის, მოქმედებს prefers-color-scheme
 * @property {FontSize} size       შრიფტის მასშტაბი პროცენტებში
 * @property {boolean} spacing     გაშლილი ინტერვალები (WCAG 1.4.12)
 * @property {boolean} voice       ხმოვანი რეჟიმი; პირველ რენდერზე არ გამოიყენება
 */

/** @type {readonly Theme[]} */
export const THEMES = Object.freeze(['light', 'dark', 'contrast']);

/** @type {readonly FontSize[]} */
export const FONT_SIZES = Object.freeze([100, 125, 150, 175, 200]);

/** @type {Readonly<A11yPrefs>} */
export const DEFAULT_PREFS = Object.freeze({
  theme: null,
  size: 100,
  spacing: false,
  voice: false,
});

/**
 * localStorage-ის ნედლი სტრიქონი → გასუფთავებული პარამეტრები. არასწორი მნიშვნელობა
 * ნაგულისხმევით იცვლება; ფუნქცია არასოდეს აგდებს შეცდომას.
 * @param {string | null | undefined} raw
 * @returns {A11yPrefs}
 */
export function parsePrefs(raw) {
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!data || typeof data !== 'object') return { ...DEFAULT_PREFS };

  const size = Number(data.size);
  return {
    theme: THEMES.includes(data.theme) ? data.theme : null,
    size: /** @type {FontSize} */ (
      FONT_SIZES.includes(/** @type {FontSize} */ (size)) ? size : 100
    ),
    spacing: data.spacing === true,
    voice: data.voice === true,
  };
}

/**
 * პარამეტრები → <html>-ის ატრიბუტები.
 * @param {A11yPrefs} prefs
 * @param {boolean} prefersDark  matchMedia('(prefers-color-scheme: dark)').matches
 * @returns {{ 'data-theme': Theme, 'data-size': string, 'data-spacing': 'normal' | 'wide' }}
 */
export function toRootAttributes(prefs, prefersDark) {
  return {
    'data-theme': prefs.theme ?? (prefersDark ? 'dark' : 'light'),
    'data-size': String(prefs.size),
    'data-spacing': prefs.spacing ? 'wide' : 'normal',
  };
}

/**
 * <meta name="color-scheme">-ის მნიშვნელობა თემისთვის.
 * @param {Theme} theme
 * @returns {'light' | 'dark'}
 */
export function colorSchemeFor(theme) {
  return theme === 'light' ? 'light' : 'dark';
}

/**
 * შრიფტის ზომის ბიჯი (A11yPanel: 100 → 125 → 150 → 175 → 200). ზღვარზე იგივე რჩება.
 * @param {FontSize} size
 * @param {1 | -1} direction
 * @returns {FontSize}
 */
export function stepFontSize(size, direction) {
  const index = FONT_SIZES.indexOf(size);
  const next = Math.min(FONT_SIZES.length - 1, Math.max(0, (index < 0 ? 0 : index) + direction));
  return FONT_SIZES[next];
}

/**
 * პარამეტრები → localStorage-ის სტრიქონი. ფორმა A11yPanel-ის პროტოტიპისაა
 * (`{ size, theme, spacing }`) + `voice`; ხელით არჩეული თემა თუ არ არის, `theme` არ იწერება.
 * @param {A11yPrefs} prefs
 * @returns {string}
 */
export function serializePrefs(prefs) {
  return JSON.stringify({
    size: prefs.size,
    ...(prefs.theme ? { theme: prefs.theme } : {}),
    spacing: prefs.spacing,
    voice: prefs.voice,
  });
}

/** @type {string | null} localStorage-ის გარეშე (პირადი რეჟიმი, დაბლოკილი საცავი) */
let memoryCopy = null;

/** @returns {A11yPrefs} */
export function readStoredPrefs() {
  try {
    return parsePrefs(window.localStorage.getItem(A11Y_STORAGE_KEY));
  } catch {
    return parsePrefs(memoryCopy);
  }
}

/**
 * ნაგულისხმევი პარამეტრები საცავში არ იწერება — გასაღები იშლება („გასუფთავება“).
 * @param {A11yPrefs} prefs
 */
export function writeStoredPrefs(prefs) {
  const isDefault =
    prefs.theme === DEFAULT_PREFS.theme &&
    prefs.size === DEFAULT_PREFS.size &&
    prefs.spacing === DEFAULT_PREFS.spacing &&
    prefs.voice === DEFAULT_PREFS.voice;
  const raw = isDefault ? null : serializePrefs(prefs);
  try {
    if (raw === null) window.localStorage.removeItem(A11Y_STORAGE_KEY);
    else window.localStorage.setItem(A11Y_STORAGE_KEY, raw);
  } catch {
    memoryCopy = raw;
  }
}

/**
 * ატრიბუტების დადება `<html>`-ზე და `<meta name="color-scheme">`-ის განახლება — იგივე, რასაც
 * index.html-ის mc-boot პირველ რენდერამდე აკეთებს.
 * @param {HTMLElement} root
 * @param {A11yPrefs} prefs
 * @param {boolean} prefersDark
 */
export function applyRootAttributes(root, prefs, prefersDark) {
  const attributes = toRootAttributes(prefs, prefersDark);
  for (const [name, value] of Object.entries(attributes)) {
    if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
  const meta = root.ownerDocument.querySelector('meta[name="color-scheme"]');
  meta?.setAttribute('content', colorSchemeFor(attributes['data-theme']));
}

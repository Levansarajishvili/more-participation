/**
 * WCAG 2.2 კონტრასტის გამოთვლა და tokens.css-ის პარსერი.
 * იყენებს src/styles/tokens.test.js და scripts/contrast-report.mjs.
 */

/** @typedef {'light' | 'dark' | 'contrast'} Theme */

export const THEME_NAMES = /** @type {const} */ (['light', 'dark', 'contrast']);

/** ბარიერები: CLAUDE.md, დიზაინ-სისტემის წესი 4 */
export const MIN = { body: 7, text: 4.5, graphic: 3 };

/** @param {string} hex */
export function luminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @param {string} a @param {string} b */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * tokens.css → { light: { '--mc-ink': '#0b2545', … }, dark: …, contrast: … }
 * @param {string} css
 * @returns {Record<Theme, Record<string, string>>}
 */
export function parseThemes(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  /** @type {Record<string, Record<string, string>>} */
  const out = { light: {}, dark: {}, contrast: {} };
  for (const [, selector, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const theme = THEME_NAMES.find((name) => selector.includes(`[data-theme='${name}']`));
    if (!theme) continue;
    for (const [, name, value] of body.matchAll(/(--mc-[\w-]+)\s*:\s*([^;]+);/g)) {
      out[theme][name] = value.trim().toLowerCase();
    }
  }
  return /** @type {Record<Theme, Record<string, string>>} */ (out);
}

/**
 * project-context.md-ის §2-ის ყველა HEX — ერთადერთი დასაშვები ფერები.
 * @param {string} markdown
 */
export function allowedHexFromContext(markdown) {
  const start = markdown.indexOf('## 2.');
  const end = markdown.indexOf('## 3.');
  const section = markdown.slice(start, end);
  return new Set([...section.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(([hex]) => hex.toLowerCase()));
}

/**
 * სავალდებულო წყვილები. fg/bg ტოკენის სახელებია; `anyOf` — საკმარისია ერთი ფენა.
 * @typedef {{ label: string, fg: string | string[], bg: string, min: number, themes?: Theme[] }} Pair
 * @type {Pair[]}
 */
export const PAIRS = [
  ...['--mc-bg', '--mc-surface', '--mc-alt'].flatMap((bg) => [
    { label: 'ძირითადი ტექსტი', fg: '--mc-ink', bg, min: MIN.body },
    { label: 'მეორეული ტექსტი', fg: '--mc-muted', bg, min: MIN.text },
    { label: 'ბმული', fg: '--mc-link', bg, min: MIN.text },
    { label: 'ნარინჯისფერი ტექსტი', fg: '--mc-accent-text', bg, min: MIN.text },
    { label: 'ზრდა (▲ + ტექსტი)', fg: '--mc-growth', bg, min: MIN.text },
    { label: 'შეცდომა', fg: '--mc-error', bg, min: MIN.text },
    { label: 'ველის კონტური', fg: '--mc-border', bg, min: MIN.graphic },
    { label: 'CTA-ს საზღვარი', fg: ['--mc-cta', '--mc-cta-frame'], bg, min: MIN.graphic },
    { label: 'CTA-ს ჩრდილი', fg: '--mc-cta-shadow', bg, min: MIN.graphic },
  ]),
  // F3: მდგომარეობები და ზოლი
  { label: 'ტექსტი hover-ზე', fg: '--mc-ink', bg: '--mc-hover', min: MIN.body },
  { label: 'ტექსტი დაჭერისას', fg: '--mc-pressed-ink', bg: '--mc-pressed', min: MIN.body },
  { label: 'ტექსტი ზოლზე', fg: '--mc-band-ink', bg: '--mc-band-bg', min: MIN.body },
  { label: 'მთავარი ღილაკი / არჩეული ჩიპი', fg: '--mc-surface', bg: '--mc-ink', min: MIN.body },
  {
    label: 'მთავარი ღილაკი hover (surface muted-ზე)',
    fg: '--mc-surface',
    bg: '--mc-muted',
    min: MIN.text,
    themes: ['light', 'dark'],
  },
  {
    label: 'მთავარი ღილაკი დაჭერისას (surface link-ზე)',
    fg: '--mc-surface',
    bg: '--mc-link',
    min: MIN.text,
  },
  { label: 'გათიშული ტექსტი', fg: '--mc-muted', bg: '--mc-alt', min: MIN.text },
  { label: 'CTA ტექსტი', fg: '--mc-cta-ink', bg: '--mc-cta', min: MIN.body },
  { label: 'CTA ტექსტი hover', fg: '--mc-cta-ink', bg: '--mc-cta-hover', min: MIN.body },
  {
    label: 'ტექსტი ნარინჯისფერ ზოლზე',
    fg: '--mc-cta-ink',
    bg: '--mc-band',
    min: MIN.body,
    themes: ['light'],
  },
  { label: 'გრაფიკა ჰეროზე', fg: '--mc-graphic', bg: '--mc-hero', min: MIN.graphic },
  {
    label: 'გრაფიკა გვერდზე',
    fg: '--mc-graphic',
    bg: '--mc-bg',
    min: MIN.graphic,
    themes: ['dark', 'contrast'],
  },
  // F4: ჰედერის მთავარი ზოლი
  { label: 'ტექსტი ჰედერზე', fg: '--mc-ink', bg: '--mc-header', min: MIN.body },
  { label: 'ნავიგაციის აქტიური ხაზი', fg: '--mc-graphic', bg: '--mc-header', min: MIN.graphic },
  { label: 'მეორეული ტექსტი ჰედერზე', fg: '--mc-muted', bg: '--mc-header', min: MIN.text },
  ...[
    '--mc-bg',
    '--mc-surface',
    '--mc-alt',
    '--mc-hero',
    '--mc-footer',
    '--mc-header',
    '--mc-cta',
  ].map((bg) => ({
    label: 'ფოკუსის რგოლი (ერთი ფენა მაინც)',
    fg: ['--mc-ring-inner', '--mc-ring-mid', '--mc-ring-outer'],
    bg,
    min: MIN.graphic,
  })),
];

/**
 * @param {Record<string, string>} tokens
 * @param {Pair} pair
 * @returns {{ ratio: number, fg: string }}
 */
export function measure(tokens, pair) {
  const candidates = Array.isArray(pair.fg) ? pair.fg : [pair.fg];
  return candidates
    .map((fg) => ({ fg, ratio: contrast(tokens[fg], tokens[pair.bg]) }))
    .reduce((best, next) => (next.ratio > best.ratio ? next : best));
}

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  MIN,
  PAIRS,
  THEME_NAMES,
  allowedHexFromContext,
  contrast,
  measure,
  parseThemes,
} from '../test/contrast.js';

// jsdom-ში import.meta.url file: სქემა არ არის — გზა პროექტის ფესვიდან
const css = readFileSync(resolve('src/styles/tokens.css'), 'utf8');
const context = readFileSync(resolve('docs/project-context.md'), 'utf8');
const themes = parseThemes(css);
const allowed = allowedHexFromContext(context);

/** prompt 1-ის 19 ტოკენი + CTA ჩარჩო, ფოკუსის რგოლის სამი ფენა, F3-ის მდგომარეობები და F4-ის ჰედერი */
const REQUIRED = [
  'bg',
  'surface',
  'alt',
  'hero',
  'footer',
  'header',
  'ink',
  'muted',
  'link',
  'accent-text',
  'graphic',
  'band',
  'growth',
  'line',
  'border',
  'error',
  'cta',
  'cta-hover',
  'cta-ink',
  'cta-shadow',
  'cta-frame',
  'hover',
  'pressed',
  'pressed-ink',
  'card-border',
  'band-bg',
  'band-ink',
  'ring-inner',
  'ring-mid',
  'ring-outer',
].map((name) => `--mc-${name}`);

describe('tokens.css', () => {
  it.each(THEME_NAMES)('%s: ყველა ტოკენი განსაზღვრულია და სხვა არაფერი', (theme) => {
    expect(Object.keys(themes[theme]).sort()).toEqual([...REQUIRED].sort());
  });

  it.each(THEME_NAMES)('%s: ყოველი HEX project-context §2-იდანაა', (theme) => {
    const foreign = Object.entries(themes[theme]).filter(([, hex]) => !allowed.has(hex));
    expect(foreign).toEqual([]);
  });

  it('§2-ის ცხრილი წაიკითხა', () => {
    expect(allowed.size).toBeGreaterThan(30);
  });

  it('ოქროსფერი #FFB81C მხოლოდ CTA-სა და ფოკუსის რგოლშია', () => {
    for (const theme of THEME_NAMES) {
      for (const [name, hex] of Object.entries(themes[theme])) {
        if (hex === '#ffb81c') expect(name).toMatch(/^--mc-(cta|ring-outer)/);
      }
    }
  });

  it('#FFE600 მხოლოდ კონტრასტის თემაშია', () => {
    for (const theme of ['light', 'dark']) {
      expect(Object.values(themes[theme])).not.toContain('#ffe600');
    }
  });

  for (const theme of THEME_NAMES) {
    describe(`${theme}: კონტრასტი`, () => {
      const pairs = PAIRS.filter((pair) => !pair.themes || pair.themes.includes(theme));
      it.each(pairs.map((pair) => [`${pair.label} / ${pair.bg}`, pair]))('%s', (_, pair) => {
        const { ratio } = measure(themes[theme], pair);
        expect(
          ratio,
          `${pair.label}: ${ratio.toFixed(2)}:1 < ${pair.min}:1`,
        ).toBeGreaterThanOrEqual(pair.min);
      });
    });
  }

  /*
   * F4: ზედა ზოლი და ფუტერი ორივე თემაში მუქია — შიგთავსს `data-theme="dark"` ქვეხე აქვს,
   * ფონი კი ძირეული თემის `--mc-footer`-ია (ღიაში #0A1D38, მუქში #030B16).
   */
  describe('F4: მუქი ქვეხე --mc-footer-ზე', () => {
    const cases = ['light', 'dark'].flatMap((root) =>
      [
        ['--mc-ink', MIN.body],
        ['--mc-muted', MIN.text],
        ['--mc-link', MIN.text],
        ['--mc-border', MIN.graphic],
        ['--mc-ring-mid', MIN.graphic],
      ].map(([fg, min]) => [`${root}-ის ფუტერზე ${fg}`, root, fg, min]),
    );
    it.each(cases)('%s', (_, root, fg, min) => {
      const ratio = contrast(themes.dark[fg], themes[root]['--mc-footer']);
      expect(ratio, `${fg}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
    });
  });
});

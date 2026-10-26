import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  A11Y_STORAGE_KEY,
  colorSchemeFor,
  DEFAULT_PREFS,
  parsePrefs,
  serializePrefs,
  stepFontSize,
  toRootAttributes,
  writeStoredPrefs,
} from '@/features/a11y/prefs.js';

const html = readFileSync(resolve('index.html'), 'utf8');
const boot = html.match(/<script id="mc-boot">([\s\S]*?)<\/script>/)?.[1] ?? '';

/**
 * index.html-ის inline script-ის გაშვება სუფთა <html>-ზე.
 * @param {{ stored?: string | null, prefersDark?: boolean, storageThrows?: boolean, noMatchMedia?: boolean }} env
 */
function runBoot({
  stored = null,
  prefersDark = false,
  storageThrows = false,
  noMatchMedia = false,
} = {}) {
  const root = document.documentElement;
  for (const name of ['data-theme', 'data-size', 'data-spacing']) root.removeAttribute(name);
  document.head.innerHTML = '<meta name="color-scheme" content="light dark">';

  const storage = storageThrows
    ? {
        getItem() {
          throw new DOMException('denied', 'SecurityError');
        },
      }
    : { getItem: (key) => (key === A11Y_STORAGE_KEY ? stored : null) };
  const fakeWindow = {
    localStorage: storage,
    matchMedia: noMatchMedia
      ? undefined
      : (query) => ({ matches: prefersDark && query === '(prefers-color-scheme: dark)' }),
  };

  new Function('document', 'window', boot)(document, fakeWindow);

  return {
    theme: root.getAttribute('data-theme'),
    size: root.getAttribute('data-size'),
    spacing: root.getAttribute('data-spacing'),
    scheme: document.querySelector('meta[name="color-scheme"]').getAttribute('content'),
  };
}

const CASES = [
  ['არაფერი შენახული, OS ღია', { stored: null, prefersDark: false }],
  ['არაფერი შენახული, OS მუქი', { stored: null, prefersDark: true }],
  ['ხელით ღია, OS მუქი', { stored: '{"theme":"light"}', prefersDark: true }],
  ['ხელით მუქი, OS ღია', { stored: '{"theme":"dark"}', prefersDark: false }],
  ['კონტრასტი + 150% + გაშლილი', { stored: '{"theme":"contrast","size":150,"spacing":true}' }],
  ['ზომა სტრიქონად', { stored: '{"size":"175"}' }],
  ['200% და voice', { stored: '{"size":200,"voice":true}', prefersDark: true }],
  ['უცნობი მნიშვნელობები', { stored: '{"theme":"neon","size":999,"spacing":"yes"}' }],
  ['პროტოტიპის ძველი სახელები', { stored: '{"theme":"high","size":125}' }],
  ['დაზიანებული JSON', { stored: '{theme:' }],
  ['JSON არა-ობიექტი', { stored: '42' }],
  ['null', { stored: 'null' }],
];

describe('index.html — mc-boot', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('script არსებობს და ES5-ია (const/let/=> არ არის)', () => {
    expect(boot.length).toBeGreaterThan(200);
    expect(boot).not.toMatch(/\b(const|let)\b|=>/);
  });

  it('script დგას color-scheme meta-ს შემდეგ და ნებისმიერ სტილსა თუ მოდულამდე', () => {
    const at = (needle) => html.indexOf(needle);
    expect(at('name="color-scheme"')).toBeLessThan(at('id="mc-boot"'));
    expect(at('id="mc-boot"')).toBeLessThan(at('type="module"'));
    expect(html.slice(0, at('id="mc-boot"'))).not.toMatch(/<link[^>]+stylesheet|<style/);
  });

  it.each(CASES)('%s — ემთხვევა prefs.js-ს', (_, env) => {
    const result = runBoot(env);
    const expected = toRootAttributes(parsePrefs(env.stored), Boolean(env.prefersDark));
    expect(result).toEqual({
      theme: expected['data-theme'],
      size: expected['data-size'],
      spacing: expected['data-spacing'],
      scheme: colorSchemeFor(expected['data-theme']),
    });
  });

  it('შენახული არჩევანი OS-ის პარამეტრს სჯობს', () => {
    expect(runBoot({ stored: '{"theme":"light"}', prefersDark: true }).theme).toBe('light');
    expect(runBoot({ stored: '{"theme":"contrast"}', prefersDark: true })).toMatchObject({
      theme: 'contrast',
      scheme: 'dark',
    });
  });

  it('დაბლოკილი localStorage-ით OS-ის თემაზე გადადის', () => {
    expect(runBoot({ storageThrows: true, prefersDark: true })).toEqual({
      theme: 'dark',
      size: '100',
      spacing: 'normal',
      scheme: 'dark',
    });
  });

  it('matchMedia-ს გარეშე ღია თემაზე რჩება', () => {
    expect(runBoot({ noMatchMedia: true }).theme).toBe('light');
  });
});

describe('prefs.js', () => {
  it('parsePrefs არასოდეს აგდებს და ნაგულისხმევს აბრუნებს', () => {
    expect(parsePrefs('{')).toEqual({ theme: null, size: 100, spacing: false, voice: false });
    expect(parsePrefs(undefined)).toEqual({ theme: null, size: 100, spacing: false, voice: false });
  });

  it('სრულ ჩანაწერს უცვლელად კითხულობს', () => {
    expect(parsePrefs('{"theme":"dark","size":125,"spacing":true,"voice":true}')).toEqual({
      theme: 'dark',
      size: 125,
      spacing: true,
      voice: true,
    });
  });

  it('stepFontSize: A11yPanel-ის ბიჯები, ზღვარზე უცვლელი', () => {
    expect(stepFontSize(100, 1)).toBe(125);
    expect(stepFontSize(175, 1)).toBe(200);
    expect(stepFontSize(200, 1)).toBe(200);
    expect(stepFontSize(100, -1)).toBe(100);
    expect(stepFontSize(150, -1)).toBe(125);
  });

  it('serializePrefs: პროტოტიპის ფორმა + voice; parsePrefs-თან ორმხრივი', () => {
    const prefs = { theme: 'dark', size: 150, spacing: true, voice: true };
    expect(JSON.parse(serializePrefs(prefs))).toEqual({
      size: 150,
      theme: 'dark',
      spacing: true,
      voice: true,
    });
    expect(parsePrefs(serializePrefs(prefs))).toEqual(prefs);
    // ხელით არჩეული თემის გარეშე `theme` არ იწერება — mc-boot OS-ს მიჰყვება
    expect(JSON.parse(serializePrefs({ ...prefs, theme: null }))).not.toHaveProperty('theme');
  });

  it('writeStoredPrefs: ნაგულისხმევი პარამეტრები საცავიდან იშლება', () => {
    writeStoredPrefs({ ...DEFAULT_PREFS, size: 125 });
    expect(localStorage.getItem(A11Y_STORAGE_KEY)).toBe(
      '{"size":125,"spacing":false,"voice":false}',
    );
    writeStoredPrefs({ ...DEFAULT_PREFS });
    expect(localStorage.getItem(A11Y_STORAGE_KEY)).toBeNull();
  });
});

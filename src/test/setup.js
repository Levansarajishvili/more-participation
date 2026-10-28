import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

// vitest-axe/extend-expect საკუთარ vitest-ის ასლს აფართოებს — matcher-ს პროექტის expect-ზე ვრთავთ.
expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('title').forEach((node) => node.remove());
});

// F6: jsdom 30-ს `<search>` ელემენტი ჯერ არ აქვს (HTMLUnknownElement; Chrome 118+, Safari 17+,
// Firefox 118+ მას იცნობს) — React-ის მხოლოდ ამ გაფრთხილებას ვფილტრავთ, დანარჩენი რჩება.
const consoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].startsWith('The tag <%s> is unrecognized') &&
    args[1] === 'search'
  )
    return;
  consoleError(...args);
};

// jsdom-ს matchMedia არ აქვს; ნაგულისხმევი — არცერთი media query არ ემთხვევა.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
}

// jsdom-ს scrollTo / scrollIntoView არ აქვს (ScrollRestoration, skip-link).
window.scrollTo = () => {};
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  // თავსებადობის პარამეტრები ტესტებს შორის არ გადადის
  window.localStorage.clear();
  window.sessionStorage.clear();
  for (const name of ['data-theme', 'data-size', 'data-spacing', 'data-theme-switching']) {
    document.documentElement.removeAttribute(name);
  }
});

// F9: ინგლისური ლექსიკონი (აპლიკაციაში — დინამიკური import `/en`-ზე)
import en from '@/i18n/en.js';
import { registerDictionary } from '@/i18n/index.js';

registerDictionary('en', en);

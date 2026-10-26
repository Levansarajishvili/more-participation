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

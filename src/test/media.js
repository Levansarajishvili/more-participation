/**
 * მართვადი `window.matchMedia` ტესტებისთვის: სიგანე (px, rem = 16px — როგორც ბრაუზერში media
 * query-ში) და OS-ის თემა; `set()` ცვლილებას `change` event-ით აცხადებს.
 *
 * მხარდაჭერილი query: `(min-width: Nrem | Npx)`, `(max-width: …)`, `(prefers-color-scheme: dark)`,
 * `(prefers-reduced-motion: reduce)`. დანარჩენი — false.
 */

/** @typedef {{ width: number, dark: boolean, reducedMotion: boolean }} MediaState */

/**
 * @param {Partial<MediaState>} [initial]
 * @returns {{ set: (patch: Partial<MediaState>) => void, restore: () => void }}
 */
export function installMatchMedia(initial = {}) {
  const original = window.matchMedia;
  const originalWidth = window.innerWidth;
  /** jsdom-ს განლაგება არ აქვს — useShellLayout ფანჯრის სიგანით ითვლის */
  const setWidth = (/** @type {number} */ width) =>
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  /** @type {MediaState} */
  const state = { width: 390, dark: false, reducedMotion: false, ...initial };
  setWidth(state.width);
  /** @type {Set<{ query: string, listeners: Set<(event: { matches: boolean }) => void>, last: boolean }>} */
  const lists = new Set();

  /** @param {string} query */
  function evaluate(query) {
    const length = (/** @type {string} */ value, /** @type {string} */ unit) =>
      Number(value) * (unit === 'rem' || unit === 'em' ? 16 : 1);
    let match = query.match(/min-width:\s*([\d.]+)(rem|em|px)/);
    if (match) return state.width >= length(match[1], match[2]);
    match = query.match(/max-width:\s*([\d.]+)(rem|em|px)/);
    if (match) return state.width <= length(match[1], match[2]);
    if (query.includes('prefers-color-scheme: dark')) return state.dark;
    if (query.includes('prefers-reduced-motion: reduce')) return state.reducedMotion;
    return false;
  }

  window.matchMedia = /** @type {typeof window.matchMedia} */ (
    (query) => {
      const entry = { query, listeners: new Set(), last: evaluate(query) };
      lists.add(entry);
      return /** @type {MediaQueryList} */ ({
        get matches() {
          return evaluate(query);
        },
        media: query,
        onchange: null,
        addEventListener: (_type, listener) => entry.listeners.add(listener),
        removeEventListener: (_type, listener) => entry.listeners.delete(listener),
        addListener: (listener) => entry.listeners.add(listener),
        removeListener: (listener) => entry.listeners.delete(listener),
        dispatchEvent: () => false,
      });
    }
  );

  return {
    set(patch) {
      Object.assign(state, patch);
      setWidth(state.width);
      window.dispatchEvent(new Event('resize'));
      for (const entry of lists) {
        const matches = evaluate(entry.query);
        if (matches === entry.last) continue;
        entry.last = matches;
        for (const listener of [...entry.listeners]) listener({ matches });
      }
    },
    restore() {
      window.matchMedia = original;
      setWidth(originalWidth);
    },
  };
}

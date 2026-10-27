/**
 * ველის გზა (`cover.alt`, `slides[2].plain`, `accessibility.format`) → მნიშვნელობა / ახალი ობიექტი.
 * setIn immutable-ია: ცვლის მხოლოდ გზაზე მყოფ ობიექტებს.
 */

/** @param {string} path @returns {(string | number)[]} */
export function parsePath(path) {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

/** @param {unknown} obj @param {string} path @returns {any} */
export function getIn(obj, path) {
  let node = /** @type {any} */ (obj);
  for (const key of parsePath(path)) {
    if (node === null || node === undefined) return undefined;
    node = node[key];
  }
  return node;
}

/**
 * @template T
 * @param {T} obj @param {string} path @param {unknown} value
 * @returns {T}
 */
export function setIn(obj, path, value) {
  const keys = parsePath(path);
  /** @param {any} node @param {number} i @returns {any} */
  const step = (node, i) => {
    if (i === keys.length) return value;
    const key = keys[i];
    const base = node ?? (typeof key === 'number' ? [] : {});
    const copy = Array.isArray(base) ? [...base] : { ...base };
    copy[/** @type {any} */ (key)] = step(base[/** @type {any} */ (key)], i + 1);
    return copy;
  };
  return step(obj, 0);
}

/**
 * ველის DOM id: `cover.alt` → `f-cover-alt`, `slides[1].plain` → `f-slides-1-plain`.
 * @param {string} path
 */
export function fieldId(path) {
  return `f-${parsePath(path).join('-')}`;
}

/**
 * შემოწმების ველის გზა → ფორმის ელემენტის id: ყველაზე ზუსტი, რომელიც DOM-ში არსებობს
 * (`body[3].image.alt` → `f-body`, `transcript` → `f-transcript`).
 * @param {string} path
 * @returns {string}
 */
export function resolveFieldId(path) {
  const keys = parsePath(path);
  for (let n = keys.length; n > 0; n -= 1) {
    const id = `f-${keys.slice(0, n).join('-')}`;
    if (typeof document !== 'undefined' && document.getElementById(id)) return id;
  }
  return `f-${keys[0] ?? ''}`;
}

/** სტრუქტურული შედარება (ფორმის „შეუნახავი ცვლილება“). @param {unknown} a @param {unknown} b */
export function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

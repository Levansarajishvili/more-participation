/**
 * B7: წარმოების bundle-ის წესი — mock წარმოებაში არ ხვდება (§12 „Backend-ის წესები“). სუფთა ფუნქცია
 * (`check-dist.mjs` იძახებს, ტესტი — `server/test/deploy/check-dist.test.js`).
 *
 * ორი დამოუკიდებელი შემოწმება — minify ფუნქციის სახელს (`createMockData`) შლის, ამიტომ მხოლოდ
 * სტრიქონის ძიება ცრუ „მწვანეს“ მისცემდა:
 * 1. მოდულები (`dist/.vite/modules.json`, vite.config.js-ის `mc-chunk-modules`): mock-ის, ტესტის და
 *    სცენარის მოდული არცერთ chunk-ში (საჯარო და ადმინის) არ არის; HTTP adapter-ები — არის.
 * 2. სტრიქონები ყველა JS chunk-ში: mock-ის სატესტო პაროლი / მოწვევის კოდი და ფუნქციის სახელები
 *    (არა-minify build-ის შემთხვევისთვის).
 */

/** mock-ის / ტესტის მოდულები (რეპოს ფესვიდან, `/`-ით). */
export const MOCK_MODULES = Object.freeze([
  /^src\/content\/mock\//,
  /^src\/admin\/api\/mock\.js$/,
  /(^|\/)__tests__\//,
  /\.test\.jsx?$/,
]);

/** სტრიქონები, რომლებიც მხოლოდ mock-შია. */
export const MOCK_MARKERS = Object.freeze([
  'createMockData',
  'createMockAdapter',
  'createMockAdminAdapter',
  'getSharedMockStore',
  'mc-dev-password',
  'MC-INVITE-0001',
]);

/** წარმოების bundle რეალურ API-ზეა მიბმული. */
export const API_MODULES = Object.freeze(['src/content/http.js', 'src/admin/api/http.js']);

/**
 * @param {{ modules: Record<string, string[]> | null, texts: Record<string, string> }} input
 *   modules — chunk → მოდულები; texts — JS chunk → ტექსტი
 * @returns {string[]}  შეცდომები (ცარიელი — წესი დაცულია)
 */
export function mockLeaks({ modules, texts }) {
  const errors = [];
  if (!modules) {
    errors.push('.vite/modules.json არ არის — vite.config.js-ის mc-chunk-modules plugin-ი');
  } else {
    const all = new Set(Object.values(modules).flat());
    for (const [chunk, ids] of Object.entries(modules)) {
      for (const id of ids) {
        if (MOCK_MODULES.some((re) => re.test(id))) errors.push(`mock-ის მოდული ${id} — ${chunk}`);
      }
    }
    for (const id of API_MODULES) {
      if (!all.has(id)) errors.push(`${id} bundle-ში არ არის — build API-ზე არ არის მიბმული`);
    }
  }
  for (const [chunk, text] of Object.entries(texts)) {
    for (const marker of MOCK_MARKERS) {
      if (text.includes(marker)) errors.push(`„${marker}“ — ${chunk}`);
    }
  }
  return errors;
}

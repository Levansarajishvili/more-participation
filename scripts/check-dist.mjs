/**
 * build-ის შემდგომი შემოწმება (`postbuild`): წარმოების HTML-სა და bundle-ის ინვარიანტები.
 * 1. mc-boot ნებისმიერ სტილსა და მოდულამდე სრულდება — თემა პირველ რენდერამდე ედება.
 * 2. dev-only `/__kit` წარმოების bundle-ში არ ხვდება.
 * 3. შრიფტები CSS-ში base64-ად არ ჩაიწერება.
 * 4. dev-only კონტენტის ანგარიში (validate.js-ის `reportContentIssues`) საჯარო chunk-ებში არ ხვდება.
 * 5. F8: ადმინის კოდი (src/admin/**, TipTap / ProseMirror) საჯარო chunk-ებში არ ხვდება. საჯარო =
 *    ყველაფერი, რაც entry-დან მიიღწევა (imports + dynamicImports), `src/admin/routes.jsx`-ის
 *    გავლის გარეშე (ის მხოლოდ `patchRoutesOnNavigation`-ით იტვირთება). ადმინის chunk-ში
 *    validate.js-ის წესები დაშვებულია (ჩეკლისტი).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));
const errors = [];

const at = (re) => html.search(re);
const boot = at(/<script id="mc-boot">/);
const firstStyle = at(/<link[^>]+rel="stylesheet"|<style/);
const firstModule = at(/<script[^>]+type="module"/);
if (boot < 0) errors.push('mc-boot script აკლია dist/index.html-ს');
if (firstStyle > -1 && firstStyle < boot) errors.push('სტილი mc-boot-ზე ადრე იტვირთება');
if (firstModule > -1 && firstModule < boot) errors.push('მოდული mc-boot-ზე ადრე დგას');

const scripts = assets.filter((file) => file.endsWith('.js'));
if (scripts.some((file) => /^KitPage/.test(file))) errors.push('KitPage chunk წარმოებაშია');
if (scripts.some((file) => readFileSync(join(dist, 'assets', file), 'utf8').includes('__kit'))) {
  errors.push('`__kit` როუტი წარმოების bundle-შია');
}

// validate.js-ის console-ის ნიშანი; ka.js-ის `checks.*` ტექსტი დასაშვებია (F8-ის ადმინი იყენებს)
// ---- F8: საჯარო ↔ ადმინის chunk-ები (Vite manifest)
const manifest = JSON.parse(readFileSync(join(dist, '.vite', 'manifest.json'), 'utf8'));
const ADMIN_ROUTES = 'src/admin/routes.jsx';
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!manifest[ADMIN_ROUTES]) errors.push(`${ADMIN_ROUTES} ცალკე chunk არ არის`);
if (manifest[ADMIN_ROUTES]?.isEntry) errors.push('ადმინის როუტები entry chunk-შია');
const publicKeys = new Set();
const queue = entry ? [entry] : [];
while (queue.length) {
  const key = queue.shift();
  if (publicKeys.has(key) || key === ADMIN_ROUTES) continue;
  publicKeys.add(key);
  const chunk = manifest[key];
  queue.push(...(chunk.imports ?? []), ...(chunk.dynamicImports ?? []));
}
const publicJs = new Set([...publicKeys].map((key) => manifest[key].file));
const publicCss = new Set([...publicKeys].flatMap((key) => manifest[key].css ?? []));
const leaked = [...publicKeys].filter((key) => key.startsWith('src/admin/'));
if (leaked.length) errors.push(`ადმინის მოდული საჯარო chunk-შია: ${leaked.join(', ')}`);
const ADMIN_MARKERS = ['mc-admin', '@tiptap', 'ProseMirror', 'mc-dev-password', 'კონტენტი ერთი'];
for (const file of publicJs) {
  const text = readFileSync(join(dist, file), 'utf8');
  for (const marker of ADMIN_MARKERS) {
    if (text.includes(marker)) errors.push(`„${marker}“ საჯარო chunk-შია: ${file}`);
  }
  if (text.includes('[content] '))
    errors.push(`validate.js-ის dev-ანგარიში საჯარო chunk-შია: ${file}`);
}
for (const file of publicCss) {
  if (readFileSync(join(dist, file), 'utf8').includes('.mc-admin')) {
    errors.push(`ადმინის სტილი საჯარო CSS-შია: ${file}`);
  }
}
const adminFiles = scripts.length - [...publicJs].filter((file) => file.endsWith('.js')).length;

const styles = assets.filter((file) => file.endsWith('.css'));
if (styles.some((file) => readFileSync(join(dist, 'assets', file), 'utf8').includes('data:font'))) {
  errors.push('შრიფტი CSS-ში base64-ადაა ჩაწერილი');
}

if (errors.length) {
  console.error(`✗ check-dist:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `✓ check-dist: mc-boot პირველია, /__kit არ არის, საჯარო ${publicJs.size} chunk-ში ადმინი / TipTap / validate-ის ანგარიში არ არის; ადმინის chunk — ${adminFiles}; სულ ${scripts.length} JS chunk`,
);

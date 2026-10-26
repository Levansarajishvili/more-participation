/**
 * build-ის შემდგომი შემოწმება (`postbuild`): წარმოების HTML-სა და bundle-ის ინვარიანტები.
 * 1. mc-boot ნებისმიერ სტილსა და მოდულამდე სრულდება — თემა პირველ რენდერამდე ედება.
 * 2. dev-only `/__kit` წარმოების bundle-ში არ ხვდება.
 * 3. შრიფტები CSS-ში base64-ად არ ჩაიწერება.
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

const styles = assets.filter((file) => file.endsWith('.css'));
if (styles.some((file) => readFileSync(join(dist, 'assets', file), 'utf8').includes('data:font'))) {
  errors.push('შრიფტი CSS-ში base64-ადაა ჩაწერილი');
}

if (errors.length) {
  console.error(`✗ check-dist:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ check-dist: mc-boot პირველია, /__kit არ არის, ${scripts.length} JS chunk`);

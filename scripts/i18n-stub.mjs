/**
 * en.js-ის გენერატორი: ka.js-ის ყველა გასაღები → `[EN: გასაღები]` + იგივე `{ცვლადები}`.
 * უკვე თარგმნილი მნიშვნელობა (რომელიც `[EN`-ით არ იწყება) ინახება; ka.js-ში წაშლილი
 * გასაღები en.js-იდანაც იშლება. გაშვება: `npm run i18n:stub`.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../src/i18n/', import.meta.url);
const kaUrl = new URL('ka.js', root);
const enUrl = new URL('en.js', root);

const { default: ka } = await import(pathToFileURL(fileURLToPath(kaUrl)).href);
/** @type {Record<string, unknown>} */
let en = {};
try {
  en = (await import(pathToFileURL(fileURLToPath(enUrl)).href)).default;
} catch {
  en = {};
}

/**
 * @param {unknown} source
 * @param {unknown} existing
 * @param {string} prefix
 * @returns {unknown}
 */
function stub(source, existing, prefix) {
  if (typeof source === 'string') {
    if (typeof existing === 'string' && !existing.startsWith('[EN')) return existing;
    const vars = source.match(/\{\w+\}/g) ?? [];
    return [`[EN: ${prefix}]`, ...vars].join(' ');
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  const prev = existing && typeof existing === 'object' ? existing : {};
  for (const [key, value] of Object.entries(/** @type {object} */ (source))) {
    out[key] = stub(
      value,
      /** @type {Record<string, unknown>} */ (prev)[key],
      prefix ? `${prefix}.${key}` : key,
    );
  }
  return out;
}

/**
 * @param {unknown} value
 * @param {number} depth
 * @returns {string}
 */
function print(value, depth) {
  const pad = '  '.repeat(depth);
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const entries = Object.entries(/** @type {object} */ (value)).map(([key, v]) => {
    const k = /^[A-Za-z_$][\w$]*$/.test(key) ? key : `'${key}'`;
    return `${pad}  ${k}: ${print(v, depth + 1)},`;
  });
  return `{\n${entries.join('\n')}\n${pad}}`;
}

const header = `/**
 * ინგლისური ვერსიის placeholder-ები: გასაღებები ka.js-ს ემთხვევა, მნიშვნელობა — \`[EN: გასაღები]\`
 * + იგივე ცვლადები. ფაილი გენერირდება: \`npm run i18n:stub\` (თარგმნილ მნიშვნელობას ინარჩუნებს).
 */
`;

await writeFile(
  enUrl,
  `${header}const en = ${print(stub(ka, en, ''), 0)};\n\nexport default en;\n`,
);
console.log('✓ en.js განახლდა');

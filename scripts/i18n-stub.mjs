/**
 * ინგლისური ლექსიკონების სინქრონი (F9): ka.js-ის ყოველი ახალი გასაღები → en.js-ში
 * `[EN: გასაღები]` + იგივე `{ცვლადები}`; უკვე თარგმნილი მნიშვნელობა (სტრიქონი, რომელიც `[EN`-ით
 * არ იწყება, ან მრავლობითის ობიექტი `{ one, other }`) ინახება; ka.js-ში წაშლილი გასაღები
 * en.js-იდანაც იშლება. ფაილის სათავე-კომენტარი ინახება. ორი წყვილი: საიტი (`src/i18n`) და
 * ადმინი (`src/admin/i18n`). გაშვება: `npm run i18n:stub`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PAIRS = ['../src/i18n/', '../src/admin/i18n/'];

/** @param {unknown} v */
const isPlural = (v) =>
  Boolean(v) && typeof v === 'object' && typeof (/** @type {any} */ (v).other) === 'string';

/**
 * @param {unknown} source
 * @param {unknown} existing
 * @param {string} prefix
 * @returns {unknown}
 */
function stub(source, existing, prefix) {
  if (typeof source === 'string') {
    if (typeof existing === 'string' && !existing.startsWith('[EN')) return existing;
    if (isPlural(existing)) return existing;
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

const DEFAULT_HEADER = `/**
 * English strings: same keys as ka.js. Generated / synchronised by \`npm run i18n:stub\`
 * (translated values are kept; new keys get \`[EN: key]\`).
 */
`;

for (const dir of PAIRS) {
  const root = new URL(dir, import.meta.url);
  const kaUrl = new URL('ka.js', root);
  const enUrl = new URL('en.js', root);
  const { default: ka } = await import(pathToFileURL(fileURLToPath(kaUrl)).href);
  /** @type {Record<string, unknown>} */
  let en = {};
  let header = DEFAULT_HEADER;
  try {
    en = (await import(pathToFileURL(fileURLToPath(enUrl)).href)).default;
    const text = await readFile(enUrl, 'utf8');
    const match = /^\/\*\*[\s\S]*?\*\/\n/.exec(text);
    if (match) header = match[0];
  } catch {
    en = {};
  }
  await writeFile(
    enUrl,
    `${header}const en = ${print(stub(ka, en, ''), 0)};\n\nexport default en;\n`,
  );
  console.log(`✓ ${dir.replace('../', '')}en.js განახლდა`);
}

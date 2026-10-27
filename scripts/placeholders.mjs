/**
 * F7: დარჩენილი `[placeholder]`-ების აღრიცხვა ტიპების მიხედვით (`npm run placeholders`).
 *
 * წყარო — წყაროს ფაილები, სადაც ფაქტი ჯერ უცნობია: mock-ის კონტენტი (`src/content/mock/*.js`),
 * ინტერფეისის ტექსტი (`src/i18n/ka.js`), ნავიგაცია და გვერდების დამხმარეები (`src/components`,
 * `src/features`). ტესტები და `en.js` (`[EN: …]`) არ ითვლება. ერთი და იგივე სტრიქონი ერთხელ
 * ითვლება („უნიკალური“) და რამდენჯერაც გვხვდება („შემთხვევა“).
 *
 * ტიპები (პირველი დამთხვევა იგებს): ფოტო / კადრი, სახელი, რიცხვი, თარიღი / დრო, კონტაქტი,
 * ბმული / URL, ფაილი, ტექსტი (დანარჩენი — სათაურები, აღწერები, ტექსტის ბლოკები).
 *
 * `--json` — მანქანურად წასაკითხი შედეგი.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const SOURCES = [
  { group: 'mock', dir: 'src/content/mock' },
  { group: 'i18n', file: 'src/i18n/ka.js' },
  { group: 'ui', dir: 'src/components' },
  { group: 'ui', dir: 'src/features' },
  { group: 'ui', dir: 'src/pages' },
];

/**
 * ქართული ასო `\w`-ში არ შედის, ამიტომ `\b` არ გამოიყენება — შაბლონები სტრიქონის თავზეა მიბმული.
 * @type {[string, RegExp][]}
 */
const TYPES = [
  ['ფოტო / კადრი', /^(ფოტო|ვიდეოს კადრი|კადრი|ლოგო|ფოტოს წარწერა)|ფოტო:|კადრი:/],
  ['სახელი', /^(სახელი|გვარი|ავტორი|თანამდებობა|პარტნიორი)/],
  ['რიცხვი', /^(\d+|N|0+|00 KB)$/],
  ['თარიღი / დრო', /^(თარიღი|წელი|\d\d:\d\d|დღე, საათი|თვეში)/],
  ['კონტაქტი', /^(ტელეფონი|ელფოსტა|მისამართი|ნომერი|მესენჯერი)( |:|$)|^@/],
  ['ბმული / URL', /^(ბმული|en-ვერსიის)/],
  ['ფაილი', /(^|, )PDF$/],
];

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (name === '__tests__' || name.endsWith('.test.js') || name.endsWith('.test.jsx')) return [];
    if (statSync(join(ROOT, path)).isDirectory()) return walk(path);
    return /\.(js|jsx)$/.test(name) ? [path] : [];
  });
}

/** @param {string} text */
function typeOf(text) {
  return TYPES.find(([, re]) => re.test(text))?.[0] ?? 'ტექსტი';
}

/** ფრჩხილის შიგთავსი სტრიქონებიდან (კოდის `[0]`, `[key]` და მასივები — არა). */
function placeholders(source) {
  const strings = [...source.matchAll(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g)].map(([, , s]) => s);
  const found = [];
  for (const string of strings) {
    for (const [, inner] of string.matchAll(/\[([^[\]]*[\u10D0-\u10FF\d][^[\]]*)\]/g)) {
      if (/^EN:/.test(inner) || (/^\d+$/.test(inner) && string.trim() !== `[${inner}]`)) continue;
      found.push(inner.trim());
    }
  }
  return found;
}

const files = SOURCES.flatMap(({ group, dir, file }) =>
  (file ? [file] : walk(dir)).map((path) => ({ group, path })),
);

/** @type {Map<string, { type: string, count: number, groups: Set<string>, files: Set<string> }>} */
const unique = new Map();
for (const { group, path } of files) {
  for (const text of placeholders(readFileSync(join(ROOT, path), 'utf8'))) {
    const entry = unique.get(text) ?? {
      type: typeOf(text),
      count: 0,
      groups: new Set(),
      files: new Set(),
    };
    entry.count += 1;
    entry.groups.add(group);
    entry.files.add(relative(ROOT, join(ROOT, path)));
    unique.set(text, entry);
  }
}

/** @type {Record<string, { unique: number, occurrences: number, mock: number, i18n: number, ui: number, examples: string[] }>} */
const byType = {};
for (const [text, entry] of unique) {
  const row = (byType[entry.type] ??= {
    unique: 0,
    occurrences: 0,
    mock: 0,
    i18n: 0,
    ui: 0,
    examples: [],
  });
  row.unique += 1;
  row.occurrences += entry.count;
  for (const group of entry.groups) row[/** @type {'mock' | 'i18n' | 'ui'} */ (group)] += 1;
  if (row.examples.length < 3) row.examples.push(`[${text.slice(0, 48)}]`);
}

const order = [...TYPES.map(([name]) => name), 'ტექსტი'];
const rows = order.filter((name) => byType[name]).map((name) => ({ type: name, ...byType[name] }));
const total = rows.reduce(
  (sum, row) => ({
    unique: sum.unique + row.unique,
    occurrences: sum.occurrences + row.occurrences,
  }),
  { unique: 0, occurrences: 0 },
);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, total }, null, 1));
} else {
  console.log('| ტიპი | უნიკალური | შემთხვევა | mock | i18n | UI | მაგალითი |');
  console.log('|---|---|---|---|---|---|---|');
  for (const row of rows) {
    console.log(
      `| ${row.type} | ${row.unique} | ${row.occurrences} | ${row.mock} | ${row.i18n} | ${row.ui} | ${row.examples[0]} |`,
    );
  }
  console.log(`| **სულ** | **${total.unique}** | **${total.occurrences}** | | | | |`);
}

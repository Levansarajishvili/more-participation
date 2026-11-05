import '../alias.js';

/**
 * საერთო მოდულები სუფთა Node-ში (Vite / Vitest-ის გარეშე): `@/` hook, `import.meta.env`-ის
 * არარსებობა, ბრაუზერის API-ს გარეშე შესრულება. გაშვება: `node server/scripts/shared-smoke.js`
 * (ტესტი — `test/shared-modules.test.js`). წარმატება — JSON stdout-ზე, exit 0.
 */

const MODULES = [
  'validate',
  'taxonomy',
  'slug',
  'text',
  'localize',
  'forms',
  'errors',
  'model',
  'youtube',
  'vtt',
  'query',
];

/** @type {Record<string, number>} */
const exports = {};
for (const name of MODULES)
  exports[name] = Object.keys(await import(`@/content/${name}.js`)).length;

const { t } = await import('@/i18n/index.js');
const { validateContact } = await import('@/content/forms.js');
const { slugify } = await import('@/content/slug.js');
const { localize } = await import('@/content/localize.js');
const { normalizeSearch } = await import('@/content/text.js');
const { ContentError } = await import('@/content/errors.js');
const { validateVideo } = await import('@/content/validate.js');
const { parseCaptions } = await import('@/content/vtt.js');
const { parseYouTube } = await import('@/content/youtube.js');

const result = {
  node: process.versions.node,
  exports,
  // დაკარგული გასაღები: Vite-ის გარეშე `import.meta.env` არ არსებობს — ვარდნა არ უნდა მოხდეს
  missingKey: t('does.not.exist'),
  contactFields: Object.keys(validateContact({})),
  slug: slugify('ჩვევა — 5 ნაბიჯი'),
  search: normalizeSearch('ᲛᲔᲢᲘ ჩართულობა'),
  localized: localize({ title: 'სათაური', translations: { en: { title: 'Title' } } }, 'en'),
  error: new ContentError('validation').toJSON(),
  videoChecks: validateVideo(
    /** @type {any} */ ({ slug: 'x', youtube: { id: '' }, captions: [] }),
    [],
  )
    .map((issue) => issue.code)
    .sort(),
  captions: parseCaptions('WEBVTT\n\n00:00.000 --> 00:01.500\nგამარჯობა').ok,
  youtube: parseYouTube('https://youtu.be/dQw4w9WgXcQ'),
};

process.stdout.write(JSON.stringify(result));

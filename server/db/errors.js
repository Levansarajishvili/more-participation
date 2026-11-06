import { ta } from '@/admin/i18n/index.js';
import { ContentError } from '@/content/errors.js';
import { t } from '@/i18n/index.js';

/**
 * ბაზის ჩაწერის შეცდომა → `ContentError` (B1-ის კოდები / HTTP-ის ცხრილი):
 * - 11000 `type_slug_unique` → `validation`, `fields.slug` = `slugDuplicate` (ადმინის mock-ის
 *   `create`-ის იგივე კოდი და ტექსტი);
 * - 11000 `type_featured_unique` და სხვა უნიკალური ინდექსი → `conflict` (409);
 * - 121 (`$jsonSchema`) → `validation`, `fields` — ველის გზა `item`-ის მიმართ (`cover.ratio`).
 *   ჩვეულებრივ API-ის სქემა ამას ადრე იჭერს; 121 ნიშნავს, რომ ბაზა უფრო მკაცრია (მაგ. თარგმანი).
 * დანარჩენი უცვლელად ბრუნდება (→ 500).
 */

export const SCHEMA_FIELD_CODE = 'schema';

/**
 * @param {string} prefix
 * @param {string | number} key
 */
function join(prefix, key) {
  if (typeof key === 'number') return `${prefix}[${key}]`;
  return prefix ? `${prefix}.${key}` : key;
}

/** @param {string} path */
function depth(path) {
  return path ? path.split(/\.|\[/).length : 0;
}

/**
 * @typedef {{ path: string, op: string, single: boolean }} Leaf
 */

/**
 * @param {any[] | undefined} details
 * @param {string} prefix
 * @param {Leaf[]} out
 */
function collect(details, prefix, out) {
  for (const rule of details ?? []) {
    switch (rule.operatorName) {
      case 'properties':
        for (const entry of rule.propertiesNotSatisfied ?? []) {
          collect(entry.details, join(prefix, entry.propertyName), out);
        }
        break;
      case 'additionalProperties':
        for (const key of rule.additionalProperties ?? []) {
          out.push({ path: join(prefix, key), op: 'additionalProperties', single: false });
        }
        break;
      case 'required':
        for (const key of rule.missingProperties ?? []) {
          out.push({ path: join(prefix, key), op: 'required', single: false });
        }
        break;
      case 'items':
        if (rule.details) collect(rule.details, join(prefix, Number(rule.itemIndex ?? 0)), out);
        else out.push({ path: prefix, op: 'items', single: false });
        break;
      case 'oneOf':
      case 'anyOf': {
        const branches = (rule.schemasNotSatisfied ?? []).map((/** @type {any} */ branch) => {
          /** @type {Leaf[]} */
          const leaves = [];
          collect(branch.details, prefix, leaves);
          return leaves;
        });
        // დისკრიმინატორის (`type: { enum: ['articles'] }`) შეუსაბამო განშტოება — „სხვა ტიპი“
        const own = depth(prefix) + 1;
        // B4: ტიპის შეუსაბამო განშტოება (`working`: `null` | ობიექტი) — მნიშვნელობა სხვა ტიპისაა,
        // შეცდომა მეორე განშტოების შიგნითაა
        const typeOnly = (/** @type {Leaf[]} */ leaves) =>
          leaves.length > 0 &&
          leaves.every((leaf) => leaf.op === 'bsonType' && leaf.path === prefix);
        const relevant = branches.filter(
          (/** @type {Leaf[]} */ leaves) =>
            !typeOnly(leaves) &&
            !leaves.some((leaf) => leaf.op === 'enum' && leaf.single && depth(leaf.path) === own),
        );
        const pool = relevant.length ? relevant : branches;
        const best = pool.sort(
          (/** @type {Leaf[]} */ a, /** @type {Leaf[]} */ b) => a.length - b.length,
        )[0];
        if (best?.length) out.push(...best);
        else out.push({ path: prefix, op: rule.operatorName, single: false });
        break;
      }
      default:
        out.push({
          path: prefix,
          op: String(rule.operatorName),
          single: Array.isArray(rule.specifiedAs?.enum) && rule.specifiedAs.enum.length === 1,
        });
    }
  }
}

/**
 * `errInfo` (DocumentValidationFailure) → ველების გზები. `item.` / `working.item.` იჭრება (API-ის ველის გზა).
 * @param {any} errInfo
 * @returns {string[]}
 */
export function schemaErrorPaths(errInfo) {
  const details = errInfo?.details;
  if (!details) return [];
  /** @type {Leaf[]} */
  const leaves = [];
  collect(details.schemaRulesNotSatisfied, '', leaves);
  // სამუშაო ასლის ველიც (`working.item.…`, B4) — იგივე API-ის გზა, რაც მასალისა
  const paths = leaves.map(({ path }) => path.replace(/^(?:working\.)?item\./, '') || '(document)');
  return [...new Set(paths)];
}

/**
 * @param {unknown} error
 * @returns {unknown}  ContentError ან თავდაპირველი შეცდომა
 */
export function mapWriteError(error) {
  if (error instanceof ContentError) return error;
  const e = /** @type {any} */ (error ?? {});
  if (e.code === 11000) {
    const index = /index: (\S+)/.exec(String(e.message ?? ''))?.[1] ?? '';
    if (index === 'type_slug_unique') {
      return new ContentError('validation', {
        fields: {
          slug: {
            code: /** @type {any} */ ('slugDuplicate'),
            message: ta('fieldErrors.slugTaken'),
          },
        },
        detail: `duplicate slug (${index})`,
        cause: error,
      });
    }
    return new ContentError('conflict', { detail: `duplicate key (${index})`, cause: error });
  }
  if (e.code === 121) {
    const paths = schemaErrorPaths(e.errInfo);
    const message = t('errors.validation');
    return new ContentError('validation', {
      fields: Object.fromEntries(
        paths.map((path) => [path, { code: /** @type {any} */ (SCHEMA_FIELD_CODE), message }]),
      ),
      detail: `document validation: ${paths.join(', ')}`,
      cause: error,
    });
  }
  return error;
}

import { canonicalJson } from '../db/schema.js';

/**
 * იდემპოტენტური DDL (B2): კოლექცია + validator + ინდექსები. მეორე გაშვება არაფერს ცვლის და
 * ანგარიშში ყველაფერი `unchanged`-ია. ხელით დამატებულ ინდექსს მიგრაცია არ შლის — ანგარიშში
 * `extra`-დ ჩანს.
 */

/** @typedef {import('../db/collections.js').CollectionSpec} CollectionSpec */
/** @typedef {import('../db/collections.js').IndexSpec} IndexSpec */

/** @typedef {'created' | 'updated' | 'unchanged'} CollectionChange */
/** @typedef {'created' | 'updated' | 'replaced' | 'unchanged' | 'extra'} IndexChange */

/**
 * @typedef {object} CollectionReport
 * @property {string} name
 * @property {CollectionChange} collection
 * @property {{ name: string, change: IndexChange }[]} indexes
 */

export const VALIDATION_LEVEL = 'strict';
export const VALIDATION_ACTION = 'error';

/**
 * @param {Record<string, any>} existing  `listIndexes`-ის ჩანაწერი
 * @param {IndexSpec} wanted
 */
function sameShape(existing, wanted) {
  return (
    canonicalJson(existing.key) === canonicalJson(wanted.key) &&
    Boolean(existing.unique) === Boolean(wanted.unique) &&
    canonicalJson(existing.partialFilterExpression ?? null) ===
      canonicalJson(wanted.partialFilterExpression ?? null) &&
    (existing.expireAfterSeconds === undefined) === (wanted.expireAfterSeconds === undefined)
  );
}

/** @param {IndexSpec} spec */
function indexOptions(spec) {
  return {
    name: spec.name,
    ...(spec.unique && { unique: true }),
    ...(spec.partialFilterExpression && { partialFilterExpression: spec.partialFilterExpression }),
    ...(spec.expireAfterSeconds !== undefined && { expireAfterSeconds: spec.expireAfterSeconds }),
  };
}

/**
 * @param {import('mongodb').Db} db
 * @param {CollectionSpec} spec
 * @returns {Promise<CollectionReport>}
 */
export async function ensureCollection(db, spec) {
  const validator = { $jsonSchema: spec.validator };
  const options = {
    validator,
    validationLevel: VALIDATION_LEVEL,
    validationAction: VALIDATION_ACTION,
  };
  const [info] = await db.listCollections({ name: spec.name }).toArray();

  /** @type {CollectionChange} */
  let collection = 'unchanged';
  if (!info) {
    await db.createCollection(spec.name, options);
    collection = 'created';
  } else {
    const current = /** @type {any} */ (info).options ?? {};
    const same =
      canonicalJson(current.validator ?? null) === canonicalJson(validator) &&
      current.validationLevel === VALIDATION_LEVEL &&
      current.validationAction === VALIDATION_ACTION;
    if (!same) {
      await db.command({ collMod: spec.name, ...options });
      collection = 'updated';
    }
  }

  const handle = db.collection(spec.name);
  const existing = await handle.indexes();
  /** @type {{ name: string, change: IndexChange }[]} */
  const indexes = [];
  for (const wanted of spec.indexes) {
    const found = existing.find((index) => index.name === wanted.name);
    if (!found) {
      await handle.createIndex(wanted.key, indexOptions(wanted));
      indexes.push({ name: wanted.name, change: 'created' });
    } else if (!sameShape(found, wanted)) {
      await handle.dropIndex(wanted.name);
      await handle.createIndex(wanted.key, indexOptions(wanted));
      indexes.push({ name: wanted.name, change: 'replaced' });
    } else if (found.expireAfterSeconds !== wanted.expireAfterSeconds) {
      // TTL-ის ვადა (env) — ინდექსის ხელახლა აგების გარეშე
      await db.command({
        collMod: spec.name,
        index: { name: wanted.name, expireAfterSeconds: wanted.expireAfterSeconds },
      });
      indexes.push({ name: wanted.name, change: 'updated' });
    } else indexes.push({ name: wanted.name, change: 'unchanged' });
  }
  for (const index of existing) {
    if (index.name !== '_id_' && !spec.indexes.some((wanted) => wanted.name === index.name)) {
      indexes.push({ name: String(index.name), change: 'extra' });
    }
  }
  return { name: spec.name, collection, indexes };
}

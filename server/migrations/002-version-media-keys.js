import { COLLECTION } from '../db/collections.js';
import { mediaKeysOf } from '../db/derive.js';

/**
 * 002 (B5) — `versions.mediaKeys` ძველ ჩანაწერებზე (B2–B4-ში ველი არ იწერებოდა). validator-ი და
 * ინდექსი 001-ის `ensureCollection`-ით ახლდება (`defineCollections` — ერთი წყარო); აქ მხოლოდ
 * მონაცემის შევსებაა. იდემპოტენტურია: მეორე გაშვება ცარიელ ფილტრს ხვდება.
 */

export const id = '002-version-media-keys';

/**
 * @param {import('mongodb').Db} db
 * @returns {Promise<import('./ensure.js').CollectionReport[]>}
 */
export async function up(db) {
  const versions = db.collection(COLLECTION.versions);
  let changed = 0;
  for await (const doc of versions.find(
    { mediaKeys: { $exists: false } },
    { projection: { item: 1 } },
  )) {
    await versions.updateOne(
      { _id: doc._id, mediaKeys: { $exists: false } },
      { $set: { mediaKeys: mediaKeysOf(doc.item) } },
    );
    changed += 1;
  }
  return [
    { name: COLLECTION.versions, collection: changed ? 'updated' : 'unchanged', indexes: [] },
  ];
}

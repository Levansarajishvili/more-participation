import { COLLECTION } from '../db/collections.js';
import { searchTextOf } from '../db/derive.js';

/**
 * 003 (B6) — `content.searchText` ხელახლა: სტატიას ემატება საჯარო ძიების ტექსტი ორივე ენაზე
 * (`derive.js`, `query.js`-ის `articleSearchText`). validator-ის ზღვარი (`SEARCH_TEXT_MAX`) 001-ის
 * `ensureCollection`-ით ახლდება (ერთი წყარო — `defineCollections`), აქ მხოლოდ მონაცემია.
 * იდემპოტენტურია: იწერება მხოლოდ ის დოკუმენტი, რომლის ტექსტი გამოთვლილს არ ემთხვევა.
 */

export const id = '003-public-search';

/**
 * @param {import('mongodb').Db} db
 * @returns {Promise<import('./ensure.js').CollectionReport[]>}
 */
export async function up(db) {
  const content = db.collection(COLLECTION.content);
  let changed = 0;
  for await (const doc of content.find({}, { projection: { type: 1, item: 1, searchText: 1 } })) {
    const searchText = searchTextOf(doc.item, doc.type);
    if (searchText === doc.searchText) continue;
    await content.updateOne({ _id: doc._id }, { $set: { searchText } });
    changed += 1;
  }
  return [{ name: COLLECTION.content, collection: changed ? 'updated' : 'unchanged', indexes: [] }];
}

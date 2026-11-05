import { loadSpec } from '../lib/openapi.js';

import * as init from './001-init.js';

/**
 * მიგრაციების რიგი. წესი: ყოველი მიგრაცია იდემპოტენტურია (განმეორებით გაშვება უსაფრთხოა), ამიტომ
 * runner ყველას რიგით უშვებს და ცალკე „შესრულებულის“ ჩანაწერი არ სჭირდება. გაშვება —
 * `npm run server:migrate` (deploy-ის წინ, B7), dev-ის in-memory ბაზაზე — ავტომატურად.
 */

/** @typedef {import('./ensure.js').CollectionReport} CollectionReport */

export const MIGRATIONS = Object.freeze([init]);

/**
 * @param {import('mongodb').Db} db
 * @param {{ spec?: any, retention?: import('../db/collections.js').Retention }} [options]
 * @returns {Promise<{ id: string, reports: CollectionReport[] }[]>}
 */
export async function migrate(db, { spec = loadSpec(), retention } = {}) {
  const results = [];
  for (const migration of MIGRATIONS) {
    results.push({ id: migration.id, reports: await migration.up(db, { spec, retention }) });
  }
  return results;
}

/**
 * ცვლილებების რაოდენობა (`unchanged` და `extra` არ ითვლება).
 * @param {{ reports: CollectionReport[] }[]} results
 */
export function countChanges(results) {
  let changes = 0;
  for (const { reports } of results) {
    for (const report of reports) {
      if (report.collection !== 'unchanged') changes += 1;
      for (const index of report.indexes) {
        if (index.change !== 'unchanged' && index.change !== 'extra') changes += 1;
      }
    }
  }
  return changes;
}

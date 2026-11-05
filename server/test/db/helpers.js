import { inject } from 'vitest';

import { connectDb } from '../../lib/db.js';
import { migrate } from '../../migrations/index.js';

/**
 * B2-ის ტესტების დამხმარე: ცალკე ბაზა ყოველ ტესტ-ფაილზე (საერთო replica set — `inject('mongoUri')`),
 * მიგრაციით; ფიქსირებული საათი.
 */

export const T0 = Date.parse('2026-11-05T08:00:00.000Z');
export const MINUTE = 60_000;
export const DAY = 86_400_000;

/**
 * @param {string} label
 * @param {{ migrate?: boolean, retention?: import('../../db/collections.js').Retention }} [options]
 */
export async function freshDatabase(label, { migrate: run = true, retention } = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const database = await connectDb({ uri: inject('mongoUri'), dbName: `mc_${label}_${suffix}` });
  if (run) await migrate(database.db, { retention });
  return {
    ...database,
    async drop() {
      await database.db.dropDatabase();
      await database.close();
    },
  };
}

/** @param {number} [start] */
export function clock(start = T0) {
  let t = start;
  return {
    now: () => t,
    /** @param {number} [ms] */
    advance(ms = MINUTE) {
      t += ms;
      return t;
    },
  };
}

/** @param {string | number} value */
export const iso = (value) => new Date(value).toISOString();

/**
 * JSON-ის ასლი (undefined ქრება) — mock-ის ობიექტის შედარება ბაზიდან წაკითხულთან.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export const json = (value) => JSON.parse(JSON.stringify(value));

/**
 * @param {Promise<unknown>} promise
 * @returns {Promise<any>}  დაჭერილი შეცდომა
 */
export async function caught(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('შეცდომა მოსალოდნელი იყო');
}

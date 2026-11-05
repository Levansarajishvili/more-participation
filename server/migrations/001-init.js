import { defineCollections } from '../db/collections.js';

import { ensureCollection } from './ensure.js';

/**
 * 001 — 9 კოლექცია (`content`, `versions`, `users`, `sessions`, `invites`, `media`, `settings`,
 * `messages`, `subscribers`): `$jsonSchema` validator (`strict` / `error`) და ინდექსები, მათ შორის
 * TTL (`sessions`, `invites`, `messages`, `subscribers` — მხოლოდ `pending`). იდემპოტენტურია:
 * არსებული კოლექციის validator `collMod`-ით ახლდება, TTL-ის ვადა — `collMod index`-ით.
 */

export const id = '001-init';

/**
 * @param {import('mongodb').Db} db
 * @param {{ spec: any, retention?: import('../db/collections.js').Retention }} options
 * @returns {Promise<import('./ensure.js').CollectionReport[]>}
 */
export async function up(db, { spec, retention }) {
  const reports = [];
  for (const collection of defineCollections({ spec, retention })) {
    reports.push(await ensureCollection(db, collection));
  }
  return reports;
}

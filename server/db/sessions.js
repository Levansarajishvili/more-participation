import { hashToken, newToken } from '../lib/tokens.js';

import { COLLECTION } from './collections.js';

/**
 * `sessions` repository (B3). ბაზაში token არ ინახება — მხოლოდ მისი sha256 (`_id`) და CSRF
 * token-ის sha256 (`csrfHash`); ღია მნიშვნელობები ერთხელ ბრუნდება (`create`) და cookie-ში მიდის.
 *
 * ვადა (B0 #10): `expiresAt` = min(ბოლო გაგრძელება + უმოქმედობა, `maxExpiresAt`); `maxExpiresAt` =
 * შექმნა + მაქსიმუმი. გაგრძელება — მხოლოდ `extend`-ით (`POST /auth/session`): frontend-ის ტაიმერი
 * (`AuthProvider`) `expiresAt`-ს login / me / extend-იდან იღებს, ჩუმი გაგრძელება მას ვერ დაინახავდა.
 * TTL ინდექსი მხოლოდ დასუფთავებაა (Atlas — 60 წმ-ში ერთხელ) — წაკითხვისას ვადა `$gt: now`-ით მოწმდება.
 */

export const DEFAULT_SESSION = Object.freeze({ idleMs: 30 * 60_000, maxMs: 12 * 3_600_000 });

/**
 * @typedef {object} SessionDoc
 * @property {string} _id        token-ის sha256
 * @property {string} userId
 * @property {string} csrfHash   CSRF token-ის sha256
 * @property {Date} createdAt
 * @property {Date} lastSeenAt
 * @property {Date} expiresAt
 * @property {Date} maxExpiresAt
 */

/**
 * @param {{ db: import('mongodb').Db }} database
 * @param {{ now?: () => number, idleMs?: number, maxMs?: number }} [options]
 */
export function createSessionsRepository(
  { db },
  { now = Date.now, idleMs = DEFAULT_SESSION.idleMs, maxMs = DEFAULT_SESSION.maxMs } = {},
) {
  const sessions = /** @type {import('mongodb').Collection<SessionDoc>} */ (
    /** @type {unknown} */ (db.collection(COLLECTION.sessions))
  );

  return {
    /**
     * @param {string} userId
     * @returns {Promise<{ token: string, csrfToken: string, session: SessionDoc }>}
     */
    async create(userId) {
      const t = now();
      const token = newToken();
      const csrfToken = newToken();
      /** @type {SessionDoc} */
      const session = {
        _id: hashToken(token),
        userId,
        csrfHash: hashToken(csrfToken),
        createdAt: new Date(t),
        lastSeenAt: new Date(t),
        expiresAt: new Date(t + Math.min(idleMs, maxMs)),
        maxExpiresAt: new Date(t + maxMs),
      };
      await sessions.insertOne(session);
      return { token, csrfToken, session };
    },

    /**
     * მოქმედი სესია token-ით (`expiresAt > now`; `expiresAt ≤ maxExpiresAt` ყოველთვის).
     * @param {string} token
     */
    findActive: (token) =>
      sessions.findOne({ _id: hashToken(token), expiresAt: { $gt: new Date(now()) } }),

    /**
     * უმოქმედობის ვადა თავიდან, `maxExpiresAt`-ის ზემოთ არა. ამოწურულზე → null.
     * @param {string} id  token-ის hash
     */
    extend(id) {
      const t = new Date(now());
      return sessions.findOneAndUpdate(
        { _id: id, expiresAt: { $gt: t } },
        [
          {
            $set: {
              lastSeenAt: t,
              expiresAt: { $min: [new Date(t.getTime() + idleMs), '$maxExpiresAt'] },
            },
          },
        ],
        { returnDocument: 'after' },
      );
    },

    /** @param {string} id  token-ის hash */
    async remove(id) {
      return (await sessions.deleteOne({ _id: id })).deletedCount;
    },

    /** დეაქტივაცია: მომხმარებლის ყველა სესია (ASVS 7.4.2). @param {string} userId */
    async removeForUser(userId) {
      return (await sessions.deleteMany({ userId })).deletedCount;
    },
  };
}

/** @typedef {ReturnType<typeof createSessionsRepository>} SessionsRepository */

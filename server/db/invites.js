import { hashToken, newInviteCode, normalizeInviteCode } from '../lib/tokens.js';

import { COLLECTION } from './collections.js';

/**
 * `invites` repository (B3). კოდი ბაზაში მხოლოდ sha256-ით (`_id`); ღია სახით ერთხელ ბრუნდება
 * (`create` → `POST /users/invites`-ის პასუხი). ერთჯერადია: `claim` ატომურად წერს `usedAt` /
 * `usedBy`-ს და მხოლოდ გამოუყენებელ, ვადიან, (თუ მითითებულია) იმავე ელფოსტის მოწვევას იღებს.
 * TTL (`expiresAt`) ვადაგასულს შლის, გამოყენებულსაც — ვადის შემდეგ.
 */

export const DEFAULT_INVITE_TTL_MS = 7 * 86_400_000;

/**
 * @typedef {object} InviteDoc
 * @property {string} _id
 * @property {import('@/admin/api/permissions.js').Role} role
 * @property {string | null} email
 * @property {Date} createdAt
 * @property {string | null} createdBy
 * @property {Date} expiresAt
 * @property {Date | null} usedAt
 * @property {string | null} usedBy
 */

/**
 * @param {{ db: import('mongodb').Db }} database
 * @param {{ now?: () => number, ttlMs?: number }} [options]
 */
export function createInvitesRepository(
  { db },
  { now = Date.now, ttlMs = DEFAULT_INVITE_TTL_MS } = {},
) {
  const invites = /** @type {import('mongodb').Collection<InviteDoc>} */ (
    /** @type {unknown} */ (db.collection(COLLECTION.invites))
  );

  return {
    /**
     * @param {{ role: InviteDoc['role'], email: string | null, by: string | null }} input
     * @returns {Promise<{ code: string, invite: InviteDoc }>}
     */
    async create({ role, email, by }) {
      const t = now();
      const code = newInviteCode();
      /** @type {InviteDoc} */
      const invite = {
        _id: hashToken(code),
        role,
        email,
        createdAt: new Date(t),
        createdBy: by,
        expiresAt: new Date(t + ttlMs),
        usedAt: null,
        usedBy: null,
      };
      await invites.insertOne(invite);
      return { code, invite };
    },

    /**
     * @param {string} code      ჩასმული (ნორმალიზდება)
     * @param {{ email: string, userId: string, session?: import('mongodb').ClientSession }} options
     * @returns {Promise<InviteDoc | null>}  null — არასწორი / გამოყენებული / ვადაგასული / სხვა ელფოსტის
     */
    claim(code, { email, userId, session }) {
      const t = new Date(now());
      return invites.findOneAndUpdate(
        {
          _id: hashToken(normalizeInviteCode(code)),
          usedAt: null,
          expiresAt: { $gt: t },
          $or: [{ email: null }, { email }],
        },
        { $set: { usedAt: t, usedBy: userId } },
        { returnDocument: 'after', session },
      );
    },
  };
}

/** @typedef {ReturnType<typeof createInvitesRepository>} InvitesRepository */

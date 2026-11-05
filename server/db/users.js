import { ObjectId } from 'mongodb';

import { COLLECTION } from './collections.js';
import { mapWriteError } from './errors.js';

/**
 * `users` repository (B3). ელფოსტა ნორმალიზებულია (`normalizeEmail`, `forms.js`) და უნიკალური
 * (`email_unique`); `passwordHash` — მხოლოდ argon2id (validator). დოკუმენტი API-ში არასოდეს გადის —
 * მხოლოდ `toAdminUser` (ASVS 15.3.1: hash, დრო, ბოლო შესვლა პასუხში არ ხვდება).
 */

/** @typedef {import('@/admin/api/adminAdapter.js').AdminUser} AdminUser */
/** @typedef {import('@/admin/api/permissions.js').Role} Role */

/**
 * @typedef {object} UserDoc
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {string} passwordHash
 * @property {Role} role
 * @property {'active' | 'invited' | 'deactivated'} status
 * @property {Date} createdAt
 * @property {Date} updatedAt
 * @property {Date | null} [lastLoginAt]
 */

/** @returns {string} `u-` + ObjectId (24 hex) */
export function newUserId() {
  return `u-${new ObjectId().toHexString()}`;
}

/**
 * @param {UserDoc} doc
 * @returns {AdminUser}
 */
export function toAdminUser(doc) {
  return { id: doc._id, name: doc.name, email: doc.email, role: doc.role, status: doc.status };
}

/**
 * @param {{ db: import('mongodb').Db }} database
 * @param {{ now?: () => number }} [options]
 */
export function createUsersRepository({ db }, { now = Date.now } = {}) {
  const users = /** @type {import('mongodb').Collection<UserDoc>} */ (
    /** @type {unknown} */ (db.collection(COLLECTION.users))
  );
  const at = () => new Date(now());

  return {
    /** @param {string} id */
    findById: (id) => users.findOne({ _id: id }),

    /** @param {string} email  ნორმალიზებული */
    findByEmail: (email) => users.findOne({ email }),

    /** შექმნის რიგით. */
    list: () => users.find({}).sort({ createdAt: 1, _id: 1 }).toArray(),

    /**
     * @param {{ id?: string, name: string, email: string, passwordHash: string, role: Role, lastLoginAt?: Date | null }} user
     * @param {{ session?: import('mongodb').ClientSession }} [options]
     * @returns {Promise<UserDoc>}
     */
    async insert(user, { session } = {}) {
      const t = at();
      /** @type {UserDoc} */
      const doc = {
        _id: user.id ?? newUserId(),
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        status: 'active',
        createdAt: t,
        updatedAt: t,
        lastLoginAt: user.lastLoginAt ?? null,
      };
      try {
        await users.insertOne(doc, { session });
      } catch (error) {
        throw mapWriteError(error);
      }
      return doc;
    },

    /**
     * @param {string} id
     * @param {Role} role
     */
    setRole: (id, role) =>
      users.findOneAndUpdate(
        { _id: id },
        { $set: { role, updatedAt: at() } },
        { returnDocument: 'after' },
      ),

    /** @param {string} id */
    deactivate: (id) =>
      users.findOneAndUpdate(
        { _id: id },
        { $set: { status: 'deactivated', updatedAt: at() } },
        { returnDocument: 'after' },
      ),

    /**
     * წარმატებული შესვლა: `lastLoginAt`; ძველი პარამეტრების hash — ახლით (`needsRehash`).
     * @param {string} id
     * @param {{ passwordHash?: string }} [changes]
     */
    async recordLogin(id, { passwordHash } = {}) {
      const t = at();
      await users.updateOne(
        { _id: id },
        { $set: { lastLoginAt: t, ...(passwordHash && { passwordHash, updatedAt: t }) } },
      );
    },

    /** @param {Role} role */
    countActive: (role) => users.countDocuments({ role, status: 'active' }),
  };
}

/** @typedef {ReturnType<typeof createUsersRepository>} UsersRepository */

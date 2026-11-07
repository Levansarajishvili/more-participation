import { ObjectId } from 'mongodb';

import { COLLECTION } from './collections.js';
import { mapWriteError } from './errors.js';

/**
 * `messages` და `subscribers` — repository (B6). ბაზაში: შეტყობინება honeypot-ისა და თანხმობის
 * ტექსტის გარეშე (`consent: true`), TTL `createdAt`-ზე (`MESSAGES_TTL_DAYS`); გამომწერი — ელფოსტა
 * (ნორმალიზებული), `pending` → token-ის sha256 + ვადა (TTL), `confirmed` → დრო, ბმულის გარეშე.
 * დიაგნოზის / ჯანმრთელობის ველი არ არსებობს (validator: `additionalProperties: false`).
 */

/** @typedef {import('@/content/model.js').ContactPayload} ContactPayload */

/**
 * @typedef {object} FormsRepository
 * @property {(payload: ContactPayload, options: { lang: 'ka' | 'en', at: Date }) => Promise<string>} insertMessage
 *   აბრუნებს id-ს (hex)
 * @property {(id: string, at: Date) => Promise<void>} markSent
 * @property {(id: string) => Promise<void>} removeMessage
 * @property {() => Promise<number>} countMessages
 * @property {(input: { email: string, lang: 'ka' | 'en', tokenHash: string, expiresAt: Date, at: Date }) => Promise<'pending' | 'confirmed'>} subscribe
 *   `confirmed` — უკვე გამოწერილია (არაფერი იცვლება); `pending` — ახალი token ჩაიწერა
 * @property {(tokenHash: string, at: Date) => Promise<{ id: string, email: string, lang: 'ka' | 'en' } | null>} confirm
 *   ვადაგასული / უცნობი / გამოყენებული → null
 * @property {(id: string) => Promise<boolean>} removeSubscriber
 * @property {(email: string) => Promise<Record<string, any> | null>} findSubscriber
 */

/**
 * @param {{ db: import('mongodb').Db }} database
 * @returns {FormsRepository}
 */
export function createFormsRepository({ db }) {
  const messages = db.collection(COLLECTION.messages);
  const subscribers = db.collection(COLLECTION.subscribers);
  const text = (/** @type {unknown} */ value) => (typeof value === 'string' ? value.trim() : '');

  return {
    async insertMessage(payload, { lang, at }) {
      const support = text(payload.support);
      try {
        const { insertedId } = await messages.insertOne({
          name: text(payload.name),
          contact: text(payload.contact),
          topic: payload.topic,
          message: text(payload.message),
          ...(support && { support }),
          replyVia: payload.replyVia,
          consent: true,
          lang,
          createdAt: at,
          sentAt: null,
        });
        return insertedId.toHexString();
      } catch (error) {
        throw mapWriteError(error);
      }
    },

    async markSent(id, at) {
      await messages.updateOne({ _id: new ObjectId(id) }, { $set: { sentAt: at } });
    },

    async removeMessage(id) {
      await messages.deleteOne({ _id: new ObjectId(id) });
    },

    countMessages: () => messages.countDocuments(),

    async subscribe({ email, lang, tokenHash, expiresAt, at }) {
      const existing = await subscribers.findOne({ email }, { projection: { status: 1 } });
      if (existing?.status === 'confirmed') return 'confirmed';
      try {
        await subscribers.updateOne(
          { email, status: { $ne: 'confirmed' } },
          {
            $set: { status: 'pending', tokenHash, expiresAt, confirmedAt: null, lang },
            $setOnInsert: { source: 'site', createdAt: at },
          },
          { upsert: true },
        );
        return 'pending';
      } catch (error) {
        // ერთდროული დადასტურება: `confirmed` ჩანაწერი უკვე არის → upsert-ის ჩასმა email-ზე ეჯახება
        if (/** @type {{ code?: number }} */ (error).code === 11000) return 'confirmed';
        throw mapWriteError(error);
      }
    },

    async confirm(tokenHash, at) {
      const doc = await subscribers.findOneAndUpdate(
        { tokenHash, status: 'pending', expiresAt: { $gt: at } },
        { $set: { status: 'confirmed', tokenHash: null, expiresAt: null, confirmedAt: at } },
        { returnDocument: 'after' },
      );
      return doc ? { id: doc._id.toHexString(), email: doc.email, lang: doc.lang } : null;
    },

    async removeSubscriber(id) {
      const { deletedCount } = await subscribers.deleteOne({ _id: new ObjectId(id) });
      return deletedCount > 0;
    },

    findSubscriber: (email) => subscribers.findOne({ email }),
  };
}

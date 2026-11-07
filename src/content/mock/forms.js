import { ContentError } from '../errors.js';
import {
  SUBSCRIBE_CONFIRM_DAYS,
  isHoneypotFilled,
  isSubscribeToken,
  isUnsubscribeToken,
  normalizeEmail,
  subscriptionLink,
  validateContact,
  validateSubscribe,
} from '../forms.js';

/**
 * mock-ის ფორმები (B6) — სერვერის (`server/routes/forms.js`) სემანტიკა, ბაზისა და ფოსტის გარეშე:
 *
 * - `subscribe`: ვალიდაცია (`validateSubscribe`) → `pending` + ახალი token (ვადა
 *   `SUBSCRIBE_CONFIRM_DAYS`) + წერილი `outbox`-ში; უკვე `confirmed` → იგივე პასუხი, წერილის გარეშე;
 *   `pending`-ზე განმეორებით — ახალი token (ძველი აღარ მოქმედებს).
 * - `confirmSubscription`: token-ის ფორმა (`isSubscribeToken`) → `bad-request`; უცნობი / ვადაგასული /
 *   გამოყენებული → `not-found`; წარმატება → `confirmed` + მისასალმებელი წერილი გაუქმების ბმულით.
 * - `unsubscribe`: ფორმა → `bad-request`; mock-ის გაცემული token-ი არ არის → `not-found`
 *   (სერვერზე — ყალბი HMAC); სხვაგვარად ჩანაწერი იშლება, განმეორებით — იგივე `{ ok }`.
 * - `sendContact`: honeypot → `{ ok, id }` შენახვის გარეშე; ვალიდაცია (`validateContact`).
 *
 * token — 32 შემთხვევითი ბაიტი base64url (სერვერის ფორმა); გაუქმების token — `<id>.<43>`.
 */

/** @typedef {'pending' | 'confirmed'} SubscriberStatus */
/**
 * @typedef {object} MockSubscriber
 * @property {string} id
 * @property {SubscriberStatus} status
 * @property {string | null} token
 * @property {number | null} expiresAt
 * @property {'ka' | 'en'} lang
 */
/**
 * @typedef {object} MockMail
 * @property {'subscribe-confirm' | 'subscribe-welcome'} template
 * @property {string} to
 * @property {string} token
 * @property {string} link
 */

const DAY = 86_400_000;

/** @returns {string} 32 ბაიტი, base64url (43 სიმბოლო) */
function randomToken() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * @param {{ now: () => number, locale: () => 'ka' | 'en' }} options
 */
export function createMockForms({ now, locale }) {
  /** @type {Map<string, MockSubscriber>} */
  const subscribers = new Map();
  /** გაცემული გაუქმების token → გამომწერის id (წაშლის შემდეგაც — განმეორება იგივე პასუხია). */
  /** @type {Map<string, string>} */
  const unsubscribeTokens = new Map();
  /** @type {MockMail[]} */
  const outbox = [];
  let sequence = 0;
  let contactCount = 0;
  let dropped = 0;

  const nextId = () => (sequence += 1).toString(16).padStart(24, '0');

  /** @param {MockMail['template']} template @param {string} to @param {'confirm' | 'unsubscribe'} kind @param {string} token */
  const mail = (template, to, kind, token) =>
    outbox.push({ template, to, token, link: subscriptionLink('', locale(), kind, token) });

  return {
    subscribers,
    outbox,
    /** მიღებული (honeypot-ის გარეშე) შეტყობინებების რაოდენობა — ტესტებისთვის. */
    contacts: () => contactCount,

    /** @param {string} email @returns {import('../model.js').SubscribeResult} */
    subscribe(email) {
      const fields = validateSubscribe(email);
      if (Object.keys(fields).length) throw new ContentError('validation', { fields });
      const key = normalizeEmail(email);
      const existing = subscribers.get(key);
      if (existing?.status !== 'confirmed') {
        const token = randomToken();
        subscribers.set(key, {
          id: existing?.id ?? nextId(),
          status: 'pending',
          token,
          expiresAt: now() + SUBSCRIBE_CONFIRM_DAYS * DAY,
          lang: locale(),
        });
        mail('subscribe-confirm', key, 'confirm', token);
      }
      return { ok: true, status: 'pending' };
    },

    /** @param {string} token @returns {import('../model.js').ConfirmResult} */
    confirmSubscription(token) {
      if (!isSubscribeToken(token)) throw new ContentError('bad-request', { detail: 'token' });
      const found = [...subscribers].find(
        ([, s]) => s.status === 'pending' && s.token === token && Number(s.expiresAt) > now(),
      );
      if (!found) throw new ContentError('not-found', { detail: 'subscription token' });
      const [email, subscriber] = found;
      subscribers.set(email, { ...subscriber, status: 'confirmed', token: null, expiresAt: null });
      const unsubscribeToken = `${subscriber.id}.${randomToken()}`;
      unsubscribeTokens.set(unsubscribeToken, subscriber.id);
      mail('subscribe-welcome', email, 'unsubscribe', unsubscribeToken);
      return { ok: true, status: 'confirmed' };
    },

    /** @param {string} token @returns {import('../model.js').UnsubscribeResult} */
    unsubscribe(token) {
      if (!isUnsubscribeToken(token)) throw new ContentError('bad-request', { detail: 'token' });
      const id = unsubscribeTokens.get(token);
      if (!id) throw new ContentError('not-found', { detail: 'unsubscribe token' });
      for (const [email, subscriber] of subscribers) {
        if (subscriber.id === id) subscribers.delete(email);
      }
      return { ok: true };
    },

    /** @param {import('../model.js').ContactPayload} payload @returns {import('../model.js').ContactResult} */
    sendContact(payload) {
      // honeypot: ბოტს ჩვეულებრივი წარმატება ხვდება, შეტყობინება კი არ ინახება
      if (isHoneypotFilled(payload ?? {})) {
        dropped += 1;
        return { ok: true, id: `mock-dropped-${dropped}` };
      }
      const fields = validateContact(payload ?? {});
      if (Object.keys(fields).length) throw new ContentError('validation', { fields });
      contactCount += 1;
      return { ok: true, id: `mock-${contactCount}` };
    },
  };
}

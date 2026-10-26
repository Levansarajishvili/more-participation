import { fieldError } from './errors.js';
import { CONTACT_TOPICS, REPLY_CHANNELS, isOneOf } from './taxonomy.js';

/**
 * ფორმების ვალიდაცია: ერთი წესი adapter-ისთვის (სერვერის მხარე) და F6-ის ფორმისთვის
 * (კლიენტის მხარე), ერთნაირი ქართული შეტყობინებებით. დიაგნოზს არცერთი ველი არ ითხოვს.
 */

/** @typedef {import('./errors.js').FieldError} FieldError */
/** @typedef {import('./model.js').ContactPayload} ContactPayload */

export const NAME_MAX = 100;
export const CONTACT_MAX = 120;
export const MESSAGE_MAX = 4000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEmail(value) {
  return typeof value === 'string' && value.length <= CONTACT_MAX && EMAIL.test(value.trim());
}

/**
 * ტელეფონი: ციფრები, ჰარი, `+`, `-`, ფრჩხილები; 7–15 ციფრი (E.164-ის ზღვარი).
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPhone(value) {
  if (typeof value !== 'string' || !/^\+?[\d\s()-]+$/.test(value.trim())) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {unknown} email
 * @returns {Record<string, FieldError>}  ცარიელი ობიექტი — შეცდომა არ არის
 */
export function validateSubscribe(email) {
  const value = text(email);
  if (!value) return { email: fieldError('required') };
  if (!isEmail(value)) return { email: fieldError('email') };
  return {};
}

/**
 * @param {Partial<ContactPayload>} payload
 * @returns {Record<string, FieldError>}  ცარიელი ობიექტი — შეცდომა არ არის
 */
export function validateContact(payload) {
  /** @type {Record<string, FieldError>} */
  const errors = {};
  const name = text(payload.name);
  const contact = text(payload.contact);
  const message = text(payload.message);

  if (!name) errors.name = fieldError('required');
  else if (name.length > NAME_MAX) errors.name = fieldError('tooLong', { max: NAME_MAX });

  if (!contact) errors.contact = fieldError('required');
  else if (!isEmail(contact) && !isPhone(contact)) errors.contact = fieldError('contact');

  if (!isOneOf(CONTACT_TOPICS, payload.topic)) errors.topic = fieldError('option');
  if (!isOneOf(REPLY_CHANNELS, payload.replyVia)) errors.replyVia = fieldError('option');
  if (message.length > MESSAGE_MAX) errors.message = fieldError('tooLong', { max: MESSAGE_MAX });
  if (payload.consent !== true) errors.consent = fieldError('consent');

  return errors;
}

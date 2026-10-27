import { fieldError } from './errors.js';
import { CONTACT_TOPICS, REPLY_CHANNELS, isOneOf } from './taxonomy.js';

/**
 * ფორმების ვალიდაცია: ერთი წესი adapter-ისთვის (სერვერის მხარე) და F6-ის ფორმისთვის
 * (კლიენტის მხარე), ერთნაირი ქართული შეტყობინებებით. დიაგნოზს არცერთი ველი არ ითხოვს —
 * `support` მხოლოდ იმას კითხულობს, რა გამოადგება კომუნიკაციას.
 */

/** @typedef {import('./errors.js').FieldError} FieldError */
/** @typedef {import('./model.js').ContactPayload} ContactPayload */

export const NAME_MAX = 100;
export const CONTACT_MAX = 120;
export const MESSAGE_MAX = 4000;
export const SUPPORT_MAX = 1000;

/**
 * ველების რიგი ფორმაში — შეცდომების ჯამი ამ რიგით ჩამოთვლის ველებს (WCAG 3.3.1).
 * `website` (honeypot) აქ არ არის: მას ადამიანი ვერ ხედავს და შეცდომას არ აჩვენებს.
 */
export const CONTACT_FIELDS = Object.freeze([
  'name',
  'contact',
  'topic',
  'message',
  'support',
  'replyVia',
  'consent',
]);

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
 * `tel:` ბმულისთვის: ჰარები, ფრჩხილები და დეფისები ამოღებულია, `+` რჩება.
 * @param {string} phone
 * @returns {string}
 */
export function telHref(phone) {
  return `tel:${phone.trim().replace(/[\s()-]/g, '')}`;
}

/**
 * honeypot შევსებულია → ბოტია. სერვერმა შეტყობინება ჩუმად უნდა გადააგდოს (პასუხი — ჩვეულებრივი
 * წარმატება, რომ ბოტმა ვერ გაიგოს).
 * @param {Partial<ContactPayload>} payload
 * @returns {boolean}
 */
export function isHoneypotFilled(payload) {
  return typeof payload.website === 'string' && payload.website.trim() !== '';
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
 * საპასუხო არხი და საკონტაქტო ველი ერთმანეთს უნდა შეესაბამებოდეს: ელფოსტით პასუხს ელფოსტა
 * სჭირდება, ზარსა და მესიჯს — ტელეფონი; ჟესტური ენის ვიდეოზარი ორივეთი იჯავშნება.
 * მოწმდება მხოლოდ მაშინ, როცა საკონტაქტო ველი თავად სწორია (ერთ ველზე ორი შეცდომა არ ჩანს).
 * @param {string} contact
 * @param {unknown} replyVia
 * @returns {FieldError | null}
 */
function replyMismatch(contact, replyVia) {
  if (replyVia === 'email' && !isEmail(contact)) return fieldError('replyEmail');
  if ((replyVia === 'call' || replyVia === 'message') && !isPhone(contact)) {
    return fieldError('replyPhone');
  }
  return null;
}

/**
 * @param {Partial<ContactPayload>} payload
 * @returns {Record<string, FieldError>}  ცარიელი ობიექტი — შეცდომა არ არის; გასაღებები CONTACT_FIELDS-ის რიგით
 */
export function validateContact(payload) {
  /** @type {Record<string, FieldError>} */
  const errors = {};
  const name = text(payload.name);
  const contact = text(payload.contact);
  const message = text(payload.message);
  const support = text(payload.support);
  const contactValid = Boolean(contact) && (isEmail(contact) || isPhone(contact));

  if (!name) errors.name = fieldError('required');
  else if (name.length > NAME_MAX) errors.name = fieldError('tooLong', { max: NAME_MAX });

  if (!contact) errors.contact = fieldError('required');
  else if (!contactValid) errors.contact = fieldError('contact');

  if (!isOneOf(CONTACT_TOPICS, payload.topic)) errors.topic = fieldError('option');
  if (message.length > MESSAGE_MAX) errors.message = fieldError('tooLong', { max: MESSAGE_MAX });
  if (support.length > SUPPORT_MAX) errors.support = fieldError('tooLong', { max: SUPPORT_MAX });

  if (!isOneOf(REPLY_CHANNELS, payload.replyVia)) errors.replyVia = fieldError('option');
  else if (contactValid) {
    const mismatch = replyMismatch(contact, payload.replyVia);
    if (mismatch) errors.replyVia = mismatch;
  }

  if (payload.consent !== true) errors.consent = fieldError('consent');

  return errors;
}

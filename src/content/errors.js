import { t } from '@/i18n/index.js';

/**
 * adapter-ის ნორმალიზებული შეცდომა: `{ code, message }` ქართულად + ფორმის ველების შეცდომები.
 * UI მხოლოდ `code`-ით იღებს გადაწყვეტილებას, `message`-ს კი პირდაპირ აჩვენებს.
 */

/**
 * F8 (ადმინი): `unauthorized` — სესია არ არის / ამოიწურა (401), `forbidden` — როლს უფლება არ აქვს
 * (403), `conflict` — მასალა სხვამ შეცვალა (409, ვერსიის შეუსაბამობა), `rate-limited` — ძალიან ბევრი
 * მცდელობა (429; სერვერის rate limit, TODO backend).
 * @typedef {'not-found' | 'bad-request' | 'validation' | 'network' | 'server' | 'unknown' | 'unauthorized' | 'forbidden' | 'conflict' | 'rate-limited'} ErrorCode
 */
/**
 * F6: `replyEmail` / `replyPhone` — არჩეული საპასუხო არხი საკონტაქტო ველს არ შეესაბამება.
 * @typedef {'required' | 'email' | 'contact' | 'consent' | 'tooLong' | 'option' | 'replyEmail' | 'replyPhone'} FieldErrorCode
 */
/** @typedef {{ code: FieldErrorCode, message: string }} FieldError */

/** @type {readonly ErrorCode[]} */
export const ERROR_CODES = Object.freeze([
  'not-found',
  'bad-request',
  'validation',
  'network',
  'server',
  'unknown',
  'unauthorized',
  'forbidden',
  'conflict',
  'rate-limited',
]);

export class ContentError extends Error {
  /**
   * @param {ErrorCode} code
   * @param {{ fields?: Record<string, FieldError>, detail?: string, cause?: unknown }} [options]
   */
  constructor(code, { fields, detail, cause } = {}) {
    super(t(`errors.${code}`), cause === undefined ? undefined : { cause });
    this.name = 'ContentError';
    /** @type {ErrorCode} */
    this.code = code;
    /** @type {Record<string, FieldError> | undefined} ფორმის ველი → შეცდომა */
    this.fields = fields;
    /** @type {string | undefined} დეველოპერისთვის (console), UI-ში არ ჩანს */
    this.detail = detail;
  }

  /** @returns {{ code: ErrorCode, message: string, fields?: Record<string, FieldError> }} */
  toJSON() {
    return { code: this.code, message: this.message, ...(this.fields && { fields: this.fields }) };
  }
}

/**
 * ველის შეცდომა i18n-ის ტექსტით.
 * @param {FieldErrorCode} code
 * @param {Record<string, string | number>} [vars]
 * @returns {FieldError}
 */
export function fieldError(code, vars) {
  return { code, message: t(`fieldErrors.${code}`, vars) };
}

/**
 * ნებისმიერი შეცდომა → ContentError. HTTP სტატუსი (`status` / `response.status`)
 * კოდად ითარგმნება, fetch-ის TypeError — `network`-ად.
 * @param {unknown} error
 * @returns {ContentError}
 */
export function normalizeError(error) {
  if (error instanceof ContentError) return error;

  const status = /** @type {{ status?: unknown, response?: { status?: unknown } }} */ (error ?? {});
  const code = Number(status.status ?? status.response?.status);
  if (Number.isInteger(code) && code >= 400) {
    if (code === 401) return new ContentError('unauthorized', { cause: error });
    if (code === 403) return new ContentError('forbidden', { cause: error });
    if (code === 404) return new ContentError('not-found', { cause: error });
    if (code === 409) return new ContentError('conflict', { cause: error });
    if (code === 429) return new ContentError('rate-limited', { cause: error });
    if (code === 400 || code === 422) return new ContentError('bad-request', { cause: error });
    if (code >= 500) return new ContentError('server', { cause: error });
  }

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return new ContentError('network', { cause: error });
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new ContentError('network', { cause: error });
  }
  return new ContentError('unknown', {
    cause: error,
    detail: error instanceof Error ? error.message : String(error),
  });
}

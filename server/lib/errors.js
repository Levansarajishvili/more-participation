import { ContentError, ERROR_CODES, fieldError } from '@/content/errors.js';

/**
 * შეცდომის ერთი handler: ყოველი შეცდომა → `{ code, message, fields? }` (`ContentError.toJSON()`,
 * საერთო `src/content/errors.js`) და HTTP სტატუსი. სხვა ფორმა API-დან არ გამოდის.
 *
 * ajv-ის შეცდომა სხეულში → 422 `validation` + `fields` (ველის გზა → `fieldErrors.*`-ის ტექსტი), თუ
 * ყოველი შეცდომა ველს ეკუთვნის და ცნობილი სახისაა (სავალდებულო, სიგრძე, ვარიანტი); სხვა შემთხვევაში
 * (უცნობი ველი, ტიპი, query / path) → 400 `bad-request`. ტექსტში შეყვანილი მნიშვნელობა არ მეორდება.
 */

/** @typedef {import('@/content/errors.js').ErrorCode} ErrorCode */
/** @typedef {import('@/content/errors.js').FieldError} FieldError */

/** კოდი → HTTP (OpenAPI-ის ცხრილი). `network` და `unknown` მხოლოდ კლიენტისაა. */
export const STATUS_BY_CODE = Object.freeze({
  'bad-request': 400,
  unauthorized: 401,
  forbidden: 403,
  'not-found': 404,
  conflict: 409,
  validation: 422,
  'rate-limited': 429,
  server: 500,
});

/** @type {readonly ErrorCode[]} */
export const SERVER_ERROR_CODES = Object.freeze(
  /** @type {ErrorCode[]} */ (ERROR_CODES.filter((code) => code in STATUS_BY_CODE)),
);

/**
 * @param {string} code
 * @returns {number}
 */
export function statusForCode(code) {
  return STATUS_BY_CODE[/** @type {keyof typeof STATUS_BY_CODE} */ (code)] ?? 500;
}

/**
 * Fastify-ის / plugin-ის 4xx სტატუსი → კოდი. ცხრილს გარეთ (405, 413, 415…) → `bad-request`.
 * @param {number} status
 * @returns {ErrorCode}
 */
export function codeForStatus(status) {
  if (status >= 500) return 'server';
  const found = Object.entries(STATUS_BY_CODE).find(([, s]) => s === status);
  return found ? /** @type {ErrorCode} */ (found[0]) : 'bad-request';
}

/**
 * ajv-ის `instancePath` → ველის გზა ფრონტის ფორმატით: `/body/2/image/alt` → `body[2].image.alt`.
 * @param {string} instancePath
 * @param {string} [property]
 * @returns {string}
 */
export function fieldPath(instancePath, property) {
  const parts = instancePath.split('/').slice(1);
  if (property !== undefined) parts.push(property);
  return parts
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((path, part) => {
      if (/^\d+$/.test(part)) return `${path}[${part}]`;
      return path ? `${path}.${part}` : part;
    }, '');
}

/**
 * @param {import('ajv').ErrorObject} error
 * @returns {{ path: string, field: FieldError } | null}
 */
function toFieldError(error) {
  switch (error.keyword) {
    case 'required':
      return {
        path: fieldPath(error.instancePath, error.params.missingProperty),
        field: fieldError('required'),
      };
    case 'minLength':
      return error.params.limit <= 1
        ? { path: fieldPath(error.instancePath), field: fieldError('required') }
        : null;
    case 'maxLength':
      return {
        path: fieldPath(error.instancePath),
        field: fieldError('tooLong', { max: error.params.limit }),
      };
    case 'enum':
    case 'const':
      return { path: fieldPath(error.instancePath), field: fieldError('option') };
    default:
      return null;
  }
}

/** შემაჯამებელი კომბინატორები — თავად ველის შეცდომა არ არის. */
const SUMMARY_KEYWORDS = new Set(['oneOf', 'anyOf', 'allOf', 'if']);

/**
 * @param {import('ajv').ErrorObject[]} errors
 * @returns {Record<string, FieldError> | null}  null — ველებად ვერ ითარგმნა
 */
export function validationFields(errors) {
  const relevant = errors.filter((e) => !SUMMARY_KEYWORDS.has(e.keyword));
  if (!relevant.length) return null;
  /** @type {Record<string, FieldError>} */
  const fields = {};
  for (const error of relevant) {
    const mapped = toFieldError(error);
    if (!mapped || !mapped.path) return null;
    fields[mapped.path] ??= mapped.field;
  }
  return fields;
}

/**
 * @param {unknown} error
 * @returns {{ status: number, error: ContentError, internal: boolean }}
 */
export function toHttpError(error) {
  if (error instanceof ContentError) {
    const status = statusForCode(error.code);
    // `network` / `unknown` სერვერზე არ არსებობს — 500 `server`
    if (status >= 500) return { status: 500, error: new ContentError('server'), internal: true };
    return { status, error, internal: false };
  }
  const e =
    /** @type {{ validation?: unknown, validationContext?: string, statusCode?: unknown }} */ (
      error ?? {}
    );
  if (Array.isArray(e.validation)) {
    const fields = e.validationContext === 'body' ? validationFields(e.validation) : null;
    return fields
      ? { status: 422, error: new ContentError('validation', { fields }), internal: false }
      : { status: 400, error: new ContentError('bad-request'), internal: false };
  }
  const status = Number(e.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const code = codeForStatus(status);
    return { status: statusForCode(code), error: new ContentError(code), internal: false };
  }
  return { status: 500, error: new ContentError('server'), internal: true };
}

/**
 * @param {import('fastify').FastifyInstance} app
 */
export function registerErrorHandlers(app) {
  app.setErrorHandler((error, request, reply) => {
    const { status, error: body, internal } = toHttpError(error);
    if (internal) request.log.error({ err: error }, 'request failed');
    else request.log.info({ code: body.code }, 'request rejected');
    if (status === 429 && !reply.getHeader('retry-after')) reply.header('retry-after', 60);
    return reply.code(status).send(body.toJSON());
  });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send(new ContentError('not-found').toJSON()),
  );
}

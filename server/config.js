import { randomBytes } from 'node:crypto';
import { URL, fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';

/**
 * სერვერის კონფიგი — მხოლოდ env-იდან, სქემით შემოწმებული (B1). საიდუმლო (connection string,
 * გასაღები) კოდში და zip-ში არასოდეს: `.env` (git / zip-ის გარეთ) ან ჰოსტინგის env. ჩამონათვალი და
 * მაგალითები — `server/.env.example`.
 *
 * შეცდომის ტექსტი env-ის მნიშვნელობას არ იმეორებს — მხოლოდ ცვლადის სახელს და წესს.
 */

/** @typedef {'development' | 'test' | 'production'} NodeEnv */
/** @typedef {'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'} LogLevel */

/**
 * @typedef {object} Config
 * @property {NodeEnv} env
 * @property {string} host
 * @property {number} port
 * @property {LogLevel} logLevel
 * @property {number | false} trustProxy  proxy-ის რაოდენობა (Render — 1; + Cloudflare — 2)
 * @property {number} bodyLimit           JSON-ის სხეული, ბაიტი
 * @property {{ uri: string | null, dbName: string }} mongo  `uri: null` — მხოლოდ development / test
 * @property {{ messagesDays: number, versionsKeep: number }} retention  შენახვის ვადები (B0 #10, B2):
 *   კონტაქტის შეტყობინების TTL დღეებში; ვერსიების რაოდენობა თითო მასალაზე
 * @property {{ idleMs: number, maxMs: number }} session  B3: უმოქმედობა / აბსოლუტური მაქსიმუმი
 * @property {{ ttlMs: number }} invites                  B3: მოწვევის ვადა
 * @property {{ auth: RateLimit, forms: RateLimit }} rateLimit
 *   B3: `auth` — შესვლა / რეგისტრაცია (IP; შესვლაზე + ანგარიში), `forms` — საჯარო ფორმები (B6)
 * @property {MediaConfig} media  B5: ფაილების საცავი და ატვირთვის ზღვრები
 * @property {MailConfig} mail    B6: ელფოსტა (კონტაქტის წერილი, გამოწერის ბმული)
 * @property {string} publicOrigin  B6: საიტის origin წერილის ბმულისთვის (`https://…`, `/`-ის გარეშე)
 * @property {{ secret: string }} subscriptions  B6: გაუქმების ბმულის HMAC-ის საიდუმლო
 */

/**
 * @typedef {object} MailConfig
 * @property {'log' | 'file' | 'memory'} transport  log — მხოლოდ მოვლენის სახელი ლოგში (stub, B7-მდე);
 *   file — წერილი ფაილად (`dir`, dev); memory — მეხსიერება (ტესტი, `mailer.outbox`)
 * @property {string} dir     file: საქაღალდე
 * @property {string} inbox   კონტაქტის ფორმის მიმღები (`CONTACT_INBOX`, B0 #8)
 * @property {string} from    გამგზავნი (`no-reply@[დომენი]` — B7)
 */

/**
 * @typedef {object} MediaConfig
 * @property {'r2' | 'local' | 'memory'} storage  r2 — Cloudflare R2 (S3 API); local — დისკი (dev);
 *   memory — მეხსიერება (ტესტი)
 * @property {string} dir                          local: საქაღალდე
 * @property {{ endpoint: string, region: string, bucket: string, accessKeyId: string, secretAccessKey: string } | null} r2
 * @property {{ image: number, document: number, track: number }} limits  ბაიტი
 * @property {number} maxPixels
 */

/** VTT-ის ზღვარი — `src/content/vtt.js`-ის `VTT_MAX_BYTES` (F10; env-ით არ იცვლება). */
const TRACK_LIMIT = 1024 * 1024;
/** local საცავის ნაგულისხმევი საქაღალდე (git / zip-ის გარეთ). */
// `String(import.meta.url)`: Vite-ის asset-ის გარდაქმნის გარეშე (jsdom-ის ტესტი, `openapi.js`-ის იგივე)
export const DEFAULT_MEDIA_DIR = fileURLToPath(new URL('./.media/', String(import.meta.url)));
export const STORAGE_KINDS = Object.freeze(['r2', 'local', 'memory']);
/** B6: ელფოსტის გადამცემი. `resend` — B7 (დომენი, DNS: SPF / DKIM / DMARC). */
export const MAIL_TRANSPORTS = Object.freeze(['log', 'file', 'memory']);
/** file გადამცემის ნაგულისხმევი საქაღალდე (git / zip-ის გარეთ). */
export const DEFAULT_MAIL_DIR = fileURLToPath(new URL('./.mail/', String(import.meta.url)));
/** development / test: მიმღები და გამგზავნი — `.invalid` (RFC 2606: ვერასდროს მიიღება). */
const DEV_INBOX = 'inbox@example.invalid';
const DEV_FROM = 'no-reply@example.invalid';
const EMAIL_PATTERN = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$';

/** @typedef {{ max: number, windowMs: number }} RateLimit */

export const NODE_ENVS = Object.freeze(['development', 'test', 'production']);
export const LOG_LEVELS = Object.freeze([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
]);

/** env-ის სქემა: გასაღები = env ცვლადი. სხვა env ცვლადებს კონფიგი არ კითხულობს. */
export const ENV_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    NODE_ENV: { type: 'string', enum: NODE_ENVS, default: 'development' },
    HOST: { type: 'string', minLength: 1, maxLength: 255, pattern: '^[^\\s/]+$' },
    PORT: { type: 'integer', minimum: 1, maximum: 65535, default: 3000 },
    LOG_LEVEL: { type: 'string', enum: LOG_LEVELS },
    TRUST_PROXY: { type: 'integer', minimum: 0, maximum: 5, default: 0 },
    BODY_LIMIT: { type: 'integer', minimum: 1024, maximum: 10_485_760, default: 1_048_576 },
    MONGODB_URI: { type: 'string', maxLength: 2048, pattern: '^mongodb(\\+srv)?://\\S+$' },
    MONGODB_DB: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,38}$', default: 'meti-chartuloba' },
    // B0 #10 — ნაგულისხმევი, დასადასტურებელი (კონფიდენციალურობის პოლიტიკა); ცვლილება → server:migrate
    MESSAGES_TTL_DAYS: { type: 'integer', minimum: 1, maximum: 3650, default: 30 },
    VERSIONS_KEEP: { type: 'integer', minimum: 1, maximum: 1000, default: 30 },
    // B3 — B0 #10-ის ნაგულისხმევი (დასადასტურებელი): სესია 30 წთ / 12 სთ, მოწვევა 7 დღე
    SESSION_IDLE_MINUTES: { type: 'integer', minimum: 5, maximum: 720, default: 30 },
    SESSION_MAX_HOURS: { type: 'integer', minimum: 1, maximum: 24, default: 12 },
    INVITE_TTL_DAYS: { type: 'integer', minimum: 1, maximum: 30, default: 7 },
    // B3 — rate limit: [N] მცდელობა / [ვადა] (ნაგულისხმევი — დასადასტურებელი)
    RATE_LIMIT_AUTH_MAX: { type: 'integer', minimum: 1, maximum: 1000, default: 10 },
    RATE_LIMIT_AUTH_WINDOW_SECONDS: { type: 'integer', minimum: 1, maximum: 86_400, default: 900 },
    RATE_LIMIT_FORMS_MAX: { type: 'integer', minimum: 1, maximum: 1000, default: 10 },
    RATE_LIMIT_FORMS_WINDOW_SECONDS: { type: 'integer', minimum: 1, maximum: 86_400, default: 600 },
    // B5 — ფაილების საცავი: ცარიელი → production: r2, development: local, test: memory
    MEDIA_STORAGE: { type: 'string', enum: STORAGE_KINDS },
    MEDIA_DIR: { type: 'string', minLength: 1, maxLength: 1024 },
    // Cloudflare R2 (S3 API, SigV4): https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com/<R2_BUCKET>;
    // R2_ENDPOINT — სხვა S3-თავსებადი მისამართი (ტესტი, MinIO)
    R2_ACCOUNT_ID: { type: 'string', pattern: '^[0-9a-f]{32}$' },
    R2_ENDPOINT: { type: 'string', maxLength: 512, pattern: '^https?://[^\\s/?#]+/?$' },
    R2_BUCKET: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' },
    R2_ACCESS_KEY_ID: { type: 'string', pattern: '^[A-Za-z0-9]{16,128}$' },
    R2_SECRET_ACCESS_KEY: { type: 'string', pattern: '^\\S{16,256}$' },
    // ატვირთვის ზღვრები — [MB], ნაგულისხმევი დასადასტურებელი; VTT — 1 MB (F10)
    MEDIA_MAX_IMAGE_MB: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
    MEDIA_MAX_DOCUMENT_MB: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    // სურათის მეგაპიქსელები (მეხსიერება: 40 MP ≈ 120 MB გაშლილი)
    MEDIA_MAX_MEGAPIXELS: { type: 'integer', minimum: 1, maximum: 100, default: 40 },
    // B6 — ელფოსტა: log | file | memory (ცარიელი → production: log, development: file, test: memory)
    MAIL_TRANSPORT: { type: 'string', enum: MAIL_TRANSPORTS },
    MAIL_DIR: { type: 'string', minLength: 1, maxLength: 1024 },
    // კონტაქტის ფორმის მიმღები (B0 #8) და გამგზავნი — მხოლოდ env-ში
    CONTACT_INBOX: { type: 'string', maxLength: 254, pattern: EMAIL_PATTERN },
    MAIL_FROM: { type: 'string', maxLength: 254, pattern: EMAIL_PATTERN },
    // საიტის origin წერილის ბმულისთვის: https://[დომენი] (staging — *.onrender.com)
    PUBLIC_ORIGIN: { type: 'string', maxLength: 255, pattern: '^https?://[^\\s/?#]+$' },
    // გაუქმების ბმულის HMAC-SHA256-ის საიდუმლო (≥ 32 სიმბოლო; შეცვლა ძველ ბმულებს აუქმებს)
    SUBSCRIBE_SECRET: { type: 'string', pattern: '^\\S{32,256}$' },
  },
  allOf: [
    // წარმოებაში in-memory ბაზა არ არსებობს — connection string სავალდებულოა; ფაილები — მხოლოდ R2
    // (Render-ის დისკი deploy-ზე იშლება)
    {
      if: { properties: { NODE_ENV: { const: 'production' } }, required: ['NODE_ENV'] },
      then: {
        // B6: წერილის მიმღები, ბმულის origin (https) და გაუქმების საიდუმლო; ფოსტა — `log` (B7: resend)
        required: ['MONGODB_URI', 'CONTACT_INBOX', 'PUBLIC_ORIGIN', 'SUBSCRIBE_SECRET'],
        properties: {
          MEDIA_STORAGE: { const: 'r2' },
          MAIL_TRANSPORT: { const: 'log' },
          PUBLIC_ORIGIN: { type: 'string', pattern: '^https://' },
        },
      },
    },
    {
      if: {
        anyOf: [
          { properties: { MEDIA_STORAGE: { const: 'r2' } }, required: ['MEDIA_STORAGE'] },
          {
            properties: { NODE_ENV: { const: 'production' } },
            required: ['NODE_ENV'],
            not: { required: ['MEDIA_STORAGE'] },
          },
        ],
      },
      then: {
        required: ['R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
        anyOf: [{ required: ['R2_ACCOUNT_ID'] }, { required: ['R2_ENDPOINT'] }],
      },
    },
  ],
  additionalProperties: false,
});

export const ENV_KEYS = Object.freeze(Object.keys(ENV_SCHEMA.properties));

export class ConfigError extends Error {
  /** @param {string[]} problems */
  constructor(problems) {
    super(`env არასწორია — ${problems.join('; ')}`);
    this.name = 'ConfigError';
    /** @type {string[]} */
    this.problems = problems;
  }
}

const ajv = new Ajv2020({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
  strict: true,
  strictRequired: false,
});
const validateEnv = ajv.compile(ENV_SCHEMA);

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {Readonly<Config>}
 */
export function loadConfig(env = process.env) {
  /** @type {Record<string, unknown>} */
  const input = {};
  for (const key of ENV_KEYS) {
    const value = env[key];
    if (value !== undefined && value.trim() !== '') input[key] = value.trim();
  }
  if (!validateEnv(input)) {
    const problems = (validateEnv.errors ?? []).map((error) => {
      const key = error.instancePath.replace(/^\//, '') || error.params.missingProperty || 'env';
      if (error.keyword === 'required') return `${error.params.missingProperty}: სავალდებულოა`;
      if (error.keyword === 'pattern') return `${key}: ფორმატი არასწორია`;
      if (error.keyword === 'enum')
        return `${key}: დასაშვებია ${error.params.allowedValues.join(' | ')}`;
      if (error.keyword === 'const') return `${key}: დასაშვებია ${error.params.allowedValue}`;
      if (error.keyword === 'anyOf' || error.keyword === 'if') return 'env:';
      return `${key}: ${error.message}`;
    });
    throw new ConfigError([...new Set(problems)].filter((p) => !p.startsWith('env:')));
  }
  const idleMinutes = /** @type {number} */ (input.SESSION_IDLE_MINUTES);
  const maxHours = /** @type {number} */ (input.SESSION_MAX_HOURS);
  if (idleMinutes > maxHours * 60) {
    throw new ConfigError(['SESSION_IDLE_MINUTES: SESSION_MAX_HOURS-ზე მეტი ვერ იქნება']);
  }
  /** @param {string} max @param {string} window @returns {Readonly<RateLimit>} */
  const limit = (max, window) =>
    Object.freeze({
      max: /** @type {number} */ (input[max]),
      windowMs: /** @type {number} */ (input[window]) * 1000,
    });
  const nodeEnv = /** @type {NodeEnv} */ (input.NODE_ENV);
  const storage = /** @type {MediaConfig['storage']} */ (
    input.MEDIA_STORAGE ??
      (nodeEnv === 'production' ? 'r2' : nodeEnv === 'test' ? 'memory' : 'local')
  );
  if (storage === 'r2' && !input.R2_ACCOUNT_ID && !input.R2_ENDPOINT) {
    throw new ConfigError(['R2_ACCOUNT_ID ან R2_ENDPOINT: სავალდებულოა']);
  }
  const r2 =
    storage === 'r2'
      ? Object.freeze({
          endpoint: String(
            input.R2_ENDPOINT ?? `https://${input.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          ).replace(/\/$/, ''),
          // R2-ის რეგიონი SigV4-ში — `auto`
          region: 'auto',
          bucket: /** @type {string} */ (input.R2_BUCKET),
          accessKeyId: /** @type {string} */ (input.R2_ACCESS_KEY_ID),
          secretAccessKey: /** @type {string} */ (input.R2_SECRET_ACCESS_KEY),
        })
      : null;
  const megabytes = (/** @type {string} */ key) => /** @type {number} */ (input[key]) * 1024 * 1024;
  const mailTransport = /** @type {MailConfig['transport']} */ (
    input.MAIL_TRANSPORT ??
      (nodeEnv === 'production' ? 'log' : nodeEnv === 'test' ? 'memory' : 'file')
  );
  return Object.freeze({
    env: nodeEnv,
    // PaaS (Render, Fly) კონტეინერში 0.0.0.0-ზე უსმენს; ლოკალურად — მხოლოდ ამ კომპიუტერზე
    host: /** @type {string} */ (
      input.HOST ?? (nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1')
    ),
    port: /** @type {number} */ (input.PORT),
    logLevel: /** @type {LogLevel} */ (input.LOG_LEVEL ?? (nodeEnv === 'test' ? 'silent' : 'info')),
    trustProxy: input.TRUST_PROXY ? /** @type {number} */ (input.TRUST_PROXY) : false,
    bodyLimit: /** @type {number} */ (input.BODY_LIMIT),
    mongo: Object.freeze({
      uri: /** @type {string | undefined} */ (input.MONGODB_URI) ?? null,
      dbName: /** @type {string} */ (input.MONGODB_DB),
    }),
    retention: Object.freeze({
      messagesDays: /** @type {number} */ (input.MESSAGES_TTL_DAYS),
      versionsKeep: /** @type {number} */ (input.VERSIONS_KEEP),
    }),
    session: Object.freeze({ idleMs: idleMinutes * 60_000, maxMs: maxHours * 3_600_000 }),
    invites: Object.freeze({ ttlMs: /** @type {number} */ (input.INVITE_TTL_DAYS) * 86_400_000 }),
    rateLimit: Object.freeze({
      auth: limit('RATE_LIMIT_AUTH_MAX', 'RATE_LIMIT_AUTH_WINDOW_SECONDS'),
      forms: limit('RATE_LIMIT_FORMS_MAX', 'RATE_LIMIT_FORMS_WINDOW_SECONDS'),
    }),
    media: Object.freeze({
      storage,
      dir: /** @type {string | undefined} */ (input.MEDIA_DIR) ?? DEFAULT_MEDIA_DIR,
      r2,
      limits: Object.freeze({
        image: megabytes('MEDIA_MAX_IMAGE_MB'),
        document: megabytes('MEDIA_MAX_DOCUMENT_MB'),
        track: TRACK_LIMIT,
      }),
      maxPixels: /** @type {number} */ (input.MEDIA_MAX_MEGAPIXELS) * 1_000_000,
    }),
    mail: Object.freeze({
      transport: mailTransport,
      dir: /** @type {string | undefined} */ (input.MAIL_DIR) ?? DEFAULT_MAIL_DIR,
      inbox: /** @type {string | undefined} */ (input.CONTACT_INBOX) ?? DEV_INBOX,
      from: /** @type {string | undefined} */ (input.MAIL_FROM) ?? DEV_FROM,
    }),
    publicOrigin:
      /** @type {string | undefined} */ (input.PUBLIC_ORIGIN) ?? 'http://localhost:5173',
    // development / test: საიდუმლო პროცესის სიცოცხლეზე (გადატვირთვის შემდეგ ძველი ბმული აღარ მუშაობს)
    subscriptions: Object.freeze({
      secret:
        /** @type {string | undefined} */ (input.SUBSCRIBE_SECRET) ??
        randomBytes(32).toString('base64url'),
    }),
  });
}

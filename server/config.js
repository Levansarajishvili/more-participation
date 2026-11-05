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
 */

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
  },
  // წარმოებაში in-memory ბაზა არ არსებობს — connection string სავალდებულოა
  if: { properties: { NODE_ENV: { const: 'production' } }, required: ['NODE_ENV'] },
  then: { required: ['MONGODB_URI'] },
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
      return `${key}: ${error.message}`;
    });
    throw new ConfigError([...new Set(problems)].filter((p) => !p.startsWith('env:')));
  }
  const nodeEnv = /** @type {NodeEnv} */ (input.NODE_ENV);
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
  });
}

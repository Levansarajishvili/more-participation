/**
 * structured logging (pino, JSON ერთ ხაზზე) — პერსონალური მონაცემის გარეშე (§12, B0 #10):
 * IP, ელფოსტა, სახელი, cookie, header-ები, მოთხოვნის სხეული და query-ს მნიშვნელობები ლოგში არ
 * იწერება. მოთხოვნიდან — მხოლოდ მეთოდი, route-ის შაბლონი (`/api/v1/articles/:slug`, არა slug),
 * სტატუსი, ხანგრძლივობა და `reqId`.
 *
 * წარმოებაში შეცდომის ტექსტიც არ იწერება (MongoDB-ის `E11000 … dup key: { email: … }` ელფოსტას
 * შეიცავს) — მხოლოდ ტიპი, კოდი და stack-ის ჩარჩოები. `redact` — დამცავი ბადე, თუ ვინმე ობიექტს
 * ასეთი ველით მაინც დალოგავს.
 */

/** ველები, რომლებიც ლოგში ნებისმიერ სიღრმეზე `[redacted]`-ით იცვლება (pino redact, 2 დონე). */
export const REDACT_KEYS = Object.freeze([
  'email',
  'name',
  'contact',
  'message',
  'support',
  'password',
  'phone',
  'ip',
  'cookie',
  'authorization',
  'token',
]);

/**
 * @param {{ type?: string, name?: string, code?: unknown, statusCode?: unknown, message?: string, stack?: string }} err
 * @param {boolean} production
 */
export function serializeError(err, production) {
  if (!err || typeof err !== 'object') return { type: typeof err };
  const frames = String(err.stack ?? '')
    .split('\n')
    .filter((line) => /^\s+at /.test(line))
    .slice(0, 15)
    .map((line) => line.trim());
  return {
    type: err.name ?? 'Error',
    ...(err.code !== undefined && { code: String(err.code) }),
    ...(err.statusCode !== undefined && { statusCode: Number(err.statusCode) }),
    // `detail` და არა `message`: `message` redact-ის სიაშია (კონტაქტის ფორმის ველი)
    ...(!production && err.message && { detail: err.message }),
    stack: frames,
  };
}

/**
 * Fastify-ის `logger` ოფცია.
 * @param {object} options
 * @param {string} options.level
 * @param {boolean} options.production
 * @param {import('node:stream').Writable} [options.stream]  ტესტში — ლოგის დაჭერა
 */
export function loggerOptions({ level, production, stream }) {
  return {
    level,
    ...(stream && { stream }),
    base: { service: 'mc-api' },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    serializers: {
      // Fastify-ის ნაგულისხმევი req-serializer URL-ს, IP-ს და host-ს წერს — ჩანაცვლებულია
      req: (/** @type {any} */ req) => ({
        method: req.method,
        route: req.routeOptions?.url ?? null,
      }),
      res: (/** @type {any} */ reply) => ({ statusCode: reply.statusCode }),
      err: (/** @type {any} */ err) => serializeError(err, production),
    },
    redact: {
      paths: REDACT_KEYS.flatMap((key) => [key, `*.${key}`]),
      censor: '[redacted]',
    },
  };
}

/**
 * ერთი ხაზი ყოველ პასუხზე (Fastify-ის ნაგულისხმევი „incoming request / request completed“
 * გათიშულია — ის URL-ს და IP-ს წერს).
 * @param {import('fastify').FastifyInstance} app
 */
export function registerRequestLog(app) {
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? null,
        statusCode: reply.statusCode,
        ms: Math.round(reply.elapsedTime),
      },
      'request',
    );
  });
}

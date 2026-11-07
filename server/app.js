import { randomUUID } from 'node:crypto';

import Fastify, { LogController } from 'fastify';

import { createRepositories } from './db/index.js';
import { registerAuth } from './lib/auth.js';
import { registerErrorHandlers } from './lib/errors.js';
import { loggerOptions, registerRequestLog } from './lib/logger.js';
import { createAjv, loadSpec } from './lib/openapi.js';
import { createRateLimiter } from './lib/rate-limit.js';
import { registerSecurity } from './lib/security.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerContentRoutes } from './routes/content.js';
import { registerHealth } from './routes/health.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerFormRoutes } from './routes/forms.js';
import { registerPublicRoutes } from './routes/public.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerUsersRoutes } from './routes/users.js';
import { createMailer } from './mail/index.js';
import { createStorage } from './storage/index.js';

/**
 * Fastify-ის აპი (B1): ვალიდაცია spec-იდან, header-ები, ლოგი, შეცდომის handler, health.
 * B3: cookie, guard-ები spec-იდან (`security`, `x-permission`, `x-rate-limit` — `lib/auth.js`),
 * auth / users. B4: კონტენტი (`routes/content.js`), პარამეტრები და ანგარიშები (`routes/settings.js`).
 * B5: მედია (`routes/media.js`) + ფაილის მიწოდება `/media/*`, საცავი — `app.storage`
 * (`storage/index.js`). B6: საჯარო API `/api/v1/*` (`routes/public.js`) — ETag + მოკლე ქეში;
 * ფორმები (`routes/forms.js`) — გამოწერა double opt-in-ით, კონტაქტი; ელფოსტა — `app.mailer`.
 * ყოველი route `route(app, spec, operationId, handler)`-ით — guard-ს ავტომატურად იღებს.
 */

/** @typedef {import('./config.js').Config} Config */

/**
 * @typedef {object} AppOptions
 * @property {Readonly<Config>} config
 * @property {import('mongodb').Db | null} [db]       null — ბაზა არ არის (health → 503)
 * @property {any} [spec]                              ნაგულისხმევი — `server/openapi.yaml`
 * @property {import('node:stream').Writable} [logStream]  ტესტი: ლოგის დაჭერა
 * @property {(app: import('fastify').FastifyInstance) => void | Promise<void>} [extend]
 *   ტესტი: დამატებითი route-ები შეცდომის handler-ის რეგისტრაციის შემდეგ
 * @property {() => number} [now]  საათი (სესია, მოწვევა, rate limit); ტესტში — მართვადი
 * @property {import('./storage/index.js').Storage} [storage]  B5: ნაგულისხმევი — `config.media`-დან
 * @property {import('./mail/index.js').Mailer} [mailer]  B6: ნაგულისხმევი — `config.mail`-დან
 */

/**
 * @param {AppOptions} options
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function buildApp({
  config,
  db = null,
  spec = loadSpec(),
  logStream,
  extend,
  now = Date.now,
  storage = createStorage(config.media, { now }),
  mailer,
}) {
  const app = Fastify({
    logger: loggerOptions({
      level: config.logLevel,
      production: config.env === 'production',
      stream: logStream,
    }),
    // Fastify-ის „incoming request / request completed“ URL-ს და IP-ს წერს — გათიშულია,
    // ერთ ხაზს `registerRequestLog` წერს
    logController: new LogController({ disableRequestLogging: true, requestIdLogLabel: 'reqId' }),
    genReqId: () => randomUUID(),
    trustProxy: config.trustProxy,
    bodyLimit: config.bodyLimit,
    requestTimeout: 30_000,
    return503OnClosing: true,
  });

  // query / path — სტრიქონი → რიცხვი / boolean; body — ტიპი ზუსტად, დამატებითი ველი → შეცდომა
  const bodyAjv = createAjv(spec);
  const paramsAjv = createAjv(spec, { coerceTypes: true });
  app.setValidatorCompiler(({ schema, httpPart }) =>
    (httpPart === 'body' ? bodyAjv : paramsAjv).compile(schema),
  );

  /** @type {{ method: string, url: string, operationId: string | null }[]} */
  const apiRoutes = [];
  app.addHook('onRoute', (options) => {
    // მხოლოდ API (spec-ის ოპერაციები); `/media/*` — ფაილის მიწოდება (B5), spec-ში არ არის
    if (!options.url.startsWith('/api/')) return;
    for (const method of [options.method].flat()) {
      if (method === 'HEAD') continue;
      apiRoutes.push({
        method,
        url: options.url,
        operationId: /** @type {any} */ (options.config)?.operationId ?? null,
      });
    }
  });

  app.decorate('config', config);
  app.decorate('db', db);
  app.decorate('spec', spec);
  app.decorate('apiRoutes', apiRoutes);
  app.decorate('now', now);
  app.decorate('storage', storage);
  // B6: ელფოსტა — ლოგი მხოლოდ მოვლენით (`mail/index.js`)
  app.decorate('mailer', mailer ?? createMailer(config.mail, { logger: app.log }));
  app.decorate(
    'repos',
    db
      ? createRepositories(
          { client: db.client, db },
          {
            now,
            keepVersions: config.retention.versionsKeep,
            session: config.session,
            invites: config.invites,
          },
        )
      : null,
  );
  app.decorate('rateLimits', {
    auth: createRateLimiter({ ...config.rateLimit.auth, now }),
    forms: createRateLimiter({ ...config.rateLimit.forms, now }),
  });

  registerRequestLog(app);
  await registerSecurity(app);
  registerErrorHandlers(app);
  await registerAuth(app);
  registerHealth(app, { spec });
  // spec-ის რიგით (openapi.test.js): health → საჯარო (B6) → auth → content / items (B4) → media (B5)
  // → users → settings / reports
  registerPublicRoutes(app);
  registerFormRoutes(app);
  registerAuthRoutes(app);
  registerContentRoutes(app);
  await registerMediaRoutes(app);
  registerUsersRoutes(app);
  registerSettingsRoutes(app);
  if (extend) await extend(app);
  return app;
}

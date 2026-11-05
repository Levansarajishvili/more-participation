import { randomUUID } from 'node:crypto';

import Fastify, { LogController } from 'fastify';

import { registerErrorHandlers } from './lib/errors.js';
import { loggerOptions, registerRequestLog } from './lib/logger.js';
import { createAjv, loadSpec } from './lib/openapi.js';
import { registerSecurity } from './lib/security.js';
import { registerHealth } from './routes/health.js';

/**
 * Fastify-ის აპი (B1): ვალიდაცია spec-იდან, header-ები, ლოგი, შეცდომის handler, health.
 * B3–B6-ის route-ები აქ ერთვება `route(app, spec, operationId, handler)`-ით.
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
 */

/**
 * @param {AppOptions} options
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function buildApp({ config, db = null, spec = loadSpec(), logStream, extend }) {
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

  registerRequestLog(app);
  await registerSecurity(app);
  registerErrorHandlers(app);
  registerHealth(app, { spec });
  if (extend) await extend(app);
  return app;
}

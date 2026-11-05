import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';
import { connectDb, replicaSetName } from './lib/db.js';

/**
 * სერვერის გაშვება: config → ბაზა → აპი → listen; SIGTERM / SIGINT — მოწესრიგებული გაჩერება
 * (ახალ მოთხოვნას 503, მიმდინარე სრულდება, კავშირები იხურება).
 */

export const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * გაშვების შეცდომა ტექსტად — მნიშვნელობის (connection string, პაროლი) გარეშე.
 * @param {unknown} error
 * @returns {string}
 */
export function describeStartupError(error) {
  if (error instanceof ConfigError) return error.message;
  const e = /** @type {{ name?: string, code?: unknown }} */ (error ?? {});
  const name = e.name ?? 'Error';
  if (/^Mongo/.test(name))
    return `${name} — ბაზასთან კავშირი ვერ დამყარდა (MONGODB_URI, ქსელი, IP access list)`;
  return e.code ? `${name} (${String(e.code)})` : name;
}

/**
 * @param {{ env?: Record<string, string | undefined>, signals?: boolean }} [options]
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function main({ env = process.env, signals = true } = {}) {
  const config = loadConfig(env);

  /** @type {{ uri: string, stop: () => Promise<void> } | null} */
  let memory = null;
  let uri = config.mongo.uri;
  if (!uri) {
    const { startMemoryReplicaSet } = await import('./lib/dev-db.js');
    memory = await startMemoryReplicaSet();
    uri = memory.uri;
  }

  const database = await connectDb({ uri, dbName: config.mongo.dbName });
  const app = await buildApp({ config, db: database.db });
  app.addHook('onClose', async () => {
    await database.close();
    await memory?.stop();
  });

  if (memory) {
    app.log.warn(
      'MONGODB_URI არ არის — დროებითი in-memory ბაზა (მონაცემი გადატვირთვისას იკარგება)',
    );
  }
  const setName = await replicaSetName(database.db);
  if (!setName) app.log.warn('ბაზა replica set არ არის — ტრანზაქციები (B4) ვერ იმუშავებს');

  await app.listen({ host: config.host, port: config.port });

  if (signals) {
    let closing = false;
    const shutdown = (/** @type {string} */ signal) => {
      if (closing) return;
      closing = true;
      app.log.info({ signal }, 'shutting down');
      const force = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
      force.unref();
      app.close().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    };
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  }
  return app;
}

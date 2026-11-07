import { buildApp } from './app.js';
import { ConfigError, loadConfig } from './config.js';
import { connectDb, replicaSetName } from './lib/db.js';

/**
 * სერვერის გაშვება: config → ბაზა → (B7: `MIGRATE_ON_START` — მიგრაცია + საბაზისო ჩანაწერები) → აპი
 * (B7: frontend-ის build — `SITE_DIR`) → listen; SIGTERM / SIGINT — მოწესრიგებული გაჩერება (ახალ
 * მოთხოვნას 503, მიმდინარე სრულდება, კავშირები იხურება). Render-ი SIGTERM-ს ძველ ინსტანციას ტრაფიკის
 * გადართვიდან 60 წამში უგზავნის და SIGKILL-მდე 30 წამს ელოდება — `SHUTDOWN_TIMEOUT_MS` (10 წმ) ამაში
 * ეტევა. B7: დაუჭერელი შეცდომა (`uncaughtException` / `unhandledRejection`) → ლოგი (ტიპი, კოდი, stack —
 * ტექსტისა და მონაცემის გარეშე) და გაჩერება კოდით 1 — ჰოსტინგი სერვისს თავიდან უშვებს.
 */

export const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * გაშვების შეცდომა ტექსტად — მნიშვნელობის (connection string, პაროლი) გარეშე.
 * @param {unknown} error
 * @returns {string}
 */
export function describeStartupError(error) {
  if (error instanceof ConfigError) return error.message;
  const e = /** @type {{ name?: string, code?: unknown, message?: string }} */ (error ?? {});
  const name = e.name ?? 'Error';
  // B7: build-ის შეცდომის ტექსტი მნიშვნელობას (გზას) არ შეიცავს
  if (name === 'SiteError') return String(e.message);
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
  // B7: pre-deploy-ის გარეშე ჰოსტინგი (Render Free, Fly.io) — `server:migrate`-ის იგივე ნაბიჯები
  /** @type {Awaited<ReturnType<typeof import('./db/base.js').prepareDatabase>> | null} */
  let prepared = null;
  if (!memory && config.migrateOnStart) {
    const { prepareDatabase } = await import('./db/base.js');
    prepared = await prepareDatabase(database, { retention: config.retention });
  }
  // B2: in-memory ბაზა ცარიელია — მიგრაცია + mock-ის seed, რომ dev-ის API მონაცემით გაეშვას
  let seeded = 0;
  if (memory) {
    const { migrate } = await import('./migrations/index.js');
    const { seedDatabase } = await import('./db/seed.js');
    await migrate(database.db, { retention: config.retention });
    const { counts } = await seedDatabase(database);
    seeded = Object.values(counts).reduce((sum, n) => sum + n, 0);
  }
  // B3: in-memory ბაზაზე მომხმარებელი არ არის — ადმინისტრატორი env-იდან (ADMIN_EMAIL / ADMIN_NAME /
  // ADMIN_PASSWORD), თუ მითითებულია; ნაგულისხმევი ანგარიში / პაროლი არ არსებობს
  let admin = 'none';
  if (memory && env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    const { createRepositories } = await import('./db/index.js');
    const { createFirstAdmin } = await import('./lib/first-admin.js');
    await createFirstAdmin(createRepositories(database), {
      email: env.ADMIN_EMAIL,
      name: env.ADMIN_NAME || 'ადმინისტრატორი',
      password: env.ADMIN_PASSWORD,
    });
    admin = 'created';
  }
  /** @type {import('fastify').FastifyInstance} */
  let app;
  try {
    app = await buildApp({ config, db: database.db });
  } catch (error) {
    await database.close();
    await memory?.stop();
    throw error;
  }
  app.addHook('onClose', async () => {
    await database.close();
    await memory?.stop();
  });

  if (memory) {
    app.log.warn(
      'MONGODB_URI არ არის — დროებითი in-memory ბაზა (მონაცემი გადატვირთვისას იკარგება)',
    );
    app.log.info({ seeded }, 'in-memory ბაზა: მიგრაცია + seed (mock-ის მონაცემი)');
    if (admin === 'none') {
      app.log.warn(
        'ადმინისტრატორი არ არის — dev: ADMIN_EMAIL / ADMIN_NAME / ADMIN_PASSWORD env-ით გაუშვი',
      );
    } else app.log.info({ admin }, 'in-memory ბაზა: ადმინისტრატორი env-იდან');
  }
  if (prepared) {
    const { countChanges } = await import('./migrations/index.js');
    app.log.info({
      event: 'migrate',
      changes: countChanges(prepared.migrations),
      basePages: prepared.base.pages.length,
      baseSettings: prepared.base.settings,
    });
  }
  app.log.info({
    event: 'startup',
    env: config.env,
    // Render-ის build-ის commit (არასავალდებულო) — რომელი ვერსია მუშაობს (rollback-ის შემოწმება)
    commit: env.RENDER_GIT_COMMIT ? env.RENDER_GIT_COMMIT.slice(0, 7) : null,
    site: Boolean(app.site),
    indexing: config.site.indexing,
    mail: config.mail.transport,
    storage: config.media.storage,
  });
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
        () => process.exit(process.exitCode ?? 0),
        () => process.exit(1),
      );
    };
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
    /** @param {string} event @returns {(error: unknown) => void} */
    const crash = (event) => (error) => {
      app.log.fatal({ event, err: error });
      process.exitCode = 1;
      shutdown(event);
    };
    process.on('uncaughtException', crash('uncaughtException'));
    process.on('unhandledRejection', crash('unhandledRejection'));
  }
  return app;
}

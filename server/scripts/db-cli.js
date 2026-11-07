import { ContentError } from '@/content/errors.js';

import { loadConfig } from '../config.js';
import { connectDb } from '../lib/db.js';
import { describeStartupError } from '../main.js';

/**
 * ბაზის CLI-ების საერთო ნაწილი (`migrate.js`, `seed.js`): config env-იდან (`server/.env` —
 * `--env-file-if-exists`), კავშირი `MONGODB_URI`-ით, შეცდომა — ტექსტი მნიშვნელობის (connection
 * string) გარეშე, exit 1. in-memory ბაზა აქ არ ეშვება: სკრიპტის მონაცემი დასრულებისას გაქრებოდა.
 */

export class CliError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'CliError';
  }
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function describeCliError(error) {
  const name = /** @type {any} */ (error)?.name;
  if (error instanceof CliError || name === 'SeedError' || name === 'BackupError') {
    return /** @type {Error} */ (error).message;
  }
  if (error instanceof ContentError)
    return `${error.code}${error.detail ? ` — ${error.detail}` : ''}`;
  return describeStartupError(error);
}

/**
 * @param {string} name
 * @param {(database: import('../lib/db.js').Database, config: import('../config.js').Config) => Promise<void>} work
 * @param {{ env?: Record<string, string | undefined>, production?: boolean }} [options]
 *   `production: false` — წარმოების env-ზე სკრიპტი არ ეშვება
 */
export async function runCli(name, work, { env = process.env, production = true } = {}) {
  try {
    const config = loadConfig(env);
    if (!production && config.env === 'production') {
      throw new CliError(
        `NODE_ENV=production — ${name} წარმოების ბაზაზე არ ეშვება (mock-ის [ჩანაცვლებები] წარმოებაში არ უნდა მოხვდეს)`,
      );
    }
    if (!config.mongo.uri) {
      throw new CliError(
        'MONGODB_URI: სავალდებულოა (server/.env ან env; in-memory ბაზა სკრიპტისთვის არ ეშვება)',
      );
    }
    const database = await connectDb({ uri: config.mongo.uri, dbName: config.mongo.dbName });
    try {
      await work(database, config);
    } finally {
      await database.close();
    }
  } catch (error) {
    console.error(`[mc-db] ${name}: ${describeCliError(error)}`);
    process.exitCode = 1;
  }
}

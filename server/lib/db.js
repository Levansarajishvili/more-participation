import { MongoClient } from 'mongodb';

/**
 * MongoDB-სთან კავშირი (B1 — მხოლოდ connect / ping / close; კოლექციები, `$jsonSchema` და
 * ინდექსები — B2). ოფიციალური `mongodb` driver (B0 #6). replica set სავალდებულოა (ტრანზაქციები —
 * გამოქვეყნება + ვერსია + რჩეული): Atlas — ყოველთვის, ლოკალურად / ტესტში — `mongodb-memory-server`.
 */

export const PING_TIMEOUT_MS = 2000;
export const SERVER_SELECTION_TIMEOUT_MS = 5000;

/**
 * @typedef {object} Database
 * @property {MongoClient} client
 * @property {import('mongodb').Db} db
 * @property {() => Promise<boolean>} ping
 * @property {() => Promise<void>} close
 */

/**
 * @param {import('mongodb').Db} db
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}  false — ბაზა ვადაში არ უპასუხა ან შეცდომა დააბრუნა
 */
export async function pingDb(db, timeoutMs = PING_TIMEOUT_MS) {
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    const ok = db
      .command({ ping: 1 }, { timeoutMS: timeoutMs })
      .then((reply) => reply?.ok === 1)
      .catch(() => false);
    return Boolean(await Promise.race([ok, timeout]));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {object} options
 * @param {string} options.uri
 * @param {string} options.dbName
 * @param {number} [options.serverSelectionTimeoutMS]
 * @returns {Promise<Database>}
 */
export async function connectDb({
  uri,
  dbName,
  serverSelectionTimeoutMS = SERVER_SELECTION_TIMEOUT_MS,
}) {
  const client = new MongoClient(uri, {
    appName: 'mc-api',
    serverSelectionTimeoutMS,
    maxPoolSize: 10,
    retryWrites: true,
  });
  await client.connect();
  const db = client.db(dbName);
  try {
    await db.command({ ping: 1 });
  } catch (error) {
    await client.close();
    throw error;
  }
  return { client, db, ping: () => pingDb(db), close: () => client.close() };
}

/**
 * replica set-ის სახელი (`hello.setName`) — ტრანზაქციების წინაპირობა; null — standalone.
 * @param {import('mongodb').Db} db
 * @returns {Promise<string | null>}
 */
export async function replicaSetName(db) {
  const hello = await db.admin().command({ hello: 1 });
  return typeof hello.setName === 'string' ? hello.setName : null;
}

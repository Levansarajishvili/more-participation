import { createReadStream, createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createGunzip, createGzip } from 'node:zlib';

import { BSON } from 'mongodb';

import { migrate } from '../migrations/index.js';

import { COLLECTION } from './collections.js';

/**
 * B7: ლოგიკური backup — ბაზა ტარიფისგან დამოუკიდებლად. Atlas Free-ს (M0) cloud backup საერთოდ არ აქვს,
 * Flex-ს — მხოლოდ ბოლო 8 დღიური snapshot; `mongodump` Render-ის Node-ის გარემოში არ არის. ეს ფორმატი
 * driver-ით იწერება და ნებისმიერ კლასტერზე (Free / Flex / ლოკალური) აღდგება.
 *
 * ფორმატი: gzip-ით შეკუმშული NDJSON, ხაზი = ჩანაწერი. პირველი ხაზი — სათაური
 * `{ format: 'mc-backup', version: 1, createdAt }`; შემდეგ `{ c: კოლექცია, d: დოკუმენტი }` — canonical
 * Extended JSON (`Date`, `ObjectId` ზუსტად ბრუნდება); ბოლო — `{ end: true, collections: { სახელი:
 * რაოდენობა } }` (ჩაწერილის ზუსტი რაოდენობა; მის გარეშე ფაილი მოჭრილია და აღდგენა ჩერდება).
 *
 * - `sessions` არ შედის: აღდგენა ძველ შესვლებს არ აცოცხლებს (ყველა თავიდან შედის).
 * - ფაილი პერსონალურ მონაცემს შეიცავს (გამომწერის ელფოსტა, შეტყობინება, პაროლის hash) — `0600`,
 *   ინახება მხოლოდ დაშიფრულ / პირად საცავში (`docs/deploy.md`); ლოგში შიგთავსი არ იწერება.
 * - ატვირთული ფაილები (R2) აქ არ შედის — მათი ასლი ცალკეა (`docs/deploy.md`, rclone).
 */

export const BACKUP_FORMAT = 'mc-backup';
export const BACKUP_VERSION = 1;
/** კოლექციები backup-ში (რიგით). */
export const BACKUP_COLLECTIONS = Object.freeze(
  Object.values(COLLECTION).filter((name) => name !== COLLECTION.sessions),
);
const BATCH = 500;

export class BackupError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'BackupError';
  }
}

/**
 * ბაზა → ფაილი (`.ndjson.gz`, 0600; არსებულ ფაილს არ გადაწერს).
 * @param {import('mongodb').Db} db
 * @param {string} file
 * @param {{ now?: Date }} [options]
 * @returns {Promise<Record<string, number>>}  კოლექცია → რაოდენობა
 */
export async function exportDatabase(db, file, { now = new Date() } = {}) {
  /** @type {Record<string, number>} */
  const counts = Object.fromEntries(BACKUP_COLLECTIONS.map((name) => [name, 0]));
  async function* lines() {
    yield `${JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: now.toISOString() })}\n`;
    for (const name of BACKUP_COLLECTIONS) {
      for await (const doc of db.collection(name).find({}).sort({ _id: 1 })) {
        counts[name] += 1;
        yield `${BSON.EJSON.stringify({ c: name, d: doc }, { relaxed: false })}\n`;
      }
    }
    yield `${JSON.stringify({ end: true, collections: counts })}\n`;
  }
  await pipeline(
    Readable.from(lines()),
    createGzip({ level: 9 }),
    createWriteStream(file, { mode: 0o600, flags: 'wx' }),
  );
  return { ...counts };
}

/**
 * ფაილი → ბაზა. ჯერ მიგრაცია (კოლექციები, validator-ები, ინდექსები), შემდეგ ჩაწერა. სამიზნე ბაზა
 * ცარიელი უნდა იყოს (`drop: true` — backup-ის კოლექციები ჯერ იშლება). validator-ი ჩაწერისას მოქმედებს.
 * @param {{ client: import('mongodb').MongoClient, db: import('mongodb').Db }} database
 * @param {string} file
 * @param {{ drop?: boolean, retention: import('../config.js').Config['retention'] }} options
 * @returns {Promise<{ createdAt: string, counts: Record<string, number> }>}
 */
export async function importDatabase(database, file, { drop = false, retention }) {
  const { db } = database;
  const lines = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  /** @type {{ format?: string, version?: number, createdAt: string } | null} */
  let header = null;
  /** @type {Record<string, number> | null} */
  let expected = null;
  /** @type {Map<string, any[]>} */
  const pending = new Map();
  /** @type {Record<string, number>} */
  const counts = {};

  const flush = async (/** @type {string} */ name) => {
    const docs = pending.get(name) ?? [];
    if (!docs.length) return;
    await db.collection(name).insertMany(docs, { ordered: true });
    counts[name] = (counts[name] ?? 0) + docs.length;
    pending.set(name, []);
  };

  for await (const line of lines) {
    if (!line.trim()) continue;
    if (!header) {
      header = JSON.parse(line);
      if (header?.format !== BACKUP_FORMAT || header.version !== BACKUP_VERSION) {
        throw new BackupError('ფაილი mc-backup v1 არ არის');
      }
      for (const name of BACKUP_COLLECTIONS) {
        const existing = await db.collection(name).countDocuments({}, { limit: 1 });
        if (existing && !drop) {
          throw new BackupError(
            `სამიზნე ბაზა ცარიელი არ არის (${name}) — ჯერ --drop (ამ ბაზის მონაცემი წაიშლება)`,
          );
        }
      }
      if (drop) {
        for (const name of [...BACKUP_COLLECTIONS, COLLECTION.sessions]) {
          await db.collection(name).deleteMany({});
        }
      }
      await migrate(db, { retention });
      continue;
    }
    if (expected) throw new BackupError('ფაილის ბოლოს შემდეგ ჩანაწერია');
    if (line.startsWith('{"end":')) {
      expected = JSON.parse(line).collections;
      continue;
    }
    const { c: name, d: doc } = BSON.EJSON.parse(line, { relaxed: false });
    if (!BACKUP_COLLECTIONS.includes(name)) throw new BackupError(`უცნობი კოლექცია: ${name}`);
    if (!pending.has(name)) pending.set(name, []);
    /** @type {any[]} */ (pending.get(name)).push(doc);
    if (/** @type {any[]} */ (pending.get(name)).length >= BATCH) await flush(name);
  }
  if (!header) throw new BackupError('ფაილი ცარიელია');
  for (const name of pending.keys()) await flush(name);
  if (!expected) throw new BackupError('ფაილი მოჭრილია (ბოლოს ჩანაწერი აკლია) — აღდგენა არასრულია');
  for (const name of BACKUP_COLLECTIONS) {
    if ((counts[name] ?? 0) !== (expected[name] ?? 0)) {
      throw new BackupError(`${name}: აღდგა ${counts[name] ?? 0}, ფაილში — ${expected[name] ?? 0}`);
    }
  }
  return {
    createdAt: header.createdAt,
    counts: Object.fromEntries(BACKUP_COLLECTIONS.map((name) => [name, counts[name] ?? 0])),
  };
}

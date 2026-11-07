import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { BACKUP_COLLECTIONS, exportDatabase, importDatabase } from '../../db/backup.js';
import { COLLECTION } from '../../db/collections.js';
import { createRepositories } from '../../db/index.js';
import { seedDatabase } from '../../db/seed.js';
import { T0, freshDatabase } from '../db/helpers.js';

/**
 * B7: ლოგიკური backup / restore (Atlas Free-ს cloud backup არ აქვს; Flex — 8 დღე): seed-იანი ბაზა →
 * ფაილი → ცარიელი ბაზა — ყველა კოლექცია (სესიების გარდა) იდენტურია, ტიპები (Date, ObjectId) ზუსტად.
 */

const RETENTION = { messagesDays: 30, versionsKeep: 30 };

/** @param {import('mongodb').Db} db */
async function dump(db) {
  /** @type {Record<string, any[]>} */
  const out = {};
  for (const name of BACKUP_COLLECTIONS) {
    out[name] = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
  }
  return out;
}

/**
 * @param {string} script
 * @param {string[]} args
 * @param {Record<string, string>} env
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function run(script, args, env) {
  const file = fileURLToPath(new URL(`../../scripts/${script}`, import.meta.url));
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [file, ...args], {
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('exit', (code) => resolve({ code, stdout, stderr }));
  });
}

describe('backup / restore', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let source;
  /** @type {string} */
  let dir;

  beforeAll(async () => {
    source = await freshDatabase('backup_src');
    await seedDatabase(source, { now: T0 });
    const repos = createRepositories(source, { now: () => T0 });
    await repos.users.insert({
      name: '[ადმინი]',
      email: 'admin@example.org',
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaGhhc2hoYXNoaGFzaA',
      role: 'admin',
    });
    const user = await repos.users.findByEmail('admin@example.org');
    await repos.sessions.create(String(user?._id));
    dir = await mkdtemp(join(tmpdir(), 'mc-backup-'));
  });
  afterAll(async () => {
    await source?.drop();
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('ასლი → ცარიელი ბაზა: კოლექციები იდენტურია, სესიები არ შედის; ფაილი 0600', async () => {
    const file = join(dir, 'a.ndjson.gz');
    const counts = await exportDatabase(source.db, file, { now: new Date(T0) });
    expect(counts.content).toBe(58);
    expect(counts.users).toBe(1);
    expect(Object.keys(counts)).not.toContain('sessions');
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    await expect(exportDatabase(source.db, file)).rejects.toMatchObject({ code: 'EEXIST' });

    const target = await freshDatabase('backup_dst', { migrate: false });
    try {
      const result = await importDatabase(target, file, { retention: RETENTION });
      expect(result).toEqual({ createdAt: new Date(T0).toISOString(), counts });
      expect(await dump(target.db)).toEqual(await dump(source.db));
      expect(await target.db.collection(COLLECTION.sessions).countDocuments()).toBe(0);
      const doc = await target.db.collection(COLLECTION.content).findOne({});
      expect(doc?.createdAt).toBeInstanceOf(Date);
      // არაცარიელ ბაზაზე — უარი; --drop — თავიდან
      await expect(importDatabase(target, file, { retention: RETENTION })).rejects.toThrow(
        /ცარიელი არ არის/,
      );
      await importDatabase(target, file, { drop: true, retention: RETENTION });
      expect(await dump(target.db)).toEqual(await dump(source.db));
    } finally {
      await target.drop();
    }
  });

  it('მოჭრილი / სხვა ფორმატის ფაილი → შეცდომა', async () => {
    const file = join(dir, 'b.ndjson.gz');
    await exportDatabase(source.db, file);
    const lines = gunzipSync(await readFile(file))
      .toString('utf8')
      .trim()
      .split('\n');
    const truncated = join(dir, 'truncated.ndjson.gz');
    await writeFile(truncated, gzipSync(`${lines.slice(0, -1).join('\n')}\n`));
    const other = join(dir, 'other.ndjson.gz');
    await writeFile(other, gzipSync('{"format":"x"}\n'));
    for (const [bad, message] of [
      [truncated, /მოჭრილია/],
      [other, /mc-backup v1/],
    ]) {
      const target = await freshDatabase('backup_bad', { migrate: false });
      try {
        await expect(importDatabase(target, String(bad), { retention: RETENTION })).rejects.toThrow(
          message,
        );
      } finally {
        await target.drop();
      }
    }
  });

  it('CLI: server:backup → server:restore (--confirm ბაზის სახელით); URI გამოსავალში არ ჩანს', async () => {
    const uri = inject('mongoUri');
    const env = { NODE_ENV: 'development', MONGODB_URI: uri, MONGODB_DB: source.db.databaseName };
    const file = join(dir, 'cli.ndjson.gz');
    const backup = await run('backup.js', ['--out', file], env);
    expect(backup.code, backup.stderr).toBe(0);
    expect(backup.stdout).toMatch(/backup: .* content 58/);

    const target = `mc_restore_${Math.random().toString(36).slice(2, 8)}`;
    const targetEnv = { ...env, MONGODB_DB: target };
    const wrong = await run('restore.js', ['--in', file, '--confirm', 'other'], targetEnv);
    expect(wrong.code).toBe(1);
    expect(wrong.stderr).toMatch(/--confirm/);
    const restore = await run('restore.js', ['--in', file, '--confirm', target], targetEnv);
    expect(restore.code, restore.stderr).toBe(0);
    expect(restore.stdout).toMatch(/restore: .* content 58/);
    const again = await run('restore.js', ['--in', file, '--confirm', target], targetEnv);
    expect(again.code).toBe(1);
    expect(again.stderr).toMatch(/--drop/);
    for (const output of [backup, wrong, restore, again]) {
      expect(output.stdout + output.stderr).not.toContain(uri);
    }
    await source.client.db(target).dropDatabase();
  }, 60_000);
});

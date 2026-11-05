import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { COLLECTION } from '../../db/collections.js';
import { connectDb } from '../../lib/db.js';

import { PASSWORD } from './helpers.js';

/**
 * `npm run server:create-admin` (B3): პირველი ადმინისტრატორი env-იდან; ნაგულისხმევი პაროლი არ
 * არსებობს; პაროლი / ელფოსტა გამოსავალში არ ჩანს; მეორე ადმინისტრატორი — მხოლოდ მოწვევით.
 */

const SERVER_DIR = fileURLToPath(new URL('../..', import.meta.url));
const DB_NAME = `mc_create_admin_${Math.random().toString(36).slice(2, 8)}`;

/** @param {Record<string, string>} env */
function run(env) {
  const result = spawnSync(process.execPath, ['scripts/create-admin.js'], {
    cwd: SERVER_DIR,
    encoding: 'utf8',
    input: '',
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      NODE_ENV: 'development',
      MONGODB_URI: inject('mongoUri'),
      MONGODB_DB: DB_NAME,
      ...env,
    },
    timeout: 60_000,
  });
  return { status: result.status, out: `${result.stdout}${result.stderr}`, stdout: result.stdout };
}

/** @type {Awaited<ReturnType<typeof connectDb>>} */
let database;
beforeAll(async () => {
  database = await connectDb({ uri: inject('mongoUri'), dbName: DB_NAME });
});
afterAll(async () => {
  await database.db.dropDatabase();
  await database.close();
});

describe('server:create-admin', () => {
  it('env-ის გარეშე (ტერმინალი არ არის) → exit 1, ცვლადების სახელით; მომხმარებელი არ იქმნება', async () => {
    const result = run({ ADMIN_EMAIL: 'first@example.org' });
    expect(result.status).toBe(1);
    expect(result.out).toMatch(/ADMIN_NAME, ADMIN_PASSWORD: სავალდებულოა/);
    expect(await database.db.collection(COLLECTION.users).countDocuments()).toBe(0);
  });

  it('სუსტი / ცნობილი პაროლი → exit 1 (ველი და წესი, მნიშვნელობის გარეშე)', async () => {
    const common = run({
      ADMIN_EMAIL: 'first@example.org',
      ADMIN_NAME: 'ადმინი',
      ADMIN_PASSWORD: 'qwerty123456',
    });
    expect(common.status).toBe(1);
    expect(common.out).toMatch(/password: passwordCommon/);
    expect(common.out).not.toContain('qwerty123456');
    const short = run({ ADMIN_EMAIL: 'bad', ADMIN_NAME: 'ადმინი', ADMIN_PASSWORD: 'მოკლე' });
    expect(short.out).toMatch(/email: email, password: passwordShort/);
    expect(await database.db.collection(COLLECTION.users).countDocuments()).toBe(0);
  });

  it('შექმნა: argon2id, როლი admin; გამოსავალში მხოლოდ id', async () => {
    const result = run({
      ADMIN_EMAIL: ' First@Example.org ',
      ADMIN_NAME: '[სახელი გვარი]',
      ADMIN_PASSWORD: PASSWORD,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/ადმინისტრატორი შეიქმნა: u-[0-9a-f]{24}/);
    expect(result.out).not.toContain(PASSWORD);
    expect(result.out.toLowerCase()).not.toContain('first@example.org');
    const user = await database.db
      .collection(COLLECTION.users)
      .findOne({ email: 'first@example.org' });
    expect(user).toMatchObject({ role: 'admin', status: 'active', name: '[სახელი გვარი]' });
    expect(user?.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456/);
  });

  it('მეორე გაშვება → exit 1: ადმინისტრატორი უკვე არსებობს (შემდეგი — მოწვევით)', async () => {
    const result = run({
      ADMIN_EMAIL: 'second@example.org',
      ADMIN_NAME: 'მეორე',
      ADMIN_PASSWORD: PASSWORD,
    });
    expect(result.status).toBe(1);
    expect(result.out).toMatch(/ადმინისტრატორი უკვე არსებობს/);
    expect(await database.db.collection(COLLECTION.users).countDocuments()).toBe(1);
  });

  it('არგუმენტი არ მიიღება (პაროლი ბრძანების ხაზში / shell-ის ისტორიაში არ უნდა მოხვდეს)', () => {
    const result = spawnSync(process.execPath, ['scripts/create-admin.js', '--password', 'x'], {
      cwd: SERVER_DIR,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', MONGODB_URI: inject('mongoUri'), MONGODB_DB: DB_NAME },
      timeout: 60_000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/არგუმენტი არ მიიღება/);
  });
});

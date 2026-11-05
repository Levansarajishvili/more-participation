import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

import { connectDb, pingDb, replicaSetName } from '../lib/db.js';

describe('MongoDB (mongodb-memory-server, replica set)', () => {
  /** @type {import('../lib/db.js').Database} */
  let database;

  beforeAll(async () => {
    database = await connectDb({ uri: inject('mongoUri'), dbName: 'mc_test_db' });
  });

  afterAll(async () => {
    await database?.close();
  });

  it('connect + ping', async () => {
    expect(await database.ping()).toBe(true);
    expect(await pingDb(database.db, 500)).toBe(true);
  });

  it('replica set — ტრანზაქცია მუშაობს (B4-ის წინაპირობა)', async () => {
    expect(await replicaSetName(database.db)).toMatch(/\S/);
    const collection = database.db.collection('txn_probe');
    const session = database.client.startSession();
    try {
      await session.withTransaction(async () => {
        await collection.insertOne({ step: 'b1' }, { session });
      });
    } finally {
      await session.endSession();
    }
    expect(await collection.countDocuments({ step: 'b1' })).toBe(1);
    await collection.drop();
  });

  it('დახურული კლიენტი — ping false (გამონაკლისის გარეშე)', async () => {
    const other = await connectDb({ uri: inject('mongoUri'), dbName: 'mc_test_db' });
    await other.close();
    expect(await pingDb(other.db, 500)).toBe(false);
  });

  it('მიუწვდომელი ბაზა — connect ვადაში ვარდება', async () => {
    const started = Date.now();
    await expect(
      connectDb({
        uri: 'mongodb://127.0.0.1:1/?directConnection=true',
        dbName: 'x',
        serverSelectionTimeoutMS: 300,
      }),
    ).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

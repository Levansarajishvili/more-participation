import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PAGE_DEFS } from '@/admin/api/pages.js';
import { validateContent } from '@/content/validate.js';

import { ensureBaseRecords, prepareDatabase } from '../../db/base.js';
import { COLLECTION } from '../../db/collections.js';
import { createRepositories } from '../../db/index.js';
import { seedDatabase } from '../../db/seed.js';
import { T0, freshDatabase } from '../db/helpers.js';
import { makeApp } from '../helpers.js';

/**
 * B7: წარმოების საბაზისო ჩანაწერები (`server:migrate`-ის ბოლო ნაბიჯი) — ცარიელ ბაზაზე 7 გვერდი და
 * პარამეტრები `[ჩანაცვლებებით]`; მხოლოდ რაც აკლია; seed ხელუხლებელ საბაზისოს ცვლის.
 */

describe('საბაზისო ჩანაწერები', () => {
  /** @type {Awaited<ReturnType<typeof freshDatabase>>} */
  let database;
  beforeAll(async () => {
    database = await freshDatabase('base', { migrate: false });
  });
  afterAll(async () => {
    await database?.drop();
  });

  it('ცარიელი ბაზა → 7 გვერდი + პარამეტრები; მეორედ — არაფერი; საჯარო API მუშაობს', async () => {
    const first = await prepareDatabase(database, {
      retention: { messagesDays: 30, versionsKeep: 30 },
      now: T0,
    });
    expect(first.base).toEqual({ pages: PAGE_DEFS.map((p) => p.slug), settings: true });
    const again = await ensureBaseRecords(database, { now: T0 + 1000 });
    expect(again).toEqual({ pages: [], settings: false });

    const repos = createRepositories(database, { now: () => T0 });
    const about = await repos.content.findBySlug('pages', 'about');
    expect(about?.item).toMatchObject({
      title: 'ჩვენ შესახებ',
      translations: { en: { title: 'About us' } },
      path: '/about',
      status: 'published',
      team: [],
      partners: [],
      stages: [],
    });
    expect(about?.meta).toMatchObject({ version: 1, updatedBy: null });
    expect(validateContent(await repos.snapshot()).filter((i) => i.severity === 'error')).toEqual(
      [],
    );

    const app = await makeApp({ db: database.db, now: () => T0 });
    try {
      const settings = await app.inject({ url: '/api/v1/settings' });
      expect(settings.statusCode).toBe(200);
      const body = settings.json();
      expect(body.contacts.phone).toBe('[ტელეფონი]');
      expect(body.links.privacy).toBeNull();
      expect((await app.inject({ url: '/api/v1/team' })).json()).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('შეცვლილი გვერდი / პარამეტრები ხელახლა არ იქმნება და არ იცვლება', async () => {
    const repos = createRepositories(database, { now: () => T0 + 5000 });
    const home = await repos.content.findBySlug('pages', 'home');
    await database.db.collection(COLLECTION.content).deleteOne({ type: 'pages', slug: 'contact' });
    await database.db
      .collection(COLLECTION.settings)
      .updateOne({}, { $set: { 'item.contacts.phone': '+995 000', version: 2 } });
    const result = await ensureBaseRecords(database, { now: T0 + 6000 });
    expect(result).toEqual({ pages: ['contact'], settings: false });
    expect((await repos.content.findBySlug('pages', 'home'))?.id).toBe(home?.id);
    const settings = await database.db.collection(COLLECTION.settings).findOne({});
    expect(settings?.item.contacts.phone).toBe('+995 000');
  });

  it('seed: ხელუხლებელ საბაზისოს ცვლის (staging); ადმინის ცვლილების შემდეგ — უარი', async () => {
    const fresh = await freshDatabase('base_seed');
    try {
      await ensureBaseRecords(fresh, { now: T0 });
      const { counts, issues } = await seedDatabase(fresh, { now: T0 });
      expect(counts.pages).toBe(7);
      expect(issues).toEqual([]);
      expect(await fresh.db.collection(COLLECTION.content).countDocuments({ type: 'pages' })).toBe(
        7,
      );
      const edited = await freshDatabase('base_seed_edited');
      try {
        await ensureBaseRecords(edited, { now: T0 });
        await edited.db
          .collection(COLLECTION.content)
          .updateOne({ slug: 'home' }, { $set: { version: 2, updatedBy: 'u-1' } });
        await expect(seedDatabase(edited, { now: T0 })).rejects.toThrow(/უკვე 7 მასალაა/);
      } finally {
        await edited.drop();
      }
    } finally {
      await fresh.drop();
    }
  });
});

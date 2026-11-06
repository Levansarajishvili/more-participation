import {
  buildA11yReport,
  buildStats,
  embeddedMedia,
  featuredChanges,
  featuredIds,
  FEATURED,
} from '@/admin/api/records.js';
import { CONTENT_TYPES } from '@/admin/content-types.js';

import { COLLECTION } from '../db/collections.js';
import { repositories } from '../lib/auth.js';
import { route } from '../lib/openapi.js';

import { actorId, rowsOf, viewContext } from './content.js';

/**
 * `/api/admin/settings` (ადმინისტრატორი — `settings.manage`) და `/api/admin/reports/*`
 * (ადმინისტრატორი, რედაქტორი — `content.read` / `a11y.read`), B4. ფორმა და დათვლა საერთო
 * `src/admin/api/records.js`-იდან (mock-ის იგივე კოდი).
 *
 * რჩეული: თითო ტიპზე ერთი — repository-ის `setFeatured` (ტრანზაქცია + უნიკალური partial ინდექსი);
 * უცნობი / სხვა ტიპის id → 404 ჩაწერამდე (არაფერი იცვლება). `site` — მთლიანი ჩანაცვლება
 * მიმდინარეზე ზემოდან (`translations.en`-ის ჩათვლით; ბაზის `$jsonSchema` → 422 ველის გზით).
 */

/** @typedef {import('@/admin/content-types.js').ContentType} ContentType */

const FEATURED_TYPES = /** @type {ContentType[]} */ ([...new Set(Object.values(FEATURED))]);

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {readonly ContentType[]} types
 */
async function recordsByType(app, types) {
  const { content } = repositories(app);
  const lists = await Promise.all(types.map((type) => content.list(type)));
  return /** @type {Record<ContentType, any[]>} */ (
    Object.fromEntries(types.map((type, i) => [type, lists[i]]))
  );
}

/** @param {import('fastify').FastifyInstance} app */
async function settingsBundle(app) {
  const [site, records] = await Promise.all([
    repositories(app).settings.get(),
    recordsByType(app, FEATURED_TYPES),
  ]);
  return { site: site?.item ?? {}, featured: featuredIds(records) };
}

/** @param {import('fastify').FastifyInstance} app */
export function registerSettingsRoutes(app) {
  const { spec } = app;

  route(app, spec, 'getAdminSettings', () => settingsBundle(app));

  route(app, spec, 'updateAdminSettings', async (request) => {
    const patch =
      /** @type {{ site?: Record<string, any>, featured?: Record<string, string | null> }} */ (
        request.body
      );
    const { content, settings } = repositories(app);
    const ids = Object.values(patch.featured ?? {}).filter((id) => typeof id === 'string');
    const found = new Map(await Promise.all(ids.map(async (id) => [id, await content.find(id)])));
    const changes = featuredChanges(
      /** @type {any} */ (patch.featured),
      (type, id) => found.get(id)?.type === type,
    );
    const by = actorId(request);
    if (patch.site) {
      const current = await settings.get();
      await settings.put({ ...(current?.item ?? {}), ...patch.site }, { by });
    }
    for (const [type, id] of changes) await content.setFeatured(type, id, { by });
    return settingsBundle(app);
  });

  route(app, spec, 'getStats', async () => {
    const [rows, records, uploads] = await Promise.all([
      rowsOf(app, CONTENT_TYPES),
      recordsByType(app, CONTENT_TYPES),
      // ატვირთული ფაილები (`media`) — B5; მანამდე 0
      Promise.all(
        ['image', 'document'].map((kind) =>
          /** @type {import('mongodb').Db} */ (app.db)
            .collection(COLLECTION.media)
            .countDocuments({ kind }),
        ),
      ),
    ]);
    /** @type {Record<string, any[]>} */
    const rowsByType = {};
    for (const row of rows) (rowsByType[row.type] ??= []).push(row);
    const embedded = CONTENT_TYPES.flatMap((type) =>
      records[type].flatMap((record) => embeddedMedia(type, record)),
    );
    return buildStats(/** @type {any} */ (rowsByType), {
      now: app.now(),
      library: {
        images: embedded.filter((m) => m.kind === 'image').length + uploads[0],
        documents: embedded.filter((m) => m.kind === 'document').length + uploads[1],
      },
    });
  });

  route(app, spec, 'getA11yReport', async () => {
    const [records, context] = await Promise.all([
      recordsByType(app, CONTENT_TYPES),
      viewContext(app),
    ]);
    return buildA11yReport(records, context.slugs);
  });
}

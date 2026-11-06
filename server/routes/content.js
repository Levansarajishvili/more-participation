import {
  assertFuture,
  listRows,
  mergeUpdate,
  newDraft,
  publicSlugs,
  publishItem,
  searchRows,
  toRecord,
  toRow,
  typesFor,
  versionList,
} from '@/admin/api/records.js';
import { CONTENT_TYPES, TYPE_CONFIG } from '@/admin/content-types.js';
import { ta } from '@/admin/i18n/index.js';
import { blockerFields, publishBlockers } from '@/content/checks.js';
import { ContentError } from '@/content/errors.js';

import { DRAFT_SCHEMA } from '../db/collections.js';
import { repositories } from '../lib/auth.js';
import { validationFields } from '../lib/errors.js';
import { createAjv, route, schemaRef } from '../lib/openapi.js';

import { reconcileFiles } from './media-check.js';

/**
 * `/api/admin/content*`, `/api/admin/items*` (B4). სემანტიკის ეტალონი — ადმინის mock
 * (`src/admin/api/mock.js`); პასუხის ფორმა, ფილტრი, დალაგება და შენახვის წესი საერთო
 * `src/admin/api/records.js`-იდანაა (ორივე მხარე ერთ კოდს იძახებს), ჩაწერა — repository-ით
 * (`server/db/content.js`: ვერსია, ისტორია, სამუშაო ასლი, 409 — ტრანზაქციაში).
 *
 * guard-ები spec-იდან (B3): სესია, CSRF (ცვლილებაზე), `x-permission` — `content.read` /
 * `content.write` (ადმინისტრატორი და რედაქტორი, `permissions.js`).
 *
 * ვალიდაცია ორ ფენად: route-ის სქემა (`ItemDraft` — რომელიმე ტიპის მონახაზი) და handler-ში
 * შენახული მასალის ტიპის `*Draft` (merged item-ზე) → 422 `fields` / 400 (B1-ის წესი). `translations.en`
 * spec-ში თავისუფალი ობიექტია — მას ბაზის `$jsonSchema` (`partialTextSchema`) ამოწმებს: 121 → 422,
 * ველის გზით (`translations.en.slug`).
 *
 * გამოქვეყნება / დაგეგმვა (ნაწილი ბ): `data` → სამუშაო ასლი → მასალა; ბლოკერი — საერთო `checks.js`-ის
 * `publishBlockers` (ქართული + ინგლისური ვერსია, რედაქტორისა და mock-ის იგივე) + `[ჩანაცვლება]`
 * YouTube-ის id-ში → 422 `validation` + `fields` (ველის გზა → `{ code, message }`). ჩაწერა —
 * `replace` (ვერსია, ისტორია, სამუშაო ასლის წაშლა — ერთ ტრანზაქციაში).
 *
 * ადმინის სია / ძიება მეხსიერებაში ითვლება (mock-ის იგივე): `check` ფილტრს ყოველი მასალის
 * შემოწმება სჭირდება, `q` კი მხოლოდ სათაურსა და slug-ს ეძებს (`searchText` — B6-ის საჯარო ძიებაა).
 */

/** @typedef {import('@/admin/content-types.js').ContentType} ContentType */
/** @typedef {import('../db/content.js').ContentRecord} DbRecord */

/**
 * შენახული ტიპის მონახაზის ვალიდატორი (`ArticleDraft`…). ajv-ის `useDefaults` ასლზე მუშაობს —
 * შესანახი item არ იცვლება.
 * @param {any} spec
 */
export function createDraftValidator(spec) {
  const ajv = createAjv(spec);
  /** @type {Map<ContentType, import('ajv').ValidateFunction>} */
  const compiled = new Map();
  /**
   * @param {ContentType} type
   * @param {Record<string, any>} item
   */
  return function assertDraft(type, item) {
    let validate = compiled.get(type);
    if (!validate) {
      validate = ajv.compile(schemaRef(DRAFT_SCHEMA[type]));
      compiled.set(type, validate);
    }
    if (validate(structuredClone(item))) return;
    const fields = validationFields(validate.errors ?? []);
    throw fields
      ? new ContentError('validation', { fields, detail: `${DRAFT_SCHEMA[type]}` })
      : new ContentError('bad-request', { detail: `${DRAFT_SCHEMA[type]}` });
  };
}

/**
 * პასუხის კონტექსტი: საჯარო სტატიების slug-ები (ბმულის შემოწმება) და ავტორის სახელი
 * (`users` — დეაქტივირებულიც, როგორც mock-ში).
 * @param {import('fastify').FastifyInstance} app
 */
export async function viewContext(app) {
  const repos = repositories(app);
  const at = app.now();
  const [users, articles] = await Promise.all([
    repos.users.list(),
    repos.content.list('articles', { visibleAt: at }),
  ]);
  const names = new Map(users.map((u) => [u._id, { id: u._id, name: u.name }]));
  return {
    slugs: publicSlugs(articles, at),
    /** @param {string | null} id */
    editor: (id) => (id ? (names.get(id) ?? null) : null),
  };
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {DbRecord} record
 */
export async function recordResponse(app, record) {
  const context = await viewContext(app);
  return toRecord(record.type, record, { ...context, working: record.working });
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} id
 * @returns {Promise<DbRecord>}
 */
export async function requireRecord(app, id) {
  const record = await repositories(app).content.find(id);
  if (!record) throw new ContentError('not-found', { detail: `content/${id}` });
  return record;
}

/**
 * route-ის სქემის შეცდომა (`attachValidation`): `ItemDraft` `anyOf`-ია — ექვსივე ტიპის შეცდომას
 * ერთად აბრუნებს (სტატიის სრულ item-ზე `PageDraft`-ის „უცნობი ველები“) და 422 / 400-ის კლასიფიკაციას
 * არღვევს. ამიტომ: შეცდომა მონახაზის გარეთ (`version`, უცნობი ველი სხეულში) → მაშინვე; მონახაზში —
 * ჯერ შენახული ტიპის `*Draft` (ზუსტი ველი და კოდი), მერე — თავდაპირველი შეცდომა.
 * @param {import('fastify').FastifyRequest} request
 * @param {string} draftPath  `''` — სხეული თავადაა მონახაზი; `/data` — `{ data, version }`
 * @returns {Error | null}  შეცდომა მონახაზში (ტიპის შემოწმების შემდეგ ისვრის handler-ი)
 */
export function draftValidationError(request, draftPath) {
  const error = /** @type {any} */ (request.validationError);
  if (!error) return null;
  const inside = (/** @type {any} */ e) =>
    error.validationContext === 'body' &&
    (draftPath === '' ||
      e.instancePath === draftPath ||
      String(e.instancePath).startsWith(`${draftPath}/`));
  if (!Array.isArray(error.validation) || !error.validation.every(inside)) throw error;
  return error;
}

/**
 * სერვერის გამოქვეყნების ბლოკერი (B4): `validate.js` ქართულ და ინგლისურ ვერსიაზე + ჩანაცვლება
 * YouTube-ის id-ში. frontend-ის შემოწმება მხოლოდ UX-ია (§12).
 * B5: `extra` — ფაილის ბლოკერი (`fileMissing`, `media-check.js`), იმავე `fields`-ში.
 * @param {ContentType} type
 * @param {Record<string, any>} item
 * @param {Set<string>} slugs
 * @param {Record<string, { code: string, message: string }>} [extra]
 */
export function assertPublishable(type, item, slugs, extra = {}) {
  const blocking = publishBlockers(type, item, slugs, { placeholders: false });
  const extraCount = Object.keys(extra).length;
  if (!blocking.length && !extraCount) return;
  throw new ContentError('validation', {
    fields: { ...extra, ...blockerFields(blocking) },
    detail: `${blocking.length + extraCount} blocker(s)`,
  });
}

/**
 * ყველა ტიპის სტრიქონი ტიპის რიგით (თითო ტიპში — ჩასმის რიგით, mock-ის `allRows`).
 * @param {import('fastify').FastifyInstance} app
 * @param {readonly ContentType[]} types
 */
export async function rowsOf(app, types) {
  const { content } = repositories(app);
  const [context, lists] = await Promise.all([
    viewContext(app),
    Promise.all(types.map((t) => content.list(t))),
  ]);
  return types.flatMap((t, i) => lists[i].map((record) => toRow(t, record, context)));
}

/** @param {import('fastify').FastifyRequest} request */
export const actorId = (request) =>
  /** @type {import('../lib/auth.js').RequestAuth} */ (request.auth).user._id;

/** @param {import('fastify').FastifyInstance} app */
export function registerContentRoutes(app) {
  const { spec } = app;
  const assertDraft = createDraftValidator(spec);

  route(app, spec, 'listContent', async (request) => {
    const { type } = /** @type {{ type: ContentType | 'all' }} */ (request.params);
    const rows = await rowsOf(app, typesFor(type));
    return listRows(rows, /** @type {any} */ (request.query));
  });

  /** `ItemDraft`-იანი ოპერაციები — სქემის შეცდომას handler-ი ტიპით აზუსტებს */
  const draftBody = { attachValidation: true };

  route(
    app,
    spec,
    'createContent',
    async (request, reply) => {
      const { type } = /** @type {{ type: ContentType }} */ (request.params);
      const invalid = draftValidationError(request, '');
      const item = newDraft(/** @type {Record<string, any>} */ (request.body));
      assertDraft(type, item);
      if (invalid) throw invalid;
      const record = await repositories(app).content.insert(type, item, { by: actorId(request) });
      reply.code(201);
      return recordResponse(app, record);
    },
    draftBody,
  );

  route(app, spec, 'checkSlug', async (request) => {
    const { type } = /** @type {{ type: ContentType }} */ (request.params);
    const { slug, id = null } = /** @type {{ slug: string, id?: string }} */ (request.query);
    const found = await repositories(app).content.findBySlug(type, slug);
    return { available: !found || found.id === id };
  });

  // F10: id სხვა ვიდეოში — მთავარი ან აუდიოაღწერის ვერსია, გამოქვეყნებული ან სამუშაო ასლი
  route(app, spec, 'checkYouTube', async (request) => {
    const { youtubeId, id = null } = /** @type {{ youtubeId: string, id?: string }} */ (
      request.query
    );
    for (const record of await repositories(app).content.list('videos')) {
      if (record.id === id) continue;
      const used = [record.item, record.working?.item]
        .filter(Boolean)
        .some((item) => item?.youtube?.id === youtubeId || item?.youtube?.adId === youtubeId);
      if (used) return { available: false, usedBy: { id: record.id, title: record.item.title } };
    }
    return { available: true, usedBy: null };
  });

  route(app, spec, 'getItem', async (request) => {
    const { id } = /** @type {{ id: string }} */ (request.params);
    return recordResponse(app, await requireRecord(app, id));
  });

  route(
    app,
    spec,
    'updateItem',
    async (request) => {
      const { id } = /** @type {{ id: string }} */ (request.params);
      const invalid = draftValidationError(request, '/data');
      const {
        data,
        version,
        autosave = false,
      } = /** @type {{ data: Record<string, any>, version: number, autosave?: boolean }} */ (
        request.body
      );
      const { content } = repositories(app);
      const record = await requireRecord(app, id);
      if (version !== record.meta.version) {
        throw new ContentError('conflict', {
          detail: `${id}: ${version} ≠ ${record.meta.version}`,
        });
      }
      const merged = mergeUpdate(record.item, data);
      assertDraft(record.type, merged);
      if (invalid) throw invalid;
      const by = actorId(request);
      // გამოქვეყნებულის / დაგეგმილის ავტოშენახვა საიტს არ ცვლის — სამუშაო ასლი; მონახაზი — პირდაპირ
      const saved =
        autosave && record.item.status !== 'draft'
          ? await content.saveWorking(id, merged, { by, version })
          : await content.replace(id, merged, { by, version });
      return recordResponse(app, saved);
    },
    draftBody,
  );

  // სამუდამო წაშლა: ჩანაწერი, ვერსიები, სამუშაო ასლი (F8.1); 7 საჯარო გვერდი — 400
  route(app, spec, 'deleteItem', async (request) => {
    const { id } = /** @type {{ id: string }} */ (request.params);
    const record = await requireRecord(app, id);
    if (!TYPE_CONFIG[record.type].deletable) {
      throw new ContentError('bad-request', { detail: `remove ${record.type}` });
    }
    await repositories(app).content.remove(id);
    return { ok: /** @type {const} */ (true) };
  });

  /**
   * გამოქვეყნება / დაგეგმვა — mock-ის რიგით: (დაგეგმვის თარიღი) → item → სქემა → ბლოკერი → ჩაწერა
   * (ვერსია; ძველი → 409).
   * @param {import('fastify').FastifyRequest} request
   * @param {'published' | 'scheduled'} status
   */
  async function release(request, status) {
    const { id } = /** @type {{ id: string }} */ (request.params);
    const invalid = draftValidationError(request, '/data');
    const { version, data, at } =
      /** @type {{ version: number, data?: Record<string, any>, at?: string }} */ (request.body);
    const record = await requireRecord(app, id);
    if (status === 'scheduled') assertFuture(at, app.now(), ta('fieldErrors.scheduleFuture'));
    const publishedAt =
      status === 'scheduled' ? /** @type {string} */ (at) : new Date(app.now()).toISOString();
    const merged = publishItem(record.item, record.working?.item, data, { status, publishedAt });
    assertDraft(record.type, merged);
    if (invalid) throw invalid;
    // B5: ფაილი რეესტრშია; VTT-ის cues / end — სერვერის `parseCaptions`-იდან
    const { item, missing } = await reconcileFiles(app, merged);
    const context = await viewContext(app);
    assertPublishable(record.type, item, context.slugs, /** @type {any} */ (missing));
    const saved = await repositories(app).content.replace(id, item, {
      by: actorId(request),
      version,
    });
    return toRecord(saved.type, saved, { ...(await viewContext(app)), working: saved.working });
  }

  route(app, spec, 'publishItem', (request) => release(request, 'published'), draftBody);
  route(app, spec, 'scheduleItem', (request) => release(request, 'scheduled'), draftBody);

  route(app, spec, 'listVersions', async (request) => {
    const { id } = /** @type {{ id: string }} */ (request.params);
    const record = await requireRecord(app, id);
    const [history, context] = await Promise.all([
      repositories(app).content.versions(id),
      viewContext(app),
    ]);
    return versionList(record, history, context.editor);
  });

  // აღდგენა ახალ ვერსიად ინახება; მიმდინარე `featured` რჩება (repository, mock — იგივე)
  route(app, spec, 'restoreVersion', async (request) => {
    const { id, version } = /** @type {{ id: string, version: number }} */ (request.params);
    const record = await repositories(app).content.restore(id, version, {
      by: actorId(request),
    });
    return recordResponse(app, record);
  });

  // ძიება პანელში: სათაური და slug, ყველა ტიპი, ≤ 50 (mock-ის `search`)
  route(app, spec, 'searchContent', async (request) => {
    const { q } = /** @type {{ q?: string }} */ (request.query);
    if (!q?.trim()) return [];
    return searchRows(await rowsOf(app, CONTENT_TYPES), q);
  });
}

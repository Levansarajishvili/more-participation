import { basename } from 'node:path';

import multipart from '@fastify/multipart';

import {
  buildLibrary,
  fileError,
  filterLibrary,
  findMediaItem,
  inUseError,
  normalizeMediaPatch,
  parseEmbeddedId,
  patchRecord,
} from '@/admin/api/library.js';
import { CONTENT_TYPES } from '@/admin/content-types.js';
import { ContentError, fieldError } from '@/content/errors.js';
import { MEDIA_TYPES, SNIFF_BYTES, checkFile, fileExtension } from '@/content/files.js';

import { MEDIA_PATH } from '../db/derive.js';
import { toFileRecord } from '../db/media.js';
import { repositories } from '../lib/auth.js';
import { validationFields } from '../lib/errors.js';
import { checkPdf, checkVtt, detectRatio, processImage } from '../lib/media-files.js';
import { createAjv, route, schemaRef } from '../lib/openapi.js';
import { MEDIA_CACHE_CONTROL, contentTypeOfKey, isMediaKey, newMediaKey } from '../storage/keys.js';

import { actorId } from './content.js';

/**
 * მედია (B5): `/api/admin/media*` (ბიბლიოთეკა, ატვირთვა, alt / დოკუმენტის ველები, წაშლა,
 * გამოყენება) და `GET /media/*` (ფაილის მიწოდება საცავიდან, ერთი origin — B0 #4, #7).
 *
 * წესი ადმინის mock-ისაა — საერთო `src/admin/api/library.js` (ბიბლიოთეკა, გამოყენება, ცვლილება
 * ყველა გამოყენებაში, 409) და `src/content/files.js` (ტიპი შიგთავსით, გაფართოება ↔ შიგთავსი,
 * ზომა). სერვერზე დამატებით: ფოტოს ხელახალი კოდირება (EXIF / GPS-ის წაშლა), PDF-ის და VTT-ის
 * შემოწმება (`lib/media-files.js`), საცავი (`app.storage`).
 *
 * შეცდომები: ფაილი (ტიპი, შეუსაბამობა, ზომა, დაზიანება, VTT) → 400 + `fields.file`; მეტა-ველი
 * (alt-ის სიგრძე, ratio, lang) → 422 / 400 (B1-ის წესი); გამოყენებულის წაშლა → 409
 * („გამოიყენება N მასალაში“). guard-ები spec-იდან: `media.read` / `media.write` + CSRF.
 */

/** @typedef {import('@/admin/api/library.js').FileRecord} FileRecord */

// eslint-disable-next-line no-control-regex -- განზრახ: მართვის სიმბოლოების ამოღება
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** multipart: ერთი ფაილი + მეტა-ველები (`MediaUpload`: alt, title, ratio, lang, tagged). */
const MULTIPART_LIMITS = Object.freeze({
  files: 1,
  fields: 8,
  parts: 9,
  fieldSize: 4096,
  headerPairs: 100,
});

/**
 * ბიბლიოთეკის წყარო: მასალა (სამუშაო ასლით) + ფაილების რეესტრი.
 * @param {import('fastify').FastifyInstance} app
 */
export async function libraryState(app) {
  const repos = repositories(app);
  const [lists, docs] = await Promise.all([
    Promise.all(CONTENT_TYPES.map((type) => repos.content.list(type))),
    repos.media.list(),
  ]);
  return {
    records: Object.fromEntries(CONTENT_TYPES.map((type, i) => [type, lists[i]])),
    files: docs.map(toFileRecord),
  };
}

/**
 * @param {import('fastify').FastifyInstance} app
 */
export async function registerMediaRoutes(app) {
  const { spec } = app;
  const { limits, maxPixels } = app.config.media;
  const metaAjv = createAjv(spec);
  const validateMeta = metaAjv.compile(schemaRef('MediaUpload'));
  const maxBytes = Math.max(...Object.values(limits));
  /**
   * ზღვარს გადაცილებული ფაილი ბოლომდე არ იკითხება — სახე გაფართოებით (ტექსტისთვის), სხვაგვარად
   * საერთო მაქსიმუმი.
   * @param {string} name
   */
  const limitFor = (name) => {
    const extension = fileExtension(name);
    const found = Object.values(MEDIA_TYPES).find((info) =>
      /** @type {readonly string[]} */ (info.extensions).includes(extension),
    );
    return found ? limits[/** @type {'image' | 'document' | 'track'} */ (found.kind)] : maxBytes;
  };

  route(app, spec, 'listMedia', async (request) => {
    const { records, files } = await libraryState(app);
    return filterLibrary(
      buildLibrary(records, files),
      /** @type {{ kind?: 'image' | 'document', missingAlt?: boolean }} */ (request.query),
    );
  });

  // multipart მხოლოდ ამ route-ის კონტექსტშია — სხვა endpoint-ი მას არ იღებს (CSRF, B3)
  await app.register(async (scope) => {
    await scope.register(multipart, { limits: MULTIPART_LIMITS, throwFileSizeLimit: true });

    route(scope, spec, 'uploadMedia', async (request, reply) => {
      const { file, meta } = await readUpload(request, maxBytes, limitFor);
      const metaValid = validateMeta({ file: '', ...meta });
      if (!metaValid) {
        const fields = validationFields(validateMeta.errors ?? []);
        throw fields
          ? new ContentError('validation', { fields, detail: 'MediaUpload' })
          : new ContentError('bad-request', { detail: 'MediaUpload' });
      }
      if (!file) {
        throw new ContentError('validation', { fields: { file: fieldError('required') } });
      }
      const check = checkFile(
        {
          name: file.name,
          type: file.type,
          size: file.size,
          head: file.buffer.subarray(0, SNIFF_BYTES),
        },
        { limits },
      );
      if (!check.ok) throw fileError(check.code, { max: check.max });

      let data = file.buffer;
      /** @type {{ width: number | null, height: number | null, cues: number | null, end: number | null }} */
      const extra = { width: null, height: null, cues: null, end: null };
      if (check.kind === 'image') {
        const image = await processImage(file.buffer, {
          mime: /** @type {any} */ (check.mime),
          maxPixels,
        });
        data = image.data;
        extra.width = image.width;
        extra.height = image.height;
      } else if (check.kind === 'document') checkPdf(file.buffer);
      else Object.assign(extra, checkVtt(file.buffer));

      const key = newMediaKey(check.kind, check.mime, app.now());
      await app.storage.put(key, data, {
        contentType: check.mime,
        cacheControl: MEDIA_CACHE_CONTROL,
      });
      const isDoc = check.kind === 'document';
      /** @type {import('../db/media.js').MediaDoc} */
      let doc;
      try {
        doc = await repositories(app).media.insert({
          kind: check.kind,
          key,
          mime: check.mime,
          size: data.length,
          title: String(meta.title ?? displayName(file.name)).slice(0, 300),
          alt: check.kind === 'image' ? String(meta.alt ?? '').trim() : '',
          ratio:
            check.kind === 'image'
              ? /** @type {any} */ (meta.ratio ?? detectRatio(extra.width ?? 0, extra.height ?? 0))
              : null,
          width: extra.width,
          height: extra.height,
          lang: isDoc ? /** @type {any} */ (meta.lang ?? 'ka') : null,
          tagged: isDoc ? meta.tagged === 'true' : null,
          cues: extra.cues,
          end: extra.end,
          createdBy: actorId(request),
        });
      } catch (error) {
        await app.storage.delete(key).catch(() => {});
        throw error;
      }
      request.log.info({ kind: check.kind, size: data.length }, 'media.upload');
      reply.code(201);
      return findMediaItem({}, [toFileRecord(doc)], doc._id);
    });
  });

  route(app, spec, 'updateMedia', async (request) => {
    const { id } = /** @type {{ id: string }} */ (request.params);
    const { records, files } = await libraryState(app);
    const found = findMediaItem(records, files, id);
    const patch = normalizeMediaPatch(
      found.kind,
      /** @type {import('@/admin/api/library.js').MediaPatch} */ (request.body),
    );
    const by = actorId(request);
    const embedded = parseEmbeddedId(id);
    if (embedded) {
      await patchContent(
        app,
        embedded.recordId,
        { path: embedded.path, kind: found.kind },
        patch,
        by,
      );
    } else {
      const file = /** @type {FileRecord} */ (files.find((f) => f.id === id));
      /** @type {Record<string, unknown>} */
      const set = {};
      if (found.kind === 'image' && patch.alt !== undefined) set.alt = patch.alt;
      if (found.kind === 'document') {
        if (patch.title !== undefined) set.title = patch.title;
        if (patch.lang !== undefined) set.lang = patch.lang;
        if (patch.tagged !== undefined) set.tagged = patch.tagged;
      }
      await repositories(app).media.update(id, set);
      for (const recordId of new Set(found.usage.map((u) => u.id))) {
        await patchContent(app, recordId, { src: file.src, kind: found.kind }, patch, by);
      }
    }
    const after = await libraryState(app);
    return findMediaItem(after.records, after.files, id);
  });

  route(app, spec, 'deleteMedia', async (request) => {
    const { id } = /** @type {{ id: string }} */ (request.params);
    const { records, files } = await libraryState(app);
    const found = findMediaItem(records, files, id);
    // ჩადგმული ფოტო ყოველთვის მასალაშია; ფაილი — თუ რომელიმე მასალა (ან სამუშაო ასლი) იყენებს
    if (parseEmbeddedId(id) || found.usage.length) throw inUseError(found.usage);
    // ტრანზაქციაში თავიდან მოწმდება (ამასობაში ჩასმა) + ძველი ვერსიების `src` → null
    const { doc, scrubbed } = await repositories(app).media.remove(id, (count) =>
      inUseError(count),
    );
    try {
      await app.storage.delete(doc.key);
    } catch (error) {
      // ჩანაწერი უკვე წაიშალა — ფაილი საცავში ობოლი რჩება (გასაღები შემთხვევითია, ბმული არსად არის)
      request.log.warn({ err: { type: /** @type {Error} */ (error).name } }, 'media.storage');
    }
    request.log.info({ kind: doc.kind, scrubbed }, 'media.delete');
    return { ok: /** @type {const} */ (true) };
  });

  route(app, spec, 'getMediaUsage', async (request) => {
    const { id } = /** @type {{ id: string }} */ (request.params);
    const { records, files } = await libraryState(app);
    return findMediaItem(records, files, id).usage;
  });

  registerMediaDelivery(app);
}

/**
 * მასალის ცვლილება ბიბლიოთეკიდან (ვერსია ამოწმებს ერთდროულ რედაქტირებას — 409).
 * @param {import('fastify').FastifyInstance} app
 * @param {string} recordId
 * @param {{ path?: string, src?: string | null, kind: 'image' | 'document' | 'track' }} target
 * @param {import('@/admin/api/library.js').MediaPatch} patch
 * @param {string} by
 */
async function patchContent(app, recordId, target, patch, by) {
  const { content } = repositories(app);
  const record = await content.find(recordId);
  if (!record) throw new ContentError('not-found', { detail: `content/${recordId}` });
  const working = record.working?.item ?? null;
  const next = patchRecord(record.item, working, target, patch);
  if (next.item) {
    await content.replace(recordId, next.item, {
      by,
      version: record.meta.version,
      working: next.working ?? working,
    });
  } else if (next.working) {
    await content.saveWorking(recordId, next.working, {
      by: record.working?.by ?? by,
      version: record.meta.version,
    });
  }
}

/**
 * @param {import('fastify').FastifyRequest} request
 * @param {number} maxBytes
 * @param {(name: string) => number} limitFor
 * @returns {Promise<{ file: { name: string, type: string, size: number, buffer: Buffer } | null, meta: Record<string, string> }>}
 */
async function readUpload(request, maxBytes, limitFor) {
  if (!request.isMultipart()) throw new ContentError('bad-request', { detail: 'multipart' });
  /** @type {{ name: string, type: string, size: number, buffer: Buffer } | null} */
  let file = null;
  /** @type {Record<string, string>} */
  const meta = {};
  try {
    for await (const part of request.parts({ limits: { fileSize: maxBytes } })) {
      if (part.type === 'file') {
        if (part.fieldname !== 'file') {
          part.file.resume();
          throw new ContentError('bad-request', { detail: `multipart: ${part.fieldname}` });
        }
        /** @type {Buffer} */
        let buffer;
        try {
          buffer = await part.toBuffer();
        } catch (error) {
          if (/** @type {{ code?: string }} */ (error).code === 'FST_REQ_FILE_TOO_LARGE') {
            throw fileError('fileTooLarge', { max: Math.min(maxBytes, limitFor(part.filename)) });
          }
          throw error;
        }
        file = {
          name: part.filename ?? '',
          type: part.mimetype ?? '',
          size: buffer.length,
          buffer,
        };
      } else {
        if (Object.hasOwn(meta, part.fieldname)) {
          throw new ContentError('bad-request', { detail: `multipart: ${part.fieldname} ×2` });
        }
        meta[part.fieldname] = String(part.value);
      }
    }
  } catch (error) {
    if (error instanceof ContentError) throw error;
    const code = /** @type {{ code?: string }} */ (error).code;
    throw new ContentError('bad-request', { detail: `multipart: ${code ?? 'error'}` });
  }
  return { file, meta };
}

/**
 * ფაილის სახელი სათაურისთვის: გზის გარეშე (ძველი ბრაუზერი სრულ გზას აგზავნის), NFC.
 * @param {string} name
 */
function displayName(name) {
  return (
    basename(String(name).replace(/\\/g, '/'))
      .normalize('NFC')
      // მართვის სიმბოლოები (U+0000–U+001F, U+007F) — სათაურში და header-ში არ ხვდება
      .replace(CONTROL_CHARS, '')
      .trim()
  );
}

/**
 * `GET /media/<key>` — ფაილი საცავიდან. საჯაროა (გასაღები შემთხვევითია, 128 ბიტი) და უცვლელი:
 * `Cache-Control: immutable`, ETag / 304. ტიპი გასაღების გაფართოებით (საცავის მეტამონაცემს არ
 * ვენდობით) + `nosniff`; CSP `sandbox` — პირდაპირ გახსნილი ფაილი სკრიპტს ვერ გაუშვებს. PDF —
 * `attachment` (საიტზე „PDF-ის ჩამოტვირთვა“), სათაურით.
 * @param {import('fastify').FastifyInstance} app
 */
function registerMediaDelivery(app) {
  /** @type {import('fastify').RouteHandlerMethod} */
  const deliver = async (request, reply) => {
    const key = /** @type {Record<string, string>} */ (request.params)['*'];
    if (!isMediaKey(key)) return reply.callNotFound();
    const head = request.method === 'HEAD';
    const object = head ? await app.storage.head(key) : await app.storage.get(key);
    if (!object) return reply.callNotFound();
    const type = contentTypeOfKey(key);
    reply
      .header('content-type', type === 'text/vtt' ? 'text/vtt; charset=utf-8' : type)
      .header('cache-control', MEDIA_CACHE_CONTROL)
      .header('etag', object.etag)
      .header('content-security-policy', "default-src 'none'; sandbox")
      .header('cross-origin-resource-policy', 'same-origin');
    if (type === 'application/pdf') {
      const doc = await repositories(app).media.findByKey(key);
      reply.header('content-disposition', attachment(doc?.title ?? ''));
    } else reply.header('content-disposition', 'inline');
    const notModified = request.headers['if-none-match'] === object.etag;
    if (head || notModified) {
      const body = /** @type {any} */ (object).body;
      if (body && typeof body.destroy === 'function') body.destroy();
      if (notModified) reply.code(304);
      else reply.header('content-length', object.size);
      return reply.send();
    }
    reply.header('content-length', object.size);
    return reply.send(/** @type {any} */ (object).body);
  };
  const url = `${MEDIA_PATH}*`;
  // HEAD — ცალკე route: Fastify-ის ავტომატური HEAD ნაკადს ბოლომდე კითხულობს (R2-იდან ჩამოტვირთვა)
  app.route({ method: 'GET', url, exposeHeadRoute: false, handler: deliver });
  app.route({ method: 'HEAD', url, handler: deliver });
}

/**
 * `Content-Disposition: attachment` — ASCII-სახელი + `filename*` (RFC 6266 / 5987, ქართული სათაური).
 * @param {string} title
 */
export function attachment(title) {
  const base = displayName(title).replace(/\.pdf$/i, '') || 'document';
  const ascii =
    base
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/["\\;]/g, '')
      .trim() || 'document';
  return `attachment; filename="${ascii}.pdf"; filename*=UTF-8''${encodeURIComponent(`${base}.pdf`)}`;
}

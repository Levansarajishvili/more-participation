import { createLocalStorage } from './local.js';
import { createMemoryStorage } from './memory.js';
import { createS3Storage } from './s3.js';

export * from './keys.js';

/**
 * ფაილების საცავი (B5). ერთი ინტერფეისი სამ რეალიზაციაზე:
 *
 * | `MEDIA_STORAGE` | რეალიზაცია | სად |
 * |---|---|---|
 * | `r2` | S3 API (SigV4) — Cloudflare R2 | წარმოება (B0 #7); სხვა S3-თავსებადიც (`R2_ENDPOINT`) |
 * | `local` | დისკი (`MEDIA_DIR`, ნაგულისხმევი `server/.media/`) | development |
 * | `memory` | მეხსიერება | ტესტი |
 *
 * საჯარო მისამართი ყოველთვის `/media/<key>`-ია (ერთი origin, B0 #4): ფაილს Fastify აწვდის
 * (`server/routes/media.js`), საცავი გარედან არ ჩანს — signed URL არ არის საჭირო. გასაღები
 * შემთხვევითია (128 ბიტი) და უცვლელი: `Cache-Control: immutable`. `MEDIA_BASE_URL` (R2-ის
 * custom domain / CDN) — B7, არასავალდებულო.
 */

/**
 * @typedef {object} StoredHead
 * @property {string} contentType
 * @property {number} size
 * @property {string} etag   ბრჭყალებით (`"…"`)
 */

/** @typedef {StoredHead & { body: Buffer | import('node:stream').Readable }} StoredObject */

/**
 * @typedef {object} Storage
 * @property {'r2' | 'local' | 'memory'} kind
 * @property {(key: string, body: Buffer, meta: { contentType: string, cacheControl?: string }) => Promise<void>} put
 * @property {(key: string) => Promise<StoredObject | null>} get     null — არ არსებობს
 * @property {(key: string) => Promise<StoredHead | null>} head
 * @property {(key: string) => Promise<void>} delete                  არარსებული — შეცდომის გარეშე
 */

/**
 * @param {import('../config.js').MediaConfig} media
 * @param {{ fetch?: typeof fetch, now?: () => number }} [options]
 * @returns {Storage}
 */
export function createStorage(media, options = {}) {
  switch (media.storage) {
    case 'r2':
      return createS3Storage(
        /** @type {NonNullable<typeof media.r2>} */ (media.r2),
        /** @type {any} */ (options),
      );
    case 'local':
      return createLocalStorage({ dir: media.dir });
    default:
      return createMemoryStorage();
  }
}

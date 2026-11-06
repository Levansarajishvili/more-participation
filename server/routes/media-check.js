import { fileFieldError, fileNodes } from '@/admin/api/library.js';

import { MEDIA_PATH } from '../db/derive.js';
import { repositories } from '../lib/auth.js';
import { keyOfSrc } from '../storage/keys.js';

/**
 * გამოქვეყნებისას (`content.js`): ყოველი `/media/` ფაილი რეესტრში უნდა იყოს (`fileMissing`), VTT-ის
 * `cues` / `end` — სერვერის `parseCaptions`-იდან (კლიენტის მნიშვნელობას არ ვენდობით).
 * @param {import('fastify').FastifyInstance} app
 * @param {Record<string, any>} item
 * @returns {Promise<{ item: Record<string, any>, missing: Record<string, { code: string, message: string }> }>}
 */
export async function reconcileFiles(app, item) {
  const nodes = fileNodes(item).filter(
    ({ node }) => typeof node.src === 'string' && node.src.startsWith(MEDIA_PATH),
  );
  if (!nodes.length) return { item, missing: {} };
  const keys = [...new Set(nodes.map(({ node }) => keyOfSrc(node.src)).filter(Boolean))];
  const docs = await repositories(app).media.findByKeys(/** @type {string[]} */ (keys));
  const byKey = new Map(docs.map((doc) => [doc.key, doc]));
  /** @type {Record<string, { code: string, message: string }>} */
  const missing = {};
  const next = structuredClone(item);
  for (const { path, node, kind } of fileNodes(next)) {
    if (typeof node.src !== 'string' || !node.src.startsWith(MEDIA_PATH)) continue;
    const key = keyOfSrc(node.src);
    const doc = key ? byKey.get(key) : undefined;
    if (!doc) missing[path] = fileFieldError('fileMissing');
    else if (kind === 'track' && doc.kind === 'track' && doc.cues !== null) {
      node.cues = doc.cues;
      node.end = doc.end;
    }
  }
  return { item: next, missing };
}

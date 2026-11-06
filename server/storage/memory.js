import { createHash } from 'node:crypto';

import { assertKey } from './keys.js';

/**
 * მეხსიერების საცავი — ტესტი (`MEDIA_STORAGE=memory`). პროცესის დასრულებისას იშლება.
 * @returns {import('./index.js').Storage & { size: () => number, keys: () => string[] }}
 */
export function createMemoryStorage() {
  /** @type {Map<string, { body: Buffer, contentType: string, etag: string }>} */
  const objects = new Map();
  return {
    kind: 'memory',
    async put(key, body, { contentType }) {
      assertKey(key);
      const etag = `"${createHash('sha256').update(body).digest('hex').slice(0, 32)}"`;
      objects.set(key, { body: Buffer.from(body), contentType, etag });
    },
    async get(key) {
      assertKey(key);
      const found = objects.get(key);
      return found ? { ...found, body: Buffer.from(found.body), size: found.body.length } : null;
    },
    async head(key) {
      assertKey(key);
      const found = objects.get(key);
      return found
        ? { contentType: found.contentType, size: found.body.length, etag: found.etag }
        : null;
    },
    async delete(key) {
      assertKey(key);
      objects.delete(key);
    },
    size: () => objects.size,
    keys: () => [...objects.keys()],
  };
}

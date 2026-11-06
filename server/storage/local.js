import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import { assertKey, contentTypeOfKey } from './keys.js';

/**
 * დისკის საცავი — development (`MEDIA_STORAGE=local`, `MEDIA_DIR`). წარმოებაში არ გამოიყენება:
 * Render-ის დისკი deploy-ზე იშლება (config: production → მხოლოდ `r2`).
 *
 * გასაღები `assertKey`-ით მოწმდება და გზა საქაღალდის შიგნით რჩება; ჩაწერა ატომურია (დროებითი
 * ფაილი → `rename`), ნახევრად ჩაწერილ ფაილს `get` ვერ წაიკითხავს.
 * @param {{ dir: string }} options
 * @returns {import('./index.js').Storage}
 */
export function createLocalStorage({ dir }) {
  const root = resolve(dir);

  /** @param {string} key */
  function pathOf(key) {
    assertKey(key);
    const path = resolve(root, ...key.split('/'));
    if (!path.startsWith(root + sep)) throw new Error('storage: outside root');
    return path;
  }

  /** @param {import('node:fs').Stats} info */
  const etagOf = (info) => `"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`;

  /** @param {string} path */
  async function statFile(path) {
    try {
      const info = await stat(path);
      return info.isFile() ? info : null;
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
      throw error;
    }
  }

  return {
    kind: 'local',
    async put(key, body) {
      const path = pathOf(key);
      await mkdir(dirname(path), { recursive: true });
      const temp = join(dirname(path), `.${randomBytes(6).toString('hex')}.tmp`);
      await writeFile(temp, body, { flag: 'wx' });
      await rename(temp, path);
    },
    async get(key) {
      const path = pathOf(key);
      const info = await statFile(path);
      if (!info) return null;
      return {
        body: createReadStream(path),
        contentType: contentTypeOfKey(key),
        size: info.size,
        etag: etagOf(info),
      };
    },
    async head(key) {
      const path = pathOf(key);
      const info = await statFile(path);
      return info
        ? { contentType: contentTypeOfKey(key), size: info.size, etag: etagOf(info) }
        : null;
    },
    async delete(key) {
      await rm(pathOf(key), { force: true });
    },
  };
}

import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../config.js';
import {
  contentTypeOfKey,
  createStorage,
  isMediaKey,
  keyOfSrc,
  mediaSrc,
  newMediaKey,
} from '../../storage/index.js';
import { createLocalStorage } from '../../storage/local.js';
import { createMemoryStorage } from '../../storage/memory.js';
import { createS3Storage } from '../../storage/s3.js';
import { EMPTY_SHA256, sha256Hex, signRequest } from '../../storage/sigv4.js';

/**
 * B5: საცავი — ერთი ინტერფეისი (`put` / `get` / `head` / `delete`) სამ რეალიზაციაზე; R2 — SigV4
 * (AWS-ის დოკუმენტაციის მაგალითები) და S3-თავსებადი სატესტო სერვერი, რომელიც ხელმოწერას
 * თავიდან ითვლის.
 */

const AWS = {
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  date: new Date('2013-05-24T00:00:00Z'),
};

describe('SigV4 — AWS-ის მაგალითები (sig-v4-header-based-auth)', () => {
  it('GET Object (Range) — ზუსტი ხელმოწერა', () => {
    const { signature, headers } = signRequest({
      ...AWS,
      method: 'GET',
      host: 'examplebucket.s3.amazonaws.com',
      path: '/test.txt',
      headers: { range: 'bytes=0-9' },
      payloadHash: EMPTY_SHA256,
    });
    expect(signature).toBe('f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
    expect(headers.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
  });

  it('PUT Object — `$` გზაში იკოდირდება, payload-ის hash', () => {
    const payload = 'Welcome to Amazon S3.';
    expect(sha256Hex(payload)).toBe(
      '44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072',
    );
    const { signature } = signRequest({
      ...AWS,
      method: 'PUT',
      host: 'examplebucket.s3.amazonaws.com',
      path: '/test$file.text',
      headers: {
        date: 'Fri, 24 May 2013 00:00:00 GMT',
        'x-amz-storage-class': 'REDUCED_REDUNDANCY',
      },
      payloadHash: sha256Hex(payload),
    });
    expect(signature).toBe('98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd');
  });
});

describe('გასაღები', () => {
  it('`<სახე>/<წელი>/<22>.<გაფართოება>`; src ↔ გასაღები; ტიპი გაფართოებით', () => {
    const key = newMediaKey('image', 'image/jpeg', Date.parse('2026-11-06T10:00:00Z'));
    expect(key).toMatch(/^image\/2026\/[A-Za-z0-9_-]{22}\.jpg$/);
    expect(isMediaKey(key)).toBe(true);
    expect(keyOfSrc(mediaSrc(key))).toBe(key);
    expect(contentTypeOfKey('track/2026/AAAAAAAAAAAAAAAAAAAAAA.vtt')).toBe('text/vtt');
    for (const bad of [
      '../x.jpg',
      'image/2026/a/../../b.jpg',
      'image/26/AAAAAAAAAAAAAAAAAAAAAA.jpg',
      'image/2026/AAAAAAAAAAAAAAAAAAAAAA.svg',
    ]) {
      expect(isMediaKey(bad), bad).toBe(false);
    }
    expect(keyOfSrc('https://example.org/media/x.jpg')).toBeNull();
  });

  it('createStorage: config.media → რეალიზაცია', () => {
    expect(createStorage(loadConfig({ NODE_ENV: 'test' }).media).kind).toBe('memory');
    expect(createStorage({ ...loadConfig({}).media, dir: tmpdir() }).kind).toBe('local');
  });
});

const KEY = 'document/2026/AAAAAAAAAAAAAAAAAAAAAA.pdf';

/**
 * @param {import('../../storage/index.js').Storage} storage
 */
async function roundTrip(storage) {
  expect(await storage.get(KEY)).toBeNull();
  expect(await storage.head(KEY)).toBeNull();
  await storage.put(KEY, Buffer.from('%PDF-1.7 ტესტი'), { contentType: 'application/pdf' });
  const head = await storage.head(KEY);
  expect(head?.size).toBe(Buffer.byteLength('%PDF-1.7 ტესტი'));
  expect(head?.etag).toMatch(/^".+"$/);
  const object = /** @type {NonNullable<Awaited<ReturnType<typeof storage.get>>>} */ (
    await storage.get(KEY)
  );
  const chunks = [];
  if (Buffer.isBuffer(object.body)) chunks.push(object.body);
  else for await (const chunk of object.body) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString()).toBe('%PDF-1.7 ტესტი');
  await storage.delete(KEY);
  await storage.delete(KEY);
  expect(await storage.head(KEY)).toBeNull();
  await expect(
    storage.put('../escape.pdf', Buffer.from('x'), { contentType: 'x' }),
  ).rejects.toThrow(/invalid key/);
}

describe('რეალიზაციები', () => {
  it('memory', async () => {
    await roundTrip(createMemoryStorage());
  });

  it('local: ატომური ჩაწერა, დროებითი ფაილი არ რჩება, საქაღალდის გარეთ — არა', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mc-media-'));
    try {
      const storage = createLocalStorage({ dir });
      await storage.put(KEY, Buffer.from('x'), { contentType: 'application/pdf' });
      expect(await readdir(join(dir, 'document', '2026'))).toEqual(['AAAAAAAAAAAAAAAAAAAAAA.pdf']);
      await storage.delete(KEY);
      await roundTrip(storage);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  describe('r2 (S3 API) — სატესტო სერვერი ხელმოწერის შემოწმებით', () => {
    const credentials = {
      accessKeyId: 'R2TESTKEY0123456789',
      secretAccessKey: 'r2-test-secret-value',
    };
    /** @type {Map<string, { body: Buffer, type: string }>} */
    const objects = new Map();
    /** @type {{ method: string, url: string, ok: boolean }[]} */
    const seen = [];
    /** @type {import('node:http').Server} */
    let server;
    let endpoint = '';

    beforeAll(async () => {
      server = createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks);
        const url = new URL(req.url ?? '/', 'http://x');
        const auth = String(req.headers.authorization ?? '');
        const signed = /SignedHeaders=([^,]+)/.exec(auth)?.[1].split(';') ?? [];
        const extra = Object.fromEntries(
          signed
            .filter((h) => !['host', 'x-amz-content-sha256', 'x-amz-date'].includes(h))
            .map((h) => [h, String(req.headers[h])]),
        );
        const date = String(req.headers['x-amz-date']);
        const expected = signRequest({
          method: String(req.method),
          host: String(req.headers.host),
          path: decodeURIComponent(url.pathname),
          headers: extra,
          payloadHash: String(req.headers['x-amz-content-sha256']),
          date: new Date(
            `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`,
          ),
          region: 'auto',
          ...credentials,
        });
        const hashOk =
          String(req.headers['x-amz-content-sha256']) ===
          (body.length ? sha256Hex(body) : EMPTY_SHA256);
        const ok = auth === expected.headers.authorization && hashOk;
        seen.push({ method: String(req.method), url: url.pathname, ok });
        if (!ok) return res.writeHead(403).end();
        const key = url.pathname;
        if (req.method === 'PUT') {
          objects.set(key, { body, type: String(req.headers['content-type']) });
          return res.writeHead(200, { etag: '"abc"' }).end();
        }
        const found = objects.get(key);
        if (req.method === 'DELETE') {
          objects.delete(key);
          return res.writeHead(204).end();
        }
        if (!found) return res.writeHead(404).end();
        const headers = {
          'content-type': found.type,
          'content-length': found.body.length,
          etag: '"abc"',
        };
        if (req.method === 'HEAD') return res.writeHead(200, headers).end();
        return res.writeHead(200, headers).end(found.body);
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
      endpoint = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
    });
    afterAll(() => new Promise((resolve) => server.close(() => resolve(undefined))));

    it('PUT / HEAD / GET / DELETE path-style, ყოველი მოთხოვნა ხელმოწერილია', async () => {
      const storage = createS3Storage({
        endpoint,
        region: 'auto',
        bucket: 'mc-media',
        ...credentials,
      });
      await roundTrip(storage);
      expect(seen.every((r) => r.ok)).toBe(true);
      expect(seen.every((r) => r.url === `/mc-media/${KEY}`)).toBe(true);
      expect(new Set(seen.map((r) => r.method))).toEqual(new Set(['GET', 'HEAD', 'PUT', 'DELETE']));
    });

    it('არასწორი საიდუმლო → შეცდომა ოპერაციით და სტატუსით, საიდუმლოს გარეშე', async () => {
      const storage = createS3Storage({
        endpoint,
        region: 'auto',
        bucket: 'mc-media',
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: 'wrong-secret-value-here',
      });
      const error = await storage
        .put(KEY, Buffer.from('x'), { contentType: 'application/pdf' })
        .catch((e) => e);
      expect(String(error.message)).toBe('storage: PutObject → HTTP 403');
      expect(String(error.message)).not.toContain('wrong-secret');
    });
  });
});

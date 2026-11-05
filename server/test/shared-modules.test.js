import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ALIAS_PREFIX, SRC_URL, resolveAlias } from '../alias.js';

const SERVER_DIR = fileURLToPath(new URL('..', import.meta.url));

describe('`@/` alias (resolve hook)', () => {
  it('`@/x` → src/x; სხვა specifier უცვლელია; src-ს გარეთ — არა', () => {
    expect(ALIAS_PREFIX).toBe('@/');
    expect(resolveAlias('@/content/validate.js')).toBe(
      new URL('content/validate.js', SRC_URL).href,
    );
    expect(resolveAlias('@fastify/helmet')).toBeNull();
    expect(resolveAlias('fastify')).toBeNull();
    expect(resolveAlias('@/../server/config.js')).toBeNull();
  });
});

describe('საერთო მოდულები სუფთა Node-ში (Vite-ის გარეშე)', () => {
  it('scripts/shared-smoke.js — ყველა იმპორტდება და მუშაობს', () => {
    const run = spawnSync(process.execPath, ['scripts/shared-smoke.js'], {
      cwd: SERVER_DIR,
      encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' },
      timeout: 30_000,
    });
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    const result = JSON.parse(run.stdout);
    expect(Object.keys(result.exports)).toEqual([
      'validate',
      'taxonomy',
      'slug',
      'text',
      'localize',
      'forms',
      'errors',
      'model',
      'youtube',
      'vtt',
      'query',
    ]);
    for (const count of Object.values(result.exports)) expect(count).toBeGreaterThan(0);
    expect(result.missingKey).toBe('does.not.exist');
    expect(result.contactFields).toEqual(['name', 'contact', 'topic', 'replyVia', 'consent']);
    expect(result.slug).toBe('chveva-5-nabiji');
    expect(result.localized).toEqual({ title: 'Title', lang: 'en' });
    expect(result.error).toEqual({ code: 'validation', message: expect.stringMatching(/\S/) });
    expect(result.videoChecks).toEqual(
      expect.arrayContaining(['youtubeMissing', 'captionsMissing']),
    );
    expect(result.captions).toBe(true);
    expect(result.youtube).toBe('dQw4w9WgXcQ');
  });
});

describe('საერთო მოდულები Vitest-ში (იგივე ფაილები, ასლის გარეშე)', () => {
  it('server-ის errors.js frontend-ის ContentError-ს იყენებს', async () => {
    const shared = await import('@/content/errors.js');
    const { toHttpError } = await import('../lib/errors.js');
    const result = toHttpError(new shared.ContentError('conflict'));
    expect(result.status).toBe(409);
    expect(result.error).toBeInstanceOf(shared.ContentError);
  });
});

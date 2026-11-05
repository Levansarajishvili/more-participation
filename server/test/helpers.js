import { Writable } from 'node:stream';

import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

/**
 * @param {Record<string, string>} [env]
 */
export function testConfig(env = {}) {
  return loadConfig({ NODE_ENV: 'test', ...env });
}

/**
 * pino-ს ლოგის დაჭერა (JSON ხაზები).
 * @returns {{ stream: Writable, lines: () => Record<string, any>[], text: () => string }}
 */
export function captureLogs() {
  /** @type {string[]} */
  const chunks = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });
  const text = () => chunks.join('');
  return {
    stream,
    text,
    lines: () =>
      text()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
  };
}

/**
 * @param {Partial<import('../app.js').AppOptions> & { env?: Record<string, string> }} [options]
 */
export async function makeApp({ env, ...options } = {}) {
  const app = await buildApp({ config: testConfig(env), ...options });
  await app.ready();
  return app;
}

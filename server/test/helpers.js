import { Writable } from 'node:stream';

import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

/**
 * B5: წარმოებაში ფაილები მხოლოდ R2-შია (config) — production-ის ტესტისთვის ყალბი მნიშვნელობები.
 * საცავი ზარმაცია: გაშვებისას ქსელს არ მიმართავს.
 */
export const FAKE_R2_ENV = Object.freeze({
  R2_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
  R2_BUCKET: 'mc-media-test',
  R2_ACCESS_KEY_ID: 'AKIAEXAMPLEKEY12345',
  R2_SECRET_ACCESS_KEY: 'fake-r2-secret-for-tests',
});

/**
 * B6: production-ის სავალდებულო env (R2 + ფორმები) — სატესტო, ყალბი მნიშვნელობებით.
 */
export const FAKE_PRODUCTION_ENV = Object.freeze({
  ...FAKE_R2_ENV,
  CONTACT_INBOX: 'inbox@example.org',
  PUBLIC_ORIGIN: 'https://example.org',
  SUBSCRIBE_SECRET: 'test-subscribe-secret-0123456789abcdef',
});

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

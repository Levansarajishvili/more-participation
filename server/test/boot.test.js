import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

import { describe, expect, inject, it } from 'vitest';

/**
 * რეალური გაშვება: `node server/index.js` (alias hook → config → ბაზა → listen → SIGTERM).
 */

const ENTRY = fileURLToPath(new URL('../index.js', import.meta.url));

/** @returns {Promise<number>} */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

/**
 * @param {Record<string, string>} env
 */
function start(env) {
  const child = spawn(process.execPath, [ENTRY], {
    env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => (stdout += chunk));
  child.stderr.on('data', (chunk) => (stderr += chunk));
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  return {
    child,
    exited: /** @type {Promise<number | null>} */ (exited),
    output: () => ({ stdout, stderr }),
    /** @param {RegExp} pattern @param {number} [ms] */
    waitFor: async (pattern, ms = 60_000) => {
      const until = Date.now() + ms;
      while (Date.now() < until) {
        if (pattern.test(stdout)) return;
        if (child.exitCode !== null) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`არ გამოჩნდა: ${pattern}\n${stdout}\n${stderr}`);
    },
  };
}

describe('node server/index.js', () => {
  it('production: ბაზასთან კავშირი, /api/health 200, SIGTERM → exit 0, ლოგში URI არ არის', async () => {
    const port = await freePort();
    const uri = inject('mongoUri');
    const server = start({
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      LOG_LEVEL: 'info',
      MONGODB_URI: uri,
      MONGODB_DB: 'mc_boot',
    });
    await server.waitFor(/Server listening/);
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', db: 'up' });
    server.child.kill('SIGTERM');
    expect(await server.exited).toBe(0);
    const { stdout, stderr } = server.output();
    expect(stderr).toBe('');
    expect(stdout).not.toContain(uri);
    expect(stdout).toMatch(/"msg":"shutting down"/);
    for (const line of stdout.trim().split('\n')) expect(() => JSON.parse(line)).not.toThrow();
  });

  it('development MONGODB_URI-ის გარეშე: დროებითი in-memory ბაზა + გაფრთხილება', async () => {
    const port = await freePort();
    const server = start({ NODE_ENV: 'development', PORT: String(port), LOG_LEVEL: 'info' });
    // გაფრთხილება listen-მდე იწერება — მოთხოვნა მხოლოდ „Server listening“-ის შემდეგ
    await server.waitFor(/Server listening/, 120_000);
    expect(server.output().stdout).toMatch(/in-memory/);
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
    server.child.kill('SIGINT');
    expect(await server.exited).toBe(0);
  }, 150_000);

  it('production MONGODB_URI-ის გარეშე → exit 1, ცვლადის სახელით', async () => {
    const server = start({ NODE_ENV: 'production' });
    expect(await server.exited).toBe(1);
    expect(server.output().stderr).toMatch(/MONGODB_URI: სავალდებულოა/);
  });

  it('მიუწვდომელი ბაზა → exit 1; პაროლი გამოსავალში არ ჩანს', async () => {
    const server = start({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://mc:s3cret-pass@127.0.0.1:1/x?directConnection=true',
      PORT: String(await freePort()),
    });
    expect(await server.exited).toBe(1);
    const { stdout, stderr } = server.output();
    expect(stderr).toMatch(/ბაზასთან კავშირი ვერ დამყარდა/);
    expect(stdout + stderr).not.toContain('s3cret-pass');
  });
});

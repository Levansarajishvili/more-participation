import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

import { describe, expect, inject, it } from 'vitest';

import { FAKE_PRODUCTION_ENV } from './helpers.js';

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
      ...FAKE_PRODUCTION_ENV,
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
    // B7: frontend-ის build იმავე სერვისზე (SITE_DIR — fixture), CSP mc-boot-ის hash-ით
    const home = await fetch(`http://127.0.0.1:${port}/`);
    expect(home.status).toBe(200);
    expect(home.headers.get('content-security-policy')).toMatch(/script-src 'self' 'sha256-/);
    expect(await home.text()).toContain('<div id="root"></div>');
    expect(server.output().stdout).toMatch(/"event":"startup".*"site":true/);
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
    const password = 'dev ტესტის პაროლი — ერთჯერადი';
    const server = start({
      NODE_ENV: 'development',
      PORT: String(port),
      LOG_LEVEL: 'info',
      // B3: in-memory ბაზაზე ადმინისტრატორი მხოლოდ env-იდან (ნაგულისხმევი ანგარიში არ არსებობს)
      ADMIN_EMAIL: 'dev-admin@example.org',
      ADMIN_NAME: '[დეველოპერი]',
      ADMIN_PASSWORD: password,
    });
    // გაფრთხილება listen-მდე იწერება — მოთხოვნა მხოლოდ „Server listening“-ის შემდეგ
    await server.waitFor(/Server listening/, 120_000);
    expect(server.output().stdout).toMatch(/in-memory/);
    // B2: in-memory ბაზაზე მიგრაცია + mock-ის seed ავტომატურად
    expect(server.output().stdout).toMatch(/"seeded":58/);
    expect(server.output().stdout).toMatch(/"admin":"created"/);
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
    const login = await fetch(`http://127.0.0.1:${port}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'dev-admin@example.org', password }),
    });
    expect(login.status).toBe(200);
    expect((await login.json()).user.role).toBe('admin');
    server.child.kill('SIGINT');
    expect(await server.exited).toBe(0);
    const { stdout, stderr } = server.output();
    expect(stdout + stderr).not.toContain(password);
    expect(stdout + stderr).not.toContain('dev-admin@example.org');
  }, 150_000);

  it('production MONGODB_URI-ის გარეშე → exit 1, ცვლადის სახელით', async () => {
    const server = start({ NODE_ENV: 'production' });
    expect(await server.exited).toBe(1);
    expect(server.output().stderr).toMatch(/MONGODB_URI: სავალდებულოა/);
  });

  it('მიუწვდომელი ბაზა → exit 1; პაროლი გამოსავალში არ ჩანს', async () => {
    const server = start({
      NODE_ENV: 'production',
      ...FAKE_PRODUCTION_ENV,
      MONGODB_URI: 'mongodb://mc:s3cret-pass@127.0.0.1:1/x?directConnection=true',
      PORT: String(await freePort()),
    });
    expect(await server.exited).toBe(1);
    const { stdout, stderr } = server.output();
    expect(stderr).toMatch(/ბაზასთან კავშირი ვერ დამყარდა/);
    expect(stdout + stderr).not.toContain('s3cret-pass');
  });

  it('B7: MIGRATE_ON_START=1 — ცარიელ ბაზაზე მიგრაცია + საბაზისო ჩანაწერები გაშვებისას', async () => {
    const port = await freePort();
    const server = start({
      NODE_ENV: 'production',
      ...FAKE_PRODUCTION_ENV,
      HOST: '127.0.0.1',
      PORT: String(port),
      LOG_LEVEL: 'info',
      MONGODB_URI: inject('mongoUri'),
      MONGODB_DB: `mc_boot_migrate_${Math.random().toString(36).slice(2, 8)}`,
      MIGRATE_ON_START: '1',
    });
    await server.waitFor(/Server listening/);
    expect(server.output().stdout).toMatch(/"event":"migrate","changes":\d+,"basePages":7/);
    const settings = await fetch(`http://127.0.0.1:${port}/api/v1/settings`);
    expect(settings.status).toBe(200);
    server.child.kill('SIGTERM');
    expect(await server.exited).toBe(0);
  }, 60_000);

  it('B7: build-ის გარეშე (SITE_DIR-ში index.html არ არის) → exit 1, ახსნით', async () => {
    const server = start({
      NODE_ENV: 'production',
      ...FAKE_PRODUCTION_ENV,
      MONGODB_URI: inject('mongoUri'),
      MONGODB_DB: 'mc_boot_nosite',
      SITE_DIR: fileURLToPath(new URL('./fixtures/', import.meta.url)),
      PORT: String(await freePort()),
    });
    expect(await server.exited).toBe(1);
    expect(server.output().stderr).toMatch(/SITE_DIR: index\.html ვერ მოიძებნა/);
  }, 60_000);
});

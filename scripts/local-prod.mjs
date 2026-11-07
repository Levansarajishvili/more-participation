/**
 * B7: წარმოების ლოკალური გაშვება — `npm run build`-ის `dist/` + `node server/index.js` (NODE_ENV=production)
 * + in-memory MongoDB (replica set) + ყალბი S3 (R2-ის ნაცვლად) + ანგარიშები. smoke-ისა და აუდიტის
 * საფუძველი: ერთი და იგივე ნაკადი, რაც Render-ზე — pre-deploy `server:migrate`, `server:create-admin`,
 * მოწვევით რეგისტრაცია, ერთი სერვისი API + საიტი.
 *
 *   npm run build && node scripts/local-prod.mjs [--seed] [--mail-dir DIR] [--port N] [-- <ბრძანება…>]
 *
 * - `--` შემდეგ ბრძანება ეშვება env-ით: `BASE_URL`, `SMOKE_EMAIL` / `SMOKE_PASSWORD` (ადმინისტრატორი),
 *   `MC_ADMIN_EMAIL` / `MC_ADMIN_PASSWORD`, `MC_EDITOR_EMAIL` / `MC_EDITOR_PASSWORD`, `MC_MAIL_DIR`;
 *   დასრულებისას ყველაფერი ჩერდება და მისი კოდით გამოდის. ბრძანების გარეშე — მუშაობს Ctrl+C-მდე.
 * - `--seed` — mock-ის მონაცემი (`server:seed`, staging-ის მსგავსად; აუდიტი); მის გარეშე — მხოლოდ
 *   საბაზისო ჩანაწერები (ცარიელი წარმოების ბაზა; smoke).
 * - `--mail-dir` — სერვერი `NODE_ENV=development`-ით ეშვება (production-ში ფოსტა მხოლოდ resend / log-ია):
 *   წერილი ფაილად (`MAIL_TRANSPORT=file`), რომ აუდიტმა გამოწერის ბმული გახსნას. bundle — იგივე `dist/`.
 * - პაროლები ყოველ გაშვებაზე შემთხვევითია (`randomBytes`), მხოლოდ შვილობილ პროცესს გადაეცემა და
 *   ფაილში / ლოგში არ იწერება.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

import { startMemoryReplicaSet } from '../server/lib/dev-db.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const split = argv.indexOf('--');
const options = split > -1 ? argv.slice(0, split) : argv;
const command = split > -1 ? argv.slice(split + 1) : [];
/** @param {string} name */
const option = (name) => {
  const at = options.indexOf(name);
  return at > -1 ? options[at + 1] : undefined;
};
const seed = options.includes('--seed');
const mailDir = option('--mail-dir');
const port = Number(option('--port') ?? 4310);
const BASE_URL = `http://localhost:${port}`;

/** @param {string} message */
const log = (message) => console.error(`[local-prod] ${message}`);

/**
 * მინიმალური S3 (path-style PUT / GET / HEAD / DELETE) მეხსიერებაში — R2-ის ნაცვლად. ხელმოწერის
 * სისწორეს `server/test/media/storage.test.js` ამოწმებს; აქ მხოლოდ მისი არსებობა.
 */
async function startFakeS3() {
  /** @type {Map<string, { body: Buffer, type: string }>} */
  const objects = new Map();
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!String(req.headers.authorization ?? '').startsWith('AWS4-HMAC-SHA256 ')) {
      return res.writeHead(403).end();
    }
    const key = new URL(req.url ?? '/', 'http://s3').pathname;
    if (req.method === 'PUT') {
      objects.set(key, { body: Buffer.concat(chunks), type: String(req.headers['content-type']) });
      return res.writeHead(200, { etag: '"local"' }).end();
    }
    if (req.method === 'DELETE') {
      objects.delete(key);
      return res.writeHead(204).end();
    }
    const found = objects.get(key);
    if (!found) return res.writeHead(404).end();
    const headers = {
      'content-type': found.type,
      'content-length': found.body.length,
      etag: '"local"',
    };
    return res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : found.body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  return { endpoint: `http://127.0.0.1:${address.port}`, close: () => server.close() };
}

/**
 * @param {string[]} args
 * @param {Record<string, string | undefined>} env
 * @param {{ inherit?: boolean }} [options]
 * @returns {Promise<number>}
 */
function run(args, env, { inherit = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), {
      cwd: ROOT,
      env,
      stdio: inherit ? 'inherit' : ['ignore', 'ignore', 'inherit'],
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

/** @param {string} url @param {number} [ms] */
async function waitFor(url, ms = 60_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ჯერ არ უსმენს
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${url} არ გაიხსნა`);
}

/**
 * ადმინის HTTP კლიენტი cookie-ით და CSRF-ით (`__Host-mc-session` / `__Host-mc-csrf`).
 */
function adminClient() {
  /** @type {Map<string, string>} */
  const jar = new Map();
  return {
    /** @param {string} path @param {unknown} body */
    async post(path, body) {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'sec-fetch-site': 'same-origin',
          cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
          ...(jar.has('__Host-mc-csrf') && { 'x-csrf-token': jar.get('__Host-mc-csrf') }),
        },
        body: JSON.stringify(body),
      });
      for (const cookie of res.headers.getSetCookie()) {
        const [pair] = cookie.split(';');
        const [name, ...value] = pair.split('=');
        jar.set(name.trim(), value.join('='));
      }
      if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
      return res.json();
    },
  };
}

if (!existsSync(`${ROOT}dist/index.html`)) {
  log('dist/index.html არ არის — ჯერ `npm run build`');
  process.exit(1);
}

const admin = { email: 'admin@example.org', password: randomBytes(18).toString('base64url') };
const editor = { email: 'editor@example.org', password: randomBytes(18).toString('base64url') };
const mongo = await startMemoryReplicaSet();
const s3 = await startFakeS3();
/** @type {import('node:child_process').ChildProcess | null} */
let server = null;
let exitCode = 0;

const cleanup = async () => {
  server?.kill('SIGTERM');
  if (server && server.exitCode === null) {
    await new Promise((resolve) => server?.once('exit', resolve));
  }
  s3.close();
  await mongo.stop();
};
process.once('SIGINT', () => cleanup().then(() => process.exit(130)));

try {
  const production = !mailDir;
  /** @type {Record<string, string | undefined>} */
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    SYSTEMROOT: process.env.SYSTEMROOT,
    NODE_ENV: production ? 'production' : 'development',
    HOST: '127.0.0.1',
    PORT: String(port),
    LOG_LEVEL: 'warn',
    TRUST_PROXY: '1',
    MONGODB_URI: mongo.uri,
    MONGODB_DB: 'meti-chartuloba',
    MEDIA_STORAGE: 'r2',
    R2_ENDPOINT: s3.endpoint,
    R2_BUCKET: 'mc-media-local',
    R2_ACCESS_KEY_ID: 'LOCALPRODKEY000001',
    R2_SECRET_ACCESS_KEY: randomBytes(24).toString('base64url'),
    CONTACT_INBOX: 'inbox@example.org',
    PUBLIC_ORIGIN: production ? 'https://example.org' : BASE_URL,
    SUBSCRIBE_SECRET: randomBytes(32).toString('base64url'),
    SITE_DIR: `${ROOT}dist`,
    SITE_INDEXING: 'on',
    MAIL_TRANSPORT: production ? 'log' : 'file',
    ...(mailDir && { MAIL_DIR: mailDir }),
    // აუდიტი ბევრჯერ შედის და აგზავნის ფორმას — ზღვარი მაღალია (წარმოებაში — ნაგულისხმევი)
    RATE_LIMIT_AUTH_MAX: '1000',
    RATE_LIMIT_FORMS_MAX: '1000',
  };

  log(`მიგრაცია (pre-deploy: npm run server:migrate)…`);
  if ((await run(['node', 'server/scripts/migrate.js'], env)) !== 0) throw new Error('migrate');
  if (seed) {
    log('seed (staging: mock-ის მონაცემი)…');
    const code = await run(['node', 'server/scripts/seed.js'], { ...env, NODE_ENV: 'development' });
    if (code !== 0) throw new Error('seed');
  }
  log('პირველი ადმინისტრატორი (npm run server:create-admin)…');
  const created = await run(['node', 'server/scripts/create-admin.js'], {
    ...env,
    ADMIN_EMAIL: admin.email,
    ADMIN_NAME: '[ადმინისტრატორი]',
    ADMIN_PASSWORD: admin.password,
  });
  if (created !== 0) throw new Error('create-admin');

  server = spawn('node', ['server/index.js'], { cwd: ROOT, env, stdio: 'inherit' });
  await waitFor(`${BASE_URL}/api/health`);

  log('რედაქტორი — მოწვევით (ადმინი → მოწვევა → რეგისტრაცია)…');
  const client = adminClient();
  await client.post('/api/admin/auth/login', admin);
  const invite = await client.post('/api/admin/users/invites', { role: 'editor' });
  await adminClient().post('/api/admin/auth/register', {
    name: '[რედაქტორი]',
    email: editor.email,
    invite: invite.code,
    password: editor.password,
  });

  log(
    `${BASE_URL} — ${production ? 'production' : 'development + ფოსტა ფაილად'}, MongoDB 8.0 (memory)`,
  );
  const childEnv = {
    ...process.env,
    BASE_URL,
    SMOKE_EMAIL: admin.email,
    SMOKE_PASSWORD: admin.password,
    MC_ADMIN_EMAIL: admin.email,
    MC_ADMIN_PASSWORD: admin.password,
    MC_EDITOR_EMAIL: editor.email,
    MC_EDITOR_PASSWORD: editor.password,
    ...(mailDir && { MC_MAIL_DIR: mailDir }),
  };
  if (command.length) {
    exitCode = await run(command, childEnv, { inherit: true });
  } else {
    log('Ctrl+C — გაჩერება');
    await new Promise(() => {});
  }
} catch (error) {
  log(`შეცდომა: ${/** @type {Error} */ (error).message}`);
  exitCode = 1;
} finally {
  await cleanup();
}
process.exit(exitCode);

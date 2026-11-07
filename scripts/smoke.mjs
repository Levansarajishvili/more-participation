/**
 * B7: production smoke — Playwright (Chromium), ნებისმიერ გარემოზე `BASE_URL`-ით (staging / ლოკალური
 * production). ანგარიში — env-იდან (`SMOKE_EMAIL`, `SMOKE_PASSWORD`; კოდში და ფაილში არასოდეს).
 *
 *   BASE_URL=https://[სერვისი].onrender.com SMOKE_EMAIL=… SMOKE_PASSWORD=… npm run smoke
 *   npm run build && npm run smoke:local        # build + server + memory-server (scripts/local-prod.mjs)
 *
 * ნაბიჯები: header-ები (X-Robots-Tag, CSP, HSTS, Referrer-Policy, Permissions-Policy, robots.txt) →
 * შესვლა (cookie-ის ატრიბუტები: `__Host-`, HttpOnly, Secure, SameSite=Lax, Path=/, Domain-ის გარეშე) →
 * ახალი სტატია ფოტოთი → alt-ის გარეშე გამოქვეყნება ვერ ხერხდება (რედაქტორის ჯამი + სერვერის 422
 * `cover.alt`) → alt → გამოქვეყნება → საჯარო გვერდი ka + en (სერვერის `<title>`, 200, h1) →
 * წაშლა → საჯარო 404 → ფაილის წაშლა → გასვლა. CSP-ის დარღვევა ნებისმიერ გვერდზე — შეცდომა.
 *
 * შექმნილი სტატია და ფოტო ყოველთვის იშლება (შეცდომის შემთხვევაშიც). წინაპირობა:
 * `npx playwright install chromium` (ერთხელ). გამოსვლის კოდი: 0 — ყველა ნაბიჯი ✓, 1 — სხვა.
 */
import { deflateSync, crc32 } from 'node:zlib';

import { chromium } from 'playwright';

const BASE_URL = (process.env.BASE_URL ?? '').replace(/\/+$/, '');
const EMAIL = process.env.SMOKE_EMAIL ?? '';
const PASSWORD = process.env.SMOKE_PASSWORD ?? '';
const HEADED = process.argv.includes('--headed');

if (!/^https?:\/\/[^/]+$/.test(BASE_URL) || !EMAIL || !PASSWORD) {
  console.error('env: BASE_URL (https://…), SMOKE_EMAIL, SMOKE_PASSWORD — სავალდებულოა');
  process.exit(2);
}

const STAMP = new Date()
  .toISOString()
  .replace(/[-:T.Z]/g, '')
  .slice(0, 14);
const TITLE = `B7 smoke ტესტი ${STAMP}`;
const ALT = 'ტესტის ფოტო: ნარინჯისფერი მართკუთხედი';

/** @type {{ step: string, ok: boolean, detail?: string }[]} */
const results = [];

/**
 * @param {string} step
 * @param {() => Promise<string | void>} fn
 */
async function check(step, fn) {
  try {
    const detail = (await fn()) ?? undefined;
    results.push({ step, ok: true, detail });
    console.log(`✓ ${step}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const detail = /** @type {Error} */ (error).message.split('\n')[0];
    results.push({ step, ok: false, detail });
    console.log(`✗ ${step} — ${detail}`);
    // დიაგნოსტიკა: მისამართი, ხილული ტექსტის დასაწყისი, ეკრანის ანაბეჭდი (git / zip-ის გარეთ)
    if (typeof page !== 'undefined') {
      const text = await page
        .locator('main')
        .innerText({ timeout: 2000 })
        .catch(() => '');
      console.log(`  ${page.url()}\n  ${text.replace(/\s+/g, ' ').slice(0, 400)}`);
      await page.screenshot({ path: 'smoke-failure.png', fullPage: true }).catch(() => {});
    }
    throw error;
  }
}

/** @param {unknown} condition @param {string} message */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * მცირე PNG (3:2, ერთი ფერი) — ფაილი სატესტოა, რეპოში არ ინახება.
 * @param {number} width @param {number} height
 */
function png(width, height) {
  const chunk = (/** @type {string} */ type, /** @type {Buffer} */ data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, Buffer.from([232, 93, 4]))]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const browser = await chromium.launch({ headless: !HEADED });
const context = await browser.newContext({ baseURL: BASE_URL, locale: 'ka-GE' });
// CSP-ის დარღვევა ყოველ გვერდზე (`securitypolicyviolation`) — ბოლოს მოწმდება
await context.addInitScript(() => {
  /** @type {any} */ (window).__csp = [];
  document.addEventListener('securitypolicyviolation', (event) => {
    /** @type {any} */ (window).__csp.push(`${event.violatedDirective} ${event.blockedURI}`);
  });
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
/** @type {string[]} */
const csp = [];
const collectCsp = async () => {
  csp.push(...(await page.evaluate(() => /** @type {any} */ (window).__csp ?? [])));
};

/** @type {string | null} */
let itemId = null;
/** @type {string | null} */
let mediaId = null;
let slug = '';
let failed = false;

/** CSRF double-submit (`__Host-mc-csrf` → `X-CSRF-Token`); `json` — სხეულიანი მოთხოვნისთვის. */
async function csrfHeaders(json = false) {
  const cookies = await context.cookies(BASE_URL);
  const token = cookies.find((c) => c.name === '__Host-mc-csrf')?.value ?? '';
  return { 'x-csrf-token': token, ...(json && { 'content-type': 'application/json' }) };
}

try {
  await check('header-ები: საჯარო HTML, ადმინი, API, robots.txt', async () => {
    const home = await context.request.get('/');
    assert(home.status() === 200, `/ → ${home.status()}`);
    const h = home.headers();
    const policy = h['content-security-policy'] ?? '';
    assert(
      /script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/.test(policy),
      'CSP: mc-boot-ის hash არ არის',
    );
    assert(policy.includes('frame-src https://www.youtube-nocookie.com'), 'CSP: YouTube frame-src');
    assert(!/unsafe-inline|unsafe-eval/.test(policy), 'CSP: unsafe-*');
    assert(/max-age=\d{8}/.test(h['strict-transport-security'] ?? ''), 'HSTS');
    assert(h['referrer-policy'] === 'strict-origin-when-cross-origin', 'Referrer-Policy');
    assert((h['permissions-policy'] ?? '').includes('camera=()'), 'Permissions-Policy');
    assert(h['cache-control'] === 'no-cache', `HTML Cache-Control: ${h['cache-control']}`);
    for (const path of ['/admin', '/en/admin/login', '/api/health', '/api/v1/articles']) {
      const res = await context.request.get(path);
      assert(
        res.headers()['x-robots-tag'] === 'noindex, nofollow',
        `${path}: X-Robots-Tag ${res.headers()['x-robots-tag']}`,
      );
    }
    const robots = await (await context.request.get('/robots.txt')).text();
    assert(!/admin/i.test(robots), 'robots.txt-ში /admin წერია');
    const indexed = h['x-robots-tag'] === undefined;
    return `CSP ✓, HSTS ✓, ინდექსაცია: ${indexed ? 'on' : 'off (noindex — staging)'}`;
  });

  await check(
    'შესვლა: __Host- cookie-ები (HttpOnly / Secure / SameSite=Lax / Path=/ / Domain-ის გარეშე)',
    async () => {
      await page.goto('/admin/login');
      await page.fill('#login-email', EMAIL);
      await page.fill('#login-password', PASSWORD);
      await page.click('#auth-panel-login button[type=submit]');
      await page.waitForSelector('.mc-admin');
      const cookies = await context.cookies(BASE_URL);
      const session = cookies.find((c) => c.name === '__Host-mc-session');
      const token = cookies.find((c) => c.name === '__Host-mc-csrf');
      assert(session && token, 'სესიის / CSRF cookie არ არის');
      for (const cookie of [session, token]) {
        assert(cookie.secure, `${cookie.name}: Secure`);
        assert(cookie.sameSite === 'Lax', `${cookie.name}: SameSite=${cookie.sameSite}`);
        assert(cookie.path === '/', `${cookie.name}: Path=${cookie.path}`);
        assert(!cookie.domain.startsWith('.'), `${cookie.name}: Domain=${cookie.domain}`);
      }
      assert(session.httpOnly, 'სესია: HttpOnly');
      assert(!token.httpOnly, 'CSRF: JS-ით იკითხება (double-submit)');
      const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
      assert(!stored.includes(session.value), 'სესიის token localStorage-შია');
      return 'სესია HttpOnly, CSRF — JS-ისთვის';
    },
  );

  await check('ახალი სტატია ფოტოთი (alt-ის გარეშე) — მონახაზი', async () => {
    await page.goto('/admin/articles/new');
    await page.waitForSelector('.mc-rte__toolbar');
    await page.fill('#f-title', TITLE);
    await page.fill('#f-excerpt', 'B7-ის smoke ტესტი: სტატია იქმნება, ქვეყნდება და იშლება.');
    await page.fill('#f-author', 'B7 smoke');
    const upload = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/admin/media' && r.request().method() === 'POST',
    );
    await page.setInputFiles('#f-cover-file', {
      name: 'smoke.png',
      mimeType: 'image/png',
      buffer: png(300, 200),
    });
    const uploaded = await upload;
    assert(
      uploaded.status() === 201 || uploaded.status() === 200,
      `ატვირთვა → ${uploaded.status()}`,
    );
    mediaId = (await uploaded.json()).id ?? null;
    await page.click('.mc-rte__content');
    await page.keyboard.type('ტესტის აბზაცი — smoke ტესტი ამოწმებს გამოქვეყნების ნაკადს.');
    await page.waitForURL(/\/admin\/articles\/a-[^/?#]+$/, { timeout: 20_000 });
    itemId = new URL(page.url()).pathname.split('/').pop() ?? null;
    slug = await page.inputValue('#f-slug');
    assert(slug, 'slug ცარიელია');
    return `${itemId}, /articles/${slug}`;
  });

  await check(
    'alt-ის გარეშე გამოქვეყნება ვერ ხერხდება — რედაქტორი და სერვერი (422 cover.alt)',
    async () => {
      await page.click('.mc-editor__aside .mc-btn--cta');
      const summary = page.locator('.mc-error-summary');
      await summary.waitFor();
      assert((await summary.textContent())?.includes('alt'), 'ჯამში alt-ის შეცდომა არ არის');
      const item = await (await context.request.get(`/api/admin/items/${itemId}`)).json();
      const res = await context.request.post(`/api/admin/items/${itemId}/publish`, {
        headers: await csrfHeaders(true),
        data: { version: item.version },
      });
      assert(res.status() === 422, `სერვერი: ${res.status()} (მოსალოდნელი 422)`);
      const body = await res.json();
      assert(
        Object.keys(body.fields ?? {}).some((key) => key.startsWith('cover.alt')),
        `fields: ${Object.keys(body.fields ?? {}).join(', ')}`,
      );
      const pub = await context.request.get(`/api/v1/articles/${slug}`);
      assert(pub.status() === 404, `საჯარო API გამოქვეყნებამდე: ${pub.status()}`);
      return 'ჯამი ✓, სერვერი 422 ✓, საჯაროდ არ ჩანს ✓';
    },
  );

  await check('alt → გამოქვეყნება', async () => {
    await page.fill('#f-cover-alt', ALT);
    await page.locator('#f-cover-alt').blur();
    const publish = page.waitForResponse(
      (r) => /\/api\/admin\/items\/[^/]+\/publish$/.test(new URL(r.url()).pathname),
      { timeout: 30_000 },
    );
    await page.click('.mc-editor__aside .mc-btn--cta');
    // ბლოკერი რედაქტორში (ჯამი) — ტექსტით, რომ ჩავარდნა გასაგები იყოს
    const outcome = await Promise.race([
      publish.then((res) => ({ res })),
      page
        .locator('.mc-error-summary')
        .waitFor({ timeout: 30_000 })
        .then(async () => ({ summary: await page.locator('.mc-error-summary').innerText() })),
    ]);
    if ('summary' in outcome)
      throw new Error(`რედაქტორის ჯამი: ${outcome.summary.replace(/\s+/g, ' ')}`);
    assert(outcome.res.status() === 200, `გამოქვეყნება → ${outcome.res.status()}`);
    return 'HTTP 200';
  });

  await check('საჯარო გვერდი — ka (სერვერის <title>, 200, h1, ფოტო alt-ით)', async () => {
    const res = await page.goto(`/articles/${slug}`);
    assert(res?.status() === 200, `HTTP ${res?.status()}`);
    assert(
      (await res?.text())?.includes(`<title>${TITLE} — მეტი ჩართულობა</title>`),
      'სერვერის <title>',
    );
    // გვერდი h1-ს ჩატვირთვამდეც ხატავს (F5) — ველოდებით მასალის სათაურს
    await page.waitForFunction(
      (title) => document.querySelector('main h1')?.textContent?.trim() === title,
      TITLE,
      { timeout: 15_000 },
    );
    assert((await page.locator(`main img[alt="${ALT}"]`).count()) > 0, 'ფოტო alt-ით');
    await collectCsp();
    return `/articles/${slug}`;
  });

  await check(
    'საჯარო გვერდი — en (თარგმანის გარეშე: ქართული ტექსტი lang="ka", canonical → ka)',
    async () => {
      const res = await page.goto(`/en/articles/${slug}`);
      assert(res?.status() === 200, `HTTP ${res?.status()}`);
      await page.waitForSelector('main h1');
      assert((await page.getAttribute('html', 'lang')) === 'en', '<html lang="en">');
      const h1 = page.locator('main h1');
      assert((await h1.textContent())?.trim() === TITLE, 'h1');
      // მასალის ენა (WCAG 3.1.2): სათაურის ტექსტი (`<span lang="ka">`) ან წინაპარი — ka (F9)
      const lang = await h1.evaluate((el) =>
        (el.querySelector('[lang]') ?? el.closest('[lang]'))?.getAttribute('lang'),
      );
      assert(lang === 'ka', `სათაურის ენა: ${lang} (მოსალოდნელი ka)`);
      const canonical = await page.getAttribute('link[rel="canonical"]', 'href').catch(() => null);
      assert(!canonical || canonical.endsWith(`/articles/${slug}`), `canonical: ${canonical}`);
      await collectCsp();
      return `/en/articles/${slug}`;
    },
  );

  await check('წაშლა სიიდან (დადასტურებით) → საჯარო 404', async () => {
    await page.goto(`/admin/articles?q=smoke`);
    // ხელმისაწვდომი სახელი — „წაშლა: {სათაური}“ (VisuallyHidden; ჰარი ორწერტილამდე შეიძლება იყოს)
    await page.getByRole('button', { name: new RegExp(`^წაშლა\\s*:\\s*${TITLE}$`) }).click();
    await page.getByRole('button', { name: 'სამუდამოდ წაშლა' }).click();
    await page.getByText(`„${TITLE}“ წაიშალა.`).waitFor();
    itemId = null;
    const html = await context.request.get(`/articles/${slug}`);
    assert(html.status() === 404, `HTML: ${html.status()} (მოსალოდნელი 404)`);
    const api = await context.request.get(`/api/v1/articles/${slug}`);
    assert(api.status() === 404, `API: ${api.status()}`);
    await collectCsp();
    return 'HTML 404 + API 404';
  });
} catch {
  failed = true;
} finally {
  // დასუფთავება — შეცდომის შემთხვევაშიც
  try {
    if (itemId) {
      await context.request.delete(`/api/admin/items/${itemId}`, { headers: await csrfHeaders() });
    }
    if (mediaId) {
      const res = await context.request.delete(`/api/admin/media/${mediaId}`, {
        headers: await csrfHeaders(),
      });
      results.push({ step: 'ფაილის წაშლა', ok: res.ok(), detail: `HTTP ${res.status()}` });
      console.log(`${res.ok() ? '✓' : '✗'} ფაილის წაშლა — HTTP ${res.status()}`);
      if (!res.ok()) failed = true;
    }
    const logout = await context.request.post('/api/admin/auth/logout', {
      headers: await csrfHeaders(),
    });
    console.log(`${logout.ok() ? '✓' : '✗'} გასვლა — HTTP ${logout.status()}`);
  } catch (error) {
    console.log(`✗ დასუფთავება — ${/** @type {Error} */ (error).message.split('\n')[0]}`);
    failed = true;
  }
  if (csp.length) {
    console.log(`✗ CSP-ის დარღვევა: ${[...new Set(csp)].join('; ')}`);
    failed = true;
  } else if (!failed) {
    console.log('✓ CSP-ის დარღვევა — 0');
  }
  await browser.close();
}

console.log(
  `\nsmoke: ${results.filter((r) => r.ok).length} / ${results.length} ✓ — ${failed ? 'ჩავარდა' : 'მწვანეა'} (${BASE_URL})`,
);
process.exit(failed ? 1 : 0);

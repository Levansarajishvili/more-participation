import { NOW, plain } from '@/content/__tests__/scenarios/content-scenarios.js';
import { createHttpContentAdapter } from '@/content/http.js';
import { createMockData } from '@/content/mock/data.js';

import { seedDatabase } from '../../db/seed.js';
import { loadSpec } from '../../lib/openapi.js';
import { PUBLIC_CACHE_CONTROL } from '../../routes/public.js';
import { createMatcher, withSampleYouTubeIds } from '../contract/spec-match.js';
import { clock, freshDatabase } from '../db/helpers.js';
import { makeApp } from '../helpers.js';

/**
 * HTTP-ის გარემო საჯარო სცენარებისთვის (`content-scenarios.js`, B6): seed-იანი memory-server
 * (`seedDatabase` — mock-ის `createMockData()` იმავე დროით), რეალური სერვერი (`listen`, HTTP) და
 * frontend-ის `createHttpContentAdapter`. ბაზა ერთხელ ივსება (`seededDatabase`), სცენარი მას მხოლოდ
 * კითხულობს; ყოველ სცენარს ახალი აპი და საათი აქვს (`start`) — mock-ის გარემოს იგივე.
 *
 * `fetch` ყოველ მოთხოვნასა და პასუხს spec-ს ადარებს (`problems`): მოთხოვნა (გზა, query, body —
 * spec-ს გარეთ მოთხოვნა სერვერმა 400 / 422-ით უნდა უარყოს) და
 * პასუხის სქემა + ქეშის header-ები (200 / 304 — `ETag`, `Cache-Control`; შეცდომა — `no-store`,
 * ETag-ის გარეშე). seed-ის `[YouTube-ის id]` spec-ის pattern-ს არ აკმაყოფილებს (B1 #3 — წარმოებაში
 * ბლოკერი არ უშვებს) — სქემის შემოწმებამდე სატესტო id-ით იცვლება (`withSampleYouTubeIds`).
 */

export const PUBLIC = '/api/v1';
const spec = loadSpec();
const matcher = createMatcher(spec);
const ETAG = /^"[A-Za-z0-9_-]{27}"$/;

/**
 * @param {string} label
 * @param {{ start?: number }} [options]
 */
export async function seededDatabase(label, { start = NOW } = {}) {
  const database = await freshDatabase(label);
  const { issues } = await seedDatabase(database, { now: start });
  return { database, issues };
}

/**
 * spec-ის შემოწმებიანი fetch.
 * @param {string[]} problems
 * @returns {typeof fetch}
 */
export function checkedFetch(problems) {
  return async (url, init = {}) => {
    const method = String(init.method ?? 'GET');
    const request = {
      method,
      url: String(url),
      headers: /** @type {Record<string, string>} */ (init.headers ?? {}),
      ...(init.body !== undefined && { body: init.body }),
    };
    const { pathname } = new URL(String(url));
    const checked = matcher.checkRequest(/** @type {any} */ (request));
    const response = await fetch(url, init);
    // spec-ის დარღვევა მოთხოვნაში: სცენარი ზოგჯერ განზრახ აგზავნის არასწორ ფილტრს (`limit: 51`) ან
    // ზღვარზე გრძელ ველს — სერვერმა უნდა უარყოს (400 / 422); პრობლემაა მხოლოდ არასწორის მიღება
    if (checked.problems.length && ![400, 422].includes(response.status)) {
      problems.push(...checked.problems.map((p) => `${method} ${pathname}: ${p}`));
    }
    const hit = matcher.match(method, pathname);
    if (!hit) {
      problems.push(`spec-ში არ არის: ${method} ${pathname}`);
      return response;
    }
    const data = await response
      .clone()
      .json()
      .catch(() => undefined);
    problems.push(
      ...matcher
        .checkResponse(hit.op, response.status, withSampleYouTubeIds(data))
        .map((p) => `${pathname}: ${p}`),
    );
    const cacheControl = response.headers.get('cache-control');
    const etag = response.headers.get('etag');
    if (method === 'GET' && response.status < 400) {
      if (cacheControl !== PUBLIC_CACHE_CONTROL)
        problems.push(`${pathname}: Cache-Control ${cacheControl}`);
      if (!etag || !ETAG.test(etag)) problems.push(`${pathname}: ETag ${etag}`);
    } else {
      if (cacheControl !== 'no-store') problems.push(`${pathname}: Cache-Control ${cacheControl}`);
      if (etag) problems.push(`${pathname}: ETag შეცდომაზე`);
    }
    if (response.headers.get('x-robots-tag') !== 'noindex, nofollow')
      problems.push(`${pathname}: X-Robots-Tag`);
    return response;
  };
}

/**
 * @param {{ db: import('mongodb').Db }} database  უკვე seed-იანი (`seededDatabase`)
 * @param {{ start?: number, env?: Record<string, string> }} [options]  `env` — კონფიგი (rate limit…)
 * @returns {Promise<import('@/content/__tests__/scenarios/content-scenarios.js').ContentEnv & {
 *   app: any, problems: string[], origin: string, close: () => Promise<void> }>}
 */
export async function publicHttpEnv(database, { start = NOW, env } = {}) {
  const clk = clock(start);
  const app = /** @type {any} */ (await makeApp({ db: database.db, now: clk.now, env }));
  await app.listen({ host: '127.0.0.1', port: 0 });
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  /** @type {string[]} */
  const problems = [];
  const adapter = createHttpContentAdapter({
    baseUrl: `${origin}${PUBLIC}`,
    fetch: checkedFetch(problems),
  });
  /** @type {unknown[]} */
  const notes = [];
  return {
    kind: 'http',
    app,
    origin,
    adapter,
    data: createMockData({ now: start }),
    now: clk.now,
    advance: (ms) => {
      clk.advance(ms);
    },
    problems,
    notes,
    note: (...values) => notes.push(...values.map(plain)),
    // B6: fake გადამცემი (`MAIL_TRANSPORT=memory`) — ამ აპის წერილები; token — ბმულის fragment-იდან
    mails: async () =>
      app.mailer.outbox
        .filter((/** @type {any} */ mail) => mail.template.startsWith('subscribe-'))
        .map((/** @type {any} */ mail) => ({
          template: mail.template,
          to: mail.to,
          token: decodeURIComponent(/#token=(\S+)/.exec(mail.text)?.[1] ?? ''),
        })),
    contacts: () => app.repos.forms.countMessages(),
    subscriber: async (email) => {
      const found = await app.repos.forms.findSubscriber(email);
      return found ? { status: found.status } : null;
    },
    async close() {
      const closing = app.close();
      app.server.closeAllConnections();
      await closing;
    },
  };
}

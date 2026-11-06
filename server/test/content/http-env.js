import { ADMIN_EMAIL, normalized, plain } from '@/admin/__tests__/scenarios/admin-scenarios.js';
import { MOCK_PASSWORD, adminState } from '@/admin/api/mock.js';
import { CONTENT_TYPES } from '@/admin/content-types.js';
import { createMockAdapter } from '@/content/mock/index.js';
import { createMockData } from '@/content/mock/data.js';
import { createMockStore } from '@/content/mock/store.js';

import { hashPassword } from '../../lib/password.js';
import { loadSpec } from '../../lib/openapi.js';
import { createBrowser, installDocument } from '../browser.js';
import { createMatcher } from '../contract/spec-match.js';
import { clock, freshDatabase } from '../db/helpers.js';
import { makeApp } from '../helpers.js';

/**
 * HTTP-ის გარემო საერთო სცენარებისთვის (`admin-scenarios.js`): რეალური სერვერი (`listen`, HTTP) +
 * memory-server, frontend-ის `createHttpAdminAdapter` cookie jar-იანი fetch-ით. საწყისი მონაცემი
 * ზუსტად mock-ისაა: mock-ის საცავი `adminState`-ით (7 გვერდი + 2 დემო-მონახაზი) → `importRecords`
 * იმავე id-ებით და მეტათი; მომხმარებლები — mock-ის `u-001` / `u-002` (იგივე სახელი, ელფოსტა,
 * პაროლი), რომ `updatedBy` დაემთხვეს. საათი ერთია (`start`) — mock-ის გარემოსაც იგივე.
 *
 * საჯარო ხედი B6-მდე: ბაზის `snapshot()` → mock-ის საჯარო adapter-ი (იგივე `query.js`, `localize`).
 */

export const ADMIN = '/api/admin';
const spec = loadSpec();
const matcher = createMatcher(spec);

/** @type {Promise<string> | null} */
let hashed = null;
const passwordHash = () => (hashed ??= hashPassword(MOCK_PASSWORD));

/**
 * @param {string} label
 * @param {{ start?: number, env?: Record<string, string> }} [options]
 * @returns {Promise<import('@/admin/__tests__/scenarios/admin-scenarios.js').AdminEnv & {
 *   app: any, repos: import('../../db/index.js').Repositories, problems: string[],
 *   clk: ReturnType<typeof clock>, adapter: import('@/admin/api/adminAdapter.js').AdminAdapter,
 *   close: () => Promise<void> }>}
 */
export async function httpEnv(label, { start = Date.now(), env } = {}) {
  const clk = clock(start);
  const data = createMockData({ now: start });
  const store = createMockStore({ now: clk.now, data: structuredClone(data) });
  const state = adminState(store);

  const database = await freshDatabase(label);
  const app = /** @type {any} */ (await makeApp({ db: database.db, now: clk.now, env }));

  /** @type {import('../../db/index.js').Repositories} */
  const repos = app.repos;
  await repos.content.importRecords(
    CONTENT_TYPES.flatMap((type) =>
      store.records(type).map((record) => ({
        id: record.id,
        type,
        item:
          type === 'pages' && /** @type {any} */ (record.item).slug === 'about'
            ? { ...record.item, stages: data.stages }
            : record.item,
        meta: record.meta,
      })),
    ),
  );
  await repos.settings.put(/** @type {any} */ (store.snapshot().settings));
  for (const user of state.users) {
    await repos.users.insert({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: await passwordHash(),
    });
  }

  await app.listen({ host: '127.0.0.1', port: 0 });
  const base = `http://127.0.0.1:${app.server.address().port}${ADMIN}`;
  const browser = createBrowser({ base, matcher });
  const restore = installDocument(() => browser);
  const admin = normalized(browser.adapter);

  const view = async () => createMockAdapter({ data: plain(await repos.snapshot()), now: clk.now });

  /** @type {unknown[]} */
  const notes = [];
  return {
    kind: 'http',
    app,
    repos,
    clk,
    admin,
    // B5: მედიის API და საცავი (`MEDIA_STORAGE=memory`, ტესტის ნაგულისხმევი)
    media: true,
    notes,
    problems: browser.problems,
    note: (...values) => notes.push(...values.map(plain)),
    now: clk.now,
    advance: (ms) => {
      clk.advance(ms);
    },
    adapter: browser.adapter,
    pub: {
      getArticle: async (slug) => (await view()).getArticle(slug),
      listArticles: async (params) => (await view()).listArticles(/** @type {any} */ (params)),
      getTeam: async () => (await view()).getTeam(),
      getSettings: async () => (await view()).getSettings(),
    },
    login: (email = ADMIN_EMAIL) => admin.auth.login({ email, password: MOCK_PASSWORD }),
    item: async (id) => (await repos.content.find(id))?.item ?? null,
    bySlug: async (type, slug) => {
      const record = await repos.content.findBySlug(type, slug);
      return record ? { id: record.id, item: record.item } : null;
    },
    ids: async (type) => (await repos.content.list(type)).map((record) => record.id),
    async close() {
      restore();
      // keep-alive სოკეტი (Fastify-ის `keepAliveTimeout` — 72 წმ) close-ს არ აყოვნებს: ტესტის ბოლოს
      // ყველა კავშირი იხურება (UI-ის ტესტში unmount-ის ბოლო მოთხოვნა შეიძლება ჯერ გზაში იყოს)
      const closing = app.close();
      app.server.closeAllConnections();
      await closing;
      await database.drop();
    },
  };
}

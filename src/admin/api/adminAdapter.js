import { normalizeError } from '@/content/errors.js';

/**
 * ადმინის ერთადერთი შესასვლელი backend-თან (F8). Backend / CMS ჯერ არჩეული არ არის — UI მხოლოდ
 * ამ ფუნქციებს იძახებს, უკან კი ახლა mock დგას (`mock.js`, საჯარო საიტის საერთო საცავით).
 * `VITE_ADMIN_API` (URL) → HTTP adapter-ი (`http.js`): სესია httpOnly cookie-შია
 * (`credentials: 'include'`) + CSRF header; token localStorage-ში არასოდეს ინახება.
 *
 * ყოველი ფუნქცია Promise-ს აბრუნებს; შეცდომა — `ContentError` (`unauthorized` — სესია არ არის,
 * `forbidden` — როლს უფლება არ აქვს, `conflict` — ვერსია შეიცვალა, `validation` + `fields`).
 *
 * frontend-ის guard-ი (RequireAuth / RequireRole) მხოლოდ UX-ია — უფლებას სერვერი ამოწმებს.
 */

/** @typedef {import('./permissions.js').Role} Role */
/** @typedef {import('../content-types.js').ContentType} ContentType */
/** @typedef {import('@/content/model.js').Status} Status */
/** @typedef {import('@/content/validate.js').Issue} Issue */

/**
 * @typedef {object} AdminUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {Role} role
 * @property {'active' | 'invited' | 'deactivated'} status
 */

/** @typedef {{ user: AdminUser, expiresAt: string }} Session  expiresAt — ISO */
/** @typedef {{ id: string, name: string } | null} Editor */

/**
 * @typedef {object} IssueCounts
 * @property {number} errors     გამოქვეყნების ბლოკერი
 * @property {number} warnings
 * @property {string[]} codes    `checks.*`-ის კოდები (უნიკალური)
 */

/**
 * სიის სტრიქონი.
 * @typedef {object} ContentRow
 * @property {string} id
 * @property {ContentType} type
 * @property {string} title
 * @property {string | null} titleEn   F9: ინგლისური სათაური (`translations.en.title`), თუ არის
 * @property {string} slug
 * @property {Status} status
 * @property {string} publishedAt
 * @property {string | null} category   ტაქსონომიის id (გვერდზე — გზა)
 * @property {number} version
 * @property {string} updatedAt
 * @property {Editor} updatedBy
 * @property {IssueCounts} issues
 */

/**
 * @typedef {object} ContentRecord
 * @property {string} id
 * @property {ContentType} type
 * @property {Record<string, any>} item   მოდელის ობიექტი (Article, Video…)
 * @property {number} version
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Editor} updatedBy
 * @property {Issue[]} issues
 * @property {{ item: Record<string, any>, at: string, by: Editor } | null} working
 *   გამოქვეყნებულის ავტოშენახული სამუშაო ასლი (საიტზე ჯერ არ ჩანს)
 */

/**
 * @typedef {object} ListParams
 * @property {ContentType | 'all'} type
 * @property {Status | null} [status]
 * @property {string} [q]
 * @property {number} [page=1]
 * @property {number} [limit=10]
 * @property {string | null} [check]   მხოლოდ ამ შემოწმების კოდით (`altMissing`)
 */

/** @typedef {{ items: ContentRow[], total: number, page: number, pages: number, limit: number }} ListResult */

/** @typedef {{ version: number, at: string, by: Editor, title: string, current: boolean }} VersionInfo */

/**
 * @typedef {object} MediaItem
 * @property {string} id
 * @property {'image' | 'document'} kind
 * @property {string | null} src
 * @property {string} alt                 სურათი: alt; დოკუმენტი: ''
 * @property {string} title               დოკუმენტის სათაური / ფაილის სახელი
 * @property {import('@/content/model.js').Ratio | null} ratio
 * @property {number | null} size         ბაიტებში
 * @property {'ka' | 'en' | null} lang
 * @property {boolean | null} tagged      PDF/UA დადასტურებულია
 * @property {{ type: ContentType, id: string, title: string, field: string }[]} usage
 */

/**
 * @typedef {object} Stats
 * @property {number} published
 * @property {number} draft
 * @property {number} scheduled
 * @property {string | null} nextScheduledAt
 * @property {number} a11yIssues       მასალა ≥ 1 ბლოკერით
 * @property {Record<ContentType, number>} counts
 * @property {{ images: number, documents: number }} library
 */

/**
 * @typedef {object} A11yGroup
 * @property {string} code
 * @property {'error' | 'warning'} severity
 * @property {number} count
 * @property {{ type: ContentType, count: number }[]} types
 */

/**
 * @typedef {object} A11yReport
 * @property {{ errors: number, warnings: number, items: number }} totals
 * @property {A11yGroup[]} groups
 * @property {{ id: string, type: ContentType, title: string, status: Status, issues: Issue[] }[]} items
 */

/**
 * @typedef {object} SettingsBundle
 * @property {import('@/content/model.js').SiteSettings} site
 * @property {{ weeklyVideo: string | null, featuredArticle: string | null, featuredSeries: string | null, featuredNews: string | null }} featured  id-ები
 */

/**
 * @typedef {object} AdminAdapter
 * @property {'mock' | 'http'} source
 * @property {{
 *   login(p: { email: string, password: string, remember?: boolean }): Promise<Session>,
 *   register(p: { name: string, email: string, invite: string, password: string }): Promise<Session>,
 *   logout(): Promise<{ ok: true }>,
 *   me(): Promise<Session>,
 *   extendSession(): Promise<Session>,
 * }} auth
 * @property {{
 *   list(p: ListParams): Promise<ListResult>,
 *   get(id: string): Promise<ContentRecord>,
 *   create(type: ContentType, data: object): Promise<ContentRecord>,
 *   update(id: string, data: object, o: { version: number, autosave?: boolean }): Promise<ContentRecord>,
 *   checkSlug(type: ContentType, slug: string, id?: string | null): Promise<{ available: boolean }>,
 *   remove(id: string): Promise<{ ok: true }>,   სამუდამო წაშლა (ვერსიების ჩათვლით)
 *   publish(id: string, o: { version: number, data?: object }): Promise<ContentRecord>,
 *   schedule(id: string, at: string, o: { version: number, data?: object }): Promise<ContentRecord>,
 *   versions(id: string): Promise<VersionInfo[]>,
 *   restoreVersion(id: string, version: number): Promise<ContentRecord>,
 *   search(q: string): Promise<ContentRow[]>,
 * }} content
 * @property {{
 *   list(p?: { kind?: 'image' | 'document', missingAlt?: boolean }): Promise<MediaItem[]>,
 *   upload(file: File, meta?: Partial<MediaItem>): Promise<MediaItem>,
 *   updateAlt(id: string, alt: string): Promise<MediaItem>,
 *   update(id: string, patch: Partial<MediaItem>): Promise<MediaItem>,
 *   remove(id: string): Promise<{ ok: true }>,
 *   usage(id: string): Promise<MediaItem['usage']>,
 * }} media
 * @property {{
 *   list(): Promise<AdminUser[]>,
 *   invite(p: { email?: string, role: Role }): Promise<{ code: string, link: string, expiresAt: string, role: Role }>,
 *   setRole(id: string, role: Role): Promise<AdminUser>,
 *   deactivate(id: string): Promise<AdminUser>,
 * }} users
 * @property {{ get(): Promise<SettingsBundle>, update(patch: Partial<SettingsBundle>): Promise<SettingsBundle> }} settings
 * @property {{ stats(): Promise<Stats>, a11yReport(): Promise<A11yReport> }} reports
 */

const DEV_DELAY = 250;

/**
 * სესიის გარეთ დაბრუნებული 401 (`unauthorized`, ავტორიზაციის მეთოდების გარდა) → `window`-ზე ეს
 * მოვლენა; AuthProvider მას „სესია ამოიწურა“-დ კითხულობს და შესვლის გვერდზე გადაჰყავს.
 */
export const UNAUTHORIZED_EVENT = 'mc-admin:unauthorized';

/** @type {Promise<AdminAdapter> | null} */
let current = null;

/** @returns {Promise<AdminAdapter>} */
function loadDefault() {
  const api = import.meta.env.VITE_ADMIN_API;
  if (api) {
    return import('./http.js').then(({ createHttpAdminAdapter }) =>
      createHttpAdminAdapter({ baseUrl: api }),
    );
  }
  // TODO(backend): CMS-მდე mock წარმოებაშიც მუშაობს — სატესტო ანგარიშით. რეალურ გაშვებამდე
  // VITE_ADMIN_API აუცილებელია (project-context §9.4).
  return import('./mock.js').then(({ createMockAdminAdapter }) =>
    createMockAdminAdapter({
      delay: import.meta.env.MODE === 'development' ? DEV_DELAY : 0,
      // F9: ენის გადართვა სრული გადატვირთვაა — mock-ის სესია sessionStorage-ში რჩება
      persist: true,
    }),
  );
}

/**
 * adapter-ის ჩანაცვლება (ტესტები, რეალური API). `null` — ნაგულისხმევზე დაბრუნება.
 * @param {AdminAdapter | null} adapter
 */
export function setAdminAdapter(adapter) {
  current = adapter ? Promise.resolve(adapter) : null;
}

/** @returns {Promise<AdminAdapter>} */
function getAdapter() {
  current ??= loadDefault();
  return current;
}

/**
 * @param {Exclude<keyof AdminAdapter, 'source'>} group
 * @param {string} method
 * @param {unknown[]} args
 */
async function call(group, method, ...args) {
  try {
    const adapter = await getAdapter();
    const fn = /** @type {Record<string, (...a: unknown[]) => Promise<any>>} */ (adapter[group])[
      method
    ];
    return await fn(...args);
  } catch (error) {
    const normalized = normalizeError(error);
    if (normalized.code === 'unauthorized' && group !== 'auth' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw normalized;
  }
}

/** @type {AdminAdapter['auth']} */
export const auth = {
  login: (p) => call('auth', 'login', p),
  register: (p) => call('auth', 'register', p),
  logout: () => call('auth', 'logout'),
  me: () => call('auth', 'me'),
  extendSession: () => call('auth', 'extendSession'),
};

/** @type {AdminAdapter['content']} */
export const content = {
  list: (p) => call('content', 'list', p),
  get: (id) => call('content', 'get', id),
  create: (type, data) => call('content', 'create', type, data),
  update: (id, data, o) => call('content', 'update', id, data, o),
  checkSlug: (type, slug, id) => call('content', 'checkSlug', type, slug, id),
  remove: (id) => call('content', 'remove', id),
  publish: (id, o) => call('content', 'publish', id, o),
  schedule: (id, at, o) => call('content', 'schedule', id, at, o),
  versions: (id) => call('content', 'versions', id),
  restoreVersion: (id, version) => call('content', 'restoreVersion', id, version),
  search: (q) => call('content', 'search', q),
};

/** @type {AdminAdapter['media']} */
export const media = {
  list: (p) => call('media', 'list', p),
  upload: (file, meta) => call('media', 'upload', file, meta),
  updateAlt: (id, alt) => call('media', 'updateAlt', id, alt),
  update: (id, patch) => call('media', 'update', id, patch),
  remove: (id) => call('media', 'remove', id),
  usage: (id) => call('media', 'usage', id),
};

/** @type {AdminAdapter['users']} */
export const users = {
  list: () => call('users', 'list'),
  invite: (p) => call('users', 'invite', p),
  setRole: (id, role) => call('users', 'setRole', id, role),
  deactivate: (id) => call('users', 'deactivate', id),
};

/** @type {AdminAdapter['settings']} */
export const settings = {
  get: () => call('settings', 'get'),
  update: (patch) => call('settings', 'update', patch),
};

/** @returns {Promise<Stats>} */
export const stats = () => call('reports', 'stats');

/** @returns {Promise<A11yReport>} */
export const a11yReport = () => call('reports', 'a11yReport');

/** ერთიანი ობიექტი: `adminApi.content.list(…)`. */
export const adminApi = { auth, content, media, users, settings, stats, a11yReport };

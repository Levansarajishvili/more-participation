import { blockerFields, publishBlockers } from '@/content/checks.js';
import { ContentError } from '@/content/errors.js';
import { normalizeEmail } from '@/content/forms.js';
import { tbilisi } from '@/content/mock/helpers.js';
import { ID_PREFIX, getSharedMockStore } from '@/content/mock/store.js';
import { isYouTubeId } from '@/content/youtube.js';

import { validateLogin, validateRegister } from '../auth/auth-forms.js';
import { CONTENT_TYPES, TYPE_CONFIG } from '../content-types.js';
import { adminDictionary, adminDictionaryEn, ta } from '../i18n/index.js';

import { ROLES, can } from './permissions.js';
import {
  assertFuture,
  buildA11yReport,
  buildStats,
  embeddedMedia,
  featuredChanges,
  featuredIds,
  keepFeatured,
  listRows,
  mergeUpdate,
  newDraft,
  publicSlugs,
  publishItem,
  searchRows,
  toRecord as recordView,
  toRow,
  typesFor,
  versionList,
} from './records.js';

export { DEFAULT_LIMIT } from './records.js';

/**
 * mock adminAdapter (F8): იგივე კონტრაქტი, რაც backend-ს ექნება. კონტენტი — საჯარო საიტის
 * საერთო საცავი (`getSharedMockStore()`), ამიტომ აქ გამოქვეყნებული მასალა იმავე სესიაში
 * საიტზეც ჩანს. სესია მხოლოდ მეხსიერებაშია (გადატვირთვა = გამოსვლა) — token არსად ინახება.
 *
 * სატესტო ანგარიშები (მხოლოდ mock; რეალურ API-ზე არ არსებობს):
 * - ადმინისტრატორი — `admin@example.org` / `mc-dev-password`
 * - რედაქტორი — `editor@example.org` / `mc-dev-password`
 * - მოწვევის კოდი — `MC-INVITE-0001` (რედაქტორი, ვადა — 14 დღე)
 */

/** @typedef {import('./adminAdapter.js').AdminAdapter} AdminAdapter */
/** @typedef {import('./adminAdapter.js').AdminUser} AdminUser */
/** @typedef {import('./adminAdapter.js').ContentRow} ContentRow */
/** @typedef {import('./adminAdapter.js').ContentRecord} ContentRecord */
/** @typedef {import('./adminAdapter.js').MediaItem} MediaItem */
/** @typedef {import('../content-types.js').ContentType} ContentType */
/** @typedef {import('@/content/mock/store.js').MockStore} MockStore */
/** @typedef {import('@/content/mock/store.js').StoreRecord} StoreRecord */
/** @typedef {import('@/content/validate.js').Issue} Issue */

export const MOCK_PASSWORD = 'mc-dev-password';
export const MOCK_INVITE = 'MC-INVITE-0001';
/** სესიის ხანგრძლივობა (mock). რეალური მნიშვნელობა სერვერის პოლიტიკაა — [ვადა]. */
export const SESSION_TTL_MS = 30 * 60_000;
/** მხოლოდ mock: სესიის ჩანაწერი ენის გადართვისთვის (იხ. `persistSession`). */
export const MOCK_SESSION_KEY = 'mc-admin-mock-session';

/** @returns {{ userId: string, expiresAt: number } | null} */
function restoreSession() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(MOCK_SESSION_KEY) ?? 'null');
    return value && typeof value.userId === 'string' && typeof value.expiresAt === 'number'
      ? value
      : null;
  } catch {
    return null;
  }
}
const DAY = 86_400_000;
const STATE_KEY = 'admin';

/** 7 საჯარო გვერდი (§5) — `pages` ტიპის ჩანაწერები. */
export const PAGE_DEFS = Object.freeze([
  { slug: 'home', path: '/' },
  { slug: 'about', path: '/about' },
  { slug: 'articles', path: '/articles' },
  { slug: 'development', path: '/development' },
  { slug: 'videos', path: '/videos' },
  { slug: 'news', path: '/news' },
  { slug: 'contact', path: '/contact' },
]);

/**
 * @typedef {object} AdminState
 * @property {(AdminUser & { password: string })[]} users
 * @property {{ code: string, role: import('./permissions.js').Role, email: string | null, expiresAt: number, used: boolean }[]} invites
 * @property {{ userId: string, expiresAt: number } | null} session
 * @property {Map<string, { version: number, at: string, by: string | null, item: object }[]>} versions
 * @property {MediaItem[]} uploads
 * @property {number} uploadCount
 * @property {Map<string, { item: object, at: string, by: string | null }>} working  გამოქვეყნებულის სამუშაო ასლი (ავტოშენახვა)
 */

/**
 * ადმინის მდგომარეობა საცავში (`store.extra`): მომხმარებლები, მოწვევები, სესია, ვერსიები,
 * ატვირთვები; პირველ ჯერზე — 7 გვერდი და ორი მონახაზი ხარვეზებით (დაფის ჩეკლისტისთვის).
 * @param {MockStore} store
 * @returns {AdminState}
 */
export function adminState(store) {
  const existing = /** @type {AdminState | undefined} */ (store.extra.get(STATE_KEY));
  if (existing) return existing;
  const now = store.now();
  /** @type {AdminState} */
  const state = {
    users: [
      {
        id: 'u-001',
        name: '[სახელი გვარი]',
        email: 'admin@example.org',
        role: 'admin',
        status: 'active',
        password: MOCK_PASSWORD,
      },
      {
        id: 'u-002',
        name: '[სახელი გვარი 2]',
        email: 'editor@example.org',
        role: 'editor',
        status: 'active',
        password: MOCK_PASSWORD,
      },
    ],
    invites: [
      { code: MOCK_INVITE, role: 'editor', email: null, expiresAt: now + 14 * DAY, used: false },
    ],
    session: null,
    versions: new Map(),
    uploads: [],
    uploadCount: 0,
    working: new Map(),
  };
  store.extra.set(STATE_KEY, state);

  const snapshot = store.snapshot();
  for (const page of PAGE_DEFS) {
    if (store.findBySlug('pages', page.slug)) continue;
    store.insert('pages', {
      slug: page.slug,
      // ქართული — ძირითადი ვერსია; ინგლისური — თარგმანი (F9; `ta()` მიმდინარე ენას დააბრუნებდა)
      title:
        adminDictionary.pageNames[
          /** @type {keyof typeof adminDictionary.pageNames} */ (page.slug)
        ],
      translations: {
        en: {
          title:
            adminDictionaryEn.pageNames[
              /** @type {keyof typeof adminDictionaryEn.pageNames} */ (page.slug)
            ],
        },
      },
      path: page.path,
      status: 'published',
      publishedAt: tbilisi(now, -60),
      fields: { heading: '', lead: '', description: '' },
      // „ჩვენ შესახებ“: გუნდი და პარტნიორები — საიტის საცავის ასლი; შენახვისას საცავშიც იწერება
      ...(page.slug === 'about' && {
        team: structuredClone(snapshot.team),
        partners: structuredClone(snapshot.partners),
      }),
    });
  }

  // მონახაზები ხარვეზებით: alt, სათაურების რიგი, „აქ“-ბმული; ვიდეოს სუბტიტრი / აუდიოაღწერა
  if (!store.findBySlug('articles', 'akhali-statia-monakhazi')) {
    store.insert(
      'articles',
      {
        slug: 'akhali-statia-monakhazi',
        title: '[სტატიის სათაური — მონახაზი]',
        excerpt: '[მოკლე აღწერა: ერთი-ორი წინადადება, რომელიც ბარათზე და ძიებაში ჩანს]',
        category: 'career',
        cover: { src: null, alt: '', ratio: '3:2' },
        author: '[ავტორის სახელი გვარი]',
        status: 'draft',
        publishedAt: tbilisi(now, 7),
        featured: false,
        body: [
          { type: 'h3', text: '[ქვესათაური]' },
          {
            type: 'p',
            content: [
              { type: 'text', text: '[ტექსტის აბზაცი — დაწვრილებით ' },
              { type: 'link', text: 'აქ', href: '/articles' },
              { type: 'text', text: ']' },
            ],
          },
        ],
        audio: null,
        readingMinutes: 1,
      },
      { by: 'u-002' },
    );
  }
  const firstVideo = store.records('videos')[0]?.item;
  if (firstVideo && !store.findBySlug('videos', 'akhali-video-monakhazi')) {
    store.insert(
      'videos',
      {
        ...structuredClone(firstVideo),
        slug: 'akhali-video-monakhazi',
        title: '[ვიდეოს სათაური — მონახაზი]',
        status: 'draft',
        featured: false,
        youtube: { id: '' },
        captions: [],
      },
      { by: 'u-002' },
    );
  }
  return state;
}

/**
 * @param {object} [options]
 * @param {MockStore} [options.store]   ნაგულისხმევი — საჯარო საიტის საერთო საცავი
 * @param {number} [options.delay=0]
 * @param {number} [options.sessionTtl]
 * @param {boolean} [options.persist=false]  სესიის ჩანაწერი sessionStorage-ში (მხოლოდ აპლიკაციის mock-ი)
 * @returns {AdminAdapter & { store: MockStore, state: AdminState }}
 */
export function createMockAdminAdapter(options = {}) {
  const store = options.store ?? getSharedMockStore();
  const { delay = 0, sessionTtl = SESSION_TTL_MS, persist = false } = options;

  /**
   * მხოლოდ mock: სესიის ჩანაწერი (მომხმარებლის id + ვადა, არა token) sessionStorage-ში, რომ ენის
   * გადართვამ (სრული გადატვირთვა, `/admin` ↔ `/en/admin`) სატესტო რეჟიმში ანგარიშიდან არ გამოგიყვანოს.
   * რეალურ API-ზე სესია httpOnly cookie-შია — JS-ში არაფერი ინახება.
   * @param {{ userId: string, expiresAt: number } | null} session
   */
  function persistSession(session) {
    if (!persist) return;
    try {
      if (session) window.sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
      else window.sessionStorage.removeItem(MOCK_SESSION_KEY);
    } catch {
      // storage მიუწვდომელია
    }
  }
  const state = adminState(store);
  const now = () => store.now();
  if (!state.session && persist) {
    const saved = restoreSession();
    if (saved && saved.expiresAt > now() && state.users.some((u) => u.id === saved.userId)) {
      state.session = saved;
    }
  }
  const iso = (/** @type {number} */ ms) => new Date(ms).toISOString();

  /**
   * @template T
   * @param {() => T} produce
   * @returns {Promise<T>}
   */
  async function respond(produce) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    return structuredClone(produce());
  }

  /* ─── სესია და უფლებები ─────────────────────────────────────────────── */

  /** @param {AdminUser & { password?: string }} user @returns {AdminUser} */
  function publicUser({ password: _password, ...user }) {
    return user;
  }

  function currentUser() {
    const session = state.session;
    if (!session || session.expiresAt <= now()) {
      state.session = null;
      persistSession(null);
      throw new ContentError('unauthorized', { detail: 'mock: no session' });
    }
    const user = state.users.find((u) => u.id === session.userId && u.status === 'active');
    if (!user) throw new ContentError('unauthorized', { detail: 'mock: user inactive' });
    return user;
  }

  /** @param {import('./permissions.js').Permission} permission */
  function requireUser(permission) {
    const user = currentUser();
    if (!can(user, permission)) throw new ContentError('forbidden', { detail: permission });
    return user;
  }

  /** @param {string} userId */
  function startSession(userId) {
    state.session = { userId, expiresAt: now() + sessionTtl };
    persistSession(state.session);
    return sessionPayload();
  }

  function sessionPayload() {
    const user = currentUser();
    return {
      user: publicUser(user),
      expiresAt: iso(/** @type {number} */ (state.session?.expiresAt)),
    };
  }

  /** @param {string | null} id @returns {{ id: string, name: string } | null} */
  function editor(id) {
    const user = id ? state.users.find((u) => u.id === id) : null;
    return user ? { id: user.id, name: user.name } : null;
  }

  /* ─── კონტენტი ──────────────────────────────────────────────────────── */

  /** @param {string} id @returns {ContentType} */
  function typeOf(id) {
    const prefix = id.split('-')[0];
    const type = CONTENT_TYPES.find((t) => ID_PREFIX[TYPE_CONFIG[t].collection] === prefix);
    if (!type) throw new ContentError('not-found', { detail: `mock: ${id}` });
    return type;
  }

  /** @param {string} id */
  function recordOf(id) {
    const type = typeOf(id);
    const record = store.find(TYPE_CONFIG[type].collection, id);
    if (!record) throw new ContentError('not-found', { detail: id });
    return { type, record };
  }

  /** საჯარო სტატიების slug-ები — ბმულის შემოწმება მხოლოდ საიტზე ხილულ მასალას ადარებს. */
  function publicArticleSlugs() {
    return publicSlugs(/** @type {any[]} */ (store.records('articles')), now());
  }

  /**
   * ჩანაწერი რედაქტორისთვის — საერთო `records.js` (სერვერის იგივე ფორმა).
   * @param {ContentType} type @param {StoreRecord} record @returns {ContentRecord}
   */
  function toRecord(type, record) {
    return recordView(type, /** @type {any} */ (record), {
      slugs: publicArticleSlugs(),
      editor,
      working: state.working.get(record.id) ?? null,
    });
  }

  /** @param {ContentType[]} types @returns {ContentRow[]} */
  function allRows(types) {
    const slugs = publicArticleSlugs();
    return types.flatMap((type) =>
      store
        .records(TYPE_CONFIG[type].collection)
        .map((r) => toRow(type, /** @type {any} */ (r), { slugs, editor })),
    );
  }

  /**
   * ვერსიის შენახვა ჩანაცვლებამდე + ჩანაცვლება.
   * @param {ContentType} type @param {StoreRecord} record @param {object} item @param {string} by @param {number} [version]
   */
  function save(type, record, item, by, version) {
    const key = record.id;
    const history = state.versions.get(key) ?? [];
    const next = store.replace(TYPE_CONFIG[type].collection, record.id, item, { by, version });
    state.working.delete(record.id);
    // „ჩვენ შესახებ“ გვერდის გუნდი / პარტნიორები საჯარო საიტის საცავშიც იწერება
    const page = /** @type {{ slug?: string, team?: any[], partners?: any[] }} */ (item);
    if (type === 'pages' && page.slug === 'about') {
      store.setOrg({ team: page.team, partners: page.partners });
    }
    history.push({
      version: record.meta.version,
      at: record.meta.updatedAt,
      by: record.meta.updatedBy,
      item: record.item,
    });
    state.versions.set(key, history);
    return next;
  }

  /**
   * გამოქვეყნების ბლოკერი → `validation` + `fields` (ველის გზა → შეცდომა). B4: საერთო `checks.js`
   * (`publishBlockers` — ქართული + ინგლისური ვერსია; სერვერის იგივე წესი).
   * @param {ContentType} type @param {Record<string, any>} item
   */
  function assertPublishable(type, item) {
    const blocking = publishBlockers(type, item, publicArticleSlugs());
    if (!blocking.length) return;
    throw new ContentError('validation', {
      fields: blockerFields(blocking),
      detail: `${blocking.length} blocker(s)`,
    });
  }

  /* ─── მედია (კონტენტში ჩადგმული სურათები + ატვირთვები) ───────────────── */

  /** ბიბლიოთეკა: მასალაში ჩადგმული ფოტო / PDF (`records.js`) + ატვირთვები. @returns {MediaItem[]} */
  function libraryItems() {
    return [
      ...CONTENT_TYPES.flatMap((type) =>
        store
          .records(TYPE_CONFIG[type].collection)
          .flatMap((record) => embeddedMedia(type, /** @type {any} */ (record))),
      ),
      ...state.uploads,
    ];
  }

  /** @param {string} id */
  function mediaItem(id) {
    const found = libraryItems().find((m) => m.id === id);
    if (!found) throw new ContentError('not-found', { detail: id });
    return found;
  }

  /**
   * ჩადგმული ფაილის ველის შეცვლა (alt ყველგან აისახება, სადაც ფაილი გამოიყენება).
   * @param {MediaItem} found @param {(target: Record<string, any>) => void} mutate @param {string} by
   */
  function patchEmbedded(found, mutate, by) {
    const upload = state.uploads.find((u) => u.id === found.id);
    if (upload) {
      mutate(upload);
      return;
    }
    const [, recordId, field] = found.id.split(':');
    const { type, record } = recordOf(recordId);
    const item = structuredClone(/** @type {Record<string, any>} */ (record.item));
    const match = /^body\[(\d+)\]\.image$/.exec(field);
    const target = match ? item.body[Number(match[1])].image : item[field];
    mutate(target);
    save(type, record, item, by);
  }

  /* ─── adapter ───────────────────────────────────────────────────────── */

  return {
    source: 'mock',
    store,
    state,

    auth: {
      login: (payload) =>
        respond(() => {
          const fields = validateLogin(payload ?? {});
          if (Object.keys(fields).length) throw new ContentError('validation', { fields });
          const email = normalizeEmail(payload.email);
          const user = state.users.find((u) => u.email === email && u.status === 'active');
          // ერთი და იგივე შეცდომა უცნობ ელფოსტაზე და არასწორ პაროლზე — ანგარიში არ მჟღავნდება
          if (!user || user.password !== payload.password) {
            throw new ContentError('unauthorized', { detail: 'mock: credentials' });
          }
          return startSession(user.id);
        }),

      register: (payload) =>
        respond(() => {
          const fields = validateRegister(payload ?? {});
          if (Object.keys(fields).length) throw new ContentError('validation', { fields });
          const email = normalizeEmail(payload.email);
          const invite = state.invites.find(
            (i) =>
              i.code === payload.invite.trim() &&
              !i.used &&
              i.expiresAt > now() &&
              (i.email === null || i.email === email),
          );
          const taken = state.users.some((u) => u.email === email);
          if (!invite || taken) {
            throw new ContentError('validation', {
              fields: { invite: { code: 'invite', message: ta('fieldErrors.invite') } },
            });
          }
          invite.used = true;
          const user = {
            id: `u-${String(state.users.length + 1).padStart(3, '0')}`,
            name: payload.name.trim(),
            email,
            role: invite.role,
            status: /** @type {const} */ ('active'),
            password: payload.password,
          };
          state.users.push(user);
          return startSession(user.id);
        }),

      logout: () =>
        respond(() => {
          state.session = null;
          persistSession(null);
          return /** @type {const} */ ({ ok: true });
        }),

      me: () => respond(() => sessionPayload()),

      extendSession: () =>
        respond(() => {
          const user = currentUser();
          return startSession(user.id);
        }),
    },

    content: {
      list: (params) =>
        respond(() => {
          requireUser('content.read');
          const { type = 'all', ...query } = params ?? {};
          return listRows(allRows(typesFor(type)), query);
        }),

      get: (id) =>
        respond(() => {
          requireUser('content.read');
          const { type, record } = recordOf(id);
          return toRecord(type, record);
        }),

      create: (type, data) =>
        respond(() => {
          const user = requireUser('content.write');
          if (!CONTENT_TYPES.includes(type) || !TYPE_CONFIG[type].creatable) {
            throw new ContentError('bad-request', { detail: `create ${type}` });
          }
          const slug = /** @type {{ slug?: string }} */ (data).slug;
          if (slug && store.findBySlug(TYPE_CONFIG[type].collection, slug)) {
            throw new ContentError('validation', {
              fields: { slug: { code: 'slugDuplicate', message: ta('fieldErrors.slugTaken') } },
            });
          }
          // ახალი მასალა ყოველთვის მონახაზია (B4, სერვერის იგივე წესი — `records.js`)
          const record = store.insert(TYPE_CONFIG[type].collection, newDraft(data), {
            by: user.id,
          });
          return toRecord(type, record);
        }),

      update: (id, data, { version, autosave = false } = /** @type {any} */ ({})) =>
        respond(() => {
          const user = requireUser('content.write');
          const { type, record } = recordOf(id);
          if (version !== undefined && version !== record.meta.version) {
            throw new ContentError('conflict', {
              detail: `${id}: ${version} ≠ ${record.meta.version}`,
            });
          }
          const status = /** @type {{ status?: string }} */ (record.item).status;
          // B4: სტატუსი — მხოლოდ `draft` ან იგივე; `featured` — მხოლოდ პარამეტრებიდან (`records.js`)
          const merged = mergeUpdate(/** @type {Record<string, any>} */ (record.item), data);
          // გამოქვეყნებულის / დაგეგმილის ავტოშენახვა საიტს არ ცვლის — სამუშაო ასლად ინახება,
          // „გამოქვეყნება“ მას ამტკიცებს; მონახაზი პირდაპირ ინახება
          if (autosave && status !== 'draft') {
            state.working.set(record.id, { item: merged, at: iso(now()), by: user.id });
            return toRecord(type, record);
          }
          return toRecord(type, save(type, record, merged, user.id, version));
        }),

      checkSlug: (type, slug, id = null) =>
        respond(() => {
          requireUser('content.read');
          if (!CONTENT_TYPES.includes(type))
            throw new ContentError('bad-request', { detail: type });
          const found = store.findBySlug(TYPE_CONFIG[type].collection, slug);
          return { available: !found || found.id === id };
        }),

      // F10: YouTube-ის id-ის დუბლიკატი — მთავარი ან აუდიოაღწერის ვერსია, გამოქვეყნებული ან სამუშაო ასლი
      checkYouTube: (youtubeId, id = null) =>
        respond(() => {
          requireUser('content.read');
          if (!isYouTubeId(youtubeId))
            throw new ContentError('bad-request', { detail: 'youtubeId' });
          for (const record of store.records('videos')) {
            if (record.id === id) continue;
            const items = [record.item, state.working.get(record.id)?.item].filter(Boolean);
            const used = items.some(
              (item) => item.youtube?.id === youtubeId || item.youtube?.adId === youtubeId,
            );
            if (used)
              return { available: false, usedBy: { id: record.id, title: record.item.title } };
          }
          return { available: true, usedBy: null };
        }),

      // სამუდამო წაშლა: ჩანაწერი, მისი ვერსიები და სამუშაო ასლი ქრება — საჯარო საიტიდანაც.
      // ჩადგმული ფოტო / PDF მასთან ერთად იშლება; სხვა მასალის ბმული მასზე ჩეკლისტში „არარსებულ
      // მასალად“ გამოჩნდება. 7 საჯარო გვერდი არ იშლება.
      remove: (id) =>
        respond(() => {
          requireUser('content.write');
          const { type, record } = recordOf(id);
          if (!TYPE_CONFIG[type].deletable) {
            throw new ContentError('bad-request', { detail: `remove ${type}` });
          }
          store.remove(TYPE_CONFIG[type].collection, record.id);
          state.versions.delete(record.id);
          state.working.delete(record.id);
          return /** @type {const} */ ({ ok: true });
        }),

      publish: (id, { version, data } = /** @type {any} */ ({})) =>
        respond(() => {
          const user = requireUser('content.publish');
          const { type, record } = recordOf(id);
          const item = publishItem(
            /** @type {Record<string, any>} */ (record.item),
            /** @type {any} */ (state.working.get(record.id)?.item),
            data,
            { status: 'published', publishedAt: iso(now()) },
          );
          assertPublishable(type, item);
          return toRecord(type, save(type, record, item, user.id, version));
        }),

      schedule: (id, at, { version, data } = /** @type {any} */ ({})) =>
        respond(() => {
          const user = requireUser('content.publish');
          const { type, record } = recordOf(id);
          assertFuture(at, now(), ta('fieldErrors.scheduleFuture'));
          const item = publishItem(
            /** @type {Record<string, any>} */ (record.item),
            /** @type {any} */ (state.working.get(record.id)?.item),
            data,
            { status: 'scheduled', publishedAt: at },
          );
          assertPublishable(type, item);
          return toRecord(type, save(type, record, item, user.id, version));
        }),

      versions: (id) =>
        respond(() => {
          requireUser('content.read');
          const { record } = recordOf(id);
          const history = /** @type {any[]} */ ([...(state.versions.get(record.id) ?? [])]);
          return versionList(/** @type {any} */ (record), history.reverse(), editor);
        }),

      restoreVersion: (id, version) =>
        respond(() => {
          const user = requireUser('content.write');
          const { type, record } = recordOf(id);
          const old = (state.versions.get(record.id) ?? []).find((v) => v.version === version);
          if (!old) throw new ContentError('not-found', { detail: `version ${version}` });
          // B4: რჩეული პარამეტრებიდან იმართება — აღდგენა მიმდინარე `featured`-ს ინახავს (სერვერის იგივე)
          const item = keepFeatured(
            /** @type {Record<string, any>} */ (record.item),
            structuredClone(/** @type {Record<string, any>} */ (old.item)),
          );
          return toRecord(type, save(type, record, item, user.id));
        }),

      search: (q) =>
        respond(() => {
          requireUser('content.read');
          return searchRows(allRows([...CONTENT_TYPES]), q);
        }),
    },

    media: {
      list: (params = {}) =>
        respond(() => {
          requireUser('media.read');
          let items = libraryItems();
          if (params.kind) items = items.filter((m) => m.kind === params.kind);
          if (params.missingAlt) items = items.filter((m) => m.kind === 'image' && !m.alt.trim());
          return items;
        }),

      upload: (file, meta = {}) =>
        respond(() => {
          requireUser('media.write');
          state.uploadCount += 1;
          const isPdf = file?.type === 'application/pdf';
          // F10: სუბტიტრის VTT ბიბლიოთეკაში არ ჩანს (ფოტო / PDF არ არის) — მხოლოდ მისამართი ბრუნდება;
          // ფაილების რეალური საცავი და MIME-ის შემოწმება — B5
          const isTrack = file?.type === 'text/vtt' || /\.vtt$/i.test(file?.name ?? '');
          /** @type {MediaItem} */
          const item = {
            id: `up:${String(state.uploadCount).padStart(3, '0')}`,
            kind: isPdf ? 'document' : 'image',
            src:
              typeof URL !== 'undefined' && URL.createObjectURL && file instanceof Blob
                ? URL.createObjectURL(file)
                : null,
            alt: meta.alt ?? '',
            title: meta.title ?? file?.name ?? '',
            ratio: meta.ratio ?? null,
            size: file?.size ?? null,
            lang: isPdf ? (meta.lang ?? 'ka') : null,
            tagged: isPdf ? (meta.tagged ?? false) : null,
            usage: [],
          };
          if (!isTrack) state.uploads.push(item);
          return item;
        }),

      updateAlt: (id, alt) =>
        respond(() => {
          const user = requireUser('media.write');
          const found = mediaItem(id);
          patchEmbedded(found, (target) => (target.alt = alt), user.id);
          return mediaItem(id);
        }),

      update: (id, patch) =>
        respond(() => {
          const user = requireUser('media.write');
          const found = mediaItem(id);
          patchEmbedded(
            found,
            (target) => {
              if (found.kind === 'document') {
                if (patch.title !== undefined)
                  target[found.id.startsWith('up:') ? 'title' : 'label'] = patch.title;
                if (patch.lang !== undefined) target.lang = patch.lang;
                if (patch.tagged !== undefined) target.tagged = patch.tagged;
              } else if (patch.alt !== undefined) target.alt = patch.alt;
            },
            user.id,
          );
          return mediaItem(id);
        }),

      remove: (id) =>
        respond(() => {
          requireUser('media.write');
          const found = mediaItem(id);
          // გამოყენებული ფაილის წაშლა იბლოკება — ჯერ მასალიდან უნდა მოიხსნას
          if (found.usage.length) throw new ContentError('conflict', { detail: `in use: ${id}` });
          state.uploads = state.uploads.filter((u) => u.id !== id);
          return /** @type {const} */ ({ ok: true });
        }),

      usage: (id) =>
        respond(() => {
          requireUser('media.read');
          return mediaItem(id).usage;
        }),
    },

    users: {
      list: () =>
        respond(() => {
          requireUser('users.manage');
          return state.users.map(publicUser);
        }),

      invite: ({ email, role } = /** @type {any} */ ({})) =>
        respond(() => {
          requireUser('users.manage');
          if (!ROLES.includes(role))
            throw new ContentError('bad-request', { detail: `role ${role}` });
          const code = `MC-INVITE-${String(state.invites.length + 1).padStart(4, '0')}`;
          const expiresAt = now() + 14 * DAY;
          state.invites.push({
            code,
            role,
            email: normalizeEmail(email) || null,
            expiresAt,
            used: false,
          });
          return {
            code,
            role,
            link: `/admin/login?tab=register&invite=${encodeURIComponent(code)}`,
            expiresAt: iso(expiresAt),
          };
        }),

      setRole: (id, role) =>
        respond(() => {
          const me = requireUser('users.manage');
          const user = state.users.find((u) => u.id === id);
          if (!user) throw new ContentError('not-found', { detail: id });
          if (!ROLES.includes(role))
            throw new ContentError('bad-request', { detail: `role ${role}` });
          if (user.id === me.id && role !== 'admin') {
            throw new ContentError('bad-request', { detail: 'self-demote' });
          }
          user.role = role;
          return publicUser(user);
        }),

      deactivate: (id) =>
        respond(() => {
          const me = requireUser('users.manage');
          const user = state.users.find((u) => u.id === id);
          if (!user) throw new ContentError('not-found', { detail: id });
          if (user.id === me.id)
            throw new ContentError('bad-request', { detail: 'self-deactivate' });
          user.status = 'deactivated';
          return publicUser(user);
        }),
    },

    settings: {
      get: () =>
        respond(() => {
          requireUser('settings.manage');
          return settingsBundle();
        }),

      update: (patch = {}) =>
        respond(() => {
          const user = requireUser('settings.manage');
          // B4: უცნობი / სხვა ტიპის id → not-found ჩაწერამდე (სერვერის იგივე; `records.js`)
          const changes = featuredChanges(
            patch.featured,
            (type, id) => store.find(TYPE_CONFIG[type].collection, id) !== null,
          );
          if (patch.site) store.setSettings({ ...store.snapshot().settings, ...patch.site });
          for (const [type, id] of changes) setFeatured(type, id, user.id);
          return settingsBundle();
        }),
    },

    reports: {
      stats: () =>
        respond(() => {
          requireUser('content.read');
          const library = libraryItems();
          return buildStats(rowsByType(), {
            now: now(),
            library: {
              images: library.filter((m) => m.kind === 'image').length,
              documents: library.filter((m) => m.kind === 'document').length,
            },
          });
        }),

      a11yReport: () =>
        respond(() => {
          requireUser('a11y.read');
          return buildA11yReport(recordsByType(), publicArticleSlugs());
        }),
    },
  };

  /* ─── რჩეული მასალა (საჯარო გვერდების „რჩეული“ ბლოკები) ─────────────────── */

  /** ერთი რჩეული თითო ტიპზე: ახლის მონიშვნა წინას ხსნის (F6-ის ღია საკითხი 1). */
  /** @param {ContentType} type @param {string | null} id @param {string} by */
  function setFeatured(type, id, by) {
    for (const record of store.records(TYPE_CONFIG[type].collection)) {
      const item = /** @type {Record<string, any>} */ (record.item);
      const want = record.id === id;
      if (Boolean(item.featured) !== want) save(type, record, { ...item, featured: want }, by);
    }
  }

  function settingsBundle() {
    return { site: store.snapshot().settings, featured: featuredIds(recordsByType()) };
  }

  /** @returns {Record<ContentType, StoreRecord[]>} */
  function recordsByType() {
    return /** @type {any} */ (
      Object.fromEntries(
        CONTENT_TYPES.map((type) => [type, store.records(TYPE_CONFIG[type].collection)]),
      )
    );
  }

  /** @returns {Record<ContentType, ContentRow[]>} */
  function rowsByType() {
    const slugs = publicArticleSlugs();
    return /** @type {any} */ (
      Object.fromEntries(
        CONTENT_TYPES.map((type) => [
          type,
          store
            .records(TYPE_CONFIG[type].collection)
            .map((r) => toRow(type, /** @type {any} */ (r), { slugs, editor })),
        ]),
      )
    );
  }
}

import { CONTENT_TYPES } from '@/admin/content-types.js';
import { ROLES } from '@/admin/api/permissions.js';
import { ID_PREFIX } from '@/content/mock/store.js';
import { RATIOS, STATUSES } from '@/content/model.js';

import { componentSchema, toBsonSchema } from './schema.js';

/**
 * ბაზის 9 კოლექცია (B2, project-context §12): `$jsonSchema` validator + ინდექსები. ამ აღწერას
 * მიგრაცია (`migrations/001-init.js`) იდემპოტენტურად ადებს.
 *
 * კონტენტის ველები `server/openapi.yaml`-ის `*Draft` სქემებიდან იქმნება (`schema.js`) — validator
 * ხელით არ მეორდება. ბაზის მეტა (ვერსია, დრო, ავტორი, ინდექსის ველები) აქ იწერება.
 *
 * `content`-ის დოკუმენტი: `item` — მოდელის ობიექტი უცვლელად (`model.js`), ზედა დონე — ბაზის ველები.
 * მოდელი ზედა დონეზე ვერ ჩამოვა: სიახლის `type` (announcement…) კოლექციის `type`-ს ემთხვევა,
 * სტატიის `updatedAt` (საჯარო „განახლდა“) — მეტას `updatedAt`-ს. `slug`, `status`, `publishedAt`,
 * `searchText`, `mediaKeys` `item`-იდან ითვლება ჩაწერისას (`derive.js`); `publishedAt` — Date:
 * ISO სტრიქონი სხვადასხვა ოფსეტით (`+04:00` / `Z`) ქრონოლოგიურად არ ლაგდება.
 */

/** @typedef {import('@/admin/content-types.js').ContentType} ContentType */

/**
 * @typedef {object} IndexSpec
 * @property {string} name
 * @property {Record<string, 1 | -1>} key
 * @property {boolean} [unique]
 * @property {Record<string, unknown>} [partialFilterExpression]
 * @property {number} [expireAfterSeconds]
 */

/**
 * @typedef {object} CollectionSpec
 * @property {string} name
 * @property {Record<string, any>} validator   `$jsonSchema`-ის შიგთავსი
 * @property {IndexSpec[]} indexes
 */

/**
 * @typedef {object} Retention
 * @property {number} messagesDays   კონტაქტის შეტყობინება (B0 #10 — 30 დღე, დასადასტურებელი)
 * @property {number} versionsKeep   ვერსია თითო მასალაზე (B0 #10 — 30)
 */

/** @type {Readonly<Retention>} */
export const DEFAULT_RETENTION = Object.freeze({ messagesDays: 30, versionsKeep: 30 });

export const COLLECTION = Object.freeze({
  content: 'content',
  versions: 'versions',
  users: 'users',
  sessions: 'sessions',
  invites: 'invites',
  media: 'media',
  settings: 'settings',
  messages: 'messages',
  subscribers: 'subscribers',
});

/** ტიპი → `*Draft` სქემა (`openapi.yaml`). */
export const DRAFT_SCHEMA = Object.freeze({
  articles: 'ArticleDraft',
  series: 'SeriesDraft',
  videos: 'VideoDraft',
  news: 'NewsDraft',
  events: 'EventDraft',
  pages: 'PageDraft',
});

/** პარამეტრების ერთადერთი დოკუმენტი. */
export const SETTINGS_ID = 'site';
/** ფაილის ჩანაწერის id (`media`). */
export const MEDIA_ID = '^m-[0-9A-Za-z_]{1,64}$';
/** ფაილის სახე: `track` — სუბტიტრის VTT (ბიბლიოთეკაში არ ჩანს, F10). */
export const MEDIA_KINDS = Object.freeze(['image', 'document', 'track']);
export const SUBSCRIBER_STATUSES = Object.freeze(['pending', 'confirmed']);
export const LANGS = Object.freeze(['ka', 'en']);
export const DAY_SECONDS = 86_400;

const DATE = Object.freeze({ bsonType: 'date' });
const DATE_OR_NULL = Object.freeze({ bsonType: ['date', 'null'] });
const OBJECT_ID = Object.freeze({ bsonType: 'objectId' });
const INT_MIN_1 = Object.freeze({ bsonType: 'number', multipleOf: 1, minimum: 1 });
/** sha256 hex — token / კოდი ბაზაში მხოლოდ hash-ით ინახება. */
const HEX64 = Object.freeze({ bsonType: 'string', pattern: '^[0-9a-f]{64}$' });
/** ნორმალიზებული ელფოსტა: დიდი ლათინური ასო და ჰარი არ არის. */
const EMAIL_PATTERN = '^[^\\sA-Z@]+@[^\\sA-Z@]+$';

/**
 * @param {any} spec
 * @param {string} name
 */
function pattern(spec, name) {
  return /** @type {string} */ (componentSchema(spec, name).pattern);
}

/**
 * ტიპი → მისი `item`-ის `$jsonSchema` (`*Draft`).
 * @param {any} spec
 * @returns {Record<ContentType, Record<string, any>>}
 */
export function itemSchemas(spec) {
  return /** @type {any} */ (
    Object.fromEntries(
      CONTENT_TYPES.map((type) => [
        type,
        toBsonSchema(componentSchema(spec, DRAFT_SCHEMA[type]), spec, DRAFT_SCHEMA[type]),
      ]),
    )
  );
}

/**
 * @param {any} spec
 * @param {Record<ContentType, Record<string, any>>} items
 */
function contentValidator(spec, items) {
  const userId = { bsonType: ['string', 'null'], pattern: pattern(spec, 'UserId') };
  /** @param {Record<string, any>} item */
  const working = (item) => ({
    anyOf: [
      { bsonType: 'null' },
      {
        bsonType: 'object',
        required: ['item', 'at', 'by'],
        properties: { item, at: DATE, by: userId },
        additionalProperties: false,
      },
    ],
  });
  return {
    bsonType: 'object',
    required: [
      '_id',
      'type',
      'status',
      'publishedAt',
      'item',
      'version',
      'createdAt',
      'updatedAt',
      'updatedBy',
      'working',
      'searchText',
      'mediaKeys',
    ],
    properties: {
      _id: { bsonType: 'string', pattern: pattern(spec, 'ItemId') },
      type: { enum: [...CONTENT_TYPES] },
      slug: { bsonType: 'string', minLength: 1, maxLength: 200 },
      status: { enum: [...STATUSES, null] },
      publishedAt: DATE_OR_NULL,
      item: { bsonType: 'object' },
      version: INT_MIN_1,
      createdAt: DATE,
      updatedAt: DATE,
      updatedBy: userId,
      working: { bsonType: ['object', 'null'] },
      searchText: { bsonType: 'string', maxLength: 10_000 },
      mediaKeys: {
        bsonType: 'array',
        maxItems: 1000,
        items: { bsonType: 'string', minLength: 1, maxLength: 512 },
      },
    },
    additionalProperties: false,
    // ტიპის მიხედვით: id-ის პრეფიქსი, `item` და სამუშაო ასლი — `*Draft`
    oneOf: CONTENT_TYPES.map((type) => ({
      required: ['type'],
      properties: {
        _id: { pattern: `^${ID_PREFIX[type]}-` },
        type: { enum: [type] },
        item: items[type],
        working: working(items[type]),
      },
    })),
  };
}

/**
 * @param {any} spec
 * @param {Record<ContentType, Record<string, any>>} items
 */
function versionsValidator(spec, items) {
  return {
    bsonType: 'object',
    required: ['_id', 'contentId', 'type', 'version', 'item', 'at', 'by'],
    properties: {
      _id: OBJECT_ID,
      contentId: { bsonType: 'string', pattern: pattern(spec, 'ItemId') },
      type: { enum: [...CONTENT_TYPES] },
      version: INT_MIN_1,
      item: { bsonType: 'object' },
      at: DATE,
      by: { bsonType: ['string', 'null'], pattern: pattern(spec, 'UserId') },
    },
    additionalProperties: false,
    oneOf: CONTENT_TYPES.map((type) => ({
      required: ['type'],
      properties: {
        contentId: { pattern: `^${ID_PREFIX[type]}-` },
        type: { enum: [type] },
        item: items[type],
      },
    })),
  };
}

/** @param {any} spec */
function usersValidator(spec) {
  const user = componentSchema(spec, 'AdminUser');
  return {
    bsonType: 'object',
    required: ['_id', 'name', 'email', 'passwordHash', 'role', 'status', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: 'string', pattern: pattern(spec, 'UserId') },
      name: { bsonType: 'string', minLength: 1, maxLength: 200 },
      email: { bsonType: 'string', minLength: 3, maxLength: 200, pattern: EMAIL_PATTERN },
      // argon2id (§12); სხვა ალგორითმის hash ბაზაში ვერ ჩაიწერება
      passwordHash: { bsonType: 'string', maxLength: 512, pattern: '^\\$argon2id\\$v=19\\$' },
      role: { enum: [...ROLES] },
      status: { enum: [...user.properties.status.enum] },
      createdAt: DATE,
      updatedAt: DATE,
      lastLoginAt: DATE_OR_NULL,
    },
    additionalProperties: false,
  };
}

/** @param {any} spec */
function sessionsValidator(spec) {
  return {
    bsonType: 'object',
    required: ['_id', 'userId', 'csrfHash', 'createdAt', 'lastSeenAt', 'expiresAt', 'maxExpiresAt'],
    properties: {
      _id: HEX64,
      userId: { bsonType: 'string', pattern: pattern(spec, 'UserId') },
      csrfHash: HEX64,
      createdAt: DATE,
      lastSeenAt: DATE,
      // უმოქმედობის ვადა (TTL); `maxExpiresAt` — აბსოლუტური ზღვარი (B0 #10: 30 წთ / 12 სთ)
      expiresAt: DATE,
      maxExpiresAt: DATE,
    },
    additionalProperties: false,
  };
}

/** @param {any} spec */
function invitesValidator(spec) {
  const userId = { bsonType: ['string', 'null'], pattern: pattern(spec, 'UserId') };
  return {
    bsonType: 'object',
    required: ['_id', 'role', 'email', 'createdAt', 'createdBy', 'expiresAt', 'usedAt', 'usedBy'],
    properties: {
      _id: HEX64,
      role: { enum: [...ROLES] },
      email: { bsonType: ['string', 'null'], minLength: 3, maxLength: 200, pattern: EMAIL_PATTERN },
      createdAt: DATE,
      createdBy: userId,
      expiresAt: DATE,
      usedAt: DATE_OR_NULL,
      usedBy: userId,
    },
    additionalProperties: false,
  };
}

/** @param {any} spec */
function mediaValidator(spec) {
  return {
    bsonType: 'object',
    required: ['_id', 'kind', 'key', 'mime', 'size', 'createdAt', 'createdBy'],
    properties: {
      _id: { bsonType: 'string', pattern: MEDIA_ID },
      kind: { enum: [...MEDIA_KINDS] },
      // R2-ის ობიექტის გასაღები; საჯარო მისამართი — `/media/<key>` (B0 #7)
      key: { bsonType: 'string', minLength: 1, maxLength: 512, pattern: '^[\\x21-\\x7e]+$' },
      mime: { bsonType: 'string', maxLength: 100, pattern: '^[a-z]+/[a-z0-9.+-]+$' },
      size: { bsonType: 'number', multipleOf: 1, minimum: 0 },
      title: { bsonType: 'string', maxLength: 300 },
      // ატვირთვისას მიცემული alt — შემოთავაზება; ავტორიტეტული alt მასალაშია (ფოტოს გადაწყვეტილება)
      alt: { bsonType: 'string', maxLength: 1000 },
      ratio: { enum: [...RATIOS, null] },
      width: { bsonType: ['number', 'null'], multipleOf: 1, minimum: 1 },
      height: { bsonType: ['number', 'null'], multipleOf: 1, minimum: 1 },
      lang: { enum: [...LANGS, null] },
      tagged: { bsonType: ['bool', 'null'] },
      createdAt: DATE,
      createdBy: { bsonType: ['string', 'null'], pattern: pattern(spec, 'UserId') },
    },
    additionalProperties: false,
  };
}

/** @param {any} spec */
function settingsValidator(spec) {
  return {
    bsonType: 'object',
    required: ['_id', 'item', 'version', 'updatedAt', 'updatedBy'],
    properties: {
      _id: { enum: [SETTINGS_ID] },
      item: toBsonSchema(componentSchema(spec, 'SiteSettingsDraft'), spec, 'SiteSettingsDraft'),
      version: INT_MIN_1,
      updatedAt: DATE,
      updatedBy: { bsonType: ['string', 'null'], pattern: pattern(spec, 'UserId') },
    },
    additionalProperties: false,
  };
}

/**
 * კონტაქტის შეტყობინება — `ContactPayload`-ის ველები honeypot-ის (`website`) გარეშე; დიაგნოზის ველი
 * არ არსებობს (`support` — კომუნიკაციის მხარდაჭერა, ტექსტი).
 * @param {any} spec
 */
function messagesValidator(spec) {
  const payload = toBsonSchema(componentSchema(spec, 'ContactPayload'), spec, 'ContactPayload');
  const { website: _honeypot, consent: _consent, ...fields } = payload.properties;
  return {
    bsonType: 'object',
    required: ['_id', ...payload.required, 'lang', 'createdAt', 'sentAt'],
    properties: {
      _id: OBJECT_ID,
      ...fields,
      consent: { enum: [true] },
      lang: { enum: [...LANGS] },
      createdAt: DATE,
      sentAt: DATE_OR_NULL,
    },
    additionalProperties: false,
  };
}

function subscribersValidator() {
  return {
    bsonType: 'object',
    required: ['_id', 'email', 'status', 'source', 'lang', 'createdAt'],
    properties: {
      _id: OBJECT_ID,
      email: { bsonType: 'string', minLength: 3, maxLength: 120, pattern: EMAIL_PATTERN },
      status: { enum: [...SUBSCRIBER_STATUSES] },
      tokenHash: { bsonType: ['string', 'null'], pattern: '^[0-9a-f]{64}$' },
      expiresAt: DATE_OR_NULL,
      confirmedAt: DATE_OR_NULL,
      source: { bsonType: 'string', minLength: 1, maxLength: 50, pattern: '^[a-z0-9-]+$' },
      lang: { enum: [...LANGS] },
      createdAt: DATE,
    },
    additionalProperties: false,
    // double opt-in: pending — ბმულის hash და ვადა; confirmed — დადასტურების დრო, ბმულის გარეშე
    oneOf: [
      {
        required: ['tokenHash', 'expiresAt'],
        properties: {
          status: { enum: ['pending'] },
          tokenHash: HEX64,
          expiresAt: DATE,
          confirmedAt: { bsonType: 'null' },
        },
      },
      {
        required: ['confirmedAt'],
        properties: {
          status: { enum: ['confirmed'] },
          tokenHash: { bsonType: 'null' },
          expiresAt: { bsonType: 'null' },
          confirmedAt: DATE,
        },
      },
    ],
  };
}

/**
 * ყველა კოლექციის აღწერა.
 * @param {{ spec: any, retention?: Retention }} options
 * @returns {CollectionSpec[]}
 */
export function defineCollections({ spec, retention = DEFAULT_RETENTION }) {
  const items = itemSchemas(spec);
  return [
    {
      name: COLLECTION.content,
      validator: contentValidator(spec, items),
      indexes: [
        {
          name: 'type_slug_unique',
          key: { type: 1, slug: 1 },
          unique: true,
          // ცარიელი slug-ის მონახაზი (ახალი მასალა) ზედა დონეზე slug-ს არ წერს. `$exists` (და არა
          // `$type`): `{ type, slug: 'x' }`-ის ტოლობა მას მოიცავს — planner ინდექსს იყენებს
          partialFilterExpression: { slug: { $exists: true } },
        },
        { name: 'type_status_publishedAt', key: { type: 1, status: 1, publishedAt: -1 } },
        { name: 'updatedAt_desc', key: { updatedAt: -1 } },
        { name: 'searchText', key: { searchText: 1 } },
        { name: 'type_createdAt', key: { type: 1, createdAt: 1, _id: 1 } },
        {
          // ერთი რჩეული ტიპზე — ბაზის დონეზე (ტრანზაქცია მარტო write skew-ს ვერ აკავებს)
          name: 'type_featured_unique',
          key: { type: 1 },
          unique: true,
          partialFilterExpression: { 'item.featured': true },
        },
        { name: 'mediaKeys', key: { mediaKeys: 1 } },
      ],
    },
    {
      name: COLLECTION.versions,
      validator: versionsValidator(spec, items),
      indexes: [{ name: 'contentId_version', key: { contentId: 1, version: -1 }, unique: true }],
    },
    {
      name: COLLECTION.users,
      validator: usersValidator(spec),
      indexes: [{ name: 'email_unique', key: { email: 1 }, unique: true }],
    },
    {
      name: COLLECTION.sessions,
      validator: sessionsValidator(spec),
      indexes: [
        { name: 'expiresAt_ttl', key: { expiresAt: 1 }, expireAfterSeconds: 0 },
        { name: 'userId', key: { userId: 1 } },
      ],
    },
    {
      name: COLLECTION.invites,
      validator: invitesValidator(spec),
      indexes: [{ name: 'expiresAt_ttl', key: { expiresAt: 1 }, expireAfterSeconds: 0 }],
    },
    {
      name: COLLECTION.media,
      validator: mediaValidator(spec),
      indexes: [
        { name: 'key_unique', key: { key: 1 }, unique: true },
        { name: 'kind_createdAt', key: { kind: 1, createdAt: -1 } },
      ],
    },
    { name: COLLECTION.settings, validator: settingsValidator(spec), indexes: [] },
    {
      name: COLLECTION.messages,
      validator: messagesValidator(spec),
      indexes: [
        {
          name: 'createdAt_ttl',
          key: { createdAt: 1 },
          expireAfterSeconds: retention.messagesDays * DAY_SECONDS,
        },
      ],
    },
    {
      name: COLLECTION.subscribers,
      validator: subscribersValidator(),
      indexes: [
        { name: 'email_unique', key: { email: 1 }, unique: true },
        {
          name: 'tokenHash_unique',
          key: { tokenHash: 1 },
          unique: true,
          partialFilterExpression: { tokenHash: { $type: 'string' } },
        },
        {
          name: 'expiresAt_ttl_pending',
          key: { expiresAt: 1 },
          expireAfterSeconds: 0,
          partialFilterExpression: { status: 'pending' },
        },
      ],
    },
  ];
}

/**
 * OpenAPI 3.1-ის სქემა (JSON Schema 2020-12) → MongoDB-ის `$jsonSchema` (B2).
 *
 * ბაზის validator-ი ხელით არ იწერება: მისი წყარო `server/openapi.yaml`-ის `*Draft` სქემებია
 * (`ArticleDraft`, `VideoDraft`…, B1) — ერთი სტრუქტურა API-სა და ბაზაში. გარდაქმნა MongoDB 8.0-ის
 * შეზღუდვებს ითვალისწინებს (sandbox-ში შემოწმდა):
 * - `$ref` იხსნება (MongoDB მას არ იცნობს); `allOf` + `unevaluatedProperties: false` ერთ ობიექტად
 *   ერთიანდება `additionalProperties: false`-ით;
 * - `type` → `bsonType` (ორივე ერთად აკრძალულია); `integer` არ არსებობს → `number` + `multipleOf: 1`;
 * - `const` → `enum: [x]`; `format` და ანოტაციები (`description`, `examples`…) იშლება;
 * - უცნობი / მხარდაუჭერელი keyword → შეცდომა (ჩუმად არ იკარგება).
 *
 * `translations` (F9) სპეციფიკაციაში თავისუფალი ობიექტია (B1 — `maxProperties: 64`); ბაზაში ის
 * ზუსტდება: `en` — მშობელი სქემის ნაწილობრივი ასლი, მხოლოდ ტექსტური ველებით (`partialTextSchema`).
 */

const SCHEMA_REF = '#/components/schemas/';
const TRANSLATIONS_REF = `${SCHEMA_REF}Translations`;

/** იშლება — MongoDB-ს არ სჭირდება ან არ იცნობს. */
const DROPPED = new Set([
  'description',
  'title',
  'examples',
  'example',
  'default',
  'deprecated',
  'readOnly',
  'writeOnly',
  '$comment',
  'format',
  'contentMediaType',
  'contentEncoding',
]);

/** უცვლელად გადადის (`$jsonSchema`-ში იგივე მნიშვნელობით). */
const PASSED = new Set([
  'enum',
  'required',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minLength',
  'maxLength',
  'pattern',
  'minimum',
  'maximum',
  'multipleOf',
  'minProperties',
  'maxProperties',
]);

/** JSON Schema-ს ტიპი → BSON-ის ტიპი. */
const BSON_TYPE = Object.freeze({
  string: 'string',
  object: 'object',
  array: 'array',
  boolean: 'bool',
  null: 'null',
  number: 'number',
  integer: 'number',
});

/**
 * თარგმანში მთლიანად იცვლება (სტრუქტურაც ინგლისურია) — `localize.js`-ის `REPLACE_ARRAYS`
 * (`overlay`): ტექსტის ბლოკებს თარგმანში თავისი აბზაცები აქვს. ტესტი (`schema.test.js`) ქცევით
 * ამოწმებს, რომ `localize` ამ ველს მართლაც მთლიანად ცვლის.
 */
export const TRANSLATION_REPLACE = Object.freeze(['body']);

/**
 * სტრიქონი, მაგრამ არა ტექსტი: სტრუქტურა, მისამართი, ფაილი, თარიღი, id — „ფოტო, ფაილი, slug, თარიღი
 * და სტრუქტურა ქართული ვერსიისაა“ (`localize.js`). რედაქტორის `isTranslatable` იგივე ველებს
 * გამორიცხავს (slug, datetime, youtube, url / email / tel); ტესტი რედაქტორის სქემებით ამოწმებს.
 */
export const TRANSLATION_NON_TEXT = Object.freeze([
  'id',
  'slug',
  'path',
  'publishedAt',
  'updatedAt',
  'start',
  'end',
  'src',
  'href',
  'url',
  'registrationUrl',
  'mapUrl',
  'embedUrl',
  'bookingUrl',
  'email',
  'phone',
  'newsSlug',
  'youtube',
  'translations',
]);

const NON_TEXT = new Set(TRANSLATION_NON_TEXT);
const REPLACE = new Set(TRANSLATION_REPLACE);

/**
 * @param {any} spec
 * @param {string} ref  `#/components/schemas/X`
 * @returns {any}
 */
export function resolveRef(spec, ref) {
  if (!ref.startsWith(SCHEMA_REF)) throw new Error(`$jsonSchema: მხოლოდ შიდა $ref — ${ref}`);
  const schema = spec.components.schemas[ref.slice(SCHEMA_REF.length)];
  if (schema === undefined) throw new Error(`$jsonSchema: $ref არ არსებობს — ${ref}`);
  return schema;
}

/**
 * @param {any} spec
 * @param {string} name  `components.schemas`-ის სახელი
 * @returns {any}
 */
export function componentSchema(spec, name) {
  return resolveRef(spec, `${SCHEMA_REF}${name}`);
}

/**
 * `allOf`-ის ობიექტები ერთ ობიექტად: properties-ის გაერთიანება (ერთი სახელი ორჯერ → `allOf`),
 * required-ის გაერთიანება. `unevaluatedProperties: false` → `additionalProperties: false`.
 * @param {any} schema
 * @param {any} spec
 * @param {string} path
 * @returns {any}
 */
function mergeAllOf(schema, spec, path) {
  const { allOf, unevaluatedProperties, ...rest } = schema;
  /** @type {Record<string, any>} */
  const properties = { ...(rest.properties ?? {}) };
  const required = new Set(rest.required ?? []);
  for (const [i, raw] of allOf.entries()) {
    const part = raw?.$ref ? resolveRef(spec, raw.$ref) : raw;
    const keys = Object.keys(part).filter((k) => !DROPPED.has(k));
    const unsupported = keys.filter((k) => !['type', 'properties', 'required'].includes(k));
    if (unsupported.length || (part.type !== undefined && part.type !== 'object')) {
      throw new Error(`$jsonSchema: ${path}/allOf/${i} — მხოლოდ ობიექტების გაერთიანება`);
    }
    for (const [key, value] of Object.entries(part.properties ?? {})) {
      properties[key] = key in properties ? { allOf: [properties[key], value] } : value;
    }
    for (const key of part.required ?? []) required.add(key);
  }
  return {
    ...rest,
    type: 'object',
    properties,
    ...(required.size && { required: [...required] }),
    ...(unevaluatedProperties === false && { additionalProperties: false }),
  };
}

/**
 * OpenAPI-ის სქემა → `$jsonSchema`.
 * @param {any} schema
 * @param {any} spec
 * @param {string} [path]  შეცდომის ტექსტისთვის
 * @returns {Record<string, any>}
 */
export function toBsonSchema(schema, spec, path = '#') {
  if (schema === true) return {};
  if (schema === false) return { not: {} };
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error(`$jsonSchema: ${path} — სქემა ობიექტი უნდა იყოს`);
  }

  if (schema.$ref !== undefined) {
    const { $ref, ...siblings } = schema;
    const resolved = toBsonSchema(resolveRef(spec, $ref), spec, $ref);
    const extra = Object.keys(siblings).filter((k) => !DROPPED.has(k));
    if (!extra.length) return resolved;
    return { allOf: [resolved, toBsonSchema(siblings, spec, path)] };
  }

  if (schema.allOf !== undefined && schema.unevaluatedProperties !== undefined) {
    return toBsonSchema(mergeAllOf(schema, spec, path), spec, path);
  }
  if (schema.unevaluatedProperties !== undefined) {
    const { unevaluatedProperties, ...rest } = schema;
    return toBsonSchema({ ...rest, additionalProperties: unevaluatedProperties }, spec, path);
  }

  /** @type {Record<string, any>} */
  const out = {};
  let integer = false;
  for (const [key, value] of Object.entries(schema)) {
    if (DROPPED.has(key) || key.startsWith('x-')) continue;
    if (PASSED.has(key)) {
      out[key] = value;
      continue;
    }
    switch (key) {
      case 'type': {
        const types = [value].flat();
        for (const type of types) {
          if (!(type in BSON_TYPE)) throw new Error(`$jsonSchema: ${path} — ტიპი ${type}`);
        }
        integer = types.includes('integer');
        const bson = [...new Set(types.map((type) => BSON_TYPE[type]))];
        out.bsonType = bson.length === 1 ? bson[0] : bson;
        break;
      }
      case 'const':
        out.enum = [value];
        break;
      case 'exclusiveMinimum':
      case 'exclusiveMaximum': {
        // 2020-12: რიცხვი; MongoDB (draft 4): boolean + minimum / maximum
        const bound = key === 'exclusiveMinimum' ? 'minimum' : 'maximum';
        out[bound] = value;
        out[key] = true;
        break;
      }
      case 'properties':
        out.properties = {};
        for (const [name, child] of Object.entries(value)) {
          out.properties[name] =
            child?.$ref === TRANSLATIONS_REF
              ? { $translationsOf: true }
              : toBsonSchema(child, spec, `${path}/properties/${name}`);
        }
        break;
      case 'additionalProperties':
        out.additionalProperties =
          typeof value === 'boolean'
            ? value
            : toBsonSchema(value, spec, `${path}/additionalProperties`);
        break;
      case 'items':
        out.items = toBsonSchema(value, spec, `${path}/items`);
        break;
      case 'oneOf':
      case 'anyOf':
      case 'allOf':
        out[key] = value.map((/** @type {any} */ child, /** @type {number} */ i) =>
          toBsonSchema(child, spec, `${path}/${key}/${i}`),
        );
        break;
      case 'not':
        out.not = toBsonSchema(value, spec, `${path}/not`);
        break;
      default:
        throw new Error(`$jsonSchema: ${path} — keyword „${key}“ მხარდაუჭერელია`);
    }
  }
  if (integer && out.multipleOf === undefined) out.multipleOf = 1;

  // F9: `translations` — ამავე ობიექტის ნაწილობრივი ტექსტური ასლი
  if (out.properties) {
    for (const [name, child] of Object.entries(out.properties)) {
      if (child?.$translationsOf) out.properties[name] = translationsSchema(out);
    }
  }
  return out;
}

/**
 * `translations: { en }` — `en` მშობლის ნაწილობრივი ასლია (`partialTextSchema`).
 * @param {Record<string, any>} parent  უკვე გარდაქმნილი ობიექტის სქემა
 * @returns {Record<string, any>}
 */
export function translationsSchema(parent) {
  const en = partialTextSchema(parent) ?? {
    bsonType: ['object', 'null'],
    additionalProperties: false,
  };
  return { bsonType: 'object', properties: { en }, additionalProperties: false };
}

/**
 * ნაწილობრივი ტექსტური ასლი (`localize.js`-ის `overlay`-ის შესავალი): იგივე ფორმა, არაფერი
 * სავალდებულო; რჩება მხოლოდ ტექსტი — სტრიქონი enum-ის გარეშე, რომელიც `TRANSLATION_NON_TEXT`-ში
 * არ არის. რიცხვი, boolean, enum, თარიღი, id, მისამართი, ფაილი იშლება (სტრუქტურა ქართულისაა).
 * `body` მთლიანად იცვლება → სრული სქემა. ყოველი კვანძი `null`-ს იღებს: რედაქტორი მასივში
 * მხოლოდ თარგმნილ ელემენტს წერს (`slides[2].plain`) და JSON ნახვრეტს `null`-ად აქცევს, `overlay`
 * კი `null`-ს „თარგმანის გარეშე“-დ კითხულობს.
 * @param {Record<string, any>} schema  გარდაქმნილი (`toBsonSchema`) სქემა
 * @param {string} [key]                ველის სახელი მშობელში
 * @returns {Record<string, any> | null}  null — ველი თარგმანში არ შედის
 */
export function partialTextSchema(schema, key) {
  if (key !== undefined && NON_TEXT.has(key)) return null;
  // მასივი `body` (ტექსტის ბლოკები) მთლიანად იცვლება; სლაიდის `body` სტრიქონია — ჩვეულებრივი ტექსტი
  if (key !== undefined && REPLACE.has(key) && [schema?.bsonType].flat().includes('array')) {
    return nullable(schema);
  }
  if (!schema || schema.enum) return null;

  const branches = schema.oneOf ?? schema.anyOf;
  if (branches) {
    const parts = branches
      .map((/** @type {any} */ branch) => partialTextSchema(branch))
      .filter(Boolean);
    if (!parts.length) return null;
    // ნაწილობრივ ასლებს დისკრიმინატორი აღარ აქვს და შეიძლება ერთმანეთს ფარავდნენ → anyOf
    return parts.length === 1 ? parts[0] : { anyOf: parts };
  }
  if (schema.allOf) {
    throw new Error('$jsonSchema: allOf ნაწილობრივ ასლში მხარდაუჭერელია');
  }

  const types = [schema.bsonType].flat().filter((type) => type && type !== 'null');
  if (types.length !== 1) return null;
  switch (types[0]) {
    case 'string':
      return {
        bsonType: ['string', 'null'],
        ...(schema.maxLength !== undefined && { maxLength: schema.maxLength }),
      };
    case 'object': {
      /** @type {Record<string, any>} */
      const properties = {};
      for (const [name, child] of Object.entries(schema.properties ?? {})) {
        const part = partialTextSchema(child, name);
        if (part) properties[name] = part;
      }
      if (!Object.keys(properties).length) return null;
      return { bsonType: ['object', 'null'], properties, additionalProperties: false };
    }
    case 'array': {
      const items = schema.items ? partialTextSchema(schema.items) : null;
      if (!items) return null;
      return {
        bsonType: ['array', 'null'],
        ...(schema.maxItems !== undefined && { maxItems: schema.maxItems }),
        items,
      };
    }
    default:
      return null;
  }
}

/**
 * @param {Record<string, any>} schema
 * @returns {Record<string, any>}
 */
function nullable(schema) {
  return { anyOf: [{ bsonType: 'null' }, schema] };
}

/**
 * კანონიკური JSON (გასაღებები დალაგებით) — validator-ის შედარება მიგრაციაში.
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

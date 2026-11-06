import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

/**
 * `server/openapi.yaml` — API-ის ერთადერთი წყარო (spec-first). აქედან:
 * - route-ის გზა და მეთოდი (`route(app, spec, operationId, handler)`) — სერვერზე ხელით არ იწერება;
 * - Fastify-ის სქემა (`routeSchema`) — params / querystring / body, `components.schemas`-ზე
 *   მითითებით;
 * - contract-ტესტის ვალიდატორი (`createAjv`).
 *
 * OpenAPI 3.1-ის სქემა JSON Schema 2020-12-ია, ამიტომ ajv — `Ajv2020` (Fastify-ის ნაგულისხმევი
 * draft-07-ის ნაცვლად). `removeAdditional: false` — უცნობი ველი უარყოფილია და ჩუმად არ იშლება (B0 #5).
 */

// `String(import.meta.url)`: Vite-ის `new URL(…, import.meta.url)` asset-ის გარდაქმნა jsdom-ის ტესტში
// (B4, რედაქტორი HTTP-ზე) ფაილის გზას `http://localhost`-ად აქცევდა
export const SPEC_PATH = new URL('../openapi.yaml', String(import.meta.url));
/** `components.schemas` ajv-ში ერთ სქემად: `urn:mc:components#/$defs/<Name>`. */
export const COMPONENTS_ID = 'urn:mc:components';
export const HTTP_METHODS = Object.freeze(['get', 'put', 'post', 'patch', 'delete']);

const SCHEMA_REF = '#/components/schemas/';
const PARAMETER_REF = '#/components/parameters/';

/**
 * @param {any} value
 * @returns {any}
 */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** @type {any} */
let cached = null;

/**
 * @param {URL | string} [path]
 * @returns {any}  გაყინული ობიექტი (ნაგულისხმევი ფაილი ერთხელ იკითხება)
 */
export function loadSpec(path = SPEC_PATH) {
  const isDefault = String(path) === String(SPEC_PATH);
  if (isDefault && cached) return cached;
  const spec = deepFreeze(YAML.parse(readFileSync(path, 'utf8')));
  if (isDefault) cached = spec;
  return spec;
}

/**
 * `#/components/schemas/X` → `urn:mc:components#/$defs/X` (ასლი; სპეციფიკაცია არ იცვლება).
 * @param {any} node
 * @returns {any}
 */
export function rewriteRefs(node) {
  if (Array.isArray(node)) return node.map(rewriteRefs);
  if (!node || typeof node !== 'object') return node;
  /** @type {Record<string, any>} */
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith(SCHEMA_REF)) {
      out.$ref = `${COMPONENTS_ID}#/$defs/${value.slice(SCHEMA_REF.length)}`;
    } else out[key] = rewriteRefs(value);
  }
  return out;
}

/**
 * @param {string} name
 * @returns {{ $ref: string }}
 */
export function schemaRef(name) {
  return { $ref: `${COMPONENTS_ID}#/$defs/${name}` };
}

/**
 * @param {any} spec
 * @param {{ coerceTypes?: boolean }} [options]  query / path — `true` (სტრიქონი → რიცხვი, boolean)
 * @returns {import('ajv').default}
 */
export function createAjv(spec, { coerceTypes = false } = {}) {
  const ajv = new Ajv2020({
    allErrors: true,
    coerceTypes,
    useDefaults: true,
    removeAdditional: false,
    strict: true,
    strictRequired: false,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  ajv.addSchema({ $id: COMPONENTS_ID, $defs: rewriteRefs(spec.components.schemas) });
  return ajv;
}

/**
 * @typedef {object} Operation
 * @property {string} operationId
 * @property {string} method          დიდი ასოებით (`GET`)
 * @property {string} path            OpenAPI-ის ფორმით (`/api/v1/articles/{slug}`)
 * @property {any} operation
 * @property {any} pathItem
 */

/**
 * @param {any} spec
 * @returns {Operation[]}
 */
export function listOperations(spec) {
  /** @type {Operation[]} */
  const out = [];
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = /** @type {any} */ (pathItem)[method];
      if (operation) {
        out.push({
          operationId: operation.operationId,
          method: method.toUpperCase(),
          path,
          operation,
          pathItem,
        });
      }
    }
  }
  return out;
}

/**
 * @param {any} spec
 * @param {string} operationId
 * @returns {Operation}
 */
export function findOperation(spec, operationId) {
  const found = listOperations(spec).find((op) => op.operationId === operationId);
  if (!found) throw new Error(`OpenAPI: ოპერაცია არ არის — ${operationId}`);
  return found;
}

/**
 * @param {any} spec
 * @param {any} parameter
 * @returns {any}
 */
export function resolveParameter(spec, parameter) {
  if (parameter.$ref?.startsWith(PARAMETER_REF)) {
    return spec.components.parameters[parameter.$ref.slice(PARAMETER_REF.length)];
  }
  return parameter;
}

/**
 * ოპერაციის პარამეტრები (path-ის დონისა + ოპერაციისა; ოპერაციისა ჭარბობს `name + in`-ით).
 * @param {any} spec
 * @param {Operation} op
 * @returns {any[]}
 */
export function operationParameters(spec, op) {
  /** @type {Map<string, any>} */
  const byKey = new Map();
  for (const raw of [...(op.pathItem.parameters ?? []), ...(op.operation.parameters ?? [])]) {
    const parameter = resolveParameter(spec, raw);
    byKey.set(`${parameter.in}:${parameter.name}`, parameter);
  }
  return [...byKey.values()];
}

/**
 * @param {any[]} parameters
 * @param {'path' | 'query'} location
 */
function parameterObject(parameters, location) {
  const list = parameters.filter((p) => p.in === location);
  return {
    type: 'object',
    properties: Object.fromEntries(list.map((p) => [p.name, rewriteRefs(p.schema)])),
    required: list.filter((p) => p.required || location === 'path').map((p) => p.name),
    additionalProperties: false,
  };
}

/**
 * Fastify-ის route-ის სქემა OpenAPI-ის ოპერაციიდან. query და path ყოველთვის მოწმდება — უცნობი
 * query-პარამეტრი 400-ია. პასუხის სქემა route-ზე არ ედება (fast-json-stringify უცნობ ველს ჩუმად
 * აგდებს და შეცდომას დამალავდა) — პასუხს contract-ტესტი ამოწმებს.
 * @param {any} spec
 * @param {string} operationId
 * @returns {{ params?: object, querystring: object, body?: object }}
 */
export function routeSchema(spec, operationId) {
  const op = findOperation(spec, operationId);
  const parameters = operationParameters(spec, op);
  /** @type {{ params?: object, querystring: object, body?: object }} */
  const schema = { querystring: parameterObject(parameters, 'query') };
  if (parameters.some((p) => p.in === 'path')) schema.params = parameterObject(parameters, 'path');
  const json = op.operation.requestBody?.content?.['application/json']?.schema;
  if (json) schema.body = rewriteRefs(json);
  return schema;
}

/**
 * `/api/v1/articles/{slug}` → `/api/v1/articles/:slug`
 * @param {string} path
 * @returns {string}
 */
export function fastifyPath(path) {
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * route-ის რეგისტრაცია spec-იდან: მეთოდი, გზა და სქემა ხელით არ იწერება.
 * @param {import('fastify').FastifyInstance} app
 * @param {any} spec
 * @param {string} operationId
 * @param {import('fastify').RouteHandlerMethod} handler
 * @param {Partial<import('fastify').RouteOptions>} [options]
 */
export function route(app, spec, operationId, handler, options = {}) {
  const op = findOperation(spec, operationId);
  app.route({
    ...options,
    method: /** @type {any} */ (op.method),
    url: fastifyPath(op.path),
    schema: routeSchema(spec, operationId),
    config: { ...options.config, operationId },
    handler,
  });
}

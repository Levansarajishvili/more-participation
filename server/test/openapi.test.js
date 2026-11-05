import { Validator } from '@seriousme/openapi-schema-validator';
import { describe, expect, it } from 'vitest';

import { STATUS_BY_CODE } from '../lib/errors.js';
import {
  createAjv,
  fastifyPath,
  listOperations,
  loadSpec,
  operationParameters,
  routeSchema,
  schemaRef,
} from '../lib/openapi.js';

import { makeApp } from './helpers.js';

const spec = loadSpec();
const operations = listOperations(spec);
const STEPS = ['B1', 'B3', 'B4', 'B5', 'B6'];

/** @param {any} node @param {(ref: string) => void} visit */
function walkRefs(node, visit) {
  if (Array.isArray(node)) node.forEach((child) => walkRefs(child, visit));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') visit(value);
      else walkRefs(value, visit);
    }
  }
}

describe('server/openapi.yaml', () => {
  it('OpenAPI 3.1-ის ოფიციალური სქემით ვალიდურია', async () => {
    const validator = new Validator();
    const result = await validator.validate(structuredClone(spec));
    expect(result.errors ?? []).toEqual([]);
    expect(result.valid).toBe(true);
    expect(validator.version).toBe('3.1');
  });

  it('ყოველი $ref არსებობს; ყოველი სქემა გამოიყენება', () => {
    /** @type {Set<string>} */
    const used = new Set();
    walkRefs(spec, (ref) => {
      const [, section, name] = /^#\/components\/(\w+)\/(.+)$/.exec(ref) ?? [];
      expect(spec.components?.[section]?.[name], ref).toBeDefined();
      if (section === 'schemas') used.add(name);
    });
    expect(Object.keys(spec.components.schemas).filter((name) => !used.has(name))).toEqual([]);
  });

  it('operationId უნიკალურია; ყოველ ოპერაციას აქვს tag, summary, x-step', () => {
    const ids = operations.map((op) => op.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { operation, operationId } of operations) {
      expect(operation.tags?.length, operationId).toBe(1);
      expect(operation.summary, operationId).toMatch(/\S/);
      expect(STEPS, operationId).toContain(operation['x-step']);
    }
  });

  it('x-adapter — health-ის გარდა ყველგან; /api/v1 და /api/admin', () => {
    for (const { operation, operationId, path } of operations) {
      expect(path, operationId).toMatch(/^\/api\/(health|v1\/|admin\/)/);
      if (operationId === 'getHealth') expect(operation['x-adapter']).toBeUndefined();
      else expect([operation['x-adapter']].flat().every((n) => typeof n === 'string')).toBe(true);
    }
  });

  it('path-ის პარამეტრი შაბლონს ემთხვევა', () => {
    for (const op of operations) {
      const template = [...op.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
      const declared = operationParameters(spec, op)
        .filter((p) => p.in === 'path')
        .map((p) => p.name)
        .sort();
      expect(declared, op.operationId).toEqual(template);
    }
  });

  it('უსაფრთხოება: ადმინი — cookie-სესია, ცვლილება — + CSRF; შესვლა / საჯარო — არა', () => {
    expect(Object.keys(spec.components.securitySchemes)).toEqual(['session', 'csrf']);
    expect(spec.security).toEqual([]);
    for (const { operation, operationId, path, method } of operations) {
      const security = operation.security ?? spec.security;
      const open = !path.startsWith('/api/admin/') || /\/auth\/(login|register)$/.test(path);
      if (open) expect(security, operationId).toEqual([]);
      else if (method === 'GET') expect(security, operationId).toEqual([{ session: [] }]);
      else expect(security, operationId).toEqual([{ session: [], csrf: [] }]);
    }
  });

  it('პასუხები: 2xx + 500 ყველგან; შეცდომა — მხოლოდ ცხრილის სტატუსები და Error', () => {
    const allowed = new Set(Object.values(STATUS_BY_CODE).map(String));
    for (const { operation, operationId } of operations) {
      const statuses = Object.keys(operation.responses);
      expect(
        statuses.some((s) => /^2\d\d$/.test(s)),
        operationId,
      ).toBe(true);
      expect(statuses, operationId).toContain('500');
      for (const status of statuses.filter((s) => !/^2/.test(s))) {
        if (operationId === 'getHealth' && status === '503') continue;
        expect(allowed.has(status), `${operationId} ${status}`).toBe(true);
        expect(operation.responses[status].$ref, `${operationId} ${status}`).toMatch(
          /^#\/components\/responses\//,
        );
      }
    }
  });

  it('ყოველი სქემა და route-ის სქემა strict ajv-ში კომპილირდება; მაგალითები ვალიდურია', () => {
    const ajv = createAjv(spec);
    const coerce = createAjv(spec, { coerceTypes: true });
    for (const name of Object.keys(spec.components.schemas))
      expect(() => ajv.compile(schemaRef(name)), name).not.toThrow();
    for (const { operationId } of operations) {
      const schema = routeSchema(spec, operationId);
      coerce.compile(schema.querystring);
      if (schema.params) coerce.compile(schema.params);
      if (schema.body) ajv.compile(schema.body);
    }
    for (const [name, response] of Object.entries(spec.components.responses)) {
      const media = /** @type {any} */ (response).content['application/json'];
      const validate = ajv.compile(
        JSON.parse(
          JSON.stringify(media.schema).replaceAll(
            '"#/components/schemas/',
            '"urn:mc:components#/$defs/',
          ),
        ),
      );
      expect(validate(structuredClone(media.example)), name).toBe(true);
    }
  });

  it('x-rate-limit: auth | forms, მხოლოდ 429-იან ოპერაციაზე; ცვლილების 429 — x-rate-limit-ით', () => {
    for (const { operation, operationId, method } of operations) {
      const policy = operation['x-rate-limit'];
      const has429 = '429' in operation.responses;
      if (policy !== undefined) {
        expect(['auth', 'forms'], operationId).toContain(policy);
        expect(has429, operationId).toBe(true);
      }
      if (has429 && method !== 'GET') expect(policy, operationId).toBeDefined();
    }
    const limited = operations.filter((op) => op.operation['x-rate-limit']);
    expect(limited.map((op) => op.operationId).sort()).toEqual(
      ['login', 'register', 'sendContact', 'subscribe'].sort(),
    );
  });

  it('ცვლილების ოპერაცია /api/*-ზე 403-ს აცხადებს (CSRF ან Fetch Metadata)', () => {
    for (const { operation, operationId, method } of operations) {
      if (method !== 'GET') expect(Object.keys(operation.responses), operationId).toContain('403');
    }
  });

  it('სერვერზე რეგისტრირებულია ზუსტად `x-step: B1 | B3` ოპერაციები, spec-ის გზით', async () => {
    const app = await makeApp();
    const expected = operations
      .filter((op) => ['B1', 'B3'].includes(op.operation['x-step']))
      .map((op) => ({ method: op.method, url: fastifyPath(op.path), operationId: op.operationId }));
    expect(/** @type {any} */ (app).apiRoutes).toEqual(expected);
    await app.close();
  });
});

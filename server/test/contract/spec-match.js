import { createAjv, listOperations, operationParameters, routeSchema } from '../../lib/openapi.js';

/**
 * contract-ტესტის დამხმარე: HTTP მოთხოვნა / პასუხი ↔ OpenAPI. სერვერის ლოგიკას არ იყენებს —
 * მხოლოდ spec-ს და იმავე ajv-ს (`createAjv`), რომლითაც სერვერი ამოწმებს.
 */

const RESPONSE_REF = '#/components/responses/';

/**
 * @param {any} spec
 */
export function createMatcher(spec) {
  const bodyAjv = createAjv(spec);
  const paramsAjv = createAjv(spec, { coerceTypes: true });
  const operations = listOperations(spec).map((op) => ({
    ...op,
    names: [...op.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]),
    regex: new RegExp(`^${op.path.replace(/\{[^}]+\}/g, '([^/]+)')}$`),
  }));
  /** @type {Map<string, import('ajv').ValidateFunction>} */
  const compiled = new Map();

  /**
   * @param {string} key
   * @param {import('ajv').default} ajv
   * @param {object} schema
   */
  function validator(key, ajv, schema) {
    let fn = compiled.get(key);
    if (!fn) {
      fn = ajv.compile(schema);
      compiled.set(key, fn);
    }
    return fn;
  }

  /**
   * ოპერაცია მეთოდით და გზით (კონკრეტული გზა — შაბლონზე ადრე, როგორც OpenAPI-ში).
   * @param {string} method
   * @param {string} pathname
   */
  function match(method, pathname) {
    const found = operations
      .filter((op) => op.method === method && op.regex.test(pathname))
      .sort((a, b) => a.names.length - b.names.length)[0];
    if (!found) return null;
    const values = /** @type {RegExpExecArray} */ (found.regex.exec(pathname)).slice(1);
    const params = Object.fromEntries(
      found.names.map((n, i) => [n, decodeURIComponent(values[i])]),
    );
    return { op: found, params };
  }

  /**
   * @param {{ method: string, url: string, headers?: Record<string, string>, body?: unknown }} request
   * @returns {{ op: any, problems: string[] }}
   */
  function checkRequest({ method, url, headers = {}, body }) {
    /** @type {string[]} */
    const problems = [];
    const parsed = new URL(url, 'http://localhost');
    const hit = match(method, parsed.pathname);
    if (!hit) return { op: null, problems: [`${method} ${parsed.pathname}: spec-ში არ არის`] };
    const { op, params } = hit;
    const schema = routeSchema(spec, op.operationId);
    const errorsOf = (/** @type {import('ajv').ValidateFunction} */ fn) =>
      (fn.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');

    if (schema.params) {
      const fn = validator(`${op.operationId}:params`, paramsAjv, schema.params);
      if (!fn({ ...params })) problems.push(`path: ${errorsOf(fn)}`);
    }
    /** @type {Record<string, string>} */
    const query = {};
    for (const [key, value] of parsed.searchParams) {
      if (key in query) problems.push(`query ${key}: ორჯერ`);
      query[key] = value;
    }
    const q = validator(`${op.operationId}:query`, paramsAjv, schema.querystring);
    if (!q({ ...query })) problems.push(`query: ${errorsOf(q)}`);

    const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    const content = op.operation.requestBody?.content ?? null;
    if (!content) {
      if (body !== undefined && body !== null) problems.push('body: ოპერაციას სხეული არ აქვს');
    } else if (body === undefined || body === null) {
      if (op.operation.requestBody.required) problems.push('body: სავალდებულოა');
    } else if (content['application/json']) {
      if (!String(lower['content-type']).startsWith('application/json'))
        problems.push(`content-type: ${lower['content-type']}`);
      const data = typeof body === 'string' ? JSON.parse(body) : body;
      const fn = validator(`${op.operationId}:body`, bodyAjv, /** @type {object} */ (schema.body));
      if (!fn(structuredClone(data))) problems.push(`body: ${errorsOf(fn)}`);
    } else if (content['multipart/form-data']) {
      if (!(body instanceof FormData)) problems.push('body: FormData უნდა იყოს');
      else {
        /** @type {Record<string, string>} */
        const fields = {};
        for (const [key, value] of body.entries()) {
          fields[key] = typeof value === 'string' ? value : '<binary>';
        }
        const fn = validator(
          `${op.operationId}:multipart`,
          bodyAjv,
          rewrite(content['multipart/form-data'].schema),
        );
        if (!fn(fields)) problems.push(`multipart: ${errorsOf(fn)}`);
      }
    }

    const security = op.operation.security ?? spec.security ?? [];
    const needsCsrf = security.some((/** @type {object} */ req) => 'csrf' in req);
    const hasCsrf = Boolean(lower['x-csrf-token']);
    if (needsCsrf && !hasCsrf) problems.push('X-CSRF-Token: აკლია');
    if (method === 'GET' && hasCsrf) problems.push('X-CSRF-Token: GET-ზე არ იგზავნება');
    return { op, problems };
  }

  /**
   * @param {any} op
   * @param {number} status
   * @param {unknown} data
   * @returns {string[]}
   */
  function checkResponse(op, status, data) {
    let response = op.operation.responses?.[String(status)];
    if (!response) return [`${op.operationId}: სტატუსი ${status} spec-ში არ არის`];
    if (response.$ref)
      response = spec.components.responses[response.$ref.slice(RESPONSE_REF.length)];
    const schema = response.content?.['application/json']?.schema;
    if (!schema) return data === undefined ? [] : [`${op.operationId} ${status}: სხეული არ არის`];
    const fn = validator(`${op.operationId}:response:${status}`, bodyAjv, rewrite(schema));
    return fn(structuredClone(data))
      ? []
      : (fn.errors ?? [])
          .slice(0, 8)
          .map((e) => `${e.instancePath || '/'} ${e.message} ${JSON.stringify(e.params)}`);
  }

  /** @param {string} adapterName */
  function operationFor(adapterName) {
    return (
      operations.find((op) => [op.operation['x-adapter']].flat().includes(adapterName)) ?? null
    );
  }

  return {
    match,
    checkRequest,
    checkResponse,
    operationFor,
    operations,
    parametersOf: (/** @type {any} */ op) => operationParameters(spec, op),
  };
}

/** @param {any} schema */
function rewrite(schema) {
  return JSON.parse(
    JSON.stringify(schema).replaceAll('"#/components/schemas/', '"urn:mc:components#/$defs/'),
  );
}

/**
 * mock-ის YouTube-ის ჩანაცვლება (`[YouTube-ის id]`) — წარმოებაში დაუშვებელია (F10 #1), spec კი
 * ნამდვილ id-ს ითხოვს. პასუხის შემოწმებამდე ვალიდური სატესტო id-ით იცვლება.
 * @param {any} value
 * @returns {any}
 */
export function withSampleYouTubeIds(value) {
  const SAMPLE = 'aBcDeFgHiJ0';
  const SAMPLE_AD = 'aBcDeFgHiJ1';
  if (Array.isArray(value)) return value.map(withSampleYouTubeIds);
  if (!value || typeof value !== 'object') return value;
  /** @type {Record<string, any>} */
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    const placeholder = typeof child === 'string' && /^\[.*\]$/.test(child);
    if (placeholder && (key === 'youtubeId' || key === 'id') && /YouTube/.test(child)) {
      out[key] = /აუდიოაღწერ/.test(child) ? SAMPLE_AD : SAMPLE;
    } else if (placeholder && key === 'adId') out[key] = SAMPLE_AD;
    else out[key] = withSampleYouTubeIds(child);
  }
  return out;
}

import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '@/i18n/locale.js';

import * as content from './adapter.js';
import { ContentError } from './errors.js';
import { createHttpContentAdapter, responseError } from './http.js';

/**
 * B6: HTTP adapter-ის მოთხოვნა და შეცდომის რუკა (ყალბი fetch). რეალურ სერვერზე იგივე adapter-ს
 * საერთო სცენარები ამოწმებს — `server/test/public/parity.test.js`; spec-თან შესაბამისობას —
 * `server/test/contract/requests.test.js`.
 */

afterEach(() => {
  setLocale('ka');
  content.setContentAdapter(null);
});

/**
 * @param {{ status?: number, body?: unknown, raw?: string }} [response]
 */
function recorder(response = {}) {
  /** @type {{ url: URL, init: RequestInit }[]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetch = async (url, init = {}) => {
    calls.push({ url: new URL(String(url)), init });
    const text = response.raw ?? JSON.stringify(response.body ?? {});
    return new Response(text, {
      status: response.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { calls, fetch };
}

/**
 * @param {Promise<unknown>} promise
 * @returns {Promise<ContentError>}
 */
async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ContentError);
    return /** @type {ContentError} */ (error);
  }
  throw new Error('Promise არ უარყოფილა');
}

describe('http.js — მოთხოვნა', () => {
  it('გზა, ენა (`lang`), query: null / undefined / "" არ იგზავნება, boolean / რიცხვი — სტრიქონად', async () => {
    const { calls, fetch } = recorder({ body: { items: [], nextCursor: null, total: 0 } });
    const adapter = createHttpContentAdapter({ baseUrl: '/api/v1/', fetch });
    await adapter.listArticles({
      category: 'career',
      cursor: null,
      limit: 6,
      sort: undefined,
      featured: false,
      q: '',
    });
    const [{ url, init }] = calls;
    expect(url.pathname).toBe('/api/v1/articles');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      category: 'career',
      limit: '6',
      featured: 'false',
      lang: 'ka',
    });
    expect(init).toMatchObject({ method: 'GET', credentials: 'omit' });
    expect(init.body).toBeUndefined();
    expect(/** @type {Record<string, string>} */ (init.headers)['Content-Type']).toBeUndefined();

    setLocale('en');
    await adapter.getTeam();
    expect(calls[1].url.search).toBe('?lang=en');
  });

  it('q: კიდეების ჰარი იჭრება, 100 სიმბოლომდე; ცარიელი — არ იგზავნება; არა-სტრიქონი → bad-request', async () => {
    const { calls, fetch } = recorder({ body: { items: [], nextCursor: null, total: 0 } });
    const adapter = createHttpContentAdapter({ fetch });
    await adapter.listArticles({ q: `  ${'ა'.repeat(120)} ` });
    expect(calls[0].url.searchParams.get('q')).toBe('ა'.repeat(100));
    await adapter.listArticles({ q: '   ' });
    expect(calls[1].url.searchParams.has('q')).toBe(false);
    expect((await rejection(adapter.listArticles(/** @type {never} */ ({ q: 5 })))).code).toBe(
      'bad-request',
    );
    expect(calls).toHaveLength(2);
  });

  it('slug: encode; არასწორი ფორმა → not-found მოთხოვნის გარეშე (`query.js`-ის წესი)', async () => {
    const { calls, fetch } = recorder({ body: {} });
    const adapter = createHttpContentAdapter({ fetch });
    await adapter.getArticle('chveva-5-nabiji');
    expect(calls[0].url.pathname).toBe('/api/v1/articles/chveva-5-nabiji');
    for (const slug of ['', '../etc', 'ჩვევა', 'Bad_Slug', 'a'.repeat(81)]) {
      const error = await rejection(adapter.getNews(slug));
      expect(error.code).toBe('not-found');
      expect(error.message).toMatch(/ვერ მოიძებნა/);
    }
    expect(calls).toHaveLength(1);
  });

  it('POST: JSON სხეული, Content-Type, ენა query-ში', async () => {
    const { calls, fetch } = recorder({ body: { ok: true } });
    const adapter = createHttpContentAdapter({ fetch });
    setLocale('en');
    await adapter.subscribe('name@example.ge');
    const [{ url, init }] = calls;
    expect(url.pathname).toBe('/api/v1/subscribe');
    expect(url.search).toBe('?lang=en');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ email: 'name@example.ge' });
    expect(/** @type {Record<string, string>} */ (init.headers)['Content-Type']).toBe(
      'application/json',
    );
  });
});

describe('http.js — შეცდომა → ContentError (ტექსტი მიმდინარე ენაზე)', () => {
  it.each([
    [404, { code: 'not-found', message: 'x' }, 'not-found'],
    [400, { code: 'bad-request', message: 'x' }, 'bad-request'],
    [429, { code: 'rate-limited', message: 'x' }, 'rate-limited'],
    [500, { code: 'server', message: 'x' }, 'server'],
    [503, null, 'server'],
    [404, null, 'not-found'],
    [418, { code: 'teapot' }, 'unknown'],
  ])('HTTP %i %j → %s', async (status, body, code) => {
    const { fetch } = recorder({ status, ...(body ? { body } : { raw: '<html>' }) });
    const error = await rejection(createHttpContentAdapter({ fetch }).getSettings());
    expect(error.code).toBe(code);
    expect(error.message).not.toBe('x');
  });

  it('422 / 400 + fields → validation (ველების შეცდომა სერვერიდან)', async () => {
    const fields = { email: { code: 'email', message: 'ელფოსტა არასწორია.' } };
    const { fetch } = recorder({ status: 422, body: { code: 'validation', message: 'x', fields } });
    const error = await rejection(createHttpContentAdapter({ fetch }).subscribe('x@'));
    expect(error.code).toBe('validation');
    expect(error.fields).toEqual(fields);
    expect(responseError(400, { fields }).code).toBe('validation');
  });

  it('ქსელი (fetch TypeError) → network; ინგლისურად — ინგლისური ტექსტი', async () => {
    /** @type {typeof fetch} */
    const fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    setLocale('en');
    const error = await rejection(createHttpContentAdapter({ fetch }).listVideos());
    expect(error.code).toBe('network');
    expect(error.message).not.toMatch(/[\u10D0-\u10FF]/);
  });

  it('adapter.js-ით (`setContentAdapter`): source `http`, შეცდომა — ContentError', async () => {
    const { fetch } = recorder({ status: 404, body: { code: 'not-found', message: 'x' } });
    content.setContentAdapter(createHttpContentAdapter({ fetch }));
    expect(await content.contentSource()).toBe('http');
    expect((await rejection(content.getArticle('ar-arsebobs'))).code).toBe('not-found');
  });
});

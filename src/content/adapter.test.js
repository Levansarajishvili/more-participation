import { afterEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '@/i18n/locale.js';

import {
  CONTENT_SCENARIOS,
  FORM_SCENARIOS,
  mockContentEnv,
} from './__tests__/scenarios/content-scenarios.js';
import * as content from './adapter.js';
import { createMockAdapter } from './mock/index.js';

const NOW = Date.parse('2026-10-26T12:00:00+04:00');
const mock = () => createMockAdapter({ now: () => NOW });

/**
 * @param {Promise<unknown>} promise
 * @returns {Promise<import('./errors.js').ContentError>}
 */
async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return /** @type {import('./errors.js').ContentError} */ (error);
  }
  throw new Error('Promise არ უარყოფილა');
}

/**
 * B6: წაკითხვის ტესტები საერთო სცენარებია (`__tests__/scenarios/content-scenarios.js`) — აქ mock-ზე,
 * `server/test/public/parity.test.js`-ში — mock-სა და HTTP-ზე (რეალური სერვერი), კვალის შედარებით.
 */
describe('საჯარო სცენარები (mock)', () => {
  afterEach(() => setLocale('ka'));

  for (const scenario of [...CONTENT_SCENARIOS, ...FORM_SCENARIOS]) {
    for (const locale of scenario.locales) {
      it(`[${locale}] ${scenario.name}`, async () => {
        setLocale(locale);
        const env = mockContentEnv();
        await scenario.run(env, locale);
        expect(env.notes.length).toBeGreaterThan(0);
      });
    }
  }
});

describe('ფორმები (mock)', () => {
  it('subscribe: სწორი ელფოსტა → pending + წერილი ბმულით; არასწორი → validation + fields.email', async () => {
    const adapter = mock();
    await expect(adapter.subscribe('  Name@Example.ge ')).resolves.toEqual({
      ok: true,
      status: 'pending',
    });
    expect(adapter.subscribers.get('name@example.ge')?.status).toBe('pending');
    expect(adapter.outbox.at(-1)).toMatchObject({
      template: 'subscribe-confirm',
      to: 'name@example.ge',
      link: expect.stringMatching(/^\/subscribe\/confirm#token=[A-Za-z0-9_-]{43}$/),
    });
    const error = await rejection(adapter.subscribe('name@'));
    expect(error.code).toBe('validation');
    expect(error.fields?.email.code).toBe('email');
    expect((await rejection(adapter.subscribe(''))).fields?.email.code).toBe('required');
  });

  it('sendContact: სავალდებულო ველები, თანხმობა, ტელეფონი ან ელფოსტა', async () => {
    const adapter = mock();
    const error = await rejection(adapter.sendContact(/** @type {never} */ ({})));
    expect(error.code).toBe('validation');
    expect(Object.keys(error.fields ?? {}).sort()).toEqual(
      ['consent', 'contact', 'name', 'replyVia', 'topic'].sort(),
    );
    expect(error.fields?.consent.message).toMatch(/თანხმობა/);

    const ok = await adapter.sendContact({
      name: '[სახელი გვარი]',
      contact: '+995 500 00 00 00',
      topic: 'barrier',
      message: '',
      replyVia: 'sign-video',
      consent: true,
    });
    expect(ok).toEqual({ ok: true, id: 'mock-1' });

    const badContact = await rejection(
      adapter.sendContact({
        name: 'ა',
        contact: '12',
        topic: 'general',
        message: '',
        replyVia: 'email',
        consent: true,
      }),
    );
    expect(badContact.fields?.contact.code).toBe('contact');
  });
});

describe('F6: კონტაქტის ფორმის წესები (mock)', () => {
  const valid = {
    name: '[სახელი გვარი]',
    contact: 'name@example.ge',
    topic: /** @type {const} */ ('general'),
    message: '',
    replyVia: /** @type {const} */ ('email'),
    consent: true,
  };

  it('sendContact: honeypot შევსებული → ok, მაგრამ შეტყობინება არ ინახება', async () => {
    const adapter = mock();
    const result = await adapter.sendContact({ ...valid, website: 'https://spam.example' });
    expect(result.ok).toBe(true);
    expect(adapter.contacts()).toBe(0);
    await adapter.sendContact({ ...valid, website: '' });
    expect(adapter.contacts()).toBe(1);
  });

  it('sendContact: საპასუხო არხი ↔ საკონტაქტო ველი; support ≤ 1000', async () => {
    const adapter = mock();
    const phone = await rejection(adapter.sendContact({ ...valid, contact: '+995 555 00 00 00' }));
    expect(phone.fields?.replyVia.code).toBe('replyEmail');
    const email = await rejection(adapter.sendContact({ ...valid, replyVia: 'call' }));
    expect(email.fields?.replyVia.code).toBe('replyPhone');
    await expect(
      adapter.sendContact({ ...valid, contact: '+995 555 00 00 00', replyVia: 'sign-video' }),
    ).resolves.toMatchObject({ ok: true });
    const long = await rejection(adapter.sendContact({ ...valid, support: 'ა'.repeat(1001) }));
    expect(long.fields?.support.code).toBe('tooLong');
  });
});

describe('mock-ის ოფციები', () => {
  it('delay: პასუხი დაყოვნების შემდეგ მოდის', async () => {
    vi.useFakeTimers();
    const adapter = createMockAdapter({ now: () => NOW, delay: 300 });
    const done = vi.fn();
    adapter.getSettings().then(done);
    await vi.advanceTimersByTimeAsync(299);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('fail: ყოველი მოთხოვნა მოცემული კოდით მთავრდება', async () => {
    const adapter = createMockAdapter({ now: () => NOW, fail: 'network' });
    const error = await rejection(adapter.listVideos());
    expect(error.code).toBe('network');
    expect(error.message).toMatch(/კავშირი/);
  });
});

describe('adapter.js — საჯარო ინტერფეისი', () => {
  afterEach(() => content.setContentAdapter(null));

  it('ნაგულისხმევი adapter mock-ია და ყველა ფუნქცია Promise-ს აბრუნებს', async () => {
    expect(await content.contentSource()).toBe('mock');
    const calls = [
      content.listArticles(),
      content.listSeries(),
      content.listVideos(),
      content.listNews(),
      content.listEvents({ upcoming: true }),
      content.getTeam(),
      content.getPartners(),
      content.getStages(),
      content.getSettings(),
      content.subscribe('name@example.ge'),
    ];
    const results = await Promise.all(calls);
    expect(results.every(Boolean)).toBe(true);
    const { items } = await content.listArticles({ limit: 1 });
    expect((await content.getArticle(items[0].slug)).slug).toBe(items[0].slug);
  });

  it('B6: VITE_CONTENT_API → HTTP adapter-ი (`http.js`); მის გარეშე — mock', async () => {
    vi.stubEnv('VITE_CONTENT_API', '/api/v1');
    content.setContentAdapter(null);
    expect(await content.contentSource()).toBe('http');
    vi.unstubAllEnvs();
    content.setContentAdapter(null);
    expect(await content.contentSource()).toBe('mock');
  });

  it('ნებისმიერი შეცდომა ContentError-ად ნორმალიზდება', async () => {
    const failing = {
      ...mock(),
      getSettings: () => Promise.reject(Object.assign(new Error('boom'), { status: 503 })),
      getTeam: () => Promise.reject(new TypeError('Failed to fetch')),
      getPartners: () => Promise.reject('უცნაური'),
    };
    content.setContentAdapter(failing);
    expect((await rejection(content.getSettings())).toJSON()).toEqual({
      code: 'server',
      message: 'სერვერმა მოთხოვნა ვერ შეასრულა. სცადე ცოტა ხანში.',
    });
    expect((await rejection(content.getTeam())).code).toBe('network');
    expect((await rejection(content.getPartners())).code).toBe('unknown');
  });
});

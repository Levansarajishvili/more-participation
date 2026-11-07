import { describe, expect, it } from 'vitest';

import { MailError, RESEND_ENDPOINT, createMailer, resendPayload } from '../../mail/index.js';

/**
 * B7: Resend-ის გადამცემი (`MAIL_TRANSPORT=resend`) — `fetch`-ით, SDK-ის გარეშე. მოთხოვნის ფორმა,
 * შეცდომა სტატუსით, ლოგი მიმღების / სათაურის / ტექსტის / გასაღების გარეშე.
 */

const CONFIG = {
  transport: /** @type {const} */ ('resend'),
  dir: '/tmp/unused',
  inbox: 'inbox@example.org',
  from: 'no-reply@example.org',
  apiKey: 're_test_0123456789abcdef',
};

/** @type {import('../../mail/index.js').Mail} */
const MAIL = {
  template: 'subscribe-welcome',
  to: 'person@example.ge',
  subject: 'გამოწერა დადასტურდა',
  text: 'ტექსტი ბმულით https://example.org/subscribe/unsubscribe#token=SECRET',
  replyTo: 'reply@example.ge',
  headers: { 'List-Unsubscribe': '<https://example.org/subscribe/unsubscribe#token=SECRET>' },
  lang: 'ka',
};

/** ლოგის მოვლენები (pino-ს `info` / `warn`-ის ფორმა) */
function fakeLogger() {
  /** @type {Record<string, any>[]} */
  const lines = [];
  return {
    lines,
    text: () => JSON.stringify(lines),
    logger: {
      info: (/** @type {object} */ entry) => lines.push(entry),
      warn: (/** @type {object} */ entry) => lines.push(entry),
    },
  };
}

/** @param {number} status */
function fakeFetch(status) {
  /** @type {{ url: string, init: RequestInit }[]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(status < 300 ? { id: 'em_1' } : { message: 'x' }), {
      status,
    });
  };
  return { fetch, calls };
}

describe('Resend', () => {
  it('POST /emails: Bearer, JSON, User-Agent, გამგზავნის სახელი ენით, reply_to, headers', async () => {
    const logs = fakeLogger();
    const { fetch, calls } = fakeFetch(200);
    const mailer = createMailer(CONFIG, { logger: logs.logger, fetch });
    await mailer.send(MAIL);
    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;
    expect(url).toBe(RESEND_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      authorization: `Bearer ${CONFIG.apiKey}`,
      'content-type': 'application/json',
      'user-agent': expect.any(String),
    });
    expect(JSON.parse(String(init.body))).toEqual({
      from: 'მეტი ჩართულობა <no-reply@example.org>',
      to: ['person@example.ge'],
      subject: MAIL.subject,
      text: MAIL.text,
      reply_to: 'reply@example.ge',
      headers: { 'Content-Language': 'ka', 'List-Unsubscribe': MAIL.headers?.['List-Unsubscribe'] },
    });
    expect(
      resendPayload({ ...MAIL, from: 'a@b.org', lang: 'en', replyTo: undefined }),
    ).toMatchObject({ from: 'More Participation <a@b.org>' });
    expect(resendPayload({ ...MAIL, from: 'a@b.org', replyTo: undefined })).not.toHaveProperty(
      'reply_to',
    );
    expect(logs.lines.map((line) => line.event)).toEqual(['mail.sent']);
  });

  it('შეცდომა: HTTP სტატუსი / ქსელი → MailError; ლოგში მონაცემი და გასაღები არ არის', async () => {
    const logs = fakeLogger();
    const failing = createMailer(CONFIG, { logger: logs.logger, fetch: fakeFetch(422).fetch });
    await expect(failing.send(MAIL)).rejects.toMatchObject({ name: 'MailError', status: 422 });
    const offline = createMailer(CONFIG, {
      logger: logs.logger,
      fetch: async () => {
        throw new TypeError('fetch failed');
      },
    });
    const error = await offline.send(MAIL).catch((e) => e);
    expect(error).toBeInstanceOf(MailError);
    expect(error.status).toBeNull();
    const text = logs.text();
    expect(logs.lines.map((line) => [line.event, line.status])).toEqual([
      ['mail.failed', 422],
      ['mail.failed', null],
    ]);
    for (const secret of [MAIL.to, MAIL.subject, 'SECRET', CONFIG.apiKey, 'reply@example.ge']) {
      expect(text).not.toContain(secret);
    }
  });
});

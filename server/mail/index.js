import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * ელფოსტის adapter-ი (B6; B0 #8). ინტერფეისი ერთია — `send(mail)`; გადამცემი env-ით:
 *
 * | `MAIL_TRANSPORT` | სად | რა იწერება |
 * |---|---|---|
 * | `memory` (test) | `mailer.outbox` | მთელი წერილი — ტესტი ბმულს და header-ებს ამოწმებს |
 * | `file` (development) | `MAIL_DIR` (ნაგულისხმევი `server/.mail/`, git / zip-ის გარეთ) | წერილი ტექსტად — dev-ში ბმულის გასახსნელად |
 * | `log` (production-ის stub — დომენამდე, staging) | ლოგი | მხოლოდ `mail.stub` + შაბლონის სახელი — მიმღები, სათაური და ტექსტი **არა** |
 * | `resend` (production, B7) | Resend-ის HTTP API (`POST /emails`) | — (ლოგში `mail.sent` / `mail.failed` + HTTP სტატუსი) |
 *
 * B7 — Resend: SDK-ის გარეშე (`fetch`; დამოკიდებულება არ ემატება), `Authorization: Bearer
 * RESEND_API_KEY` (Sending access, ერთ დომენზე), გამგზავნი `„მეტი ჩართულობა“ <no-reply@[დომენი]>`,
 * მხოლოდ ტექსტი (HTML არ არის), `reply_to`, `headers` (`List-Unsubscribe`, `Content-Language`),
 * `User-Agent` (Resend მის გარეშე 403-ს აბრუნებს), ვადა 10 წმ. შეცდომა → `MailError` (სტატუსი — ტექსტი
 * და მიმღები არა); ფორმის route წერილის ჩავარდნას 500-ად აბრუნებს (B6).
 * ლოგი არასოდეს შეიცავს მიმღებს, სათაურს, ტექსტს ან ბმულს (token) — მხოლოდ მოვლენასა და შაბლონს.
 */

export const RESEND_ENDPOINT = 'https://api.resend.com/emails';
export const MAIL_TIMEOUT_MS = 10_000;
const USER_AGENT = 'meti-chartuloba-api';
/** გამგზავნის სახელი წერილის ენაზე. */
export const SENDER_NAME = Object.freeze({ ka: 'მეტი ჩართულობა', en: 'More Participation' });

export class MailError extends Error {
  /** @param {number | null} status  HTTP სტატუსი; null — ქსელი / ვადა */
  constructor(status) {
    super(status ? `mail transport: HTTP ${status}` : 'mail transport: network');
    this.name = 'MailError';
    this.status = status;
  }
}

/**
 * @typedef {object} Mail
 * @property {string} template   `contact` | `subscribe-confirm` | `subscribe-welcome` (ლოგისთვის)
 * @property {string} to
 * @property {string} subject
 * @property {string} text
 * @property {string} [replyTo]
 * @property {Record<string, string>} [headers]
 * @property {'ka' | 'en'} lang
 */

/**
 * @typedef {object} Mailer
 * @property {'log' | 'file' | 'memory' | 'resend'} transport
 * @property {(mail: Mail) => Promise<void>} send
 * @property {(Mail & { from: string })[]} outbox  memory: გაგზავნილი წერილები (სხვა გადამცემზე — ცარიელი)
 * @property {(error: Error | null) => void} failNext  ტესტი: შემდეგი `send` ამ შეცდომით ჩავარდება
 */

/**
 * RFC 5322-ის მარტივი ტექსტი (file გადამცემი). header-ის მნიშვნელობაში ახალი ხაზი არ გადის.
 * @param {Mail & { from: string }} mail
 */
function toText(mail) {
  const line = (/** @type {string} */ value) => String(value).replace(/[\r\n]+/g, ' ');
  const headers = {
    From: mail.from,
    To: mail.to,
    ...(mail.replyTo && { 'Reply-To': mail.replyTo }),
    Subject: mail.subject,
    'Content-Language': mail.lang,
    'Content-Type': 'text/plain; charset=utf-8',
    ...mail.headers,
  };
  return `${Object.entries(headers)
    .map(([name, value]) => `${name}: ${line(value)}`)
    .join('\n')}\n\n${mail.text}\n`;
}

/**
 * Resend-ის მოთხოვნის სხეული (ტესტი ამოწმებს ველებს).
 * @param {Mail & { from: string }} mail
 */
export function resendPayload(mail) {
  return {
    from: `${SENDER_NAME[mail.lang] ?? SENDER_NAME.ka} <${mail.from}>`,
    to: [mail.to],
    subject: mail.subject,
    text: mail.text,
    ...(mail.replyTo && { reply_to: mail.replyTo }),
    headers: { 'Content-Language': mail.lang, ...mail.headers },
  };
}

/**
 * @param {import('../config.js').MailConfig} config
 * @param {{ logger: { info: (obj: object, msg?: string) => void, warn?: (obj: object, msg?: string) => void }, fetch?: typeof fetch }} options
 * @returns {Mailer}
 */
export function createMailer(config, { logger, fetch: fetchImpl = globalThis.fetch }) {
  /** @type {(Mail & { from: string })[]} */
  const outbox = [];
  /** @type {Error | null} */
  let failure = null;
  /** @param {object} entry */
  const warn = (entry) => (logger.warn ? logger.warn(entry) : logger.info(entry));

  return {
    transport: config.transport,
    outbox,
    failNext(error) {
      failure = error;
    },
    async send(mail) {
      if (failure) {
        const error = failure;
        failure = null;
        throw error;
      }
      const full = { ...mail, from: config.from };
      if (config.transport === 'memory') {
        outbox.push(full);
      } else if (config.transport === 'resend') {
        /** @type {Response} */
        let response;
        try {
          response = await fetchImpl(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${config.apiKey}`,
              'content-type': 'application/json',
              'user-agent': USER_AGENT,
            },
            body: JSON.stringify(resendPayload(full)),
            signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
          });
        } catch {
          warn({ event: 'mail.failed', template: mail.template, status: null });
          throw new MailError(null);
        }
        if (!response.ok) {
          warn({ event: 'mail.failed', template: mail.template, status: response.status });
          throw new MailError(response.status);
        }
      } else if (config.transport === 'file') {
        await mkdir(config.dir, { recursive: true });
        const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${mail.template}-${randomBytes(4).toString('hex')}.txt`;
        await writeFile(join(config.dir, name), toText(full), { encoding: 'utf8', mode: 0o600 });
      }
      logger.info({
        event: config.transport === 'log' ? 'mail.stub' : 'mail.sent',
        template: mail.template,
      });
    },
  };
}

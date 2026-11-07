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
 * | `log` (production-ის stub, B7-მდე) | ლოგი | მხოლოდ `mail.stub` + შაბლონის სახელი — მიმღები, სათაური და ტექსტი **არა** |
 *
 * B7: `resend` (გამგზავნი `no-reply@[დომენი]`, DNS — SPF / DKIM / DMARC) იმავე ინტერფეისით.
 * ლოგი არასოდეს შეიცავს მიმღებს, სათაურს, ტექსტს ან ბმულს (token) — მხოლოდ მოვლენასა და შაბლონს.
 */

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
 * @property {'log' | 'file' | 'memory'} transport
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
 * @param {import('../config.js').MailConfig} config
 * @param {{ logger: { info: (obj: object, msg?: string) => void } }} options
 * @returns {Mailer}
 */
export function createMailer(config, { logger }) {
  /** @type {(Mail & { from: string })[]} */
  const outbox = [];
  /** @type {Error | null} */
  let failure = null;

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

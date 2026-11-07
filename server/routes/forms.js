import { ObjectId } from 'mongodb';

import { ContentError } from '@/content/errors.js';
import {
  SUBSCRIBE_CONFIRM_DAYS,
  isEmail,
  isHoneypotFilled,
  normalizeEmail,
  subscriptionLink,
  validateContact,
  validateSubscribe,
} from '@/content/forms.js';

import { contactMail, confirmMail, welcomeMail } from '../mail/templates.js';
import { repositories } from '../lib/auth.js';
import { inLocale, requestLocale } from '../lib/i18n.js';
import { route } from '../lib/openapi.js';
import { rateLimited } from '../lib/rate-limit.js';
import { unsubscribeToken, verifyUnsubscribeToken } from '../lib/subscriptions.js';
import { hashToken, newToken } from '../lib/tokens.js';

/**
 * საჯარო ფორმები (B6): გამოწერა (double opt-in) და კონტაქტი. ვალიდაცია — `src/content/forms.js`
 * (mock-ისა და ფორმის იგივე წესი), ველის შეცდომის ტექსტი მოთხოვნის ენაზე (`?lang=`, `inLocale`).
 * CAPTCHA და დროის ლიმიტი არ არის: rate limit — `x-rate-limit: forms` (IP, `lib/auth.js`) და
 * კონტაქტზე + საკონტაქტო მისამართი (sha256, მეხსიერებაში).
 *
 * ლოგი — მხოლოდ მოვლენა (`subscribe.requested`, `contact.received`, `contact.dropped`…): ელფოსტა,
 * სახელი, ტექსტი, token და id არასოდეს. დიაგნოზის ველი არ არსებობს — უცნობი ველი სქემით → 400.
 */

const DAY = 86_400_000;

/** შეცდომის მხოლოდ ტიპი (ლოგისთვის) — ტექსტი პერსონალურ მონაცემს შეიძლება შეიცავდეს. @param {unknown} error */
const errType = (error) => (error instanceof Error ? error.name : typeof error);

/**
 * საკონტაქტო მისამართი rate limit-ის გასაღებისთვის: ელფოსტა — `normalizeEmail`, ტელეფონი — ციფრები.
 * @param {string} contact
 */
function contactKey(contact) {
  return isEmail(contact.trim()) ? normalizeEmail(contact) : contact.replace(/\D/g, '');
}

/** @param {import('fastify').FastifyInstance} app */
export function registerFormRoutes(app) {
  const { spec, config } = app;
  const forms = () => repositories(app).forms;
  /** @type {import('../mail/index.js').Mailer} */
  const mailer = /** @type {any} */ (app).mailer;

  /** @param {any} request */
  const localeOf = (request) => requestLocale(request.query?.lang);

  /**
   * ველების შეცდომა → 422, ტექსტი მოთხოვნის ენაზე.
   * @param {'ka' | 'en'} locale
   * @param {() => Record<string, import('@/content/errors.js').FieldError>} validate
   */
  function assertValid(locale, validate) {
    inLocale(locale, () => {
      const fields = validate();
      if (Object.keys(fields).length) throw new ContentError('validation', { fields });
    });
  }

  route(app, spec, 'subscribe', async (request) => {
    const locale = localeOf(request);
    const { email } = /** @type {{ email: string }} */ (request.body);
    assertValid(locale, () => validateSubscribe(email));
    const address = normalizeEmail(email);
    const token = newToken();
    const at = app.now();
    const state = await forms().subscribe({
      email: address,
      lang: locale,
      tokenHash: hashToken(token),
      expiresAt: new Date(at + SUBSCRIBE_CONFIRM_DAYS * DAY),
      at: new Date(at),
    });
    // უკვე გამოწერილი — იგივე პასუხი, წერილის გარეშე (მისამართის არსებობა არ ჩანს)
    if (state === 'pending') {
      const link = subscriptionLink(config.publicOrigin, locale, 'confirm', token);
      try {
        await mailer.send(confirmMail({ to: address, link, lang: locale }));
      } catch (error) {
        // ტექსტი არა: პროვაიდერის შეცდომა მიმღების მისამართს შეიძლება შეიცავდეს
        request.log.error({
          event: 'mail.failed',
          template: 'subscribe-confirm',
          errType: errType(error),
        });
        throw new ContentError('server', { detail: 'mail' });
      }
    }
    request.log.info({ event: 'subscribe.requested' });
    return { ok: true, status: 'pending' };
  });

  route(app, spec, 'confirmSubscription', async (request) => {
    const locale = localeOf(request);
    const { token } = /** @type {{ token: string }} */ (request.body);
    const subscriber = await forms().confirm(hashToken(token), new Date(app.now()));
    if (!subscriber) {
      throw inLocale(locale, () => new ContentError('not-found', { detail: 'subscription' }));
    }
    const link = subscriptionLink(
      config.publicOrigin,
      locale,
      'unsubscribe',
      unsubscribeToken(config.subscriptions.secret, subscriber.id),
    );
    // დადასტურება უკვე მოხდა — მისასალმებელი წერილის ჩავარდნა პასუხს არ ცვლის
    try {
      await mailer.send(welcomeMail({ to: subscriber.email, unsubscribeLink: link, lang: locale }));
    } catch (error) {
      request.log.error({
        event: 'mail.failed',
        template: 'subscribe-welcome',
        errType: errType(error),
      });
    }
    request.log.info({ event: 'subscribe.confirmed' });
    return { ok: true, status: 'confirmed' };
  });

  route(app, spec, 'unsubscribe', async (request) => {
    const locale = localeOf(request);
    const { token } = /** @type {{ token: string }} */ (request.body);
    const id = verifyUnsubscribeToken(config.subscriptions.secret, token);
    if (!id) throw inLocale(locale, () => new ContentError('not-found', { detail: 'unsubscribe' }));
    await forms().removeSubscriber(id);
    request.log.info({ event: 'subscribe.removed' });
    return { ok: true };
  });

  route(app, spec, 'sendContact', async (request, reply) => {
    const locale = localeOf(request);
    const payload = /** @type {import('@/content/model.js').ContactPayload} */ (request.body);
    // honeypot: ჩვეულებრივი წარმატება (იგივე ფორმის id), შენახვისა და წერილის გარეშე
    if (isHoneypotFilled(payload)) {
      request.log.info({ event: 'contact.dropped' });
      return { ok: true, id: new ObjectId().toHexString() };
    }
    assertValid(locale, () => validateContact(payload));
    const wait = app.rateLimits.forms.consume(
      `sendContact:contact:${hashToken(contactKey(payload.contact))}`,
    );
    if (wait) throw inLocale(locale, () => rateLimited(reply, wait));

    const at = new Date(app.now());
    const id = await forms().insertMessage(payload, { lang: locale, at });
    try {
      await mailer.send(
        contactMail({
          to: config.mail.inbox,
          payload,
          lang: locale,
          at,
          retentionDays: config.retention.messagesDays,
        }),
      );
    } catch (error) {
      // წერილი ვერ წავიდა: ჩანაწერი იშლება, მომხმარებელი ხელახლა ცდის (ტექსტი ფორმაში რჩება)
      await forms().removeMessage(id);
      request.log.error({ event: 'mail.failed', template: 'contact', errType: errType(error) });
      throw new ContentError('server', { detail: 'mail' });
    }
    await forms().markSent(id, new Date(app.now()));
    request.log.info({ event: 'contact.received' });
    return { ok: true, id };
  });
}

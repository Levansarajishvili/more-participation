import { SUBSCRIBE_CONFIRM_DAYS } from '@/content/forms.js';
import { label } from '@/content/taxonomy.js';

import { inLocale } from '../lib/i18n.js';

/**
 * წერილების ტექსტი (B6). მხოლოდ სერვერზეა — frontend-ის ლექსიკონში (ka.js მთავარ chunk-შია) არ
 * ხვდება. ტონი — §10: პირდაპირი, მოქმედებაზე ორიენტირებული; სიბრალულისა და ქველმოქმედების ენის
 * გარეშე. უცნობი ფაქტი — `[ფრჩხილებში]`.
 *
 * კონტაქტის წერილი ორგანიზაციის inbox-ში ქართულადაა (ფორმის ენა ტექსტშია); სათაურში პერსონალური
 * მონაცემი არ არის (§10 „Backend“) — მხოლოდ თემა. გამოწერის წერილები — მოთხოვნის ენაზე.
 */

/** @typedef {import('./index.js').Mail} Mail */
/** @typedef {import('@/content/model.js').ContactPayload} ContactPayload */

const NAME = { ka: 'მეტი ჩართულობა', en: 'More Participation' };

/**
 * @param {'ka' | 'en'} lang
 * @param {Date} at
 */
function tbilisiTime(lang, at) {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ka-GE', {
    timeZone: 'Asia/Tbilisi',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(at);
}

/**
 * დადასტურების წერილი (double opt-in, ნაბიჯი 1).
 * @param {{ to: string, link: string, lang: 'ka' | 'en' }} input
 * @returns {Mail}
 */
export function confirmMail({ to, link, lang }) {
  const text =
    lang === 'en'
      ? [
          'Hello,',
          '',
          `Someone (hopefully you) asked to receive ${NAME.en} updates at this address.`,
          'To confirm, open the link and press “Confirm”:',
          '',
          link,
          '',
          `The link works for ${SUBSCRIBE_CONFIRM_DAYS} days. If you did not ask for this, simply delete this email — you will not hear from us again.`,
          '',
          `— ${NAME.en}`,
        ]
      : [
          'გამარჯობა,',
          '',
          `ამ მისამართზე „${NAME.ka}“-ს სიახლეების გამოწერა მოითხოვეს (იმედია, შენ).`,
          'დასადასტურებლად გახსენი ბმული და დააჭირე „დადასტურებას“:',
          '',
          link,
          '',
          `ბმული ${SUBSCRIBE_CONFIRM_DAYS} დღე მოქმედებს. თუ გამოწერა არ მოგითხოვია, ეს წერილი უბრალოდ წაშალე — ჩვენგან მეტს აღარაფერს მიიღებ.`,
          '',
          `— ${NAME.ka}`,
        ];
  return {
    template: 'subscribe-confirm',
    to,
    lang,
    subject:
      lang === 'en' ? `Confirm your subscription — ${NAME.en}` : `დაადასტურე გამოწერა — ${NAME.ka}`,
    text: text.join('\n'),
  };
}

/**
 * მისასალმებელი წერილი (double opt-in, ნაბიჯი 2) — გაუქმების ბმულით; `List-Unsubscribe` (RFC 2369).
 * @param {{ to: string, unsubscribeLink: string, lang: 'ka' | 'en' }} input
 * @returns {Mail}
 */
export function welcomeMail({ to, unsubscribeLink, lang }) {
  const text =
    lang === 'en'
      ? [
          'Subscription confirmed.',
          '',
          `You will receive ${NAME.en} updates [once a month]: new articles, programmes, events and deadlines.`,
          '',
          'Unsubscribe at any time with one link:',
          unsubscribeLink,
          '',
          `— ${NAME.en}`,
        ]
      : [
          'გამოწერა დადასტურდა.',
          '',
          `„${NAME.ka}“-ს სიახლეებს მიიღებ [თვეში ერთხელ]: ახალი სტატიები, პროგრამები, ღონისძიებები და ვადები.`,
          '',
          'გამოწერის გაუქმება ნებისმიერ დროს — ერთი ბმულით:',
          unsubscribeLink,
          '',
          `— ${NAME.ka}`,
        ];
  return {
    template: 'subscribe-welcome',
    to,
    lang,
    subject:
      lang === 'en' ? `Subscription confirmed — ${NAME.en}` : `გამოწერა დადასტურდა — ${NAME.ka}`,
    text: text.join('\n'),
    headers: { 'List-Unsubscribe': `<${unsubscribeLink}>` },
  };
}

/**
 * კონტაქტის ფორმის წერილი ორგანიზაციას: სრული ტექსტი + მხარდაჭერის საჭიროება; `Reply-To` — თუ
 * პასუხი ელფოსტით ითხოვა. სათაური — მხოლოდ თემა (სახელი / კონტაქტი — არა).
 * @param {{ to: string, payload: ContactPayload, lang: 'ka' | 'en', at: Date, retentionDays: number }} input
 * @returns {Mail}
 */
export function contactMail({ to, payload, lang, at, retentionDays }) {
  return inLocale('ka', () => {
    const topic = label('contactTopic', payload.topic);
    const channel = label('replyChannel', payload.replyVia);
    const support = payload.support?.trim() || 'არ მიუთითებია';
    const message = payload.message?.trim() || 'ცარიელია';
    const text = [
      'ახალი შეტყობინება საიტის კონტაქტის ფორმიდან.',
      '',
      `სახელი: ${payload.name.trim()}`,
      `ტელეფონი ან ელფოსტა: ${payload.contact.trim()}`,
      `თემა: ${topic}`,
      `როგორ ვუპასუხოთ: ${channel}`,
      `ფორმის ენა: ${lang === 'en' ? 'ინგლისური' : 'ქართული'}`,
      `მიღებულია: ${tbilisiTime('ka', at)}`,
      '',
      'შეტყობინება:',
      message,
      '',
      'მხარდაჭერის საჭიროება კომუნიკაციისთვის:',
      support,
      '',
      `ჩანაწერი საიტის ბაზაში ${retentionDays} დღე ინახება.`,
    ];
    return {
      template: 'contact',
      to,
      lang: 'ka',
      subject: `საიტიდან: ${topic}`,
      text: text.join('\n'),
      ...(payload.replyVia === 'email' && { replyTo: payload.contact.trim() }),
    };
  });
}

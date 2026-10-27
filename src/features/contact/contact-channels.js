import { isEmail, isPhone, telHref } from '@/content/forms.js';
import { t } from '@/i18n/index.js';

/** @typedef {import('@/content/model.js').SiteSettings} SiteSettings */

/**
 * @typedef {object} Channel
 * @property {string} id
 * @property {string} icon
 * @property {string} title
 * @property {string[]} lines
 * @property {string} action
 * @property {string | null} href   null — ბმული ჯერ არ არის: „{მოქმედება} [ბმული მზადდება]“
 */

/**
 * ხუთი არხი (ContactPage დაფა): ზარი (`tel:`), ელფოსტა (`mailto:`), მესენჯერი, ვიდეოზარი ჟესტურ
 * ენაზე, მისამართი + რუკა. ბმული მხოლოდ რეალურ მნიშვნელობაზე იქმნება (`isPhone` / `isEmail` / URL —
 * F4-ის წესი); `[ფრჩხილებიანი]` placeholder ტექსტად რჩება, მოქმედება — „[ბმული მზადდება]“.
 *
 * @param {SiteSettings} settings
 * @returns {Channel[]}
 */
export function contactChannels(settings) {
  const { phone, email, messenger, signVideo, address } = settings.contacts;
  const hours = settings.hours[0];
  return [
    {
      id: 'phone',
      icon: 'phone',
      title: t('contact.channels.phone'),
      lines: [phone, ...(hours ? [`${hours.label}: ${hours.value}`] : [])],
      action: t('contact.actions.call'),
      href: isPhone(phone) ? telHref(phone) : null,
    },
    {
      id: 'email',
      icon: 'mail',
      title: t('contact.channels.email'),
      lines: [email],
      action: t('contact.actions.write'),
      href: isEmail(email) ? `mailto:${email.trim()}` : null,
    },
    {
      id: 'messenger',
      icon: 'contact',
      title: t('contact.channels.messenger'),
      lines: [messenger.label, messenger.value],
      action: t('contact.actions.message'),
      href: messenger.url,
    },
    {
      id: 'sign-video',
      icon: 'sign-language',
      title: t('contact.channels.signVideo'),
      lines: [signVideo.schedule],
      action: t('contact.actions.book'),
      href: signVideo.bookingUrl,
    },
    {
      id: 'address',
      icon: 'location',
      title: t('contact.channels.address'),
      lines: [address.text],
      action: t('contact.actions.map'),
      href: address.mapUrl,
    },
  ];
}

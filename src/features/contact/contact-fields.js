import { CONTACT_FIELDS } from '@/content/forms.js';
import { t } from '@/i18n/index.js';

/**
 * კონტაქტის ფორმის ველები: DOM id (შეცდომების ჯამის ბმულის სამიზნე) და ლეიბლი ჯამისთვის.
 * რიგი = ფორმის რიგი (`CONTACT_FIELDS`, forms.js).
 */

/** @typedef {(typeof CONTACT_FIELDS)[number]} ContactField */

/** @type {Readonly<Record<ContactField, string>>} */
export const FIELD_IDS = Object.freeze({
  name: 'cf-name',
  contact: 'cf-contact',
  topic: 'cf-topic',
  message: 'cf-message',
  support: 'cf-support',
  replyVia: 'cf-reply',
  consent: 'cf-consent',
});

export const HONEYPOT_ID = 'cf-website';
export const FORM_HEADING_ID = 'contact-form-title';

/** @returns {Record<ContactField, string>} */
export function fieldLabels() {
  return {
    name: t('contact.name'),
    contact: t('contact.contactField'),
    topic: t('contact.topic'),
    message: t('contact.message'),
    support: t('contact.support'),
    replyVia: t('contact.replyVia'),
    consent: t('contact.consent'),
  };
}

/**
 * შეცდომების ჯამის პუნქტები ფორმის რიგით.
 * @param {Record<string, { message: string }>} errors
 * @returns {import('@/components/ui/fields/ErrorSummary.jsx').ErrorSummaryItem[]}
 */
export function summaryItems(errors) {
  const labels = fieldLabels();
  return CONTACT_FIELDS.filter((name) => errors[name]).map((name) => ({
    id: FIELD_IDS[name],
    label: labels[name],
    message: errors[name].message,
  }));
}

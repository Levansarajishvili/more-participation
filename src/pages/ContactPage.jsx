import { t } from '@/i18n/index.js';

/** კონტაქტი (`/contact`). შიგთავსი — F6. */
export default function ContactPage() {
  return (
    <div className="site-container py-7">
      <h1 className="text-h1">{t('nav.contact')}</h1>
    </div>
  );
}

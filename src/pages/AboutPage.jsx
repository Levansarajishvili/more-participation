import { t } from '@/i18n/index.js';

/** ჩვენ შესახებ (`/about`). შიგთავსი — F5. */
export default function AboutPage() {
  return (
    <div className="site-container py-7">
      <h1 className="text-h1">{t('nav.about')}</h1>
    </div>
  );
}

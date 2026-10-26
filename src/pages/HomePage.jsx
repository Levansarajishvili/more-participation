import { t } from '@/i18n/index.js';

/** მთავარი გვერდი (`/`). შიგთავსი — F5. */
export default function HomePage() {
  return (
    <div className="site-container py-7">
      <h1 className="text-h1">{t('nav.home')}</h1>
    </div>
  );
}

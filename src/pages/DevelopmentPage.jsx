import { t } from '@/i18n/index.js';

/** პიროვნული განვითარება (`/development`). შიგთავსი — F7. */
export default function DevelopmentPage() {
  return (
    <div className="site-container py-7">
      <h1 className="text-h1">{t('nav.development')}</h1>
    </div>
  );
}

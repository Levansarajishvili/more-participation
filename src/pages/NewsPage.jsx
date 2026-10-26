import { t } from '@/i18n/index.js';

/** სიახლეები (`/news`). შიგთავსი — F6. */
export default function NewsPage() {
  return (
    <div className="site-container py-7">
      <h1 className="text-h1">{t('nav.news')}</h1>
    </div>
  );
}

import { t } from '@/i18n/index.js';

/** სტატიები (`/articles`). შიგთავსი — F6. */
export default function ArticlesPage() {
  return (
    <div className="site-container py-7">
      <h1 className="text-h1">{t('nav.articles')}</h1>
    </div>
  );
}

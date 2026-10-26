import { t } from '@/i18n/index.js';

/** ვიდეოები (`/videos`). შიგთავსი — F7. */
export default function VideosPage() {
  return (
    <div className="site-container py-7">
      <h1 className="text-h1">{t('nav.videos')}</h1>
    </div>
  );
}

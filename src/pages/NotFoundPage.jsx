import { Button } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

/** 404 — ნებისმიერი უცნობი მისამართი, გარსის შიგნით. სათაური — როუტის `handle.title`. */
export default function NotFoundPage() {
  return (
    <div className="site-container flex flex-col items-start gap-3 py-7">
      <h1 className="text-h1">{t('shell.notFoundTitle')}</h1>
      <p className="max-w-article text-lead text-muted">{t('shell.notFoundText')}</p>
      <Button variant="primary" to="/">
        {t('shell.notFoundHome')}
      </Button>
    </div>
  );
}

import { usePageTitle } from '@/components/layout/usePageTitle.js';
import { Button } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

/**
 * გვერდის შეცდომა (lazy chunk ვერ ჩაიტვირთა, რენდერის შეცდომა). PageShell-ის შიგნით ჩნდება —
 * ჰედერი, ფუტერი და თავსებადობის მენიუ რჩება. გარსის ავარიისთვის — RootError.
 */
export default function RouteError() {
  usePageTitle(t('shell.errorTitle'));
  return (
    <div className="site-container flex flex-col items-start gap-3 py-7">
      <h1 className="text-h1">{t('shell.errorTitle')}</h1>
      <p className="max-w-article text-lead text-muted">{t('shell.errorText')}</p>
      <Button variant="primary" onClick={() => window.location.reload()}>
        {t('shell.errorReload')}
      </Button>
    </div>
  );
}

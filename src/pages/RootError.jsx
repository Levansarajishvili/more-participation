import { t } from '@/i18n/index.js';

/**
 * გარსის ავარია (PreferencesProvider, SiteHeader ან SiteFooter ჩავარდა). გარსი არ არის, ამიტომ
 * საკუთარი `<main>` და `<title>` აქვს; ბმული სრულ გადატვირთვას აკეთებს.
 */
export default function RootError() {
  return (
    <main id="main" className="site-container flex flex-col items-start gap-3 py-7">
      <title>{`${t('shell.errorTitle')} — ${t('meta.siteName')}`}</title>
      <h1 className="text-h1">{t('shell.errorTitle')}</h1>
      <p className="max-w-article text-lead text-muted">{t('shell.errorText')}</p>
      <a href="/">{t('shell.notFoundHome')}</a>
    </main>
  );
}

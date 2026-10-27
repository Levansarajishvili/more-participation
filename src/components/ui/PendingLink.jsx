import { t } from '@/i18n/index.js';

/**
 * ბმული, რომლის მისამართი ჯერ არ არსებობს (`SiteSettings.links.*` = null, F4-ის წესი):
 * წარწერა + „[ბმული მზადდება]“, ბმულის გარეშე — გატეხილი ან ცარიელი `href` არსად არის.
 * როცა URL გამოჩნდება, გვერდი `Button variant="link"`-ს ხატავს.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children   ბმულის წარწერა („ვაკანსიები“)
 * @param {string} [props.className]
 */
export default function PendingLink({ children, className }) {
  return (
    <p className={className ? `mc-pending-link ${className}` : 'mc-pending-link'}>
      <span>{children}</span>
      <span className="mc-pending-link__note">{t('footer.linkPending')}</span>
    </p>
  );
}

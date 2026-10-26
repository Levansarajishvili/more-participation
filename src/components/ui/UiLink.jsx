import { Link } from 'react-router';

import { t } from '@/i18n/index.js';

import VisuallyHidden from './VisuallyHidden.jsx';

/**
 * შიდა ბმული (`to` → Router `Link`) ან გარე (`href` → `<a>`). `newTab` — ახალ ჩანართში;
 * ეკრანის მკითხველი ამას „(იხსნება ახალ ჩანართში)“-ით იგებს.
 *
 * @param {object} props
 * @param {string} [props.to]
 * @param {string} [props.href]
 * @param {boolean} [props.newTab=false]
 * @param {import('react').ReactNode} props.children
 */
export default function UiLink({ to, href, newTab = false, children, ...rest }) {
  const target = newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const content = newTab ? (
    <>
      {children} <VisuallyHidden>{t('common.newTab')}</VisuallyHidden>
    </>
  ) : (
    children
  );
  if (to != null) {
    return (
      <Link to={to} {...target} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <a href={href} {...target} {...rest}>
      {content}
    </a>
  );
}

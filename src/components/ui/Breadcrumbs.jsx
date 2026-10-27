import { Link } from 'react-router';

import { t } from '@/i18n/index.js';

/**
 * ნავიგაციის ბილიკი (AboutPage დაფა): `<nav aria-label>` + `<ol>`; ბოლო პუნქტი მიმდინარე
 * გვერდია (`aria-current="page"`, ბმულის გარეშე). გამყოფი „/“ CSS-შია და ეკრანის მკითხველი მას
 * არ კითხულობს (`content: '/' / ''`). ბმულის სამიზნე 44px.
 *
 * @param {object} props
 * @param {{ to?: string, label: string }[]} props.items   ბოლო — მიმდინარე გვერდი
 * @param {string} [props.label]                           ნაგულისხმევი „ნავიგაციის ბილიკი“
 * @param {string} [props.className]
 */
export default function Breadcrumbs({ items, label, className }) {
  const last = items.length - 1;
  return (
    <nav
      aria-label={label ?? t('nav.breadcrumb')}
      className={className ? `mc-breadcrumbs ${className}` : 'mc-breadcrumbs'}
    >
      <ol className="mc-breadcrumbs__list">
        {items.map((item, i) => (
          <li key={item.to ?? item.label} className="mc-breadcrumbs__item">
            {i < last && item.to ? (
              <Link to={item.to} className="mc-breadcrumbs__link">
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === last ? 'page' : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

import { NavLink, useLocation } from 'react-router';

import { Icon, VisuallyHidden } from '@/components/ui/index.js';

import { can } from '../api/permissions.js';
import { useAuth } from '../auth/auth-context.js';
import { typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';

import { ADMIN_NAV } from './admin-nav.js';

/**
 * პანელის მენიუ: `<nav aria-label="პანელის მენიუ">` სამი ჯგუფით (ჯგუფის სათაური — სიის
 * `aria-labelledby`). პუნქტი — `NavLink`: URL, „უკან“ და ახალ ჩანართში გახსნა მუშაობს
 * (დაფაზე `<button aria-current>` იყო). ზუსტ გვერდზე `aria-current="page"`, ქვეგვერდზე — `true`.
 * მრიცხველს ტექსტური სახელი აქვს: „სტატიები, 16 მასალა“.
 *
 * @param {object} props
 * @param {import('../api/adminAdapter.js').Stats | null} props.stats
 * @param {() => void} [props.onNavigate]
 * @param {string} props.idPrefix
 */
export default function AdminNav({ stats, onNavigate, idPrefix }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const groups = ADMIN_NAV.filter((group) => !group.permission || can(user, group.permission));

  /** @param {import('./admin-nav.js').AdminNavItem} item */
  function count(item) {
    if (!stats) return null;
    if (item.type) return stats.counts?.[item.type] ?? null;
    if (item.library) return stats.library?.[item.library] ?? null;
    return null;
  }

  /** @param {import('./admin-nav.js').AdminNavItem} item */
  function renderItem(item) {
    const label = item.type ? typeLabel(item.type) : ta(/** @type {string} */ (item.label));
    const n = count(item);
    return (
      <li key={item.to} className="mc-admin-nav__item">
        <NavLink
          to={item.to}
          end={item.end}
          className="mc-admin-nav__link"
          aria-current={pathname === item.to ? 'page' : 'true'}
          onClick={onNavigate}
        >
          <Icon name={item.icon} size="1.25rem" />
          <span className="mc-admin-nav__label">{label}</span>
          {n !== null && (
            <>
              <VisuallyHidden>,</VisuallyHidden> <span className="mc-admin-nav__count">{n}</span>{' '}
              <VisuallyHidden>{ta('nav.countUnit')}</VisuallyHidden>
            </>
          )}
        </NavLink>
        {item.children && (
          <ul role="list" className="mc-admin-nav__sub">
            {item.children.map(renderItem)}
          </ul>
        )}
      </li>
    );
  }

  return (
    <nav aria-label={ta('nav.label')} className="mc-admin-nav">
      {groups.map((group) => {
        const titleId = `${idPrefix}-${group.id}`;
        return (
          <div key={group.id} className="mc-admin-nav__group">
            <p id={titleId} className="mc-admin-nav__title">
              {ta(`nav.groups.${group.id}`)}
            </p>
            <ul role="list" aria-labelledby={titleId} className="mc-admin-nav__list">
              {group.items.map(renderItem)}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

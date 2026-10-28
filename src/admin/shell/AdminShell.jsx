import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useMatches, useNavigate, useParams } from 'react-router';

import { Breadcrumbs, Button, IconButton, Logo, VisuallyHidden } from '@/components/ui/index.js';
import A11yMenu from '@/features/a11y/A11yMenu.jsx';
import { usePreferences } from '@/features/a11y/usePreferences.js';
import { localizePath, t } from '@/i18n/index.js';
import LanguageSwitch from '@/components/layout/LanguageSwitch.jsx';
import { useContent } from '@/hooks/useContent.js';

import { stats as fetchStats } from '../api/adminAdapter.js';
import { useAuth } from '../auth/auth-context.js';
import { newItemType, typeLabel } from '../content-types.js';
import { ta } from '../i18n/index.js';

import AdminNav from './AdminNav.jsx';
import { AdminPageContext } from './admin-page.js';
import { initials } from './initials.js';
import { useAdminLayout } from './useAdminLayout.js';

/**
 * ადმინის გარსი (AdminPanel დაფა): sidebar 268px (16.75rem) + header 76px. საჯარო
 * `SiteHeader` / `SiteFooter` აქ არ გამოიყენება (CLAUDE.md-ის გამონაკლისი).
 *
 * - Tab-ის რიგი: „გადასვლა შინაარსზე“ → sidebar (ლოგო, მენიუ, ანგარიში) → header (ძიება, საიტის
 *   ნახვა, თავსებადობის მენიუ, მუქი რეჟიმი, „ახალი მასალა“) → `<main>`.
 * - < 75rem (100%-ზე < 1200px; შრიფტის მასშტაბს მიჰყვება): sidebar → disclosure-მენიუ header-ში
 *   (`aria-expanded`, `aria-controls`); გახსნილისას დანარჩენი `inert`-ია, Esc ხურავს და ფოკუსს
 *   ღილაკზე აბრუნებს — საჯარო ჰედერის წესი. 390-ზე ღილაკები ორ რიგად ლაგდება.
 * - როუტის შეცვლისას: `document.title` + ფოკუსი header-ის h1-ზე; პირველ ჩატვირთვაზე — არა,
 *   შესვლის შემდეგ (`state.focus === 'heading'`) — კი.
 * - თავსებადობის მენიუ header-შია (დაფაზე არ არის): რედაქტორებსაც სჭირდებათ შრიფტი,
 *   განლაგება და კონტრასტი.
 */
export default function AdminShell() {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const layout = useAdminLayout(rootRef);
  const compact = layout === 'compact';
  const location = useLocation();
  const matches = useMatches();
  const params = useParams();
  const [page, setPage] = useState(
    /** @type {import('./admin-page.js').AdminPageInfo | null} */ (null),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const previousPath = useRef(location.pathname);
  // მრიცხველები ყოველ გადასვლაზე ახლდება (წაშლის / შექმნის შემდეგ)
  const refreshKey = location.pathname;
  const statsState = useContent(() => {
    void refreshKey;
    return fetchStats();
  }, [refreshKey]);

  const routeInfo = routeHandle(matches, params);
  const title = page?.title ?? routeInfo.title ?? '';
  const crumbs = page?.crumbs ?? routeInfo.crumbs ?? [];
  const isEditor = page?.editor ?? routeInfo.editor ?? false;
  const createType = newItemType(page?.type ?? params.type ?? null);
  const open = compact && menuOpen;

  // გადასვლისას და sidebar-ზე დაბრუნებისას მენიუ იხურება (render-ის დროს, როგორც SiteHeader-ში)
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (menuOpen) setMenuOpen(false);
  }
  if (!compact && menuOpen) setMenuOpen(false);

  useEffect(() => {
    document.title = title ? ta('meta.title', { title }) : ta('meta.base');
  }, [title]);

  useEffect(() => {
    const changed = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    const fromLogin =
      /** @type {{ focus?: string } | null} */ (location.state)?.focus === 'heading';
    if (!changed && !fromLogin) return;
    headingRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- მხოლოდ გზის ცვლილებაზე
  }, [location.pathname]);

  const setPageInfo = useCallback(
    (/** @type {import('./admin-page.js').AdminPageInfo | null} */ info) => setPage(info),
    [],
  );

  const statsData = statsState.status === 'success' ? statsState.data : (statsState.data ?? null);

  return (
    <AdminPageContext.Provider value={setPageInfo}>
      <div ref={rootRef} className="mc-admin" data-layout={layout}>
        <a
          href="#main"
          className="mc-skip mc-skip--hidden mc-admin__skip"
          inert={open}
          onClick={(event) => {
            const main = document.getElementById('main');
            if (!main) return;
            event.preventDefault();
            main.focus();
            main.scrollIntoView();
          }}
        >
          {ta('nav.skip')}
        </a>

        {!compact && (
          <aside className="mc-admin-sidebar" data-theme="dark" aria-label={ta('nav.label')}>
            <div className="mc-admin-sidebar__inner">
              <Brand />
              <PanelSearch />
              <AdminNav stats={statsData} idPrefix="side" />
              <UserBlock />
            </div>
          </aside>
        )}

        <div className="mc-admin__body">
          <header className="mc-admin-header">
            {compact && <CompactMenu open={open} onOpenChange={setMenuOpen} stats={statsData} />}
            <div className="mc-admin-header__title" inert={open}>
              {crumbs.length > 0 && (
                <Breadcrumbs
                  label={ta('header.breadcrumb')}
                  items={crumbs}
                  className="mc-admin-crumbs"
                />
              )}
              <h1
                ref={headingRef}
                tabIndex={-1}
                data-route-focus=""
                className="mc-admin-title"
                lang={page?.titleLang}
              >
                {title}
              </h1>
            </div>
            <HeaderTools inert={open} isEditor={isEditor} createType={createType} />
          </header>

          <main id="main" tabIndex={-1} inert={open} className="mc-admin-main">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminPageContext.Provider>
  );
}

/**
 * როუტის `handle.admin`: `{ title: 'dashboard.title' | (params) => string, crumbs?, editor? }`.
 * @param {ReturnType<typeof useMatches>} matches
 * @param {Record<string, string | undefined>} params
 * @returns {import('./admin-page.js').AdminPageInfo}
 */
function routeHandle(matches, params) {
  for (const match of [...matches].reverse()) {
    const info =
      /** @type {{ admin?: { title?: string | ((p: object) => string), crumbs?: (p: object) => import('./admin-page.js').Crumb[], editor?: boolean, root?: boolean } } | undefined} */ (
        match.handle
      )?.admin;
    if (!info) continue;
    const title =
      typeof info.title === 'function'
        ? info.title(params)
        : info.title
          ? ta(info.title)
          : undefined;
    if (info.root) return { title, crumbs: [], editor: info.editor };
    return {
      title,
      crumbs: [
        { to: '/admin', label: ta('header.root') },
        ...(info.crumbs?.(params) ?? []),
        ...(title ? [{ label: title }] : []),
      ],
      editor: info.editor,
    };
  }
  return {};
}

function Brand() {
  const { theme } = usePreferences();
  return (
    <Link to="/admin" className="mc-admin-brand">
      <Logo layout="mark" tone={theme === 'contrast' ? 'mono' : 'inverse'} size={44} decorative />
      <span className="mc-admin-brand__text">
        <span className="mc-admin-brand__name">{ta('brand.name')}</span>
        <span className="mc-admin-brand__area">{ta('brand.area')}</span>
      </span>
      <VisuallyHidden>{` — ${ta('brand.home')}`}</VisuallyHidden>
    </Link>
  );
}

/** ანგარიშის ბლოკი: ინიციალი, სახელი, როლი, „გასვლა“. */
function UserBlock() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="mc-admin-user">
      <div className="mc-admin-user__who">
        <span className="mc-avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="mc-admin-user__text">
          <span className="mc-admin-user__name">{user.name}</span>
          <span className="mc-admin-user__role">{ta(`roles.${user.role}`)}</span>
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        icon="logout"
        fullWidth
        className="mc-admin-logout"
        onClick={async () => {
          await logout();
          navigate('/admin/login?reason=logged-out', { replace: true });
        }}
      >
        {ta('user.logout')}
      </Button>
    </div>
  );
}

/**
 * „ძიება პანელში“ (`<search>`): sidebar-ში / compact-მენიუში, ხილული ლეიბლით (დაფაზე header-ში
 * იყო დამალული ლეიბლით — header-ში თავსებადობის მენიუ დაემატა და 1440-ზე ერთ რიგში აღარ ეტეოდა).
 * გაგზავნა → `/admin/search?q=`.
 */
function PanelSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchId = useId();
  const onSearchPage = location.pathname === '/admin/search';
  const currentQ = onSearchPage ? (new URLSearchParams(location.search).get('q') ?? '') : '';
  const [q, setQ] = useState(currentQ);
  const [lastQ, setLastQ] = useState(currentQ);
  if (lastQ !== currentQ) {
    setLastQ(currentQ);
    setQ(currentQ);
  }
  return (
    <search className="mc-admin-search" aria-label={ta('header.search')}>
      <form
        className="mc-admin-search__form"
        onSubmit={(event) => {
          event.preventDefault();
          const value = q.trim();
          navigate(value ? `/admin/search?q=${encodeURIComponent(value)}` : '/admin/search');
        }}
      >
        <label htmlFor={searchId} className="mc-admin-search__label">
          {ta('header.search')}
        </label>
        <span className="mc-admin-search__row">
          <input
            id={searchId}
            type="search"
            className="mc-input mc-admin-search__input"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <IconButton type="submit" icon="search" size="sm" label={ta('header.searchSubmit')} />
        </span>
      </form>
    </search>
  );
}

/**
 * header-ის ხელსაწყოები: საიტის ნახვა (ახალ ჩანართში), თავსებადობის მენიუ, მუქი რეჟიმი,
 * „ახალი მასალა“ (რედაქტორზე — secondary: ეკრანის ერთადერთი CTA „გამოქვეყნებაა“).
 * @param {{ inert: boolean, isEditor: boolean, createType: import('../content-types.js').ContentType }} props
 */
function HeaderTools({ inert, isEditor, createType }) {
  const { theme, setTheme } = usePreferences();
  const dark = theme === 'dark';

  return (
    <div className="mc-admin-header__tools" inert={inert}>
      <div className="mc-admin-header__actions">
        <Button variant="secondary" size="sm" href={localizePath('/')} newTab iconEnd="external">
          {ta('header.viewSite')}
        </Button>
        <A11yMenu className="mc-admin-a11y" />
        <LanguageSwitch className="mc-admin-lang" />
        <IconButton
          icon="moon"
          size="sm"
          label={t('a11y.themeToggle')}
          pressed={dark}
          onClick={() => setTheme(dark ? 'light' : 'dark')}
        />
        <Button
          variant={isEditor ? 'secondary' : 'cta'}
          size={isEditor ? 'sm' : 'md'}
          icon="plus"
          to={`/admin/${createType}/new`}
          className="mc-admin-new"
        >
          {ta('header.newItem')}
          <VisuallyHidden>
            {ta('header.newItemType', { type: typeLabel(createType, 'one') })}
          </VisuallyHidden>
        </Button>
      </div>
    </div>
  );
}

/**
 * < 75rem: მენიუს ღილაკი + პანელი (sidebar-ის შიგთავსი). ღილაკი და პანელი ერთადერთი არა-inert
 * ნაწილია — Tab მათ შორის ციკლავს, Esc ხურავს და ფოკუსს ღილაკზე აბრუნებს.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, stats: import('../api/adminAdapter.js').Stats | null }} props
 */
function CompactMenu({ open, onOpenChange, stats }) {
  const panelId = useId();
  const buttonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const panelRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  function close() {
    onOpenChange(false);
    buttonRef.current?.focus();
  }

  /** @param {import('react').KeyboardEvent} event */
  function onKeyDown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = [
      buttonRef.current,
      ...(panelRef.current?.querySelectorAll('a[href], button:not([disabled]), input') ?? []),
    ].filter(Boolean);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      /** @type {HTMLElement | null} */ (first)?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      /** @type {HTMLElement | undefined} */ (last)?.focus();
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Esc და Tab-ის ციკლი შვილებიდან ამოდის
    <div className="mc-admin-menu" onKeyDown={onKeyDown}>
      <div className="mc-admin-menu__bar">
        <IconButton
          ref={buttonRef}
          icon={open ? 'close' : 'menu'}
          size="sm"
          label={ta('nav.menu')}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onOpenChange(!open)}
        />
        <Link to="/admin" className="mc-admin-menu__brand" inert={open}>
          {ta('brand.area')}
          <VisuallyHidden>{` — ${ta('brand.home')}`}</VisuallyHidden>
        </Link>
      </div>
      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        className="mc-admin-menu__panel"
        data-theme="dark"
      >
        <PanelSearch />
        <AdminNav stats={stats} idPrefix="menu" onNavigate={() => onOpenChange(false)} />
        <UserBlock />
      </div>
    </div>
  );
}

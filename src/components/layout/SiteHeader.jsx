import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { Button, IconButton, Logo, VisuallyHidden } from '@/components/ui/index.js';
import A11yMenu from '@/features/a11y/A11yMenu.jsx';
import { usePreferences } from '@/features/a11y/usePreferences.js';
import { t } from '@/i18n/index.js';

import LanguageSwitch from './LanguageSwitch.jsx';
import { JOIN_HREF, NAV_ITEMS } from './site-nav.js';
import { useShellLayout } from './useShellLayout.js';

/**
 * საიტის ჰედერი (SiteHeader + HomeMobile დაფები). ერთადერთი `banner` landmark — გვერდი
 * საკუთარ ჰედერს, ნავიგაციას, თავსებადობის მენიუს ან რეჟიმის გადამრთველს არ ხატავს.
 *
 * ზედა ზოლი (ორივე თემაში მუქი, `--mc-footer` + `data-theme="dark"` ქვეხე):
 *   skip-link „გადასვლა შინაარსზე“ (compact-ში ჩანს მხოლოდ ფოკუსისას) · თავსებადობის მენიუ ·
 *   ენის გადამრთველი — English / ქართული (`lang`, `hreflang`; F9: იგივე გვერდი მეორე ენაზე).
 * მთავარი ზოლი (`--mc-header`): ლოგო (ბმული მთავარზე) · 7 პუნქტი `NavLink`-ით · „მუქი რეჟიმი“
 *   (`aria-pressed`) · CTA „ჩაერთე“.
 * compact (ზოლში ნავიგაცია არ ეტევა — 100%-ზე < 1200px; იხ. useShellLayout): ლოგო · რეჟიმი · ჰამბურგერი (`aria-expanded`,
 *   `aria-controls`); პანელში ნავიგაცია და CTA. გახსნისას ფონი `inert`-ია (`onNavOpenChange` →
 *   PageShell), Tab ციკლავს ჰამბურგერსა და პანელს შორის, Esc ხურავს და ფოკუსს ღილაკზე აბრუნებს.
 *
 * aria-current: ზუსტ გვერდზე `page`, ქვეგვერდზე (/articles/:slug) — `true`.
 *
 * @param {object} props
 * @param {(open: boolean) => void} [props.onNavOpenChange]
 */
export default function SiteHeader({ onNavOpenChange }) {
  const barRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const layout = useShellLayout(barRef);
  const { theme, setTheme } = usePreferences();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const compact = layout === 'compact';
  const menuOpen = compact && navOpen;

  // ერთი გზა გახსნილი პანელის მდგომარეობის გადასაცემად: როუტის, განლაგების ცვლილება ან Esc
  useEffect(() => {
    onNavOpenChange?.(menuOpen);
  }, [menuOpen, onNavOpenChange]);

  // გადასვლისას (ბმული პანელში) და desktop-ზე გადასვლისას პანელი იხურება
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (navOpen) setNavOpen(false);
  }
  if (!compact && navOpen) setNavOpen(false);

  const markTone = theme === 'contrast' ? 'mono' : theme === 'dark' ? 'inverse' : 'color';
  const dark = theme === 'dark';

  return (
    <header className="mc-site-header" data-layout={layout}>
      <div className="mc-topbar" inert={menuOpen}>
        <div data-theme="dark" className="site-container mc-topbar__inner">
          <a
            href="#main"
            className={compact ? 'mc-skip mc-skip--hidden' : 'mc-skip'}
            onClick={(event) => {
              const main = document.getElementById('main');
              if (!main) return;
              event.preventDefault();
              main.focus();
              main.scrollIntoView();
            }}
          >
            {t('nav.skipLink')}
          </a>
          <A11yMenu className="mc-topbar__a11y" />
          <LanguageSwitch className="mc-topbar__link" />
        </div>
      </div>

      <div className="mc-mainbar">
        <div ref={barRef} className="site-container mc-mainbar__inner">
          <Link to="/" className="mc-brand" inert={menuOpen}>
            <Logo layout="mark" tone={markTone} size={compact ? 44 : 56} decorative />
            <span className={layout === 'desktop' ? 'sr-only' : 'mc-brand__name'}>
              {t('meta.siteName')}
            </span>
            <VisuallyHidden>{` — ${t('nav.home')}`}</VisuallyHidden>
          </Link>

          {!compact && <MainNav pathname={pathname} className="mc-nav--bar" />}

          <div className="mc-mainbar__actions">
            <IconButton
              icon="moon"
              label={t('a11y.themeToggle')}
              pressed={dark}
              inert={menuOpen}
              onClick={() => setTheme(dark ? 'light' : 'dark')}
            />
            {!compact && (
              <Button variant="cta" to={JOIN_HREF} iconEnd="arrow-up-right">
                {t('nav.cta')}
              </Button>
            )}
            {compact && <MobileMenu pathname={pathname} open={navOpen} onOpenChange={setNavOpen} />}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * მთავარი ნავიგაცია: `<nav>` + სია. აქტიური პუნქტი — `aria-current`, წონა 800 და 3px ხაზი.
 * @param {{ pathname: string, className?: string, onNavigate?: () => void }} props
 */
function MainNav({ pathname, className, onNavigate }) {
  return (
    <nav aria-label={t('nav.label')} className={className ? `mc-nav ${className}` : 'mc-nav'}>
      <ul className="mc-nav__list">
        {NAV_ITEMS.map((item) => {
          const exact = pathname === item.to;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className="mc-nav__link"
                aria-current={exact ? 'page' : 'true'}
                onClick={onNavigate}
              >
                {t(item.label)}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * ჰამბურგერი + პანელი (compact). პანელი DOM-ში ღილაკს მოსდევს; ღილაკი და პანელი ერთადერთი
 * არა-inert ნაწილია, ამიტომ Tab-ის ციკლი მათ შორისაა.
 * @param {{ pathname: string, open: boolean, onOpenChange: (open: boolean) => void }} props
 */
function MobileMenu({ pathname, open, onOpenChange }) {
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
      ...(panelRef.current?.querySelectorAll('a[href], button:not([disabled])') ?? []),
    ].filter(Boolean);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      /** @type {HTMLElement | undefined} */ (last)?.focus();
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Esc და Tab-ის ციკლი შვილებიდან ამოდის
    <div className="mc-mobile-menu" onKeyDown={onKeyDown}>
      <IconButton
        ref={buttonRef}
        icon={open ? 'close' : 'menu'}
        label={t('nav.menu')}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      />
      <div id={panelId} ref={panelRef} hidden={!open} className="mc-mobile-nav">
        <div className="site-container mc-mobile-nav__inner">
          <MainNav
            pathname={pathname}
            className="mc-nav--panel"
            onNavigate={() => onOpenChange(false)}
          />
          <Button
            variant="cta"
            to={JOIN_HREF}
            iconEnd="arrow-up-right"
            fullWidth
            onClick={() => onOpenChange(false)}
          >
            {t('nav.cta')}
          </Button>
        </div>
      </div>
    </div>
  );
}

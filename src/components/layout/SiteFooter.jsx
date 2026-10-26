import { Link } from 'react-router';

import { Logo, UiLink, VisuallyHidden } from '@/components/ui/index.js';
import { getSettings } from '@/content/adapter.js';
import { isEmail, isPhone } from '@/content/forms.js';
import { label } from '@/content/taxonomy.js';
import { usePreferences } from '@/features/a11y/usePreferences.js';
import { useContent } from '@/hooks/useContent.js';
import { t } from '@/i18n/index.js';

import { FOOTER_ACCESSIBILITY, FOOTER_MATERIALS, FOOTER_ORGANIZATION } from './site-nav.js';

/**
 * საიტის ფუტერი (SiteFooter + HomeMobile დაფები). ერთადერთი `contentinfo` landmark.
 * ფონი ორივე თემაში მუქია (`--mc-footer`: #0A1D38 / #030B16), შიგთავსი — `data-theme="dark"`
 * ქვეხე; ლოგო ინვერსიულია, კონტრასტის თემაში — მონოქრომი.
 *
 * ბლოკები: ბრენდი + სლოგანი · მასალები · ორგანიზაცია · კონტაქტი (`SiteSettings`-იდან) ·
 * ხელმისაწვდომობა · სოციალური ქსელები (ხილული სახელებით) · © [წელი].
 * ტელეფონი / ელფოსტა ბმული ხდება მხოლოდ მაშინ, როცა მნიშვნელობა ნამდვილია (`isPhone`/`isEmail`);
 * `[ფრჩხილებიანი]` placeholder და `url: null` ტექსტად რჩება — გატეხილი ბმული არსად არის.
 *
 * განლაგება container query-ითაა (layout.css): `rem` კონტეინერის პირობაში `<html>`-ის გამოთვლილ
 * ზომას უდრის, ამიტომ 200%-ზე ფუტერი სვეტებად თავისით გადაეწყობა.
 *
 * @param {{ inert?: boolean }} props
 */
export default function SiteFooter({ inert = false }) {
  const { theme } = usePreferences();
  const { data: settings } = useContent(() => getSettings(), []);
  const ids = {
    materials: 'mc-footer-materials',
    organization: 'mc-footer-organization',
    contact: 'mc-footer-contact',
    accessibility: 'mc-footer-accessibility',
    social: 'mc-footer-social',
  };
  const phone = settings?.contacts.phone;
  const email = settings?.contacts.email;

  return (
    <footer className="mc-footer" inert={inert}>
      <div data-theme="dark" className="site-container mc-footer__inner">
        <div className="mc-footer__grid">
          <div className="mc-footer__brand">
            <Logo
              layout="mark"
              tone={theme === 'contrast' ? 'mono' : 'inverse'}
              size={84}
              knockout="var(--mc-footer)"
              decorative
            />
            <div className="mc-footer__brand-text">
              <p className="mc-footer__name">{t('meta.siteName')}</p>
              <p className="mc-footer__descriptor">{t('footer.descriptor')}</p>
              <p className="mc-footer__slogan">„{t('meta.slogan')}“</p>
            </div>
          </div>

          <nav aria-labelledby={ids.materials} className="mc-footer__col">
            <h2 id={ids.materials} className="mc-footer__heading">
              {t('footer.materials')}
            </h2>
            <FooterLinks links={FOOTER_MATERIALS} />
          </nav>

          <nav aria-labelledby={ids.organization} className="mc-footer__col">
            <h2 id={ids.organization} className="mc-footer__heading">
              {t('footer.organization')}
            </h2>
            <FooterLinks links={FOOTER_ORGANIZATION} />
          </nav>

          <div className="mc-footer__col">
            <h2 id={ids.contact} className="mc-footer__heading">
              {t('footer.contact')}
            </h2>
            <ul className="mc-footer__list" aria-labelledby={ids.contact}>
              {phone && (
                <li>
                  {isPhone(phone) ? (
                    <a className="mc-footer__link" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                      {phone}
                    </a>
                  ) : (
                    <span className="mc-footer__text">{phone}</span>
                  )}
                </li>
              )}
              {email && (
                <li>
                  {isEmail(email) ? (
                    <a className="mc-footer__link" href={`mailto:${email}`}>
                      {email}
                    </a>
                  ) : (
                    <span className="mc-footer__text">{email}</span>
                  )}
                </li>
              )}
              <li>
                <Link className="mc-footer__link" to="/contact">
                  {t('footer.contactPage')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="mc-footer__col">
            <h2 id={ids.accessibility} className="mc-footer__heading">
              {t('footer.accessibility')}
            </h2>
            <FooterLinks
              links={FOOTER_ACCESSIBILITY}
              settings={settings?.links}
              labelledBy={ids.accessibility}
            />
          </div>
        </div>

        <div className="mc-footer__bottom">
          <p className="mc-footer__copyright">
            {t('footer.copyright', { year: t('footer.year') })}
          </p>
          <div className="mc-footer__social">
            <VisuallyHidden as="h2" id={ids.social}>
              {t('footer.social')}
            </VisuallyHidden>
            <ul className="mc-footer__social-list" aria-labelledby={ids.social}>
              {(settings?.social ?? []).map(({ network, url }) => (
                <li key={network}>
                  {url ? (
                    <UiLink href={url} newTab className="mc-footer__pill" lang="en">
                      {label('socialNetwork', network)}
                    </UiLink>
                  ) : (
                    <span className="mc-footer__pill mc-footer__pill--pending" lang="en">
                      {label('socialNetwork', network)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * @param {{
 *   links: readonly import('./site-nav.js').FooterLink[],
 *   settings?: Record<string, string | null>,
 *   labelledBy?: string,
 * }} props
 */
function FooterLinks({ links, settings, labelledBy }) {
  return (
    <ul className="mc-footer__list" aria-labelledby={labelledBy}>
      {links.map((link) => {
        const external = link.setting ? (settings?.[link.setting] ?? null) : null;
        return (
          <li key={link.label}>
            {link.to ? (
              <Link className="mc-footer__link" to={link.to}>
                {t(link.label)}
              </Link>
            ) : external ? (
              <a className="mc-footer__link" href={external}>
                {t(link.label)}
              </a>
            ) : (
              <span className="mc-footer__text">
                {t(link.label)}{' '}
                <span className="mc-footer__pending">{t('footer.linkPending')}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

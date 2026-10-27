import { useId } from 'react';

import { t } from '@/i18n/index.js';

import Icon from './Icon.jsx';
import UiLink from './UiLink.jsx';
import { cx } from './utils.js';

/**
 * @typedef {'cta' | 'primary' | 'secondary' | 'link'} ButtonVariant
 * @typedef {'sm' | 'md' | 'lg'} ButtonSize  sm 44px · md 48px · lg 56px (CTA-ს ნაგულისხმევი)
 */

/**
 * ღილაკი ან ღილაკის სახის ბმული. მდგომარეობები UIKit-იდან: ნაგულისხმევი, hover, focus-visible,
 * დაჭერილი (`:active`), გათიშული, + loading.
 *
 * - `cta` — ოქროსფერი #FFB81C / #0A1D38, 56px, მყარი ჩრდილი 4px (`--mc-shadow`); hover: #FFD166 +
 *   6px ჩრდილი და −2px ძვრა; დაჭერა: ჩრდილი ქრება, +4px ძვრა, 120ms. ოქროსფერი მხოლოდ აქ.
 * - `primary` — ink ფონი, surface ტექსტი (hover → muted, დაჭერა → link).
 * - `secondary` — ink კონტური (hover → --mc-hover, დაჭერა → --mc-pressed).
 * - `link` — ბმულის სახე, 44px სამიზნე.
 *
 * `to` → Router `Link`, `href` → `<a>`; გათიშული ბმული ფოკუსს არ იღებს.
 * F7: `disabledReason` — მიუწვდომელი მოქმედება („PDF მზადდება“, „[ბმული მზადდება]“): ღილაკი
 * ფოკუსს იღებს (`aria-disabled`, Tab-ში რჩება), მიზეზი ხილულია ქვემოთ და `aria-describedby`-ით
 * ისმის (Switch-ის F4-ის წესი). ბმული (`to` / `href` null-ით) — `<a role="link" aria-disabled
 * tabindex="0">`, ღილაკი — `<button aria-disabled>`; დაჭერა არაფერს აკეთებს.
 * `loading` — ტრიალი + ტექსტი, `aria-busy="true"`, დაჭერა იბლოკება, ფოკუსი რჩება.
 * reduced-motion: ძვრა არ ხდება, ფერი იცვლება მყისიერად.
 *
 * @param {object} props
 * @param {ButtonVariant} [props.variant='secondary']
 * @param {ButtonSize} [props.size]                 ნაგულისხმევი: cta — lg, დანარჩენი — md
 * @param {string} [props.to]
 * @param {string} [props.href]
 * @param {boolean} [props.newTab=false]
 * @param {'button' | 'submit' | 'reset'} [props.type='button']
 * @param {boolean} [props.disabled=false]
 * @param {import('react').ReactNode} [props.disabledReason]  F7: ხილული ახსნა (`disabled`-თან ერთად)
 * @param {boolean} [props.loading=false]
 * @param {string} [props.loadingLabel]             ნაგულისხმევი: „იტვირთება…“
 * @param {string} [props.icon]                     ხატულა ტექსტის წინ
 * @param {string} [props.iconEnd]                  ხატულა ტექსტის შემდეგ
 * @param {boolean} [props.fullWidth=false]
 * @param {(event: import('react').MouseEvent) => void} [props.onClick]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export default function Button({
  variant = 'secondary',
  size,
  to,
  href,
  newTab = false,
  type = 'button',
  disabled = false,
  disabledReason,
  loading = false,
  loadingLabel,
  icon,
  iconEnd,
  fullWidth = false,
  onClick,
  className,
  children,
  ...rest
}) {
  const reasonId = useId();
  const classes = cx(
    'mc-btn',
    `mc-btn--${variant}`,
    `mc-btn--${size ?? (variant === 'cta' ? 'lg' : 'md')}`,
    fullWidth && 'mc-btn--full',
    className,
  );
  const content = loading ? (
    <>
      <Spinner />
      <span>{loadingLabel ?? t('common.loading')}</span>
    </>
  ) : (
    <>
      {icon && <Icon name={icon} size="1.25em" />}
      <span>{children}</span>
      {iconEnd && <Icon name={iconEnd} size="1.25em" />}
    </>
  );

  if (disabled && disabledReason) {
    const isLink = to != null || href != null;
    /** @param {import('react').SyntheticEvent} event */
    const block = (event) => event.preventDefault();
    const shared = {
      'aria-disabled': /** @type {const} */ ('true'),
      'aria-describedby': reasonId,
      className: classes,
      onClick: block,
    };
    return (
      <span className={cx('mc-btn-pending', fullWidth && 'mc-btn-pending--full')}>
        {isLink ? (
          <a role="link" tabIndex={0} {...shared} {...rest}>
            {content}
          </a>
        ) : (
          <button type="button" {...shared} {...rest}>
            {content}
          </button>
        )}
        <span id={reasonId} className="mc-btn-pending__reason">
          {disabledReason}
        </span>
      </span>
    );
  }

  if (to != null || href != null) {
    if (disabled) {
      return (
        <a role="link" aria-disabled="true" className={classes} {...rest}>
          {content}
        </a>
      );
    }
    return (
      <UiLink to={to} href={href} newTab={newTab} className={classes} onClick={onClick} {...rest}>
        {content}
      </UiLink>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={classes}
      onClick={
        loading
          ? (event) => {
              event.preventDefault();
            }
          : onClick
      }
      {...rest}
    >
      {content}
    </button>
  );
}

/**
 * მარტო-ხატულიანი ღილაკი. `label` სავალდებულოა — ის ხდება ხელმისაწვდომი სახელი.
 * `pressed` (boolean) — გადამრთველი, `aria-pressed`.
 *
 * @param {object} props
 * @param {string} props.icon
 * @param {string} props.label
 * @param {'secondary' | 'primary' | 'ghost'} [props.variant='secondary']
 * @param {'sm' | 'md'} [props.size='md']   sm 44px · md 48px
 * @param {boolean} [props.pressed]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.to]
 * @param {string} [props.href]
 * @param {boolean} [props.newTab=false]
 * @param {string} [props.className]
 */
export function IconButton({
  icon,
  label,
  variant = 'secondary',
  size = 'md',
  pressed,
  disabled = false,
  to,
  href,
  newTab = false,
  className,
  ...rest
}) {
  if (import.meta.env.DEV && !label) console.warn(`[IconButton] „${icon}“: label სავალდებულოა`);
  const classes = cx('mc-icon-btn', `mc-icon-btn--${variant}`, `mc-icon-btn--${size}`, className);
  const glyph = <Icon name={icon} size="1.5rem" />;
  if (to != null || href != null) {
    return (
      <UiLink to={to} href={href} newTab={newTab} aria-label={label} className={classes} {...rest}>
        {glyph}
      </UiLink>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={classes}
      {...rest}
    >
      {glyph}
    </button>
  );
}

/** ტრიალი: currentColor-ის რკალი; reduced-motion-ში სტატიკურია, მდგომარეობას ტექსტი ამბობს. */
function Spinner() {
  return <span className="mc-spinner" aria-hidden="true" />;
}

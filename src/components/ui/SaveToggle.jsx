import { useState } from 'react';

import { useSaved } from '@/hooks/useSaved.js';
import { t } from '@/i18n/index.js';

import Icon from './Icon.jsx';
import VisuallyHidden from './VisuallyHidden.jsx';
import { cx } from './utils.js';

/**
 * სტატიის შენახვა (`useSaved` → `localStorage['mc-saved']`). `<button aria-pressed>`.
 * დაჭერისას ხატულა 1 → 1.2 → 1 (180ms spring) და ივსება `--mc-ink`-ით (ოქროსფერი — მხოლოდ CTA).
 * reduced-motion: მხოლოდ შევსება, მყისიერად.
 *
 * - `icon` (ნაგულისხმევი, ბარათზე) — 44px წრე; სახელი მუდმივია: „შენახვა: {სათაური}“,
 *   მდგომარეობას `aria-pressed` ამბობს.
 * - `label` — ხილული „შენახვა“ / „შენახულია“; ხელმისაწვდომი სახელი = ხილული ტექსტი + დამალული
 *   სათაური (label-in-name, WCAG 2.5.3).
 *
 * @param {object} props
 * @param {string} props.slug
 * @param {string} props.title
 * @param {'icon' | 'label'} [props.variant='icon']
 * @param {(saved: boolean) => void} [props.onChange]
 * @param {string} [props.className]
 */
export default function SaveToggle({
  slug,
  title,
  variant = 'icon',
  onChange,
  className,
  ...rest
}) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(slug);
  const [pops, setPops] = useState(0);

  const handleClick = () => {
    const next = toggle(slug);
    setPops((count) => count + 1);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={variant === 'icon' ? t('saved.save', { title }) : undefined}
      onClick={handleClick}
      className={cx('mc-save', `mc-save--${variant}`, className)}
      {...rest}
    >
      {/* key ცვლის ელემენტს — ანიმაცია ყოველ დაჭერაზე თავიდან ეშვება */}
      <span key={pops} className={cx('mc-save__glyph', pops > 0 && 'mc-save__glyph--pop')}>
        <Icon name="bookmark" size="1.375rem" />
      </span>
      {variant === 'label' && (
        <span>
          {saved ? t('saved.toggleOn') : t('saved.toggle')}
          <VisuallyHidden>: {title}</VisuallyHidden>
        </span>
      )}
    </button>
  );
}

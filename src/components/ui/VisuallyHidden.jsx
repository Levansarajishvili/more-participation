import { cx } from './utils.js';

/**
 * ეკრანზე დამალული, ეკრანის მკითხველისთვის ხილული ტექსტი (Tailwind `sr-only`).
 * `focusable` — ფოკუსისას ჩნდება (skip-link, F4).
 *
 * @param {object} props
 * @param {'span' | 'div' | 'p' | 'h2' | 'h3' | 'a'} [props.as='span']
 * @param {boolean} [props.focusable=false]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export default function VisuallyHidden({
  as: Tag = 'span',
  focusable = false,
  className,
  ...rest
}) {
  return <Tag className={cx('sr-only', focusable && 'focus:not-sr-only', className)} {...rest} />;
}

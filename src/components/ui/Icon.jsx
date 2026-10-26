import { ICONS } from './icon-sprite.js';
import { cx } from './utils.js';

/**
 * ხატულა `src/assets/icons/icons.svg`-დან, inline SVG-ად, `currentColor`-ით.
 * ნაგულისხმევად დეკორატიულია (`aria-hidden`): ხატულა ყოველთვის ტექსტის გვერდით დგას.
 * მარტო-ხატულიანი ღილაკისთვის — `IconButton` (სავალდებულო `label`).
 *
 * @param {object} props
 * @param {string} props.name               ხატულის id (`BRAND_ICONS` ან UI-გლიფი: check, alert, plus…)
 * @param {number | string} [props.size]    px (რიცხვი) ან CSS სიგრძე; ნაგულისხმევი 1.5rem = 24px, შრიფტის ზომას მიჰყვება
 * @param {boolean} [props.accent=false]     აქცენტი `--mc-graphic`-ით (ღია ფონზე მხოლოდ დეკორატიული: 2.82–3.06:1)
 * @param {string} [props.label]            თუ ხატულა თავად ატარებს აზრს → role="img" + aria-label
 * @param {string} [props.className]
 */
export default function Icon({ name, size = '1.5rem', accent = false, label, className, ...rest }) {
  const icon = ICONS[name];
  if (!icon) {
    if (import.meta.env.DEV) console.warn(`[Icon] უცნობი ხატულა: „${name}“`);
    return null;
  }
  const dimension = typeof size === 'number' ? `${size}px` : size;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      viewBox={icon.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={icon.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={cx('mc-icon', accent && 'mc-icon--accent', className)}
      style={{ width: dimension, height: dimension }}
      {...a11y}
      {...rest}
    >
      {icon.paths.map(({ kind, d }) =>
        kind === 'fill' ? (
          <path key={d} d={d} fill="currentColor" stroke="none" />
        ) : (
          <path
            key={d}
            d={d}
            className={kind === 'main' ? undefined : 'mc-icon__accent'}
            strokeWidth={kind === 'dot' ? 3.6 : undefined}
          />
        ),
      )}
    </svg>
  );
}

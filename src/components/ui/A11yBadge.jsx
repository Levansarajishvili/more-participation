import { label } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

import Icon from './Icon.jsx';
import { cx } from './utils.js';

/**
 * @typedef {import('@/content/model.js').AccessLevel} AccessLevel
 * @typedef {import('@/content/model.js').EventFormat} EventFormat
 * @typedef {'wheelchair' | 'signInterpreter' | 'captions' | 'format'} A11yBadgeKind
 */

const ICON = {
  wheelchair: 'accessibility',
  signInterpreter: 'sign-language',
  captions: 'captions',
};
const FORMAT_ICON = { 'in-person': 'location', online: 'online', hybrid: 'location' };

/**
 * ღონისძიების ხელმისაწვდომობის ნიშანი: ყოველთვის ხატულა + ტექსტი + 2px ჩარჩო, surface ფონზე
 * (§2: სტატუსის ტინტები არ გამოიყენება). დონე ფერით კი არა, ტექსტით და ჩარჩოს ტიპით განსხვავდება:
 * `yes` — მყარი ink, `on-request` — მყარი border, `no` — წყვეტილი border + muted.
 * `not-applicable` (მაგ. ეტლი ონლაინ ღონისძიებაზე) არაფერს ხატავს. მწვანე აქ არ გამოიყენება — ის ზრდაა.
 *
 * @param {object} props
 * @param {A11yBadgeKind} props.kind
 * @param {AccessLevel | EventFormat} props.value
 * @param {string} [props.className]
 */
export default function A11yBadge({ kind, value, className }) {
  if (value == null || value === 'not-applicable') return null;
  const isFormat = kind === 'format';
  const text = isFormat ? label('eventFormat', value) : t(`event.${kind}.${value}`);
  const icon = isFormat ? FORMAT_ICON[value] : ICON[kind];
  const level = isFormat ? 'yes' : value;
  return (
    <span className={cx('mc-badge', `mc-badge--${level}`, className)}>
      <Icon name={icon} size="1.25em" />
      <span>{text}</span>
    </span>
  );
}

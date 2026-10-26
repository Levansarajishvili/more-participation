import Icon from './Icon.jsx';
import { cx } from './utils.js';

/**
 * ზრდის ინდიკატორი: ▲ + მნიშვნელობა + ტექსტი, `--mc-growth` (ღია #08704C, მუქი #3DDC97,
 * კონტრასტი #FFFFFF). მწვანე ნარინჯისფერისგან სიკაშკაშით არ განსხვავდება (1.09:1), ამიტომ ▲ და
 * ტექსტი სავალდებულოა. ფონის ტინტი არ არის — 2px ჩარჩო (§2).
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.value   „[+00%]“
 * @param {import('react').ReactNode} props.label   „წინა წელთან“
 * @param {string} [props.className]
 */
export default function GrowthStat({ value, label, className }) {
  return (
    <span className={cx('mc-growth', className)}>
      <Icon name="triangle-up" size="0.75em" />
      <span>
        <span className="mc-growth__value">{value}</span> {label}
      </span>
    </span>
  );
}

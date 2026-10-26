import { useId } from 'react';

import Icon from './Icon.jsx';
import { cx } from './utils.js';

/**
 * ფილტრის ჩიპი: `<button aria-pressed>`, რადიუსი 999, მინ. 48px. არჩეულს აქვს ink-ის შევსება და ✓ —
 * არჩევანი მხოლოდ ფერით არ გამოიხატება. ფონის გადასვლა 150ms (`--mc-dur-chip`).
 *
 * @param {object} props
 * @param {boolean} props.pressed
 * @param {() => void} [props.onClick]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.lang]            უცხოენოვანი წარწერა (`flow` → `lang="en"`)
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Chip({ pressed, onClick, disabled = false, lang, className, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cx('mc-chip', className)}
      {...rest}
    >
      {pressed && <Icon name="check" size="1.125em" />}
      <span lang={lang}>{children}</span>
    </button>
  );
}

/**
 * @typedef {object} ChipOption       `options(kind, ids)`-ის ფორმატი (taxonomy.js)
 * @property {string | null} id      null — „ყველა“
 * @property {string} label
 * @property {string} [lang]
 * @property {boolean} [disabled]
 */

/**
 * ჩიპების ჯგუფი (`role="group"` + ხილული ან დამალული სათაური). ყოველი ჩიპი ცალკე Tab-გაჩერებაა,
 * Enter / Space ცვლის. ერთარჩევანიან რეჟიმში არჩეულ ჩიპზე ხელახლა დაჭერა არაფერს ცვლის;
 * `multiple` — ჩიპი ჩაირთვება და გამოირთვება. ფილტრის შედეგს გვერდი აცხადებს (`LiveRegion`).
 *
 * @param {object} props
 * @param {string} props.label
 * @param {boolean} [props.labelHidden=false]
 * @param {ChipOption[]} props.options
 * @param {string | null | string[]} props.value
 * @param {(value: any) => void} props.onChange   single: string | null; multiple: string[]
 * @param {boolean} [props.multiple=false]
 * @param {string} [props.className]
 */
export default function ChipGroup({
  label,
  labelHidden = false,
  options,
  value,
  onChange,
  multiple = false,
  className,
}) {
  const labelId = useId();
  const selected = multiple ? new Set(/** @type {string[]} */ (value ?? [])) : null;

  /** @param {ChipOption} option */
  const isPressed = (option) =>
    multiple ? selected.has(/** @type {string} */ (option.id)) : option.id === value;

  /** @param {ChipOption} option */
  const handle = (option) => {
    if (!multiple) {
      if (option.id !== value) onChange(option.id);
      return;
    }
    const next = new Set(selected);
    if (next.has(option.id)) next.delete(option.id);
    else next.add(option.id);
    onChange(options.map((o) => o.id).filter((id) => next.has(id)));
  };

  return (
    <div role="group" aria-labelledby={labelId} className={cx('mc-chip-group', className)}>
      <span id={labelId} className={cx('mc-chip-group__label', labelHidden && 'sr-only')}>
        {label}
      </span>
      <ul className="mc-chip-group__list">
        {options.map((option) => (
          <li key={option.id ?? '__all'}>
            <Chip
              pressed={isPressed(option)}
              disabled={option.disabled}
              lang={option.lang}
              onClick={() => handle(option)}
            >
              {option.label}
            </Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}

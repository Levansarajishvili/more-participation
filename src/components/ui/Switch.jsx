import { useId } from 'react';

import { t } from '@/i18n/index.js';

import Icon from './Icon.jsx';
import { cx } from './utils.js';

/**
 * გადამრთველი (F4, თავსებადობის მენიუ): `<button role="switch" aria-checked>`.
 * A11yPanel-ის პუნქტის ფორმა — ხატულა, წარწერა (ქვემოთ მდგომარეობის ტექსტით) და ბილიკი; მთელი რიგი
 * 52px სიმაღლის სამიზნეა. მდგომარეობა ფერით კი არა, ბილიკის შევსებით, ბურთულას ადგილითა და
 * ტექსტით („ჩართული / გამორთული“) ჩანს. მდგომარეობის ტექსტი `aria-hidden`-ია, რომ ხელმისაწვდომი
 * სახელი არ შეიცვალოს — მდგომარეობას `aria-checked` ამბობს.
 *
 * გათიშული — `aria-disabled` (და არა `disabled`): ელემენტი ფოკუსს იღებს, ეკრანის მკითხველი
 * მიზეზს (`disabledReason`, `aria-describedby`) კითხულობს, დაჭერა კი არაფერს ცვლის.
 * მდგომარეობები: ნაგულისხმევი, hover, ფოკუსი, დაჭერილი, ჩართული, გათიშული.
 *
 * @param {object} props
 * @param {boolean} props.checked
 * @param {(checked: boolean) => void} [props.onChange]
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.description]     მინიშნება ქვემოთ
 * @param {string} [props.icon]
 * @param {boolean} [props.disabled=false]
 * @param {import('react').ReactNode} [props.disabledReason]  ხილული ახსნა გათიშვისას
 * @param {string} [props.id]
 * @param {string} [props.className]
 */
export default function Switch({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled = false,
  disabledReason,
  id,
  className,
  ...rest
}) {
  const auto = useId();
  const base = id ?? auto;
  const descriptionId = description ? `${base}-description` : undefined;
  const reasonId = disabled && disabledReason ? `${base}-reason` : undefined;
  const describedBy = [descriptionId, reasonId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('mc-switch-field', className)}>
      <button
        type="button"
        role="switch"
        id={base}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        aria-describedby={describedBy}
        className="mc-switch"
        onClick={() => {
          if (!disabled) onChange?.(!checked);
        }}
        {...rest}
      >
        {icon && <Icon name={icon} size="1.375rem" />}
        <span className="mc-switch__text">
          <span className="mc-switch__label">{label}</span>
          <span className="mc-switch__state" aria-hidden="true">
            {checked ? t('common.on') : t('common.off')}
          </span>
        </span>
        <span className="mc-switch__track" aria-hidden="true">
          <span className="mc-switch__thumb" />
        </span>
      </button>
      {description && (
        <p id={descriptionId} className="mc-hint">
          {description}
        </p>
      )}
      {reasonId && (
        <p id={reasonId} className="mc-switch__reason">
          {disabledReason}
        </p>
      )}
    </div>
  );
}

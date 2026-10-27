import Icon from '../Icon.jsx';
import { cx } from '../utils.js';

import { FieldError, FieldHint, FieldLabel } from './Field.jsx';
import { describedBy, errorMessage, useFieldIds } from './field-utils.js';

/**
 * ჩამოსაშლელი სია — ნატიური `<select>` (კლავიატურა და ეკრანის მკითხველი ბრაუზერისაა),
 * ველის სტილით და chevron-ით. `placeholder` — ცარიელი პირველი ვარიანტი („აირჩიე“).
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label
 * @param {{ id: string, label: string }[]} props.options   `options(kind, ids)` taxonomy-დან
 * @param {string} [props.placeholder]
 * @param {import('react').ReactNode} [props.hint]
 * @param {string | { message: string } | null} [props.error]
 * @param {boolean} [props.optional=false]
 * @param {string} [props.id]
 * @param {string} [props.className]
 */
export default function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  optional = false,
  id,
  className,
  ...selectProps
}) {
  const ids = useFieldIds(id);
  const message = errorMessage(error);
  return (
    <div className={cx('mc-field', className)}>
      <FieldLabel htmlFor={ids.id} optional={optional} required={Boolean(selectProps.required)}>
        {label}
      </FieldLabel>
      <div className="mc-select-wrap">
        <select
          id={ids.id}
          className="mc-input mc-select"
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy(hint && ids.hint, message && ids.error)}
          {...selectProps}
        >
          {placeholder != null && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" className="mc-select__icon" />
      </div>
      {hint && <FieldHint id={ids.hint}>{hint}</FieldHint>}
      {message && <FieldError id={ids.error}>{message}</FieldError>}
    </div>
  );
}

import { cx } from '../utils.js';

import { FieldError, FieldHint, FieldLabel } from './Field.jsx';
import { describedBy, errorMessage, useFieldIds } from './field-utils.js';

/**
 * ტექსტური ველი: ლეიბლი ზემოთ, მინიშნება და შეცდომა ქვემოთ (`aria-describedby`), შეცდომისას
 * `aria-invalid` + 3px `--mc-error` კონტური + ხატულა და ტექსტი. კონტური 2px `--mc-border`
 * (≥ 3:1), რადიუსი 12, სიმაღლე 56px. ყველა სხვა prop `<input>`-ს გადაეცემა.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.hint]
 * @param {string | { message: string } | null} [props.error]
 * @param {boolean} [props.optional=false]
 * @param {string} [props.id]
 * @param {string} [props.type='text']
 * @param {string} [props.className]       გარე div-ზე
 */
export default function TextField({
  label,
  hint,
  error,
  optional = false,
  id,
  type = 'text',
  className,
  ...inputProps
}) {
  const ids = useFieldIds(id);
  const message = errorMessage(error);
  return (
    <div className={cx('mc-field', className)}>
      <FieldLabel htmlFor={ids.id} optional={optional}>
        {label}
      </FieldLabel>
      <input
        id={ids.id}
        type={type}
        className="mc-input"
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy(hint && ids.hint, message && ids.error)}
        {...inputProps}
      />
      {hint && <FieldHint id={ids.hint}>{hint}</FieldHint>}
      {message && <FieldError id={ids.error}>{message}</FieldError>}
    </div>
  );
}

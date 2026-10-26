import { cx } from '../utils.js';

import { FieldError, FieldHint, FieldLabel } from './Field.jsx';
import { describedBy, errorMessage, useFieldIds } from './field-utils.js';

/**
 * მრავალხაზოვანი ველი; იგივე წესები, რაც TextField-ს. სიმაღლე ≥ 8rem, ზომა ვერტიკალურად იცვლება.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.hint]
 * @param {string | { message: string } | null} [props.error]
 * @param {boolean} [props.optional=false]
 * @param {string} [props.id]
 * @param {number} [props.rows=5]
 * @param {string} [props.className]
 */
export default function TextArea({
  label,
  hint,
  error,
  optional = false,
  id,
  rows = 5,
  className,
  ...textareaProps
}) {
  const ids = useFieldIds(id);
  const message = errorMessage(error);
  return (
    <div className={cx('mc-field', className)}>
      <FieldLabel htmlFor={ids.id} optional={optional}>
        {label}
      </FieldLabel>
      <textarea
        id={ids.id}
        rows={rows}
        className="mc-input mc-textarea"
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy(hint && ids.hint, message && ids.error)}
        {...textareaProps}
      />
      {hint && <FieldHint id={ids.hint}>{hint}</FieldHint>}
      {message && <FieldError id={ids.error}>{message}</FieldError>}
    </div>
  );
}

import { cx } from '../utils.js';

import { FieldError, FieldHint } from './Field.jsx';
import { describedBy, errorMessage, useFieldIds } from './field-utils.js';

/**
 * მოსანიშნი ველი: 24px კვადრატი (რადიუსი 6), მონიშნული — ink ფონი და ✓; ლეიბლი მთლიანად
 * დაწკაპებადია (სამიზნე ≥ 44px სიმაღლით). forced-colors-ში ბრაუზერის ნატიური ველი ბრუნდება.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.hint]
 * @param {string | { message: string } | null} [props.error]
 * @param {string} [props.id]
 * @param {string} [props.className]
 */
export default function Checkbox({ label, hint, error, id, className, ...inputProps }) {
  const ids = useFieldIds(id);
  const message = errorMessage(error);
  return (
    <div className={cx('mc-field', className)}>
      <label htmlFor={ids.id} className="mc-choice">
        <input
          id={ids.id}
          type="checkbox"
          className="mc-check"
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy(hint && ids.hint, message && ids.error)}
          {...inputProps}
        />
        <span>{label}</span>
      </label>
      {hint && <FieldHint id={ids.hint}>{hint}</FieldHint>}
      {message && <FieldError id={ids.error}>{message}</FieldError>}
    </div>
  );
}

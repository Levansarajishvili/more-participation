import { cx } from '../utils.js';

import { FieldError, FieldHint, FieldLabel } from './Field.jsx';
import { describedBy, errorMessage, useFieldIds } from './field-utils.js';

/**
 * რადიო-ჯგუფი: `role="radiogroup"` + `aria-labelledby` სათაურზე; ვარიანტები — აბრები (Components დაფა):
 * მინ. 48px, რადიუსი 999, არჩეულს ink-ის კონტური. ისრები ბრაუზერის ნატიური ქცევაა.
 * შეცდომა `aria-invalid`-ით ჯგუფზე და ტექსტით ქვემოთ.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.legend
 * @param {string} props.name
 * @param {{ id: string, label: string, lang?: string }[]} props.options   `options(kind, ids)`
 * @param {string | null} [props.value]          კონტროლირებადი
 * @param {string} [props.defaultValue]          არაკონტროლირებადი
 * @param {(value: string) => void} [props.onChange]
 * @param {import('react').ReactNode} [props.hint]
 * @param {string | { message: string } | null} [props.error]
 * @param {boolean} [props.optional=false]
 * @param {boolean} [props.required=false]
 * @param {'pills' | 'list'} [props.layout='pills']
 * @param {string} [props.id]
 * @param {string} [props.className]
 */
export default function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  hint,
  error,
  optional = false,
  required = false,
  layout = 'pills',
  id,
  className,
}) {
  const ids = useFieldIds(id);
  const message = errorMessage(error);
  const controlled = value !== undefined;
  const legendId = `${ids.id}-legend`;
  return (
    <div
      id={ids.id}
      role="radiogroup"
      aria-labelledby={legendId}
      aria-required={required || undefined}
      aria-invalid={message ? true : undefined}
      aria-describedby={describedBy(hint && ids.hint, message && ids.error)}
      className={cx('mc-field', 'mc-fieldset', className)}
    >
      <FieldLabel as="span" id={legendId} optional={optional}>
        {legend}
      </FieldLabel>
      <div className={cx('mc-radio-list', `mc-radio-list--${layout}`)}>
        {options.map((option) => (
          <label key={option.id} className="mc-choice mc-choice--radio">
            <input
              type="radio"
              name={name}
              value={option.id}
              required={required}
              className="mc-radio"
              {...(controlled
                ? { checked: value === option.id }
                : { defaultChecked: defaultValue === option.id })}
              onChange={() => onChange?.(option.id)}
            />
            <span lang={option.lang}>{option.label}</span>
          </label>
        ))}
      </div>
      {hint && <FieldHint id={ids.hint}>{hint}</FieldHint>}
      {message && <FieldError id={ids.error}>{message}</FieldError>}
    </div>
  );
}

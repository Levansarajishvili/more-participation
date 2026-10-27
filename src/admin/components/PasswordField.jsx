import { useState } from 'react';

import { Icon } from '@/components/ui/index.js';
import { FieldError, FieldHint, FieldLabel } from '@/components/ui/fields/Field.jsx';
import { describedBy, errorMessage, useFieldIds } from '@/components/ui/fields/field-utils.js';

import { passwordStrength } from '../auth/auth-forms.js';
import { ta } from '../i18n/index.js';

/**
 * პაროლის ველი (AdminAuth დაფა) UI ნაკრების ველის წესებით: ლეიბლი ზემოთ, მინიშნება / შეცდომა
 * ქვემოთ, 56px. WCAG 3.3.8: ჩასმა არ იბლოკება, პაროლის მენეჯერი მუშაობს (`autoComplete`),
 * „ჩვენება“ — ტექსტის ხილვა ხელახლა აკრეფის გარეშე.
 *
 * - „ჩვენება“: 44px (დაფაზე 40), მუდმივი სახელი „პაროლის ჩვენება“ + `aria-pressed` — სახელი
 *   მდგომარეობით არ იცვლება (დაფაზე „ჩვენება / დამალვა“ იცვლებოდა `aria-pressed`-თან ერთად).
 * - `strength` — სიმტკიცის მაჩვენებელი: რჩევაა და არა ბლოკი; ტექსტი + 3 ზოლი (ink / border,
 *   ≥ 3:1), `aria-describedby`-ით ისმის; live region არ არის — ყოველ ასოზე არ ცხადდება.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.hint]
 * @param {string | { message: string } | null} [props.error]
 * @param {boolean} [props.strength=false]
 * @param {string} props.value
 * @param {string} [props.id]
 * @param {string} [props.className]
 */
export default function PasswordField({
  label,
  hint,
  error,
  strength = false,
  value,
  id,
  className,
  ...inputProps
}) {
  const ids = useFieldIds(id);
  const [shown, setShown] = useState(false);
  const message = errorMessage(error);
  const strengthId = `${ids.id}-strength`;
  const showStrength = strength && value.length > 0;

  return (
    <div className={className ? `mc-field mc-password ${className}` : 'mc-field mc-password'}>
      <FieldLabel htmlFor={ids.id} required={Boolean(inputProps.required)}>
        {label}
      </FieldLabel>
      <div className="mc-password__control">
        <input
          id={ids.id}
          type={shown ? 'text' : 'password'}
          className="mc-input mc-password__input"
          value={value}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy(
            hint && ids.hint,
            showStrength && strengthId,
            message && ids.error,
          )}
          {...inputProps}
        />
        <button
          type="button"
          className="mc-password__toggle"
          aria-pressed={shown}
          aria-controls={ids.id}
          aria-label={`${ta('auth.showPasswordPrefix')} ${ta('auth.showPassword')}`}
          onClick={() => setShown((v) => !v)}
        >
          <Icon name="eye" size="1.25rem" />
          <span>{ta('auth.showPassword')}</span>
        </button>
      </div>
      {hint && <FieldHint id={ids.hint}>{hint}</FieldHint>}
      {showStrength && <StrengthMeter id={strengthId} password={value} />}
      {message && <FieldError id={ids.error}>{message}</FieldError>}
    </div>
  );
}

/** @param {{ id: string, password: string }} props */
function StrengthMeter({ id, password }) {
  const result = passwordStrength(password);
  if (result.key === 'empty') return null;
  return (
    <div id={id} className="mc-strength" data-level={result.level}>
      <p className="mc-strength__text">
        {ta('auth.strength.label')} <strong>{ta(`auth.strength.${result.key}`)}</strong>.{' '}
        {result.tip} {ta('auth.strength.note')}
      </p>
      <span className="mc-strength__bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className="mc-strength__bar" data-on={n <= result.level || undefined} />
        ))}
      </span>
    </div>
  );
}

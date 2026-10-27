import { t } from '@/i18n/index.js';

import Icon from '../Icon.jsx';
import VisuallyHidden from '../VisuallyHidden.jsx';
import { cx } from '../utils.js';

/**
 * ლეიბლი ველის ზემოთ (placeholder ლეიბლს არ ცვლის). F6: ველის სტატუსი ყოველთვის სიტყვით
 * ჩანს — სავალდებულო (`required`) → „(სავალდებულო)“, არასავალდებულო (`optional`) →
 * „(არასავალდებულო)“. სიტყვა ლეიბლის ნაწილია, ამიტომ ხელმისაწვდომ სახელშიც ისმის (ქართულად —
 * ეკრანის მკითხველის „required“ ხშირად ინგლისურია); `required` ატრიბუტიც რჩება.
 *
 * @param {object} props
 * @param {string} [props.htmlFor]
 * @param {boolean} [props.optional=false]
 * @param {boolean} [props.required=false]
 * @param {'label' | 'legend' | 'span'} [props.as='label']
 * @param {string} [props.id]
 * @param {boolean} [props.hidden=false]  ვიზუალურად დამალული (ეკრანის მკითხველისთვის რჩება)
 * @param {import('react').ReactNode} props.children
 */
export function FieldLabel({
  htmlFor,
  optional = false,
  required = false,
  as: Tag = 'label',
  id,
  hidden = false,
  children,
}) {
  return (
    <Tag htmlFor={htmlFor} id={id} className={cx('mc-label', hidden && 'sr-only')}>
      {children}
      <FieldStatus required={required} optional={optional} />
    </Tag>
  );
}

/**
 * „(სავალდებულო)“ / „(არასავალდებულო)“ — ლეიბლის ბოლოს, უფრო მსუბუქი წონით და muted ფერით
 * (#42526A თეთრზე 7.93:1, #B8C7D9 #0F2440-ზე 9.07:1). Checkbox-იც ამას იყენებს.
 * @param {{ required?: boolean, optional?: boolean }} props
 */
export function FieldStatus({ required = false, optional = false }) {
  if (!required && !optional) return null;
  // ჰარი span-ის გარეთაა: ხელმისაწვდომი სახელი „სახელი (სავალდებულო)“ და არა „სახელი(სავალდებულო)“
  return (
    <>
      {' '}
      <span className="mc-label__optional">
        ({t(required ? 'common.required' : 'common.optional')})
      </span>
    </>
  );
}

/** @param {{ id: string, children: import('react').ReactNode }} props */
export function FieldHint({ id, children }) {
  return (
    <p id={id} className="mc-hint">
      {children}
    </p>
  );
}

/**
 * შეცდომა ხატულით და ტექსტით; ეკრანის მკითხველი „შეცდომა:“-ს წინ ისმენს.
 * @param {{ id: string, children: import('react').ReactNode }} props
 */
export function FieldError({ id, children }) {
  return (
    <p id={id} className="mc-error">
      <Icon name="alert" size="1.25rem" className="mc-error__icon" />
      <span>
        <VisuallyHidden>{t('fields.errorPrefix')}</VisuallyHidden> {children}
      </span>
    </p>
  );
}

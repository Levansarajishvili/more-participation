import { t } from '@/i18n/index.js';

import Icon from '../Icon.jsx';
import VisuallyHidden from '../VisuallyHidden.jsx';
import { cx } from '../utils.js';

/**
 * ლეიბლი ველის ზემოთ (placeholder ლეიბლს არ ცვლის). სავალდებულო ველს ბრაუზერი `required`-ით
 * აცხადებს; ხილულად ინიშნება უმცირესობა — „(არასავალდებულო)“.
 *
 * @param {object} props
 * @param {string} [props.htmlFor]
 * @param {boolean} [props.optional=false]
 * @param {'label' | 'legend' | 'span'} [props.as='label']
 * @param {string} [props.id]
 * @param {boolean} [props.hidden=false]  ვიზუალურად დამალული (ეკრანის მკითხველისთვის რჩება)
 * @param {import('react').ReactNode} props.children
 */
export function FieldLabel({
  htmlFor,
  optional = false,
  as: Tag = 'label',
  id,
  hidden = false,
  children,
}) {
  return (
    <Tag htmlFor={htmlFor} id={id} className={cx('mc-label', hidden && 'sr-only')}>
      {children}
      {optional && <span className="mc-label__optional"> ({t('common.optional')})</span>}
    </Tag>
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

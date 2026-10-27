import { useEffect, useId, useRef } from 'react';

import Icon from '../Icon.jsx';
import { cx } from '../utils.js';

import { focusField } from './field-utils.js';

/**
 * @typedef {object} ErrorSummaryItem
 * @property {string} id        ველის DOM id (ბმულის სამიზნე); რადიო-ჯგუფზე — ჯგუფის id
 * @property {string} label     ველის ლეიბლი („სახელი და გვარი“)
 * @property {string} message   შეცდომის ტექსტი (`fieldErrors.*`)
 */

/**
 * ფორმის შეცდომების ჯამი (F6, GOV.UK-ის პატერნი + prompt): გაგზავნისას ფორმის თავში ჩნდება,
 * `role="alert"`, ფოკუსი მასზე გადადის; ყოველი პუნქტი ბმულია ველზე — „{ლეიბლი}: {შეცდომა}“.
 * ბმულზე დაჭერა ფოკუსს ველზე გადაიტანს (რადიო-ჯგუფში — არჩეულ ან პირველ ვარიანტზე) და ველს
 * ლეიბლიანად ეკრანის შუაში აჩენს. hash არ იცვლება — PageShell-ის ფოკუსის ლოგიკა არ ირთვება.
 *
 * ყოველ გაგზავნაზე ჯამი თავიდან უნდა ჩაჯდეს (`key={attempt}`) — ახალი alert ხელახლა ცხადდება.
 * ფერი: 3px `--mc-error` ჩარჩო surface-ზე (#B3261E 6.54:1 / #F2B8B5 9.13:1), ტინტის გარეშე (§2).
 *
 * @param {object} props
 * @param {string} props.title
 * @param {ErrorSummaryItem[]} props.items
 * @param {'h2' | 'h3'} [props.headingLevel='h3']
 * @param {boolean} [props.focusOnMount=true]   false — მხოლოდ `/__kit`-ისთვის (ფოკუსს არ იპარავს)
 * @param {string} [props.className]
 */
export default function ErrorSummary({
  title,
  items,
  headingLevel: Heading = 'h3',
  focusOnMount = true,
  className,
}) {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const titleId = useId();

  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-labelledby={titleId}
      data-route-focus=""
      className={cx('mc-error-summary', className)}
    >
      <Icon name="alert" size="1.5rem" className="mc-error-summary__icon" />
      <div className="mc-error-summary__body">
        <Heading id={titleId} className="mc-error-summary__title">
          {title}
        </Heading>
        <ul className="mc-error-summary__list">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  focusField(item.id);
                }}
              >
                {item.label}: {item.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

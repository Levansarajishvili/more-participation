import { formatDate, formatDateParts, toDateAttribute } from '@/i18n/index.js';

import VisuallyHidden from './VisuallyHidden.jsx';

/**
 * თარიღის ბლოკი: დიდი რიცხვი + თვის შემოკლება (Asia/Tbilisi). ეკრანის მკითხველი შემოკლებას არ
 * კითხულობს — მას სრული თარიღი ესმის (`format`), `<time dateTime>` მანქანისთვისაა.
 * EventCard (F3) და NewsCard `variant="compact"` (F5) იყენებს.
 *
 * @param {object} props
 * @param {string} props.date                                ISO
 * @param {'long' | 'weekday'} [props.format='long']         ეკრანის მკითხველის ტექსტი
 * @param {string} [props.className]
 */
export default function DateTile({ date, format = 'long', className }) {
  const parts = formatDateParts(date);
  return (
    <time
      dateTime={toDateAttribute(date)}
      className={className ? `mc-date-tile ${className}` : 'mc-date-tile'}
    >
      <span className="mc-date-tile__day" aria-hidden="true">
        {parts.day}
      </span>
      <span className="mc-date-tile__month" aria-hidden="true">
        {parts.monthShort}
      </span>
      <VisuallyHidden>{formatDate(date, format)}</VisuallyHidden>
    </time>
  );
}

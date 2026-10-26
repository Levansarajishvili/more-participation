import { cx } from './utils.js';

/**
 * ციტატა: Noto Serif Georgian 500, 24 → 32 / 1.4 (`text-quote`) — სერიფი მხოლოდ აქ.
 * ქართული ბრჭყალები „ “ CSS-ით ემატება; ავტორი — `figcaption`-ში. მარცხენა 6px ზოლი დეკორატიულია
 * (`--mc-graphic`).
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {import('react').ReactNode} [props.cite]   ვის ეკუთვნის
 * @param {string} [props.lang]
 * @param {string} [props.className]
 */
export default function Quote({ children, cite, lang, className }) {
  return (
    <figure className={cx('mc-quote', className)}>
      <blockquote lang={lang}>
        <p>{children}</p>
      </blockquote>
      {cite && <figcaption>{cite}</figcaption>}
    </figure>
  );
}

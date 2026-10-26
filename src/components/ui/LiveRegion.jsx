import { cx } from './utils.js';

/**
 * სტატუსის შეტყობინება (`role="status"`, polite). რეგიონი DOM-ში მუდმივად უნდა იდგეს —
 * ეკრანის მკითხველი მხოლოდ შიგთავსის *ცვლილებას* აცხადებს. `alert` — მხოლოდ შეცდომისთვის, რომელიც
 * მომხმარებლის ქმედებას აჩერებს (`role="alert"`, assertive).
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children]  ცარიელი — არაფერი ცხადდება
 * @param {boolean} [props.visible=false]  ხილული სტატუსი (მაგ. „ნაპოვნია 5 სტატია“)
 * @param {boolean} [props.alert=false]
 * @param {'div' | 'p' | 'span'} [props.as='div']
 * @param {string} [props.className]
 */
export default function LiveRegion({
  children,
  visible = false,
  alert = false,
  as: Tag = 'div',
  className,
  ...rest
}) {
  return (
    <Tag
      role={alert ? 'alert' : 'status'}
      aria-live={alert ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cx(!visible && 'sr-only', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

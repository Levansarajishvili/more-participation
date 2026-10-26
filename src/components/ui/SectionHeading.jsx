import { cx } from './utils.js';

/**
 * სექციის სათაური: წარწერა (orange-700 / accent) + სათაური + lead + მოქმედება.
 * DOM-ში სათაური პირველია (სათაურებით ნავიგაციისას წარწერა არ იკარგება), ვიზუალურად წარწერა ზემოთაა.
 *
 * `band` — ფართო ზოლი (§2-ის გადათარგმნის წესი): ღიაში #FF8A3D ფონი + #0A1D38 ტექსტი (7.19:1);
 * მუქში alt ფონი + 6px ნარინჯისფერი ზედა კიდე (ნაკლები სიკაშკაშე); კონტრასტში შავი + 6px #FFE600.
 * ტოკენები: `--mc-band-bg`, `--mc-band-ink`, `--mc-band`.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.title
 * @param {'h1' | 'h2' | 'h3'} [props.as='h2']
 * @param {'h1' | 'h2' | 'h3'} [props.size]          ვიზუალური ზომა; ნაგულისხმევი = as
 * @param {string} [props.id]                         `aria-labelledby`-სთვის
 * @param {import('react').ReactNode} [props.eyebrow]
 * @param {import('react').ReactNode} [props.lead]
 * @param {import('react').ReactNode} [props.action]
 * @param {boolean} [props.band=false]
 * @param {string} [props.className]
 * @param {import('react').ReactNode} [props.children]
 */
export default function SectionHeading({
  title,
  as: Heading = 'h2',
  size,
  id,
  eyebrow,
  lead,
  action,
  band = false,
  className,
  children,
}) {
  return (
    <div className={cx('mc-section-heading', band && 'mc-band', className)}>
      <Heading id={id} className={cx('mc-section-heading__title', `text-${size ?? Heading}`)}>
        {title}
      </Heading>
      {eyebrow && <p className="mc-eyebrow">{eyebrow}</p>}
      {lead && <p className="mc-lead">{lead}</p>}
      {children}
      {action && <div className="mc-section-heading__action">{action}</div>}
    </div>
  );
}

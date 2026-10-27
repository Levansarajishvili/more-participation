import { cx } from './utils.js';

/**
 * @typedef {'card' | 'row' | 'tile' | 'person' | 'logo' | 'text'} SkeletonVariant
 * @typedef {import('@/content/model.js').Ratio} Ratio
 */

/** ტექსტის ხაზების სიგანე (%): ბოლო ხაზი მოკლეა, რომ ბლოკი ტექსტს ჰგავდეს. */
const LINE_WIDTHS = [92, 78, 64, 86, 70];

/**
 * ჩატვირთვის ჩონჩხი: შიგთავსის ფორმის სტატიკური ბლოკები, რომ ჩატვირთვისას განლაგება არ
 * ხტებოდეს (CLS). **ანიმაცია არ აქვს** — არც ციმციმი, არც მოძრავი ბზინვარება (§7: არაფერი
 * მოძრაობს თავისით; ფოტომგრძნობიარე მომხმარებელი). ეკრანის მკითხველისგან დამალულია
 * (`aria-hidden`) — მას `ContentState`-ის ტექსტი „იტვირთება: …“ ესმის.
 *
 * - `card` — მედია (`ratio`) + ხაზები (სტატია, ვიდეო, სერია, ბარათი ტექსტით);
 * - `row` — პატარა კადრი მარცხნივ + ხაზები (ვიდეოს სია);
 * - `tile` — თარიღის ბლოკი + ხაზები (სიახლე);
 * - `person` — წრე + ხაზები (გუნდი);
 * - `logo` — ლოგოს ადგილი + ერთი ხაზი (პარტნიორი);
 * - `text` — მხოლოდ ხაზები (ეტაპი).
 *
 * @param {object} props
 * @param {SkeletonVariant} [props.variant='card']
 * @param {Ratio} [props.ratio='3:2']
 * @param {number} [props.lines=3]
 * @param {string} [props.className]
 */
export default function Skeleton({ variant = 'card', ratio = '3:2', lines = 3, className }) {
  const media = {
    card: (
      <span className="mc-skeleton__media" style={{ aspectRatio: ratio.replace(':', ' / ') }} />
    ),
    row: <span className="mc-skeleton__media mc-skeleton__media--row" />,
    tile: <span className="mc-skeleton__tile" />,
    person: <span className="mc-skeleton__avatar" />,
    logo: <span className="mc-skeleton__media" style={{ aspectRatio: '3 / 2' }} />,
    text: null,
  }[variant];
  return (
    <div className={cx('mc-skeleton', `mc-skeleton--${variant}`, className)} aria-hidden="true">
      {media}
      <span className="mc-skeleton__body">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={cx('mc-skeleton__line', i === 0 && 'mc-skeleton__line--title')}
            style={{ width: `${LINE_WIDTHS[i % LINE_WIDTHS.length]}%` }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * ჩონჩხების ჯგუფი — იმავე ბადეში, რომელშიც შიგთავსი ჩაიტვირთება (`className` = სიის კლასი).
 *
 * @param {object} props
 * @param {number} props.count
 * @param {SkeletonVariant} [props.variant]
 * @param {Ratio} [props.ratio]
 * @param {number} [props.lines]
 * @param {string} [props.className]
 */
export function SkeletonGroup({ count, className, ...item }) {
  return (
    <div className={cx('mc-skeleton-group', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} {...item} />
      ))}
    </div>
  );
}

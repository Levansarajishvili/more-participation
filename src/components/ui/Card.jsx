import UiLink from './UiLink.jsx';
import { cx } from './utils.js';

/**
 * ბარათის საფუძველი. რადიუსი 24, ჩარჩო 2px `--mc-card-border`.
 *
 * დაწკაპებადი ბარათი (`to` / `href` / `onSelect`) — stretched-link: სათაურის ბმულის `::after`
 * მთელ ბარათს ფარავს, ამიტომ ბარათში ერთი Tab-გაჩერებაა და მთელ ბარათზე `<a>` არ ედება.
 * hover და focus-within: −4px აწევა + მყარი ჩრდილი `0 4px 0 --mc-card-border`, 200ms;
 * სათაური ხაზგასმით. ფოკუსის რგოლი მთელ ბარათზე ხატია (`:has`, focus.css).
 * ინტერაქტიული შვილები (`overlay`, `actions`) ბმულის ზემოთაა (`z-index`).
 *
 * DOM-ის რიგი: სათაური → წარწერა → ტექსტი → მეტა → მედია; ვიზუალურად მედია და წარწერა ზემოთაა.
 * ეკრანის მკითხველი სათაურით იწყებს.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.title
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {string} [props.to]
 * @param {string} [props.href]
 * @param {boolean} [props.newTab=false]
 * @param {() => void} [props.onSelect]          ღილაკი ბმულის ნაცვლად (მაგ. ვიდეო ფლეიერში)
 * @param {string} [props.titleLang]
 * @param {import('react').ReactNode} [props.eyebrow]   კატეგორია / ტიპი
 * @param {import('react').ReactNode} [props.media]
 * @param {import('react').ReactNode} [props.overlay]   მედიის ზემოთ (SaveToggle)
 * @param {import('react').ReactNode} [props.meta]      თარიღი, ხანგრძლივობა…
 * @param {import('react').ReactNode} [props.actions]   ღილაკები ბარათის ბოლოში
 * @param {import('react').ReactNode} [props.aside]     გვერდითი ბლოკი (ღონისძიების თარიღი)
 * @param {import('react').ReactNode} [props.children]  მოკლე ტექსტი
 * @param {'article' | 'div' | 'li'} [props.as='article']
 * @param {string} [props.className]
 */
export default function Card({
  title,
  headingLevel: Heading = 'h3',
  to,
  href,
  newTab = false,
  onSelect,
  titleLang,
  eyebrow,
  media,
  overlay,
  meta,
  actions,
  aside,
  children,
  as: Tag = 'article',
  className,
  ...rest
}) {
  const linked = to != null || href != null || onSelect != null;
  let heading = title;
  if (to != null || href != null) {
    heading = (
      <UiLink to={to} href={href} newTab={newTab} className="mc-card__link">
        {title}
      </UiLink>
    );
  } else if (onSelect) {
    heading = (
      <button type="button" className="mc-card__link" onClick={onSelect}>
        {title}
      </button>
    );
  }

  return (
    <Tag
      className={cx('mc-card', linked && 'mc-card--link', aside && 'mc-card--aside', className)}
      {...rest}
    >
      <div className="mc-card__body">
        <Heading className="mc-card__title" lang={titleLang}>
          {heading}
        </Heading>
        {eyebrow && <p className="mc-card__eyebrow">{eyebrow}</p>}
        {children && <div className="mc-card__text">{children}</div>}
        {meta && <div className="mc-card__meta">{meta}</div>}
        {actions && <div className="mc-card__actions">{actions}</div>}
      </div>
      {media && <div className="mc-card__media">{media}</div>}
      {aside && <div className="mc-card__aside">{aside}</div>}
      {overlay && <div className="mc-card__overlay">{overlay}</div>}
    </Tag>
  );
}

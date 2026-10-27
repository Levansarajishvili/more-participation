import { label } from '@/content/taxonomy.js';
import { formatDate, t, toDateAttribute } from '@/i18n/index.js';

import Button from '../Button.jsx';
import Card from '../Card.jsx';
import DateTile from '../DateTile.jsx';
import Media from '../Media.jsx';
import { cx } from '../utils.js';

/**
 * სიახლის ბარათი (`NewsSummary`). F6-იდან სიახლეს საკუთარი გვერდი აქვს (`/news/:slug`) — `to`
 * ბარათს stretched-link-ად აქცევს (მთავარი და სიახლეების გვერდი ყოველთვის გადასცემს).
 *
 * - `default` — ფოტო 3:2, ტიპი, თარიღი, სათაური, მოკლე აღწერა, მოქმედება (`action`: „განაცხადი“;
 *   `href: null` → გათიშული ღილაკი).
 * - `compact` (F5) — მთავარი გვერდის სია: თარიღის ბლოკი (`DateTile`), ფოტოსა და მოქმედების გარეშე.
 * - `feature` (F6) — „რჩეული სიახლე“ (NewsPage დაფა): ფართოზე ფოტო | ტექსტი 6fr | 6fr, რადიუსი 32,
 *   წარწერა „რჩეული სიახლე · {ტიპი}“, მოქმედების ღილაკი. დაფის ოქროსფერი „სრულად“ არ ედება — მთელი
 *   ბარათი ბმულია სრულ ტექსტზე, ოქროსფერი მხოლოდ CTA-ა.
 * - `list` (F6) — ქრონოლოგიური სია (`<ol>`): თარიღის ბლოკი | ფოტო | ტიპი + სათაური + აღწერა;
 *   ვიწრო კონტეინერში (< 48rem) ფოტო არ ჩანს (HomeMobile-ის სიახლეების პატერნი).
 *
 * @param {object} props
 * @param {import('@/content/model.js').NewsSummary} props.item
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {'default' | 'compact' | 'feature' | 'list'} [props.variant='default']
 * @param {string} [props.to]
 * @param {string} [props.className]
 */
export default function NewsCard({
  item,
  headingLevel = 'h3',
  variant = 'default',
  to,
  className,
  ...rest
}) {
  const { title, excerpt, type, cover, publishedAt, action } = item;
  const typeLabel = label('newsType', type);

  if (variant === 'compact' || variant === 'list') {
    return (
      <Card
        to={to}
        title={title}
        headingLevel={headingLevel}
        eyebrow={typeLabel}
        aside={<DateTile date={publishedAt} />}
        media={variant === 'list' && <Media image={cover} ratio="3:2" compact />}
        className={cx(`mc-card--news-${variant}`, className)}
        {...rest}
      >
        <p>{excerpt}</p>
      </Card>
    );
  }

  const feature = variant === 'feature';
  return (
    <Card
      to={to}
      title={title}
      headingLevel={headingLevel}
      eyebrow={
        feature ? (
          <>
            <span>{t('news.featured')}</span>
            <span className="mc-card__eyebrow-sub">{typeLabel}</span>
          </>
        ) : (
          typeLabel
        )
      }
      media={<Media image={cover} ratio="3:2" loading={feature ? 'eager' : 'lazy'} />}
      meta={<time dateTime={toDateAttribute(publishedAt)}>{formatDate(publishedAt)}</time>}
      actions={
        action && (
          <Button
            variant="secondary"
            size={feature ? 'md' : 'sm'}
            href={action.href ?? undefined}
            newTab={Boolean(action.href?.startsWith('http'))}
            disabled={!action.href}
            disabledReason={t('footer.linkPending')}
          >
            {action.text}
          </Button>
        )
      }
      className={cx(feature && 'mc-card--feature mc-card--feature-even', className)}
      {...rest}
    >
      <p>{excerpt}</p>
    </Card>
  );
}

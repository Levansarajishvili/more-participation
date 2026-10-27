import { label } from '@/content/taxonomy.js';
import { formatDate, t, toDateAttribute } from '@/i18n/index.js';

import Card from '../Card.jsx';
import Media from '../Media.jsx';
import SaveToggle from '../SaveToggle.jsx';
import { cx } from '../utils.js';

/**
 * სტატიის ბარათი (`ArticleSummary`): ფოტო 3:2, კატეგორია, სათაური → `/articles/:slug`,
 * მოკლე აღწერა, თარიღი და კითხვის დრო, შენახვის ღილაკი ფოტოზე.
 *
 * F6: `variant="feature"` — „რჩეული სტატია“ (ArticlesPage დაფა): ფართოზე ფოტო 7fr | ტექსტი 5fr,
 * რადიუსი 32 (დიდი ბლოკი), წარწერა „რჩეული სტატია · {კატეგორია}“, მეტაში ავტორიც. მთელი ბარათი
 * ერთი ბმულია (stretched-link) — დაფის ოქროსფერი „წაიკითხე“ არ ედება: ოქროსფერი მხოლოდ CTA-ა და
 * იგივე ბმული მეორე Tab-გაჩერებად არ მეორდება. `actions` — დამატებითი მოქმედება („მოუსმინე“).
 *
 * @param {object} props
 * @param {import('@/content/model.js').ArticleSummary} props.article
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {boolean} [props.saveable=true]
 * @param {'default' | 'feature'} [props.variant='default']
 * @param {import('react').ReactNode} [props.actions]
 * @param {string} [props.className]
 */
export default function ArticleCard({
  article,
  headingLevel = 'h3',
  saveable = true,
  variant = 'default',
  actions,
  className,
  ...rest
}) {
  const { slug, title, excerpt, category, cover, author, publishedAt, readingMinutes, hasAudio } =
    article;
  const feature = variant === 'feature';
  const categoryLabel = label('articleCategory', category);
  return (
    <Card
      to={`/articles/${slug}`}
      title={title}
      headingLevel={headingLevel}
      eyebrow={
        feature ? (
          <>
            <span>{t('articles.featured')}</span>
            <span className="mc-card__eyebrow-sub">{categoryLabel}</span>
          </>
        ) : (
          categoryLabel
        )
      }
      media={<Media image={cover} ratio="3:2" loading={feature ? 'eager' : 'lazy'} />}
      overlay={saveable && <SaveToggle slug={slug} title={title} />}
      meta={
        <>
          {feature && <span>{author}</span>}
          <time dateTime={toDateAttribute(publishedAt)}>{formatDate(publishedAt)}</time>
          <span>{t('articles.readingTime', { minutes: readingMinutes })}</span>
          {hasAudio && <span>{t('articles.audioVersion')}</span>}
        </>
      }
      actions={actions}
      className={cx(feature && 'mc-card--feature', className)}
      {...rest}
    >
      <p>{excerpt}</p>
    </Card>
  );
}

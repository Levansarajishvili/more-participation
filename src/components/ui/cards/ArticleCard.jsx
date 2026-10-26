import { label } from '@/content/taxonomy.js';
import { formatDate, t, toDateAttribute } from '@/i18n/index.js';

import Card from '../Card.jsx';
import Media from '../Media.jsx';
import SaveToggle from '../SaveToggle.jsx';

/**
 * სტატიის ბარათი (`ArticleSummary`): ფოტო 3:2, კატეგორია, სათაური → `/articles/:slug`,
 * მოკლე აღწერა, თარიღი და კითხვის დრო, შენახვის ღილაკი ფოტოზე.
 *
 * @param {object} props
 * @param {import('@/content/model.js').ArticleSummary} props.article
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {boolean} [props.saveable=true]
 * @param {string} [props.className]
 */
export default function ArticleCard({
  article,
  headingLevel = 'h3',
  saveable = true,
  className,
  ...rest
}) {
  const { slug, title, excerpt, category, cover, publishedAt, readingMinutes, hasAudio } = article;
  return (
    <Card
      to={`/articles/${slug}`}
      title={title}
      headingLevel={headingLevel}
      eyebrow={label('articleCategory', category)}
      media={<Media image={cover} ratio="3:2" />}
      overlay={saveable && <SaveToggle slug={slug} title={title} />}
      meta={
        <>
          <time dateTime={toDateAttribute(publishedAt)}>{formatDate(publishedAt)}</time>
          <span>{t('articles.readingTime', { minutes: readingMinutes })}</span>
          {hasAudio && <span>{t('articles.audioVersion')}</span>}
        </>
      }
      className={className}
      {...rest}
    >
      <p>{excerpt}</p>
    </Card>
  );
}

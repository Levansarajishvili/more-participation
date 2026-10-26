import { label, SERIES_TOPIC_TERMS } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

import Card from '../Card.jsx';
import Media from '../Media.jsx';

/**
 * სერიის ბარათი (`SeriesSummary`): ყდა 4:3, თემა, სათაური → `/development?series=:slug`,
 * სლაიდების რაოდენობა და წუთები. ყდა თემით არ იცვლება (§2): ფოტოს გარეშე — ტიპოგრაფიული ყდა
 * `tone`-ის ფიქსირებული წყვილით (navy, navy-deep, petrol, orange, alt — ყველა ≥ 7:1).
 *
 * @param {object} props
 * @param {import('@/content/model.js').SeriesSummary} props.series
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {string} [props.className]
 */
export default function SeriesCard({ series, headingLevel = 'h3', className, ...rest }) {
  const { slug, title, topic, excerpt, tone, cover, slideCount, readingMinutes } = series;
  const term = SERIES_TOPIC_TERMS[topic];
  const topicLabel = (
    <>
      {label('seriesTopic', topic)}
      {term && (
        <>
          {' ('}
          <span lang={term.lang}>{term.text}</span>)
        </>
      )}
    </>
  );
  const media = cover?.src ? (
    <Media image={cover} ratio="4:3" />
  ) : (
    <div className={`mc-cover mc-tone--${tone}`} aria-hidden="true">
      <span className="mc-cover__topic">{label('seriesTopic', topic)}</span>
      <span className="mc-cover__count">{t('development.slideCount', { count: slideCount })}</span>
    </div>
  );
  return (
    <Card
      to={`/development?series=${slug}`}
      title={title}
      headingLevel={headingLevel}
      eyebrow={topicLabel}
      media={media}
      meta={
        <>
          <span>{t('development.slideCount', { count: slideCount })}</span>
          <span>{t('development.minutes', { minutes: readingMinutes })}</span>
        </>
      }
      className={className}
      {...rest}
    >
      <p>{excerpt}</p>
    </Card>
  );
}

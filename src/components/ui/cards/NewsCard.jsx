import { label } from '@/content/taxonomy.js';
import { formatDate, toDateAttribute } from '@/i18n/index.js';

import Button from '../Button.jsx';
import Card from '../Card.jsx';
import Media from '../Media.jsx';

/**
 * სიახლის ბარათი (`NewsSummary`): ფოტო 3:2, ტიპი, თარიღი, სათაური, მოკლე აღწერა, მოქმედება
 * (`action` — „განაცხადი“, „რეგისტრაცია“; `href: null` → გათიშული ღილაკი).
 * სრული ტექსტის როუტი ჯერ გადაუწყვეტელია (F2, ღია საკითხი 2) — ბმული მხოლოდ `to`/`href`-ით.
 *
 * @param {object} props
 * @param {import('@/content/model.js').NewsSummary} props.item
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {string} [props.to]
 * @param {string} [props.className]
 */
export default function NewsCard({ item, headingLevel = 'h3', to, className, ...rest }) {
  const { title, excerpt, type, cover, publishedAt, action } = item;
  return (
    <Card
      to={to}
      title={title}
      headingLevel={headingLevel}
      eyebrow={label('newsType', type)}
      media={<Media image={cover} ratio="3:2" />}
      meta={<time dateTime={toDateAttribute(publishedAt)}>{formatDate(publishedAt)}</time>}
      actions={
        action && (
          <Button
            variant="secondary"
            size="sm"
            href={action.href ?? undefined}
            newTab={Boolean(action.href?.startsWith('http'))}
            disabled={!action.href}
          >
            {action.text}
          </Button>
        )
      }
      className={className}
      {...rest}
    >
      <p>{excerpt}</p>
    </Card>
  );
}

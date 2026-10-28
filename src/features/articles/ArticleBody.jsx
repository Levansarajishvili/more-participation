import { Link } from 'react-router';

import { Icon, Media, Quote } from '@/components/ui/index.js';
import { cx } from '@/components/ui/utils.js';

import './reading.css';

/** @typedef {import('@/content/model.js').Block} Block */
/** @typedef {import('@/content/model.js').Inline} Inline */

/**
 * სტატიის (და სიახლის) ტექსტი ბლოკებიდან (§10: HTML სტრიქონი არსად): `p`, `h2`, `h3`, `list`,
 * `quote`, `image`, `link`. ტიპოგრაფია — `.mc-prose` (articles.css): 20/1.75, სვეტი 36em
 * (≈ 58 სიმბოლო, p95 ≤ 68), აბზაცებს შორის `--mc-paragraph-gap` (განლაგების რეჟიმში 2em).
 *
 * inline: `strong` → `<strong>` (კურსივი არ არსებობს), `lang` → `<span lang>`; ბმული: შიდა გზა
 * (`/…`) — Router `Link`, გარე — `<a>` იმავე ჩანართში (ახალი ფანჯარა მოულოდნელად არ იხსნება).
 * ფოტო — `figure` + `Media` (src: null → ჩანაცვლების ჩარჩო) + `figcaption`.
 *
 * @param {object} props
 * @param {Block[]} props.blocks
 * @param {import('react').Ref<HTMLDivElement>} [props.ref]
 * @param {string} [props.className]
 * @param {string} [props.lang]  F9: ტექსტის ენა, თუ გვერდისას არ ემთხვევა
 */
export default function ArticleBody({ blocks, ref, className, lang }) {
  return (
    <div ref={ref} className={cx('mc-prose', className)} lang={lang}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </div>
  );
}

/** @param {{ block: Block }} props */
function BlockView({ block }) {
  switch (block.type) {
    case 'p':
      return (
        <p>
          <Inlines runs={block.content} />
        </p>
      );
    case 'h2':
      return <h2>{block.text}</h2>;
    case 'h3':
      return <h3>{block.text}</h3>;
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return (
        <List>
          {block.items.map((runs, index) => (
            <li key={index}>
              <Inlines runs={runs} />
            </li>
          ))}
        </List>
      );
    }
    case 'quote':
      return (
        <Quote cite={block.cite} className="mc-prose__quote">
          {block.text}
        </Quote>
      );
    case 'image':
      return (
        <figure className="mc-prose__figure">
          <Media image={block.image} ratio={block.image.ratio} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case 'link':
      return (
        <p className="mc-prose__callout">
          <Icon name="arrow-up-right" className="mc-prose__callout-icon" />
          <span className="mc-prose__callout-body">
            <TextLink href={block.href} className="mc-prose__callout-link">
              {block.text}
            </TextLink>
            {block.description && (
              <span className="mc-prose__callout-text">{block.description}</span>
            )}
          </span>
        </p>
      );
    default:
      return null;
  }
}

/** @param {{ runs: Inline[] }} props */
function Inlines({ runs }) {
  return runs.map((run, index) => {
    if (run.type === 'link') {
      return (
        <TextLink key={index} href={run.href} lang={run.lang}>
          {run.text}
        </TextLink>
      );
    }
    let node = run.text;
    if (run.lang) node = <span lang={run.lang}>{node}</span>;
    if (run.strong) node = <strong>{node}</strong>;
    return <span key={index}>{node}</span>;
  });
}

/**
 * @param {{ href: string, lang?: string, className?: string, children: import('react').ReactNode }} props
 */
function TextLink({ href, lang, className, children }) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} lang={lang} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} lang={lang} className={className}>
      {children}
    </a>
  );
}

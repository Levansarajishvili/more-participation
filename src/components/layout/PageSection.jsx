import { SectionHeading } from '@/components/ui/index.js';
import { cx } from '@/components/ui/utils.js';

/**
 * გვერდის სექცია (F5): `<section aria-labelledby>` + `<h2 id>` + შიგთავსი `site-container`-ში.
 * სტილი — src/styles/sections.css.
 *
 * - `tone`: `default` (გვერდის ფონი), `alt` (მონაცვლე #E9EFF6 / #0B1C33), `dark` (მუქი ზოლი:
 *   ფონი ძირეული თემის `--mc-hero`, შიგთავსი `data-theme="dark"` ქვეხე — HomePage / AboutPage
 *   დაფების ლურჯი ზოლი, F4-ის ფუტერის პატერნი). კონტრასტის თემაში ქვეხე არ მოქმედებს — შავი რჩება.
 * - `action` („ყველა სტატია“, „გახდი პარტნიორი“) DOM-ში სათაურის შემდეგაა — ფოკუსის რიგი
 *   ვიზუალურ რიგს ემთხვევა; ფართო კონტეინერში ბმული სათაურის მარჯვნივ დგება.
 * - `split` — ორსვეტიანი (5fr | 7fr): მარცხნივ სათაური + `intro` + `action`, მარჯვნივ `children`.
 *
 * სექციის შიგნით სათაურები `h3`-ით იწყება (სათაურების ხე: h1 → h2 → h3).
 *
 * @param {object} props
 * @param {string} props.headingId
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.eyebrow]
 * @param {import('react').ReactNode} [props.lead]
 * @param {import('react').ReactNode} [props.action]
 * @param {import('react').ReactNode} [props.intro]
 * @param {boolean} [props.split=false]
 * @param {'default' | 'alt' | 'dark'} [props.tone='default']
 * @param {string} [props.className]
 * @param {import('react').ReactNode} [props.children]
 */
export default function PageSection({
  headingId,
  title,
  eyebrow,
  lead,
  action,
  intro,
  split = false,
  tone = 'default',
  className,
  children,
}) {
  const heading = <SectionHeading id={headingId} title={title} eyebrow={eyebrow} lead={lead} />;
  const actionBlock = action && <div className="mc-section__action">{action}</div>;

  return (
    <section
      aria-labelledby={headingId}
      className={cx('mc-section', tone !== 'default' && `mc-section--${tone}`, className)}
    >
      <div
        className="site-container mc-section__inner"
        data-theme={tone === 'dark' ? 'dark' : undefined}
      >
        {split ? (
          <div className="mc-section__split">
            <div className="mc-section__intro">
              {heading}
              {intro}
              {actionBlock}
            </div>
            <div className="mc-section__aside">{children}</div>
          </div>
        ) : (
          <>
            <div className={cx('mc-section__head', action && 'mc-section__head--split')}>
              {heading}
              {actionBlock}
            </div>
            {children}
          </>
        )}
      </div>
    </section>
  );
}

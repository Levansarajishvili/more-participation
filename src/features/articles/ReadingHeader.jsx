import { Link } from 'react-router';

import { Breadcrumbs } from '@/components/ui/index.js';

import './reading.css';

/**
 * სტატიისა და სიახლის გვერდის თავი (F6 — დაფა არ არის, ტიპოგრაფიის წესით): ბილიკი, კატეგორია
 * (ბმული ფილტრიან სიაზე), h1, მოკლე აღწერა, მეტა (ავტორი, `<time>`, კითხვის დრო) და მოქმედებები
 * (მოსმენა, გაზიარება, შენახვა). h1 ყველა მდგომარეობაში ერთი კვანძია (`headingRef`) —
 * `useHeadingRefocus` ჩატვირთვის შემდეგ ფოკუსს მასზე აბრუნებს (`data-heading-scope` — თავის საზღვარი).
 * `<div>` და არა `<header>`: `<main>`-ის შიგნით header-ს ზოგი ხელსაწყო banner-ად ითვლის (F4-ის წესი).
 *
 * @param {object} props
 * @param {{ to?: string, label: string }[]} props.breadcrumbs
 * @param {import('react').RefObject<HTMLHeadingElement | null>} props.headingRef
 * @param {string} props.headingId
 * @param {import('react').ReactNode} props.title
 * @param {{ to: string, label: string } | null} [props.category]
 * @param {import('react').ReactNode} [props.lead]
 * @param {import('react').ReactNode} [props.meta]
 * @param {import('react').ReactNode} [props.tools]
 * @param {string} [props.toolsLabel]
 * @param {import('react').ReactNode} [props.children]   შეცდომა / „ვერ მოიძებნა“ / ჩონჩხი
 */
export default function ReadingHeader({
  breadcrumbs,
  headingRef,
  headingId,
  title,
  category,
  lead,
  meta,
  tools,
  toolsLabel,
  children,
}) {
  return (
    <div className="site-container mc-reading__header" data-heading-scope="">
      <div className="mc-reading__column">
        <Breadcrumbs items={breadcrumbs} />
        <h1 ref={headingRef} id={headingId} className="mc-reading__title">
          {title}
        </h1>
        {category && (
          <p className="mc-reading__category">
            <Link to={category.to}>{category.label}</Link>
          </p>
        )}
        {lead && <p className="mc-lead mc-reading__lead">{lead}</p>}
        {meta && <div className="mc-reading__meta">{meta}</div>}
        {tools && (
          <div role="group" aria-label={toolsLabel} className="mc-reading__tools">
            {tools}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

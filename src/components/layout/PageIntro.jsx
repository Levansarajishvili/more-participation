import { cx } from '@/components/ui/utils.js';

/**
 * გვერდის ღია თავი (F6; ArticlesPage, NewsPage, ContactPage დაფები): გვერდის ფონზე, მუქი ზოლისა და
 * ორბიტის გარეშე — ბილიკი, h1 (64 → 40), lead (≤ 820px) და გვერდის საკუთარი ელემენტები (ძიება,
 * ფილტრები). `<section aria-labelledby>` h1-ზე, როგორც PageHero-ში (F5).
 *
 * `<h1>` გვერდმა თავად უნდა დახატოს `children`-ში, `id={headingId}`-ით (სტატიის გვერდს h1-ზე
 * ref სჭირდება — ჩატვირთვის შემდეგ ფოკუსი).
 *
 * @param {object} props
 * @param {string} props.headingId
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 */
export default function PageIntro({ headingId, children, className }) {
  return (
    <section aria-labelledby={headingId} className={cx('mc-page-intro', className)}>
      <div className="site-container mc-page-intro__inner">{children}</div>
    </section>
  );
}

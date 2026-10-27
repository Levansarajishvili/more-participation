import { cx } from '@/components/ui/utils.js';

/**
 * გვერდის ჰერო (F5; HomePage, HomeMobile, AboutPage დაფები): მუქი ზოლი, დეკორატიული ორბიტა,
 * ორი სვეტი 7fr | 5fr (კონტეინერი ≥ 60rem; ვიწროზე ერთმანეთის ქვეშ).
 *
 * ფონი ძირეული თემის `--mc-hero` (ღია #0B2545, მუქი #030B16, კონტრასტი #000000); ტექსტის სვეტი
 * `data-theme="dark"` ქვეხეა — #EAF0F7 13.41:1, მეორეული #B8C7D9 8.95:1, ბმული #8EC5FF 8.49:1
 * (ღია თემაში, #0B2545-ზე). `aside` ძირეულ თემაში რჩება (თეთრი ბარათი ლურჯზე — HomePage დაფა)
 * ან `asideTheme="dark"`-ით ქვეხეში გადადის (ფოტოების ჩანაცვლების ჩარჩოები — AboutPage).
 * ორბიტა: რგოლი `--mc-line` (#2B4A70), რკალი `--mc-graphic` (#FF8A4C); კონტრასტის თემაში არ ჩანს.
 * CSS-ის ფსევდოელემენტებია (mask) და არა inline SVG: SVG-ის ფორმები axe-ს ფონის დადგენაში
 * ხელს უშლიდა („partially overlaps“) ჰეროს ბარათსა და ფოტოებზე.
 *
 * `<h1>` გვერდმა თავად უნდა დახატოს `children`-ში, `id={headingId}`-ით.
 *
 * @param {object} props
 * @param {string} props.headingId
 * @param {import('react').ReactNode} props.children    ტექსტის სვეტი (h1, lead, მოქმედებები)
 * @param {import('react').ReactNode} [props.aside]
 * @param {'root' | 'dark'} [props.asideTheme='root']
 * @param {string} [props.className]
 */
export default function PageHero({ headingId, children, aside, asideTheme = 'root', className }) {
  return (
    <section aria-labelledby={headingId} className={cx('mc-page-hero', className)}>
      <div className="mc-orbit" data-theme="dark" aria-hidden="true" />
      <div className="site-container mc-page-hero__inner">
        <div className={cx('mc-page-hero__grid', !aside && 'mc-page-hero__grid--single')}>
          <div className="mc-page-hero__intro" data-theme="dark">
            {children}
          </div>
          {aside && (
            <div
              className="mc-page-hero__aside"
              data-theme={asideTheme === 'dark' ? 'dark' : undefined}
            >
              {aside}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

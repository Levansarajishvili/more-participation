import { Accordion, Button, ContentState, Skeleton } from '@/components/ui/index.js';
import { Slider } from '@/components/media/index.js';
import { cx } from '@/components/ui/utils.js';
import { label, SERIES_TOPIC_TERMS } from '@/content/taxonomy.js';
import ShareButton from '@/features/articles/ShareButton.jsx';
import { formatFileSize, t } from '@/i18n/index.js';

import { seriesHref } from './series-links.js';

/** @typedef {import('@/content/model.js').Series} Series */
/** @typedef {import('@/content/model.js').Slide} Slide */

export const DECK_HEADING_ID = 'deck-title';

/**
 * PDF-ის ბმული ზომით („PDF-ის გადმოწერა (PDF, 240 KB)“). ფაილი ატვირთულია (F2 ღია საკითხი 5 —
 * გადაწყვეტილება F7: ატვირთული ფაილი, `DocumentFile.size`); ზომა უცნობია → `[00 KB]`; ფაილი არ არის →
 * მიუწვდომელი მოქმედება „PDF მზადდება“ (ფოკუსს იღებს, მიზეზი ხილულია).
 * @param {{ pdf: Series['pdf'] }} props
 */
export function PdfButton({ pdf }) {
  const size = formatFileSize(pdf?.size) || t('development.pdfSizeUnknown');
  const content = (
    <>
      {t('development.downloadPdf')}{' '}
      <span className="mc-deck__file">{t('development.pdfMeta', { size })}</span>
    </>
  );
  if (!pdf?.src) {
    return (
      <Button variant="cta" icon="download" disabled disabledReason={t('development.pdfPending')}>
        {content}
      </Button>
    );
  }
  return (
    <Button variant="cta" icon="download" href={pdf.src} download>
      {content}
    </Button>
  );
}

/**
 * ტექსტური ვერსია (prompt: ყველა სლაიდი `<ol>`-ად, მარტივი ენით): სათაური + `plain`.
 * @param {{ slides: Slide[] }} props
 */
export function TextVersion({ slides }) {
  return (
    <div className="mc-text-version">
      <p className="mc-text-version__lead">{t('development.textVersionLead')}</p>
      <ol className="mc-text-version__list">
        {slides.map((slide) => (
          <li key={slide.id}>
            <strong>{slide.title}</strong> — {slide.plain}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * სლაიდერში არჩეული სერია (SlidesPage დაფა): წარწერა (რჩეული / თემა), h2, აღწერა, რაოდენობები →
 * სლაიდერი → PDF და გაზიარება → „ტექსტური ვერსია“ (აკორდეონი, h3).
 *
 * h2 ერთი DOM-კვანძია ყველა მდგომარეობაში (ჩატვირთვა → სათაური / „ვერ მოიძებნა“), რომ სერიის
 * შეცვლისას (`?series=`) გვერდმა ფოკუსი მასზე გადაიტანოს (`tabIndex={-1}`, რგოლის გარეშე).
 * განლაგება: კონტეინერი ≥ 60rem — სლაიდერი მარცხნივ (620px), ინფორმაცია მარჯვნივ; ვიწროზე
 * ერთმანეთის ქვეშ. DOM: სათაური → სლაიდერი → მოქმედებები (Tab-ის რიგი = ვიზუალური).
 *
 * @param {object} props
 * @param {{ status: 'idle' | 'loading' | 'success' | 'error', data?: Series, error?: import('@/content/errors.js').ContentError | null, reload?: () => void }} props.state
 * @param {boolean} [props.empty=false]          სერია საერთოდ არ არის
 * @param {string | null} [props.handle]         `SiteSettings.socialHandle`
 * @param {import('react').RefObject<HTMLHeadingElement | null>} props.headingRef
 */
export default function SeriesDeck({ state, empty = false, handle, headingRef }) {
  const series = state.status === 'success' ? state.data : undefined;
  const notFound = state.status === 'error' && state.error?.code === 'not-found';

  let title = t('development.loadingTitle');
  if (series) title = series.title;
  else if (empty) title = t('development.featured');
  else if (notFound) title = t('development.notFoundTitle');
  else if (state.status === 'error') title = t('development.errorTitle');

  const term = series ? SERIES_TOPIC_TERMS[series.topic] : undefined;
  // „idle“ — სიის პასუხს ველოდებით (რჩეული ჯერ უცნობია); სერია არ არის → ცარიელი მდგომარეობა
  let stateStatus = state.status;
  if (empty) stateStatus = 'success';
  else if (state.status === 'idle') stateStatus = 'loading';

  let body;
  if (series) {
    body = (
      <>
        <Slider
          key={series.slug}
          slides={series.slides}
          title={series.title}
          tone={series.tone}
          handle={handle}
          className="mc-deck__slider"
        />
        <div role="group" aria-label={t('development.tools')} className="mc-deck__tools">
          <PdfButton pdf={series.pdf} />
          <ShareButton
            title={series.title}
            fieldLabel={t('development.shareLabel')}
            path={seriesHref(series.slug)}
          />
        </div>
        <Accordion
          className="mc-deck__text"
          items={[
            {
              id: `text-${series.slug}`,
              title: t('development.textVersion'),
              content: <TextVersion slides={series.slides} />,
            },
          ]}
        />
      </>
    );
  } else if (notFound) {
    body = (
      <div className="mc-deck__fallback">
        <p className="mc-lead">{t('development.notFoundText')}</p>
        <Button variant="primary" to="/development">
          {t('development.backToFeatured')}
        </Button>
      </div>
    );
  } else {
    body = (
      <ContentState
        status={stateStatus}
        error={state.error ?? null}
        onRetry={() => state.reload?.()}
        label={t('development.featured')}
        skeleton={<Skeleton variant="card" ratio="1:1" />}
        empty={empty}
        emptyText={t('development.seriesEmpty')}
        className="mc-deck__fallback"
      >
        {() => null}
      </ContentState>
    );
  }

  return (
    <section aria-labelledby={DECK_HEADING_ID} className="mc-section mc-section--tight">
      <div className="site-container mc-section__inner">
        <div className={cx('mc-deck', series && 'mc-deck--ready')}>
          <div className="mc-deck__head">
            {series && (
              <p className="mc-deck__eyebrow">
                {series.featured ? (
                  t('development.featured')
                ) : (
                  <>
                    {label('seriesTopic', series.topic)}
                    {term && (
                      <>
                        {' ('}
                        <span lang={term.lang}>{term.text}</span>)
                      </>
                    )}
                  </>
                )}
              </p>
            )}
            <h2
              id={DECK_HEADING_ID}
              ref={headingRef}
              tabIndex={-1}
              data-route-focus=""
              className="mc-deck__title"
            >
              {title}
            </h2>
            {series && <p className="mc-deck__lead">{series.excerpt}</p>}
            {series && (
              <ul className="mc-pills" role="list">
                <li>{t('development.slideCount', { count: series.slides.length })}</li>
                <li>{t('development.minutes', { minutes: series.readingMinutes })}</li>
                <li>{t('development.plainVersion')}</li>
              </ul>
            )}
          </div>
          {body}
        </div>
      </div>
    </section>
  );
}

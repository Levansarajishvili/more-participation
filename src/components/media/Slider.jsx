import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';

import { Button, LiveRegion, Logo, VisuallyHidden } from '@/components/ui/index.js';
import { cx } from '@/components/ui/utils.js';
import { t } from '@/i18n/index.js';

import { useSwipe } from './useSwipe.js';

import './media.css';

/** @typedef {import('@/content/model.js').Slide} Slide */
/** @typedef {import('@/content/taxonomy.js').SeriesTone} SeriesTone */

/** ლოგო ყდის ფონზე (LogoSynergy: მუქზე — ინვერსიული; ნარინჯისფერზე ფერადი ნაჭერი ერწყმის). */
const LOGO_TONE = /** @type {const} */ ({
  navy: 'inverse',
  'navy-deep': 'inverse',
  petrol: 'inverse',
  orange: 'mono',
  alt: 'color',
});

/** @param {number} n */
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * სლაიდერი — WAI-ARIA APG carousel, ავტოდაკვრის გარეშე (ამიტომ „გაჩერება“ ღილაკი არ არის).
 *
 * - `<section aria-roledescription="კარუსელი" aria-label="სლაიდები: {სერია}">`;
 * - სლაიდი `role="group" aria-roledescription="სლაიდი" aria-label="3 / 6"` — ცოცხალი ტექსტი
 *   (სათაური 46/1.12, ტექსტი 24/1.45, ნომერი 84), არა სურათი; DOM-ში მხოლოდ მიმდინარეა;
 * - „წინა“ / „შემდეგი“ 44px (`aria-disabled` ბოლოებში — ფოკუსი არ იკარგება), წერტილები — ღილაკები
 *   `aria-current`-ით (44 × 44, აქტიური 12 → 28px);
 * - ← → Home End მხოლოდ მაშინ, როცა ფოკუსი სლაიდერშია; ფოკუსი წერტილზე იყო → ახალ წერტილზე გადადის;
 * - მრიცხველი `aria-live="polite"` („სლაიდი 3 / 6: {სათაური}“) — მხოლოდ ცვლილებაზე ისმის;
 * - გასმა pointer event-ებით, ღილაკები რჩება;
 * - გადასვლა: ქრობა + 8px ძვრა, 240ms (reduced-motion — მყისიერად).
 *
 * ყდა თემით არ იცვლება (`tone` — ფიქსირებული წყვილები, §2); მუქ და კონტრასტის თემაში 2px ჩარჩო.
 * პროპორცია: `auto` — 1:1, ვიწრო კონტეინერში (< 30rem) 4:5; 1:1 მინიმუმია — 200%-იან შრიფტზე
 * სლაიდი იზრდება და ტექსტი არ იჭრება.
 *
 * სხვა სერია = ახალი სლაიდერი (`key={series.slug}`).
 *
 * @param {object} props
 * @param {Slide[]} props.slides
 * @param {string} props.title                 სერიის სახელი (რეგიონის სახელი)
 * @param {SeriesTone} [props.tone='navy']
 * @param {string | null} [props.handle]       სოციალური ქსელის სახელი სლაიდის ქვედა ზოლში
 * @param {'auto' | '1:1' | '4:5'} [props.ratio='auto']
 * @param {number} [props.initialIndex=0]
 * @param {(index: number) => void} [props.onChange]
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']  სლაიდის სათაური
 * @param {string} [props.className]
 */
export default function Slider({
  slides,
  title,
  tone = 'navy',
  handle,
  ratio = 'auto',
  initialIndex = 0,
  onChange,
  headingLevel: Heading = 'h3',
  className,
}) {
  const total = slides.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), total - 1));
  const [direction, setDirection] = useState(/** @type {'next' | 'prev' | null} */ (null));
  const rootRef = useRef(/** @type {HTMLElement | null} */ (null));
  const dotRefs = useRef(/** @type {(HTMLButtonElement | null)[]} */ ([]));
  const focusDot = useRef(false);
  const slideId = `${useId()}-slide`;

  /** @param {number} next */
  const go = (next) => {
    if (next < 0 || next >= total || next === index) return;
    setDirection(next > index ? 'next' : 'prev');
    setIndex(next);
    onChange?.(next);
  };
  const swipe = useSwipe({ onPrev: () => go(index - 1), onNext: () => go(index + 1) });

  // კლავიატურა: მოვლენა სლაიდერის შიგნიდან უნდა მოდიოდეს (APG)
  const onKey = useEffectEvent((/** @type {KeyboardEvent} */ event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    /** @type {Record<string, number>} */
    const targets = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: total - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    focusDot.current = dotRefs.current.includes(
      /** @type {HTMLButtonElement} */ (document.activeElement),
    );
    go(Math.min(Math.max(targets[event.key], 0), total - 1));
  });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    /** @param {KeyboardEvent} event */
    const onKeyDown = (event) => onKey(event);
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => {
    if (!focusDot.current) return;
    focusDot.current = false;
    dotRefs.current[index]?.focus();
  }, [index]);

  const slide = slides[index];
  if (!slide) return null;
  const atStart = index === 0;
  const atEnd = index === total - 1;

  return (
    <section
      ref={rootRef}
      aria-roledescription={t('development.carousel')}
      aria-label={t('development.sliderLabel', { title })}
      className={cx('mc-slider', className)}
    >
      <div className="mc-slider__viewport" {...swipe}>
        <div
          key={slide.id}
          id={slideId}
          role="group"
          aria-roledescription={t('development.slideRole')}
          aria-label={t('development.slideOf', { index: index + 1, total })}
          data-kind={slide.kind}
          className={cx(
            'mc-slide',
            `mc-tone--${tone}`,
            `mc-slide--ratio-${ratio === '4:5' ? 'tall' : ratio === '1:1' ? 'square' : 'auto'}`,
            direction && `mc-slide--from-${direction}`,
          )}
        >
          <span className="mc-slide__deco" aria-hidden="true" />
          <div className="mc-slide__brand" aria-hidden="true">
            <Logo layout="mark" tone={LOGO_TONE[tone]} size={40} decorative />
            <span>{t('meta.siteName')}</span>
          </div>
          <div className="mc-slide__content">
            <p className="mc-slide__kicker">{t(`development.kicker.${slide.kind}`)}</p>
            {slide.number != null && <p className="mc-slide__num">{pad2(slide.number)}</p>}
            <Heading className="mc-slide__title">{slide.title}</Heading>
            <p className="mc-slide__body">{slide.body}</p>
          </div>
          <div className="mc-slide__foot" aria-hidden="true">
            <span>{handle}</span>
            <span>{t('development.slideOf', { index: index + 1, total })}</span>
          </div>
        </div>
      </div>

      <div className="mc-slider__controls">
        <Button
          variant="secondary"
          size="sm"
          icon="chevron-left"
          aria-controls={slideId}
          aria-disabled={atStart ? 'true' : undefined}
          onClick={() => go(index - 1)}
          className="mc-slider__prev"
        >
          {t('development.prevSlide')} <VisuallyHidden>{t('development.slideWord')}</VisuallyHidden>
        </Button>
        <LiveRegion as="p" visible className="mc-slider__status">
          {t('development.slide', { index: index + 1, total })}
          <VisuallyHidden>: {slide.title}</VisuallyHidden>
        </LiveRegion>
        <Button
          variant="primary"
          size="sm"
          iconEnd="chevron-right"
          aria-controls={slideId}
          aria-disabled={atEnd ? 'true' : undefined}
          onClick={() => go(index + 1)}
          className="mc-slider__next"
        >
          {t('development.nextSlide')} <VisuallyHidden>{t('development.slideWord')}</VisuallyHidden>
        </Button>
      </div>
      <div role="group" aria-label={t('development.dotsLabel')} className="mc-slider__dots">
        {slides.map((item, i) => (
          <button
            key={item.id}
            ref={(node) => {
              dotRefs.current[i] = node;
            }}
            type="button"
            className="mc-slider__dot"
            aria-label={t('development.dotTitle', { index: i + 1, title: item.title })}
            aria-current={i === index ? 'true' : undefined}
            aria-controls={slideId}
            onClick={() => go(i)}
          >
            <span className="mc-slider__pip" aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className="mc-slider__hint">{t('development.keyboardHint')}</p>
    </section>
  );
}

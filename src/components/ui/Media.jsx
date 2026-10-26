import { t } from '@/i18n/index.js';

import { cx } from './utils.js';

/**
 * @typedef {import('@/content/model.js').Image} Image
 * @typedef {import('@/content/model.js').Ratio} Ratio
 * @typedef {'photo' | 'poster' | 'logo' | 'portrait'} MediaKind
 */

/** „[მონაწილე …]“ → „მონაწილე …“ — mock-ის alt უკვე ფრჩხილებშია. */
const unbracket = (text = '') => text.replace(/^\[([\s\S]*)\]$/, '$1');

/**
 * სურათი ფიქსირებული პროპორციით (CLS არ ხდება). `src: null` — ფაილი ჯერ არ არის: იხატება
 * წყვეტილი ჩარჩო ტექსტით „[ფოტო: …]“, ყალბი სურათი ან გატეხილი `<img>` — არასოდეს.
 * ჩანაცვლების ჩარჩოს ეკრანის მკითხველი alt-ით კითხულობს (`role="img"`).
 *
 * @param {object} props
 * @param {Image | null} [props.image]
 * @param {Ratio} [props.ratio]              ნაგულისხმევი: image.ratio, შემდეგ 3:2
 * @param {MediaKind} [props.kind='photo']   ჩანაცვლების წარწერისთვის
 * @param {'cover' | 'contain'} [props.fit='cover']
 * @param {boolean} [props.decorative=false]  alt="" (სურათი ტექსტს იმეორებს, მაგ. პარტნიორის ლოგო სახელთან)
 * @param {boolean} [props.round=false]       წრე (გუნდის ფოტო, 1:1)
 * @param {'lazy' | 'eager'} [props.loading='lazy']
 * @param {string} [props.className]
 */
export default function Media({
  image,
  ratio,
  kind = 'photo',
  fit = 'cover',
  decorative = false,
  round = false,
  loading = 'lazy',
  className,
}) {
  const value = ratio ?? image?.ratio ?? '3:2';
  const style = { aspectRatio: value.replace(':', ' / ') };
  const alt = decorative ? '' : (image?.alt ?? '');
  const classes = cx('mc-media', round && 'mc-media--round', className);

  if (!image?.src) {
    const kindLabel = t(`media.${kind}`);
    const description = unbracket(image?.alt) || t('common.assetPending');
    // „[ვიდეოს კადრი: ვიდეოს კადრი: …]“ არ მეორდება; პატარა წრეში მხოლოდ ტიპი ჩანს
    let label = t('media.placeholder', { kind: kindLabel, alt: description });
    if (description.startsWith(`${kindLabel}:`)) label = `[${description}]`;
    if (round) label = `[${kindLabel}]`;
    const a11y = alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true };
    return (
      <div className={cx(classes, 'mc-media--placeholder')} style={style} {...a11y}>
        <span aria-hidden="true">{label}</span>
      </div>
    );
  }

  return (
    <div className={classes} style={style}>
      <img
        src={image.src}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={loading}
        decoding="async"
        className={cx('mc-media__img', fit === 'contain' && 'mc-media__img--contain')}
      />
    </div>
  );
}

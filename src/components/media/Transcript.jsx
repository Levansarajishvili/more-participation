import { useId } from 'react';

import { cx } from '@/components/ui/utils.js';
import { formatDuration, t } from '@/i18n/index.js';

import { currentLineIndex, durationAttribute } from './transcript-utils.js';

/** @typedef {import('@/content/model.js').TranscriptLine} TranscriptLine */

/**
 * ტრანსკრიპტი დროის ნიშნულებით (VideosPage დაფა): `<section>` + სათაური + `<ol>`. ნიშნული — ღილაკი
 * („გადასვლა: 01:23“; ხილული ტექსტი სახელშია), რომელიც ვიდეოს იმ წამზე გადაიყვანს; ფაილის გარეშე
 * (`onSeek` არ არის) — უბრალო `<time>`. აუდიოაღწერის სტრიქონს „აუდიოაღწერა:“ წინსართი აქვს —
 * ფერით არ განსხვავდება. მიმდინარე სტრიქონი — `aria-current` + 4px ink-ის ხაზი და მუქი ნიშნული.
 *
 * @param {object} props
 * @param {string} props.id
 * @param {TranscriptLine[]} props.lines
 * @param {number} [props.currentTime=0]
 * @param {boolean} [props.highlight=false]     დაკვრა დაიწყო
 * @param {((seconds: number) => void) | null} [props.onSeek]
 * @param {boolean} [props.hidden=false]
 * @param {'h2' | 'h3' | 'h4'} [props.headingLevel='h3']
 * @param {string} [props.className]
 */
export default function Transcript({
  id,
  lines,
  currentTime = 0,
  highlight = false,
  onSeek = null,
  hidden = false,
  headingLevel: Heading = 'h3',
  className,
}) {
  const headingId = useId();
  const current = highlight ? currentLineIndex(lines, currentTime) : -1;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      hidden={hidden}
      className={cx('mc-transcript', className)}
    >
      <Heading id={headingId} className="mc-transcript__title">
        {t('player.transcriptTitle')}
      </Heading>
      <p className="mc-transcript__hint">
        {onSeek ? t('player.transcriptHint') : t('player.transcriptPendingHint')}
      </p>
      <ol className="mc-transcript__list" role="list">
        {lines.map((line, i) => {
          const time = (
            <time dateTime={durationAttribute(line.start)}>{formatDuration(line.start)}</time>
          );
          return (
            <li
              key={`${line.start}-${i}`}
              className={cx(
                'mc-transcript__line',
                line.kind === 'description' && 'mc-transcript__line--description',
              )}
              aria-current={i === current ? 'true' : undefined}
            >
              {onSeek ? (
                <button
                  type="button"
                  className="mc-transcript__time"
                  aria-label={t('player.jumpTo', { time: formatDuration(line.start) })}
                  onClick={() => onSeek(line.start)}
                >
                  {time}
                </button>
              ) : (
                <span className="mc-transcript__time">{time}</span>
              )}
              <p className="mc-transcript__text">
                {line.kind === 'description' ? (
                  <strong className="mc-transcript__prefix">
                    {t('player.descriptionPrefix')}{' '}
                  </strong>
                ) : (
                  line.speaker && (
                    <strong className="mc-transcript__prefix">
                      {t('player.speaker', { name: line.speaker })}{' '}
                    </strong>
                  )
                )}
                {line.text}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

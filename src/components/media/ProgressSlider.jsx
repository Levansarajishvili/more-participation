import { useRef, useState } from 'react';

import { cx } from '@/components/ui/utils.js';
import { formatDuration, t } from '@/i18n/index.js';

import { clamp, PAGE_STEP, SEEK_STEP } from './native-controller.js';

/**
 * ვიდეოს პროგრესი: `role="slider"` (WAI-ARIA APG slider). ხელმისაწვდომი სახელი „პროგრესი“,
 * `aria-valuetext` — „01:23 / 04:56“. კლავიატურა: ← ↓ / → ↑ — 5 წამი, PageDown / PageUp — 30 წამი,
 * Home / End — დასაწყისი / ბოლო (ფლეიერის ← →-ს არ ორმაგდება — მოვლენა აქ ჩერდება).
 * მაუსი / შეხება: დაჭერა გადაიყვანს, გადათრევა — წინასწარი ჩვენება, აშვება — seek.
 *
 * ზოლი ივსება 600ms-ით (§7), გადათრევისას და reduced-motion-ში — მყისიერად.
 * სამიზნე 44px სიმაღლისაა (ზოლი 8px, ბურთულა 20px).
 *
 * @param {object} props
 * @param {number} props.currentTime
 * @param {number} props.duration
 * @param {(seconds: number) => void} props.onSeek
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.describedBy]
 * @param {string} [props.className]
 */
export default function ProgressSlider({
  currentTime,
  duration,
  onSeek,
  disabled = false,
  describedBy,
  className,
}) {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [scrub, setScrub] = useState(/** @type {number | null} */ (null));
  const value = clamp(scrub ?? currentTime, 0, duration || 0);
  const ratio = duration > 0 ? value / duration : 0;

  /** @param {number} clientX */
  const fromPointer = (clientX) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * duration;
  };

  /** @param {import('react').KeyboardEvent<HTMLDivElement>} event */
  const onKeyDown = (event) => {
    if (disabled) return;
    /** @type {Record<string, number>} */
    const targets = {
      ArrowLeft: value - SEEK_STEP,
      ArrowDown: value - SEEK_STEP,
      ArrowRight: value + SEEK_STEP,
      ArrowUp: value + SEEK_STEP,
      PageDown: value - PAGE_STEP,
      PageUp: value + PAGE_STEP,
      Home: 0,
      End: duration,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    event.stopPropagation();
    onSeek(clamp(targets[event.key], 0, duration));
  };

  /** @param {import('react').PointerEvent<HTMLDivElement>} event */
  const onPointerDown = (event) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const next = fromPointer(event.clientX);
    setScrub(next);
    onSeek(next);
  };
  /** @param {import('react').PointerEvent<HTMLDivElement>} event */
  const onPointerMove = (event) => {
    if (scrub === null) return;
    setScrub(fromPointer(event.clientX));
  };
  /** @param {import('react').PointerEvent<HTMLDivElement>} event */
  const onPointerUp = (event) => {
    if (scrub === null) return;
    onSeek(fromPointer(event.clientX));
    setScrub(null);
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={t('player.progress')}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(value)}
      aria-valuetext={t('player.time', {
        current: formatDuration(value),
        total: formatDuration(duration),
      })}
      aria-disabled={disabled || undefined}
      aria-describedby={describedBy}
      data-scrubbing={scrub !== null || undefined}
      className={cx('mc-progress', className)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setScrub(null)}
    >
      <span className="mc-progress__track" aria-hidden="true">
        <span className="mc-progress__fill" style={{ transform: `scaleX(${ratio})` }} />
      </span>
      <span
        className="mc-progress__thumb"
        aria-hidden="true"
        style={{ insetInlineStart: `${ratio * 100}%` }}
      />
    </div>
  );
}

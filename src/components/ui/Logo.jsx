import { useEffect } from 'react';

import Mark3d from '@/assets/logo/mark-3d.svg?react';
import Mark3dInverse from '@/assets/logo/mark-3d-inverse.svg?react';
import MarkFlat from '@/assets/logo/mark-flat.svg?react';
import MarkFlatInverse from '@/assets/logo/mark-flat-inverse.svg?react';
import MarkMono from '@/assets/logo/mark-mono.svg?react';
import MarkTiny from '@/assets/logo/mark-tiny.svg?react';
import MarkTinyInverse from '@/assets/logo/mark-tiny-inverse.svg?react';
import WordmarkHorizontal from '@/assets/logo/wordmark-horizontal.svg?react';
import WordmarkVertical from '@/assets/logo/wordmark-vertical.svg?react';
import { t } from '@/i18n/index.js';

import {
  LOCKUP,
  LOGO_DEFAULT_SIZE,
  LOGO_MIN_WIDTH,
  logoDetail,
  logoMetrics,
} from './logo-geometry.js';
import { cx } from './utils.js';

/**
 * @typedef {'horizontal' | 'vertical' | 'mark'} LogoLayout
 * @typedef {'color' | 'mono' | 'inverse'} LogoTone
 */

const MARKS = {
  color: { '3d': Mark3d, flat: MarkFlat, tiny: MarkTiny },
  inverse: { '3d': Mark3dInverse, flat: MarkFlatInverse, tiny: MarkTinyInverse },
  mono: { '3d': MarkMono, flat: MarkMono, tiny: MarkMono },
};
const WORDMARKS = { horizontal: WordmarkHorizontal, vertical: WordmarkVertical };

/** სიტყვიერი ნიშნის ფერები (ფაილში ნაგულისხმევია ფერადი: #0B2545 / #A8430C). */
const WORDMARK_TONE = {
  color: {},
  // LogoSynergy-ის ინვერსიული ლოკაპი
  inverse: { '--mc-logo-name': '#FFFFFF', '--mc-logo-descriptor': '#FFB81C' },
  mono: { '--mc-logo-name': 'currentColor', '--mc-logo-descriptor': 'currentColor' },
};

/**
 * ლოგო — მხოლოდ საბოლოო ნიშანი „ერთად · სინერგია“, `src/assets/logo/`-ის SVG-ებიდან (svgr).
 * ლოკაპი ერთ `<svg>`-ში ეწყობა: ნიშანი + სიტყვიერი ნიშანი (ჩადგმული svg-ები, `logo-geometry.js`).
 *
 * დეტალი ზომით ირჩევა: ნიშანი ≥ 48px — 3D; 24–47px — ბრტყელი; < 24px — favicon-ის ვერსია.
 * მინიმალურ ზომაზე ნაკლებისას (ნიშანი 24, ჰორიზონტალური 160, ვერტიკალური 120 px სიგანე)
 * dev-ში console.warn. მუქ ჰედერსა და ფუტერში — `tone="inverse"`; კონტრასტის თემაში — `mono`.
 *
 * @param {object} props
 * @param {LogoLayout} [props.layout='horizontal']
 * @param {LogoTone} [props.tone='color']
 * @param {number} [props.size]            სიმაღლე px-ში; ნაგულისხმევი: mark 48, horizontal 56, vertical 160
 * @param {string} [props.label]           ხელმისაწვდომი სახელი; ნაგულისხმევი — ორგანიზაციის სახელი
 * @param {boolean} [props.decorative=false]  aria-hidden (სახელი უკვე ტექსტადაა გვერდით)
 * @param {string} [props.knockout]        mono: ნაჭრებს შორის ღრეჩოს ფერი = ლოგოს ქვეშ მყოფი ფონი
 *                                         (ნაგულისხმევი `var(--mc-bg)`; ბარათზე — `var(--mc-surface)`)
 * @param {string} [props.className]
 */
export default function Logo({
  layout = 'horizontal',
  tone = 'color',
  size,
  label,
  decorative = false,
  knockout,
  className,
  ...rest
}) {
  const height = size ?? LOGO_DEFAULT_SIZE[layout];
  const { width, markPx } = logoMetrics(layout, height);
  const detail = logoDetail(markPx);
  const Mark = MARKS[tone][detail];

  useEffect(() => {
    if (import.meta.env.DEV && width < LOGO_MIN_WIDTH[layout] - 0.5) {
      console.warn(
        `[Logo] ${layout}: ${Math.round(width)}px < მინიმუმი ${LOGO_MIN_WIDTH[layout]}px (სიგანე)`,
      );
    }
  }, [layout, width]);

  const name = label ?? (layout === 'mark' ? t('meta.siteName') : t('meta.fullName'));
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name };
  const style = {
    ...WORDMARK_TONE[tone],
    ...(tone === 'mono' ? { '--mc-logo-knockout': knockout ?? 'var(--mc-bg)' } : {}),
  };
  const classes = cx('mc-logo', className);

  if (layout === 'mark') {
    return (
      <Mark
        width={width}
        height={height}
        focusable="false"
        className={classes}
        style={style}
        data-detail={detail}
        {...a11y}
        {...rest}
      />
    );
  }

  const geometry = LOCKUP[layout];
  const Wordmark = WORDMARKS[layout];
  return (
    <svg
      viewBox={geometry.viewBox.join(' ')}
      width={Math.round(width * 100) / 100}
      height={height}
      focusable="false"
      className={classes}
      style={style}
      data-detail={detail}
      {...a11y}
      {...rest}
    >
      <Mark
        x={geometry.mark.x}
        y={geometry.mark.y}
        width={geometry.mark.size}
        height={geometry.mark.size}
      />
      <Wordmark {...geometry.wordmark} />
    </svg>
  );
}

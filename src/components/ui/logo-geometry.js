/**
 * ლოგოს „ერთად · სინერგია“ ბადე. წყარო — LogoSynergy დაფა (კანვა, project-context §4, §8).
 *
 * ნიშნის ბადე 240 × 240 (დაფის viewBox). ლოკაპში ნიშანი 240-ის ბადით, × 0.63 = 151.2 ერთეული
 * (დაფა: `translate(6 34.5) scale(0.63)`). ლოკაპის viewBox მელნის საზღვრამდეა შეკუმშული
 * (დაფაზე 773 × 220 ცარიელი კიდეებით იყო), ამიტომ `size` = ლოგოს ხილული სიმაღლე.
 * ვერტიკალური ლოკაპი დაფაზე არ არის: აწყობილია დაფის ნიშნითა და გლიფების კონტურებით,
 * LogoSystem-ის ვერტიკალური განლაგებით (ნიშანი, „მეტი / ჩართულობა“, დესკრიპტორი ორ სტრიქონად).
 */

/** @typedef {[number, number, number, number]} ViewBox */
/** @typedef {{ viewBox: ViewBox, mark: { x: number, y: number, size: number }, wordmark: { x: number, y: number, width: number, height: number } }} LockupGeometry */

/** @type {Record<'horizontal' | 'vertical', LockupGeometry>} */
export const LOCKUP = Object.freeze({
  horizontal: {
    viewBox: [16.84, 42.76, 712.38, 129.69],
    mark: { x: 6, y: 34.5, size: 151.2 },
    wordmark: { x: 168, y: 60.34, width: 561.22, height: 79.66 },
  },
  vertical: {
    viewBox: [-1, 8.26, 391.65, 336.65],
    mark: { x: 119.23, y: 0, size: 151.2 },
    wordmark: { x: -1, y: 156.39, width: 391.65, height: 188.52 },
  },
});

/** ნიშნის ბადე (240) და 3D ნიშნის მელანი მასში. */
export const MARK_GRID = 240;
export const MARK_INK = Object.freeze([18.79, 14.7, 221.21, 217.39]);

/**
 * წესები (LogoSynergy, BrandKit): 3D — ნიშანი ≥ 48px; 24–47px — ბრტყელი; < 24px — მხოლოდ
 * ხუთი ნაჭერი და ჰაბი (favicon). მინიმუმი (სიგანე): ნიშანი 24px, ჰორიზონტალური 160px,
 * ვერტიკალური 120px. სუფთა სივრცე = ჰაბის რადიუსი = ნიშნის 23%.
 */
export const LOGO_3D_MIN = 48;
export const LOGO_FLAT_MIN = 24;
export const LOGO_MIN_WIDTH = Object.freeze({ mark: 24, horizontal: 160, vertical: 120 });
export const LOGO_CLEAR_SPACE = 0.23;

/** ნაგულისხმევი სიმაღლე px-ში. */
export const LOGO_DEFAULT_SIZE = Object.freeze({ mark: 48, horizontal: 56, vertical: 160 });

/**
 * @param {'horizontal' | 'vertical' | 'mark'} layout
 * @param {number} size  სიმაღლე px-ში
 * @returns {{ width: number, height: number, markPx: number }}  markPx — ნიშნის 240-იანი ბადის ზომა
 */
export function logoMetrics(layout, size) {
  if (layout === 'mark') return { width: size, height: size, markPx: size };
  const { viewBox, mark } = LOCKUP[layout];
  const scale = size / viewBox[3];
  return { width: viewBox[2] * scale, height: size, markPx: mark.size * scale };
}

/**
 * @param {number} markPx
 * @returns {'3d' | 'flat' | 'tiny'}
 */
export function logoDetail(markPx) {
  if (markPx >= LOGO_3D_MIN) return '3d';
  if (markPx >= LOGO_FLAT_MIN) return 'flat';
  return 'tiny';
}

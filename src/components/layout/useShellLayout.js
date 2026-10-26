import { useEffect, useState } from 'react';

import { usePreferences } from '@/features/a11y/usePreferences.js';

/**
 * ჰედერის მთავარი ზოლის მინიმალური შიდა სიგანე rem-ში (Chromium-ში გაზომილი, 16px, Noto Sans
 * Georgian): ნიშანი 56 + 7 პუნქტი 16px (744) + რეჟიმი და CTA (220) + შუალედები.
 * - desktop: სახელი ვიზუალურად დამალულია → 1036px ≈ 65rem (1200px ეკრანი − 2 × 80 = 1040);
 * - wide:    + სახელი 21px (178) → 1244px ≈ 78rem (1440-ზე შიგთავსი 1280).
 */
export const DESKTOP_REM = 65;
export const WIDE_REM = 78;
/** „განლაგება“ (WCAG 1.4.12: ასო 0.12em, სიტყვა 0.16em) ზოლს ≈ 20%-ით აგანიერებს. */
export const SPACING_FACTOR = 1.2;

const CONTAINER_MAX = 1440;

/**
 * @param {number} available  ზოლის შიდა სიგანე px-ში
 * @param {number} remPx      ერთი rem px-ში (ბრაუზერის შრიფტი × თავსებადობის მასშტაბი)
 * @param {boolean} spacing
 * @returns {'wide' | 'desktop' | 'compact'}
 */
export function shellLayoutFor(available, remPx, spacing) {
  const need = (/** @type {number} */ rem) => rem * remPx * (spacing ? SPACING_FACTOR : 1);
  if (available >= need(WIDE_REM)) return 'wide';
  if (available >= need(DESKTOP_REM)) return 'desktop';
  return 'compact';
}

/** ზოლის სავარაუდო შიდა სიგანე ResizeObserver-ის პირველ პასუხამდე (site-container-ის ფორმულა). */
function estimateAvailable() {
  if (typeof window === 'undefined') return CONTAINER_MAX;
  const viewport = window.innerWidth || document.documentElement.clientWidth;
  const edge = viewport >= 768 ? 80 : 20;
  return Math.min(viewport, CONTAINER_MAX) - 2 * edge;
}

/** ბრაუზერის საწყისი შრიფტი px-ში (<html>-ის ზომა გაყოფილი მიმდინარე data-size-ზე). */
function baseRemPx() {
  if (typeof window === 'undefined') return 16;
  const root = document.documentElement;
  const px = parseFloat(window.getComputedStyle(root).fontSize);
  const applied = Number(root.getAttribute('data-size')) || 100;
  return Number.isFinite(px) && px > 0 ? (px * 100) / applied : 16;
}

/**
 * ჰედერის განლაგება.
 * - `wide`    — SiteHeader დაფის სრული ზოლი (ნიშანი 56 + სახელი);
 * - `desktop` — იგივე, სახელი ვიზუალურად დამალულია (1200–1439px 100%-ზე);
 * - `compact` — ჰამბურგერი (HomeMobile დაფა).
 *
 * გადაწყვეტილება ზოლის *რეალურ* სიგანესა და rem-ზეა, არა media query-ზე: media query-ის `rem`
 * ბრაუზერის საწყისი შრიფტია და `<html data-size>`-ს არ მიჰყვება, site-container კი 1440px-ზეა
 * შეზღუდული — 125%-ზე 1920px ეკრანზეც შიგთავსი 1280px რჩება. 100%-ზე ზღვარი §10-ისაა:
 * < 1200px — ჰამბურგერი.
 *
 * @param {import('react').RefObject<HTMLElement | null>} ref  `.mc-mainbar__inner`
 * @returns {'wide' | 'desktop' | 'compact'}
 */
export function useShellLayout(ref) {
  const { fontScale, prefs } = usePreferences();
  const [available, setAvailable] = useState(estimateAvailable);

  useEffect(() => {
    const element = ref.current;
    if (element && typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
      observer.observe(element);
      return () => observer.disconnect();
    }
    // ResizeObserver-ის გარეშე (ძველი ბრაუზერი, jsdom) — ფანჯრის ზომით
    const onResize = () => setAvailable(estimateAvailable());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ref]);

  return shellLayoutFor(available, baseRemPx() * fontScale, prefs.spacing);
}

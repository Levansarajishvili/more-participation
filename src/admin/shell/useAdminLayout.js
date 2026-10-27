import { useEffect, useState } from 'react';

import { usePreferences } from '@/features/a11y/usePreferences.js';
import { SPACING_FACTOR } from '@/components/layout/useShellLayout.js';

/**
 * sidebar-ის ზღვარი: 75rem (100%-ზე 1200px). rem = `<html>`-ის ზომა, ამიტომ თავსებადობის
 * მენიუს შრიფტის მასშტაბს მიჰყვება (125%-ზე 1440px ეკრანზეც მენიუ იკეცება) — §10-ის წესი.
 */
export const ADMIN_WIDE_REM = 75;

/**
 * @param {number} width   ფანჯრის / გარსის სიგანე px-ში
 * @param {number} remPx   `<html>`-ის შრიფტი px-ში (მასშტაბის ჩათვლით)
 * @param {boolean} spacing
 * @returns {'wide' | 'compact'}
 */
export function adminLayoutFor(width, remPx, spacing) {
  return width >= ADMIN_WIDE_REM * remPx * (spacing ? SPACING_FACTOR : 1) ? 'wide' : 'compact';
}

function rootRemPx() {
  if (typeof window === 'undefined') return 16;
  const px = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(px) && px > 0 ? px : 16;
}

/**
 * @param {import('react').RefObject<HTMLElement | null>} ref  გარსის ძირი
 * @returns {'wide' | 'compact'}
 */
export function useAdminLayout(ref) {
  const { fontScale, prefs } = usePreferences();
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    const element = ref.current;
    if (element && typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
      observer.observe(element);
      return () => observer.disconnect();
    }
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ref]);

  // fontScale deps-ში: მასშტაბის შეცვლისას rem თავიდან იზომება
  void fontScale;
  return adminLayoutFor(width, rootRemPx(), prefs.spacing);
}

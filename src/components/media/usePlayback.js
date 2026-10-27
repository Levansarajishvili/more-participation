import { useContext, useEffect, useState, useSyncExternalStore } from 'react';

import { PreferencesContext } from '@/features/a11y/usePreferences.js';

import { IDLE_STATE } from './native-controller.js';

/** @typedef {import('./native-controller.js').PlaybackController} PlaybackController */
/** @typedef {import('./native-controller.js').PlaybackState} PlaybackState */

const NULL_SOURCE = {
  getState: () => IDLE_STATE,
  subscribe: () => () => {},
};

/**
 * controller-ის მდგომარეობა React-ში (useSyncExternalStore). controller-მდე — `IDLE_STATE`.
 * @param {PlaybackController | null} controller
 * @returns {PlaybackState}
 */
export function usePlayback(controller) {
  const source = controller ?? NULL_SOURCE;
  return useSyncExternalStore(source.subscribe, source.getState, source.getState);
}

/** კომპაქტური განლაგების ზღვარი rem-ში: 34rem = 544px 100%-ზე (390-ზე ფლეიერი 350px-ია). */
export const PLAYER_COMPACT_REM = 34;

/**
 * @param {number} width   ფლეიერის სიგანე px-ში
 * @param {number} remPx   ერთი rem px-ში (ბრაუზერის შრიფტი × თავსებადობის მასშტაბი)
 * @returns {'full' | 'compact'}
 */
export function playerLayoutFor(width, remPx) {
  return width < PLAYER_COMPACT_REM * remPx ? 'compact' : 'full';
}

function rootRemPx() {
  if (typeof window === 'undefined') return 16;
  const px = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(px) && px > 0 ? px : 16;
}

/** ResizeObserver-ის პირველ პასუხამდე: 390-ზე ერთი სვეტი, 1440-ზე 8 / 12 (VideosPage დაფა). */
function estimateWidth() {
  if (typeof window === 'undefined') return 800;
  const viewport = window.innerWidth || 1440;
  return viewport < 768 ? viewport - 40 : ((Math.min(viewport, 1440) - 160) * 8) / 12;
}

/**
 * ფლეიერის განლაგება მისი *რეალური* სიგანით და rem-ით (`useShellLayout`-ის პრინციპი, F4):
 * 390-ზე და 200%-იან შრიფტზე ფართო ეკრანზეც — კომპაქტური (მთავარი რიგი + „მეტი“, §10).
 * DOM-ის რიგი იცვლება, ამიტომ container query არ კმარა.
 *
 * @param {import('react').RefObject<HTMLElement | null>} ref
 * @param {'full' | 'compact'} [forced]   ტესტი / `/__kit`
 * @returns {'full' | 'compact'}
 */
export function usePlayerLayout(ref, forced) {
  // შრიფტის მასშტაბის შეცვლა სიგანეს არ ცვლის — ხელახალი რენდერი კონტექსტიდან (provider-ის გარეშეც)
  useContext(PreferencesContext);
  const [width, setWidth] = useState(estimateWidth);

  useEffect(() => {
    if (forced) return undefined;
    const element = ref.current;
    if (!element || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, forced]);

  if (forced) return forced;
  return playerLayoutFor(width, rootRemPx());
}

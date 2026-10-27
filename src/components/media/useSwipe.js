import { useRef } from 'react';

/** ჰორიზონტალური მოძრაობის მინიმუმი px-ში, რომ გასმა სლაიდს ცვლიდეს. */
export const SWIPE_MIN = 48;

/**
 * გასმა pointer event-ებით (შეხება და კალამი; მაუსით გადათრევა ტექსტის მონიშვნისთვის რჩება).
 * ვერტიკალური სქროლი არ იბლოკება (`touch-action: pan-y` CSS-ში); ღილაკები ყოველთვის რჩება
 * (WCAG 2.5.1 — ერთი წერტილის ალტერნატივა).
 *
 * @param {{ onPrev: () => void, onNext: () => void }} handlers
 */
export function useSwipe({ onPrev, onNext }) {
  const start = useRef(/** @type {{ x: number, y: number, id: number } | null} */ (null));
  return {
    /** @param {import('react').PointerEvent} event */
    onPointerDown(event) {
      if (event.pointerType === 'mouse') return;
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    },
    /** @param {import('react').PointerEvent} event */
    onPointerUp(event) {
      const from = start.current;
      start.current = null;
      if (!from || from.id !== event.pointerId) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) onNext();
      else onPrev();
    },
    onPointerCancel() {
      start.current = null;
    },
  };
}

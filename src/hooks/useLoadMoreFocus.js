import { useEffect, useRef } from 'react';

import { t } from '@/i18n/index.js';

/**
 * „მეტის ჩატვირთვის“ შემდეგ (ContentKit): ფოკუსი გადადის ახალი გვერდის პირველი ელემენტის
 * პირველ ბმულზე / ღილაკზე (ბარათის სათაური — stretched-link), სტატუსი კი „დაემატა {n}, სულ {n}“.
 * ფილტრის შეცვლისას (`firstNewIndex` = -1) ფოკუსი არ გადადის და სტატუსი ცარიელია — შედეგს
 * გვერდის რაოდენობის სტატუსი აცხადებს.
 *
 * სტატუსი რენდერში ითვლება და არა state-ით: `LiveRegion`-ის შიგთავსი ყოველ ახალ გვერდზე იცვლება
 * (რაოდენობა სხვაა), ამიტომ ეკრანის მკითხველი მას ერთხელ აცხადებს.
 *
 * @param {{ firstNewIndex: number, items: readonly unknown[] }} list   `useLoadMore`-ის შედეგი
 * @param {import('react').RefObject<HTMLElement | null>} listRef     `<ul>` / `<ol>` (`<li>` შვილებით)
 * @returns {string}  LiveRegion-ის ტექსტი
 */
export function useLoadMoreFocus(list, listRef) {
  const { firstNewIndex, items } = list;
  const handled = useRef(/** @type {string | null} */ (null));

  useEffect(() => {
    if (firstNewIndex < 0) {
      handled.current = null;
      return;
    }
    const key = `${firstNewIndex}:${items.length}`;
    if (handled.current === key) return;
    handled.current = key;
    const item = listRef.current?.children[firstNewIndex];
    const target = /** @type {HTMLElement | null | undefined} */ (
      item?.querySelector('a[href], button:not([disabled])')
    );
    target?.focus();
  }, [firstNewIndex, items.length, listRef]);

  if (firstNewIndex < 0) return '';
  return t('common.loadedMore', { added: items.length - firstNewIndex, shown: items.length });
}

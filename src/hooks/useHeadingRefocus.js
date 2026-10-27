import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * ასინქრონული გვერდის h1 (F6: სტატია, სიახლე). გადასვლისას PageShell ფოკუსს h1-ზე ათავსებს, როცა
 * ის ჯერ „იტვირთება…“-ს წერს. შიგთავსის მოსვლისას (`status` ≠ loading):
 * - hash-ის სამიზნე არსებობს (`/articles/:slug#listen`) → ფოკუსი სამიზნეზე;
 * - სხვა შემთხვევაში h1 ფოკუსს თავიდან იღებს (იგივე კვანძი, blur → focus) — ეკრანის მკითხველი
 *   ახალ სათაურს („[სტატიის სათაური]“ / „სტატია ვერ მოიძებნა“) აცხადებს.
 *
 * მხოლოდ მაშინ, თუ ფოკუსი ჩატვირთვისას / შეცდომისას გვერდის თავში იყო (h1 ან „თავიდან ცდა“) და
 * მომხმარებელი სხვა ელემენტზე არ გადასულა: ფოკუსი ისევ h1-ზეა ან დაიკარგა (body — „თავიდან ცდა“-ს
 * ღილაკი წარმატების შემდეგ ქრება). პირველ ჩატვირთვაზე ფოკუსი არ გადაიტანება (F4-ის წესი) —
 * მაშინ თავში არაფერი ყოფილა ფოკუსში.
 *
 * h1 ერთი და იგივე DOM-კვანძი უნდა დარჩეს ყველა მდგომარეობაში (ტექსტი იცვლება, ელემენტი — არა).
 *
 * @param {import('react').RefObject<HTMLElement | null>} headingRef
 * @param {'idle' | 'loading' | 'success' | 'error'} status
 */
export function useHeadingRefocus(headingRef, status) {
  const { hash } = useLocation();
  const armed = useRef(false);

  // ფოკუსი თავში შევიდა (PageShell → h1, ან „თავიდან ცდა“) → შედეგზე ფოკუსი აქ დაბრუნდება
  useEffect(() => {
    const heading = headingRef.current;
    const scope = heading?.closest('[data-heading-scope]') ?? heading?.parentElement;
    if (!scope) return undefined;
    const onFocusIn = () => {
      armed.current = true;
    };
    /** @param {FocusEvent} event */
    const onFocusOut = (event) => {
      const next = /** @type {Node | null} */ (event.relatedTarget);
      if (next && !scope.contains(next)) armed.current = false;
    };
    scope.addEventListener('focusin', onFocusIn);
    scope.addEventListener('focusout', onFocusOut);
    return () => {
      scope.removeEventListener('focusin', onFocusIn);
      scope.removeEventListener('focusout', onFocusOut);
    };
  }, [headingRef]);

  useEffect(() => {
    if (status === 'loading' || status === 'idle') return;
    const heading = headingRef.current;
    if (!heading || !armed.current) return;
    const active = document.activeElement;
    if (active !== heading && active !== document.body && active !== null) return;
    if (status === 'success') armed.current = false;

    /** @type {HTMLElement | null} */
    let target = null;
    if (status === 'success' && hash.length > 1) {
      try {
        target = document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch {
        target = null;
      }
    }
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.focus({ preventScroll: true });
      return;
    }
    if (!heading.hasAttribute('tabindex')) {
      heading.setAttribute('tabindex', '-1');
      heading.setAttribute('data-route-focus', '');
    }
    heading.blur();
    heading.focus({ preventScroll: true });
  }, [status, hash, headingRef]);
}

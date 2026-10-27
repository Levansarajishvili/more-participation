import { useEffect, useRef, useState } from 'react';
import { useHref, useLocation } from 'react-router';

import { Button, LiveRegion, TextField } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

/**
 * გაზიარება (სტატია, სიახლე): Web Share API (`navigator.share` — მობილური, Windows, ChromeOS),
 * fallback — ბმულის კოპირება (`navigator.clipboard`) და სტატუსი „ბმული დაკოპირდა.“ (`role="status"`).
 * კოპირებაც თუ ვერ ხერხდება (http, ნებართვა) — ჩნდება მხოლოდ წასაკითხი ველი ბმულით, ფოკუსი და
 * მონიშვნა მასზე გადადის, რომ ხელით დააკოპიროს (Ctrl+C / ⌘C).
 * ღილაკის წარწერა შესაძლებლობას ამბობს: „გაზიარება“ ან „ბმულის კოპირება“. ბმული — მისამართი
 * query-სა და hash-ის გარეშე.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.fieldLabel   წასაკითხი ველის ლეიბლი („სტატიის ბმული“)
 * @param {string} [props.path]       F7: გასაზიარებელი მისამართი query-ით
 *   (`/development?series=…`); ნაგულისხმევი — მიმდინარე pathname
 */
export default function ShareButton({ title, fieldLabel, path }) {
  const [status, setStatus] = useState('');
  const [manual, setManual] = useState(false);
  const fieldRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  // როუტერის მისამართი (basename-ით) და არა window.location — ტესტის memory router-შიც სწორია
  const { pathname } = useLocation();
  const href = useHref(path ?? pathname);
  const url = typeof window === 'undefined' ? href : new URL(href, window.location.origin).href;

  useEffect(() => {
    if (!manual) return;
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [manual]);

  const share = async () => {
    setStatus('');
    if (canShare) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // მომხმარებელმა დახურა — არაფერი ცხადდება; სხვა შეცდომა → კოპირება
        if (/** @type {{ name?: string }} */ (error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setManual(false);
      setStatus(t('common.shareCopied'));
    } catch {
      setManual(true);
      setStatus(t('common.shareManual'));
    }
  };

  return (
    <div className="mc-share">
      <Button variant="secondary" icon={canShare ? 'share' : 'link'} onClick={share}>
        {canShare ? t('common.share') : t('common.copyLink')}
      </Button>
      {manual && (
        <TextField
          ref={fieldRef}
          label={fieldLabel}
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          className="mc-share__field"
        />
      )}
      <LiveRegion visible as="p" className="mc-share__status">
        {status}
      </LiveRegion>
    </div>
  );
}

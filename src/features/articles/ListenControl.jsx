import { useId } from 'react';

import { Button } from '@/components/ui/index.js';
import { cancelSpeech, readableBlocks, speakBlocks, useSpeech } from '@/features/a11y/speech.js';
import { t } from '@/i18n/index.js';

/** @typedef {import('@/content/model.js').AudioTrack} AudioTrack */

/**
 * „მოუსმინე“ (§6: სტატიები მოსასმენია). ორი გზა:
 * 1. აუდიო ფაილი (`audio.src`) — ნატიური `<audio controls preload="none">`: კლავიატურა, სიჩქარე და
 *    ხმა ბრაუზერისაა; ავტოდაკვრა არ არის.
 * 2. ფაილის გარეშე — ქართული ხმა (`speechSynthesis`, F4-ის `speech.js`): სათაური, მოკლე აღწერა და
 *    ტექსტის ბლოკები. ღილაკი „მოუსმინე“ ↔ „შეჩერება“; Esc ნებისმიერ ადგილას აჩერებს (WCAG 1.4.2).
 *    ქართული ხმა თუ არ არის — ღილაკი `aria-disabled` (ფოკუსს იღებს) და მიზეზი ტექსტით ჩანს;
 *    ხმების სიის მოლოდინში (≤ 2 წმ) — „ქართული ხმის შემოწმება…“.
 * `audio` არის, მაგრამ `src: null` — ფაილი მზადდება: ხმოვანი წაკითხვა + შენიშვნა.
 *
 * ფოკუსის სამიზნე `id="listen"` (`/articles/:slug#listen` — რჩეული სტატიის „მოუსმინე“) — თავად
 * მართვის ელემენტზეა (`<audio>` ან ღილაკი).
 *
 * @param {object} props
 * @param {AudioTrack | null} props.audio
 * @param {string} props.title
 * @param {string} props.excerpt
 * @param {import('react').RefObject<HTMLElement | null>} props.bodyRef   ტექსტის ბლოკები
 */
export default function ListenControl({ audio, title, excerpt, bodyRef }) {
  const speech = useSpeech();
  const labelId = useId();
  const noteId = useId();

  if (audio?.src) {
    return (
      <div className="mc-listen">
        <p id={labelId} className="mc-listen__label">
          {t('articles.audioVersion')}
        </p>
        {/* აუდიო ვერსია სტატიის გახმოვანებაა — ტექსტური ალტერნატივა თავად სტატიის ტექსტია
            (WCAG 1.2.1, „media alternative for text“), ცალკე WebVTT ბილიკი არ სჭირდება */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          id="listen"
          controls
          preload="none"
          src={audio.src}
          aria-labelledby={labelId}
          className="mc-listen__audio"
        />
      </div>
    );
  }

  const ready = speech.status === 'ready';
  const speaking = ready && speech.phase === 'speaking';
  let note = t('articles.listenHint');
  if (speech.status === 'pending') note = t('articles.listenChecking');
  if (speech.status === 'unsupported' || speech.status === 'no-voice') {
    note = t('articles.listenUnavailable');
  }

  const start = () => {
    const blocks = bodyRef.current ? readableBlocks(bodyRef.current) : [];
    speakBlocks([title, excerpt, ...blocks]);
  };

  return (
    <div className="mc-listen">
      <Button
        id="listen"
        variant="primary"
        icon={speaking ? 'close' : 'listen'}
        aria-disabled={ready ? undefined : 'true'}
        aria-describedby={noteId}
        onClick={ready ? (speaking ? cancelSpeech : start) : undefined}
      >
        {speaking ? t('articles.listenStop') : t('articles.listen')}
      </Button>
      <p id={noteId} className="mc-listen__note">
        {note}
        {audio && !audio.src && <> {t('articles.audioPending')}</>}
      </p>
    </div>
  );
}

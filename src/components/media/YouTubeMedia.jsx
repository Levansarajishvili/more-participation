import { useEffect, useRef } from 'react';

import { isYouTubeId } from '@/content/youtube.js';
import { t } from '@/i18n/index.js';

import { loadYouTubeApi } from './youtube-api.js';
import { createYouTubeController } from './youtube-controller.js';

/**
 * @typedef {object} YouTubeMediaProps
 * @property {import('@/content/model.js').Video} video
 * @property {(controller: import('./native-controller.js').PlaybackController | null) => void} onController
 *   სტაბილური ფუნქცია (`useState`-ის setter)
 * @property {boolean} [audioDescription]  საწყისი არჩევანი; შემდეგ — `setAudioDescription`
 * @property {boolean} [autoStart]         facade-ის დაჭერის შემდეგ `playVideo()`
 * @property {string | null} [captionSrc]  არჩეული VTT (`pickCaptionTrack`)
 */

/**
 * F10: YouTube-ის მედია — ჩნდება მხოლოდ facade-ის „ვიდეოს ჩართვა“-ს შემდეგ (VideoPlayer):
 * ამ დროს ემატება IFrame API-ის სკრიპტი და iframe (`youtube-nocookie.com`). iframe React-ის
 * ხის გარეთაა — API კონტეინერის შიგნით საკუთარ კვანძს ცვლის, ამიტომ კონტეინერი ცარიელია და
 * `destroy()` მას ასუფთავებს. iframe-ზე არაფერი დევს (YouTube RMF): სუბტიტრი ზოლშია, კადრის ქვეშ.
 *
 * @param {YouTubeMediaProps} props
 */
export default function YouTubeMedia({
  video,
  onController,
  audioDescription = false,
  autoStart = false,
  captionSrc = null,
}) {
  const mountRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  // საწყისი მნიშვნელობები — ცვლილება controller-ის მეთოდებით მიდის, iframe თავიდან არ იქმნება
  const initial = useRef({ audioDescription, autoStart });
  const videoId = video.youtube.id;
  const adId = isYouTubeId(video.youtube.adId) ? video.youtube.adId : null;
  const frameTitle = t('player.stage', { title: video.title });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const controller = createYouTubeController({
      mount,
      videoId,
      adId,
      audioDescription: initial.current.audioDescription,
      autoStart: initial.current.autoStart,
      frameTitle,
      fallbackDuration: video.duration,
      captionSrc,
    });
    onController(controller);
    let alive = true;
    loadYouTubeApi().then(
      (YT) => alive && controller.attach(YT),
      () => alive && controller.fail(),
    );
    return () => {
      alive = false;
      controller.destroy();
      onController(null);
    };
  }, [videoId, adId, frameTitle, video.duration, captionSrc, onController]);

  return <div ref={mountRef} className="mc-player__frame" />;
}

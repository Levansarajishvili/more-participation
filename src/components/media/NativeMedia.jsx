import { useEffect, useRef } from 'react';

import { createNativeController } from './native-controller.js';

/**
 * @typedef {object} MediaProps
 * @property {import('@/content/model.js').Video} video
 * @property {(controller: import('./native-controller.js').PlaybackController | null) => void} onController
 *   სტაბილური ფუნქცია (`useState`-ის setter)
 * @property {boolean} signVisible   ჟესტური ენის კადრი ჩანს
 */

/**
 * native წყარო: მთავარი `<video>` (ფაილები `sources`, სუბტიტრები `<track>`), ჟესტური ენის მეორე
 * `<video>` (PiP — ქვედა მარჯვენა კუთხე, კადრის 25%) და აუდიოაღწერის `<audio>`. მართვის ღილაკები
 * ფლეიერისაა (`controls` ატრიბუტი არ არის), ავტოდაკვრა — არა, `preload="metadata"`.
 *
 * ვიდეო-ელემენტები `aria-hidden`-ია: ფლეიერის რეგიონს სახელი და მართვა უკვე აქვს, ჟესტური ენის კადრი
 * კი ვიზუალური ალტერნატივაა.
 *
 * @param {MediaProps} props
 */
export default function NativeMedia({ video, onController, signVisible }) {
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const signRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const audioRef = useRef(/** @type {HTMLAudioElement | null} */ (null));
  const sources = video.sources.filter((source) => source.src);
  const captions = video.captions.filter((track) => track.src);
  const signSrc = video.signLanguage?.src ?? null;
  const adSrc = video.audioDescription?.src ?? null;

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return undefined;
    const controller = createNativeController({
      video: element,
      sign: signRef.current,
      audio: audioRef.current,
      fallbackDuration: video.duration,
    });
    onController(controller);
    return () => {
      controller.destroy();
      onController(null);
    };
  }, [video, onController]);

  return (
    <>
      {/* სუბტიტრები მონაცემიდანაა (`captions`, ფაილის გარეშე — არცერთი) და overlay-ში იხატება */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- <track> დინამიკურია (ქვემოთ) */}
      <video
        ref={videoRef}
        className="mc-player__video"
        preload="metadata"
        playsInline
        poster={video.poster.src ?? undefined}
        aria-hidden="true"
      >
        {sources.map((source) => (
          <source key={source.src} src={/** @type {string} */ (source.src)} type={source.type} />
        ))}
        {captions.map((track) => (
          <track
            key={`${track.srclang}-${track.src}`}
            kind={track.kind}
            srcLang={track.srclang}
            label={track.label}
            src={/** @type {string} */ (track.src)}
            default={track.default}
          />
        ))}
      </video>
      {signSrc && (
        <video
          ref={signRef}
          className="mc-player__sign"
          src={signSrc}
          muted
          playsInline
          preload="metadata"
          hidden={!signVisible}
          aria-hidden="true"
        />
      )}
      {adSrc && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- აუდიოაღწერა თავადაა ალტერნატივა; ტექსტი ტრანსკრიპტშია
        <audio ref={audioRef} src={adSrc} preload="none" />
      )}
    </>
  );
}

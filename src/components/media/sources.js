import NativeMedia from './NativeMedia.jsx';

/** @typedef {import('@/content/model.js').Video} Video */

/**
 * ვიდეოს წყაროს adapter: ფლეიერი პლატფორმას მხოლოდ ამ ობიექტით იცნობს.
 * - `canPlay(video)` — ფაილი (ან პლატფორმის id) არსებობს; false → „ვიდეო ფაილი მზადდება“;
 * - `Media` — კომპონენტი, რომელიც მედიას ხატავს და `onController`-ით `PlaybackController`-ს
 *   აბრუნებს (native-controller.js-ის კონტრაქტი).
 *
 * ახლა მხოლოდ native-ია (`<video>`). YouTube-ის adapter (§9.4, F2 ღია საკითხი 3) `VideoSource`-ს
 * `provider` / `id` ველებს და IFrame API-ის controller-ს დაამატებს; ჟესტური ენის PiP მას
 * ცალკე სინქრონულ ვიდეოდ დასჭირდება.
 *
 * @typedef {object} VideoSourceAdapter
 * @property {string} id
 * @property {(video: Video) => boolean} canPlay
 * @property {import('react').ComponentType<import('./NativeMedia.jsx').MediaProps>} Media
 */

/** @type {VideoSourceAdapter} */
export const nativeSource = Object.freeze({
  id: 'native',
  canPlay: (video) => video.sources.some((source) => Boolean(source.src)),
  Media: NativeMedia,
});

/**
 * ვიდეოს წყარო. ახლა ყოველთვის native-ია; პლატფორმის არჩევის შემდეგ აქ `video.sources`-ის
 * `provider`-ით აირჩევა.
 * @returns {VideoSourceAdapter}
 */
export function resolveSource() {
  return nativeSource;
}

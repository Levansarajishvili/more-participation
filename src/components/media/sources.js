import { getLocale } from '@/i18n/locale.js';
import { isYouTubeId, youtubePoster } from '@/content/youtube.js';

import NativeMedia from './NativeMedia.jsx';
import YouTubeMedia from './YouTubeMedia.jsx';

/** @typedef {import('@/content/model.js').Video} Video */
/** @typedef {import('@/content/model.js').CaptionTrack} CaptionTrack */
/** @typedef {import('@/content/model.js').Image} Image */
/** @typedef {import('@/i18n/locale.js').Locale} Locale */

/**
 * F7-ის native ფლეიერის ველები (`/__kit`, ტესტები). კონტენტის მოდელში F10-დან აღარ არის — B0:
 * ვიდეოს წყარო YouTube-ია, ჟესტური ენის ვერსია არ კეთდება.
 * @typedef {object} VideoSource
 * @property {string | null} src
 * @property {string} type
 *
 * @typedef {object} SignLanguageTrack
 * @property {string | null} src
 * @property {string} label
 *
 * @typedef {Omit<Video, 'youtube'> & {
 *   poster: Image,
 *   sources: VideoSource[],
 *   audioDescription: import('@/content/model.js').AudioTrack | null,
 *   signLanguage: SignLanguageTrack | null,
 * }} NativeVideo
 */

/**
 * რა შეუძლია ამ ვიდეოს ფლეიერში. `sign: null` — წყაროს ჟესტური ენა საერთოდ არ აქვს (ჩიპი არ
 * იხატება); `false` — მზადდება (ჩიპი `aria-disabled` + მიზეზი).
 * @typedef {object} SourceFeatures
 * @property {boolean} captions
 * @property {boolean | null} sign
 * @property {boolean} audioDescription
 * @property {'missing' | 'inAudio'} adReason   რატომ არ არის აუდიოაღწერა
 * @property {Locale} captionLang               სუბტიტრის ენა (`lang` ატრიბუტისთვის)
 * @property {CaptionTrack | null} captionTrack
 */

/**
 * ვიდეოს წყაროს adapter: ფლეიერი პლატფორმას მხოლოდ ამ ობიექტით იცნობს.
 * - `canPlay(video)` — ფაილი / id არსებობს; false → ჩანაცვლების ჩარჩო, ჩართვა `aria-disabled` + მიზეზი;
 * - `Media` — მედიას ხატავს და `onController`-ით `PlaybackController`-ს აბრუნებს;
 * - `facade` — true: `Media` მხოლოდ „ვიდეოს ჩართვა“-ზე დაჭერის შემდეგ ჩაიხატება (გარე სკრიპტი
 *   და iframe დაჭერამდე არ იტვირთება);
 * - `captionPlacement` — `overlay` (კადრზე, native) ან `band` (კადრის ქვეშ — YouTube-ის RMF
 *   ფლეიერზე ელემენტის დადებას კრძალავს);
 * - `poster(video)` — კადრი ჩანაცვლებისა და facade-ისთვის;
 * - `features(video, locale)` — სუბტიტრი / ჟესტური ენა / აუდიოაღწერა.
 *
 * @typedef {object} VideoSourceAdapter
 * @property {string} id
 * @property {(video: any) => boolean} canPlay
 * @property {import('react').ComponentType<any>} Media
 * @property {boolean} [facade]
 * @property {'overlay' | 'band'} [captionPlacement]
 * @property {(video: any) => Image & { fallbackSrc?: string | null }} [poster]
 * @property {(video: any, locale: Locale) => SourceFeatures} [features]
 * @property {(video: any) => string} [pendingText]  i18n-ის გასაღები `canPlay = false`-ზე
 */

/**
 * სუბტიტრის ბილიკი გვერდის ენით: `/en`-ზე ინგლისური (თუ ფაილი არის), სხვაგან — ქართული.
 * @param {CaptionTrack[] | undefined} captions
 * @param {Locale} locale
 * @returns {CaptionTrack | null}
 */
export function pickCaptionTrack(captions, locale) {
  const list = (captions ?? []).filter((track) => track.src);
  if (locale === 'en') {
    const en = list.find((track) => track.srclang === 'en');
    if (en) return en;
  }
  return list.find((track) => track.srclang === 'ka') ?? null;
}

/** @type {VideoSourceAdapter} */
export const nativeSource = Object.freeze({
  id: 'native',
  canPlay: (/** @type {NativeVideo} */ video) =>
    (video.sources ?? []).some((source) => Boolean(source.src)),
  Media: NativeMedia,
  facade: false,
  captionPlacement: /** @type {const} */ ('overlay'),
  poster: (/** @type {NativeVideo} */ video) => video.poster,
  features: (/** @type {NativeVideo} */ video) => ({
    captions: video.captions.some((track) => track.src),
    sign: Boolean(video.signLanguage?.src),
    audioDescription: Boolean(video.audioDescription?.src),
    adReason: /** @type {const} */ ('missing'),
    captionLang: /** @type {const} */ ('ka'),
    captionTrack: null,
  }),
  pendingText: () => 'player.pendingText',
});

/**
 * F10: YouTube — facade (კადრი + „ვიდეოს ჩართვა“), შემდეგ IFrame API + youtube-nocookie.com,
 * მართვა ჩვენი (`controls=0`), სუბტიტრი — ჩვენი VTT ზოლში, აუდიოაღწერა — ცალკე ვერსია (`adId`).
 * @type {VideoSourceAdapter}
 */
export const youtubeSource = Object.freeze({
  id: 'youtube',
  canPlay: (/** @type {Video} */ video) => isYouTubeId(video.youtube?.id),
  Media: YouTubeMedia,
  facade: true,
  captionPlacement: /** @type {const} */ ('band'),
  poster: (/** @type {Video} */ video) => youtubePoster(video.youtube?.id),
  features: (/** @type {Video} */ video, /** @type {Locale} */ locale) => {
    const track = pickCaptionTrack(video.captions, locale);
    const adId = video.youtube?.adId;
    return {
      captions: Boolean(track),
      sign: null,
      audioDescription: isYouTubeId(adId) && adId !== video.youtube?.id,
      adReason: video.visualInAudio ? 'inAudio' : 'missing',
      captionLang: track?.srclang ?? 'ka',
      captionTrack: track,
    };
  },
  pendingText: () => 'player.pendingLink',
});

/**
 * კონტენტის ვიდეო (`youtube` ველით) — YouTube-adapter; F7-ის native ობიექტი (`sources`) —
 * native (`/__kit`, ტესტები).
 * @param {Video | NativeVideo} [video]
 * @returns {VideoSourceAdapter}
 */
export function resolveSource(video) {
  if (video && 'sources' in video && !('youtube' in video)) return nativeSource;
  return youtubeSource;
}

/**
 * adapter-ის აღწერა ნაგულისხმევებით (ტესტის ყალბი წყარო შეიძლება მხოლოდ `canPlay` / `Media`-ს იძლეოდეს).
 * @param {VideoSourceAdapter} adapter
 * @param {any} video
 * @param {Locale} [locale]
 */
export function describeSource(adapter, video, locale = getLocale()) {
  const features = (adapter.features ?? nativeSource.features)?.(video, locale);
  return {
    facade: Boolean(adapter.facade),
    captionPlacement: adapter.captionPlacement ?? 'overlay',
    poster: (adapter.poster ?? nativeSource.poster)?.(video) ?? null,
    features: /** @type {SourceFeatures} */ (features),
    pendingText: (adapter.pendingText ?? nativeSource.pendingText)?.(video) ?? 'player.pendingText',
  };
}

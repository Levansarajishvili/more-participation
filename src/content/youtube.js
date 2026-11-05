/**
 * F10: YouTube — ბმული → id, კადრი, ჩაშენების მისამართები და CSP. ერთი წესი ადმინისთვის
 * (ბმულის ჩასმა), საჯარო ფლეიერისთვის, `validate.js`-ისთვის და B1-ის შემდეგ სერვერისთვის.
 *
 * - ინახება მხოლოდ id (11 სიმბოლო `A–Z a–z 0–9 _ -`), არა URL.
 * - სათაური და აღწერა YouTube-იდან არ მოდის: oEmbed / Data API აქ და ადმინში არ გამოიძახება —
 *   ამ მოდულში ქსელის მოთხოვნა არ არის.
 * - კადრი `i.ytimg.com`-იდან `<img>`-ით იტვირთება (maxres → hq).
 */

/** id-ის ფორმატი. */
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** ჩაშენების წყარო — cookie-ების გარეშე (privacy-enhanced mode). */
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';

/** IFrame Player API — მხოლოდ „ვიდეოს ჩართვა“-ზე დაჭერის შემდეგ. */
export const YOUTUBE_API_SRC = 'https://www.youtube.com/iframe_api';

/** კადრების სერვერი. */
export const YOUTUBE_THUMB_ORIGIN = 'https://i.ytimg.com';

/**
 * CSP-ის დამატებები (B7, `@fastify/helmet`). IFrame API-ის სკრიპტი (`www.youtube.com/iframe_api`)
 * ფლეიერის კოდს `www.youtube.com/s/player/…`-იდან ტვირთავს — ორივე ერთ origin-ზეა.
 */
export const YOUTUBE_CSP = Object.freeze({
  'frame-src': Object.freeze([YOUTUBE_EMBED_ORIGIN]),
  'script-src': Object.freeze(['https://www.youtube.com']),
  'img-src': Object.freeze([YOUTUBE_THUMB_ORIGIN]),
});

/** მასპინძლები (www. / m. / music. მოშორების შემდეგ). */
const WATCH_HOSTS = new Set(['youtube.com', 'youtube-nocookie.com']);
/** youtube.com-ის გზები, რომლებშიც id მეორე სეგმენტია. */
const ID_PATHS = new Set(['shorts', 'embed', 'live', 'v']);

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isYouTubeId(value) {
  return typeof value === 'string' && YOUTUBE_ID.test(value);
}

/**
 * ჩანაცვლების ადგილი („[YouTube-ის id]“) — mock-ის და დიზაინის მნიშვნელობა, რომელიც ფორმატით
 * არავალიდურია, მაგრამ შეცდომა არ არის: ფლეიერი ჩანაცვლების ჩარჩოს ხატავს.
 * @param {unknown} value
 */
export function isPlaceholder(value) {
  return typeof value === 'string' && /^\[[^\]]*\]$/.test(value.trim());
}

/**
 * YouTube-ის ბმული → id. მიიღება: `youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/shorts/…`,
 * `youtube.com/embed/…`, `youtube.com/live/…`, `youtube-nocookie.com/embed/…` (www. / m. / music.,
 * http / https, სქემის გარეშეც) და თავად id. `t=`, `list=`, `si=` და სხვა პარამეტრი იშლება.
 * სხვა დომენი, სქემა (`javascript:`), playlist id-ის გარეშე ან არასწორი სიგრძის id → null.
 *
 * @param {unknown} input
 * @returns {string | null}
 */
export function parseYouTube(input) {
  if (typeof input !== 'string') return null;
  let text = input.trim();
  if (!text) return null;
  if (YOUTUBE_ID.test(text)) return text;
  if (/\s/.test(text)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text.replace(/^\/+/, '')}`;

  /** @type {URL} */
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase().replace(/^(?:www|m|music)\./, '');
  const segments = url.pathname.split('/').filter(Boolean);
  /** @type {string | null | undefined} */
  let id = null;

  if (host === 'youtu.be') {
    id = segments[0];
  } else if (WATCH_HOSTS.has(host)) {
    if (host === 'youtube-nocookie.com') {
      id = segments[0] === 'embed' ? segments[1] : null;
    } else if (segments[0] === 'watch' && segments.length === 1) {
      id = url.searchParams.get('v');
    } else if (ID_PATHS.has(segments[0] ?? '')) {
      id = segments[1];
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/**
 * კადრის მისამართი. `maxres` (1280×720) ყველა ვიდეოს არ აქვს — `<img>` ჩაიტვირთება 120px-იანი
 * ნაცრისფერი ჩანაცვლებით, ამიტომ UI მას `hq`-ით ცვლის (`Media fallbackSrc`). `hq` 480×360-ია
 * (4:3, ზოლებით) — 16:9-ში `object-fit: cover` ზოლებს ზუსტად ჭრის.
 *
 * @param {unknown} id
 * @param {'maxres' | 'hq'} [size='maxres']
 * @returns {string | null}   null — id არავალიდურია (ჩანაცვლების ჩარჩო)
 */
export function youtubeThumbnail(id, size = 'maxres') {
  if (!isYouTubeId(id)) return null;
  return `${YOUTUBE_THUMB_ORIGIN}/vi/${id}/${size === 'hq' ? 'hqdefault' : 'maxresdefault'}.jpg`;
}

/**
 * ვიდეოს კადრი `Image`-ის ფორმით (16:9, დეკორატიული — სათაური ბარათზე და ღილაკის სახელშია).
 * @param {unknown} id
 * @returns {import('./model.js').Image & { fallbackSrc: string | null }}
 */
export function youtubePoster(id) {
  return {
    src: youtubeThumbnail(id, 'maxres'),
    fallbackSrc: youtubeThumbnail(id, 'hq'),
    alt: '',
    ratio: '16:9',
  };
}

/**
 * ჩაშენების მისამართი (ცნობისთვის და ტესტისთვის; ფლეიერი iframe-ს IFrame API-ით ქმნის).
 * @param {string} id
 * @returns {string}
 */
export function youtubeEmbedUrl(id) {
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${encodeURIComponent(id)}`;
}

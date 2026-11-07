import { YOUTUBE_CSP } from '@/content/youtube.js';

/**
 * B7: საიტის HTML-ის header-ები (API-ს თავისი CSP აქვს — `lib/security.js`, `default-src 'none'`).
 *
 * CSP — §10 „ვიდეო YouTube-დან“ (`YOUTUBE_CSP`) + mc-boot-ის hash:
 * - script: `'self'` + mc-boot-ის sha256 (build-იდან, გაშვებისას) + `www.youtube.com` (IFrame API და მისი
 *   `/s/player/…`); `'unsafe-inline'` / `'unsafe-eval'` არ არის.
 * - style: `'self'` — React სტილს CSSOM-ით სვამს (CSP-ს არ ეხება); TipTap-ის `injectCSS` გათიშულია
 *   (`RichTextEditor.jsx`), მისი წესები `editor.css`-შია.
 * - img: `'self'`, YouTube-ის კადრი (`i.ytimg.com`), `data:` — ორბიტის SVG mask (`sections.css`).
 * - font: `'self'` — შრიფტები self-hosted-ია (F1, @fontsource); Google Fonts-ის დომენი საჭირო არ არის.
 * - connect: `'self'` — API (`/api/*`) და VTT (`/media/*`); frame: მხოლოდ `youtube-nocookie.com`.
 * - რუკის iframe (`address.embedUrl`, §9 #16) პროვაიდერის არჩევამდე იბლოკება — არჩევისას `frame-src`-ს
 *   დაემატება.
 * - ფაილის საცავი ცალკე origin არ არის: ფოტო / PDF / VTT `/media/*`-ით იმავე origin-ზე (B5).
 * - `upgrade-insecure-requests` არ არის: ყველა მისამართი ფარდობითია ან https (YouTube), HTTPS-ს Render-ის
 *   გადამისამართება და HSTS იცავს; ლოკალურ production-ის გაშვებაზე (`http://localhost`) ის ფაილებს
 *   https-ზე გადაიყვანდა და გვერდს გატეხდა.
 */

/**
 * @param {object} options
 * @param {string[]} options.scriptHashes  inline script-ების hash (`'sha256-…'`)
 * @returns {string}
 */
export function siteCsp({ scriptHashes }) {
  /** @type {[string, string[]][]} */
  const directives = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", ...scriptHashes, ...YOUTUBE_CSP['script-src']]],
    ['style-src', ["'self'"]],
    ['img-src', ["'self'", 'data:', ...YOUTUBE_CSP['img-src']]],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'"]],
    ['media-src', ["'self'"]],
    ['frame-src', [...YOUTUBE_CSP['frame-src']]],
    ['manifest-src', ["'self'"]],
    ['worker-src', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}

/**
 * Permissions-Policy: სენსორი, კამერა, მიკროფონი, მდებარეობა, გადახდა, USB და Topics — არავის;
 * autoplay / encrypted-media / picture-in-picture — ჩვენ და YouTube-ის iframe-ს (დაკვრა მხოლოდ
 * დაჭერის შემდეგ — `playVideo()`; ავტოდაკვრა არ არის); fullscreen — მხოლოდ ჩვენ (ჩვენი wrapper,
 * YouTube-ში `fs=0`). Web Share და clipboard (გაზიარება, მოწვევის ბმული) — ნაგულისხმევი (self).
 */
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'camera=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'payment=()',
  'usb=()',
  'browsing-topics=()',
  `autoplay=(self "${YOUTUBE_CSP['frame-src'][0]}")`,
  `encrypted-media=(self "${YOUTUBE_CSP['frame-src'][0]}")`,
  `picture-in-picture=(self "${YOUTUBE_CSP['frame-src'][0]}")`,
  'fullscreen=(self)',
].join(', ');

/** `X-Robots-Tag` ადმინზე, API-ზე, ბმულის გვერდებზე, 404-ზე და ინდექსაციის გარეშე (staging). */
export const NOINDEX = 'noindex, nofollow';

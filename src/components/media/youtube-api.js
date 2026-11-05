import { YOUTUBE_API_SRC } from '@/content/youtube.js';

/**
 * F10: YouTube IFrame Player API-ის ჩამტვირთავი. სკრიპტი გვერდზე მხოლოდ „ვიდეოს ჩართვა“-ზე დაჭერის
 * შემდეგ ემატება (facade) — ერთხელ, ყველა ფლეიერისთვის. ქსელის შეცდომა ან ვადა → reject
 * (ფლეიერი „ვიდეო ამჟამად მიუწვდომელია“-ს აჩვენებს). `window.YT.Player` უკვე თუ არის — მყისიერად.
 */

/** ვადა მილიწამებში. */
export const YOUTUBE_API_TIMEOUT = 15_000;

/** @type {Promise<any> | null} */
let pending = null;

/**
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<any>}  `window.YT`
 */
export function loadYouTubeApi({ timeout = YOUTUBE_API_TIMEOUT } = {}) {
  if (typeof window === 'undefined') return Promise.reject(new Error('youtube: no window'));
  const ready = /** @type {any} */ (window).YT;
  if (ready?.Player) return Promise.resolve(ready);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const scope = /** @type {any} */ (window);
    const previous = scope.onYouTubeIframeAPIReady;
    /** @type {HTMLScriptElement | null} */
    let script = document.querySelector(`script[src="${YOUTUBE_API_SRC}"]`);

    /** @param {Error} error */
    const fail = (error) => {
      clearTimeout(timer);
      pending = null;
      script?.remove();
      reject(error);
    };
    const timer = setTimeout(() => fail(new Error('youtube: timeout')), timeout);

    scope.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (typeof previous === 'function') previous();
      resolve(scope.YT);
    };
    if (!script) {
      script = document.createElement('script');
      script.src = YOUTUBE_API_SRC;
      script.async = true;
      script.addEventListener('error', () => fail(new Error('youtube: network')));
      document.head.append(script);
    }
  });
  return pending;
}

/** ტესტისთვის: ჩამტვირთავის მდგომარეობის განულება. */
export function resetYouTubeApi() {
  pending = null;
}

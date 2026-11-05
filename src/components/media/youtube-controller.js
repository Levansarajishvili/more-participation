import { cueAt, parseCaptions } from '@/content/vtt.js';
import { YOUTUBE_EMBED_ORIGIN } from '@/content/youtube.js';

import { IDLE_STATE, clamp } from './native-controller.js';

/**
 * F10: `PlaybackController` YouTube-ის IFrame Player API-ზე (`controls=0` — მართვა ფლეიერის UI-ისაა).
 *
 * - controller-ი იქმნება „ვიდეოს ჩართვა“-ზე დაჭერისთანავე, API-ის ჩატვირთვამდე: ბრძანებები
 *   (`play`, `seek`, ხმა, სიჩქარე) ინახება და `attach(YT)`-ის შემდეგ სრულდება.
 * - iframe: `youtube-nocookie.com/embed/{id}` (`enablejsapi=1`, `controls=0`, `disablekb=1`,
 *   `fs=0`, `rel=0`, `playsinline=1`, `iv_load_policy=3`, `origin`), `title` = „ვიდეო: {სათაური}“,
 *   `tabindex="-1"` (მართვა სრულად ჩვენია — Tab iframe-ში არ შედის), Referer-ის პოლიტიკა
 *   `strict-origin-when-cross-origin` (YouTube RMF). YouTube-ის საკუთარი სუბტიტრი არ ირთვება
 *   (`cc_load_policy` არ გადაეცემა).
 * - დრო: `getCurrentTime()` ყოველ 250 ms-ში დაკვრისას — პროგრესი, ტრანსკრიპტის მიმდინარე სტრიქონი,
 *   სუბტიტრი (ჩვენი VTT, `cueAt`).
 * - აუდიოაღწერა: ვერსიის გადართვა იმავე წამზე — დაკვრისას `loadVideoById`, პაუზისას
 *   `cueVideoById` (ავტოდაკვრის გარეშე).
 * - შეცდომა 2 / 5 / 100 / 101 / 150 ან API-ის ჩაუტვირთაობა → `unavailable`.
 * - ავტოდაკვრა არ არის: `playVideo()` მხოლოდ მომხმარებლის ქმედებით (facade-ის ღილაკი ითვლება).
 */

/** პოლინგის ინტერვალი (ms). */
export const POLL_MS = 250;
/** თუ `playVideo()`-ის შემდეგ ამდენ ხანში არ ჩაირთო — ბრაუზერმა არ დაუშვა (`blocked`). */
export const AUTOPLAY_GRACE_MS = 2500;
/** IFrame API-ის შეცდომის კოდები, რომლებზეც ვიდეო მიუწვდომელია. */
export const UNAVAILABLE_CODES = Object.freeze([2, 5, 100, 101, 150]);

/** YT.PlayerState */
const YT_STATE = Object.freeze({
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
});

/**
 * @typedef {object} YouTubeOptions
 * @property {HTMLElement} mount              iframe-ის კონტეინერი
 * @property {string} videoId
 * @property {string | null} [adId]           აუდიოაღწერის ვერსია
 * @property {boolean} [audioDescription]     საწყისი არჩევანი (`mc-player`)
 * @property {string} frameTitle              „ვიდეო: {სათაური}“
 * @property {string} [origin]                `window.location.origin`
 * @property {number} [fallbackDuration]      კონტენტის `duration` — `getDuration()`-მდე
 * @property {boolean} [autoStart]            facade-ის დაჭერა = მომხმარებლის ქმედება → `playVideo()`
 * @property {string | null} [captionSrc]     ჩვენი VTT (same-origin)
 * @property {(src: string) => Promise<string>} [fetchText]
 */

/** @param {string} src */
async function defaultFetchText(src) {
  const response = await fetch(src, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`vtt: ${response.status}`);
  return response.text();
}

/**
 * @param {YouTubeOptions} options
 * @returns {import('./native-controller.js').PlaybackController & {
 *   attach(YT: any): void, fail(): void, setCues(cues: import('@/content/vtt.js').Cue[]): void
 * }}
 */
export function createYouTubeController({
  mount,
  videoId,
  adId = null,
  audioDescription = false,
  frameTitle,
  origin = typeof window === 'undefined' ? undefined : window.location.origin,
  fallbackDuration = 0,
  autoStart = false,
  captionSrc = null,
  fetchText = defaultFetchText,
}) {
  /** @type {any} */
  let player = null;
  let ready = false;
  let destroyed = false;
  let ytState = YT_STATE.UNSTARTED;
  let started = false;
  let error = false;
  let unavailable = false;
  let blocked = false;
  let wantPlay = autoStart;
  let adOn = audioDescription && Boolean(adId);
  let volume = 1;
  let muted = false;
  let rate = 1;
  let duration = fallbackDuration;
  /** @type {number | null} დრო, რომელიც API-მ ჯერ არ აიღო (დაწყებამდე seek, ვერსიის გადართვა) */
  let pendingStart = null;
  let lastTime = 0;
  let captionsOn = false;
  let captionsFailed = false;
  /** @type {import('@/content/vtt.js').Cue[]} */
  let cues = [];
  let captionText = '';
  /** @type {ReturnType<typeof setInterval> | null} */
  let poll = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let graceTimer = null;
  /** @type {Set<() => void>} */
  const listeners = new Set();
  /** @type {Set<(text: string) => void>} */
  const captionListeners = new Set();

  const currentId = () => (adOn && adId ? adId : videoId);
  /** ვიდეო (ან ახალი ვერსია) ჯერ არ დაკრულა — `seekTo` მას ჩართავდა, ამიტომ დრო ინახება. */
  const notPlayedYet = () => ytState === YT_STATE.UNSTARTED || ytState === YT_STATE.CUED;

  const time = () => {
    if (pendingStart !== null) return pendingStart;
    if (player && ready) {
      const value = Number(player.getCurrentTime?.());
      if (Number.isFinite(value)) lastTime = value;
    }
    return lastTime;
  };

  /** @returns {import('./native-controller.js').PlaybackState} */
  const read = () => ({
    ...IDLE_STATE,
    ready,
    started,
    paused: !(ytState === YT_STATE.PLAYING || ytState === YT_STATE.BUFFERING),
    ended: ytState === YT_STATE.ENDED,
    waiting: ytState === YT_STATE.BUFFERING,
    currentTime: time(),
    duration,
    volume,
    muted,
    rate,
    error,
    loading: !ready && !unavailable,
    unavailable,
    blocked,
    captionsFailed,
  });
  let state = read();

  const updateCaption = () => {
    const next = captionsOn ? cueAt(cues, state.currentTime) : '';
    if (next === captionText) return;
    captionText = next;
    captionListeners.forEach((listener) => listener(next));
  };
  const emit = () => {
    if (destroyed) return;
    state = read();
    updateCaption();
    listeners.forEach((listener) => listener());
  };

  const stopPolling = () => {
    if (poll) clearInterval(poll);
    poll = null;
  };
  const startPolling = () => {
    if (poll) return;
    poll = setInterval(() => {
      const value = Number(player?.getDuration?.());
      if (Number.isFinite(value) && value > 0) duration = value;
      emit();
    }, POLL_MS);
  };

  const clearGrace = () => {
    if (graceTimer) clearTimeout(graceTimer);
    graceTimer = null;
  };
  /** დაკვრის მოთხოვნა API-სთვის (დაწყებამდე დაყენებული დროით). */
  const requestPlay = () => {
    if (!player || !ready) {
      wantPlay = true;
      return;
    }
    wantPlay = false;
    if (notPlayedYet() && pendingStart !== null && pendingStart > 0) {
      player.loadVideoById({ videoId: currentId(), startSeconds: pendingStart });
    } else {
      player.playVideo();
    }
    clearGrace();
    graceTimer = setTimeout(() => {
      if (!(ytState === YT_STATE.PLAYING || ytState === YT_STATE.BUFFERING)) {
        blocked = true;
        emit();
      }
    }, AUTOPLAY_GRACE_MS);
  };

  const decorateFrame = () => {
    const frame = /** @type {HTMLIFrameElement | null} */ (
      player?.getIframe?.() ?? mount.querySelector('iframe')
    );
    if (!frame) return;
    frame.setAttribute('title', frameTitle);
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.classList.add('mc-player__iframe');
  };

  const loadCaptions = () => {
    if (!captionSrc) return;
    fetchText(captionSrc).then(
      (text) => {
        const result = parseCaptions(text);
        cues = result.ok ? result.cues : [];
        captionsFailed = !result.ok;
        emit();
      },
      () => {
        captionsFailed = true;
        emit();
      },
    );
  };

  /** @type {Record<string, (event: { data: number }) => void>} */
  const events = {
    onReady: () => {
      if (destroyed) return;
      ready = true;
      decorateFrame();
      const value = Number(player.getDuration?.());
      if (Number.isFinite(value) && value > 0) duration = value;
      player.setVolume?.(Math.round(volume * 100));
      if (muted) player.mute?.();
      if (rate !== 1) player.setPlaybackRate?.(rate);
      if (wantPlay) requestPlay();
      emit();
    },
    onStateChange: ({ data }) => {
      ytState = data;
      if (data === YT_STATE.PLAYING) {
        started = true;
        blocked = false;
        error = false;
        clearGrace();
        pendingStart = null;
        startPolling();
      } else {
        stopPolling();
      }
      if (data === YT_STATE.BUFFERING && started) pendingStart = null;
      emit();
    },
    onError: ({ data }) => {
      error = true;
      if (UNAVAILABLE_CODES.includes(data)) unavailable = true;
      stopPolling();
      clearGrace();
      emit();
    },
    onPlaybackRateChange: ({ data }) => {
      if (Number.isFinite(data)) rate = data;
      emit();
    },
  };

  /** @type {ReturnType<typeof createYouTubeController>} */
  const api = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onCaption(listener) {
      captionListeners.add(listener);
      listener(captionText);
      return () => captionListeners.delete(listener);
    },
    attach(YT) {
      if (destroyed || player) return;
      const host = document.createElement('div');
      mount.replaceChildren(host);
      player = new YT.Player(host, {
        host: YOUTUBE_EMBED_ORIGIN,
        videoId: currentId(),
        width: '100%',
        height: '100%',
        playerVars: {
          enablejsapi: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          autoplay: 0,
          ...(origin && { origin }),
        },
        events,
      });
      decorateFrame();
      loadCaptions();
      emit();
    },
    fail() {
      error = true;
      unavailable = true;
      emit();
    },
    setCues(next) {
      cues = next;
      emit();
    },
    async play() {
      requestPlay();
    },
    pause() {
      wantPlay = false;
      player?.pauseVideo?.();
    },
    seek(seconds) {
      const target = clamp(seconds, 0, duration || Math.max(0, seconds));
      if (!player || !ready || notPlayedYet()) {
        pendingStart = target;
      } else {
        player.seekTo(target, true);
        lastTime = target;
      }
      emit();
    },
    setVolume(next) {
      volume = clamp(next, 0, 1);
      player?.setVolume?.(Math.round(volume * 100));
      if (volume > 0 && muted) api.setMuted(false);
      else emit();
    },
    setMuted(next) {
      muted = next;
      if (player && ready) {
        if (muted) player.mute();
        else player.unMute();
      }
      emit();
    },
    setRate(next) {
      rate = next;
      if (player && ready) player.setPlaybackRate(next);
      emit();
    },
    setCaptions(on) {
      captionsOn = on;
      emit();
    },
    setSignLanguage() {
      // YouTube-ის ვიდეოს ჟესტური ენის ვერსია არ აქვს (B0)
    },
    setAudioDescription(on) {
      const next = on && Boolean(adId);
      if (next === adOn) return;
      const at = time();
      const playing = ytState === YT_STATE.PLAYING || ytState === YT_STATE.BUFFERING;
      adOn = next;
      if (!player || !ready) return;
      if (playing) {
        player.loadVideoById({ videoId: currentId(), startSeconds: at });
        lastTime = at;
      } else {
        player.cueVideoById({ videoId: currentId(), startSeconds: at });
        pendingStart = at;
      }
      emit();
    },
    destroy() {
      destroyed = true;
      stopPolling();
      clearGrace();
      try {
        player?.destroy?.();
      } catch {
        // iframe უკვე მოხსნილია
      }
      mount.replaceChildren();
      listeners.clear();
      captionListeners.clear();
    },
  };
  return api;
}

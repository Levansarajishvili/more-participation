import { useEffect } from 'react';

import { clamp, IDLE_STATE } from '../native-controller.js';

/**
 * ტესტისა და `/__kit`-ის წყარო: მედია-ფაილის გარეშე, მართვადი `PlaybackController`-ით.
 * jsdom-ს `HTMLMediaElement.play()` არ აქვს, ამიტომ ფლეიერის UI (კლავიატურა, ARIA, განლაგება)
 * ამ წყაროთი მოწმდება, native controller კი — ცალკე, ყალბი ელემენტებით.
 *
 * @param {{ duration?: number, currentTime?: number, caption?: string, started?: boolean }} [options]
 */
export function createFakeController({
  duration = 270,
  currentTime = 0,
  caption = '[სუბტიტრი: მონაწილის სიტყვები]',
  started = false,
} = {}) {
  /** @type {import('../native-controller.js').PlaybackState} */
  let state = { ...IDLE_STATE, ready: true, duration, currentTime, started };
  /** @type {Set<() => void>} */
  const listeners = new Set();
  /** @type {Set<(text: string) => void>} */
  const captionListeners = new Set();
  let captionsOn = false;
  let text = caption;
  /** @type {Record<string, unknown[]>} */
  const calls = { captions: [], sign: [], audioDescription: [], rate: [], seek: [] };
  /** @param {Partial<typeof state>} patch */
  const set = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const broadcast = () => captionListeners.forEach((listener) => listener(captionsOn ? text : ''));

  return {
    calls,
    getState: () => state,
    /** @param {() => void} listener */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** @param {(text: string) => void} listener */
    onCaption(listener) {
      captionListeners.add(listener);
      listener(captionsOn ? text : '');
      return () => captionListeners.delete(listener);
    },
    async play() {
      set({ paused: false, started: true, ended: false });
    },
    pause() {
      set({ paused: true });
    },
    /** @param {number} seconds */
    seek(seconds) {
      calls.seek.push(seconds);
      set({ currentTime: clamp(seconds, 0, state.duration) });
    },
    /** @param {number} volume */
    setVolume(volume) {
      set({ volume, muted: volume > 0 ? false : state.muted });
    },
    /** @param {boolean} muted */
    setMuted(muted) {
      set({ muted });
    },
    /** @param {number} rate */
    setRate(rate) {
      calls.rate.push(rate);
      set({ rate });
    },
    /** @param {boolean} on */
    setCaptions(on) {
      calls.captions.push(on);
      captionsOn = on;
      broadcast();
    },
    /** @param {boolean} on */
    setSignLanguage(on) {
      calls.sign.push(on);
    },
    /** @param {boolean} on */
    setAudioDescription(on) {
      calls.audioDescription.push(on);
    },
    /** @param {string} next */
    emitCaption(next) {
      text = next;
      broadcast();
    },
    /** @param {Partial<typeof state>} patch */
    setState: set,
    destroy() {},
  };
}

/**
 * @param {Parameters<typeof createFakeController>[0]} [options]
 * @returns {{ controller: ReturnType<typeof createFakeController>, source: import('../sources.js').VideoSourceAdapter }}
 */
export function createFakeSource(options) {
  const controller = createFakeController(options);
  /** @param {import('../NativeMedia.jsx').MediaProps} props */
  function FakeMedia({ onController }) {
    useEffect(() => {
      onController(/** @type {any} */ (controller));
      return () => onController(null);
    }, [onController]);
    return <div className="mc-player__video" data-fake-media="" aria-hidden="true" />;
  }
  return { controller, source: { id: 'fake', canPlay: () => true, Media: FakeMedia } };
}

/**
 * ვიდეო ყველა ფაილით (src — სატესტო მისამართი; ქსელი არ გამოიყენება, წყარო ყალბია).
 * @param {import('@/content/model.js').Video} video
 * @returns {import('@/content/model.js').Video}
 */
export function withFiles(video) {
  return {
    ...video,
    sources: [{ src: '/__fixtures/video.webm', type: 'video/webm' }],
    captions: video.captions.map((track) => ({ ...track, src: '/__fixtures/captions.vtt' })),
    audioDescription: video.audioDescription && {
      ...video.audioDescription,
      src: '/__fixtures/ad.webm',
    },
    signLanguage: video.signLanguage && { ...video.signLanguage, src: '/__fixtures/sign.webm' },
  };
}

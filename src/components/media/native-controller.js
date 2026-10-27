/**
 * ფლეიერის მართვის კონტრაქტი (`PlaybackController`) და მისი native რეალიზაცია `<video>`-ზე.
 *
 * ფლეიერის UI (`VideoPlayer`) მედია-ელემენტს პირდაპირ არ ეხება — მხოლოდ controller-ს: ამიტომ
 * YouTube-ის (ან სხვა პლატფორმის, §9.4) adapter-ს იგივე კონტრაქტი დასჭირდება და UI არ შეიცვლება.
 *
 * native რეალიზაცია:
 * - ჟესტური ენა — მეორე `<video>` (ხმის გარეშე), რომელიც მთავარს მიჰყვება: play / pause / waiting,
 *   seek, სიჩქარე; `timeupdate`-ზე დრიფტი > 0.3 წმ → გასწორება;
 * - აუდიოაღწერა — ცალკე `<audio>` (სრული მიქსი: ორიგინალის ხმა + აღწერა): ჩართვისას მთავარი
 *   ვიდეო ჩუმდება, ხმა და „ხმის გათიშვა“ აუდიოს ეხება; სინქრონი — როგორც ჟესტურ ენაზე;
 * - სუბტიტრები — `<track>` `mode = "hidden"` + `cuechange`: ბრაუზერი თავად არ ხატავს, ტექსტი
 *   `onCaption`-ით UI-ს overlay-ში მიდის (თავსებადობის მენიუს შრიფტსა და კონტრასტს მიჰყვება).
 *
 * ავტოდაკვრა არ არსებობს: `play()` მხოლოდ მომხმარებლის ქმედებით იძახება.
 */

/** ← → და ტრანსკრიპტის ბიჯი (წამი). */
export const SEEK_STEP = 5;
/** PageUp / PageDown პროგრესზე (წამი). */
export const PAGE_STEP = 30;
/** მიმყოლი ელემენტის (ჟესტური ენა, აუდიოაღწერა) დასაშვები დრიფტი წამებში. */
export const DRIFT_TOLERANCE = 0.3;
/** დაკვრის სიჩქარეები. */
export const RATES = Object.freeze([0.5, 0.75, 1, 1.25, 1.5, 2]);

/**
 * @typedef {object} PlaybackState
 * @property {boolean} ready        მეტამონაცემი ჩაიტვირთა
 * @property {boolean} started      ერთხელ მაინც ჩაირთო (დიდი ღილაკი ქრება)
 * @property {boolean} paused
 * @property {boolean} ended
 * @property {boolean} waiting      ბუფერი
 * @property {number} currentTime   წამი
 * @property {number} duration      წამი (მეტამონაცემამდე — კონტენტის `duration`)
 * @property {number} volume        0…1
 * @property {boolean} muted        მომხმარებლის არჩევანი (აუდიოაღწერისას შიდა დადუმება არ ითვლება)
 * @property {number} rate
 * @property {boolean} error        ფაილი ვერ ჩაიტვირთა / ვერ ითამაშა
 */

/**
 * @typedef {object} PlaybackController
 * @property {() => PlaybackState} getState
 * @property {(listener: () => void) => () => void} subscribe
 * @property {(listener: (text: string) => void) => () => void} onCaption  მიმდინარე სუბტიტრი ('' — არაფერი)
 * @property {() => Promise<void>} play
 * @property {() => void} pause
 * @property {(seconds: number) => void} seek
 * @property {(volume: number) => void} setVolume
 * @property {(muted: boolean) => void} setMuted
 * @property {(rate: number) => void} setRate
 * @property {(on: boolean) => void} setCaptions
 * @property {(on: boolean) => void} setSignLanguage
 * @property {(on: boolean) => void} setAudioDescription
 * @property {() => void} destroy
 */

/** @type {PlaybackState} */
export const IDLE_STATE = Object.freeze({
  ready: false,
  started: false,
  paused: true,
  ended: false,
  waiting: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  rate: 1,
  error: false,
});

/**
 * WebVTT-ის ტეგები (`<v Speaker>`, `<c.x>`, `<i>`) და entity-ები → უბრალო ტექსტი.
 * @param {string} text
 * @returns {string}
 */
export function stripCueTags(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * ბილიკის აქტიური cue-ების ტექსტი (რამდენიმე — ახალ ხაზზე).
 * @param {{ activeCues?: ArrayLike<{ text?: string }> | null } | null} track
 * @returns {string}
 */
export function cueText(track) {
  const cues = track?.activeCues;
  if (!cues) return '';
  return Array.from(cues)
    .map((cue) => stripCueTags(cue.text ?? ''))
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * @param {number} value
 * @param {number} fallback
 */
function finite(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** @param {Promise<void> | void | undefined} promise */
function quiet(promise) {
  if (promise && typeof promise.catch === 'function') promise.catch(() => {});
}

/**
 * @typedef {object} NativeElements
 * @property {HTMLMediaElement} video
 * @property {HTMLMediaElement | null} [sign]    ჟესტური ენის ვიდეო
 * @property {HTMLMediaElement | null} [audio]   აუდიოაღწერის ბილიკი
 * @property {number} [fallbackDuration=0]       კონტენტის `duration` მეტამონაცემამდე
 */

/**
 * @param {NativeElements} elements
 * @returns {PlaybackController}
 */
export function createNativeController({ video, sign = null, audio = null, fallbackDuration = 0 }) {
  let signOn = false;
  let adOn = false;
  let captionsOn = false;
  let userMuted = video.muted;
  let volume = Number.isFinite(video.volume) ? video.volume : 1;
  let waiting = false;
  let error = false;
  let started = false;
  let captionText = '';
  /** @type {TextTrack | null} */
  let captionTrack = null;
  /** @type {Set<() => void>} */
  const listeners = new Set();
  /** @type {Set<(text: string) => void>} */
  const captionListeners = new Set();

  /** @returns {PlaybackState} */
  const read = () => ({
    ready: video.readyState >= 1,
    started,
    paused: video.paused,
    ended: video.ended,
    waiting,
    currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    duration: finite(video.duration, fallbackDuration),
    volume,
    muted: userMuted,
    rate: video.playbackRate || 1,
    error,
  });
  let state = read();
  const emit = () => {
    state = read();
    listeners.forEach((listener) => listener());
  };

  /** @returns {HTMLMediaElement[]} */
  const followers = () =>
    /** @type {HTMLMediaElement[]} */ ([signOn ? sign : null, adOn ? audio : null].filter(Boolean));

  /** @param {HTMLMediaElement} el @param {number} tolerance */
  const align = (el, tolerance) => {
    try {
      if (Math.abs((el.currentTime || 0) - (video.currentTime || 0)) > tolerance) {
        el.currentTime = video.currentTime || 0;
      }
      if (el.playbackRate !== video.playbackRate) el.playbackRate = video.playbackRate;
    } catch {
      // მეტამონაცემამდე currentTime-ის დაყენება ზოგ ბრაუზერში აგდებს — შემდეგ timeupdate-ზე
    }
  };
  /** @param {HTMLMediaElement} el */
  const follow = (el) => {
    align(el, 0.05);
    quiet(el.play?.());
  };

  /* ─── სუბტიტრები ─── */
  /** @param {string} text */
  const setCaption = (text) => {
    if (text === captionText) return;
    captionText = text;
    captionListeners.forEach((listener) => listener(text));
  };
  const onCueChange = () => setCaption(captionsOn ? cueText(captionTrack) : '');
  const findTrack = () => {
    const list = Array.from(video.textTracks ?? []).filter(
      (track) => track.kind === 'captions' || track.kind === 'subtitles',
    );
    return list.find((track) => track.language === 'ka') ?? list[0] ?? null;
  };
  const attachCaptions = () => {
    const next = findTrack();
    if (next !== captionTrack) {
      captionTrack?.removeEventListener('cuechange', onCueChange);
      captionTrack = next;
      captionTrack?.addEventListener('cuechange', onCueChange);
    }
    // ბრაუზერის საკუთარი რენდერი არასოდეს: `showing` → `hidden` / `disabled`
    for (const track of Array.from(video.textTracks ?? [])) {
      if (track === captionTrack) track.mode = captionsOn ? 'hidden' : 'disabled';
      else if (track.mode === 'showing') track.mode = 'disabled';
    }
    onCueChange();
  };

  /* ─── ელემენტის მოვლენები ─── */
  /** @type {Record<string, () => void>} */
  const handlers = {
    play: () => {
      started = true;
      error = false;
      followers().forEach(follow);
      emit();
    },
    playing: () => {
      waiting = false;
      followers().forEach((el) => el.paused && follow(el));
      emit();
    },
    pause: () => {
      followers().forEach((el) => el.pause());
      emit();
    },
    waiting: () => {
      waiting = true;
      followers().forEach((el) => el.pause());
      emit();
    },
    ended: () => {
      followers().forEach((el) => el.pause());
      emit();
    },
    seeking: () => {
      followers().forEach((el) => align(el, 0.05));
      emit();
    },
    seeked: () => {
      followers().forEach((el) => align(el, 0.05));
      emit();
    },
    timeupdate: () => {
      followers().forEach((el) => align(el, DRIFT_TOLERANCE));
      emit();
    },
    ratechange: () => {
      followers().forEach((el) => {
        el.playbackRate = video.playbackRate;
      });
      emit();
    },
    loadedmetadata: () => {
      attachCaptions();
      emit();
    },
    durationchange: emit,
    volumechange: emit,
    error: () => {
      error = true;
      emit();
    },
  };
  for (const [type, handler] of Object.entries(handlers)) video.addEventListener(type, handler);
  const tracks = video.textTracks;
  tracks?.addEventListener?.('addtrack', attachCaptions);
  attachCaptions();

  /** @type {PlaybackController} */
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
    async play() {
      try {
        await video.play();
      } catch (cause) {
        const name = /** @type {{ name?: string }} */ (cause)?.name;
        // AbortError — pause ჩაერია; NotAllowedError — ბრაუზერის პოლიტიკა (არ ხდება, დაჭერით ირთვება)
        if (name !== 'AbortError' && name !== 'NotAllowedError') {
          error = true;
          emit();
        }
      }
    },
    pause() {
      video.pause();
    },
    seek(seconds) {
      const duration = finite(video.duration, fallbackDuration);
      video.currentTime = clamp(seconds, 0, duration || Math.max(0, seconds));
      followers().forEach((el) => align(el, 0.05));
      emit();
    },
    setVolume(next) {
      volume = clamp(next, 0, 1);
      (adOn && audio ? audio : video).volume = volume;
      if (volume > 0 && userMuted) api.setMuted(false);
      else emit();
    },
    setMuted(muted) {
      userMuted = muted;
      if (adOn && audio) audio.muted = muted;
      else video.muted = muted;
      emit();
    },
    setRate(rate) {
      video.playbackRate = rate;
      emit();
    },
    setCaptions(on) {
      captionsOn = on;
      attachCaptions();
    },
    setSignLanguage(on) {
      const next = on && Boolean(sign);
      if (next === signOn) return;
      signOn = next;
      if (!sign) return;
      if (signOn) {
        align(sign, 0.05);
        if (!video.paused) follow(sign);
      } else {
        sign.pause();
      }
    },
    setAudioDescription(on) {
      const next = on && Boolean(audio);
      if (next === adOn) return;
      adOn = next;
      if (!audio) return;
      if (adOn) {
        audio.volume = volume;
        audio.muted = userMuted;
        video.muted = true;
        align(audio, 0.05);
        if (!video.paused) follow(audio);
      } else {
        audio.pause();
        video.volume = volume;
        video.muted = userMuted;
      }
      emit();
    },
    destroy() {
      for (const [type, handler] of Object.entries(handlers)) {
        video.removeEventListener(type, handler);
      }
      tracks?.removeEventListener?.('addtrack', attachCaptions);
      captionTrack?.removeEventListener('cuechange', onCueChange);
      listeners.clear();
      captionListeners.clear();
    },
  };
  return api;
}

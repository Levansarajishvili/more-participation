import { contentLang as contentLangOf } from '@/content/localize.js';
import { useCallback, useEffect, useEffectEvent, useId, useRef, useState } from 'react';

import {
  Button,
  Chip,
  Icon,
  IconButton,
  LiveRegion,
  Media,
  Select,
  Switch,
  VisuallyHidden,
} from '@/components/ui/index.js';
import { cx } from '@/components/ui/utils.js';
import { formatDuration, formatNumber, t } from '@/i18n/index.js';

import { RATES, SEEK_STEP } from './native-controller.js';
import { usePlayerPrefs } from './player-prefs.js';
import ProgressSlider from './ProgressSlider.jsx';
import { resolveSource } from './sources.js';
import Transcript from './Transcript.jsx';
import { usePlayback, usePlayerLayout } from './usePlayback.js';

import './media.css';

/** @typedef {import('@/content/model.js').Video} Video */
/** @typedef {import('./sources.js').VideoSourceAdapter} VideoSourceAdapter */
/** @typedef {import('./native-controller.js').PlaybackController} PlaybackController */

/** @param {number} rate */
const rateLabel = (rate) => t('player.speedValue', { value: formatNumber(rate) });

/** ფოკუსი ველში / ჩამოსაშლელში — ფლეიერის მალსახმობი იქ არ მუშაობს. */
const FIELD = 'input, select, textarea, [contenteditable="true"]';

/**
 * ხელმისაწვდომი ვიდეოფლეიერი (VideosPage დაფა, ContentKit-ის „ვიდეოს სტანდარტი“).
 *
 * - მედია `VideoSourceAdapter`-ის უკანაა (`sources.js`; ახლა native `<video>`) — UI მხოლოდ
 *   `PlaybackController`-ს იცნობს.
 * - მართვა: ჩართვა / პაუზა, პროგრესი (`role="slider"`, „01:23 / 04:56“), ხმა, სუბტიტრები, ჟესტური ენა
 *   (PiP), აუდიოაღწერა, ტრანსკრიპტი (ნიშნული → seek), სიჩქარე, სრული ეკრანი.
 * - სუბტიტრები ნაგულისხმევად ჩართულია და საკუთარ overlay-შია (rem — თავსებადობის მენიუს შრიფტს
 *   მიჰყვება; ფონი #0A1D38 / #FFFFFF 16.86:1, კონტრასტის თემაში #000000 / #FFFFFF).
 * - კლავიატურა მხოლოდ ფლეიერში ფოკუსისას: Space (ფლეიერზე / კადრზე) ან K — ჩართვა / პაუზა,
 *   ← → — 5 წამი, M — ხმა, C — სუბტიტრები. `KeyboardEvent.code`-ით — ქართულ განლაგებაზეც („კ“, „მ“,
 *   „ც“) მუშაობს. ღილაკზე Space ღილაკისაა.
 * - განლაგება სიგანით (`usePlayerLayout`): `full` — ორი რიგი; `compact` (390, 200%) — მთავარი რიგი
 *   (ჩართვა, პროგრესი, CC, სრული ეკრანი) + „მეტი“ (ჟესტური ენა, აუდიოაღწერა, ხმა, ტრანსკრიპტი,
 *   სიჩქარე) — §10.
 * - ფაილის გარეშე (`canPlay` = false): კადრის ჩანაცვლება, „ვიდეო ფაილი მზადდება“, ჩართვა —
 *   `aria-disabled` + მიზეზი; ტრანსკრიპტი გახსნილია და იკითხება.
 * - ავტოდაკვრა არასოდეს.
 *
 * გვერდი ფლეიერს `key={video.slug}`-ით სვამს — სხვა ვიდეო = ახალი ფლეიერი.
 *
 * @param {object} props
 * @param {Video} props.video
 * @param {VideoSourceAdapter} [props.source]          ნაგულისხმევი `resolveSource(video)`
 * @param {'full' | 'compact'} [props.layout]          ტესტი / `/__kit`; ნაგულისხმევად — სიგანით
 * @param {import('react').RefObject<HTMLDivElement | null>} [props.playerRef]  ფოკუსისთვის (`?video=`)
 * @param {'h2' | 'h3' | 'h4'} [props.transcriptHeadingLevel='h3']
 * @param {string} [props.className]
 */
export default function VideoPlayer({
  video,
  source,
  layout: forcedLayout,
  playerRef,
  transcriptHeadingLevel = 'h3',
  className,
}) {
  const adapter = source ?? resolveSource(video);
  const playable = adapter.canPlay(video);
  const MediaView = adapter.Media;

  const [controller, setController] = useState(/** @type {PlaybackController | null} */ (null));
  const playback = usePlayback(controller);
  const [prefs, setPrefs] = usePlayerPrefs();
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const moreButtonRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const layout = usePlayerLayout(rootRef, forcedLayout);
  const compact = layout === 'compact';

  const baseId = useId();
  const ids = {
    transcript: `${baseId}-transcript`,
    hint: `${baseId}-hint`,
    more: `${baseId}-more`,
    pending: `${baseId}-pending`,
    volume: `${baseId}-volume`,
    speed: `${baseId}-speed`,
    noteCaptions: `${baseId}-note-cc`,
    noteSign: `${baseId}-note-sign`,
    noteAd: `${baseId}-note-ad`,
  };

  const [transcriptOpen, setTranscriptOpen] = useState(!playable);
  const [moreOpen, setMoreOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  const hasCaptions = video.captions.some((track) => track.src);
  const hasSign = Boolean(video.signLanguage?.src);
  const hasAd = Boolean(video.audioDescription?.src);
  const captionsOn = playable && hasCaptions && prefs.captions;
  const signOn = playable && hasSign && prefs.sign;
  const adOn = playable && hasAd && prefs.audioDescription;

  useEffect(() => controller?.setCaptions(captionsOn), [controller, captionsOn]);
  useEffect(() => controller?.setSignLanguage(signOn), [controller, signOn]);
  useEffect(() => controller?.setAudioDescription(adOn), [controller, adOn]);
  useEffect(() => controller?.setRate(prefs.rate), [controller, prefs.rate]);
  useEffect(() => (controller ? controller.onCaption(setCaption) : undefined), [controller]);

  /* ─── სრული ეკრანი ─── */
  const canFullscreen =
    playable && typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) quiet(document.exitFullscreen());
    else quiet(rootRef.current?.requestFullscreen());
  };

  /* ─── მოქმედებები ─── */
  const paused = playback.paused || playback.ended;
  const togglePlay = useCallback(
    (/** @type {boolean} */ announce = false) => {
      if (!controller) return;
      if (paused) quiet(controller.play());
      else controller.pause();
      if (announce)
        setAnnouncement(t(paused ? 'player.announce.playing' : 'player.announce.paused'));
    },
    [controller, paused],
  );
  const toggleMute = (/** @type {boolean} */ announce = false) => {
    if (!controller) return;
    controller.setMuted(!playback.muted);
    if (announce)
      setAnnouncement(t(playback.muted ? 'player.announce.unmuted' : 'player.announce.muted'));
  };
  const toggleCaptions = (/** @type {boolean} */ announce = false) => {
    if (!hasCaptions) return;
    setPrefs({ captions: !prefs.captions });
    if (announce) {
      setAnnouncement(
        t(prefs.captions ? 'player.announce.captionsOff' : 'player.announce.captionsOn'),
      );
    }
  };
  /** @param {number} seconds @param {boolean} [announce] */
  const seek = (seconds, announce = false) => {
    controller?.seek(seconds);
    if (announce) setAnnouncement(t('player.announce.seek', { time: formatDuration(seconds) }));
  };

  /* ─── კლავიატურა: მხოლოდ ფლეიერის შიგნით ─── */
  const onKey = useEffectEvent((/** @type {KeyboardEvent} */ event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = /** @type {HTMLElement} */ (event.target);
    if (event.key === 'Escape' && moreOpen) {
      event.preventDefault();
      setMoreOpen(false);
      moreButtonRef.current?.focus();
      return;
    }
    if (!playable || target.closest(FIELD)) return;
    const control = target.closest('button, a, [role="switch"], [role="slider"]');
    const code = event.code || event.key;
    if (code === 'KeyK' || ((code === 'Space' || event.key === ' ') && !control)) {
      togglePlay(true);
    } else if (
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      !target.closest('[role="slider"]')
    ) {
      const delta = event.key === 'ArrowLeft' ? -SEEK_STEP : SEEK_STEP;
      seek(playback.currentTime + delta, true);
    } else if (code === 'KeyM') {
      toggleMute(true);
    } else if (code === 'KeyC') {
      toggleCaptions(true);
    } else {
      return;
    }
    event.preventDefault();
  });
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    /** @param {KeyboardEvent} event */
    const onKeyDown = (event) => onKey(event);
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, []);

  /** გარე ref (გვერდი ფოკუსს `?video=`-ზე აქ გადაიტანს) + საკუთარი */
  const setRoot = useCallback(
    (/** @type {HTMLDivElement | null} */ node) => {
      rootRef.current = node;
      if (playerRef) playerRef.current = node;
    },
    [playerRef],
  );

  /* ─── მიუწვდომელი ფუნქციის მიზეზი ─── */
  const notes = playable
    ? [
        !hasCaptions && { id: ids.noteCaptions, text: t('player.captionsMissing') },
        !hasSign && { id: ids.noteSign, text: t('player.signMissing') },
        !hasAd && { id: ids.noteAd, text: t('player.adMissing') },
      ].filter(Boolean)
    : [];
  /** @param {boolean} available @param {string} noteId */
  const unavailable = (available, noteId) =>
    available ? {} : { 'aria-disabled': /** @type {const} */ ('true'), 'aria-describedby': noteId };

  const playButton = (
    <IconButton
      icon={paused ? 'play' : 'pause'}
      label={paused ? t('player.play') : t('player.pause')}
      variant="primary"
      className="mc-player__play"
      onClick={() => playable && togglePlay()}
      aria-disabled={playable ? undefined : 'true'}
      aria-describedby={playable ? undefined : ids.pending}
    />
  );
  const fullscreenButton = canFullscreen && (
    <IconButton
      icon={fullscreen ? 'fullscreen-exit' : 'fullscreen'}
      label={fullscreen ? t('player.exitFullscreen') : t('player.fullscreen')}
      variant="ghost"
      size="sm"
      onClick={toggleFullscreen}
    />
  );
  const transcriptToggle = (
    <button
      type="button"
      className="mc-chip mc-player__chip"
      aria-expanded={transcriptOpen}
      aria-controls={ids.transcript}
      onClick={() => setTranscriptOpen((open) => !open)}
    >
      <Icon name="transcript" size="1.125em" />
      <span>{t('player.transcript')}</span>
      <Icon name="chevron-down" size="1.125em" className="mc-player__chevron" />
    </button>
  );
  const speedSelect = (
    <span className="mc-player__speed">
      <label htmlFor={ids.speed} className="sr-only">
        {t('player.speed')}
      </label>
      <select
        id={ids.speed}
        className="mc-player__select"
        value={String(prefs.rate)}
        onChange={(event) => setPrefs({ rate: Number(event.target.value) })}
      >
        {RATES.map((rate) => (
          <option key={rate} value={String(rate)}>
            {rateLabel(rate)}
          </option>
        ))}
      </select>
    </span>
  );
  const volumeValue = Math.round((playback.muted ? 0 : playback.volume) * 100);

  return (
    <div className={cx('mc-player-wrap', className)}>
      <div
        ref={setRoot}
        role="region"
        aria-label={t('player.region', { title: video.title })}
        aria-describedby={playable ? ids.hint : ids.pending}
        tabIndex={-1}
        data-route-focus=""
        data-theme="dark"
        data-layout={layout}
        className="mc-player"
      >
        <div className="mc-player__stage">
          {playable ? (
            <MediaView video={video} onController={setController} signVisible={signOn} />
          ) : (
            <Media image={video.poster} ratio="16:9" kind="poster" className="mc-player__poster" />
          )}
          {playable && (
            // მაუსის / შეხების სამიზნე მთელ კადრზე; კლავიატურას აქვს „ჩართვა“ ღილაკი და Space / K
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="mc-player__surface"
              onClick={() => togglePlay()}
            >
              {!playback.started && (
                <span className="mc-player__big-play">
                  <Icon name="play" size="2.5rem" />
                </span>
              )}
            </button>
          )}
          {captionsOn && caption && (
            <div className="mc-player__captions" data-sign={signOn || undefined}>
              <p className="mc-player__caption">{caption}</p>
            </div>
          )}
        </div>

        <div role="group" aria-label={t('player.label')} className="mc-player__controls">
          {playable ? (
            <>
              <div className="mc-player__row mc-player__row--main">
                {!compact && playButton}
                <ProgressSlider
                  currentTime={playback.currentTime}
                  duration={playback.duration || video.duration}
                  onSeek={(seconds) => seek(seconds)}
                />
                <span className="mc-player__time">
                  {t('player.time', {
                    current: formatDuration(playback.currentTime),
                    total: formatDuration(playback.duration || video.duration),
                  })}
                </span>
                {!compact && (
                  <span className="mc-player__volume-group">
                    <IconButton
                      icon={playback.muted ? 'volume-off' : 'listen'}
                      label={t('player.mute')}
                      pressed={playback.muted}
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMute()}
                    />
                    <label htmlFor={ids.volume} className="sr-only">
                      {t('player.volume')}
                    </label>
                    <input
                      id={ids.volume}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={volumeValue}
                      aria-valuetext={t('player.volumeValue', { value: volumeValue })}
                      className="mc-player__volume"
                      onChange={(event) => controller?.setVolume(Number(event.target.value) / 100)}
                    />
                  </span>
                )}
              </div>
              <div className="mc-player__row mc-player__row--tools">
                {compact && playButton}
                {compact ? (
                  <Chip
                    pressed={captionsOn}
                    className="mc-player__chip"
                    onClick={() => toggleCaptions()}
                    {...unavailable(hasCaptions, ids.noteCaptions)}
                  >
                    {/* label-in-name: ხილული „CC“ სახელის თავშია — „CC სუბტიტრები“ */}
                    {t('player.captionsShort')}{' '}
                    <VisuallyHidden>{t('player.captions')}</VisuallyHidden>
                  </Chip>
                ) : (
                  <>
                    <Chip
                      pressed={captionsOn}
                      className="mc-player__chip"
                      onClick={() => toggleCaptions()}
                      {...unavailable(hasCaptions, ids.noteCaptions)}
                    >
                      {t('player.captions')}
                    </Chip>
                    <Chip
                      pressed={signOn}
                      className="mc-player__chip"
                      onClick={() => hasSign && setPrefs({ sign: !prefs.sign })}
                      {...unavailable(hasSign, ids.noteSign)}
                    >
                      {t('player.sign')}
                    </Chip>
                    <Chip
                      pressed={adOn}
                      className="mc-player__chip"
                      onClick={() =>
                        hasAd && setPrefs({ audioDescription: !prefs.audioDescription })
                      }
                      {...unavailable(hasAd, ids.noteAd)}
                    >
                      {t('player.audioDescription')}
                    </Chip>
                    {transcriptToggle}
                  </>
                )}
                <span className="mc-player__spacer" />
                {!compact && speedSelect}
                {fullscreenButton}
                {compact && (
                  <Button
                    ref={moreButtonRef}
                    variant="secondary"
                    size="sm"
                    iconEnd="chevron-down"
                    aria-expanded={moreOpen}
                    aria-controls={ids.more}
                    className="mc-player__more-toggle"
                    onClick={() => setMoreOpen((open) => !open)}
                  >
                    {t('player.more')}
                  </Button>
                )}
              </div>
              {compact && (
                <div
                  id={ids.more}
                  role="group"
                  aria-label={t('player.moreLabel')}
                  hidden={!moreOpen}
                  className="mc-player__more"
                >
                  <Switch
                    checked={signOn}
                    label={t('player.sign')}
                    icon="sign-language"
                    onChange={(on) => setPrefs({ sign: on })}
                    disabled={!hasSign}
                    disabledReason={t('player.signMissing')}
                  />
                  <Switch
                    checked={adOn}
                    label={t('player.audioDescription')}
                    icon="audio-description"
                    onChange={(on) => setPrefs({ audioDescription: on })}
                    disabled={!hasAd}
                    disabledReason={t('player.adMissing')}
                  />
                  <Switch
                    checked={playback.muted}
                    label={t('player.mute')}
                    icon="volume-off"
                    onChange={(on) => controller?.setMuted(on)}
                  />
                  {transcriptToggle}
                  <Select
                    label={t('player.speed')}
                    options={RATES.map((rate) => ({ id: String(rate), label: rateLabel(rate) }))}
                    value={String(prefs.rate)}
                    onChange={(event) => setPrefs({ rate: Number(event.target.value) })}
                  />
                </div>
              )}
              {notes.length > 0 && !compact && (
                <ul className="mc-player__notes" role="list">
                  {notes.map((note) => (
                    <li key={note.id} id={note.id}>
                      {note.text}
                    </li>
                  ))}
                </ul>
              )}
              {notes.length > 0 && compact && (
                <ul className="mc-player__notes" role="list">
                  {notes
                    .filter((note) => note.id === ids.noteCaptions)
                    .map((note) => (
                      <li key={note.id} id={note.id}>
                        {note.text}
                      </li>
                    ))}
                </ul>
              )}
            </>
          ) : (
            <div className="mc-player__row mc-player__row--pending">
              {playButton}
              <p id={ids.pending} className="mc-player__pending">
                {t('player.pendingText')}
              </p>
              {transcriptToggle}
            </div>
          )}
        </div>
        <LiveRegion alert>{playback.error ? t('player.mediaError') : ''}</LiveRegion>
        <LiveRegion>{announcement}</LiveRegion>
      </div>
      {playable && (
        <p id={ids.hint} className="mc-player__hint">
          {t('player.keyboardHint')}
        </p>
      )}
      <Transcript
        contentLang={contentLangOf(video)}
        id={ids.transcript}
        lines={video.transcript}
        currentTime={playback.currentTime}
        highlight={playback.started}
        onSeek={playable ? (seconds) => seek(seconds, true) : null}
        hidden={!transcriptOpen}
        headingLevel={transcriptHeadingLevel}
        className="mc-player__transcript"
      />
    </div>
  );
}

/** @param {Promise<void> | void | undefined} promise */
function quiet(promise) {
  if (promise && typeof promise.catch === 'function') promise.catch(() => {});
}

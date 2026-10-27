import { describe, expect, it, vi } from 'vitest';

import {
  createNativeController,
  cueText,
  DRIFT_TOLERANCE,
  stripCueTags,
} from '../native-controller.js';
import { parsePlayerPrefs } from '../player-prefs.js';
import { currentLineIndex, durationAttribute } from '../transcript-utils.js';
import { playerLayoutFor } from '../usePlayback.js';

/** jsdom-ის HTMLMediaElement-ს play/pause არ აქვს — ყალბი ელემენტი EventTarget-ზე. */
class FakeMedia extends EventTarget {
  constructor() {
    super();
    this.paused = true;
    this.ended = false;
    this.currentTime = 0;
    this.duration = 270;
    this.playbackRate = 1;
    this.volume = 1;
    this.muted = false;
    this.readyState = 1;
    /** @type {any[] & EventTarget | null} */
    this.textTracks = null;
    this.play = vi.fn(async () => {
      this.paused = false;
      this.dispatchEvent(new Event('play'));
    });
    this.pause = vi.fn(() => {
      this.paused = true;
      this.dispatchEvent(new Event('pause'));
    });
  }
}

class FakeTrack extends EventTarget {
  constructor() {
    super();
    this.kind = 'captions';
    this.language = 'ka';
    this.mode = 'showing';
    /** @type {{ text: string }[]} */
    this.activeCues = [];
  }
}

function setup() {
  const video = new FakeMedia();
  const sign = new FakeMedia();
  const audio = new FakeMedia();
  const track = new FakeTrack();
  const list = Object.assign(new EventTarget(), { 0: track, length: 1 });
  video.textTracks = /** @type {any} */ (list);
  const controller = createNativeController({
    video: /** @type {any} */ (video),
    sign: /** @type {any} */ (sign),
    audio: /** @type {any} */ (audio),
    fallbackDuration: 270,
  });
  return { video, sign, audio, track, controller };
}

describe('native controller', () => {
  it('სუბტიტრი: ბრაუზერის რენდერი გამორთულია (hidden / disabled), cuechange → ტექსტი ტეგების გარეშე', () => {
    const { controller, track } = setup();
    expect(track.mode).toBe('disabled');
    const listener = vi.fn();
    controller.onCaption(listener);
    controller.setCaptions(true);
    expect(track.mode).toBe('hidden');
    track.activeCues = [{ text: '<v [სახელი]>[ფრაზა]</v>' }, { text: '[მეორე &amp; ხაზი]' }];
    track.dispatchEvent(new Event('cuechange'));
    expect(listener).toHaveBeenLastCalledWith('[ფრაზა]\n[მეორე & ხაზი]');
    controller.setCaptions(false);
    expect(track.mode).toBe('disabled');
    expect(listener).toHaveBeenLastCalledWith('');
  });

  it('ჟესტური ენა მიჰყვება: play, pause, seek, სიჩქარე, დრიფტი > 0.3 წმ', async () => {
    const { controller, video, sign } = setup();
    controller.setSignLanguage(true);
    await controller.play();
    expect(sign.play).toHaveBeenCalled();
    controller.seek(42);
    expect(sign.currentTime).toBe(42);
    controller.setRate(1.5);
    video.dispatchEvent(new Event('ratechange'));
    expect(sign.playbackRate).toBe(1.5);
    sign.currentTime = 42 + DRIFT_TOLERANCE / 2;
    video.dispatchEvent(new Event('timeupdate'));
    expect(sign.currentTime).toBe(42 + DRIFT_TOLERANCE / 2); // დასაშვებ ზღვარშია
    sign.currentTime = 45;
    video.dispatchEvent(new Event('timeupdate'));
    expect(sign.currentTime).toBe(42);
    controller.pause();
    expect(sign.pause).toHaveBeenCalled();
    controller.setSignLanguage(false);
    sign.play.mockClear();
    await controller.play();
    expect(sign.play).not.toHaveBeenCalled();
  });

  it('აუდიოაღწერა: მთავარი ჩუმდება, ხმა და „გათიშვა“ აუდიოს ეხება; გამორთვა აბრუნებს', async () => {
    const { controller, video, audio } = setup();
    await controller.play();
    controller.setAudioDescription(true);
    expect(video.muted).toBe(true);
    expect(audio.play).toHaveBeenCalled();
    expect(controller.getState().muted).toBe(false); // მომხმარებლის არჩევანი
    controller.setMuted(true);
    expect(audio.muted).toBe(true);
    controller.setVolume(0.4);
    expect(audio.volume).toBe(0.4);
    expect(controller.getState().muted).toBe(false); // ხმის აწევა გათიშვას ხსნის
    controller.setAudioDescription(false);
    expect(audio.pause).toHaveBeenCalled();
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(0.4);
  });

  it('seek ზღვრებში; destroy მოვლენებს აშორებს', () => {
    const { controller, video } = setup();
    controller.seek(-10);
    expect(video.currentTime).toBe(0);
    controller.seek(9999);
    expect(video.currentTime).toBe(270);
    const listener = vi.fn();
    controller.subscribe(listener);
    controller.destroy();
    video.dispatchEvent(new Event('timeupdate'));
    expect(listener).not.toHaveBeenCalled();
  });

  it('დამხმარეები: cueText, stripCueTags, durationAttribute, currentLineIndex, playerLayoutFor, prefs', () => {
    expect(cueText(null)).toBe('');
    expect(stripCueTags('<c.yellow>ა</c> &lt;ბ&gt;')).toBe('ა <ბ>');
    expect(durationAttribute(83)).toBe('PT1M23S');
    expect(durationAttribute(0)).toBe('PT0S');
    expect(durationAttribute(3600)).toBe('PT1H');
    const lines = [{ start: 0 }, { start: 4 }, { start: 90 }];
    expect(currentLineIndex(/** @type {any} */ (lines), 50)).toBe(1);
    expect(playerLayoutFor(350, 16)).toBe('compact');
    expect(playerLayoutFor(826, 16)).toBe('full');
    expect(playerLayoutFor(826, 32)).toBe('compact'); // 200%
    expect(parsePlayerPrefs(null)).toEqual({
      captions: true,
      sign: true,
      audioDescription: false,
      rate: 1,
    });
    expect(parsePlayerPrefs('{"captions":false,"rate":3}')).toMatchObject({
      captions: false,
      rate: 1,
    });
    expect(parsePlayerPrefs('{')).toMatchObject({ captions: true });
  });
});

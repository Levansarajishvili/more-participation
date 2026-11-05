import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

import { createMockData } from '@/content/mock/data.js';

import { NOW } from '../../ui/__tests__/fixtures.jsx';
import { PLAYER_STORAGE_KEY } from '../player-prefs.js';
import { youtubeSource } from '../sources.js';
import VideoPlayer from '../VideoPlayer.jsx';
import { resetYouTubeApi } from '../youtube-api.js';
import { AUTOPLAY_GRACE_MS, createYouTubeController } from '../youtube-controller.js';

import { YT_STATE, installFakeYouTube } from './fake-youtube.js';

/** ფორმატით სწორი, სატესტო id-ები (რეალური ვიდეო არ არის). */
const ID = 'TestVideo01';
const AD_ID = 'TestVideoAD';
const API = 'https://www.youtube.com/iframe_api';
const VTT = `WEBVTT

00:00:01.000 --> 00:00:04.000
[პირველი ფრაზა]

00:00:05.000 --> 00:00:08.000
[მეორე ფრაზა]
`;

const base = createMockData({ now: NOW }).videos[0];
/** @type {import('@/content/model.js').Video} */
const video = {
  ...base,
  youtube: { id: ID, adId: AD_ID },
  captions: [
    {
      kind: 'captions',
      srclang: 'ka',
      label: 'ქართული',
      src: '/media/test-ka.vtt',
      default: true,
      cues: 2,
      end: 8,
    },
  ],
};
const AXE_OPTIONS = {
  rules: { 'color-contrast': { enabled: false } },
  // iframe-ის შიგთავსი YouTube-ისაა (გარე) — ჩვენი გვერდი მოწმდება
  iframes: false,
};

/** @type {ReturnType<typeof vi.fn>} */
let fetchSpy;
/** @type {ReturnType<typeof installFakeYouTube> | null} */
let yt = null;

beforeEach(() => {
  localStorage.clear();
  resetYouTubeApi();
  fetchSpy = vi.fn(async () => ({ ok: true, status: 200, text: async () => VTT }));
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => {
  yt?.uninstall();
  yt = null;
  document.querySelectorAll(`script[src="${API}"]`).forEach((node) => node.remove());
  vi.unstubAllGlobals();
});

/**
 * @param {{ subject?: import('@/content/model.js').Video, layout?: 'full' | 'compact' }} [options]
 */
function renderPlayer({ subject = video, layout = 'full' } = {}) {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter>
      <main>
        <button type="button">გარეთ</button>
        <VideoPlayer video={subject} layout={layout} />
      </main>
    </MemoryRouter>,
  );
  const region = screen.getByRole('region', { name: `ვიდეოფლეიერი: ${subject.title}` });
  return { ...view, user, region };
}

const startButton = (title = video.title) =>
  screen.getByRole('button', { name: `ვიდეოს ჩართვა: ${title}` });

/**
 * „ვიდეოს ჩართვა“ → ყალბი API → onReady.
 * @param {ReturnType<typeof userEvent.setup>} user
 * @param {Parameters<typeof installFakeYouTube>[0]} [options]
 */
async function activate(user, options) {
  yt = installFakeYouTube(options);
  await user.click(startButton());
  await waitFor(() => expect(yt?.players).toHaveLength(1));
  const player = /** @type {NonNullable<typeof yt>} */ (yt).last;
  act(() => player.ready());
  return player;
}

describe('F10: YouTube facade', () => {
  it('დაჭერამდე: კადრი (alt="") + „ვიდეოს ჩართვა: {სათაური}“; iframe და IFrame API-ის სკრიპტი არ არის; ქსელი არ არის', () => {
    const { region } = renderPlayer();
    expect(document.querySelector('iframe')).toBeNull();
    expect(document.querySelector(`script[src="${API}"]`)).toBeNull();
    const button = startButton();
    expect(button).toHaveTextContent('ვიდეოს ჩართვა');
    expect(region).toHaveAccessibleDescription(/youtube-nocookie\.com/);
    const poster = /** @type {HTMLImageElement} */ (region.querySelector('img'));
    expect(poster).toHaveAttribute('src', `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`);
    expect(poster).toHaveAttribute('alt', '');
    // ჟესტური ენის ჩიპი YouTube-ზე არ არის; მართვა დაჭერამდე არ ჩანს
    expect(screen.queryByRole('button', { name: 'ჟესტური ენა' })).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('კადრი: maxres-ის ნაცრისფერი ჩანაცვლება (≤ 120px) → hqdefault', () => {
    const { region } = renderPlayer();
    const poster = /** @type {HTMLImageElement} */ (region.querySelector('img'));
    Object.defineProperty(poster, 'naturalWidth', { value: 120 });
    act(() => {
      poster.dispatchEvent(new Event('load'));
    });
    expect(region.querySelector('img')).toHaveAttribute(
      'src',
      `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    );
  });

  it('დაჭერის შემდეგ: სკრიპტი ერთხელ ემატება; iframe — youtube-nocookie.com, title „ვიდეო: …“, tabindex=-1, Referer-ის პოლიტიკა; ფოკუსი „ჩართვაზე“', async () => {
    const { user } = renderPlayer();
    await user.click(startButton());
    expect(document.querySelectorAll(`script[src="${API}"]`)).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^(ჩართვა|პაუზა)$/ })).toHaveFocus();
    yt = installFakeYouTube();
    await act(async () => {
      /** @type {any} */ (window).onYouTubeIframeAPIReady();
    });
    const player = yt.last;
    const frame = /** @type {HTMLIFrameElement} */ (document.querySelector('iframe'));
    expect(frame.getAttribute('src')).toMatch(
      new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${ID}\\?`),
    );
    expect(frame).toHaveAttribute('title', `ვიდეო: ${video.title}`);
    expect(frame).toHaveAttribute('tabindex', '-1');
    expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(player.options.playerVars).toMatchObject({
      enablejsapi: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      playsinline: 1,
      iv_load_policy: 3,
      autoplay: 0,
    });
    expect(player.options.playerVars).not.toHaveProperty('cc_load_policy');
    expect(player.options.host).toBe('https://www.youtube-nocookie.com');
    // მომხმარებლის ქმედება (facade) → playVideo ერთხელ, მხოლოდ onReady-ის შემდეგ
    expect(player.calls).toEqual([]);
    act(() => player.ready());
    expect(player.calls.filter(([name]) => name === 'playVideo')).toHaveLength(1);
    expect(await screen.findByRole('button', { name: 'პაუზა' })).toBeInTheDocument();
    // ჩვენი VTT — same-origin; YouTube-ის API-ს მოთხოვნა (oEmbed / Data API) არ არის
    expect(fetchSpy).toHaveBeenCalledWith('/media/test-ka.vtt', { credentials: 'same-origin' });
    expect(fetchSpy.mock.calls.every(([url]) => !/youtube|ytimg/.test(String(url)))).toBe(true);
  });

  it('სუბტიტრი: ზოლში კადრის ქვეშ (iframe-ზე არა), დროს მიჰყვება ±250 ms; CC და C გამორთავს', async () => {
    const { user, region } = renderPlayer();
    const player = await activate(user);
    act(() => {
      player.time = 1.5;
      player.setState(YT_STATE.PLAYING);
    });
    const band = /** @type {HTMLElement} */ (region.querySelector('.mc-player__band'));
    await waitFor(() => expect(band).toHaveTextContent('[პირველი ფრაზა]'), { timeout: 1000 });
    expect(band.closest('.mc-player__stage')).toBeNull();
    expect(player.iframe.contains(band)).toBe(false);
    act(() => {
      player.time = 5.2;
    });
    await waitFor(() => expect(band).toHaveTextContent('[მეორე ფრაზა]'), { timeout: 600 });
    await user.click(screen.getByRole('button', { name: 'სუბტიტრები' }));
    expect(region.querySelector('.mc-player__band')).toBeNull();
    region.focus();
    await user.keyboard('c');
    expect(region.querySelector('.mc-player__band')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(PLAYER_STORAGE_KEY) ?? '{}')).toMatchObject({
      captions: true,
    });
  });

  it('კლავიატურა: facade-ზე K რთავს; შემდეგ K — პაუზა, → +5, M — ხმა, Tab iframe-ში არ შედის', async () => {
    const { user, region } = renderPlayer();
    yt = installFakeYouTube();
    region.focus();
    await user.keyboard('k');
    await waitFor(() => expect(yt?.players).toHaveLength(1));
    const player = yt.last;
    act(() => player.ready());
    act(() => {
      player.time = 10;
      player.setState(YT_STATE.PLAYING);
    });
    region.focus();
    await user.keyboard('k');
    expect(player.calls.at(-1)).toEqual(['pauseVideo']);
    await user.keyboard('{ArrowRight}');
    expect(player.calls.at(-1)).toEqual(['seekTo', 15]);
    await user.keyboard('m');
    expect(player.calls.at(-1)).toEqual(['mute']);
    // Tab-ის რიგი: iframe-ის შემდეგ — ჩვენი მართვა; iframe ფოკუსს არ იღებს
    const tabbable = [...region.querySelectorAll('button, [tabindex], input, select, iframe')]
      .filter((node) => node.getAttribute('tabindex') !== '-1')
      .map((node) => node.tagName);
    expect(tabbable).not.toContain('IFRAME');
  });

  it('ტრანსკრიპტი: „გადასვლა: 00:04“ → seekTo; მიმდინარე სტრიქონი IFrame API-ის დროით', async () => {
    const { user } = renderPlayer();
    const player = await activate(user);
    act(() => player.setState(YT_STATE.PLAYING));
    await user.click(screen.getByRole('button', { name: 'ტრანსკრიპტი' }));
    await user.click(screen.getByRole('button', { name: 'გადასვლა: 00:04' }));
    expect(player.calls).toContainEqual(['seekTo', 4]);
    act(() => {
      player.time = video.transcript[2].start + 1;
    });
    await waitFor(() =>
      expect(document.querySelector('.mc-transcript__line[aria-current="true"]')).toHaveTextContent(
        video.transcript[2].text,
      ),
    );
  });

  it('აუდიოაღწერა: ვერსიის გადართვა იმავე წამზე (დაკვრისას load, პაუზისას cue), aria-pressed, სტატუსი', async () => {
    const { user } = renderPlayer();
    const player = await activate(user);
    act(() => {
      player.time = 42;
      player.setState(YT_STATE.PLAYING);
    });
    const chip = screen.getByRole('button', { name: 'აუდიოაღწერა' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(player.calls).toContainEqual(['loadVideoById', AD_ID, 42]);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('აუდიოაღწერა ჩართულია')).toBeInTheDocument();
    act(() => {
      player.time = 50;
      player.pauseVideo();
    });
    await user.click(chip);
    expect(player.calls).toContainEqual(['cueVideoById', ID, 50]);
    expect(screen.getByText('აუდიოაღწერა გამორთულია')).toBeInTheDocument();
  });

  it('მიუწვდომელი (onError 150): „ვიდეო ამჟამად მიუწვდომელია“ + ტრანსკრიპტი; iframe იხსნება', async () => {
    const { user } = renderPlayer();
    const player = await activate(user);
    act(() => player.fail(150));
    expect(await screen.findAllByText(/ვიდეო ამჟამად მიუწვდომელია/)).not.toHaveLength(0);
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('button', { name: 'ტრანსკრიპტი' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'ჩართვა' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('IFrame API ვერ ჩაიტვირთა (სკრიპტის შეცდომა) → მიუწვდომელია', async () => {
    const { user } = renderPlayer();
    await user.click(startButton());
    const script = /** @type {HTMLScriptElement} */ (
      document.querySelector(`script[src="${API}"]`)
    );
    await act(async () => {
      script.dispatchEvent(new Event('error'));
    });
    expect(await screen.findAllByText(/ვიდეო ამჟამად მიუწვდომელია/)).not.toHaveLength(0);
  });

  it('ბრაუზერმა დაკვრა არ დაუშვა → სტატუსი „დააჭირე „ჩართვას““; ავტოდაკვრა არ მეორდება', async () => {
    const { user } = renderPlayer();
    const player = await activate(user, { blockAutoplay: true });
    await waitFor(
      () => expect(screen.getByText('ვიდეო მზადაა — დააჭირე „ჩართვას“.')).toBeInTheDocument(),
      { timeout: AUTOPLAY_GRACE_MS + 1500 },
    );
    expect(player.calls.filter(([name]) => name === 'playVideo')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'ჩართვა' }));
    expect(player.state).toBe(YT_STATE.PLAYING);
  });

  it('id-ის ჩანაცვლება (mock): ჩართვა aria-disabled + „ვიდეოს ბმული მზადდება“, facade არ არის', () => {
    renderPlayer({ subject: base });
    expect(screen.queryByRole('button', { name: /^ვიდეოს ჩართვა/ })).toBeNull();
    const play = screen.getByRole('button', { name: 'ჩართვა' });
    expect(play).toHaveAttribute('aria-disabled', 'true');
    expect(play).toHaveAccessibleDescription(/ვიდეოს ბმული მზადდება/);
  });

  it('„ვიზუალური ინფორმაცია აუდიოშიცაა“ ვერსიის გარეშე: ჩიპი aria-disabled + მიზეზი; სუბტიტრის გარეშე — CC aria-disabled', async () => {
    const subject = { ...video, youtube: { id: ID }, visualInAudio: true, captions: [] };
    const { user } = renderPlayer({ subject });
    yt = installFakeYouTube();
    await user.click(startButton(subject.title));
    const chip = screen.getByRole('button', { name: 'აუდიოაღწერა' });
    expect(chip).toHaveAttribute('aria-disabled', 'true');
    expect(chip).toHaveAccessibleDescription(/აუდიოაღწერის ცალკე ვერსია არ სჭირდება/);
    expect(screen.getByRole('button', { name: 'სუბტიტრები' })).toHaveAccessibleDescription(
      'სუბტიტრების ფაილი მზადდება.',
    );
  });

  it('კომპაქტური (390): „მეტში“ ჟესტური ენა არ არის; აუდიოაღწერა, ხმა, ტრანსკრიპტი, სიჩქარე', async () => {
    const { user } = renderPlayer({ layout: 'compact' });
    await activate(user);
    await user.click(screen.getByRole('button', { name: 'მეტი' }));
    const panel = screen.getByRole('group', { name: 'მეტი პარამეტრი' });
    expect(within(panel).queryByRole('switch', { name: 'ჟესტური ენა' })).toBeNull();
    expect(within(panel).getByRole('switch', { name: 'აუდიოაღწერა' })).toBeInTheDocument();
    expect(within(panel).getByRole('switch', { name: 'ხმის გათიშვა' })).toBeInTheDocument();
    expect(within(panel).getByRole('combobox', { name: 'სიჩქარე' })).toBeInTheDocument();
  });

  it('axe: facade, ჩართული (iframe-ის შიგთავსი გარეა), მიუწვდომელი, ჩანაცვლება', async () => {
    const facade = renderPlayer();
    expect(await axe(facade.container, AXE_OPTIONS)).toHaveNoViolations();
    const player = await activate(facade.user);
    act(() => player.setState(YT_STATE.PLAYING));
    await facade.user.click(screen.getByRole('button', { name: 'ტრანსკრიპტი' }));
    expect(await axe(facade.container, AXE_OPTIONS)).toHaveNoViolations();
    act(() => player.fail(101));
    await screen.findAllByText(/ვიდეო ამჟამად მიუწვდომელია/);
    expect(await axe(facade.container, AXE_OPTIONS)).toHaveNoViolations();
    facade.unmount();
    const pending = renderPlayer({ subject: base, layout: 'compact' });
    expect(await axe(pending.container, AXE_OPTIONS)).toHaveNoViolations();
  });
});

describe('F10: createYouTubeController (API-ის გარეშე)', () => {
  it('ბრძანებები attach-მდე ინახება: seek → loadVideoById(startSeconds), სიჩქარე, ხმა', () => {
    yt = installFakeYouTube();
    const mount = document.createElement('div');
    document.body.append(mount);
    const controller = createYouTubeController({
      mount,
      videoId: ID,
      frameTitle: 'ვიდეო: [სათაური]',
      fallbackDuration: 270,
    });
    expect(controller.getState()).toMatchObject({ ready: false, loading: true, duration: 270 });
    controller.seek(30);
    controller.setRate(1.5);
    controller.setMuted(true);
    void controller.play();
    controller.attach(/** @type {any} */ (window).YT);
    const player = yt.last;
    act(() => player.ready());
    expect(player.calls).toEqual([
      ['setVolume', 100],
      ['mute'],
      ['setPlaybackRate', 1.5],
      ['loadVideoById', ID, 30],
    ]);
    expect(controller.getState()).toMatchObject({ ready: true, started: true, paused: false });
    controller.destroy();
    expect(player.destroyed).toBe(true);
    expect(mount.childElementCount).toBe(0);
    mount.remove();
  });

  it('youtubeSource: canPlay მხოლოდ ვალიდურ id-ზე; ჟესტური ენა — null; ინგლისურ გვერდზე en VTT', () => {
    expect(youtubeSource.canPlay(video)).toBe(true);
    expect(youtubeSource.canPlay(base)).toBe(false);
    const withEn = {
      ...video,
      captions: [
        ...video.captions,
        {
          kind: 'subtitles',
          srclang: 'en',
          label: 'English',
          src: '/media/en.vtt',
          default: false,
        },
      ],
    };
    const ka = youtubeSource.features?.(withEn, 'ka');
    const en = youtubeSource.features?.(withEn, 'en');
    expect(ka).toMatchObject({ sign: null, audioDescription: true, captionLang: 'ka' });
    expect(en?.captionTrack?.src).toBe('/media/en.vtt');
    expect(youtubeSource.features?.(video, 'en')).toMatchObject({ captionLang: 'ka' });
  });
});

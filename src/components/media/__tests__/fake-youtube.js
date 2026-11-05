/**
 * F10: ყალბი YouTube IFrame Player API (`window.YT`) — sandbox-ში და ტესტში YouTube-ის ქსელი
 * მიუწვდომელია. Player კონტეინერის კვანძს iframe-ით ცვლის (როგორც რეალური API), ბრძანებებს
 * იწერს `calls`-ში და მოვლენებს (`ready`, `setState`, `fail`) ტესტი თავად იძახებს.
 */

export const YT_STATE = Object.freeze({
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
});

/**
 * @param {{ duration?: number, blockAutoplay?: boolean }} [options]
 */
export function installFakeYouTube({ duration = 270, blockAutoplay = false } = {}) {
  /** @type {FakePlayer[]} */
  const players = [];

  class FakePlayer {
    /** @param {HTMLElement} host @param {any} options */
    constructor(host, options) {
      this.options = options;
      this.videoId = options.videoId;
      this.time = 0;
      this.duration = duration;
      this.state = YT_STATE.UNSTARTED;
      this.muted = false;
      this.volume = 100;
      this.rate = 1;
      this.destroyed = false;
      /** @type {unknown[][]} */
      this.calls = [];
      const query = new URLSearchParams(
        Object.entries(options.playerVars ?? {}).map(([k, v]) => [k, String(v)]),
      );
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', `${options.host}/embed/${options.videoId}?${query}`);
      iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
      host.replaceWith(iframe);
      this.iframe = iframe;
      players.push(this);
    }

    getIframe() {
      return this.iframe;
    }
    /** ტესტი: API მზადაა */
    ready() {
      this.options.events?.onReady?.({ target: this });
    }
    /** @param {number} state */
    setState(state) {
      this.state = state;
      this.options.events?.onStateChange?.({ data: state, target: this });
    }
    /** @param {number} code */
    fail(code) {
      this.options.events?.onError?.({ data: code, target: this });
    }
    playVideo() {
      this.calls.push(['playVideo']);
      if (!blockAutoplay || this.calls.filter(([name]) => name === 'playVideo').length > 1) {
        this.setState(YT_STATE.PLAYING);
      }
    }
    pauseVideo() {
      this.calls.push(['pauseVideo']);
      this.setState(YT_STATE.PAUSED);
    }
    /** @param {number} seconds */
    seekTo(seconds) {
      this.calls.push(['seekTo', seconds]);
      this.time = seconds;
    }
    /** @param {{ videoId: string, startSeconds?: number }} p */
    loadVideoById({ videoId, startSeconds = 0 }) {
      this.calls.push(['loadVideoById', videoId, startSeconds]);
      this.videoId = videoId;
      this.time = startSeconds;
      this.setState(YT_STATE.PLAYING);
    }
    /** @param {{ videoId: string, startSeconds?: number }} p */
    cueVideoById({ videoId, startSeconds = 0 }) {
      this.calls.push(['cueVideoById', videoId, startSeconds]);
      this.videoId = videoId;
      this.time = startSeconds;
      this.setState(YT_STATE.CUED);
    }
    getCurrentTime() {
      return this.time;
    }
    getDuration() {
      return this.duration;
    }
    /** @param {number} value */
    setVolume(value) {
      this.calls.push(['setVolume', value]);
      this.volume = value;
    }
    mute() {
      this.calls.push(['mute']);
      this.muted = true;
    }
    unMute() {
      this.calls.push(['unMute']);
      this.muted = false;
    }
    /** @param {number} rate */
    setPlaybackRate(rate) {
      this.calls.push(['setPlaybackRate', rate]);
      this.rate = rate;
      this.options.events?.onPlaybackRateChange?.({ data: rate, target: this });
    }
    getAvailablePlaybackRates() {
      return [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    }
    destroy() {
      this.destroyed = true;
      this.iframe.remove();
    }
  }

  const scope = /** @type {any} */ (window);
  scope.YT = { Player: FakePlayer, PlayerState: YT_STATE };
  return {
    players,
    /** @returns {FakePlayer} */
    get last() {
      return players[players.length - 1];
    },
    uninstall() {
      delete scope.YT;
      delete scope.onYouTubeIframeAPIReady;
    },
  };
}

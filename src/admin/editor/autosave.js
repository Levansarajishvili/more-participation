/** ავტოშენახვის დაყოვნება (ms): 2 წამი debounce; ტესტებში `setAutosaveDelay()`-ით მცირდება. */
let delay = 2000;

export function autosaveDelay() {
  return delay;
}

/** @param {number} ms */
export function setAutosaveDelay(ms) {
  delay = ms;
}

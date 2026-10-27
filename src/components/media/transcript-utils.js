/** @typedef {import('@/content/model.js').TranscriptLine} TranscriptLine */

/**
 * @param {number} seconds
 * @returns {string}  ISO 8601 ხანგრძლივობა `<time datetime>`-ისთვის („PT1M23S“)
 */
export function durationAttribute(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`;
}

/**
 * მიმდინარე სტრიქონი: ბოლო, რომლის `start` ≤ დრო.
 * @param {TranscriptLine[]} lines
 * @param {number} time
 */
export function currentLineIndex(lines, time) {
  let index = -1;
  lines.forEach((line, i) => {
    if (line.start <= time) index = i;
  });
  return index;
}

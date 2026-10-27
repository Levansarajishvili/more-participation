/**
 * WebVTT → ტრანსკრიპტის სტრიქონები (ვიდეოს რედაქტორი: „VTT-დან იმპორტი“). `<v სპიკერი>`-ი speaker-ად
 * იქცევა, დანარჩენი ტეგები იშლება; ერთი cue = ერთი სტრიქონი, `kind: 'speech'`.
 */

/** @param {string} value `00:01:02.500` ან `01:02.500` @returns {number} */
export function parseTimestamp(value) {
  const parts = value.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return Number.NaN;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

/**
 * @param {string} text
 * @returns {import('@/content/model.js').TranscriptLine[]}
 */
export function parseVtt(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  /** @type {import('@/content/model.js').TranscriptLine[]} */
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^\s*([\d:.]+)\s+-->\s+([\d:.]+)/.exec(lines[i]);
    if (!match) continue;
    const start = parseTimestamp(match[1]);
    const body = [];
    for (i += 1; i < lines.length && lines[i].trim() !== ''; i += 1) body.push(lines[i]);
    const raw = body.join(' ');
    const voice = /<v(?:\.[^\s>]+)?\s+([^>]+)>/.exec(raw);
    const clean = raw
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean || Number.isNaN(start)) continue;
    out.push({
      start: Math.round(start * 10) / 10,
      kind: 'speech',
      text: clean,
      ...(voice && { speaker: voice[1].trim() }),
    });
  }
  return out;
}

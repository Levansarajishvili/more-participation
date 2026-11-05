/**
 * F10: WebVTT — ერთი პარსერი ადმინისთვის (სუბტიტრის ატვირთვა, ტრანსკრიპტის იმპორტი), საჯარო
 * ფლეიერისთვის (YouTube-ის ვიდეოს სუბტიტრი ზოლში) და B5-ის სერვერისთვის.
 *
 * `parseCaptions(text)` მკაცრია — ატვირთვისას ფაილი, რომელიც ვერ გაივლის, არ ინახება და შეცდომა
 * სტრიქონის ნომრით ჩანს: თავსართი `WEBVTT`, დროის სტრიქონი `00:00:01.000 --> 00:00:04.000`,
 * დასრულება > დაწყება, cue-ები დაწყების დროით დალაგებულია (WebVTT-ის მოთხოვნა), ერთი cue მაინც.
 * გადაფარული cue-ები დასაშვებია (ორი ერთდროული სტრიქონი). NOTE / STYLE / REGION ბლოკები იშლება.
 */

/**
 * @typedef {object} Cue
 * @property {number} start   წამი
 * @property {number} end     წამი
 * @property {string} text    ტეგების გარეშე; სტრიქონები `\n`-ით
 * @property {string} [speaker]  `<v სახელი>`
 * @property {number} line    დროის სტრიქონის ნომერი ფაილში (1-დან)
 */

/** @typedef {'header' | 'timing' | 'order' | 'empty'} VttErrorCode */

/**
 * @typedef {{ ok: true, cues: Cue[] } | { ok: false, code: VttErrorCode, line: number }} VttResult
 */

/** სუბტიტრის ფაილის ზომის ზღვარი (ადმინი; B5-ში სერვერიც). */
export const VTT_MAX_BYTES = 1024 * 1024;

/** WebVTT-ის დრო: `mm:ss.ttt` ან `hh:mm:ss.ttt` (საათი ≥ 2 ციფრი). */
const TIMESTAMP = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/;

/**
 * მკაცრი დრო → წამი (არასწორი → NaN).
 * @param {string} value
 * @returns {number}
 */
export function parseCueTime(value) {
  const match = TIMESTAMP.exec(value.trim());
  if (!match) return Number.NaN;
  const [, h = '0', m, s, ms] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000;
}

/**
 * თავისუფალი დრო (`00:01:02.500`, `01:02.500`, `62`) → წამი — ტრანსკრიპტის იმპორტისთვის.
 * @param {string} value
 * @returns {number}
 */
export function parseTimestamp(value) {
  const parts = value.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return Number.NaN;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

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
 * @param {string} text
 * @returns {string[]}
 */
function splitLines(text) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
}

/**
 * მკაცრი პარსერი (სუბტიტრი).
 * @param {string} text
 * @returns {VttResult}
 */
export function parseCaptions(text) {
  const lines = splitLines(String(text ?? ''));
  if (!/^WEBVTT(?:[ \t].*)?$/.test(lines[0] ?? '')) return { ok: false, code: 'header', line: 1 };

  /** @type {Cue[]} */
  const cues = [];
  let i = 1;
  // თავსართის ბლოკი პირველ ცარიელ სტრიქონამდე
  while (i < lines.length && lines[i].trim() !== '') i += 1;

  while (i < lines.length) {
    while (i < lines.length && lines[i].trim() === '') i += 1;
    if (i >= lines.length) break;
    const blockStart = i;
    /** @type {string[]} */
    const block = [];
    while (i < lines.length && lines[i].trim() !== '') {
      block.push(lines[i]);
      i += 1;
    }
    if (/^(?:NOTE|STYLE|REGION)(?:[ \t]|$)/.test(block[0])) continue;

    // იდენტიფიკატორი (არასავალდებულო) → დროის სტრიქონი
    const timingIndex = block[0].includes('-->') ? 0 : 1;
    const timing = block[timingIndex] ?? '';
    const lineNo = blockStart + timingIndex + 1;
    const match = /^(\S+)[ \t]+-->[ \t]+(\S+)(?:[ \t]+.*)?$/.exec(timing.trim());
    if (!match) return { ok: false, code: 'timing', line: lineNo };
    const start = parseCueTime(match[1]);
    const end = parseCueTime(match[2]);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return { ok: false, code: 'timing', line: lineNo };
    }
    const previous = cues[cues.length - 1];
    if (previous && start < previous.start) return { ok: false, code: 'order', line: lineNo };

    const raw = block.slice(timingIndex + 1).join('\n');
    const voice = /<v(?:\.[^\s>]+)?\s+([^>]+)>/.exec(raw);
    const clean = raw
      .split('\n')
      .map((part) => stripCueTags(part))
      .filter(Boolean)
      .join('\n');
    cues.push({
      start,
      end,
      text: clean,
      line: lineNo,
      ...(voice && { speaker: voice[1].trim() }),
    });
  }

  if (!cues.length) return { ok: false, code: 'empty', line: lines.length };
  return { ok: true, cues };
}

/**
 * ატვირთული ფაილის მეტა (`CaptionTrack.cues`, `CaptionTrack.end`) — ჩეკლისტი ფაილს თავიდან არ კითხულობს.
 * @param {Cue[]} cues
 * @returns {{ cues: number, end: number }}
 */
export function summarizeCues(cues) {
  return {
    cues: cues.length,
    end: Math.round(cues.reduce((max, cue) => Math.max(max, cue.end), 0) * 1000) / 1000,
  };
}

/**
 * მიმდინარე სუბტიტრი: ყველა cue, რომლის `start ≤ დრო < end` (რამდენიმე — ახალ ხაზზე).
 * @param {Cue[]} cues   დალაგებული `start`-ით
 * @param {number} time
 * @returns {string}
 */
export function cueAt(cues, time) {
  if (!Number.isFinite(time)) return '';
  /** @type {string[]} */
  const active = [];
  for (const cue of cues) {
    if (cue.start > time) break;
    if (time < cue.end && cue.text) active.push(cue.text);
  }
  return active.join('\n');
}

/**
 * VTT → ტრანსკრიპტის სტრიქონები (ვიდეოს რედაქტორი: „VTT-დან იმპორტი“). თავისუფალი რეჟიმი:
 * თავსართის გარეშე ფაილიც იკითხება; `<v სპიკერი>` speaker-ად იქცევა; ერთი cue = ერთი სტრიქონი,
 * `kind: 'speech'`.
 * @param {string} text
 * @returns {import('./model.js').TranscriptLine[]}
 */
export function parseVtt(text) {
  const lines = splitLines(String(text ?? ''));
  /** @type {import('./model.js').TranscriptLine[]} */
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

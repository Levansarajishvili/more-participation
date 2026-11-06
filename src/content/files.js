import { VTT_MAX_BYTES } from './vtt.js';

/**
 * ატვირთული ფაილის ტიპი და ზღვარი (B5) — ერთი წესი სამ ადგილას: სერვერი (`server/routes/media.js`),
 * ადმინის mock და UI-ის წინასწარი შემოწმება (მხოლოდ UX). ტიპი **შიგთავსით** (magic bytes) დგინდება;
 * გაფართოება და ბრაუზერის მიერ გამოცხადებული MIME მხოლოდ შეუსაბამობის საპოვნელად გამოიყენება.
 *
 * დაშვებულია (B0 #7, F10): ფოტო — JPEG, PNG, WebP; დოკუმენტი — PDF; სუბტიტრი — WebVTT.
 * SVG არა (სკრიპტი / XSS), GIF / APNG-ის ანიმაცია არა (5 წამის წესი), აუდიო / ვიდეო არა (ვიდეო
 * მხოლოდ YouTube-ია, F10).
 */

/** @typedef {'image' | 'document' | 'track'} FileKind */
/**
 * @typedef {'fileEmpty' | 'fileType' | 'fileMismatch' | 'fileTooLarge'} FileCheckCode
 *   სერვერი ამას ამატებს: `fileDamaged`, `imageTooLarge`, `vttHeader` / `vttTiming` / `vttOrder` / `vttEmpty`
 */

export const MB = 1024 * 1024;

/** MIME → სახე და გაფართოებები (პირველი — შენახვის გაფართოება). */
export const MEDIA_TYPES = Object.freeze({
  'image/jpeg': Object.freeze({ kind: 'image', extensions: Object.freeze(['jpg', 'jpeg']) }),
  'image/png': Object.freeze({ kind: 'image', extensions: Object.freeze(['png']) }),
  'image/webp': Object.freeze({ kind: 'image', extensions: Object.freeze(['webp']) }),
  'application/pdf': Object.freeze({ kind: 'document', extensions: Object.freeze(['pdf']) }),
  'text/vtt': Object.freeze({ kind: 'track', extensions: Object.freeze(['vtt']) }),
});

/** @type {readonly FileKind[]} */
export const FILE_KINDS = Object.freeze(['image', 'document', 'track']);

/**
 * ნაგულისხმევი ზღვრები — `[MB]`, დასადასტურებელი (სერვერზე env: `MEDIA_MAX_IMAGE_MB`,
 * `MEDIA_MAX_DOCUMENT_MB`); VTT — `vtt.js`-ის 1 MB (F10).
 */
export const DEFAULT_FILE_LIMITS = Object.freeze({
  image: 10 * MB,
  document: 20 * MB,
  track: VTT_MAX_BYTES,
});

/** სურათის პიქსელების ზღვარი (დეკომპრესიის ბომბი, სერვერის მეხსიერება) — `MEDIA_MAX_PIXELS`. */
export const DEFAULT_MAX_PIXELS = 40_000_000;

/** რამდენი ბაიტი სჭირდება `sniffType`-ს. */
export const SNIFF_BYTES = 16;

/** ბრაუზერის / OS-ის სინონიმები. */
const MIME_ALIASES = Object.freeze({
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
  'application/x-pdf': 'application/pdf',
});

/** გამოცხადებული ტიპი, რომელიც არაფერს ამბობს — შეუსაბამობად არ ითვლება. */
const GENERIC_TYPES = new Set(['', 'application/octet-stream', 'binary/octet-stream']);

/**
 * @param {ArrayLike<number>} bytes
 * @param {readonly number[]} signature
 * @param {number} [offset]
 */
function startsWith(bytes, signature, offset = 0) {
  return signature.every((value, i) => bytes[offset + i] === value);
}

const WEBVTT = [0x57, 0x45, 0x42, 0x56, 0x54, 0x54];

/**
 * შიგთავსის ტიპი პირველი ბაიტებით. უცნობი (SVG, GIF, HEIC, HTML, ZIP…) → null.
 * VTT: (UTF-8 BOM) + `WEBVTT` + ჰარი / ტაბი / ახალი ხაზი / ფაილის ბოლო (WebVTT §4.1).
 * @param {ArrayLike<number>} bytes
 * @returns {keyof typeof MEDIA_TYPES | null}
 */
export function sniffType(bytes) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp';
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  const offset = startsWith(bytes, [0xef, 0xbb, 0xbf]) ? 3 : 0;
  if (startsWith(bytes, WEBVTT, offset)) {
    const next = bytes[offset + WEBVTT.length];
    if (next === undefined || next === 0x20 || next === 0x09 || next === 0x0a || next === 0x0d)
      return 'text/vtt';
  }
  return null;
}

/**
 * @param {string} [name]
 * @returns {string}  პატარა ასოებით, წერტილის გარეშე; '' — გაფართოება არ არის
 */
export function fileExtension(name = '') {
  const match = /\.([A-Za-z0-9]{1,10})$/.exec(String(name).trim());
  return match ? match[1].toLowerCase() : '';
}

/**
 * @param {string} [type]
 * @returns {string}
 */
export function normalizeMime(type = '') {
  const base = String(type).split(';')[0].trim().toLowerCase();
  return /** @type {Record<string, string>} */ (MIME_ALIASES)[base] ?? base;
}

/** @param {keyof typeof MEDIA_TYPES} mime */
export const storedExtension = (mime) => MEDIA_TYPES[mime].extensions[0];

/**
 * @typedef {{ ok: true, mime: keyof typeof MEDIA_TYPES, kind: FileKind }
 *   | { ok: false, code: FileCheckCode, max?: number }} FileCheck
 */

/**
 * ფაილის შემოწმება: ცარიელი → ტიპი (შიგთავსით) → გაფართოება / გამოცხადებული MIME ↔ შიგთავსი →
 * ზომა (სახის ზღვრით).
 * @param {{ name?: string, type?: string, size: number, head: ArrayLike<number> }} file
 * @param {{ kinds?: readonly FileKind[], limits?: Readonly<Record<FileKind, number>> }} [options]
 * @returns {FileCheck}
 */
export function checkFile(
  { name = '', type = '', size, head },
  { kinds = FILE_KINDS, limits = DEFAULT_FILE_LIMITS } = {},
) {
  if (!size) return { ok: false, code: 'fileEmpty' };
  const mime = sniffType(head);
  const info = mime ? MEDIA_TYPES[mime] : null;
  if (!mime || !info || !kinds.includes(/** @type {FileKind} */ (info.kind))) {
    return { ok: false, code: 'fileType' };
  }
  const kind = /** @type {FileKind} */ (info.kind);
  const extension = fileExtension(name);
  if (extension && !info.extensions.includes(extension)) return { ok: false, code: 'fileMismatch' };
  const declared = normalizeMime(type);
  const vttAsText = kind === 'track' && declared === 'text/plain';
  if (!GENERIC_TYPES.has(declared) && declared !== mime && !vttAsText) {
    return { ok: false, code: 'fileMismatch' };
  }
  if (size > limits[kind]) return { ok: false, code: 'fileTooLarge', max: limits[kind] };
  return { ok: true, mime, kind };
}

/**
 * `<input type="file" accept>` — MIME-ები და გაფართოებები (Windows-ის ზოგი ბრაუზერი MIME-ს არ იცნობს).
 * @param {readonly FileKind[]} kinds
 * @returns {string}
 */
export function acceptFor(kinds) {
  const entries = Object.entries(MEDIA_TYPES).filter(([, info]) =>
    kinds.includes(/** @type {FileKind} */ (info.kind)),
  );
  return [
    ...entries.map(([mime]) => mime),
    ...entries.flatMap(([, info]) => info.extensions.map((ext) => `.${ext}`)),
  ].join(',');
}

/**
 * Blob-ის პირველი ბაიტები (`File.slice` + `arrayBuffer`; ძველ გარემოში — FileReader).
 * @param {Blob} blob
 * @param {number} [length]
 * @returns {Promise<Uint8Array>}
 */
export async function readHead(blob, length = SNIFF_BYTES) {
  const part = blob.slice(0, length);
  if (typeof part.arrayBuffer === 'function') return new Uint8Array(await part.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(/** @type {ArrayBuffer} */ (reader.result)));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(part);
  });
}

/**
 * ბრაუზერის File-ის შემოწმება (UI და mock).
 * @param {File} file
 * @param {{ kinds?: readonly FileKind[], limits?: Readonly<Record<FileKind, number>> }} [options]
 * @returns {Promise<FileCheck>}
 */
export async function checkBlob(file, options) {
  return checkFile(
    { name: file.name, type: file.type, size: file.size, head: await readHead(file) },
    options,
  );
}

import { crc32 } from 'node:zlib';

import sharp from 'sharp';

import { encodeMultipart } from '../browser.js';

/**
 * B5-ის ტესტის ფაილები. GPS / EXIF ხელითაა აწყობილი (TIFF, little-endian): sharp-ის `withExif` GPS-ის
 * IFD-ს და Orientation-ს არ წერს (შემოწმდა), ამიტომ ფიქსტურა მისგან დამოუკიდებელია.
 */

/** მოწყობილობის სახელი EXIF-ში — გამოსავალში არ უნდა დარჩეს. */
export const CAMERA = 'TestCam'; // 7 სიმბოლო + NUL = 8 ბაიტი (IFD0-ის განლაგება)
/** PNG-ის / WebP-ის ტექსტური მეტამონაცემი (მისამართის ტიპის კვალი). */
export const SECRET_NOTE = 'GPS 41.7151N 44.8271E';

/**
 * TIFF (EXIF): IFD0 — Make, Orientation = 6 (90°), GPSInfo → GPS IFD (თბილისი, 41°43′N 44°47′E).
 * @returns {Buffer}
 */
export function exifTiff() {
  const out = Buffer.alloc(160);
  out.write('II', 0, 'latin1');
  out.writeUInt16LE(42, 2);
  out.writeUInt32LE(8, 4);
  /** @param {number} at @param {number} tag @param {number} type @param {number} count @param {number} value */
  const entry = (at, tag, type, count, value) => {
    out.writeUInt16LE(tag, at);
    out.writeUInt16LE(type, at + 2);
    out.writeUInt32LE(count, at + 4);
    out.writeUInt32LE(value, at + 8);
  };
  // IFD0: 3 ჩანაწერი (8 → 50), Make-ის ტექსტი 50 → 58
  out.writeUInt16LE(3, 8);
  entry(10, 0x010f, 2, CAMERA.length + 1, 50);
  entry(22, 0x0112, 3, 1, 6);
  entry(34, 0x8825, 4, 1, 58);
  out.writeUInt32LE(0, 46);
  out.write(`${CAMERA}\0`, 50, 'latin1');
  // GPS IFD: 4 ჩანაწერი (58 → 112), რაციონალები 112 / 136
  out.writeUInt16LE(4, 58);
  entry(60, 0x0001, 2, 2, 0x4e); // 'N'
  entry(72, 0x0002, 5, 3, 112);
  entry(84, 0x0003, 2, 2, 0x45); // 'E'
  entry(96, 0x0004, 5, 3, 136);
  out.writeUInt32LE(0, 108);
  [41, 1, 43, 1, 0, 1, 44, 1, 47, 1, 0, 1].forEach((n, i) => out.writeUInt32LE(n, 112 + i * 4));
  return out;
}

/** @param {number} width @param {number} height */
const canvas = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: '#0B2545' } });

/**
 * JPEG 300 × 200 + APP1 EXIF (GPS, Make, Orientation 6) + COM-სეგმენტი.
 * @returns {Promise<Buffer>}
 */
export async function jpegWithGps() {
  const base = await canvas(300, 200).jpeg().toBuffer();
  const tiff = exifTiff();
  const app1 = Buffer.alloc(4 + 6 + tiff.length);
  app1.writeUInt16BE(0xffe1, 0);
  app1.writeUInt16BE(2 + 6 + tiff.length, 2);
  app1.write('Exif\0\0', 4, 'latin1');
  tiff.copy(app1, 10);
  const note = Buffer.from(SECRET_NOTE, 'latin1');
  const com = Buffer.alloc(4 + note.length);
  com.writeUInt16BE(0xfffe, 0);
  com.writeUInt16BE(2 + note.length, 2);
  note.copy(com, 4);
  return Buffer.concat([base.subarray(0, 2), app1, com, base.subarray(2)]);
}

/**
 * @param {string} type
 * @param {Buffer} data
 */
function pngChunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/**
 * PNG 160 × 90 (16:9) + `eXIf` (GPS) + `tEXt` (კომენტარი).
 * @returns {Promise<Buffer>}
 */
export async function pngWithGps() {
  const base = await canvas(160, 90).png().toBuffer();
  const afterIhdr = 8 + 25;
  return Buffer.concat([
    base.subarray(0, afterIhdr),
    pngChunk('eXIf', exifTiff()),
    pngChunk('tEXt', Buffer.from(`Comment\0${SECRET_NOTE}`, 'latin1')),
    base.subarray(afterIhdr),
  ]);
}

/**
 * WebP 120 × 120 + EXIF (sharp-ის `withExif` — IFD0-ის ტექსტი) + XMP.
 * @returns {Promise<Buffer>}
 */
export async function webpWithExif() {
  return canvas(120, 120)
    .webp()
    .withExif({ IFD0: { Make: CAMERA, ImageDescription: SECRET_NOTE } })
    .withXmp(
      `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description>${SECRET_NOTE}</rdf:Description></rdf:RDF></x:xmpmeta>`,
    )
    .toBuffer();
}

/** მინიმალური ვალიდური PDF. */
export const PDF = Buffer.from(
  [
    '%PDF-1.7',
    '1 0 obj << /Type /Catalog /Pages 2 0 R /Lang (ka) >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj',
    'trailer << /Root 1 0 R >>',
    '%%EOF',
    '',
  ].join('\n'),
  'latin1',
);

export const VTT = [
  'WEBVTT',
  '',
  '00:00:01.000 --> 00:00:03.500',
  'გამარჯობა — ეს სატესტო სუბტიტრია.',
  '',
  '00:00:04.000 --> 00:00:07.250',
  'მეორე სტრიქონი.',
  '',
].join('\n');

/** დროის სტრიქონი შეცდომით — მე-3 სტრიქონი. */
export const BAD_VTT = ['WEBVTT', '', '00:00:05.000 --> 00:00:04.000', 'უკუღმა', ''].join('\n');

/**
 * multipart სხეული `app.inject`-ისთვის (ბრაუზერის FormData-ს იგივე ფორმა).
 * @param {{ name: string, type?: string, data: Buffer | string } | null} file
 * @param {Record<string, string>} [fields]
 * @returns {Promise<{ payload: Buffer, headers: Record<string, string> }>}
 */
export async function multipart(file, fields = {}) {
  const form = new FormData();
  if (file) {
    form.append(
      'file',
      new File([typeof file.data === 'string' ? file.data : new Uint8Array(file.data)], file.name, {
        type: file.type ?? '',
      }),
    );
  }
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const { body, type } = await encodeMultipart(form);
  return { payload: Buffer.from(body), headers: { 'content-type': type } };
}

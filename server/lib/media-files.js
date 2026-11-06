import sharp from 'sharp';

import { fileError } from '@/admin/api/library.js';
import { RATIOS } from '@/content/model.js';
import { parseCaptions, summarizeCues } from '@/content/vtt.js';

/**
 * ატვირთული ფაილის დამუშავება სერვერზე (B5) — ტიპი უკვე შიგთავსით დადგენილია (`files.js`).
 *
 * **ფოტო** ყოველთვის ხელახლა იკოდირდება (`sharp`, libvips):
 * - EXIF (GPS, მოწყობილობა, დრო), XMP, IPTC, კომენტარი და ICC იშლება — მონაწილეების
 *   კონფიდენციალურობა; ფერი → sRGB; EXIF-ის ორიენტაცია ჯერ პიქსელებზე აისახება (`rotate()`);
 * - ანიმაციიდან (WebP) მხოლოდ პირველი კადრი რჩება — თავისით მოძრავი არაფერი (5 წამის წესი);
 * - polyglot / ფაილის ბოლოს მიწერილი შიგთავსი ხელახალ კოდირებას ვერ გადაურჩება;
 * - ზომა და პროპორცია ინახება — ფაილი არ იჭრება და არ მცირდება (ზომის ვარიანტები B0-ში არ
 *   გადაწყვეტილა).
 *
 * **PDF** — სათავე `%PDF-n.n` და `%%EOF` ბოლო 1024 ბაიტში (შეწყვეტილი ატვირთვა); შიგთავსი უცვლელია.
 * **VTT** — UTF-8 (მკაცრი) + `vtt.js`-ის `parseCaptions` (რედაქტორის იგივე წესი, სტრიქონის ნომრით).
 *
 * შეცდომა — 400 `bad-request` + `fields.file` (`library.js` → `fileError`).
 */

// დამუშავებული სურათი ქეშში არ რჩება — მეხსიერება (Render Starter — 512 MB)
sharp.cache(false);

/** sharp-ის ფორმატი ↔ MIME. */
const FORMAT = Object.freeze({
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
});

/**
 * სურათები რიგით მუშავდება (ერთდროულად ერთი) — 40 MP გაშლილი ≈ 120 MB.
 * @type {Promise<unknown>}
 */
let queue = Promise.resolve();

/**
 * @template T
 * @param {() => Promise<T>} work
 * @returns {Promise<T>}
 */
function serial(work) {
  const run = queue.then(work, work);
  queue = run.catch(() => {});
  return run;
}

/**
 * ზუსტი პროპორცია (±1%) `RATIOS`-იდან, სხვაგვარად null — ფაილი არ იჭრება, ჩარჩოს რედაქტორი ირჩევს.
 * @param {number} width
 * @param {number} height
 * @returns {import('@/content/model.js').Ratio | null}
 */
export function detectRatio(width, height) {
  if (!width || !height) return null;
  const actual = width / height;
  const found = RATIOS.find((ratio) => {
    const [w, h] = ratio.split(':').map(Number);
    return Math.abs(actual - w / h) / (w / h) <= 0.01;
  });
  return found ?? null;
}

/**
 * @param {Buffer} buffer
 * @param {{ mime: 'image/jpeg' | 'image/png' | 'image/webp', maxPixels: number }} options
 * @returns {Promise<{ data: Buffer, width: number, height: number }>}
 */
export function processImage(buffer, { mime, maxPixels }) {
  return serial(async () => {
    /** @type {import('sharp').Metadata} */
    let meta;
    try {
      meta = await sharp(buffer, { limitInputPixels: false }).metadata();
    } catch {
      throw fileError('fileDamaged');
    }
    if (meta.format !== FORMAT[mime] || !meta.width || !meta.height) throw fileError('fileDamaged');
    if (meta.width * meta.height > maxPixels) {
      throw fileError('imageTooLarge', { megapixels: Math.floor(maxPixels / 1_000_000) });
    }
    // metadata-ს შენარჩუნება (`keepMetadata`, `withMetadata`) განზრახ არ არის
    const pipeline = sharp(buffer, { limitInputPixels: maxPixels, failOn: 'error' }).rotate();
    const encoded =
      mime === 'image/jpeg'
        ? pipeline.jpeg({ quality: 85, mozjpeg: true })
        : mime === 'image/png'
          ? pipeline.png({ compressionLevel: 9, adaptiveFiltering: true })
          : pipeline.webp({ quality: 85 });
    try {
      const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
      return { data, width: info.width, height: info.height };
    } catch {
      throw fileError('fileDamaged');
    }
  });
}

/**
 * @param {Buffer} buffer
 */
export function checkPdf(buffer) {
  const head = buffer.subarray(0, 16).toString('latin1');
  const tail = buffer.subarray(Math.max(0, buffer.length - 1024)).toString('latin1');
  if (!/^%PDF-\d\.\d/.test(head) || !tail.includes('%%EOF')) throw fileError('fileDamaged');
}

/**
 * @param {Buffer} buffer
 * @returns {{ cues: number, end: number }}
 */
export function checkVtt(buffer) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw fileError('fileDamaged');
  }
  const result = parseCaptions(text);
  if (!result.ok) {
    const code = `vtt${result.code[0].toUpperCase()}${result.code.slice(1)}`;
    throw fileError(code, { line: result.line });
  }
  return summarizeCues(result.cues);
}

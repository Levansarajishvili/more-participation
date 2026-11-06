import { createHash, createHmac } from 'node:crypto';

/**
 * AWS Signature Version 4 — S3-თავსებადი API-სთვის (Cloudflare R2, B0 #7). `@aws-sdk/client-s3`-ის
 * ნაცვლად (B5): საჭიროა ოთხი ოპერაცია (PUT / GET / HEAD / DELETE), SDK კი ~90 პაკეტს მოაქვს,
 * რომელთა `^`-დიაპაზონი ყოველდღე ახალ ვერსიაზე იხსნება — „≥ 14 დღის“ წესით ჩაკეტვა შეუძლებელია.
 *
 * სპეციფიკაცია: docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html — header-ით
 * ხელმოწერა, `x-amz-content-sha256` (payload-ის hash), path-style მისამართი. ტესტი — AWS-ის
 * დოკუმენტაციის მაგალითი („GET Object“) ზუსტი ხელმოწერით.
 */

export const ALGORITHM = 'AWS4-HMAC-SHA256';
export const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/** @param {string | Buffer | Uint8Array} data */
export const sha256Hex = (data) => createHash('sha256').update(data).digest('hex');

/**
 * @param {string | Buffer} key
 * @param {string} data
 */
const hmac = (key, data) => createHmac('sha256', key).update(data, 'utf8').digest();

/**
 * URI-ის კოდირება (RFC 3986 unreserved ხელუხლებელია). S3-ში გზა ერთხელ იკოდირება, `/` რჩება.
 * @param {string} value
 * @param {boolean} [keepSlash]
 */
export function uriEncode(value, keepSlash = false) {
  return [...Buffer.from(value, 'utf8')]
    .map((byte) => {
      const char = String.fromCharCode(byte);
      if (/[A-Za-z0-9\-._~]/.test(char) || (keepSlash && char === '/')) return char;
      return `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    })
    .join('');
}

/**
 * @param {Date} date
 * @returns {{ amzDate: string, day: string }}  `20130524T000000Z`, `20130524`
 */
export function amzDates(date) {
  const amzDate = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return { amzDate, day: amzDate.slice(0, 8) };
}

/**
 * @typedef {object} SignInput
 * @property {string} method
 * @property {string} host                  `examplebucket.s3.amazonaws.com` (პორტით, თუ არასტანდარტულია)
 * @property {string} path                  დაუკოდირებელი (`/bucket/key with space.jpg`)
 * @property {Record<string, string>} [query]
 * @property {Record<string, string>} [headers]  ხელმოსაწერი დამატებითი header-ები (`range`, `content-type`…)
 * @property {string} payloadHash           `sha256Hex(body)` ან `EMPTY_SHA256`
 * @property {Date} date
 * @property {string} region                R2 — `auto`
 * @property {string} [service]             `s3`
 * @property {string} accessKeyId
 * @property {string} secretAccessKey
 */

/**
 * @param {SignInput} input
 * @returns {{ headers: Record<string, string>, canonicalRequest: string, stringToSign: string, signature: string }}
 *   `headers` — მოთხოვნაზე დასადები (`authorization`, `x-amz-date`, `x-amz-content-sha256` + ხელმოწერილი)
 */
export function signRequest({
  method,
  host,
  path,
  query = {},
  headers = {},
  payloadHash,
  date,
  region,
  service = 's3',
  accessKeyId,
  secretAccessKey,
}) {
  const { amzDate, day } = amzDates(date);
  /** @type {Record<string, string>} */
  const all = {
    host,
    ...Object.fromEntries(
      Object.entries(headers).map(([name, value]) => [name.toLowerCase(), String(value).trim()]),
    ),
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const names = Object.keys(all).sort();
  const canonicalHeaders = names.map((name) => `${name}:${all[name]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((key) => `${uriEncode(key)}=${uriEncode(query[key])}`)
    .join('&');
  const canonicalRequest = [
    method.toUpperCase(),
    uriEncode(path, true),
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), region), service),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
  const { host: _host, ...sent } = all;
  return {
    headers: {
      ...sent,
      authorization: `${ALGORITHM} Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    canonicalRequest,
    stringToSign,
    signature,
  };
}

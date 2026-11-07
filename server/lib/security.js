import helmet from '@fastify/helmet';

import { ContentError } from '@/content/errors.js';

/**
 * უსაფრთხოების header-ები და CORS-ის პოლიტიკა (§12, B0 #4, #5).
 *
 * - CORS არ არის: ერთი origin, `Access-Control-*` header არ იგზავნება — სხვა საიტიდან ბრაუზერი
 *   პასუხს ვერ წაიკითხავს, `application/json` POST კი preflight-ს (OPTIONS → 404) ვერ გაივლის.
 * - `text/plain` parser ამოღებულია: ასეთი სხეული „მარტივი მოთხოვნაა“ (preflight-ის გარეშე) და
 *   CSRF-ის კარს ხსნიდა. მიიღება მხოლოდ `application/json` (B5 — + `multipart/form-data`).
 * - `Referrer-Policy: strict-origin-when-cross-origin` — helmet-ის `no-referrer` YouTube-ის
 *   ჩაშენებას არღვევს (F10). HSTS — 1 წელი (B3: ASVS 3.4.1 L1 ≥ 1 წელი; B1-ში 180 დღე იყო),
 *   `includeSubDomains`-ის გარეშე, სანამ დომენი არ არის (B7; L2).
 * - Fetch Metadata (B3): `/api/*`-ზე ცვლილების მოთხოვნა (POST / PUT / PATCH / DELETE), რომლის
 *   `Sec-Fetch-Site` არის `cross-site` ან `same-site` → 403. ერთ origin-ზე ნამდვილი მოთხოვნა
 *   `same-origin`-ია; `none` (მომხმარებლის ქმედება) და header-ის არქონა (ძველი ბრაუზერი, curl)
 *   გადის — მათ CSRF token / JSON-ის Content-Type იცავს. შესვლასა და რეგისტრაციას (სესია ჯერ არ
 *   არის, CSRF token არ ითხოვება) ეს ფარავს login CSRF-ისგან.
 * - CSP — API-ს JSON-ისთვის (`default-src 'none'`). საიტის HTML-ის CSP (`YOUTUBE_CSP`) — B7,
 *   სტატიკურ ფაილებთან ერთად.
 * - `/api/*`: `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`. B6: საჯარო GET-ის წარმატებული
 *   პასუხი (200 / 304) თავის `Cache-Control`-ს თავად წერს (`routes/public.js` — ETag) და აქ არ
 *   იცვლება; შეცდომის პასუხზე (≥ 400) ყოველთვის `no-store`.
 */

export const API_CSP = Object.freeze({
  defaultSrc: ["'none'"],
  baseUri: ["'none'"],
  formAction: ["'none'"],
  frameAncestors: ["'none'"],
});

export const HSTS_MAX_AGE = 31_536_000; // 365 დღე (ASVS 3.4.1)

/** `Sec-Fetch-Site`-ის დასაშვები მნიშვნელობები ცვლილების მოთხოვნაზე. */
export const ALLOWED_FETCH_SITES = Object.freeze(['same-origin', 'none']);
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** @param {string} url */
const isApi = (url) => url === '/api' || url.startsWith('/api/') || url.startsWith('/api?');

/**
 * @param {import('fastify').FastifyInstance} app
 */
export async function registerSecurity(app) {
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: { useDefaults: false, directives: { ...API_CSP } },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { maxAge: HSTS_MAX_AGE, includeSubDomains: false, preload: false },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
  });

  app.removeContentTypeParser('text/plain');

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    if (!UNSAFE_METHODS.has(request.method) || !isApi(request.url)) return;
    const site = request.headers['sec-fetch-site'];
    if (site !== undefined && !ALLOWED_FETCH_SITES.includes(String(site))) {
      throw new ContentError('forbidden', { detail: 'sec-fetch-site' });
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    if (isApi(request.url)) {
      if (reply.statusCode >= 400 || !reply.hasHeader('cache-control')) {
        reply.header('cache-control', 'no-store');
      }
      reply.header('x-robots-tag', 'noindex, nofollow');
    }
    return payload;
  });
}

import helmet from '@fastify/helmet';

/**
 * უსაფრთხოების header-ები და CORS-ის პოლიტიკა (§12, B0 #4, #5).
 *
 * - CORS არ არის: ერთი origin, `Access-Control-*` header არ იგზავნება — სხვა საიტიდან ბრაუზერი
 *   პასუხს ვერ წაიკითხავს, `application/json` POST კი preflight-ს (OPTIONS → 404) ვერ გაივლის.
 * - `text/plain` parser ამოღებულია: ასეთი სხეული „მარტივი მოთხოვნაა“ (preflight-ის გარეშე) და
 *   CSRF-ის კარს ხსნიდა. მიიღება მხოლოდ `application/json` (B5 — + `multipart/form-data`).
 * - `Referrer-Policy: strict-origin-when-cross-origin` — helmet-ის `no-referrer` YouTube-ის
 *   ჩაშენებას არღვევს (F10). HSTS — `includeSubDomains`-ის გარეშე, სანამ დომენი არ არის (B7).
 * - CSP — API-ს JSON-ისთვის (`default-src 'none'`). საიტის HTML-ის CSP (`YOUTUBE_CSP`) — B7,
 *   სტატიკურ ფაილებთან ერთად.
 * - `/api/*`: `Cache-Control: no-store` (საჯარო GET-ის ქეში — B6), `X-Robots-Tag: noindex, nofollow`.
 */

export const API_CSP = Object.freeze({
  defaultSrc: ["'none'"],
  baseUri: ["'none'"],
  formAction: ["'none'"],
  frameAncestors: ["'none'"],
});

export const HSTS_MAX_AGE = 15_552_000; // 180 დღე

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
  });

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url === '/api' || request.url.startsWith('/api/')) {
      reply.header('cache-control', 'no-store');
      reply.header('x-robots-tag', 'noindex, nofollow');
    }
    return payload;
  });
}

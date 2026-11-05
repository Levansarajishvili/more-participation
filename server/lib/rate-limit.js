import { ContentError } from '@/content/errors.js';

/**
 * rate limit (B3, §12: შესვლა, რეგისტრაცია, საჯარო ფორმები — CAPTCHA-ს გარეშე). fixed window,
 * მეხსიერებაში, ერთ პროცესზე (Render — ერთი ინსტანცია; რამდენიმეზე — B7, საერთო საცავი).
 *
 * გასაღები: `<operationId>:ip:<IP>` და შესვლაზე `login:acct:<ელფოსტის sha256>`. IP მხოლოდ
 * მეხსიერებაშია, ფანჯრის ვადით (B0 #10) — ბაზაში და ლოგში არ იწერება. `maxKeys`-ის ზემოთ ჯერ
 * ვადაგასული იშლება, შემდეგ — უძველესი (შეტევისას მრიცხველი შეიძლება ადრე განულდეს — ეს ფასია
 * მეხსიერების ზღვრისა).
 *
 * `@fastify/rate-limit`-ის ნაცვლად (§12): შესვლას ორი გასაღები სჭირდება — IP ყოველ მცდელობაზე და
 * ანგარიში მხოლოდ წარუმატებელზე (ASVS 6.1.1 / 6.3.1: ბოროტი დაბლოკვის ზღვარი = ერთი ფანჯარა) — და
 * ტესტისთვის საათი (`now`) უნდა ჩანაცვლდეს.
 */

export const MAX_KEYS = 10_000;

/**
 * @typedef {object} RateLimiter
 * @property {(key: string) => number} blocked  0 — თავისუფალია; > 0 — Retry-After (წამი)
 * @property {(key: string) => void} hit        მრიცხველი +1
 * @property {(key: string) => number} consume  blocked → hit; შედეგი blocked-ისაა
 * @property {() => number} size
 */

/**
 * @param {{ max: number, windowMs: number, now?: () => number, maxKeys?: number }} options
 * @returns {RateLimiter}
 */
export function createRateLimiter({ max, windowMs, now = Date.now, maxKeys = MAX_KEYS }) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const buckets = new Map();

  /** @param {number} t */
  function prune(t) {
    if (buckets.size < maxKeys) return;
    for (const [key, bucket] of buckets) if (bucket.resetAt <= t) buckets.delete(key);
    while (buckets.size >= maxKeys)
      buckets.delete(/** @type {string} */ (buckets.keys().next().value));
  }

  /** @param {string} key @param {boolean} create */
  function bucketOf(key, create) {
    const t = now();
    let bucket = buckets.get(key);
    if (bucket && bucket.resetAt <= t) {
      buckets.delete(key);
      bucket = undefined;
    }
    if (!bucket && create) {
      prune(t);
      bucket = { count: 0, resetAt: t + windowMs };
      buckets.set(key, bucket);
    }
    return bucket;
  }

  /** @param {string} key */
  function blocked(key) {
    const bucket = bucketOf(key, false);
    if (!bucket || bucket.count < max) return 0;
    return Math.max(1, Math.ceil((bucket.resetAt - now()) / 1000));
  }

  /** @param {string} key */
  function hit(key) {
    /** @type {{ count: number }} */ (bucketOf(key, true)).count += 1;
  }

  return {
    blocked,
    hit,
    consume(key) {
      const wait = blocked(key);
      if (!wait) hit(key);
      return wait;
    },
    size: () => buckets.size,
  };
}

/**
 * 429: `Retry-After` header + `rate-limited` (შეცდომის handler ტექსტს `errors.js`-იდან იღებს).
 * @param {import('fastify').FastifyReply} reply
 * @param {number} retryAfter  წამი
 */
export function rateLimited(reply, retryAfter) {
  reply.header('retry-after', String(retryAfter));
  return new ContentError('rate-limited');
}

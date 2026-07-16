/**
 * In-memory rate limiter.
 *
 * Serverless caveat, stated honestly: this map lives in one warm instance.
 * Vercel may run several, and they do not share state, so the real limit is
 * roughly (limit x instances). It is a speed bump, not a wall — enough to make
 * passcode guessing impractical, not enough to stop a determined distributed
 * attacker. For that you would need Redis or Vercel KV.
 *
 * It is applied to /api/login specifically because passcodes are the only
 * credential guessable by brute force.
 */

const buckets = new Map();

/**
 * @param {string} key    identifier to limit on (usually the client IP)
 * @param {number} limit  max requests per window
 * @param {number} windowMs
 * @returns {{ ok: boolean, retryAfter: number }}
 */
export function rateLimit(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP for rate-limit keying. */
export function clientKey(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Occasionally drop expired buckets so the map cannot grow without bound. */
export function sweep() {
  const now = Date.now();
  for (const [k, v] of buckets.entries()) {
    if (now > v.resetAt) buckets.delete(k);
  }
}

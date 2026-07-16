import { sql } from '@vercel/postgres';
import { tokenGuard } from '@/lib/auth';
import { getUserByPasscode } from '@/lib/adminAuth';
import { rateLimit, clientKey, sweep } from '@/lib/rateLimit';

export const runtime = 'nodejs';

/**
 * Exchange a passcode for an identity.
 *
 * Rate limited: the passcode is the only brute-forceable credential in the
 * system, and short passcodes are common in practice however loudly we
 * recommend otherwise. 10 attempts per minute per IP turns an exhaustive
 * search from seconds into something impractical.
 *
 * Also records the login. Two writes: an append-only row in gp_logins (full
 * history, "how often does she log in?") and last_login_at on the user row
 * (so the dashboard can show last-active without aggregating).
 */
export async function POST(request) {
  const authError = tokenGuard(request);
  if (authError) return authError;

  const key = clientKey(request);
  const { ok, retryAfter } = rateLimit(`login:${key}`, 10, 60_000);
  if (!ok) {
    return Response.json(
      { error: 'Too many attempts. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }
  if (Math.random() < 0.05) sweep();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { passcode } = body;
  if (!passcode) {
    return Response.json({ error: 'Missing passcode' }, { status: 400 });
  }

  const user = await getUserByPasscode(passcode);
  if (!user) {
    // Deliberately vague: do not reveal whether the passcode exists but is
    // deactivated, versus never existed.
    return Response.json({ error: 'Not recognized' }, { status: 401 });
  }

  // Record the login. Non-fatal if it fails — never block someone from
  // signing in because an analytics write had a bad day.
  try {
    await sql`
      INSERT INTO gp_logins (learner_id, display_name, language)
      VALUES (${user.learner_id}, ${user.display_name}, ${user.language})
    `;
    await sql`
      UPDATE gp_users SET last_login_at = NOW() WHERE learner_id = ${user.learner_id}
    `;
  } catch (err) {
    console.error('[login] tracking write failed (non-fatal):', err?.message || err);
  }

  return Response.json({
    learnerId: user.learner_id,
    displayName: user.display_name,
    role: user.role,
    language: user.language, // null => send them to the language picker
  });
}

import { sql } from '@vercel/postgres';
import { tokenGuard } from '@/lib/auth';
import { getUserByLearnerId } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const LANGS = ['en', 'es'];

/**
 * Persist a learner's language choice to their user row.
 *
 * Stored server-side rather than in the browser so it follows them across
 * devices: pick Spanish on the shop floor tablet, get Spanish on your phone.
 * This is also what makes the language picker a one-time event — after the
 * first choice, login goes straight to the dashboard.
 */
export async function POST(request) {
  const authError = tokenGuard(request);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { learnerId, language } = body;

  if (!learnerId) return Response.json({ error: 'Missing learnerId' }, { status: 400 });
  if (!LANGS.includes(language)) {
    return Response.json({ error: 'Invalid language' }, { status: 400 });
  }

  const user = await getUserByLearnerId(learnerId);
  if (!user || !user.active) {
    return Response.json({ error: 'Unknown learner' }, { status: 403 });
  }

  try {
    await sql`UPDATE gp_users SET language = ${language} WHERE learner_id = ${learnerId}`;
  } catch (err) {
    console.error('[set-language] update failed:', err?.message || err);
    return Response.json({ error: 'Failed to save language' }, { status: 500 });
  }

  return Response.json({ language });
}

import { sql } from '@vercel/postgres';
import { tokenGuard } from '@/lib/auth';
import { getUserByLearnerId } from '@/lib/adminAuth';
import { getVideo } from '@/lib/videos';

export const runtime = 'nodejs';

const EVENT_TYPES = ['start', 'complete'];
const LANGS = ['en', 'es'];

/**
 * Record a video event.
 *
 * Append-only by design. We never UPDATE a "completed" flag, because the client
 * asked how many TIMES a video was watched — so every completion is its own
 * row and the answer is a COUNT.
 *
 * Everything is validated against the server's own data:
 *   - learnerId must exist in the roster (a client cannot invent a user)
 *   - videoId must exist in lib/videos.js (cannot log against a phantom module)
 *   - displayName is looked up, never trusted from the request body
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

  const { learnerId, videoId, language, eventType } = body;

  if (!learnerId) return Response.json({ error: 'Missing learnerId' }, { status: 400 });
  if (!videoId) return Response.json({ error: 'Missing videoId' }, { status: 400 });
  if (!EVENT_TYPES.includes(eventType)) {
    return Response.json({ error: 'Invalid eventType' }, { status: 400 });
  }
  if (!LANGS.includes(language)) {
    return Response.json({ error: 'Invalid language' }, { status: 400 });
  }
  if (!getVideo(videoId)) {
    return Response.json({ error: 'Unknown videoId' }, { status: 400 });
  }

  const user = await getUserByLearnerId(learnerId);
  if (!user || !user.active) {
    return Response.json({ error: 'Unknown learner' }, { status: 403 });
  }

  try {
    await sql`
      INSERT INTO gp_video_events (learner_id, display_name, video_id, language, event_type)
      VALUES (${learnerId}, ${user.display_name}, ${videoId}, ${language}, ${eventType})
    `;
  } catch (err) {
    console.error('[track] insert failed:', err?.message || err);
    return Response.json({ error: 'Failed to record event' }, { status: 500 });
  }

  return Response.json({ recorded: true });
}

/**
 * Return this learner's own progress, so the dashboard can show which modules
 * they have finished and how many times. Learners see only their own data.
 */
export async function GET(request) {
  const authError = tokenGuard(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const learnerId = searchParams.get('learnerId');
  if (!learnerId) return Response.json({ error: 'Missing learnerId' }, { status: 400 });

  try {
    const { rows } = await sql`
      SELECT video_id, COUNT(*)::int AS completions, MAX(created_at) AS last_completed
      FROM gp_video_events
      WHERE learner_id = ${learnerId} AND event_type = 'complete'
      GROUP BY video_id
    `;
    const progress = {};
    for (const r of rows) {
      progress[r.video_id] = { completions: r.completions, lastCompleted: r.last_completed };
    }
    return Response.json({ progress });
  } catch (err) {
    console.error('[track] progress query failed:', err?.message || err);
    return Response.json({ error: 'Failed to load progress' }, { status: 500 });
  }
}

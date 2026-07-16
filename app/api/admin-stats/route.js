import { sql } from '@vercel/postgres';
import { adminGuard } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * Dashboard data. Admin-tier only; a learner's passcode cannot reach this.
 *
 * Date filtering applies to the ACTIVITY tables (logins, video events), not to
 * the roster — you always see every user, even one who did nothing in the
 * window. That is the point: the useful question is usually "who hasn't
 * watched anything?", and filtering them out of existence would hide exactly
 * the people you are looking for.
 */
export async function GET(request) {
  const { error } = await adminGuard(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();
  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();

  try {
    // --- Per-user completion rollup -----------------------------------------
    // Every active user, with how many distinct modules they have finished and
    // how many completions in total (re-watches included). LEFT JOIN so people
    // with zero activity still appear.
    const { rows: perUser } = await sql`
      SELECT
        u.learner_id,
        u.display_name,
        u.role,
        u.language,
        u.last_login_at,
        COUNT(DISTINCT e.video_id)::int AS modules_completed,
        COUNT(e.id)::int                AS total_completions,
        MAX(e.created_at)               AS last_completion
      FROM gp_users u
      LEFT JOIN gp_video_events e
        ON e.learner_id = u.learner_id
       AND e.event_type = 'complete'
       AND e.created_at >= ${fromISO}
       AND e.created_at <= ${toISO}
      WHERE u.active = TRUE
      GROUP BY u.learner_id, u.display_name, u.role, u.language, u.last_login_at
      ORDER BY u.display_name
    `;

    // --- Per-video rollup ---------------------------------------------------
    // How many distinct people finished each module, and how many completions
    // in total. Split by language so you can see whether the Spanish cuts are
    // actually being used.
    const { rows: perVideo } = await sql`
      SELECT
        video_id,
        COUNT(DISTINCT learner_id)::int AS unique_viewers,
        COUNT(*)::int                   AS total_completions,
        COUNT(*) FILTER (WHERE language = 'en')::int AS completions_en,
        COUNT(*) FILTER (WHERE language = 'es')::int AS completions_es
      FROM gp_video_events
      WHERE event_type = 'complete'
        AND created_at >= ${fromISO}
        AND created_at <= ${toISO}
      GROUP BY video_id
      ORDER BY video_id
    `;

    // --- Per-user-per-video matrix -----------------------------------------
    // Powers the expandable detail row: for one person, how many times they
    // have completed each module.
    const { rows: matrix } = await sql`
      SELECT learner_id, video_id, language, COUNT(*)::int AS completions, MAX(created_at) AS last_at
      FROM gp_video_events
      WHERE event_type = 'complete'
        AND created_at >= ${fromISO}
        AND created_at <= ${toISO}
      GROUP BY learner_id, video_id, language
    `;

    // --- Recent activity feed ----------------------------------------------
    const { rows: recentEvents } = await sql`
      SELECT learner_id, display_name, video_id, language, event_type, created_at
      FROM gp_video_events
      WHERE created_at >= ${fromISO} AND created_at <= ${toISO}
      ORDER BY created_at DESC
      LIMIT 200
    `;

    const { rows: recentLogins } = await sql`
      SELECT learner_id, display_name, language, created_at
      FROM gp_logins
      WHERE created_at >= ${fromISO} AND created_at <= ${toISO}
      ORDER BY created_at DESC
      LIMIT 200
    `;

    // --- Totals -------------------------------------------------------------
    const { rows: totals } = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM gp_users WHERE active = TRUE) AS total_users,
        (SELECT COUNT(*)::int FROM gp_logins
          WHERE created_at >= ${fromISO} AND created_at <= ${toISO}) AS logins,
        (SELECT COUNT(DISTINCT learner_id)::int FROM gp_logins
          WHERE created_at >= ${fromISO} AND created_at <= ${toISO}) AS active_users,
        (SELECT COUNT(*)::int FROM gp_video_events
          WHERE event_type = 'complete'
            AND created_at >= ${fromISO} AND created_at <= ${toISO}) AS completions
    `;

    return Response.json({
      window: { from: fromISO, to: toISO },
      totals: totals[0],
      perUser,
      perVideo,
      matrix,
      recentEvents,
      recentLogins,
    });
  } catch (err) {
    console.error('[admin-stats] query failed:', err?.message || err);
    return Response.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}

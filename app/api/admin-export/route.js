import { sql } from '@vercel/postgres';
import { adminGuard } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/** RFC4180-ish escaping: wrap in quotes, double any internal quotes. */
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Export completions as CSV, one row per event.
 *
 * Raw events rather than a summary, deliberately: a spreadsheet can pivot rows
 * into any summary someone wants, but it cannot recover detail a summary threw
 * away. HR asking "who finished module 3 in March" is answerable from this;
 * it would not be from a per-user total.
 */
export async function GET(request) {
  const { error } = await adminGuard(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  try {
    const { rows } = await sql`
      SELECT
        e.created_at,
        e.learner_id,
        e.display_name,
        u.email,
        u.role,
        e.video_id,
        e.language,
        e.event_type
      FROM gp_video_events e
      LEFT JOIN gp_users u ON u.learner_id = e.learner_id
      WHERE e.created_at >= ${fromDate.toISOString()}
        AND e.created_at <= ${toDate.toISOString()}
      ORDER BY e.created_at DESC
    `;

    const header = [
      'timestamp', 'learner_id', 'name', 'email', 'role',
      'video_id', 'language', 'event',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        csvCell(r.created_at?.toISOString?.() || r.created_at),
        csvCell(r.learner_id),
        csvCell(r.display_name),
        csvCell(r.email),
        csvCell(r.role),
        csvCell(r.video_id),
        csvCell(r.language),
        csvCell(r.event_type),
      ].join(','));
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="genpore-training-${stamp}.csv"`,
      },
    });
  } catch (err) {
    console.error('[admin-export] failed:', err?.message || err);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}

import { sql } from '@vercel/postgres';
import { tokenGuard } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint. Token-gated, so it is not public.
 *
 * Exists because "that passcode was not recognized" is a terrible debugging
 * signal — it looks identical whether the passcode is wrong, the database is
 * unreachable, the schema was never run, or the app is pointed at a different
 * Neon branch than the one you seeded. This reports what the APP sees, which
 * is the thing that matters and the one thing a SQL editor cannot tell you.
 *
 * It deliberately reports NO secrets: no connection string, no passcode hashes.
 * Only whether things exist and what the app is connected to.
 *
 * GET /api/health?token=YOUR_TOKEN
 */
export async function GET(request) {
  const authError = tokenGuard(request);
  if (authError) return authError;

  const report = {
    env: {
      APP_ACCESS_TOKEN: process.env.APP_ACCESS_TOKEN ? 'set' : 'MISSING',
      POSTGRES_URL: process.env.POSTGRES_URL ? 'set' : 'MISSING',
      NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL || '(unset — videos will 404, fine before launch)',
    },
    database: {},
    users: {},
  };

  // Which database is the APP actually talking to?
  try {
    const { rows } = await sql`SELECT current_database() AS db, current_schema() AS schema, version() AS version`;
    report.database.connected = true;
    report.database.name = rows[0]?.db;
    report.database.schema = rows[0]?.schema;
    // Host is the useful bit for spotting a wrong branch. Parse it out of the
    // connection string WITHOUT exposing credentials.
    try {
      const u = new URL(process.env.POSTGRES_URL);
      report.database.host = u.hostname;
    } catch {
      report.database.host = '(could not parse)';
    }
  } catch (err) {
    report.database.connected = false;
    report.database.error = err?.message || String(err);
    return Response.json(report, { status: 500 });
  }

  // Does the schema exist, and is anyone in it?
  try {
    const { rows } = await sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE active)::int AS active,
             COUNT(*) FILTER (WHERE role = 'super_admin')::int AS super_admins
      FROM gp_users
    `;
    report.users.table_exists = true;
    report.users.total = rows[0]?.total ?? 0;
    report.users.active = rows[0]?.active ?? 0;
    report.users.super_admins = rows[0]?.super_admins ?? 0;

    const { rows: sample } = await sql`
      SELECT learner_id, role, active, length(passcode_hash) AS hash_len
      FROM gp_users ORDER BY created_at LIMIT 5
    `;
    report.users.sample = sample; // no hashes, just their length (should be 64)
  } catch (err) {
    report.users.table_exists = false;
    report.users.error = err?.message || String(err);
  }

  const ok =
    report.database.connected &&
    report.users.table_exists &&
    report.users.active > 0;

  report.verdict = ok
    ? 'Looks healthy. If login still fails, the passcode itself is wrong.'
    : 'Something above is wrong — see database.error / users.error.';

  return Response.json(report, { status: ok ? 200 : 500 });
}

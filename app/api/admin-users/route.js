import { sql } from '@vercel/postgres';
import { adminGuard, hashPasscode, canManageRole, ROLES } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * User management.
 *
 * Both 'admin' and 'super_admin' can reach these routes — this is the change
 * from earlier builds, where user management was super-admin-only.
 *
 * The privilege boundary now lives per-target rather than per-route:
 *
 *   super_admin — may manage anyone, including other admins, and may grant
 *                 or revoke the admin role.
 *   admin       — may manage ORDINARY USERS only. Cannot touch another admin,
 *                 cannot touch a super admin, cannot mint new admins.
 *
 * That keeps day-to-day work (adding a new hire, resetting a forgotten
 * passcode) off the super admin's desk without letting an admin escalate
 * themselves or lock out the owner.
 *
 * canManageRole() is checked against BOTH the existing row and the requested
 * role, so an admin cannot promote an existing user to admin, and cannot
 * demote an admin in order to then manage them.
 */

/** List the roster. Any admin-tier user may read it. */
export async function GET(request) {
  const { error } = await adminGuard(request);
  if (error) return error;

  const { rows } = await sql`
    SELECT learner_id, display_name, email, role, language, active, created_at, last_login_at
    FROM gp_users
    ORDER BY
      CASE role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
      display_name
  `;
  return Response.json({ users: rows });
}

/**
 * Create or update a user.
 *
 * Upsert on learner_id: submitting an existing learner_id UPDATES that user,
 * including their passcode. That is how a passcode reset works — there is no
 * separate reset endpoint. The UI's "Reset passcode" button prefills this form
 * with the user's current values precisely because this overwrites the row.
 */
export async function POST(request) {
  const { user: actor, error } = await adminGuard(request);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { learnerId, displayName, email, role, passcode, language } = body;

  if (!learnerId || !displayName || !passcode) {
    return Response.json(
      { error: 'learnerId, displayName, and passcode are required' },
      { status: 400 }
    );
  }

  const newRole = role || 'user';
  if (!ROLES.includes(newRole)) {
    return Response.json({ error: 'Invalid role' }, { status: 400 });
  }

  // May the actor create someone at this role?
  if (!canManageRole(actor.role, newRole)) {
    return Response.json(
      { error: 'You are not allowed to create or modify a user at that role.' },
      { status: 403 }
    );
  }

  // If the row already exists, the actor must also be allowed to manage the
  // role it currently holds. Without this, an admin could overwrite an existing
  // admin by submitting role:'user'.
  const { rows: existing } = await sql`
    SELECT role FROM gp_users WHERE learner_id = ${learnerId} LIMIT 1
  `;
  if (existing[0] && !canManageRole(actor.role, existing[0].role)) {
    return Response.json(
      { error: 'You are not allowed to modify that user.' },
      { status: 403 }
    );
  }

  const hash = hashPasscode(passcode);
  const lang = language === 'en' || language === 'es' ? language : null;

  try {
    await sql`
      INSERT INTO gp_users (learner_id, display_name, email, role, passcode_hash, language, active)
      VALUES (${learnerId}, ${displayName}, ${email || null}, ${newRole}, ${hash}, ${lang}, TRUE)
      ON CONFLICT (learner_id) DO UPDATE SET
        display_name  = EXCLUDED.display_name,
        email         = EXCLUDED.email,
        role          = EXCLUDED.role,
        passcode_hash = EXCLUDED.passcode_hash,
        language      = EXCLUDED.language,
        active        = TRUE
    `;
  } catch (err) {
    console.error('[admin-users] upsert failed:', err?.message || err);
    return Response.json({ error: 'Failed to save user' }, { status: 500 });
  }

  return Response.json({ saved: true, learnerId });
}

/**
 * Deactivate a user. Soft delete: the row and all their history stay, they
 * simply can no longer log in. Their completions remain in the reporting.
 */
export async function DELETE(request) {
  const { user: actor, error } = await adminGuard(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const learnerId = searchParams.get('learnerId');
  if (!learnerId) return Response.json({ error: 'Missing learnerId' }, { status: 400 });

  if (learnerId === actor.learner_id) {
    return Response.json({ error: 'You cannot deactivate yourself.' }, { status: 400 });
  }

  const { rows: existing } = await sql`
    SELECT role FROM gp_users WHERE learner_id = ${learnerId} LIMIT 1
  `;
  if (!existing[0]) {
    return Response.json({ error: 'No such user' }, { status: 404 });
  }
  if (!canManageRole(actor.role, existing[0].role)) {
    return Response.json(
      { error: 'You are not allowed to deactivate that user.' },
      { status: 403 }
    );
  }

  try {
    await sql`UPDATE gp_users SET active = FALSE WHERE learner_id = ${learnerId}`;
  } catch (err) {
    console.error('[admin-users] deactivate failed:', err?.message || err);
    return Response.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }

  return Response.json({ deactivated: true, learnerId });
}

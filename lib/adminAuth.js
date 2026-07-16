import crypto from 'crypto';
import { sql } from '@vercel/postgres';

/**
 * Identity and role checks.
 *
 * Two layers, and they do different jobs:
 *
 *   APP_ACCESS_TOKEN  — "are you allowed in the building?" Gates the whole app.
 *   passcode          — "who are you and what may you do?" Establishes identity.
 *
 * Passcodes are hashed with SHA-256 and matched against the roster. The roster
 * IS the allowlist: there is no self-registration.
 *
 * Every admin route re-checks the role server-side. Hiding a button in the UI
 * is convenience, not a security boundary.
 */

/** SHA-256 hex. Matches `encode(digest(x, 'sha256'), 'hex')` in Postgres. */
export function hashPasscode(passcode) {
  return crypto.createHash('sha256').update(String(passcode)).digest('hex');
}

/** Look up a user by passcode. Returns the row or null. */
export async function getUserByPasscode(passcode) {
  if (!passcode) return null;
  const hash = hashPasscode(passcode);
  const { rows } = await sql`
    SELECT learner_id, display_name, email, role, language, active
    FROM gp_users
    WHERE passcode_hash = ${hash} AND active = TRUE
    LIMIT 1
  `;
  return rows[0] || null;
}

/** Look up a user by learner_id. Used to resolve a trusted display name. */
export async function getUserByLearnerId(learnerId) {
  if (!learnerId) return null;
  const { rows } = await sql`
    SELECT learner_id, display_name, email, role, language, active
    FROM gp_users
    WHERE learner_id = ${learnerId}
    LIMIT 1
  `;
  return rows[0] || null;
}

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * Gate a route to admin-tier users. Reads the passcode from the
 * x-admin-passcode header.
 *
 * Returns { user } on success, or { error: Response } to return immediately.
 */
export async function adminGuard(request) {
  const passcode = request.headers.get('x-admin-passcode') || '';
  if (!passcode) {
    return { error: Response.json({ error: 'Missing passcode' }, { status: 401 }) };
  }
  const user = await getUserByPasscode(passcode);
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return { error: Response.json({ error: 'Not authorized' }, { status: 403 }) };
  }
  return { user };
}

/**
 * Gate a route to super_admin only.
 *
 * What this protects, now that 'admin' can manage users: an admin may create,
 * reset, and deactivate ORDINARY USERS. Only a super admin may touch another
 * admin, or grant/revoke admin itself. That keeps a single compromised or
 * careless admin account from escalating.
 */
export async function superAdminGuard(request) {
  const passcode = request.headers.get('x-admin-passcode') || '';
  if (!passcode) {
    return { error: Response.json({ error: 'Missing passcode' }, { status: 401 }) };
  }
  const user = await getUserByPasscode(passcode);
  if (!user || user.role !== 'super_admin') {
    return { error: Response.json({ error: 'Not authorized' }, { status: 403 }) };
  }
  return { user };
}

/**
 * May `actor` create/modify/deactivate a user with role `targetRole`?
 *
 * super_admin: anyone.
 * admin:       ordinary users only. Never another admin, never a super admin,
 *              and cannot mint new admins.
 */
export function canManageRole(actorRole, targetRole) {
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'admin') return targetRole === 'user';
  return false;
}

export const ROLES = ['user', 'admin', 'super_admin'];

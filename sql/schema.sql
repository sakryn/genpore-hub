-- ============================================================================
-- GenPore Training Portal — database schema
-- Run this ONCE in the Neon SQL editor after connecting the database.
-- Safe to re-run: every statement is IF NOT EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- USERS / ROSTER
--
-- This table is the allowlist. No self-registration: an admin creates every
-- account. Passcodes are stored as SHA-256 hashes, never in plain text.
--
-- role:
--   'super_admin' — everything, including changing other admins
--   'admin'       — dashboard + add/reset/deactivate users (not other admins)
--   'user'        — watches videos, sees their own progress
--
-- role is VARCHAR(32) rather than an enum on purpose: adding a role later
-- (e.g. a gated chatbot audience) needs no migration.
--
-- language: 'en' | 'es'. Sticky per user, so it follows them across devices.
-- NULL means they have not chosen yet and will be sent to the language picker.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gp_users (
  id            SERIAL PRIMARY KEY,
  learner_id    TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  email         TEXT,
  role          VARCHAR(32) NOT NULL DEFAULT 'user',
  passcode_hash TEXT NOT NULL,
  language      VARCHAR(5),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gp_users_passcode ON gp_users (passcode_hash);
CREATE INDEX IF NOT EXISTS idx_gp_users_role     ON gp_users (role);

-- ---------------------------------------------------------------------------
-- LOGIN EVENTS
--
-- One row per successful login. gp_users.last_login_at is also updated so the
-- dashboard can show "last active" without aggregating this table, but the
-- full history lives here so you can answer "how often does she log in?".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gp_logins (
  id           SERIAL PRIMARY KEY,
  learner_id   TEXT NOT NULL,
  display_name TEXT,
  language     VARCHAR(5),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gp_logins_learner ON gp_logins (learner_id);
CREATE INDEX IF NOT EXISTS idx_gp_logins_created ON gp_logins (created_at DESC);

-- ---------------------------------------------------------------------------
-- VIDEO EVENTS
--
-- One row per event. We deliberately do NOT keep a single "completed" flag per
-- user/video — we append events, so "how many times has she completed module 3?"
-- is a COUNT, which is exactly what the client asked for.
--
-- event_type:
--   'start'    — pressed play (fires once per page visit, not per seek)
--   'complete' — clicked the Complete button (only enabled after the video
--                fires its `ended` event, so this is not self-reported)
--
-- video_id is the stable key from lib/videos.js (e.g. 'module-1'), NOT a
-- filename and NOT a title — titles get edited, keys must not.
--
-- language records which cut they watched, so you can see whether the Spanish
-- versions are actually being used.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gp_video_events (
  id           SERIAL PRIMARY KEY,
  learner_id   TEXT NOT NULL,
  display_name TEXT,
  video_id     TEXT NOT NULL,
  language     VARCHAR(5) NOT NULL,
  event_type   VARCHAR(16) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gp_events_learner ON gp_video_events (learner_id);
CREATE INDEX IF NOT EXISTS idx_gp_events_video   ON gp_video_events (video_id);
CREATE INDEX IF NOT EXISTS idx_gp_events_type    ON gp_video_events (event_type);
CREATE INDEX IF NOT EXISTS idx_gp_events_created ON gp_video_events (created_at DESC);

-- ---------------------------------------------------------------------------
-- SEED THE FIRST SUPER ADMIN
--
-- You cannot log in until at least one user exists. Run this once, replacing
-- the passcode. Needs pgcrypto for digest():
--
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
--   INSERT INTO gp_users (learner_id, display_name, email, role, passcode_hash, language)
--   VALUES (
--     'your-id',
--     'Your Name',
--     NULL,
--     'super_admin',
--     encode(digest('YOUR-PASSCODE-HERE', 'sha256'), 'hex'),
--     'en'
--   );
--
-- If pgcrypto is unavailable, hash it yourself and paste the hex directly:
--   node -e "console.log(require('crypto').createHash('sha256').update('YOUR-PASSCODE-HERE').digest('hex'))"
-- ---------------------------------------------------------------------------

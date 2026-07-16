# GenPore Training Portal

A bilingual (English/Spanish) video training portal with login, completion
tracking, and an admin dashboard.

No AI, no chatbot, no external API. Next.js + Neon Postgres, deployed on Vercel.

---

## What it does

- **Login** — passcode only, no self-registration. The roster is the allowlist.
- **Language** — picked on first login, saved to the user's row, changeable any
  time from the toggle. Follows them across devices.
- **Five modules** — each with an English and a Spanish cut, a thumbnail, and a
  Complete button that only unlocks once the video has actually ended.
- **Progress** — learners see their own; admins see everyone's, including how
  many times each module has been completed and in which language.

## Roles

| Role | Can do |
|---|---|
| `user` | Watch videos, see their own progress |
| `admin` | Everything above, plus the dashboard and managing **ordinary users** (add, reset passcode, deactivate) |
| `super_admin` | Everything, including managing admins and granting the admin role |

The boundary between `admin` and `super_admin` is per-target, not per-page: an
admin can handle day-to-day account work without being able to escalate
themselves or lock out the owner.

## Setup

### 1. Deploy

Push to GitHub, import in Vercel.

### 2. Environment variables

| Variable | Value |
|---|---|
| `APP_ACCESS_TOKEN` | Long random string. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Where the videos live, no trailing slash |
| `POSTGRES_*` | Auto-injected — create a Neon DB in Vercel's Storage tab and click "Connect to Project" |

Env vars only take effect on a **new** deployment. Set them, then redeploy.

### 3. Database

Run `sql/schema.sql` once in the Neon SQL editor. It is idempotent.

### 4. Seed the first super admin

You cannot log in until a user exists.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO gp_users (learner_id, display_name, role, passcode_hash, language)
VALUES (
  'your-id',
  'Your Name',
  'super_admin',
  encode(digest('YOUR-PASSCODE', 'sha256'), 'hex'),
  'en'
);
```

Everyone after that gets added through the admin UI.

### 5. Assets

See `public/README.md`. Logo, favicon, and five 16:9 thumbnails.

### 6. Videos

Upload ten files (five modules x two languages) to the media host, named
`<module-id>-<lang>.mp4`. See `lib/videos.js`.

### 7. Test

Open `https://your-app.vercel.app/?token=YOUR_TOKEN`, sign in as the super
admin, add a test user, sign in as them, watch a video to the end, click
Complete. Confirm it appears on the admin dashboard. If it does, you're live.

---

## Adding or changing videos

Edit `lib/videos.js` and push. Content is not editable through the app — that
is deliberate.

**`id` is permanent.** It is the key every tracking row is written against.
Renaming `module-1` orphans every completion recorded for it. Titles are safe
to change; ids are not.

---

## Things worth knowing

**Video privacy is by obscurity, not access control.** The video URLs are
unguessable but public — anyone holding a direct link can watch without logging
in. That is a reasonable trade for internal training content, but it is not
protection. If it ever needs to be, the answer is signed expiring URLs from the
media host, not a change in this app.

**The Complete button is gated on the `ended` event**, so completions mean the
video actually played through. It is not DRM — someone can scrub to the end —
but it rules out the accidental and lazy cases, which is what the data is for.

**Completions are append-only.** There is no "completed" flag; every completion
is a row. That is what makes "how many times has she watched module 3" a simple
COUNT.

**The token rides in the URL.** It lands in browser history and in any pasted
link. Treat those links as credentials; rotate `APP_ACCESS_TOKEN` if one leaks.

**Login is rate limited** to 10 attempts per minute per IP. In-memory, so on
Vercel the real ceiling is roughly (10 x warm instances) — a speed bump, not a
wall. Recommend passcodes with real length regardless.

**The admin page does not use `globals.css`.** It is styled with inline styles.
Editing the stylesheet will not change it.

**Deploys can serve stale CSS.** If a style change does not appear, check the
stylesheet's hashed filename in DevTools → Network. If the hash has not changed
across pushes, it is a cached build: Deployments → ⋯ → Redeploy with **"Use
existing Build Cache" unchecked**.

---

## Future: adding a chatbot

The scaffolding is intentionally left in place. `lib/rateLimit.js` and
`APP_ACCESS_TOKEN` exist and are wired even though nothing calls an external API
yet, and `gp_users.role` is a VARCHAR rather than an enum so a new audience
needs no migration. The roster already functions as the allowlist — a future
chatbot inherits its gatekeeping for free.

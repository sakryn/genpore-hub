# DEMO SETUP — read this first

This build is ready to deploy as a **working prototype** for the GenPore pitch.
The thumbnails and video URLs are placeholders; everything else is real.

## Fastest path to a live demo (about 20 minutes)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "GenPore training portal"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import in Vercel
New Project → import the repo → deploy. It will fail to load data until step 4;
that's expected.

### 3. Environment variables
Vercel → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `APP_ACCESS_TOKEN` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Leave unset for now — see step 6 |

**Then redeploy.** Env vars do nothing until the next build.

### 4. Database
Vercel → Storage → Create Neon Postgres → Connect to Project. Then paste
`sql/schema.sql` into the Neon SQL editor and run it.

### 5. Seed yourself + a demo user
In Neon:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- You (super admin)
INSERT INTO gp_users (learner_id, display_name, role, passcode_hash, language)
VALUES ('kryn', 'Kryn McClain', 'super_admin',
        encode(digest('PICK-A-PASSCODE', 'sha256'), 'hex'), 'en');

-- A demo learner to show the Spanish path — leave language NULL so the
-- language picker appears when you log in as them during the demo
INSERT INTO gp_users (learner_id, display_name, role, passcode_hash, language)
VALUES ('demo', 'Demo Employee', 'user',
        encode(digest('DEMO-PASSCODE', 'sha256'), 'hex'), NULL);
```

### 6. Videos — the one thing that needs real content

The demo works without them, but the player will show a blank frame. For a
credible pitch you want **at least module 1 in both languages**.

Two options:

**A. Host on your server (matches production):**
Upload `module-1-en.mp4` and `module-1-es.mp4`, then set
`NEXT_PUBLIC_MEDIA_BASE_URL` to that folder's URL and redeploy.

**B. Quick and dirty for the demo:**
Drop `module-1-en.mp4` and `module-1-es.mp4` straight into `/public/` and leave
`NEXT_PUBLIC_MEDIA_BASE_URL` unset — `videoUrl()` falls back to `/public/`.
Note `.gitignore` blocks `*.mp4` in `/public/`, so you'd have to force-add them
(`git add -f public/module-1-en.mp4`). Fine for a demo, wrong for production —
that ignore rule exists so half a gigabyte of video never lands in the repo.

### 7. Test the demo path yourself before the meeting
1. Open `https://your-app.vercel.app/?token=YOUR_TOKEN`
2. Sign in as `demo` → language picker appears → choose **Español**
3. Watch module 1 to the end → Complete unlocks → click it
4. Sign out, sign in as yourself → admin dashboard → find their completion,
   logged under **Spanish**

That last screen is the pitch. It answers a question they currently cannot
answer at all: *did our Spanish-speaking hires actually get trained?*

---

## What's placeholder

| Thing | Status |
|---|---|
| Logo | **Real** — theirs |
| Brand blue `#0079C0` | **Real** — sampled from their logo |
| Thumbnails | **Placeholder** — generated from the logo. Replace with real 16:9 1280x720 stills |
| Module titles | Module 1 & 2 are yours; 3–5 are numbered placeholders |
| Descriptions | Placeholder for modules 3–5 |
| Spanish copy | Real translations of the placeholder English — retranslate once the real copy exists |
| Videos | **None yet** |
| favicon.ico | **Missing** — add one |

## Demo tips

- Log in as the **demo learner**, not as yourself. Admins skip the language
  picker and go straight to the dashboard, which skips the best part.
- Show the **language toggle** in the top right. Switching mid-session is the
  moment the room understands this isn't a translated afterthought.
- End on the **admin dashboard's By Module table** — the English/Spanish
  completion split is the number they've never had.

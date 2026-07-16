# /public — static assets

Drop these files here before deploying. Filenames must match exactly — they are
referenced by `lib/branding.js` and `lib/videos.js`.

## Required

| File | What | Spec |
|---|---|---|
| `genpore-logo.png` | The GenPore logo | Transparent PNG. Renders at 48–52px tall, so ship at least 2x that. |
| `favicon.ico` | Browser tab icon | Square. A real multi-size `.ico` (16/32/48) beats a renamed PNG. |
| `module-1-thumb.jpg` … `module-5-thumb.jpg` | Video thumbnails | **16:9, 1280x720.** One per module, shared by both languages. |

## Thumbnails

All five render in a uniform grid, so they should look like a set: same
treatment, same framing, same typography if any. A single mismatched thumbnail
is the thing people notice.

They are cropped with `object-fit: cover` at 16:9. Anything important near the
edges may be clipped on narrow screens — keep the subject centred.

## Videos do NOT go here

Five modules x two languages x ~50MB is roughly half a gigabyte. GitHub warns
at 50MB per file and hard-blocks at 100MB, so committing them will fail the
push.

Videos are hosted on GenPore's own server and referenced via
`NEXT_PUBLIC_MEDIA_BASE_URL`. See `lib/videos.js` for naming and the honest
caveat about what "private" does and does not mean for those URLs.

`.gitignore` blocks `/public/*.mp4` so a stray video cannot be committed by
accident.

For local testing you can drop a couple of `.mp4` files here and leave
`NEXT_PUBLIC_MEDIA_BASE_URL` blank — `videoUrl()` falls back to `/public/`.
Just do not commit them.

/**
 * VIDEO CURRICULUM
 *
 * This is the file you edit to add, remove, reorder, or retitle videos.
 * Nothing about the curriculum is stored in the database or editable through
 * the app — changing content means editing this file and pushing. That is
 * deliberate: content changes go through the repo, not through a UI.
 *
 * ---------------------------------------------------------------------------
 * ADDING A VIDEO
 * ---------------------------------------------------------------------------
 * 1. Add an entry below with a NEW, PERMANENT `id`.
 * 2. Upload two .mp4 files and one thumbnail to the media host.
 * 3. Push.
 *
 * `id` IS PERMANENT. It is the key every tracking row is written against.
 * Renaming 'module-1' to 'intro' silently orphans every completion already
 * recorded for it. Titles are safe to edit; ids are not.
 *
 * Order in this array is the order shown on the dashboard.
 *
 * ---------------------------------------------------------------------------
 * FILE NAMING
 * ---------------------------------------------------------------------------
 * Each entry needs three files:
 *
 *   <id>-en.mp4      English cut
 *   <id>-es.mp4      Spanish cut
 *   <id>-thumb.jpg   Thumbnail, shared by both languages
 *
 * So 'module-1' needs: module-1-en.mp4, module-1-es.mp4, module-1-thumb.jpg
 *
 * Thumbnails: 16:9, 1280x720. All five should be visually consistent — same
 * treatment, same framing — since they render as a uniform grid.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE FILES LIVE
 * ---------------------------------------------------------------------------
 * Videos are NOT in this repo. Five modules x two languages x ~50MB is ~500MB;
 * GitHub warns at 50MB per file and hard-blocks at 100MB. They are hosted on
 * GenPore's own server and referenced by URL via NEXT_PUBLIC_MEDIA_BASE_URL.
 *
 * PRIVACY, STATED PLAINLY: these URLs are unguessable, not protected. Anyone
 * holding a direct link can watch without logging in. That is an acceptable
 * trade for internal training content, but it is NOT access control. If these
 * ever need to be genuinely restricted, the fix is signed expiring URLs from
 * the media host — not anything in this app.
 *
 * Use long random filenames in production, e.g.
 *   module-1-en-8f3a91c4d2.mp4
 * rather than the readable names shown here.
 *
 * Thumbnails are small and static, so they live in /public/ in the repo.
 */

export const VIDEOS = [
  {
    id: 'module-1',
    title: {
      en: 'Why GenPore: A Family Business',
      es: 'Por qué GenPore: una empresa familiar',
    },
    description: {
      en: 'Who we are, where we came from, and what we make.',
      es: 'Quiénes somos, de dónde venimos y qué fabricamos.',
    },
    thumbnail: '/module-1-thumb.jpg',
  },
  {
    id: 'module-2',
    title: {
      en: 'Policies and Procedures',
      es: 'Políticas y procedimientos',
    },
    description: {
      en: 'What is expected of you, and what you can expect from us.',
      es: 'Lo que se espera de usted y lo que puede esperar de nosotros.',
    },
    thumbnail: '/module-2-thumb.jpg',
  },
  {
    id: 'module-3',
    title: {
      en: 'Molding Procedures 1',
      es: 'Procedimientos de moldeo 1',
    },
    description: {
      en: 'Placeholder — replace with the real description.',
      es: 'Marcador de posición: reemplazar con la descripción real.',
    },
    thumbnail: '/module-3-thumb.jpg',
  },
  {
    id: 'module-4',
    title: {
      en: 'Molding Procedures 2',
      es: 'Procedimientos de moldeo 2',
    },
    description: {
      en: 'Placeholder — replace with the real description.',
      es: 'Marcador de posición: reemplazar con la descripción real.',
    },
    thumbnail: '/module-4-thumb.jpg',
  },
  {
    id: 'module-5',
    title: {
      en: 'Molding Procedures 3',
      es: 'Procedimientos de moldeo 3',
    },
    description: {
      en: 'Placeholder — replace with the real description.',
      es: 'Marcador de posición: reemplazar con la descripción real.',
    },
    thumbnail: '/module-5-thumb.jpg',
  },
];

/**
 * Full URL to a video file for a given module + language.
 * Falls back to /public/ if no media base URL is configured, which lets you
 * run locally with a couple of test files without standing up a media host.
 */
export function videoUrl(videoId, lang) {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || '';
  const file = `${videoId}-${lang}.mp4`;
  return base ? `${base.replace(/\/$/, '')}/${file}` : `/${file}`;
}

export function getVideo(videoId) {
  return VIDEOS.find((v) => v.id === videoId) || null;
}

export default VIDEOS;

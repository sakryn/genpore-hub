'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { BRANDING } from '@/lib/branding';
import { getVideo, videoUrl } from '@/lib/videos';
import { t } from '@/lib/i18n';

/**
 * Video player + completion.
 *
 * THE COMPLETE BUTTON IS GATED. It stays disabled until the <video> element
 * fires `ended`. The alternative — letting anyone click Complete on arrival —
 * would produce a tidy dashboard full of numbers that mean nothing. Gating it
 * costs one event listener and makes the data true.
 *
 * It is not DRM: someone can scrub to the last second and let it end. But it
 * closes the accidental case (clicking Complete without watching) and the lazy
 * case, which is what this data is actually for.
 *
 * Two events are recorded:
 *   'start'    — first play on this page visit
 *   'complete' — the button, once unlocked
 *
 * Re-watching and completing again appends another row: that is how "how many
 * times" gets answered.
 */
function WatchInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const videoId = params?.videoId;

  const videoRef = useRef(null);
  const startedRef = useRef(false);

  const [learner, setLearner] = useState('');
  const [lang, setLang] = useState('');
  const [ended, setEnded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedNow, setCompletedNow] = useState(false);

  const video = getVideo(videoId);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = sessionStorage.getItem('gp_learner') || '';
    const l = sessionStorage.getItem('gp_lang') || '';
    if (!id) {
      router.push(token ? `/login?token=${encodeURIComponent(token)}` : '/login');
      return;
    }
    if (!l) {
      router.push(token ? `/language?token=${encodeURIComponent(token)}` : '/language');
      return;
    }
    setLearner(id);
    setLang(l);
  }, [router, token]);

  async function track(eventType) {
    if (!learner || !lang || !video) return;
    try {
      await fetch(`/api/track?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId: learner, videoId: video.id, language: lang, eventType }),
      });
    } catch {
      // Tracking must never break playback.
    }
  }

  function onPlay() {
    // Once per page visit, not once per un-pause.
    if (startedRef.current) return;
    startedRef.current = true;
    track('start');
  }

  async function markComplete() {
    if (!ended || saving || completedNow) return;
    setSaving(true);
    await track('complete');
    setCompletedNow(true);
    setSaving(false);
  }

  if (!learner || !lang) return <div className="loading">Loading…</div>;

  const s = t(lang);
  const q = token ? `?token=${encodeURIComponent(token)}` : '';

  if (!video) {
    return (
      <main className="shell">
        <p style={{ marginBottom: 16 }}>Module not found.</p>
        <Link href={`/dashboard${q}`} className="btn-ghost">{s.dash_back}</Link>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="brand-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRANDING.logo_path} alt={BRANDING.company_name} className="brand-logo" />
        <Link href={`/dashboard${q}`} className="btn-ghost">← {s.dash_back}</Link>
      </header>

      <div className="player-head">
        <h1>{video.title[lang] || video.title.en}</h1>
        <p>{video.description[lang] || video.description.en}</p>
      </div>

      {/* key={lang} forces a remount when the language changes, so the <source>
          actually swaps. Without it React keeps the element and the old file
          keeps playing. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={lang}
        ref={videoRef}
        className="player-frame"
        controls
        controlsList="nodownload"
        preload="metadata"
        poster={video.thumbnail}
        onPlay={onPlay}
        onEnded={() => setEnded(true)}
      >
        <source src={videoUrl(video.id, lang)} type="video/mp4" />
      </video>

      <div className="player-actions">
        {completedNow ? (
          <span className="complete-done">✓ {s.dash_completed_badge}</span>
        ) : (
          <button className="btn-primary" onClick={markComplete} disabled={!ended || saving}>
            {s.dash_complete_button}
          </button>
        )}
        {!ended && !completedNow && <span className="player-hint">{s.dash_complete_locked}</span>}
        {completedNow && (
          <Link href={`/dashboard${q}`} className="btn-ghost">{s.dash_back}</Link>
        )}
      </div>

      {BRANDING.footer_show && <footer className="portal-footer">{BRANDING.footer_text}</footer>}
    </main>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <WatchInner />
    </Suspense>
  );
}

'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRANDING } from '@/lib/branding';
import { VIDEOS } from '@/lib/videos';
import { t } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';

/**
 * Learner dashboard: the five modules, their completion state, and progress.
 *
 * Learners can see their own progress (the client asked for this explicitly) —
 * their own only. The endpoint takes a learnerId and returns just that person's
 * rows; nobody can see anyone else's completions from here.
 */
function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [learner, setLearner] = useState('');
  const [lang, setLang] = useState('');
  const [role, setRole] = useState('');
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

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
    setRole(sessionStorage.getItem('gp_role') || '');
  }, [router, token]);

  const loadProgress = useCallback(async () => {
    if (!learner) return;
    try {
      const res = await fetch(
        `/api/track?token=${encodeURIComponent(token)}&learnerId=${encodeURIComponent(learner)}`
      );
      if (res.ok) {
        const data = await res.json();
        setProgress(data.progress || {});
      }
    } catch {
      // Progress is a nice-to-have; never block the module list on it.
    } finally {
      setLoading(false);
    }
  }, [learner, token]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  // Keep <html lang> honest for screen readers.
  useEffect(() => {
    if (lang && typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  function signOut() {
    sessionStorage.clear();
    router.push(token ? `/login?token=${encodeURIComponent(token)}` : '/login');
  }

  if (!learner || !lang) return <div className="loading">Loading…</div>;

  const s = t(lang);
  const done = VIDEOS.filter((v) => progress[v.id]?.completions > 0).length;
  const pct = VIDEOS.length ? Math.round((done / VIDEOS.length) * 100) : 0;
  const q = token ? `?token=${encodeURIComponent(token)}` : '';

  return (
    <main className="shell">
      <header className="brand-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRANDING.logo_path} alt={BRANDING.company_name} className="brand-logo" />
        <div className="dash-meta">
          {(role === 'admin' || role === 'super_admin') && (
            <Link
              href={`/admin${token ? `?token=${encodeURIComponent(token)}` : ''}`}
              className="btn-ghost"
            >
              {s.dash_admin} →
            </Link>
          )}
          <LanguageToggle
            learner={learner}
            token={token}
            lang={lang}
            onChange={setLang}
          />
          <button className="btn-ghost" onClick={signOut}>{s.dash_signout}</button>
        </div>
      </header>

      <div className="dash-head">
        <h1>{s.dash_title}</h1>
        <p>{s.dash_subtitle}</p>
      </div>

      <div className="progress-line">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-label">{s.dash_progress(done, VIDEOS.length)}</span>
      </div>

      {loading ? (
        <div className="loading">{s.dash_loading}</div>
      ) : (
        <section className="video-grid">
          {VIDEOS.map((v, i) => {
            const p = progress[v.id];
            const isDone = (p?.completions || 0) > 0;
            return (
              <Link key={v.id} href={`/watch/${v.id}${q}`} className="video-card">
                <div className="video-thumb-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt="" className="video-thumb" />
                  <span className="video-number">{i + 1}</span>
                  {isDone && <span className="video-badge">{s.dash_completed_badge}</span>}
                </div>
                <div className="video-body">
                  <h2>{v.title[lang] || v.title.en}</h2>
                  <p>{v.description[lang] || v.description.en}</p>
                  <div className="video-foot">
                    <span className="video-status" data-done={isDone}>
                      {isDone ? s.dash_completed_times(p.completions) : s.dash_not_started}
                    </span>
                    <span className="video-cta">
                      {isDone ? s.dash_rewatch : s.dash_watch} →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {BRANDING.footer_show && <footer className="portal-footer">{BRANDING.footer_text}</footer>}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <DashboardInner />
    </Suspense>
  );
}

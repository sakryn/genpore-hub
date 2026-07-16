'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRANDING } from '@/lib/branding';
import { STRINGS, LANGUAGES } from '@/lib/i18n';

/**
 * Language picker.
 *
 * Shown once, on first login, before the learner has a saved preference. The
 * choice is written to their user row, so it follows them to any device and
 * they never see this screen again — unless they clear it deliberately from
 * the toggle on the dashboard.
 *
 * Bilingual for the same reason the login screen is: someone who reads only
 * Spanish must be able to navigate this without reading English. Each option is
 * labelled in its OWN language ("Español", not "Spanish"), which is the one
 * thing every speaker can recognise regardless of what they read.
 */
function LanguageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [learner, setLearner] = useState('');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = sessionStorage.getItem('gp_learner') || '';
    if (!id) {
      router.push(token ? `/login?token=${encodeURIComponent(token)}` : '/login');
      return;
    }
    setLearner(id);
  }, [router, token]);

  const en = STRINGS.en;
  const es = STRINGS.es;

  async function choose(lang) {
    if (busy) return;
    setSelected(lang);
    setBusy(true);
    setErr('');

    try {
      const res = await fetch(`/api/set-language?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId: learner, language: lang }),
      });
      if (!res.ok) throw new Error('save failed');

      sessionStorage.setItem('gp_lang', lang);
      router.push(token ? `/dashboard?token=${encodeURIComponent(token)}` : '/dashboard');
    } catch {
      setErr(`${en.login_generic_error} / ${es.login_generic_error}`);
      setBusy(false);
      setSelected('');
    }
  }

  if (!learner) return <div className="loading">Loading…</div>;

  return (
    <main className="auth-shell">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRANDING.logo_path} alt={BRANDING.company_name} className="auth-logo" />

        <div className="bilingual-pair" style={{ marginBottom: 6 }}>
          <span className="primary-lang">{en.lang_title}</span>
          <span className="second-lang">{es.lang_title}</span>
        </div>

        <p className="sub">
          {en.lang_subtitle}
          <br />
          {es.lang_subtitle}
        </p>

        <div className="lang-options">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className="lang-option"
              data-selected={selected === l.code}
              onClick={() => choose(l.code)}
              disabled={busy}
              lang={l.code}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="auth-error">{err}</div>
      </div>
    </main>
  );
}

export default function LanguagePage() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <LanguageInner />
    </Suspense>
  );
}

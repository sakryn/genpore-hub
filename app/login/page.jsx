'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRANDING } from '@/lib/branding';
import { STRINGS } from '@/lib/i18n';

/**
 * Login gate.
 *
 * BILINGUAL BY DESIGN: this screen shows English and Spanish together rather
 * than picking one. A Spanish-speaking employee should never have to parse an
 * English screen to reach the language picker — that would defeat the point of
 * having one. Language selection happens AFTER we know who they are, because
 * the choice is saved to their user row.
 *
 * Passcode is the only credential; there is no username field. The passcode
 * both authenticates and identifies.
 */
function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [passcode, setPasscode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const en = STRINGS.en;
  const es = STRINGS.es;

  async function submit(e) {
    e?.preventDefault();
    if (!passcode.trim() || busy) return;

    setBusy(true);
    setErr('');

    try {
      const res = await fetch(`/api/login?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      if (res.status === 429) {
        setErr('Too many attempts — please wait a minute. / Demasiados intentos: espere un minuto.');
        setBusy(false);
        return;
      }
      if (!res.ok) {
        // Show the error in both languages: we do not yet know which they read.
        setErr(`${en.login_error} / ${es.login_error}`);
        setBusy(false);
        return;
      }

      const data = await res.json();

      // Identity lives in sessionStorage: it dies with the tab, which is the
      // right default for a shared shop-floor machine.
      sessionStorage.setItem('gp_learner', data.learnerId);
      sessionStorage.setItem('gp_name', data.displayName || '');
      sessionStorage.setItem('gp_role', data.role || 'user');
      sessionStorage.setItem('gp_passcode', passcode.trim());
      if (data.language) sessionStorage.setItem('gp_lang', data.language);

      const q = token ? `?token=${encodeURIComponent(token)}` : '';

      // Admins go straight to the dashboard — they are not the training audience.
      if (data.role === 'admin' || data.role === 'super_admin') {
        router.push(`/admin${q}`);
        return;
      }

      // No language saved yet => first login => pick one.
      router.push(data.language ? `/dashboard${q}` : `/language${q}`);
    } catch {
      setErr(`${en.login_generic_error} / ${es.login_generic_error}`);
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRANDING.logo_path} alt={BRANDING.company_name} className="auth-logo" />

        <div className="bilingual-pair" style={{ marginBottom: 6 }}>
          <span className="primary-lang">{en.login_title}</span>
          <span className="second-lang">{es.login_title}</span>
        </div>

        <p className="sub">
          {en.login_subtitle}
          <br />
          {es.login_subtitle}
        </p>

        <form onSubmit={submit}>
          <input
            className="auth-input"
            type="password"
            inputMode="text"
            autoComplete="off"
            placeholder={`${en.login_passcode} / ${es.login_passcode}`}
            aria-label={`${en.login_passcode} / ${es.login_passcode}`}
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            disabled={busy}
          />

          <div className="auth-error">{err}</div>

          <button type="submit" className="btn-primary" disabled={busy || !passcode.trim()}>
            {busy ? `${en.login_working}` : `${en.login_button} / ${es.login_button}`}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}

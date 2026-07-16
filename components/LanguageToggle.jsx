'use client';

import { useState } from 'react';
import { LANGUAGES } from '@/lib/i18n';

/**
 * EN / ES toggle, top right.
 *
 * Exists because someone will mis-tap on the picker, and a Spanish speaker
 * stranded on an English dashboard with no visible way out is a support call.
 *
 * Updates optimistically — the UI switches immediately, the write happens
 * behind it. If the write fails we roll back, because silently showing Spanish
 * while the database says English would mean the wrong language on next login,
 * with no clue why.
 */
export default function LanguageToggle({ learner, token, lang, onChange }) {
  const [busy, setBusy] = useState(false);

  async function pick(code) {
    if (code === lang || busy) return;
    const previous = lang;

    setBusy(true);
    onChange(code);
    sessionStorage.setItem('gp_lang', code);

    try {
      const res = await fetch(`/api/set-language?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerId: learner, language: code }),
      });
      if (!res.ok) throw new Error('save failed');
    } catch {
      onChange(previous);
      sessionStorage.setItem('gp_lang', previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lang-toggle" role="group" aria-label="Language / Idioma">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          data-active={l.code === lang}
          onClick={() => pick(l.code)}
          disabled={busy}
          lang={l.code}
          aria-pressed={l.code === lang}
        >
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

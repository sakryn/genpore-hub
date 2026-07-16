'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Root route. Nothing lives here — it just sends people where they belong,
 * preserving the token so a bare link like
 *
 *   https://portal.genpore.com/?token=XXX
 *
 * works as an entry point for everyone. Without this, the bare domain 404s and
 * every link has to remember to say /login.
 *
 * Routing:
 *   no identity            -> /login
 *   admin / super_admin    -> /admin
 *   learner, no language   -> /language
 *   learner, has language  -> /dashboard
 */
function RootInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = token ? `?token=${encodeURIComponent(token)}` : '';
    const learner = sessionStorage.getItem('gp_learner') || '';
    const role = sessionStorage.getItem('gp_role') || '';
    const lang = sessionStorage.getItem('gp_lang') || '';

    if (!learner) router.replace(`/login${q}`);
    else if (role === 'admin' || role === 'super_admin') router.replace(`/admin${q}`);
    else if (!lang) router.replace(`/language${q}`);
    else router.replace(`/dashboard${q}`);
  }, [router, token]);

  return <div className="loading">…</div>;
}

export default function RootPage() {
  return (
    <Suspense fallback={<div className="loading">…</div>}>
      <RootInner />
    </Suspense>
  );
}

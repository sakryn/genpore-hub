'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRANDING } from '@/lib/branding';
import { VIDEOS } from '@/lib/videos';

/**
 * Admin dashboard.
 *
 *   'admin'       — sees everything, manages ordinary users
 *   'super_admin' — same, plus may manage admins and grant the admin role
 *
 * The UI hides controls by role for clarity, but the server re-checks on every
 * request. Hiding a button is convenience, not the security boundary.
 *
 * NOTE ON STYLING: this page uses inline styles only — it does NOT read
 * globals.css. Editing that stylesheet will not change anything here. The one
 * value it takes from branding is the backdrop and the accent.
 */

const ACCENT = BRANDING.primary_color || '#0079C0';
const ADMIN_BG = BRANDING.admin_background || '#0f1114';

function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function AdminInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [ready, setReady] = useState(false);
  const [role, setRole] = useState('');
  const [passcode, setPasscode] = useState('');
  const [name, setName] = useState('');

  const [from, setFrom] = useState(isoDay(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [to, setTo] = useState(isoDay(Date.now()));
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const r = sessionStorage.getItem('gp_role') || '';
    const pc = sessionStorage.getItem('gp_passcode') || '';
    const nm = sessionStorage.getItem('gp_name') || '';
    if (r !== 'admin' && r !== 'super_admin') {
      router.push(token ? `/login?token=${encodeURIComponent(token)}` : '/login');
      return;
    }
    setRole(r); setPasscode(pc); setName(nm); setReady(true);
  }, [router, token]);

  const load = useCallback(async () => {
    if (!passcode) return;
    setLoading(true); setErr('');
    try {
      const qs = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
      const [statsRes, usersRes] = await Promise.all([
        fetch(`/api/admin-stats?${qs}`, { headers: { 'x-admin-passcode': passcode } }),
        fetch('/api/admin-users', { headers: { 'x-admin-passcode': passcode } }),
      ]);
      if (!statsRes.ok) throw new Error('stats failed');
      setData(await statsRes.json());
      if (usersRes.ok) setUsers((await usersRes.json()).users || []);
    } catch {
      setErr('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [passcode, from, to]);

  useEffect(() => { if (ready) load(); }, [ready, load]);

  function exportCsv() {
    const qs = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
    // A plain link cannot carry the passcode header, so fetch as a blob.
    fetch(`/api/admin-export?${qs}`, { headers: { 'x-admin-passcode': passcode } })
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genpore-training-${isoDay(Date.now())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setErr('Export failed.'));
  }

  function signOut() {
    sessionStorage.clear();
    router.push(token ? `/login?token=${encodeURIComponent(token)}` : '/login');
  }

  if (!ready) return <div style={{ padding: 40, color: '#888' }}>Loading…</div>;

  const totals = data?.totals || {};
  const perUser = data?.perUser || [];
  const perVideo = data?.perVideo || [];
  const matrix = data?.matrix || [];
  const q = token ? `?token=${encodeURIComponent(token)}` : '';

  // learner_id -> { video_id -> completions }
  const byLearner = {};
  for (const m of matrix) {
    if (!byLearner[m.learner_id]) byLearner[m.learner_id] = {};
    byLearner[m.learner_id][m.video_id] =
      (byLearner[m.learner_id][m.video_id] || 0) + m.completions;
  }

  return (
    <main style={{ minHeight: '100vh', background: ADMIN_BG, color: '#eee', padding: '24px 20px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>GenPore — Training Dashboard</h1>
            <div style={{ color: '#8b95a1', fontSize: 13, marginTop: 2 }}>
              {name} · {role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCsv} style={btnPrimary}>Export CSV</button>
            <button onClick={signOut} style={btnGhost}>Sign out</button>
          </div>
        </header>

        {/* One door into the learner side. Admins land on the module list, not
            inside a specific video. */}
        <div style={card}>
          <div style={cardLabel}>TRAINING PORTAL</div>
          <Link href={`/dashboard${q}`} style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-block' }}>
            Go to Training Modules →
          </Link>
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
          <label style={lbl}>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} /></label>
          <label style={lbl}>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} /></label>
          <button onClick={load} style={btnGhost}>Apply</button>
          {loading && <span style={{ color: '#8b95a1', fontSize: 13 }}>Loading…</span>}
          {err && <span style={{ color: '#ff9b9b', fontSize: 13 }}>{err}</span>}
        </div>

        {/* Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          <Stat label="Active users" value={totals.total_users ?? '—'} />
          <Stat label="Logins (range)" value={totals.logins ?? '—'} />
          <Stat label="Users active (range)" value={totals.active_users ?? '—'} />
          <Stat label="Completions (range)" value={totals.completions ?? '—'} />
        </div>

        {/* Per-video rollup */}
        <h2 style={h2}>By Module</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={table}>
            <thead><tr>
              {['#', 'Module', 'Unique viewers', 'Total completions', 'English', 'Spanish'].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {VIDEOS.map((v, i) => {
                const row = perVideo.find((p) => p.video_id === v.id);
                return (
                  <tr key={v.id}>
                    <td style={td}>{i + 1}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{v.title.en}</td>
                    <td style={td}>{row?.unique_viewers ?? 0}</td>
                    <td style={{ ...td, color: ACCENT, fontWeight: 700 }}>{row?.total_completions ?? 0}</td>
                    <td style={td}>{row?.completions_en ?? 0}</td>
                    <td style={td}>{row?.completions_es ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Per-user rollup */}
        <h2 style={h2}>By Person</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={table}>
            <thead><tr>
              {['Name', 'Role', 'Lang', 'Modules done', 'Total completions', 'Last login', ''].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {perUser.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#777' }}>No users.</td></tr>}
              {perUser.map((u) => {
                const open = expanded === u.learner_id;
                return (
                  <React.Fragment key={u.learner_id}>
                    <tr>
                      <td style={{ ...td, fontWeight: 600 }}>{u.display_name}</td>
                      <td style={td}>{u.role}</td>
                      <td style={td}>{(u.language || '—').toUpperCase()}</td>
                      <td style={{ ...td, color: u.modules_completed === VIDEOS.length ? '#7ee787' : '#eee', fontWeight: 700 }}>
                        {u.modules_completed} / {VIDEOS.length}
                      </td>
                      <td style={td}>{u.total_completions}</td>
                      <td style={td}>{fmtDate(u.last_login_at)}</td>
                      <td style={td}>
                        <button onClick={() => setExpanded(open ? null : u.learner_id)} style={btnTiny}>
                          {open ? 'Hide' : 'View detail'}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, borderBottom: '1px solid #1e2228' }}>
                          <div style={{ padding: '14px 16px', background: '#15181d' }}>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                              Module completions — {u.display_name}
                            </div>
                            {VIDEOS.map((v, i) => {
                              const n = byLearner[u.learner_id]?.[v.id] || 0;
                              return (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #1e2228', fontSize: 13 }}>
                                  <span style={{ color: '#bbb' }}>{i + 1}. {v.title.en}</span>
                                  <span style={{ color: n > 0 ? '#7ee787' : '#666', fontWeight: 700 }}>
                                    {n > 0 ? `${n}x` : 'Not completed'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <ManageUsers
          users={users}
          role={role}
          passcode={passcode}
          actorId={typeof window !== 'undefined' ? sessionStorage.getItem('gp_learner') : ''}
          onChanged={load}
        />
      </div>
    </main>
  );
}

/**
 * User management.
 *
 * Both admins and super admins see this — the difference is enforced per-row:
 * an admin cannot touch another admin, and the Role dropdown only offers
 * 'user' to them. The server enforces the same rules; this is just so the UI
 * does not offer actions that will bounce.
 */
function ManageUsers({ users, role, passcode, actorId, onChanged }) {
  const [learnerId, setLearnerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [language, setLanguage] = useState('');
  const [pc, setPc] = useState('');
  const [msg, setMsg] = useState('');

  const isSuper = role === 'super_admin';

  function canTouch(target) {
    if (isSuper) return true;
    return target.role === 'user';
  }

  async function save() {
    if (!learnerId || !displayName || !pc) {
      setMsg('learner-id, name, and passcode are all required.');
      return;
    }
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-passcode': passcode },
      body: JSON.stringify({
        learnerId, displayName, email, role: newRole, passcode: pc,
        language: language || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg(`Saved ${displayName}.`);
      setLearnerId(''); setDisplayName(''); setEmail(''); setPc('');
      setNewRole('user'); setLanguage('');
      onChanged();
    } else {
      setMsg(body.error || 'Save failed.');
    }
  }

  async function deactivate(u) {
    if (!confirm(`Deactivate ${u.display_name}? Their history stays; they can no longer log in.`)) return;
    const res = await fetch(`/api/admin-users?learnerId=${encodeURIComponent(u.learner_id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-passcode': passcode },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) onChanged();
    else setMsg(body.error || 'Could not deactivate.');
  }

  /**
   * Prefill the form from an existing row.
   *
   * Necessary because saving is an UPSERT: it overwrites name, email, role, and
   * language along with the passcode. Without loading the current values first,
   * resetting someone's passcode would silently blank the rest of their record.
   */
  function startReset(u) {
    setLearnerId(u.learner_id);
    setDisplayName(u.display_name || '');
    setEmail(u.email || '');
    setNewRole(u.role || 'user');
    setLanguage(u.language || '');
    setPc('');
    setMsg(`Resetting passcode for ${u.display_name} — type a new one and click Save.`);
  }

  return (
    <div style={{ ...card, marginTop: 8 }}>
      <h2 style={{ ...h2, marginTop: 0 }}>
        Manage Users{' '}
        <span style={{ color: '#777', fontSize: 13, fontWeight: 400 }}>
          {isSuper ? '(super admin — can manage admins)' : '(admin — can manage users)'}
        </span>
      </h2>

      <p style={{ color: '#8b95a1', fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>
        Submitting an existing learner-id <strong style={{ color: '#aaa' }}>updates</strong> that person
        rather than creating a new one — including their passcode, name, email, role, and language.
        That is how you reset a forgotten passcode: click <em>Reset passcode</em> on their row to
        prefill this form, then type the new one.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input placeholder="learner-id (e.g. maria-g)" value={learnerId} onChange={(e) => setLearnerId(e.target.value)} style={inp} />
        <input placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inp} />
        <input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={inp}>
          <option value="user">User</option>
          {isSuper && <option value="admin">Admin</option>}
          {isSuper && <option value="super_admin">Super Admin</option>}
        </select>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inp}>
          <option value="">Language: ask on first login</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
        <input placeholder="Passcode" value={pc} onChange={(e) => setPc(e.target.value)} style={inp} />
        <button onClick={save} style={btnPrimary}>Save</button>
      </div>

      {msg && <div style={{ color: '#8b95a1', fontSize: 13, marginBottom: 10 }}>{msg}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={table}>
          <thead><tr>
            {['Name', 'Learner ID', 'Role', 'Lang', 'Active', 'Last login', ''].map((h) => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {users.map((u) => {
              const editable = canTouch(u);
              return (
                <tr key={u.learner_id}>
                  <td style={td}>{u.display_name}</td>
                  <td style={{ ...td, color: '#8b95a1' }}>{u.learner_id}</td>
                  <td style={td}>{u.role}</td>
                  <td style={td}>{(u.language || '—').toUpperCase()}</td>
                  <td style={td}>{u.active ? 'Yes' : 'No'}</td>
                  <td style={{ ...td, color: '#8b95a1' }}>{fmtDate(u.last_login_at)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    {editable ? (
                      <>
                        <button onClick={() => startReset(u)} style={{ ...btnTiny, marginRight: 6 }}>Reset passcode</button>
                        {u.active && u.learner_id !== actorId && (
                          <button onClick={() => deactivate(u)} style={btnDanger}>Deactivate</button>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#555', fontSize: 12 }}>super admin only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={card}>
      <div style={{ color: '#8b95a1', fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

const card = { background: '#15181d', border: '1px solid #23272e', borderRadius: 12, padding: '14px 16px', marginBottom: 20 };
const cardLabel = { color: '#8b95a1', fontSize: 12, marginBottom: 10, fontWeight: 700, letterSpacing: 0.3 };
const h2 = { fontSize: 15, fontWeight: 800, margin: '18px 0 10px' };
const lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#8b95a1' };
const inp = { padding: '8px 10px', borderRadius: 8, border: '1px solid #2b3038', background: '#0f1114', color: '#eee', fontSize: 14 };
const btnPrimary = { padding: '9px 16px', borderRadius: 8, border: 'none', background: ACCENT, color: BRANDING.primary_color_text || '#fff', fontWeight: 700, cursor: 'pointer' };
const btnGhost = { padding: '9px 16px', borderRadius: 8, border: '1px solid #2b3038', background: 'transparent', color: '#eee', cursor: 'pointer' };
const btnTiny = { padding: '4px 10px', borderRadius: 6, border: '1px solid #2b3038', background: 'transparent', color: ACCENT, cursor: 'pointer', fontSize: 12 };
const btnDanger = { padding: '4px 10px', borderRadius: 6, border: '1px solid #5a3333', background: 'transparent', color: '#ff9b9b', cursor: 'pointer', fontSize: 12 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const th = { textAlign: 'left', padding: '8px 10px', color: '#8b95a1', fontWeight: 700, fontSize: 12, borderBottom: '1px solid #23272e', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', borderBottom: '1px solid #1e2228', whiteSpace: 'nowrap' };

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#888' }}>Loading…</div>}>
      <AdminInner />
    </Suspense>
  );
}

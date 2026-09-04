'use client';

import { useEffect, useState } from 'react';

const deep = (v) => JSON.parse(JSON.stringify(v));
const pickDraft = (s) => deep({ itinerary: s.itinerary, challenge: s.challenge, movies: s.movies });

function fmt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function isoToLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function localToIso(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminDashboard({ initial }) {
  const [state, setState] = useState(initial);
  const [draft, setDraft] = useState(() => pickDraft(initial));
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // 'reset' | 'relock' | null

  // Locale/timezone formatting differs between server and browser, so render
  // timestamps only after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ft = (iso) => (mounted ? fmt(iso) : '…');

  const run = async (action, payload = {}, okMsg = 'Saved.') => {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch('/api/admin/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `request failed (${res.status})`);
      setState(data);
      setDraft(pickDraft(data));
      setFlash({ kind: 'ok', text: okMsg });
    } catch (e) {
      setFlash({ kind: 'err', text: e.message });
    }
    setBusy(false);
    setConfirming(null);
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  const setStep = (i, patch) =>
    setDraft((d) => {
      const n = deep(d);
      Object.assign(n.itinerary[i], patch);
      return n;
    });
  const moveStep = (i, dir) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.itinerary.length) return d;
      const n = deep(d);
      [n.itinerary[i], n.itinerary[j]] = [n.itinerary[j], n.itinerary[i]];
      return n;
    });
  const removeStep = (i) =>
    setDraft((d) => {
      const n = deep(d);
      n.itinerary.splice(i, 1);
      return n;
    });
  const addStep = () =>
    setDraft((d) => {
      const n = deep(d);
      n.itinerary.push({
        id: `step-${Date.now()}`,
        time: '12:00',
        title: 'New checkpoint',
        desc: '',
        icon: '📍',
        location: '',
        stamp: 'PENDING',
        isSurprise: false,
        locked: false,
        unlockAt: null,
        unlockedAt: null,
      });
      return n;
    });

  const setMovie = (i, patch) =>
    setDraft((d) => {
      const n = deep(d);
      Object.assign(n.movies[i], patch);
      return n;
    });
  const moveMovie = (i, dir) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.movies.length) return d;
      const n = deep(d);
      [n.movies[i], n.movies[j]] = [n.movies[j], n.movies[i]];
      return n;
    });
  const removeMovie = (i) =>
    setDraft((d) => {
      const n = deep(d);
      n.movies.splice(i, 1);
      return n;
    });
  const addMovie = () =>
    setDraft((d) => {
      const n = deep(d);
      n.movies.push({
        id: `movie-${Date.now()}`,
        title: '[NEW MOVIE]',
        genre: '',
        duration: '',
        note: '',
        poster: '',
      });
      return n;
    });

  const setChallenge = (patch) =>
    setDraft((d) => ({ ...deep(d), challenge: { ...d.challenge, ...patch } }));

  const sub = state.submission;
  const challengeStatus = state.challenge.locked
    ? 'locked'
    : (sub?.status ?? 'available');

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <p className="admin-kicker">mission control</p>
          <h1 className="admin-title">Have a Good Day</h1>
        </div>
        <div className="admin-actions">
          <a className="btn-ghost" href="/" target="_blank" rel="noreferrer">
            Preview guest page ↗
          </a>
          <button type="button" className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {flash && (
        <p className={`admin-flash admin-flash--${flash.kind}`} role="status">
          {flash.text}
        </p>
      )}

      <section className="panel">
        <h2 className="panel-title">Status</h2>
        <div className="pills">
          <span className={`pill pill--${challengeStatus}`}>challenge: {challengeStatus}</span>
          <span className={`pill pill--${state.vault.unlocked ? 'approved' : 'locked'}`}>
            vault: {state.vault.unlocked ? 'open' : 'locked'}
          </span>
          <span className={`pill pill--${state.selection ? 'approved' : 'muted'}`}>
            movie: {state.selection
              ? (state.movies.find((m) => m.id === state.selection.movieId)?.title ?? 'picked')
              : 'not picked'}
          </span>
        </div>
        <dl className="stamps-list">
          <div><dt>submitted</dt><dd>{ft(sub?.submittedAt)}</dd></div>
          <div><dt>reviewed</dt><dd>{ft(sub?.reviewedAt)}</dd></div>
          <div><dt>approved</dt><dd>{ft(sub?.approvedAt)}</dd></div>
          <div><dt>vault opened</dt><dd>{ft(state.vault.unlockedAt)}</dd></div>
          <div><dt>movie picked</dt><dd>{ft(state.selection?.selectedAt)}</dd></div>
          <div><dt>last change</dt><dd>{ft(state.meta.updatedAt)}</dd></div>
        </dl>
      </section>

      <section className="panel">
        <h2 className="panel-title">Her submission</h2>
        {!sub ? (
          <p className="panel-empty">Nothing submitted yet. The quest is {challengeStatus}.</p>
        ) : (
          <>
            <blockquote className="sub-note">
              {sub.note ? `“${sub.note}”` : <em>(submitted without a note)</em>}
            </blockquote>
            <p className="panel-meta">
              status: <strong>{sub.status}</strong> · submitted {ft(sub.submittedAt)}
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn-primary"
                disabled={busy || sub.status === 'approved'}
                onClick={() => run('approve', {}, 'Approved — vault is open.')}
              >
                Approve &amp; open vault
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={busy || sub.status === 'rejected'}
                onClick={() => run('reject', {}, 'Rejected — she can retry.')}
              >
                Request redo
              </button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title">Movie vault</h2>
        <p className="panel-meta">
          The vault opens automatically on approval. Manual override:
        </p>
        <div className="btn-row">
          {!state.vault.unlocked ? (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => run('vault', { unlocked: true }, 'Vault unlocked.')}
            >
              Unlock vault
            </button>
          ) : confirming === 'relock' ? (
            <>
              <span className="confirm-ask">Re-lock the vault she may be looking at?</span>
              <button
                type="button"
                className="btn-danger"
                disabled={busy}
                onClick={() => run('vault', { unlocked: false }, 'Vault re-locked.')}
              >
                Yes, re-lock
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirming(null)}>
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              onClick={() => setConfirming('relock')}
            >
              Re-lock vault…
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Itinerary</h2>
        <ul className="edit-list">
          {draft.itinerary.map((s, i) => (
            <li key={s.id} className="edit-item">
              <div className="edit-item-head">
                <span className="edit-item-n">{i + 1}</span>
                <input
                  className="field field--title"
                  value={s.title}
                  maxLength={80}
                  aria-label={`title of checkpoint ${i + 1}`}
                  onChange={(e) => setStep(i, { title: e.target.value })}
                />
                <div className="row-tools">
                  <button type="button" className="btn-icon" aria-label="move up" disabled={i === 0} onClick={() => moveStep(i, -1)}>↑</button>
                  <button type="button" className="btn-icon" aria-label="move down" disabled={i === draft.itinerary.length - 1} onClick={() => moveStep(i, 1)}>↓</button>
                  <button type="button" className="btn-icon btn-icon--danger" aria-label="remove checkpoint" onClick={() => removeStep(i)}>✕</button>
                </div>
              </div>
              <div className="field-grid">
                <label>time
                  <input className="field" value={s.time} maxLength={20} onChange={(e) => setStep(i, { time: e.target.value })} />
                </label>
                <label>icon
                  <input className="field" value={s.icon} maxLength={8} onChange={(e) => setStep(i, { icon: e.target.value })} />
                </label>
                <label>stamp
                  <input className="field" value={s.stamp} maxLength={20} onChange={(e) => setStep(i, { stamp: e.target.value })} />
                </label>
                <label className="span2">description
                  <input className="field" value={s.desc} maxLength={300} onChange={(e) => setStep(i, { desc: e.target.value })} />
                </label>
                <label className="span2">location (hidden while locked)
                  <input className="field" value={s.location} maxLength={120} onChange={(e) => setStep(i, { location: e.target.value })} />
                </label>
                <label className="check">
                  <input type="checkbox" checked={s.isSurprise} onChange={(e) => setStep(i, { isSurprise: e.target.checked })} />
                  surprise
                </label>
                <label className="check">
                  <input type="checkbox" checked={s.locked} onChange={(e) => setStep(i, { locked: e.target.checked })} />
                  locked
                </label>
                {s.locked && (
                  <label className="span2">auto-unlock at (optional)
                    <input
                      type="datetime-local"
                      className="field"
                      value={isoToLocal(s.unlockAt)}
                      onChange={(e) => setStep(i, { unlockAt: localToIso(e.target.value) })}
                    />
                  </label>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="btn-row">
          <button type="button" className="btn-ghost" onClick={addStep}>+ Add checkpoint</button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => run('update', { itinerary: draft.itinerary }, 'Itinerary saved.')}
          >
            Save itinerary
          </button>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Challenge</h2>
        <div className="field-grid">
          <label className="span2">title
            <input className="field" value={draft.challenge.title} maxLength={80} onChange={(e) => setChallenge({ title: e.target.value })} />
          </label>
          <label className="span2">task
            <textarea className="field" rows={3} value={draft.challenge.desc} maxLength={500} onChange={(e) => setChallenge({ desc: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={draft.challenge.locked} onChange={(e) => setChallenge({ locked: e.target.checked })} />
            locked (hidden from her)
          </label>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => run('update', { challenge: draft.challenge }, 'Challenge saved.')}
          >
            Save challenge
          </button>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Movies</h2>
        <ul className="edit-list">
          {draft.movies.map((m, i) => (
            <li key={m.id} className="edit-item">
              <div className="edit-item-head">
                <span className="edit-item-n">🎬</span>
                <input
                  className="field field--title"
                  value={m.title}
                  maxLength={80}
                  aria-label={`title of movie ${i + 1}`}
                  onChange={(e) => setMovie(i, { title: e.target.value })}
                />
                <div className="row-tools">
                  <button type="button" className="btn-icon" aria-label="move up" disabled={i === 0} onClick={() => moveMovie(i, -1)}>↑</button>
                  <button type="button" className="btn-icon" aria-label="move down" disabled={i === draft.movies.length - 1} onClick={() => moveMovie(i, 1)}>↓</button>
                  <button type="button" className="btn-icon btn-icon--danger" aria-label="remove movie" onClick={() => removeMovie(i)}>✕</button>
                </div>
              </div>
              <div className="field-grid">
                <label>genre
                  <input className="field" value={m.genre} maxLength={40} onChange={(e) => setMovie(i, { genre: e.target.value })} />
                </label>
                <label>duration
                  <input className="field" value={m.duration} maxLength={20} onChange={(e) => setMovie(i, { duration: e.target.value })} />
                </label>
                <label className="span2">personal note
                  <input className="field" value={m.note} maxLength={200} onChange={(e) => setMovie(i, { note: e.target.value })} />
                </label>
                <label className="span2">poster URL (https, optional)
                  <input className="field" value={m.poster} maxLength={500} onChange={(e) => setMovie(i, { poster: e.target.value })} />
                </label>
              </div>
            </li>
          ))}
        </ul>
        <div className="btn-row">
          <button type="button" className="btn-ghost" onClick={addMovie}>+ Add movie</button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => run('update', { movies: draft.movies }, 'Movies saved.')}
          >
            Save movies
          </button>
        </div>
      </section>

      <section className="panel panel--danger">
        <h2 className="panel-title">Danger zone</h2>
        <p className="panel-meta">
          Reset wipes her submission, the movie pick, all unlocks and every edit,
          back to the seed file.
        </p>
        {confirming === 'reset' ? (
          <div className="btn-row">
            <span className="confirm-ask">Really reset everything?</span>
            <button
              type="button"
              className="btn-danger"
              disabled={busy}
              onClick={() => run('reset', {}, 'Experience reset to defaults.')}
            >
              Yes, reset it all
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="btn-ghost" onClick={() => setConfirming('reset')}>
            Reset experience…
          </button>
        )}
      </section>
    </main>
  );
}

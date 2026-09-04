'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_MS = 15000;

function fmtUnlockTime(iso) {
  try {
    return new Date(iso).toLocaleString([], {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export default function Mission({ initial, isAdmin }) {
  const [state, setState] = useState(initial);
  const [accepted, setAccepted] = useState(null); // null until localStorage is read (no flash)
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem('mission-accepted') === '1');
    } catch {
      setAccepted(true);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/guest/state', { cache: 'no-store' });
      if (res.ok) setState(await res.json());
    } catch {
      // offline blip — keep showing the last known state
    }
  }, []);

  // Safe polling: approval flows from admin → server → here.
  useEffect(() => {
    const id = setInterval(refresh, POLL_MS);
    const onWake = () => refresh();
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [refresh]);

  const accept = () => {
    setLeaving(true);
    try {
      localStorage.setItem('mission-accepted', '1');
    } catch {
      // cosmetic only — the overlay just shows again next visit
    }
    setTimeout(() => setAccepted(true), 420);
  };

  if (accepted === null) return <div className="mission" aria-busy="true" />;

  if (!accepted) {
    return (
      <div className={`briefing${leaving ? ' briefing--out' : ''}`}>
        <p className="briefing-label">· incoming transmission ·</p>
        <h1 className="briefing-title">You have one mission tomorrow.</h1>
        <p className="briefing-sub">
          Details are on a need-to-know basis. You need to know very little.
          Just show up.
        </p>
        <button type="button" className="btn-primary" onClick={accept}>
          Accept mission
        </button>
        <p className="briefing-fine">no preparation required · snacks provided</p>
      </div>
    );
  }

  return (
    <div className="mission">
      {isAdmin && (
        <a className="preview-chip" href="/admin">
          admin preview · back to dashboard
        </a>
      )}
      <main className="dossier">
        <header className="masthead">
          <div className="postage" aria-hidden="true">
            <span>🗺️</span>
            <em>first class</em>
          </div>
          <div className="tape-note" aria-hidden="true">today is yours</div>
          <p className="mission-chip">Mission:</p>
          <h1 className="mission-title">
            Have a<br />Good Day
          </h1>
        </header>

        <ol className="route">
          {state.itinerary.map((s, i) => (
            <li
              key={s.id}
              className={`checkpoint${s.unlocked ? '' : ' checkpoint--locked'}`}
            >
              <div className="cp-rail">
                <span className="cp-num" aria-hidden="true">{i + 1}</span>
                <span className="cp-icon" aria-hidden="true">{s.icon}</span>
              </div>
              <div className="cp-body">
                <span className="cp-label">checkpoint</span>
                <h2 className="cp-title">{s.title}</h2>
                <p className="cp-desc">{s.desc}</p>
                {s.unlocked && s.location ? (
                  <p className="cp-loc">📍 {s.location}</p>
                ) : null}
                {!s.unlocked && (
                  <p className="cp-lock">
                    🔒{' '}
                    {s.unlockAt
                      ? `location declassifies ${fmtUnlockTime(s.unlockAt)}`
                      : 'location declassified on the day'}
                  </p>
                )}
              </div>
              <div className={`cp-stamp${s.unlocked ? '' : ' cp-stamp--locked'}`}>
                <span className="cp-stamp-text">
                  {s.unlocked ? s.stamp || 'READY' : 'CLASSIFIED'}
                </span>
                <span className="cp-time">{s.time}</span>
              </div>
            </li>
          ))}
        </ol>

        <Challenge state={state} onChange={setState} />
        <Vault state={state} onChange={setState} />

        <footer className="mission-foot">
          — mission control is watching (fondly) —
        </footer>
      </main>
    </div>
  );
}

function Challenge({ state, onChange }) {
  const { challenge } = state;
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/guest/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'something went sideways — try again');
      onChange(data);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const status = challenge.status;

  return (
    <section className={`quest quest--${status}`} aria-live="polite">
      <div className="quest-head">
        <span className="quest-label">side quest</span>
        <h2 className="quest-title">{challenge.title}</h2>
      </div>

      {status === 'locked' && (
        <p className="quest-desc quest-desc--muted">
          🔒 Classified. This quest hasn’t been issued yet.
        </p>
      )}

      {(status === 'available' || status === 'rejected') && (
        <div className="quest-form">
          {status === 'rejected' && (
            <p className="quest-flash quest-flash--redo">
              Mission control requests a redo. You’ve got this.
            </p>
          )}
          <p className="quest-desc">{challenge.desc}</p>
          <label className="quest-note-label" htmlFor="quest-note">
            evidence, notes, or dramatic commentary (optional)
          </label>
          <textarea
            id="quest-note"
            className="quest-note"
            rows={3}
            maxLength={1000}
            placeholder="type a little something…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={submit}
          >
            {busy ? 'Transmitting…' : 'Mission complete ✓'}
          </button>
          {error && <p className="quest-flash quest-flash--error">{error}</p>}
        </div>
      )}

      {status === 'submitted' && (
        <div className="quest-wait">
          <span className="quest-radar" aria-hidden="true" />
          <p className="quest-wait-line">Waiting for mission control…</p>
          {state.submissionNote ? (
            <p className="quest-echo">“{state.submissionNote}”</p>
          ) : null}
          <p className="quest-fine">
            Verification is very official. There may be a rubber stamp involved.
          </p>
        </div>
      )}

      {status === 'approved' && (
        <div className="quest-done">
          <span className="stamp stamp--approved">approved</span>
          <p className="quest-desc">
            Mission control confirms: quest complete. The vault below just heard
            the good news.
          </p>
        </div>
      )}
    </section>
  );
}

function VaultWheel({ spinning }) {
  const spokes = [0, 60, 120, 180, 240, 300];
  return (
    <svg
      className={`wheel${spinning ? ' wheel--spin' : ''}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="50" cy="50" r="13" fill="none" stroke="currentColor" strokeWidth="5" />
      {spokes.map((a) => (
        <line
          key={a}
          x1={50 + 13 * Math.cos((a * Math.PI) / 180)}
          y1={50 + 13 * Math.sin((a * Math.PI) / 180)}
          x2={50 + 41 * Math.cos((a * Math.PI) / 180)}
          y2={50 + 41 * Math.sin((a * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function Vault({ state, onChange }) {
  const open = state.vault.unlocked;
  const wasOpen = useRef(open);
  const [justOpened, setJustOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Play the opening animation only on the locked → unlocked transition.
  useEffect(() => {
    if (open && !wasOpen.current) {
      setJustOpened(true);
      const t = setTimeout(() => setJustOpened(false), 1800);
      wasOpen.current = open;
      return () => clearTimeout(t);
    }
    wasOpen.current = open;
    return undefined;
  }, [open]);

  const pick = async (movieId) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/guest/movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'could not save that — try again');
      onChange(data);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const selectedId = state.selection?.movieId ?? null;

  return (
    <section
      className={`vault${open ? ' vault--open' : ''}${justOpened ? ' vault--opening' : ''}`}
      aria-live="polite"
    >
      <div className="vault-tape" aria-hidden="true" />
      <p className="vault-label">· next mission ·</p>
      <div className="vault-hero">
        <VaultWheel spinning={justOpened} />
        <div className="vault-copy">
          <h2 className="vault-title">Movie vault</h2>
          <p className="vault-desc">
            {open
              ? 'Vault open. One blanket, one couch, one excellent decision to make.'
              : 'Classified until mission completion. A handpicked shortlist waits inside.'}
          </p>
        </div>
        {!open && (
          <div className="vault-lock">
            <span aria-hidden="true">🔒</span>
            <span className="vault-lock-tag">locked</span>
          </div>
        )}
      </div>

      {open && (
        <ul className="tickets">
          {state.movies.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`ticket${selectedId === m.id ? ' ticket--picked' : ''}`}
                disabled={busy}
                onClick={() => pick(m.id)}
                aria-pressed={selectedId === m.id}
              >
                {m.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ticket-poster" src={m.poster} alt="" />
                ) : (
                  <span className="ticket-poster ticket-poster--blank" aria-hidden="true">
                    🎞️
                  </span>
                )}
                <span className="ticket-body">
                  <span className="ticket-title">{m.title}</span>
                  <span className="ticket-meta">
                    {[m.genre, m.duration].filter(Boolean).join(' · ')}
                  </span>
                  {m.note ? <span className="ticket-note">{m.note}</span> : null}
                </span>
                <span className="ticket-stub" aria-hidden="true">
                  {selectedId === m.id ? 'admit 2' : 'pick'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open &&
        (selectedId ? (
          <p className="vault-final">Good choice. Snacks are now mandatory. 🍿</p>
        ) : (
          <p className="vault-hint">tap a ticket to lock it in — changing your mind is allowed</p>
        ))}
      {error && <p className="quest-flash quest-flash--error">{error}</p>}
    </section>
  );
}

// Server-side redaction + shared state helpers. Locked surprise locations and
// vaulted movies are stripped here and never reach the guest's browser.

export function stepUnlocked(step, now = Date.now()) {
  if (!step.locked) return true;
  return Boolean(step.unlockAt && now >= Date.parse(step.unlockAt));
}

export function challengeStatus(state) {
  if (state.challenge.locked) return 'locked';
  return state.submission?.status ?? 'available';
}

export function redactForGuest(state) {
  const now = Date.now();
  const status = challengeStatus(state);
  const vaultOpen = Boolean(state.vault.unlocked);
  return {
    itinerary: state.itinerary.map((s) => {
      const unlocked = stepUnlocked(s, now);
      return {
        id: s.id,
        time: s.time,
        title: s.title,
        desc: s.desc,
        icon: s.icon,
        stamp: s.stamp,
        isSurprise: s.isSurprise,
        unlocked,
        location: unlocked ? s.location : null,
        unlockAt: !unlocked && s.unlockAt ? s.unlockAt : null,
      };
    }),
    challenge: {
      title: state.challenge.title,
      desc: status === 'locked' ? null : state.challenge.desc,
      status,
    },
    submissionNote: state.submission?.note ?? null,
    vault: { unlocked: vaultOpen },
    movies: vaultOpen
      ? state.movies.map((m) => ({
          id: m.id,
          title: m.title,
          genre: m.genre,
          duration: m.duration,
          note: m.note,
          poster: m.poster,
        }))
      : [],
    selection: vaultOpen && state.selection ? { movieId: state.selection.movieId } : null,
  };
}

// --- admin input sanitizers ------------------------------------------------

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const isoOrNull = (v) => {
  if (typeof v !== 'string' || !v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

const safeId = (v, fallback) => (/^[a-zA-Z0-9_-]{1,40}$/.test(v) ? v : fallback);

const posterUrl = (v) => {
  const s = str(v, 500);
  return /^https:\/\//.test(s) ? s : '';
};

export function sanitizeItinerary(list, prev) {
  if (!Array.isArray(list)) return null;
  return list.slice(0, 12).map((s, i) => {
    const id = safeId(s?.id, `step-${Date.now()}-${i}`);
    const old = prev.find((p) => p.id === id);
    const locked = s?.locked === true;
    // Stamp unlockedAt the first time a step flips to unlocked.
    let unlockedAt = null;
    if (!locked) {
      unlockedAt = old && !old.locked ? old.unlockedAt : new Date().toISOString();
    }
    return {
      id,
      time: str(s?.time, 20),
      title: str(s?.title, 80),
      desc: str(s?.desc, 300),
      icon: str(s?.icon, 8) || '📍',
      location: str(s?.location, 120),
      stamp: str(s?.stamp, 20),
      isSurprise: s?.isSurprise === true,
      locked,
      unlockAt: isoOrNull(s?.unlockAt),
      unlockedAt,
    };
  });
}

export function sanitizeChallenge(c) {
  if (typeof c !== 'object' || c === null) return null;
  return {
    title: str(c.title, 80) || 'Side quest',
    desc: str(c.desc, 500),
    locked: c.locked === true,
  };
}

export function sanitizeMovies(list) {
  if (!Array.isArray(list)) return null;
  return list.slice(0, 12).map((m, i) => ({
    id: safeId(m?.id, `movie-${Date.now()}-${i}`),
    title: str(m?.title, 80),
    genre: str(m?.genre, 40),
    duration: str(m?.duration, 20),
    note: str(m?.note, 200),
    poster: posterUrl(m?.poster),
  }));
}

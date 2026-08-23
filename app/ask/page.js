'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const TAUNTS = [
  'nope, that one is not for you 🙈',
  'catch me if you can 🏃‍♀️💨',
  'that button is shy, try the pink one 💗',
  'hmm... it keeps slipping 🫠',
  'the universe says press YES ✨',
  'even the button wants you to say yes 🥺',
  'it has commitment issues, unlike me 😌',
  'okay this is getting embarrassing for it 😅',
  'that one is decorative. purely decorative. 🎀',
  'plot twist: there was never a no 💅',
];

// How far the button stays from the cursor. Flat 190px is nearly half an
// iPhone's width, so scale it down on small screens.
function safeGap() {
  return Math.max(90, Math.min(190, Math.min(window.innerWidth, window.innerHeight) * 0.32));
}

export default function Ask() {
  const router = useRouter();
  const noRef = useRef(null);
  const lastFlee = useRef(0);

  const [fled, setFled] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [dodges, setDodges] = useState(0);
  const [slot, setSlot] = useState({ w: 168, h: 60 });
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth <= 520);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Remember the button's natural footprint so the row doesn't collapse
  // the moment it jumps out of the flow.
  useEffect(() => {
    if (noRef.current && !fled) {
      const r = noRef.current.getBoundingClientRect();
      if (r.width) setSlot({ w: r.width, h: r.height });
    }
  }, [fled]);

  const flee = useCallback((cursorX, cursorY) => {
    const el = noRef.current;
    if (!el) return;

    // Let each escape finish before picking a new hiding spot, otherwise it
    // jitters instead of gliding away.
    const now = performance.now();
    if (now - lastFlee.current < 180) return;
    lastFlee.current = now;

    const r = el.getBoundingClientRect();
    const w = r.width || slot.w;
    const h = r.height || slot.h;
    const pad = 14;

    // On iOS the Safari toolbars sit over the layout viewport, so a fixed
    // element placed by innerHeight can land underneath them. visualViewport
    // reports what is actually on screen.
    const vw = Math.min(window.innerWidth, window.visualViewport?.width ?? Infinity);
    const vh = Math.min(window.innerHeight, window.visualViewport?.height ?? Infinity);

    const maxLeft = Math.max(pad, vw - w - pad);
    const maxTop = Math.max(pad, vh - h - pad);

    const cx = typeof cursorX === 'number' ? cursorX : window.innerWidth / 2;
    const cy = typeof cursorY === 'number' ? cursorY : window.innerHeight / 2;

    const gap = safeGap();

    // Try a bunch of random spots, keep the one furthest from the cursor.
    let best = { left: pad, top: pad };
    let bestDist = -1;
    for (let i = 0; i < 40; i += 1) {
      const left = pad + Math.random() * (maxLeft - pad);
      const top = pad + Math.random() * (maxTop - pad);
      const dist = Math.hypot(left + w / 2 - cx, top + h / 2 - cy);
      if (dist > bestDist) {
        bestDist = dist;
        best = { left, top };
      }
      if (dist > gap * 1.8) break;
    }

    setPos(best);
    setFled(true);
    setDodges((d) => d + 1);
  }, [slot.w, slot.h]);

  // Global pointer watch: it bolts before the cursor ever reaches it.
  useEffect(() => {
    const onMove = (e) => {
      const el = noRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.hypot(
        e.clientX - (r.left + r.width / 2),
        e.clientY - (r.top + r.height / 2),
      );
      if (dist < safeGap()) flee(e.clientX, e.clientY);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [flee]);

  // Keep it on screen if the window is resized mid-chase.
  useEffect(() => {
    if (!fled) return undefined;
    const onResize = () => flee();
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [fled, flee]);

  // Touch / stubborn-clicker fallbacks — "No" simply never lands.
  const dodgeEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    flee(x, y);
  };

  const taunt = dodges > 0 ? TAUNTS[(dodges - 1) % TAUNTS.length] : '';
  const yesScale = Math.min(1 + dodges * 0.06, narrow ? 1.12 : 1.6);

  return (
    <main className="stage">
      <section className="card card--wide">
        <div className="badge">🥺💐</div>

        <p className="kicker">okay here it is, the whole reason for this page</p>
        <h1>Will you go on a date with me?</h1>

        <p className="lede">
          Proper plan, nice place, no chores, no rush — just you and me.
          All you have to do is pick one of these two little buttons. 💗
        </p>

        <div className="choices">
          <button
            type="button"
            className="btn btn--yes"
            style={{ transform: `scale(${yesScale})` }}
            onClick={() => router.push('/yay')}
          >
            Yes! 🥰
          </button>

          {/* Holds the gap open once the "No" button leaves the flow. */}
          {fled && (
            <span
              className="runaway-slot"
              style={{ '--slot-w': `${slot.w}px`, '--slot-h': `${slot.h}px` }}
              aria-hidden="true"
            />
          )}

          {/* The "No" button — famously unreliable. */}
          <button
            type="button"
            ref={noRef}
            className={`btn btn--no${fled ? ' runaway' : ''}`}
            style={fled ? { left: `${pos.left}px`, top: `${pos.top}px` } : undefined}
            onPointerEnter={dodgeEvent}
            onPointerDown={dodgeEvent}
            onTouchStart={dodgeEvent}
            onFocus={() => flee()}
            onClick={dodgeEvent}
            onKeyDown={(e) => {
              e.preventDefault();
              flee();
            }}
          >
            No 🙃
          </button>
        </div>

        <p className="taunt" key={dodges}>{taunt}</p>

        {dodges >= 4 && (
          <p className="tiny">psst — the &quot;no&quot; button is broken on purpose 💅</p>
        )}
      </section>
    </main>
  );
}

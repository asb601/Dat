// Floating hearts / sparkles drifting up behind everything.
const CHARMS = ['💗', '🌸', '✨', '💕', '🎀', '🩷', '💞', '🌷', '⭐️', '💝', '🫧', '🌺'];

// Deterministic values so the server and client render the same markup.
const FLOATIES = Array.from({ length: 18 }, (_, i) => ({
  charm: CHARMS[i % CHARMS.length],
  left: ((i * 37) % 100) + Math.round((i % 5) * 1.7),
  size: 16 + ((i * 13) % 22),
  dur: 13 + ((i * 7) % 11),
  delay: (i * 1.1) % 14,
}));

export default function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      {FLOATIES.map((f, i) => (
        <span
          key={i}
          className="floaty"
          style={{
            left: `${f.left}%`,
            '--size': `${f.size}px`,
            '--dur': `${f.dur}s`,
            '--delay': `${f.delay}s`,
          }}
        >
          {f.charm}
        </span>
      ))}
    </div>
  );
}

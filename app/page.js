import Link from 'next/link';

export default function Home() {
  return (
    <main className="stage">
      <section className="card">
        <div className="badge">🌸💗🌸</div>

        <p className="kicker">a tiny page, made just for you</p>
        <h1>Thank you for saying yes to coming</h1>

        <p className="lede">
          There was no water for a shower. Any normal person would have said
          &quot;not today&quot; and gone straight back to sleep. You let yourself be
          convinced anyway — and honestly, that little yes made my whole day. 🚿🚫
        </p>
        <p className="lede">
          So I&apos;m on my way to pick you up. Don&apos;t stress about a single thing —
          you could roll out the door exactly as you are and you&apos;d still be the
          best-looking person wherever we end up. 🚗💨
        </p>

        <div className="divider" />

        <p className="note">but first… I made you a little something 💌</p>

        <div style={{ marginTop: 24 }}>
          <Link href="/ask" className="btn">
            open it <span aria-hidden="true">→</span>
          </Link>
        </div>

        <p className="tiny">(it takes 10 seconds, promise)</p>
      </section>
    </main>
  );
}

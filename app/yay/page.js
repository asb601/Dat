import Link from 'next/link';

// The photo lives at public/us.jpg and is served straight from the CDN.
// Referenced by path rather than looked up on disk, because the public/
// folder isn't on the filesystem in a serverless deployment.
const PHOTO = '/us.jpg';

export default function Yay() {
  return (
    <main className="stage">
      <section className="card card--photo">
        <div className="frame frame--big">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTO} alt="my bangaram and me" />
        </div>

        <p className="caption">my bangaram and me 💗</p>

        <Link href="/" className="back-link">
          read it from the start ↺
        </Link>
      </section>
    </main>
  );
}

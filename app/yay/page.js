import fs from 'node:fs';
import path from 'node:path';

// Re-checked on every request so the photo can be dropped in after a build.
export const dynamic = 'force-dynamic';

// Drop an image named us.<ext> into /public and it shows up here.
// Scans the folder so the extension's casing doesn't matter (us.PNG works).
function findPhoto() {
  const dir = path.join(process.cwd(), 'public');
  const exts = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return null;
  }
  for (const name of ['us', 'her-photo']) {
    const hit = files.find((f) => {
      const dot = f.lastIndexOf('.');
      if (dot < 1) return false;
      return (
        f.slice(0, dot).toLowerCase() === name
        && exts.includes(f.slice(dot + 1).toLowerCase())
      );
    });
    if (hit) return `/${hit}`;
  }
  return null;
}

export default function Yay() {
  const photo = findPhoto();

  return (
    <main className="stage">
      <section className="card card--photo">
        {photo ? (
          <div className="frame frame--big">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="my bangaram and me" />
          </div>
        ) : (
          <div className="frame frame--big frame--empty">
            <span style={{ fontSize: '2rem' }}>🖼️</span>
          </div>
        )}

        <p className="caption">my bangaram and me 💗</p>
      </section>
    </main>
  );
}

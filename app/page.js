import { getSession } from '@/lib/session';
import { getState } from '@/lib/store';
import { redactForGuest } from '@/lib/guest';
import Mission from '@/components/Mission';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  // No valid guest/admin session: reveal nothing. Entry is only via /i/<token>.
  if (!session) {
    return (
      <main className="door">
        <div className="door-card">
          <p className="door-icon" aria-hidden="true">📪</p>
          <h1 className="door-title">Nothing to see here.</h1>
          <p className="door-sub">
            This page opens with a personal invitation link. If you have one,
            use it — it knows the way.
          </p>
        </div>
      </main>
    );
  }

  const state = await getState();
  return <Mission initial={redactForGuest(state)} isAdmin={session.role === 'admin'} />;
}

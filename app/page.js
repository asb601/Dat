import { getSession } from '@/lib/session';
import { getState } from '@/lib/store';
import { redactForGuest } from '@/lib/guest';
import Mission from '@/components/Mission';

export const dynamic = 'force-dynamic';

// ponytail: invite-token gate removed at owner's request — the page is open.
// To restore it, 401 here when getSession() is null (see git history).
export default async function Home() {
  const session = await getSession();
  const state = await getState();
  return <Mission initial={redactForGuest(state)} isAdmin={session?.role === 'admin'} />;
}

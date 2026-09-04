import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from './auth';

export async function getSession() {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  const session = await getSession();
  return session?.role === 'admin' ? session : null;
}

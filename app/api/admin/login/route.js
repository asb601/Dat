import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, cookieOptions, signSession, verifyPassword } from '@/lib/auth';
import { readJSON, writeJSON } from '@/lib/store';

export const dynamic = 'force-dynamic';

const FAILS_KEY = 'mission:login-fails';
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const ADMIN_SESSION_SEC = 60 * 60 * 24; // 24h

export async function POST(request) {
  const now = Date.now();
  const fails = ((await readJSON(FAILS_KEY)) || []).filter((t) => now - t < WINDOW_MS);
  if (fails.length >= MAX_FAILS) {
    const retryMin = Math.ceil((WINDOW_MS - (now - fails[0])) / 60000);
    return NextResponse.json(
      { error: `too many attempts — try again in ~${retryMin} min` },
      { status: 429 },
    );
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD_HASH is not configured' },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== 'string' || !verifyPassword(body.password, hash)) {
    fails.push(now);
    await writeJSON(FAILS_KEY, fails);
    return NextResponse.json({ error: 'wrong password' }, { status: 401 });
  }

  await writeJSON(FAILS_KEY, []);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession('admin', ADMIN_SESSION_SEC), cookieOptions(ADMIN_SESSION_SEC));
  return NextResponse.json({ ok: true });
}

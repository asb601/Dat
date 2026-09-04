import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, cookieOptions, signSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const GUEST_SESSION_SEC = 60 * 60 * 24 * 45; // 45 days — outlives the date

// Invite link: /i/<GUEST_TOKEN>. Exchanges the token for an HTTP-only guest
// session cookie and redirects to the clean URL.
export async function GET(request, ctx) {
  const { token } = await ctx.params;
  const expected = process.env.GUEST_TOKEN || '';
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  const ok = expected.length >= 16 && a.length === b.length && timingSafeEqual(a, b);

  if (ok) {
    const jar = await cookies();
    jar.set(
      SESSION_COOKIE,
      signSession('guest', GUEST_SESSION_SEC),
      cookieOptions(GUEST_SESSION_SEC),
    );
  }
  return NextResponse.redirect(new URL('/', request.url));
}

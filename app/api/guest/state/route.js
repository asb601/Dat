import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getState } from '@/lib/store';
import { redactForGuest } from '@/lib/guest';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json(redactForGuest(await getState()));
}

import { NextResponse } from 'next/server';
import { getState } from '@/lib/store';
import { redactForGuest } from '@/lib/guest';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(redactForGuest(await getState()));
}

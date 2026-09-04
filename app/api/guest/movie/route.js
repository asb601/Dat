import { NextResponse } from 'next/server';
import { getState, saveState } from '@/lib/store';
import { redactForGuest } from '@/lib/guest';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const state = await getState();

  if (!state.vault.unlocked) {
    return NextResponse.json({ error: 'vault is locked' }, { status: 403 });
  }
  if (!state.movies.some((m) => m.id === body.movieId)) {
    return NextResponse.json({ error: 'unknown movie' }, { status: 400 });
  }

  state.selection = { movieId: body.movieId, selectedAt: new Date().toISOString() };
  await saveState(state);
  return NextResponse.json(redactForGuest(state));
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getState, saveState } from '@/lib/store';
import { challengeStatus, redactForGuest } from '@/lib/guest';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';

  const state = await getState();
  const status = challengeStatus(state);
  if (status === 'locked') {
    return NextResponse.json({ error: 'challenge is locked' }, { status: 403 });
  }
  if (status === 'submitted' || status === 'approved') {
    return NextResponse.json({ error: 'already submitted' }, { status: 409 });
  }

  // Submission never unlocks anything — only admin approval does.
  state.submission = {
    note,
    submittedAt: new Date().toISOString(),
    status: 'submitted',
    reviewedAt: null,
    approvedAt: null,
  };
  await saveState(state);
  return NextResponse.json(redactForGuest(state));
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { getState, resetState, saveState } from '@/lib/store';
import { sanitizeChallenge, sanitizeItinerary, sanitizeMovies } from '@/lib/guest';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await getState());
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  if (body.action === 'reset') {
    return NextResponse.json(await resetState());
  }

  const state = await getState();

  switch (body.action) {
    case 'update': {
      const itinerary = sanitizeItinerary(body.itinerary, state.itinerary);
      const challenge = sanitizeChallenge(body.challenge);
      const movies = sanitizeMovies(body.movies);
      if (itinerary) state.itinerary = itinerary;
      if (challenge) state.challenge = challenge;
      if (movies) {
        state.movies = movies;
        // Drop a selection that points at a removed movie.
        if (state.selection && !movies.some((m) => m.id === state.selection.movieId)) {
          state.selection = null;
        }
      }
      break;
    }
    case 'approve': {
      if (!state.submission) {
        return NextResponse.json({ error: 'nothing to approve' }, { status: 409 });
      }
      state.submission.status = 'approved';
      state.submission.reviewedAt = now;
      state.submission.approvedAt = now;
      state.vault = { unlocked: true, unlockedAt: now };
      break;
    }
    case 'reject': {
      if (!state.submission) {
        return NextResponse.json({ error: 'nothing to reject' }, { status: 409 });
      }
      state.submission.status = 'rejected';
      state.submission.reviewedAt = now;
      break;
    }
    case 'vault': {
      const unlocked = body.unlocked === true;
      state.vault = { unlocked, unlockedAt: unlocked ? now : state.vault.unlockedAt };
      break;
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  await saveState(state);
  return NextResponse.json(state);
}
